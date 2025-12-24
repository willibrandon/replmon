/**
 * Polling Service Contract
 *
 * TypeScript interface definitions for the PollingService.
 * This contract defines the public API surface.
 *
 * Feature: 004-polling-service
 * Date: 2025-12-23
 */

import type { ConnectionManager } from '../../src/services/connection-manager/index.js';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configuration for the PollingService.
 */
export interface PollingConfig {
  /**
   * Polling interval in milliseconds.
   * Minimum: 250ms (enforced)
   * Default: 1000ms
   */
  intervalMs?: number;
}

/**
 * Resolved configuration with defaults applied.
 */
export interface ResolvedPollingConfig {
  intervalMs: number;
}

// =============================================================================
// Enums
// =============================================================================

/** Replication connection state */
export type ReplicationState = 'streaming' | 'catchup' | 'backup' | 'startup';

/** Synchronization state for standbys */
export type SyncState = 'async' | 'sync' | 'potential' | 'quorum';

/** Replication slot type */
export type SlotType = 'physical' | 'logical';

/** WAL retention status (PG13+) */
export type WalStatus = 'reserved' | 'extended' | 'unreserved' | 'lost';

/** Subscription operational status */
export type SubscriptionStatus =
  | 'initializing'
  | 'replicating'
  | 'down'
  | 'catchup'
  | 'unknown';

/** Source of subscription data */
export type SubscriptionSource = 'native' | 'pglogical';

/** Source of conflict data */
export type ConflictSource = 'native' | 'pglogical_log' | 'unavailable';

// =============================================================================
// Data Types
// =============================================================================

/**
 * Replication statistics for a single standby connection.
 */
export interface ReplicationStats {
  /** Node identifier from ConnectionManager */
  nodeId: string;
  /** Standby application name */
  applicationName: string;
  /** Client IP address */
  clientAddr: string | null;
  /** Replication connection state */
  state: ReplicationState;
  /** WAL lag in bytes */
  lagBytes: number;
  /** Lag duration in seconds (null if unavailable) */
  lagSeconds: number | null;
  /** Synchronization state */
  syncState: SyncState;
  /** Last WAL sent position */
  sentLsn: string;
  /** Last WAL written by standby */
  writeLsn: string;
  /** Last WAL flushed by standby */
  flushLsn: string;
  /** Last WAL replayed by standby */
  replayLsn: string;
  /** When this data was collected */
  timestamp: Date;
}

/**
 * Replication slot information.
 */
export interface SlotData {
  /** Node identifier */
  nodeId: string;
  /** Replication slot name */
  slotName: string;
  /** Output plugin (logical slots only) */
  plugin: string | null;
  /** Physical or logical */
  slotType: SlotType;
  /** Database name (logical slots only) */
  database: string | null;
  /** Whether slot is in use */
  active: boolean;
  /** WAL bytes retained by slot */
  retainedBytes: number;
  /** WAL status (PG13+) */
  walStatus: WalStatus | null;
  /** Inactive with >1GB retention */
  isStale: boolean;
  /** When this data was collected */
  timestamp: Date;
}

/**
 * Subscription information.
 */
export interface SubscriptionData {
  /** Node identifier */
  nodeId: string;
  /** Subscription name */
  subscriptionName: string;
  /** Whether subscription is enabled */
  enabled: boolean;
  /** Current status */
  status: SubscriptionStatus;
  /** Provider node name (pglogical) */
  providerNode: string | null;
  /** Associated replication slot */
  slotName: string | null;
  /** Last received LSN */
  receivedLsn: string | null;
  /** Latest processed LSN */
  latestEndLsn: string | null;
  /** Replication sets (pglogical) */
  replicationSets: string[];
  /** Last message timestamp */
  lastMessageTime: Date | null;
  /** Apply worker PID */
  workerPid: number | null;
  /** Native or pglogical */
  source: SubscriptionSource;
  /** When this data was collected */
  timestamp: Date;
}

/**
 * Conflict statistics.
 */
export interface ConflictData {
  /** Node identifier */
  nodeId: string;
  /** Subscription with conflicts */
  subscriptionName: string;
  /** Total apply errors */
  applyErrorCount: number;
  /** INSERT-INSERT conflicts */
  insertConflicts: number;
  /** UPDATE origin differs conflicts */
  updateOriginDiffers: number;
  /** UPDATE-UPDATE conflicts */
  updateExists: number;
  /** UPDATE-DELETE conflicts */
  updateDeleted: number;
  /** UPDATE target missing conflicts */
  updateMissing: number;
  /** DELETE origin differs conflicts */
  deleteOriginDiffers: number;
  /** DELETE target missing conflicts */
  deleteMissing: number;
  /** Multiple unique constraint conflicts */
  multipleUniqueConflicts: number;
  /** When stats were last reset */
  statsReset: Date | null;
  /** How conflicts were detected */
  source: ConflictSource;
  /** When this data was collected */
  timestamp: Date;
}

/**
 * Generic wrapper for per-node query results.
 */
export interface NodeData<T> {
  /** Node identifier */
  nodeId: string;
  /** Node display name */
  nodeName: string;
  /** Whether query succeeded */
  success: boolean;
  /** Data when success=true */
  data?: T;
  /** Error when success=false */
  error?: Error;
  /** Query execution time in ms */
  durationMs: number;
  /** Whether node has pglogical installed */
  hasPglogical: boolean;
}

/**
 * Aggregated result of a complete polling cycle.
 */
export interface PollingCycleResult {
  /** Unique cycle identifier */
  cycleId: string;
  /** Cycle start timestamp */
  startedAt: Date;
  /** Cycle end timestamp */
  completedAt: Date;
  /** Total cycle duration in ms */
  durationMs: number;
  /** Per-node replication stats */
  stats: NodeData<ReplicationStats[]>[];
  /** Per-node subscriptions */
  subscriptions: NodeData<SubscriptionData[]>[];
  /** Per-node slots */
  slots: NodeData<SlotData[]>[];
  /** Per-node conflicts */
  conflicts: NodeData<ConflictData[]>[];
}

/**
 * Error details when polling fails.
 */
export interface PollingError {
  /** Error message */
  message: string;
  /** Cycle ID if applicable */
  cycleId: string | null;
  /** Per-node errors */
  nodeErrors: Array<{ nodeId: string; error: Error }>;
  /** When error occurred */
  timestamp: Date;
}

// =============================================================================
// Events
// =============================================================================

/**
 * Event map for PollingService typed EventEmitter.
 */
export interface PollingEvents {
  /** Complete cycle data (all categories) */
  data: PollingCycleResult;
  /** Replication statistics only */
  stats: NodeData<ReplicationStats[]>[];
  /** Subscription data only */
  subscriptions: NodeData<SubscriptionData[]>[];
  /** Slot data only */
  slots: NodeData<SlotData[]>[];
  /** Conflict data only */
  conflicts: NodeData<ConflictData[]>[];
  /** Polling cycle failure */
  error: PollingError;
  /** Polling service started */
  started: { timestamp: Date };
  /** Polling service stopped */
  stopped: { timestamp: Date };
  /** Cycle beginning */
  'cycle:start': { cycleId: string; timestamp: Date };
  /** Cycle finished */
  'cycle:complete': { cycleId: string; durationMs: number };
  /** Cycle skipped (overlap prevention) */
  'cycle:skip': { reason: string };
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * PollingService public interface.
 *
 * Provides periodic data collection from PostgreSQL nodes
 * with event-based data distribution.
 */
export interface IPollingService {
  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Start the polling service.
   * Executes an immediate poll, then continues at configured interval.
   * No-op if already running (FR-007: prevents overlapping cycles).
   */
  start(): void;

  /**
   * Stop the polling service.
   * In-flight queries complete but results are discarded (FR-012).
   * No-op if already stopped.
   */
  stop(): void;

  /**
   * Check if service is currently running.
   */
  isRunning(): boolean;

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Get current polling configuration.
   */
  getConfig(): ResolvedPollingConfig;

  /**
   * Update polling interval.
   * Takes effect on next cycle (does not interrupt current cycle).
   *
   * @param intervalMs - New interval in milliseconds (minimum 250ms)
   */
  setInterval(intervalMs: number): void;

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to polling events.
   *
   * @param event - Event name
   * @param handler - Event handler function
   */
  on<K extends keyof PollingEvents>(
    event: K,
    handler: (payload: PollingEvents[K]) => void
  ): void;

  /**
   * Unsubscribe from polling events.
   *
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  off<K extends keyof PollingEvents>(
    event: K,
    handler: (payload: PollingEvents[K]) => void
  ): void;

  /**
   * Subscribe to an event once.
   *
   * @param event - Event name
   * @param handler - Event handler function (called once then removed)
   */
  once<K extends keyof PollingEvents>(
    event: K,
    handler: (payload: PollingEvents[K]) => void
  ): void;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a new PollingService instance.
 *
 * @param connectionManager - ConnectionManager for database queries
 * @param config - Optional polling configuration
 * @returns PollingService instance
 */
export type CreatePollingService = (
  connectionManager: ConnectionManager,
  config?: PollingConfig
) => IPollingService;

// =============================================================================
// Query Module Interfaces
// =============================================================================

/**
 * Interface for query modules.
 * Each data category implements this for consistent query execution.
 */
export interface QueryModule<T> {
  /**
   * Execute query on a single node.
   *
   * @param nodeId - Node identifier
   * @param queryFn - Query execution function from ConnectionManager
   * @param hasPglogical - Whether node has pglogical installed
   * @returns Query results
   */
  execute(
    nodeId: string,
    queryFn: <R>(sql: string, params?: unknown[]) => Promise<R[]>,
    hasPglogical: boolean
  ): Promise<T[]>;

  /**
   * SQL query string for native PostgreSQL.
   */
  readonly nativeQuery: string;

  /**
   * SQL query string for pglogical (if different).
   */
  readonly pglogicalQuery?: string;
}

/**
 * pglogical detection result for a node.
 */
export interface PglogicalDetectionResult {
  /** Node identifier */
  nodeId: string;
  /** Whether pglogical is installed */
  hasPglogical: boolean;
  /** pglogical version if installed */
  version: string | null;
  /** When detection was performed */
  detectedAt: Date;
}
