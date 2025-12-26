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
import { MAX_HISTORY_ENTRIES } from '../types/operations.js';

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
> = (set, _get) => ({
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

  /**
   * Execute an operation.
   *
   * Note: Actual operation execution is handled by the useOperations hook
   * which has access to the ConnectionManager. This action is deprecated
   * and returns a failure result. Use the hook's executeOperation instead.
   */
  executeOperation: async (
    operation: Operation,
    context: OperationContext
  ): Promise<OperationResult> => {
    // This action is deprecated - execution is now handled by useOperations hook
    // which has access to the ConnectionManager for database operations.
    // Return an error to surface any incorrect usage.
    const errorResult: OperationResult = {
      id: crypto.randomUUID(),
      operationId: operation.id,
      context,
      status: 'failure',
      message: 'Cannot execute operation',
      error: 'Use useOperations hook for operation execution',
      remediationHint: 'This is an internal error. Please report it.',
      timestamp: new Date(),
      durationMs: 0,
    };
    return errorResult;
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
