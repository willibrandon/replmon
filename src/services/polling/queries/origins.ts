/**
 * Replication Origin Query Module
 *
 * Queries pg_replication_origin_status for tracking what LSN
 * each subscription has actually applied from its provider.
 *
 * This gives accurate lag measurement for pglogical subscriptions.
 */

import type { QueryFn } from '../types.js';

/**
 * Origin status data.
 */
export interface OriginData {
  /** Node identifier */
  nodeId: string;
  /** Origin external ID (e.g., pgl_postgres_provider_sub1) */
  externalId: string;
  /** Last applied LSN from the remote/provider */
  remoteLsn: string;
  /** When this data was collected */
  timestamp: Date;
}

/**
 * SQL query for replication origin status.
 */
const ORIGINS_QUERY = `
SELECT
  external_id,
  remote_lsn::text
FROM pg_replication_origin_status
WHERE external_id IS NOT NULL
`;

/** Raw row type from query */
interface OriginRow {
  external_id: string;
  remote_lsn: string;
}

/**
 * Execute origins query on a node.
 */
export async function executeOriginsQuery(
  nodeId: string,
  queryFn: QueryFn
): Promise<OriginData[]> {
  const timestamp = new Date();
  const rows = await queryFn<OriginRow>(ORIGINS_QUERY);
  return rows.map((row) => ({
    nodeId,
    externalId: row.external_id,
    remoteLsn: row.remote_lsn,
    timestamp,
  }));
}
