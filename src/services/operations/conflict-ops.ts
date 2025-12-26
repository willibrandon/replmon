/**
 * Conflict Operations Service
 *
 * Implements clear conflict history operation for pglogical.
 *
 * Feature: 013-operations-modal
 */

import type {
  ClearConflictsParams,
  QueryFn,
  OperationContext,
  OperationResult,
} from '../../types/operations.js';
import { createSuccessResult, createFailureResult } from './utils.js';

/**
 * Detect if a node has pglogical conflict history table.
 */
async function hasConflictHistory(nodeId: string, queryFn: QueryFn): Promise<boolean> {
  try {
    const result = await queryFn<{ exists: boolean }>(
      nodeId,
      `SELECT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'pglogical' AND table_name = 'conflict_history'
      ) as exists`
    );
    return result[0]?.exists ?? false;
  } catch {
    return false;
  }
}

// =============================================================================
// Clear Conflicts
// =============================================================================

/**
 * Clear all entries from pglogical conflict history.
 *
 * Only available for pglogical nodes with conflict_history table.
 * Log-based conflicts cannot be cleared.
 */
export async function clearConflicts(
  params: ClearConflictsParams,
  queryFn: QueryFn
): Promise<OperationResult> {
  const { nodeId } = params;
  const startTime = Date.now();

  const context: OperationContext = {
    nodeId,
    nodeName: nodeId,
    resourceId: nodeId,
    resourceName: nodeId,
  };

  try {
    // Check if conflict_history table exists
    const hasHistory = await hasConflictHistory(nodeId, queryFn);

    if (!hasHistory) {
      return createFailureResult(
        'clear-conflicts',
        context,
        'Conflict history table not available. This feature requires pglogical with conflict_history table enabled.',
        Date.now() - startTime
      );
    }

    // Get count before clearing for the message
    const countResult = await queryFn<{ count: string }>(
      nodeId,
      `SELECT COUNT(*) as count FROM pglogical.conflict_history`
    );
    const count = parseInt(countResult[0]?.count ?? '0', 10);

    // Truncate the conflict history
    await queryFn(nodeId, `TRUNCATE pglogical.conflict_history`);

    return createSuccessResult(
      'clear-conflicts',
      context,
      `Cleared ${count} conflict${count !== 1 ? 's' : ''} from history`,
      Date.now() - startTime
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return createFailureResult(
      'clear-conflicts',
      context,
      errorMessage,
      Date.now() - startTime
    );
  }
}

// =============================================================================
// Get Conflict Count
// =============================================================================

/**
 * Get the current count of conflicts in the history table.
 */
export async function getConflictCount(
  nodeId: string,
  queryFn: QueryFn
): Promise<number> {
  try {
    const hasHistory = await hasConflictHistory(nodeId, queryFn);
    if (!hasHistory) return 0;

    const result = await queryFn<{ count: string }>(
      nodeId,
      `SELECT COUNT(*) as count FROM pglogical.conflict_history`
    );
    return parseInt(result[0]?.count ?? '0', 10);
  } catch {
    return 0;
  }
}
