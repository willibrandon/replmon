/**
 * Polling Service Types
 *
 * Core type definitions for the PollingService.
 * Based on contracts/polling-service.ts specification.
 */

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

/** Source of conflict data (aggregate stats) */
export type ConflictSource = 'native' | 'pglogical_log' | 'unavailable';

/** Source of conflict event data (individual records) */
export type ConflictEventSource = 'history' | 'log' | 'unavailable';

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
  /** WAL bytes retained by slot (current - restart_lsn) */
  retainedBytes: number;
  /** Pending WAL bytes to be replicated (current - confirmed_flush_lsn) */
  pendingBytes: number;
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
  /** Provider host for auto-discovery (pglogical) */
  providerHost: string | null;
  /** Provider port for auto-discovery (pglogical) */
  providerPort: number | null;
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
 * Conflict event data result with source tracking.
 * Contains individual conflict records from pglogical conflict_history.
 */
export interface ConflictEventResult {
  /** Conflict events from this node */
  events: ConflictEventRecord[];
  /** Data source used for this node */
  source: ConflictEventSource;
}

/**
 * Individual conflict event record.
 * Matches ConflictEvent from types/conflicts.ts but simplified for polling.
 */
export interface ConflictEventRecord {
  /** Unique identifier */
  id: string;
  /** Node identifier */
  nodeId: string;
  /** When conflict was recorded */
  recordedAt: Date;
  /** Subscription name */
  subscriptionName: string | null;
  /** Conflict type */
  conflictType: string;
  /** Resolution applied */
  resolution: string;
  /** Schema name */
  schemaName: string;
  /** Table name */
  tableName: string;
  /** Index name */
  indexName: string | null;
  /** Local tuple data */
  localTuple: Record<string, unknown> | null;
  /** Remote tuple data */
  remoteTuple: Record<string, unknown> | null;
  /** Local commit timestamp */
  localCommitTs: Date | null;
  /** Remote commit timestamp */
  remoteCommitTs: Date | null;
  /** Remote LSN */
  remoteLsn: string | null;
  /** Data source */
  source: ConflictEventSource;
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
  /** Per-node conflicts (aggregate stats from PG16+) */
  conflicts: NodeData<ConflictData[]>[];
  /** Per-node conflict events (individual records from pglogical) */
  conflictEvents: NodeData<ConflictEventResult>[];
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
  /** Conflict data only (aggregate stats) */
  conflicts: NodeData<ConflictData[]>[];
  /** Conflict events only (individual records) */
  conflictEvents: NodeData<ConflictEventResult>[];
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
// Query Module Interfaces
// =============================================================================

/**
 * Query execution function type.
 * Matches the signature used by ConnectionManager.query().
 */
export type QueryFn = <R>(sql: string, params?: unknown[]) => Promise<R[]>;

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
    queryFn: QueryFn,
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

// =============================================================================
// pglogical Detection
// =============================================================================

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
