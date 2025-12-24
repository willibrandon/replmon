/**
 * Subscriptions Query Module
 *
 * Queries subscription information from both native PostgreSQL
 * logical replication and pglogical extension.
 *
 * Detection Strategy:
 * - Query native pg_subscription + pg_stat_subscription (always)
 * - Query pglogical.show_subscription_status() (when pglogical detected)
 * - Merge results, deduplicating by subscription name
 *
 * Provides:
 * - Subscription name, enabled state, status
 * - LSN positions (received, latest_end)
 * - Worker PID and last message time
 * - Provider node and replication sets (pglogical only)
 */

import type {
  QueryModule,
  SubscriptionData,
  SubscriptionStatus,
  QueryFn,
} from '../types.js';

/**
 * SQL query for native PostgreSQL subscriptions.
 * Joins pg_subscription with pg_stat_subscription for runtime status.
 */
const NATIVE_SUBSCRIPTIONS_QUERY = `
SELECT
  sub.subname AS subscription_name,
  sub.subenabled AS enabled,
  sub.subslotname AS slot_name,
  st.received_lsn::text AS received_lsn,
  st.latest_end_lsn::text AS latest_end_lsn,
  st.last_msg_receipt_time AS last_message_time,
  st.pid AS worker_pid
FROM pg_subscription sub
LEFT JOIN pg_stat_subscription st ON st.subid = sub.oid AND st.worker_type = 'apply'
`;

/**
 * SQL query for pglogical subscriptions.
 * Uses pglogical.show_subscription_status() function.
 */
const PGLOGICAL_SUBSCRIPTIONS_QUERY = `
SELECT
  subscription_name,
  status,
  provider_node,
  slot_name,
  replication_sets
FROM pglogical.show_subscription_status(NULL)
`;

/** Raw row type from native subscriptions query */
interface NativeSubRow {
  subscription_name: string;
  enabled: boolean;
  slot_name: string | null;
  received_lsn: string | null;
  latest_end_lsn: string | null;
  last_message_time: Date | null;
  worker_pid: number | null;
}

/** Raw row type from pglogical subscriptions query */
interface PglogicalSubRow {
  subscription_name: string;
  status: string | null;
  provider_node: string | null;
  slot_name: string | null;
  replication_sets: string[] | string | null;
}

/**
 * Map pglogical status string to SubscriptionStatus.
 */
function mapPglogicalStatus(status: string | null): SubscriptionStatus {
  if (!status) return 'unknown';
  const normalized = status.toLowerCase();

  switch (normalized) {
    case 'replicating':
      return 'replicating';
    case 'initializing':
    case 'init':
      return 'initializing';
    case 'down':
    case 'stopped':
      return 'down';
    case 'catchup':
    case 'catching_up':
      return 'catchup';
    default:
      return 'unknown';
  }
}

/**
 * Infer subscription status from native subscription state.
 * Native subscriptions don't have an explicit status field,
 * so we infer from enabled state and worker presence.
 */
function inferNativeStatus(enabled: boolean, workerPid: number | null): SubscriptionStatus {
  if (!enabled) return 'down';
  if (workerPid !== null) return 'replicating';
  return 'unknown';
}

/**
 * Parse replication sets from pglogical.
 * Can be an array or a comma-separated string.
 */
function parseReplicationSets(sets: string[] | string | null): string[] {
  if (!sets) return [];
  if (Array.isArray(sets)) return sets;
  if (typeof sets === 'string') {
    // Handle PostgreSQL array format: {set1,set2}
    const cleaned = sets.replace(/^\{|\}$/g, '');
    if (!cleaned) return [];
    return cleaned.split(',').map((s) => s.trim());
  }
  return [];
}

/**
 * Transform native subscription row to SubscriptionData.
 */
function transformNativeRow(
  nodeId: string,
  row: NativeSubRow,
  timestamp: Date
): SubscriptionData {
  return {
    nodeId,
    subscriptionName: row.subscription_name,
    enabled: row.enabled,
    status: inferNativeStatus(row.enabled, row.worker_pid),
    providerNode: null, // Not available in native subscriptions
    slotName: row.slot_name,
    receivedLsn: row.received_lsn,
    latestEndLsn: row.latest_end_lsn,
    replicationSets: [], // Not applicable for native subscriptions
    lastMessageTime: row.last_message_time,
    workerPid: row.worker_pid,
    source: 'native',
    timestamp,
  };
}

/**
 * Transform pglogical subscription row to SubscriptionData.
 */
function transformPglogicalRow(
  nodeId: string,
  row: PglogicalSubRow,
  timestamp: Date
): SubscriptionData {
  return {
    nodeId,
    subscriptionName: row.subscription_name,
    enabled: row.status !== 'down' && row.status !== 'stopped',
    status: mapPglogicalStatus(row.status),
    providerNode: row.provider_node,
    slotName: row.slot_name,
    receivedLsn: null, // Not directly available from show_subscription_status
    latestEndLsn: null,
    replicationSets: parseReplicationSets(row.replication_sets),
    lastMessageTime: null,
    workerPid: null,
    source: 'pglogical',
    timestamp,
  };
}

/**
 * Execute subscriptions query on a node.
 * Queries both native and pglogical subscriptions when available.
 *
 * @param nodeId - Node identifier
 * @param queryFn - Query execution function
 * @param hasPglogical - Whether node has pglogical installed
 * @returns Array of SubscriptionData for all subscriptions on this node
 */
async function execute(
  nodeId: string,
  queryFn: QueryFn,
  hasPglogical: boolean
): Promise<SubscriptionData[]> {
  const timestamp = new Date();
  const results: SubscriptionData[] = [];
  const seenNames = new Set<string>();

  // Query native subscriptions first
  try {
    const nativeRows = await queryFn<NativeSubRow>(NATIVE_SUBSCRIPTIONS_QUERY);
    for (const row of nativeRows) {
      const sub = transformNativeRow(nodeId, row, timestamp);
      results.push(sub);
      seenNames.add(sub.subscriptionName);
    }
  } catch {
    // Native subscription query may fail on replicas without pg_subscription access
    // This is expected behavior, continue with pglogical if available
  }

  // Query pglogical subscriptions if available
  if (hasPglogical) {
    try {
      const pglogicalRows = await queryFn<PglogicalSubRow>(PGLOGICAL_SUBSCRIPTIONS_QUERY);
      for (const row of pglogicalRows) {
        // Skip if already seen from native query (deduplication)
        if (seenNames.has(row.subscription_name)) continue;

        const sub = transformPglogicalRow(nodeId, row, timestamp);
        results.push(sub);
        seenNames.add(sub.subscriptionName);
      }
    } catch {
      // pglogical query may fail if function doesn't exist or permissions issue
      // Continue without pglogical subscriptions
    }
  }

  return results;
}

/**
 * Subscriptions query module.
 */
export const subscriptionsQueryModule: QueryModule<SubscriptionData> = {
  execute,
  nativeQuery: NATIVE_SUBSCRIPTIONS_QUERY,
  pglogicalQuery: PGLOGICAL_SUBSCRIPTIONS_QUERY,
};
