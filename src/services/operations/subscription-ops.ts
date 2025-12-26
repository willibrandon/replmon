/**
 * Subscription Operations Service
 *
 * Implements pause, resume, and resync operations for subscriptions.
 * Supports both pglogical and native PostgreSQL logical replication.
 *
 * Feature: 013-operations-modal
 */

import type {
  SubscriptionOperationParams,
  ResyncTableParams,
  QueryFn,
  OperationContext,
  OperationResult,
} from '../../types/operations.js';
import {
  createSuccessResult,
  createFailureResult,
  quoteIdent,
} from './utils.js';

/**
 * Detect if a node has pglogical installed.
 */
async function hasPglogical(nodeId: string, queryFn: QueryFn): Promise<boolean> {
  try {
    const result = await queryFn<{ exists: boolean }>(
      nodeId,
      `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pglogical') as exists`
    );
    return result[0]?.exists ?? false;
  } catch {
    return false;
  }
}

// =============================================================================
// Pause Subscription
// =============================================================================

/**
 * Pause a subscription to stop receiving changes from the provider.
 *
 * For pglogical: Uses pglogical.alter_subscription_disable()
 * For native: Uses ALTER SUBSCRIPTION ... DISABLE
 */
export async function pauseSubscription(
  params: SubscriptionOperationParams,
  queryFn: QueryFn
): Promise<OperationResult> {
  const { nodeId, subscriptionName, immediate = true } = params;
  const startTime = Date.now();

  const context: OperationContext = {
    nodeId,
    nodeName: nodeId,
    resourceId: subscriptionName,
    resourceName: subscriptionName,
  };

  try {
    const isPglogical = await hasPglogical(nodeId, queryFn);

    if (isPglogical) {
      // pglogical subscription
      await queryFn(
        nodeId,
        `SELECT pglogical.alter_subscription_disable($1, $2)`,
        [subscriptionName, immediate]
      );
    } else {
      // Native PostgreSQL subscription
      // Note: Native ALTER SUBSCRIPTION doesn't have 'immediate' option
      await queryFn(
        nodeId,
        `ALTER SUBSCRIPTION ${quoteIdent(subscriptionName)} DISABLE`
      );
    }

    return createSuccessResult(
      'pause-subscription',
      context,
      `Subscription "${subscriptionName}" paused successfully`,
      Date.now() - startTime
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return createFailureResult(
      'pause-subscription',
      context,
      errorMessage,
      Date.now() - startTime
    );
  }
}

// =============================================================================
// Resume Subscription
// =============================================================================

/**
 * Resume a paused subscription to start receiving changes.
 *
 * For pglogical: Uses pglogical.alter_subscription_enable()
 * For native: Uses ALTER SUBSCRIPTION ... ENABLE
 */
export async function resumeSubscription(
  params: SubscriptionOperationParams,
  queryFn: QueryFn
): Promise<OperationResult> {
  const { nodeId, subscriptionName, immediate = true } = params;
  const startTime = Date.now();

  const context: OperationContext = {
    nodeId,
    nodeName: nodeId,
    resourceId: subscriptionName,
    resourceName: subscriptionName,
  };

  try {
    const isPglogical = await hasPglogical(nodeId, queryFn);

    if (isPglogical) {
      // pglogical subscription
      await queryFn(
        nodeId,
        `SELECT pglogical.alter_subscription_enable($1, $2)`,
        [subscriptionName, immediate]
      );
    } else {
      // Native PostgreSQL subscription
      await queryFn(
        nodeId,
        `ALTER SUBSCRIPTION ${quoteIdent(subscriptionName)} ENABLE`
      );
    }

    return createSuccessResult(
      'resume-subscription',
      context,
      `Subscription "${subscriptionName}" resumed successfully`,
      Date.now() - startTime
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return createFailureResult(
      'resume-subscription',
      context,
      errorMessage,
      Date.now() - startTime
    );
  }
}

// =============================================================================
// Resync Table
// =============================================================================

/**
 * Resync a specific table within a pglogical subscription.
 *
 * WARNING: This will TRUNCATE the table first, then re-copy from provider.
 * Only available for pglogical subscriptions.
 */
export async function resyncTable(
  params: ResyncTableParams,
  queryFn: QueryFn
): Promise<OperationResult> {
  const { nodeId, subscriptionName, tableName } = params;
  const startTime = Date.now();

  const context: OperationContext = {
    nodeId,
    nodeName: nodeId,
    resourceId: `${subscriptionName}:${tableName}`,
    resourceName: tableName,
    additionalParams: { subscriptionName, tableName },
  };

  try {
    const isPglogical = await hasPglogical(nodeId, queryFn);

    if (!isPglogical) {
      return createFailureResult(
        'resync-table',
        context,
        'Resync table is only available for pglogical subscriptions',
        Date.now() - startTime
      );
    }

    // pglogical resync table function
    await queryFn(
      nodeId,
      `SELECT pglogical.alter_subscription_resynchronize_table($1, $2::regclass)`,
      [subscriptionName, tableName]
    );

    return createSuccessResult(
      'resync-table',
      context,
      `Table "${tableName}" resync initiated for subscription "${subscriptionName}"`,
      Date.now() - startTime
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return createFailureResult(
      'resync-table',
      context,
      errorMessage,
      Date.now() - startTime
    );
  }
}

// =============================================================================
// Get Replicated Tables
// =============================================================================

/**
 * Get list of tables replicated by a subscription.
 * Returns schema-qualified table names.
 */
export async function getReplicatedTables(
  nodeId: string,
  subscriptionName: string,
  queryFn: QueryFn
): Promise<string[]> {
  try {
    const isPglogical = await hasPglogical(nodeId, queryFn);

    if (isPglogical) {
      // pglogical: Query replication sets for the subscription
      const result = await queryFn<{ nspname: string; relname: string }>(
        nodeId,
        `
        SELECT DISTINCT n.nspname, c.relname
        FROM pglogical.subscription s
        JOIN pglogical.subscription_rel sr ON s.sub_id = sr.sub_id
        JOIN pg_class c ON c.oid = sr.reloid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE s.sub_name = $1
        ORDER BY n.nspname, c.relname
        `,
        [subscriptionName]
      );
      return result.map((r) => `${r.nspname}.${r.relname}`);
    } else {
      // Native: Query publication tables
      const result = await queryFn<{ nspname: string; relname: string }>(
        nodeId,
        `
        SELECT DISTINCT n.nspname, c.relname
        FROM pg_subscription_rel sr
        JOIN pg_subscription s ON s.oid = sr.srsubid
        JOIN pg_class c ON c.oid = sr.srrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE s.subname = $1
        ORDER BY n.nspname, c.relname
        `,
        [subscriptionName]
      );
      return result.map((r) => `${r.nspname}.${r.relname}`);
    }
  } catch {
    return [];
  }
}

