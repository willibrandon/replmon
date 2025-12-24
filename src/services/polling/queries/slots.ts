/**
 * Replication Slots Query Module
 *
 * Queries pg_replication_slots for slot information including
 * WAL retention calculation and stale slot detection.
 *
 * Provides:
 * - Slot name, type (physical/logical), plugin
 * - Active state and database
 * - WAL retention in bytes via pg_wal_lsn_diff()
 * - WAL status (PG13+)
 * - Stale detection (inactive with >1GB retention)
 */

import type {
  QueryModule,
  SlotData,
  SlotType,
  WalStatus,
  QueryFn,
} from '../types.js';

/** 1GB threshold for stale slot detection */
const STALE_THRESHOLD_BYTES = 1073741824;

/**
 * SQL query for replication slots.
 * WAL retention calculated via pg_wal_lsn_diff().
 * wal_status available in PG13+, returns NULL on older versions.
 */
const SLOTS_QUERY = `
SELECT
  slot_name,
  plugin,
  slot_type,
  database,
  active,
  COALESCE(
    pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::bigint,
    0
  ) AS retained_bytes,
  CASE
    WHEN current_setting('server_version_num')::integer >= 130000
    THEN wal_status::text
    ELSE NULL
  END AS wal_status
FROM pg_replication_slots
`;

/** Raw row type from pg_replication_slots query */
interface SlotRow {
  slot_name: string;
  plugin: string | null;
  slot_type: string;
  database: string | null;
  active: boolean;
  retained_bytes: string | number;
  wal_status: string | null;
}

/**
 * Parse slot type from string.
 * Falls back to 'physical' for unknown values.
 */
function parseSlotType(slotType: string): SlotType {
  const normalized = slotType.toLowerCase();
  if (normalized === 'physical' || normalized === 'logical') {
    return normalized as SlotType;
  }
  return 'physical';
}

/**
 * Parse WAL status from string.
 * Returns null for unknown values or when not available.
 */
function parseWalStatus(walStatus: string | null): WalStatus | null {
  if (!walStatus) return null;
  const normalized = walStatus.toLowerCase();
  if (normalized === 'reserved' || normalized === 'extended' ||
      normalized === 'unreserved' || normalized === 'lost') {
    return normalized as WalStatus;
  }
  return null;
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
 * Determine if a slot is stale.
 * A slot is stale if it's inactive and retaining >1GB of WAL.
 */
function isStale(active: boolean, retainedBytes: number): boolean {
  return !active && retainedBytes > STALE_THRESHOLD_BYTES;
}

/**
 * Transform raw query row to SlotData.
 */
function transformRow(nodeId: string, row: SlotRow, timestamp: Date): SlotData {
  const retainedBytes = parseNumber(row.retained_bytes);
  return {
    nodeId,
    slotName: row.slot_name,
    plugin: row.plugin,
    slotType: parseSlotType(row.slot_type),
    database: row.database,
    active: row.active,
    retainedBytes,
    walStatus: parseWalStatus(row.wal_status),
    isStale: isStale(row.active, retainedBytes),
    timestamp,
  };
}

/**
 * Execute replication slots query on a node.
 *
 * @param nodeId - Node identifier
 * @param queryFn - Query execution function
 * @param _hasPglogical - Not used for slots (same query for all nodes)
 * @returns Array of SlotData for all replication slots on this node
 */
async function execute(
  nodeId: string,
  queryFn: QueryFn,
  _hasPglogical: boolean
): Promise<SlotData[]> {
  const timestamp = new Date();
  const rows = await queryFn<SlotRow>(SLOTS_QUERY);
  return rows.map((row) => transformRow(nodeId, row, timestamp));
}

/**
 * Replication slots query module.
 */
export const slotsQueryModule: QueryModule<SlotData> = {
  execute,
  nativeQuery: SLOTS_QUERY,
};
