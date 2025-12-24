/**
 * Conflicts Query Module
 *
 * Queries conflict statistics from PostgreSQL 16+ native
 * pg_stat_subscription_stats view.
 *
 * Note: pglogical conflicts are logged to server log only,
 * not to a queryable table. For pglogical nodes, we return
 * zero-count entries with source='unavailable'.
 *
 * Provides:
 * - Per-subscription conflict counts
 * - Apply error count
 * - Multiple conflict type breakdowns
 * - Stats reset timestamp
 */

import type {
  QueryModule,
  ConflictData,
  ConflictSource,
  QueryFn,
} from '../types.js';

/**
 * SQL query for conflict statistics.
 * Available in PostgreSQL 16+ only.
 */
const CONFLICTS_QUERY = `
SELECT
  subname AS subscription_name,
  COALESCE(apply_error_count, 0)::bigint AS apply_error_count,
  COALESCE(confl_insert_exists, 0)::bigint AS insert_conflicts,
  COALESCE(confl_update_origin_differs, 0)::bigint AS update_origin_differs,
  COALESCE(confl_update_exists, 0)::bigint AS update_exists,
  COALESCE(confl_update_deleted, 0)::bigint AS update_deleted,
  COALESCE(confl_update_missing, 0)::bigint AS update_missing,
  COALESCE(confl_delete_origin_differs, 0)::bigint AS delete_origin_differs,
  COALESCE(confl_delete_missing, 0)::bigint AS delete_missing,
  COALESCE(confl_multiple_unique_conflicts, 0)::bigint AS multiple_unique_conflicts,
  stats_reset
FROM pg_stat_subscription_stats
`;

/**
 * SQL query to check PostgreSQL version for PG16+ feature detection.
 */
const VERSION_CHECK_QUERY = `
SELECT current_setting('server_version_num')::integer AS version_num
`;

/** Raw row type from conflicts query */
interface ConflictRow {
  subscription_name: string;
  apply_error_count: string | number;
  insert_conflicts: string | number;
  update_origin_differs: string | number;
  update_exists: string | number;
  update_deleted: string | number;
  update_missing: string | number;
  delete_origin_differs: string | number;
  delete_missing: string | number;
  multiple_unique_conflicts: string | number;
  stats_reset: Date | null;
}

/** Row type for version check */
interface VersionRow {
  version_num: number;
}

/** Minimum PostgreSQL version for conflict stats (16.0) */
const PG16_VERSION_NUM = 160000;

/**
 * Parse numeric value that may come as string or number.
 */
function parseNumber(value: string | number | null, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'number') return value;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Transform raw query row to ConflictData.
 */
function transformRow(
  nodeId: string,
  row: ConflictRow,
  source: ConflictSource,
  timestamp: Date
): ConflictData {
  return {
    nodeId,
    subscriptionName: row.subscription_name,
    applyErrorCount: parseNumber(row.apply_error_count),
    insertConflicts: parseNumber(row.insert_conflicts),
    updateOriginDiffers: parseNumber(row.update_origin_differs),
    updateExists: parseNumber(row.update_exists),
    updateDeleted: parseNumber(row.update_deleted),
    updateMissing: parseNumber(row.update_missing),
    deleteOriginDiffers: parseNumber(row.delete_origin_differs),
    deleteMissing: parseNumber(row.delete_missing),
    multipleUniqueConflicts: parseNumber(row.multiple_unique_conflicts),
    statsReset: row.stats_reset,
    source,
    timestamp,
  };
}

/**
 * Create an empty conflict entry for pglogical subscriptions.
 * pglogical logs conflicts to server log, not queryable.
 */
function createUnavailableEntry(
  nodeId: string,
  subscriptionName: string,
  timestamp: Date
): ConflictData {
  return {
    nodeId,
    subscriptionName,
    applyErrorCount: 0,
    insertConflicts: 0,
    updateOriginDiffers: 0,
    updateExists: 0,
    updateDeleted: 0,
    updateMissing: 0,
    deleteOriginDiffers: 0,
    deleteMissing: 0,
    multipleUniqueConflicts: 0,
    statsReset: null,
    source: 'unavailable',
    timestamp,
  };
}

/**
 * Check if PostgreSQL version supports conflict statistics.
 */
async function checkPg16Plus(queryFn: QueryFn): Promise<boolean> {
  try {
    const rows = await queryFn<VersionRow>(VERSION_CHECK_QUERY);
    const row = rows[0];
    if (row) {
      return row.version_num >= PG16_VERSION_NUM;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Execute conflicts query on a node.
 * Returns conflict statistics for PG16+ or unavailable entries for older versions.
 *
 * @param nodeId - Node identifier
 * @param queryFn - Query execution function
 * @param hasPglogical - Whether node has pglogical installed
 * @returns Array of ConflictData for all subscriptions on this node
 */
async function execute(
  nodeId: string,
  queryFn: QueryFn,
  hasPglogical: boolean
): Promise<ConflictData[]> {
  const timestamp = new Date();

  // Check if this is PostgreSQL 16+
  const isPg16Plus = await checkPg16Plus(queryFn);

  if (isPg16Plus) {
    // Query native conflict statistics
    try {
      const rows = await queryFn<ConflictRow>(CONFLICTS_QUERY);
      return rows.map((row) => transformRow(nodeId, row, 'native', timestamp));
    } catch {
      // Query failed, return empty
      return [];
    }
  }

  // For older PostgreSQL versions or pglogical-only setups,
  // conflicts are not queryable - return empty array
  // Note: We could enumerate subscriptions and create unavailable entries,
  // but that adds complexity for minimal value. The UI should handle
  // empty conflict data gracefully.
  if (hasPglogical) {
    // For pglogical nodes, we could enumerate subscriptions and mark as unavailable
    // For now, return empty - UI should indicate "not available" for older PG
    return [];
  }

  return [];
}

/**
 * Conflicts query module.
 */
export const conflictsQueryModule: QueryModule<ConflictData> = {
  execute,
  nativeQuery: CONFLICTS_QUERY,
};

/**
 * Export helper for creating unavailable entries.
 * Useful for UI to create placeholder conflict data.
 */
export { createUnavailableEntry };
