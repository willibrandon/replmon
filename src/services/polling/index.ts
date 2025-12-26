/**
 * PollingService
 *
 * Periodic data collection service for PostgreSQL replication monitoring.
 * Executes parallel queries across healthy nodes via ConnectionManager,
 * emitting typed events for replication stats, subscriptions, slots, and conflicts.
 *
 * Features:
 * - Configurable polling interval (minimum 250ms, default 1000ms)
 * - Start/stop lifecycle control with immediate poll on start
 * - Per-node pglogical detection with caching
 * - Partial results on node failure (graceful degradation)
 * - In-flight result discard on stop (FR-012)
 * - Overlap prevention with cycle:skip event (FR-007)
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

import type { ConnectionManager, ManagedNode } from '../connection-manager/index.js';
import type {
  PollingConfig,
  ResolvedPollingConfig,
  PollingEvents,
  PollingCycleResult,
  PollingError,
  NodeData,
  ReplicationStats,
  SlotData,
  SubscriptionData,
  ConflictData,
  ConflictEventResult,
  QueryFn,
} from './types.js';

import { detectPglogical, clearNodeCache, clearAllCache } from './pglogical-detector.js';
import { executeAllQueries } from './queries/index.js';
import {
  detectSource as detectConflictSource,
  execute as executeConflictEvents,
} from './queries/pglogical-conflicts.js';
import type { ConflictEvent } from '../../types/conflicts.js';

// =============================================================================
// Constants
// =============================================================================

/** Minimum allowed polling interval in milliseconds */
const MIN_INTERVAL_MS = 250;

/** Default polling interval in milliseconds */
const DEFAULT_INTERVAL_MS = 1000;

// =============================================================================
// TypedEventEmitter for PollingEvents
// =============================================================================

/**
 * Type-safe event emitter for polling service events.
 * Wraps Node.js EventEmitter with typed event signatures.
 */
class PollingEventEmitter {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
  }

  /**
   * Subscribe to a polling event.
   */
  on<K extends keyof PollingEvents>(
    event: K,
    handler: (payload: PollingEvents[K]) => void
  ): void {
    this.emitter.on(event, handler);
  }

  /**
   * Subscribe to a polling event once.
   */
  once<K extends keyof PollingEvents>(
    event: K,
    handler: (payload: PollingEvents[K]) => void
  ): void {
    this.emitter.once(event, handler);
  }

  /**
   * Unsubscribe from a polling event.
   */
  off<K extends keyof PollingEvents>(
    event: K,
    handler: (payload: PollingEvents[K]) => void
  ): void {
    this.emitter.off(event, handler);
  }

  /**
   * Emit a polling event.
   */
  emit<K extends keyof PollingEvents>(
    event: K,
    payload: PollingEvents[K]
  ): boolean {
    return this.emitter.emit(event, payload);
  }

  /**
   * Remove all listeners for a specific event or all events.
   */
  removeAllListeners<K extends keyof PollingEvents>(event?: K): void {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}

// =============================================================================
// Configuration Helpers
// =============================================================================

/**
 * Resolve and validate polling configuration.
 * Enforces minimum interval of 250ms.
 */
function resolveConfig(config?: PollingConfig): ResolvedPollingConfig {
  const intervalMs = config?.intervalMs ?? DEFAULT_INTERVAL_MS;
  return {
    intervalMs: Math.max(intervalMs, MIN_INTERVAL_MS),
  };
}

// =============================================================================
// PollingService Class
// =============================================================================

/**
 * PollingService
 *
 * Provides periodic data collection from PostgreSQL nodes
 * with event-based data distribution.
 */
export class PollingService {
  private readonly connectionManager: ConnectionManager;
  private readonly events: PollingEventEmitter;
  private config: ResolvedPollingConfig;

  /** Whether the service is currently running */
  private running: boolean;

  /** Timer handle for interval scheduling */
  private intervalTimer: ReturnType<typeof setInterval> | null;

  /** Whether a poll cycle is currently in progress */
  private pollInProgress: boolean;

  /** Cycle ID of any in-flight poll (for result discard on stop) */
  private activeCycleId: string | null;

  constructor(connectionManager: ConnectionManager, config?: PollingConfig) {
    this.connectionManager = connectionManager;
    this.events = new PollingEventEmitter();
    this.config = resolveConfig(config);
    this.running = false;
    this.intervalTimer = null;
    this.pollInProgress = false;
    this.activeCycleId = null;
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Start the polling service.
   * Executes an immediate poll, then continues at configured interval.
   * No-op if already running (FR-007: prevents overlapping cycles).
   */
  start(): void {
    if (this.running) {
      return; // No-op if already running
    }

    this.running = true;
    this.events.emit('started', { timestamp: new Date() });

    // Execute immediate first poll
    this.executePoll();

    // Schedule interval for subsequent polls
    this.intervalTimer = setInterval(() => {
      this.executePoll();
    }, this.config.intervalMs);
  }

  /**
   * Stop the polling service.
   * In-flight queries complete but results are discarded (FR-012).
   * No-op if already stopped.
   */
  stop(): void {
    if (!this.running) {
      return; // No-op if already stopped
    }

    this.running = false;

    // Clear interval timer
    if (this.intervalTimer !== null) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    // Mark any in-flight cycle for discard
    // Results from activeCycleId will be ignored when they complete
    // We don't reset activeCycleId here - poll() will check running state

    this.events.emit('stopped', { timestamp: new Date() });
  }

  /**
   * Check if service is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Get current polling configuration.
   */
  getConfig(): ResolvedPollingConfig {
    return { ...this.config };
  }

  /**
   * Update polling interval.
   * Takes effect on next cycle (does not interrupt current cycle).
   *
   * @param intervalMs - New interval in milliseconds (minimum 250ms)
   */
  setInterval(intervalMs: number): void {
    const newInterval = Math.max(intervalMs, MIN_INTERVAL_MS);
    this.config = { ...this.config, intervalMs: newInterval };

    // If running, restart interval with new timing
    if (this.running && this.intervalTimer !== null) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = setInterval(() => {
        this.executePoll();
      }, this.config.intervalMs);
    }
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  /**
   * Subscribe to polling events.
   *
   * @param event - Event name
   * @param handler - Event handler function
   */
  on<K extends keyof PollingEvents>(
    event: K,
    handler: (payload: PollingEvents[K]) => void
  ): void {
    this.events.on(event, handler);
  }

  /**
   * Unsubscribe from polling events.
   *
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  off<K extends keyof PollingEvents>(
    event: K,
    handler: (payload: PollingEvents[K]) => void
  ): void {
    this.events.off(event, handler);
  }

  /**
   * Subscribe to an event once.
   *
   * @param event - Event name
   * @param handler - Event handler function (called once then removed)
   */
  once<K extends keyof PollingEvents>(
    event: K,
    handler: (payload: PollingEvents[K]) => void
  ): void {
    this.events.once(event, handler);
  }

  // ===========================================================================
  // Private: Poll Execution
  // ===========================================================================

  /**
   * Execute a single poll cycle.
   * Wrapper that handles overlap prevention (FR-007).
   */
  private executePoll(): void {
    // Overlap prevention: skip if a poll is already in progress
    if (this.pollInProgress) {
      this.events.emit('cycle:skip', {
        reason: 'Previous poll cycle still in progress',
      });
      return;
    }

    // Start the poll (async, don't await)
    this.poll().catch((err) => {
      // Unexpected error in poll - should not happen as poll() handles its own errors
      // This is a safety net - emit error event so UI can display it
      const pollingError: PollingError = {
        message: err instanceof Error ? err.message : String(err),
        cycleId: null,
        nodeErrors: [],
        timestamp: new Date(),
      };
      this.events.emit('error', pollingError);
    });
  }

  /**
   * Execute the polling cycle.
   * Queries all healthy nodes in parallel and emits results.
   */
  private async poll(): Promise<void> {
    // Check if ConnectionManager is ready
    if (!this.connectionManager.isRunning()) {
      // Graceful degradation (FR-015): emit error event but don't crash
      const pollingError: PollingError = {
        message: 'ConnectionManager is not running',
        cycleId: null,
        nodeErrors: [],
        timestamp: new Date(),
      };
      this.events.emit('error', pollingError);
      return;
    }

    const cycleId = randomUUID();
    const startedAt = new Date();

    this.pollInProgress = true;
    this.activeCycleId = cycleId;

    this.events.emit('cycle:start', { cycleId, timestamp: startedAt });

    try {
      // Get healthy nodes from ConnectionManager
      const healthyNodes = this.connectionManager.getHealthyNodes();

      // If no healthy nodes, emit partial result with empty arrays
      if (healthyNodes.length === 0) {
        // Check if stopped during wait
        if (!this.running || this.activeCycleId !== cycleId) {
          return; // Discard results
        }

        const completedAt = new Date();
        const result: PollingCycleResult = {
          cycleId,
          startedAt,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
          stats: [],
          subscriptions: [],
          slots: [],
          conflicts: [],
          conflictEvents: [],
        };

        this.emitResults(result);
        return;
      }

      // Execute queries on all healthy nodes in parallel
      const nodeResults = await Promise.all(
        healthyNodes.map((node) => this.queryNode(node))
      );

      // Check if stopped during queries (FR-012: discard in-flight results)
      if (!this.running || this.activeCycleId !== cycleId) {
        return; // Discard results
      }

      const completedAt = new Date();

      // Aggregate results
      const result: PollingCycleResult = {
        cycleId,
        startedAt,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        stats: nodeResults.map((r) => r.stats),
        subscriptions: nodeResults.map((r) => r.subscriptions),
        slots: nodeResults.map((r) => r.slots),
        conflicts: nodeResults.map((r) => r.conflicts),
        conflictEvents: nodeResults.map((r) => r.conflictEvents),
      };

      // Check for total failure (all nodes failed)
      const allFailed = nodeResults.every((r) => !r.success);
      if (allFailed && nodeResults.length > 0) {
        const pollingError: PollingError = {
          message: 'All nodes failed during poll cycle',
          cycleId,
          nodeErrors: nodeResults
            .filter((r) => r.error)
            .map((r) => ({ nodeId: r.nodeId, error: r.error as Error })),
          timestamp: completedAt,
        };
        this.events.emit('error', pollingError);
        // Still emit partial results (empty data) for UI to show error state
      }

      this.emitResults(result);
    } finally {
      this.pollInProgress = false;
      if (this.activeCycleId === cycleId) {
        this.activeCycleId = null;
      }
    }
  }

  /**
   * Query a single node for all data types.
   * Returns NodeData wrappers with success/error status.
   */
  private async queryNode(node: ManagedNode): Promise<{
    nodeId: string;
    success: boolean;
    error?: Error;
    stats: NodeData<ReplicationStats[]>;
    subscriptions: NodeData<SubscriptionData[]>;
    slots: NodeData<SlotData[]>;
    conflicts: NodeData<ConflictData[]>;
    conflictEvents: NodeData<ConflictEventResult>;
  }> {
    const startTime = Date.now();

    try {
      // Create query function bound to this node
      const queryFn: QueryFn = async <R>(sql: string, params?: unknown[]): Promise<R[]> => {
        return this.connectionManager.query<R>(node.id, sql, params);
      };

      // Detect pglogical for this node (cached per-node)
      const pglogicalResult = await detectPglogical(node.id, queryFn);
      const hasPglogical = pglogicalResult.hasPglogical;

      // Execute all queries in parallel, including conflict events
      const [queryResults, conflictSource] = await Promise.all([
        executeAllQueries(node.id, queryFn, hasPglogical),
        hasPglogical ? detectConflictSource(node.id, queryFn) : Promise.resolve('unavailable' as const),
      ]);

      // Query conflict events if source is available
      const conflictEventsData = await executeConflictEvents(node.id, queryFn, conflictSource);

      // Convert ConflictEvent[] to ConflictEventResult
      const conflictEventResult: ConflictEventResult = {
        events: conflictEventsData.map((event: ConflictEvent) => ({
          id: event.id,
          nodeId: event.nodeId,
          recordedAt: event.recordedAt,
          subscriptionName: event.subscriptionName,
          conflictType: event.conflictType,
          resolution: event.resolution,
          schemaName: event.schemaName,
          tableName: event.tableName,
          indexName: event.indexName,
          localTuple: event.localTuple,
          remoteTuple: event.remoteTuple,
          localCommitTs: event.localCommitTs,
          remoteCommitTs: event.remoteCommitTs,
          remoteLsn: event.remoteLsn,
          source: event.source,
        })),
        source: conflictSource,
      };

      const durationMs = Date.now() - startTime;

      return {
        nodeId: node.id,
        success: true,
        stats: {
          nodeId: node.id,
          nodeName: node.name,
          success: true,
          data: queryResults.stats,
          durationMs,
          hasPglogical,
        },
        subscriptions: {
          nodeId: node.id,
          nodeName: node.name,
          success: true,
          data: queryResults.subscriptions,
          durationMs,
          hasPglogical,
        },
        slots: {
          nodeId: node.id,
          nodeName: node.name,
          success: true,
          data: queryResults.slots,
          durationMs,
          hasPglogical,
        },
        conflicts: {
          nodeId: node.id,
          nodeName: node.name,
          success: true,
          data: queryResults.conflicts,
          durationMs,
          hasPglogical,
        },
        conflictEvents: {
          nodeId: node.id,
          nodeName: node.name,
          success: true,
          data: conflictEventResult,
          durationMs,
          hasPglogical,
        },
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const durationMs = Date.now() - startTime;

      return {
        nodeId: node.id,
        success: false,
        error,
        stats: {
          nodeId: node.id,
          nodeName: node.name,
          success: false,
          error,
          durationMs,
          hasPglogical: false,
        },
        subscriptions: {
          nodeId: node.id,
          nodeName: node.name,
          success: false,
          error,
          durationMs,
          hasPglogical: false,
        },
        slots: {
          nodeId: node.id,
          nodeName: node.name,
          success: false,
          error,
          durationMs,
          hasPglogical: false,
        },
        conflicts: {
          nodeId: node.id,
          nodeName: node.name,
          success: false,
          error,
          durationMs,
          hasPglogical: false,
        },
        conflictEvents: {
          nodeId: node.id,
          nodeName: node.name,
          success: false,
          error,
          durationMs,
          hasPglogical: false,
        },
      };
    }
  }

  /**
   * Emit all result events for a completed poll cycle.
   */
  private emitResults(result: PollingCycleResult): void {
    // Emit complete data event
    this.events.emit('data', result);

    // Emit individual category events
    this.events.emit('stats', result.stats);
    this.events.emit('subscriptions', result.subscriptions);
    this.events.emit('slots', result.slots);
    this.events.emit('conflicts', result.conflicts);
    this.events.emit('conflictEvents', result.conflictEvents);

    // Emit cycle:complete event
    this.events.emit('cycle:complete', {
      cycleId: result.cycleId,
      durationMs: result.durationMs,
    });
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Clear pglogical detection cache for a specific node.
   * Use when a node is removed or needs re-detection.
   *
   * @param nodeId - Node identifier
   */
  clearNodePglogicalCache(nodeId: string): void {
    clearNodeCache(nodeId);
  }

  /**
   * Clear all pglogical detection cache.
   * Use during shutdown or full reset.
   */
  clearAllPglogicalCache(): void {
    clearAllCache();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new PollingService instance.
 *
 * @param connectionManager - ConnectionManager for database queries
 * @param config - Optional polling configuration
 * @returns PollingService instance
 */
export function createPollingService(
  connectionManager: ConnectionManager,
  config?: PollingConfig
): PollingService {
  return new PollingService(connectionManager, config);
}

// =============================================================================
// Re-exports
// =============================================================================

// Re-export all types for convenience
export type {
  PollingConfig,
  ResolvedPollingConfig,
  PollingEvents,
  PollingCycleResult,
  PollingError,
  NodeData,
  ReplicationStats,
  SlotData,
  SubscriptionData,
  ConflictData,
  ReplicationState,
  SyncState,
  SlotType,
  WalStatus,
  SubscriptionStatus,
  SubscriptionSource,
  ConflictSource,
  ConflictEventSource,
  ConflictEventResult,
  ConflictEventRecord,
  QueryFn,
  QueryModule,
  PglogicalDetectionResult,
} from './types.js';

// Re-export query modules for direct access if needed
export { executeAllQueries } from './queries/index.js';
export { detectPglogical, clearNodeCache, clearAllCache } from './pglogical-detector.js';
export { pglogicalConflictsQueryModule } from './queries/pglogical-conflicts.js';
