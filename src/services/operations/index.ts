/**
 * Operations Services Index
 *
 * Central entry point for all operation execution services.
 * Provides unified dispatch with timeout handling and error normalization.
 *
 * Feature: 013-operations-modal
 */

import type {
  Operation,
  OperationContext,
  OperationResult,
  QueryFn,
  SubscriptionOperationParams,
  ResyncTableParams,
  CreateSlotParams,
  SlotOperationParams,
  ClearConflictsParams,
} from '../../types/operations.js';
import { OPERATION_TIMEOUT_MS } from '../../types/operations.js';
import { pauseSubscription, resumeSubscription, resyncTable } from './subscription-ops.js';
import { createSlot, dropSlot } from './slot-ops.js';
import { clearConflicts } from './conflict-ops.js';
import { collectMetrics } from './prometheus.js';

// =============================================================================
// Timeout Wrapper
// =============================================================================

/**
 * Execute an operation with timeout.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = OPERATION_TIMEOUT_MS
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (err) {
    clearTimeout(timeoutId!);
    throw err;
  }
}

// =============================================================================
// Error Normalization
// =============================================================================

/**
 * Normalize errors and add remediation hints.
 */
function normalizeError(err: unknown): { message: string; hint: string | null } {
  const message = err instanceof Error ? err.message : String(err);
  const lowerMessage = message.toLowerCase();

  // Connection errors
  if (lowerMessage.includes('connection refused') || lowerMessage.includes('could not connect')) {
    return {
      message,
      hint: 'Verify the node is reachable and PostgreSQL is running.',
    };
  }

  // Permission errors
  if (lowerMessage.includes('permission denied')) {
    return {
      message,
      hint: 'Check that the PostgreSQL role has sufficient privileges.',
    };
  }

  // Timeout errors
  if (lowerMessage.includes('timeout')) {
    return {
      message,
      hint: 'The operation took too long. Retry or consider increasing the timeout.',
    };
  }

  // Not found errors
  if (lowerMessage.includes('does not exist')) {
    return {
      message,
      hint: 'The resource may have been dropped. Refresh the view to update.',
    };
  }

  // Active slot error
  if (lowerMessage.includes('is active') || lowerMessage.includes('slot is active')) {
    return {
      message,
      hint: 'Terminate active connections using this slot before dropping it.',
    };
  }

  return { message, hint: null };
}

// =============================================================================
// Operation Executor
// =============================================================================

/**
 * Execute an operation by ID with the given context and query function.
 */
export async function executeOperation(
  operation: Operation,
  context: OperationContext,
  queryFn: QueryFn
): Promise<OperationResult> {
  const startTime = Date.now();

  try {
    let result: OperationResult;

    switch (operation.id) {
      case 'pause-subscription': {
        const params: SubscriptionOperationParams = {
          nodeId: context.nodeId,
          subscriptionName: context.resourceName,
          immediate: true,
        };
        result = await withTimeout(pauseSubscription(params, queryFn));
        break;
      }

      case 'resume-subscription': {
        const params: SubscriptionOperationParams = {
          nodeId: context.nodeId,
          subscriptionName: context.resourceName,
          immediate: true,
        };
        result = await withTimeout(resumeSubscription(params, queryFn));
        break;
      }

      case 'resync-table': {
        const tableName = context.additionalParams?.tableName as string;
        if (!tableName) {
          return createErrorResult(
            operation.id,
            context,
            'Table name is required for resync operation',
            Date.now() - startTime
          );
        }
        const params: ResyncTableParams = {
          nodeId: context.nodeId,
          subscriptionName: context.resourceName,
          tableName,
        };
        result = await withTimeout(resyncTable(params, queryFn));
        break;
      }

      case 'create-slot': {
        const slotType = context.additionalParams?.slotType as 'logical' | 'physical' ?? 'logical';
        const outputPlugin = context.additionalParams?.outputPlugin as string ?? 'pgoutput';
        const params: CreateSlotParams = {
          nodeId: context.nodeId,
          slotName: context.resourceName,
          slotType,
          outputPlugin,
        };
        result = await withTimeout(createSlot(params, queryFn));
        break;
      }

      case 'drop-slot': {
        const params: SlotOperationParams = {
          nodeId: context.nodeId,
          slotName: context.resourceName,
        };
        result = await withTimeout(dropSlot(params, queryFn));
        break;
      }

      case 'clear-conflicts': {
        const params: ClearConflictsParams = {
          nodeId: context.nodeId,
        };
        result = await withTimeout(clearConflicts(params, queryFn));
        break;
      }

      case 'export-metrics': {
        // Export metrics doesn't require a query
        const metrics = collectMetrics();
        // formatAsPrometheus is available but not used here -
        // the hook/component handles formatting
        void metrics;
        return {
          id: crypto.randomUUID(),
          operationId: operation.id,
          context,
          status: 'success',
          message: 'Metrics exported successfully',
          error: null,
          remediationHint: null,
          timestamp: new Date(),
          durationMs: Date.now() - startTime,
        };
      }

      default:
        return createErrorResult(
          operation.id,
          context,
          `Unknown operation: ${operation.id}`,
          Date.now() - startTime
        );
    }

    // Update context node name in result if it was just nodeId
    return {
      ...result,
      context: {
        ...result.context,
        nodeName: context.nodeName,
      },
    };
  } catch (err) {
    const { message, hint } = normalizeError(err);
    return createErrorResult(operation.id, context, message, Date.now() - startTime, hint);
  }
}

/**
 * Create an error result.
 */
function createErrorResult(
  operationId: string,
  context: OperationContext,
  error: string,
  durationMs: number,
  hint?: string | null
): OperationResult {
  return {
    id: crypto.randomUUID(),
    operationId,
    context,
    status: 'failure',
    message: 'Operation failed',
    error,
    remediationHint: hint ?? null,
    timestamp: new Date(),
    durationMs,
  };
}

// =============================================================================
// Re-exports
// =============================================================================

export { pauseSubscription, resumeSubscription, resyncTable, getReplicatedTables } from './subscription-ops.js';
export { createSlot, dropSlot, isSlotActive } from './slot-ops.js';
export { clearConflicts, getConflictCount } from './conflict-ops.js';
export { collectMetrics, formatAsPrometheus, writeMetricsToFile, metricsCollector } from './prometheus.js';
