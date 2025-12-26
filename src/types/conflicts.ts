/**
 * Conflict Types
 *
 * Type definitions for pglogical conflict data.
 * Supports both conflict_history table (pglogical 2.5.0+) and csvlog parsing.
 *
 * Feature: 012-conflicts-panel
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Type of replication conflict.
 */
export type ConflictType =
  | 'insert_insert'   // INSERT conflicts with existing row
  | 'update_update'   // UPDATE conflicts with local modification
  | 'update_delete'   // UPDATE target not found (deleted locally)
  | 'delete_delete';  // DELETE target not found (deleted locally)

/**
 * How the conflict was resolved.
 */
export type ConflictResolution =
  | 'apply_remote'  // Applied the remote change
  | 'keep_local'    // Kept the local version
  | 'skip';         // Skipped the operation

/**
 * Source of conflict data.
 */
export type ConflictSource =
  | 'history'      // From pglogical.conflict_history table
  | 'log'          // From PostgreSQL csvlog parsing
  | 'unavailable'; // No source available for this node

// =============================================================================
// Entity: ConflictEvent
// =============================================================================

/**
 * A single replication conflict event from any data source.
 * This is the core data structure stored in the Zustand store.
 */
export interface ConflictEvent {
  // Identity
  /** Unique identifier: `${nodeId}:${sourceId}` */
  id: string;
  /** Node identifier from ConnectionManager */
  nodeId: string;
  /** When conflict was recorded/logged */
  recordedAt: Date;

  // Subscription context
  /** pglogical subscription name (null for log source) */
  subscriptionName: string | null;

  // Conflict classification
  /** Type of conflict detected */
  conflictType: ConflictType;
  /** How conflict was resolved */
  resolution: ConflictResolution;

  // Relation context
  /** Schema containing affected table */
  schemaName: string;
  /** Table where conflict occurred */
  tableName: string;
  /** Index where conflict was detected */
  indexName: string | null;

  // Tuple data (history source only)
  /** Local row data as JSONB (history source only) */
  localTuple: Record<string, unknown> | null;
  /** Remote row data as JSONB (history source only) */
  remoteTuple: Record<string, unknown> | null;

  // Timestamps & LSN (history source only)
  /** Local tuple commit timestamp */
  localCommitTs: Date | null;
  /** Remote change commit timestamp */
  remoteCommitTs: Date | null;
  /** LSN of remote commit */
  remoteLsn: string | null;

  // Source tracking
  /** Data source indicator */
  source: ConflictSource;
}

// =============================================================================
// Entity: ConflictSummary
// =============================================================================

/**
 * Aggregated statistics for the panel header and quick status overview.
 */
export interface ConflictSummary {
  /** Total conflict count across all nodes */
  total: number;
  /** Count breakdown by conflict type */
  byType: Record<ConflictType, number>;
  /** Count breakdown by resolution type */
  byResolution: Record<ConflictResolution, number>;
  /** Conflicts recorded in last 60 minutes */
  lastHour: number;
  /** Conflicts recorded in last 24 hours */
  last24h: number;
  /** Count breakdown by node ID */
  byNode: Record<string, number>;
}

// =============================================================================
// Entity: ConflictListItem
// =============================================================================

/**
 * Display-enriched version of ConflictEvent for UI rendering.
 */
export interface ConflictListItem extends ConflictEvent {
  /** Node display name (from NodeInfo) */
  nodeName: string;
  /** Whether the conflict's node is stale (disconnected) */
  isStale: boolean;
  /** Whether this item is currently selected */
  isSelected: boolean;
  /** Human-readable relative time (e.g., "2m ago") */
  formattedTime: string;
  /** Combined "schema.table" string */
  qualifiedTable: string;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration for log file access.
 * Used when pglogical.conflict_history is unavailable.
 */
export interface LogFileConfig {
  /** Local filesystem path to PostgreSQL csvlog */
  localPath?: string;
  /** Use pg_read_file() function for remote log access */
  useRemoteRead?: boolean;
  /** PostgreSQL log directory (for pg_read_file) */
  logDirectory?: string;
  /** Log filename pattern (default: postgresql-*.csv) */
  logPattern?: string;
}

/**
 * Result from log parsing including new offset.
 */
export interface LogParseResult {
  /** Parsed conflict events */
  conflicts: ConflictEvent[];
  /** New file offset after parsing */
  newOffset: number;
}

// =============================================================================
// Hook Return Type
// =============================================================================

/**
 * Return type for useConflicts hook.
 */
export interface UseConflictsResult {
  /** All conflicts as enriched list items, sorted by recordedAt DESC */
  items: ConflictListItem[];
  /** Currently selected item (null if none) */
  selectedItem: ConflictListItem | null;
  /** Total conflict count */
  count: number;
  /** Aggregated summary statistics */
  summary: ConflictSummary;
  /** Data source per node */
  sourceByNode: Map<string, ConflictSource>;
  /** Count of nodes with 'history' source */
  historySourceCount: number;
  /** Count of nodes with 'log' source */
  logSourceCount: number;
  /** Count of nodes with 'unavailable' source */
  unavailableSourceCount: number;
  /** Count of conflicts from stale nodes */
  staleCount: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * All conflict types for iteration.
 */
export const CONFLICT_TYPES: readonly ConflictType[] = [
  'insert_insert',
  'update_update',
  'update_delete',
  'delete_delete',
] as const;

/**
 * All resolution types for iteration.
 */
export const RESOLUTION_TYPES: readonly ConflictResolution[] = [
  'apply_remote',
  'keep_local',
  'skip',
] as const;

/**
 * Display labels for conflict types.
 */
export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  insert_insert: 'INSERT',
  update_update: 'UPDATE',
  update_delete: 'UPD_DEL',
  delete_delete: 'DELETE',
};

/**
 * Display labels for resolution types.
 */
export const RESOLUTION_LABELS: Record<ConflictResolution, string> = {
  apply_remote: 'REMOTE',
  keep_local: 'LOCAL',
  skip: 'SKIP',
};

/**
 * Display labels for conflict sources.
 */
export const SOURCE_LABELS: Record<ConflictSource, string> = {
  history: 'HIST',
  log: 'LOG',
  unavailable: 'N/A',
};
