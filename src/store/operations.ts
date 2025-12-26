/**
 * Operations Slice
 *
 * Manages operation state: history, confirmation flow, execution state.
 *
 * Feature: 013-operations-modal
 */

import type { StateCreator } from 'zustand';
import type { ReplmonStore } from './types.js';
import type {
  Operation,
  OperationContext,
  OperationResult,
  OperationsSliceState,
  OperationsSliceActions,
} from '../types/operations.js';
import { MAX_HISTORY_ENTRIES, OPERATION_TIMEOUT_MS } from '../types/operations.js';

/**
 * Operations slice type (state + actions).
 */
export type OperationsSlice = OperationsSliceState & OperationsSliceActions;

/**
 * Creates the operations slice for the combined store.
 */
export const createOperationsSlice: StateCreator<
  ReplmonStore,
  [['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  OperationsSlice
> = (set, get) => ({
  // Initial state
  history: [],
  currentOperation: null,
  confirmationState: null,
  isExecuting: false,

  // Actions

  startConfirmation: (operation: Operation, context: OperationContext) =>
    set(
      () => ({
        confirmationState: {
          operation,
          context,
          confirmationInput: '',
          isValid: false,
          warningAcknowledged: false,
        },
      }),
      undefined,
      'operations/startConfirmation'
    ),

  updateConfirmationInput: (input: string) =>
    set(
      (state) => {
        if (!state.confirmationState) return {};

        const { operation, context } = state.confirmationState;
        let isValid = false;

        if (operation.requiresTypeToConfirm) {
          // For type-to-confirm, user must match the resource name exactly
          isValid = input === context.resourceName;
        } else {
          // For simple confirmation, input can be anything (including empty)
          // The actual confirmation happens on Enter press
          isValid = true;
        }

        return {
          confirmationState: {
            ...state.confirmationState,
            confirmationInput: input,
            isValid,
            warningAcknowledged: true,
          },
        };
      },
      undefined,
      'operations/updateConfirmationInput'
    ),

  cancelConfirmation: () =>
    set(
      () => ({
        confirmationState: null,
        currentOperation: null,
      }),
      undefined,
      'operations/cancelConfirmation'
    ),

  executeOperation: async (
    operation: Operation,
    context: OperationContext
  ): Promise<OperationResult> => {
    const state = get();

    // Guard against concurrent operations
    if (state.isExecuting) {
      const errorResult: OperationResult = {
        id: crypto.randomUUID(),
        operationId: operation.id,
        context,
        status: 'failure',
        message: 'Cannot execute operation',
        error: 'Operation in progress',
        remediationHint: 'Wait for the current operation to complete before starting a new one.',
        timestamp: new Date(),
        durationMs: 0,
      };
      return errorResult;
    }

    // Set executing state
    set(
      () => ({
        isExecuting: true,
        currentOperation: operation,
        confirmationState: null,
      }),
      undefined,
      'operations/executeOperation/start'
    );

    const startTime = Date.now();

    try {
      // The actual operation execution will be handled by the service layer
      // This is a placeholder that will be wired up in the useOperations hook
      // For now, simulate a successful operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result: OperationResult = {
        id: crypto.randomUUID(),
        operationId: operation.id,
        context,
        status: 'success',
        message: `${operation.name} completed successfully`,
        error: null,
        remediationHint: null,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
      };

      // Add to history
      set(
        (state) => {
          const newHistory = [result, ...state.history];
          return {
            history: newHistory.slice(0, MAX_HISTORY_ENTRIES),
            isExecuting: false,
            currentOperation: null,
          };
        },
        undefined,
        'operations/executeOperation/success'
      );

      return result;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const isTimeout = durationMs >= OPERATION_TIMEOUT_MS;
      const errorMessage = err instanceof Error ? err.message : String(err);

      const result: OperationResult = {
        id: crypto.randomUUID(),
        operationId: operation.id,
        context,
        status: isTimeout ? 'timeout' : 'failure',
        message: `${operation.name} failed`,
        error: errorMessage,
        remediationHint: getRemediationHint(errorMessage),
        timestamp: new Date(),
        durationMs,
      };

      // Add to history
      set(
        (state) => {
          const newHistory = [result, ...state.history];
          return {
            history: newHistory.slice(0, MAX_HISTORY_ENTRIES),
            isExecuting: false,
            currentOperation: null,
          };
        },
        undefined,
        'operations/executeOperation/failure'
      );

      return result;
    }
  },

  addToHistory: (result: OperationResult) =>
    set(
      (state) => {
        const newHistory = [result, ...state.history];
        return { history: newHistory.slice(0, MAX_HISTORY_ENTRIES) };
      },
      undefined,
      'operations/addToHistory'
    ),

  clearHistory: () =>
    set(
      () => ({ history: [] }),
      undefined,
      'operations/clearHistory'
    ),
});

/**
 * Get remediation hint based on error message patterns.
 */
function getRemediationHint(errorMessage: string): string | null {
  const lowerError = errorMessage.toLowerCase();

  if (lowerError.includes('permission denied')) {
    return 'Check that the PostgreSQL role has sufficient privileges (SUPERUSER or replication).';
  }

  if (lowerError.includes('connection refused') || lowerError.includes('could not connect')) {
    return 'Verify the node is reachable and PostgreSQL is running.';
  }

  if (lowerError.includes('does not exist')) {
    return 'The resource may have been dropped. Refresh the view to update.';
  }

  if (lowerError.includes('timeout') || lowerError.includes('statement timeout')) {
    return 'The operation took too long. Retry or consider increasing the timeout.';
  }

  if (lowerError.includes('is active') || lowerError.includes('slot is active')) {
    return 'Terminate active connections using this slot before dropping it.';
  }

  if (lowerError.includes('already exists')) {
    return 'A resource with this name already exists. Choose a different name.';
  }

  return null;
}
