/**
 * Replication Statistics Query Module
 *
 * Queries pg_stat_replication for standby replication statistics.
 * Works on PostgreSQL 10+ with native streaming replication.
 *
 * Provides:
 * - WAL lag in bytes via pg_wal_lsn_diff()
 * - Time-based lag via replay_lag column
 * - LSN positions (sent, write, flush, replay)
 * - Sync state and replication state
 */

import type {
  QueryModule,
  ReplicationStats,
  ReplicationState,
  SyncState,
  QueryFn,
} from '../types.js';

/**
 * SQL query for replication statistics.
 * Compatible with PostgreSQL 10+ (replay_lag available since PG10).
 */
const STATS_QUERY = `
SELECT
  application_name,
  client_addr::text,
  state,
  COALESCE(
    pg_wal_lsn_diff(
      COALESCE(pg_current_wal_lsn(), '0/0'),
      COALESCE(replay_lsn, '0/0')
    )::bigint,
    0
  ) AS lag_bytes,
  CASE
    WHEN replay_lag IS NOT NULL THEN EXTRACT(EPOCH FROM replay_lag)::numeric
    ELSE NULL
  END AS lag_seconds,
  sync_state,
  COALESCE(sent_lsn::text, '0/0') AS sent_lsn,
  COALESCE(write_lsn::text, '0/0') AS write_lsn,
  COALESCE(flush_lsn::text, '0/0') AS flush_lsn,
  COALESCE(replay_lsn::text, '0/0') AS replay_lsn
FROM pg_stat_replication
WHERE state IS NOT NULL
`;

/** Raw row type from pg_stat_replication query */
interface StatsRow {
  application_name: string;
  client_addr: string | null;
  state: string;
  lag_bytes: string | number;
  lag_seconds: string | number | null;
  sync_state: string;
  sent_lsn: string;
  write_lsn: string;
  flush_lsn: string;
  replay_lsn: string;
}

/**
 * Parse replication state from string.
 * Falls back to 'streaming' for unknown values.
 */
function parseReplicationState(state: string): ReplicationState {
  const normalized = state.toLowerCase();
  if (normalized === 'streaming' || normalized === 'catchup' ||
      normalized === 'backup' || normalized === 'startup') {
    return normalized as ReplicationState;
  }
  return 'streaming';
}

/**
 * Parse sync state from string.
 * Falls back to 'async' for unknown values.
 */
function parseSyncState(syncState: string): SyncState {
  const normalized = syncState.toLowerCase();
  if (normalized === 'async' || normalized === 'sync' ||
      normalized === 'potential' || normalized === 'quorum') {
    return normalized as SyncState;
  }
  return 'async';
}

/**
 * Parse numeric value that may come as string or number.
 */
function parseNumber(value: string | number | null, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Transform raw query row to ReplicationStats.
 */
function transformRow(nodeId: string, row: StatsRow, timestamp: Date): ReplicationStats {
  return {
    nodeId,
    applicationName: row.application_name || 'unknown',
    clientAddr: row.client_addr,
    state: parseReplicationState(row.state),
    lagBytes: parseNumber(row.lag_bytes),
    lagSeconds: row.lag_seconds !== null ? parseNumber(row.lag_seconds) : null,
    syncState: parseSyncState(row.sync_state),
    sentLsn: row.sent_lsn,
    writeLsn: row.write_lsn,
    flushLsn: row.flush_lsn,
    replayLsn: row.replay_lsn,
    timestamp,
  };
}

/**
 * Execute replication stats query on a node.
 *
 * @param nodeId - Node identifier
 * @param queryFn - Query execution function
 * @param _hasPglogical - Not used for stats (same query for all nodes)
 * @returns Array of ReplicationStats for all standbys connected to this node
 */
async function execute(
  nodeId: string,
  queryFn: QueryFn,
  _hasPglogical: boolean
): Promise<ReplicationStats[]> {
  const timestamp = new Date();
  const rows = await queryFn<StatsRow>(STATS_QUERY);
  return rows.map((row) => transformRow(nodeId, row, timestamp));
}

/**
 * Replication statistics query module.
 */
export const statsQueryModule: QueryModule<ReplicationStats> = {
  execute,
  nativeQuery: STATS_QUERY,
};
