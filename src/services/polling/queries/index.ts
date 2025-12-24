/**
 * Query Aggregator
 *
 * Exports all query modules and provides a unified interface
 * for executing all queries on a node.
 *
 * This module aggregates:
 * - Stats query (pg_stat_replication)
 * - Slots query (pg_replication_slots)
 * - Subscriptions query (native + pglogical)
 * - Conflicts query (PG16+ native)
 */

import type {
  QueryFn,
  ReplicationStats,
  SlotData,
  SubscriptionData,
  ConflictData,
} from '../types.js';

import { statsQueryModule } from './stats.js';
import { slotsQueryModule } from './slots.js';
import { subscriptionsQueryModule } from './subscriptions.js';
import { conflictsQueryModule } from './conflicts.js';

/**
 * Result of executing all queries on a single node.
 */
export interface NodeQueryResults {
  stats: ReplicationStats[];
  slots: SlotData[];
  subscriptions: SubscriptionData[];
  conflicts: ConflictData[];
}

/**
 * Execute all query modules on a single node.
 *
 * Runs all four query categories in parallel for optimal performance.
 * Each query handles its own errors and returns empty arrays on failure.
 *
 * @param nodeId - Node identifier
 * @param queryFn - Query execution function from ConnectionManager
 * @param hasPglogical - Whether node has pglogical installed
 * @returns Combined results from all query modules
 */
export async function executeAllQueries(
  nodeId: string,
  queryFn: QueryFn,
  hasPglogical: boolean
): Promise<NodeQueryResults> {
  // Execute all queries in parallel
  const [stats, slots, subscriptions, conflicts] = await Promise.all([
    safeExecute(() => statsQueryModule.execute(nodeId, queryFn, hasPglogical)),
    safeExecute(() => slotsQueryModule.execute(nodeId, queryFn, hasPglogical)),
    safeExecute(() => subscriptionsQueryModule.execute(nodeId, queryFn, hasPglogical)),
    safeExecute(() => conflictsQueryModule.execute(nodeId, queryFn, hasPglogical)),
  ]);

  return { stats, slots, subscriptions, conflicts };
}

/**
 * Safely execute a query, returning empty array on error.
 * This ensures one failing query doesn't break the entire cycle.
 */
async function safeExecute<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

// Re-export individual query modules for direct access
export { statsQueryModule } from './stats.js';
export { slotsQueryModule } from './slots.js';
export { subscriptionsQueryModule } from './subscriptions.js';
export { conflictsQueryModule, createUnavailableEntry } from './conflicts.js';
