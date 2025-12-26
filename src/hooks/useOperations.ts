/**
 * Operations Hook
 *
 * Provides context-sensitive operation management for the OperationsModal.
 * Determines available operations based on focused panel and selection.
 *
 * Feature: 013-operations-modal
 */

import { useMemo, useCallback } from 'react';
import { useStore } from '../store/index.js';
import { useConnectionStore } from '../store/connection.js';
import { useSubscriptions } from './useSubscriptions.js';
import { useSlots } from './useSlots.js';
import { useConflicts } from './useConflicts.js';
import type {
  Operation,
  OperationContext,
  UseOperationsResult,
  ReplicationType,
} from '../types/operations.js';
import { OPERATIONS } from '../types/operations.js';
import type { Panel } from '../store/types.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Determine if an operation is available for the current replication type.
 */
function isOperationAvailable(operation: Operation, isPglogical: boolean): boolean {
  const replicationType: ReplicationType = isPglogical ? 'pglogical' : 'native';
  return (
    operation.availableFor.includes(replicationType) ||
    operation.availableFor.includes('both')
  );
}

/**
 * Get operations available for a specific panel.
 */
function getOperationsForPanel(panel: Panel, isPglogical: boolean): readonly Operation[] {
  switch (panel) {
    case 'subscriptions':
      return OPERATIONS.filter(
        (op) =>
          op.category === 'subscription' &&
          isOperationAvailable(op, isPglogical)
      );

    case 'slots':
      return OPERATIONS.filter(
        (op) =>
          op.category === 'slot' &&
          isOperationAvailable(op, isPglogical)
      );

    case 'conflicts':
      return OPERATIONS.filter(
        (op) =>
          op.category === 'conflict' &&
          isOperationAvailable(op, isPglogical)
      );

    case 'topology':
      // Topology panel shows all available operations
      return OPERATIONS.filter((op) => isOperationAvailable(op, isPglogical));

    case 'operations':
      // Operations panel shows all available operations
      return OPERATIONS.filter((op) => isOperationAvailable(op, isPglogical));

    default:
      // Default: show only metrics export (always available)
      return OPERATIONS.filter((op) => op.id === 'export-metrics');
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing operations in the OperationsModal.
 *
 * Provides:
 * - Context-sensitive operation list based on focused panel
 * - Current operation context (node, resource)
 * - Confirmation flow management
 * - Operation execution
 * - Prometheus metrics export
 *
 * @returns UseOperationsResult with operations, state, and actions
 */
export function useOperations(): UseOperationsResult {
  // Store state
  const focusedPanel = useStore((s) => s.focusedPanel);
  const previousFocusedPanel = useStore((s) => s.previousFocusedPanel);
  const history = useStore((s) => s.history);
  const currentOperation = useStore((s) => s.currentOperation);
  const confirmationState = useStore((s) => s.confirmationState);
  const isExecuting = useStore((s) => s.isExecuting);
  const pglogicalMode = useConnectionStore((s) => s.pglogicalMode);
  const nodes = useStore((s) => s.nodes);
  const staleNodes = useStore((s) => s.staleNodes);
  const nodeStatus = useConnectionStore((s) => s.nodeStatus);

  // Store actions
  const startConfirmation = useStore((s) => s.startConfirmation);
  const updateConfirmationInput = useStore((s) => s.updateConfirmationInput);
  const cancelConfirmation = useStore((s) => s.cancelConfirmation);
  const storeExecuteOperation = useStore((s) => s.executeOperation);

  // Panel-specific selections
  const { selectedItem: selectedSubscription } = useSubscriptions();
  const { selectedItem: selectedSlot } = useSlots();
  const { selectedItem: selectedConflict } = useConflicts();

  // Use the panel that was focused before the operations modal opened
  // This allows context-sensitive operations even when modal is open
  const contextPanel = previousFocusedPanel ?? focusedPanel;

  // Derive available operations based on context panel
  const availableOperations = useMemo(() => {
    return getOperationsForPanel(contextPanel, pglogicalMode);
  }, [contextPanel, pglogicalMode]);

  // Derive current context based on panel and selection
  const currentContext = useMemo((): OperationContext | null => {
    switch (contextPanel) {
      case 'subscriptions':
        if (selectedSubscription) {
          const nodeInfo = nodes.get(selectedSubscription.nodeId);
          return {
            nodeId: selectedSubscription.nodeId,
            nodeName: nodeInfo?.name ?? selectedSubscription.nodeId,
            resourceId: selectedSubscription.subscriptionName,
            resourceName: selectedSubscription.subscriptionName,
          };
        }
        break;

      case 'slots':
        if (selectedSlot) {
          const nodeInfo = nodes.get(selectedSlot.nodeId);
          return {
            nodeId: selectedSlot.nodeId,
            nodeName: nodeInfo?.name ?? selectedSlot.nodeId,
            resourceId: selectedSlot.slotName,
            resourceName: selectedSlot.slotName,
          };
        }
        break;

      case 'conflicts':
        if (selectedConflict) {
          const nodeInfo = nodes.get(selectedConflict.nodeId);
          return {
            nodeId: selectedConflict.nodeId,
            nodeName: nodeInfo?.name ?? selectedConflict.nodeId,
            resourceId: selectedConflict.nodeId,
            resourceName: nodeInfo?.name ?? selectedConflict.nodeId,
          };
        }
        break;

      case 'topology':
        // For topology, use first node as context for metrics export
        // Specific operations should be handled via other panels
        const firstNode = Array.from(nodes.values())[0];
        if (firstNode) {
          return {
            nodeId: firstNode.id,
            nodeName: firstNode.name,
            resourceId: firstNode.id,
            resourceName: firstNode.name,
          };
        }
        break;
    }

    // Default: use first available node for global operations like metrics export
    const firstNode = Array.from(nodes.values())[0];
    if (firstNode) {
      return {
        nodeId: firstNode.id,
        nodeName: firstNode.name,
        resourceId: firstNode.id,
        resourceName: firstNode.name,
      };
    }

    return null;
  }, [contextPanel, selectedSubscription, selectedSlot, selectedConflict, nodes]);

  // Check if a node is available (not stale and connected)
  const isNodeAvailable = useCallback(
    (nodeId: string): boolean => {
      if (staleNodes.has(nodeId)) return false;
      const status = nodeStatus.get(nodeId);
      return status === 'connected';
    },
    [staleNodes, nodeStatus]
  );

  // Start an operation (may show confirmation first)
  const startOperation = useCallback(
    (operation: Operation) => {
      if (!currentContext) return;

      // Check if target node is available (except for metrics export which reads from local state)
      if (operation.id !== 'export-metrics' && !isNodeAvailable(currentContext.nodeId)) {
        // Add unavailable error to history
        const errorResult = {
          id: crypto.randomUUID(),
          operationId: operation.id,
          context: currentContext,
          status: 'failure' as const,
          message: 'Node Unavailable',
          error: `Cannot execute operation: node "${currentContext.nodeName}" is disconnected or stale`,
          remediationHint: 'Wait for the node to reconnect and refresh before trying again.',
          timestamp: new Date(),
          durationMs: 0,
        };
        useStore.getState().addToHistory(errorResult);
        return;
      }

      if (operation.requiresConfirmation) {
        startConfirmation(operation, currentContext);
      } else {
        // Execute immediately for operations that don't require confirmation
        storeExecuteOperation(operation, currentContext);
      }
    },
    [currentContext, startConfirmation, storeExecuteOperation, isNodeAvailable]
  );

  // Execute operation (after confirmation)
  const executeOperation = useCallback(async (): Promise<void> => {
    if (!confirmationState) return;

    const { operation, context, isValid } = confirmationState;

    // For type-to-confirm operations, validate input
    if (operation.requiresTypeToConfirm && !isValid) {
      return;
    }

    await storeExecuteOperation(operation, context);
  }, [confirmationState, storeExecuteOperation]);

  // Update confirmation input
  const updateConfirmInput = useCallback(
    (input: string) => {
      updateConfirmationInput(input);
    },
    [updateConfirmationInput]
  );

  // Cancel current operation/confirmation
  const cancel = useCallback(() => {
    cancelConfirmation();
  }, [cancelConfirmation]);

  // Export metrics as Prometheus format
  const exportMetrics = useCallback((): string => {
    // Collect metrics from store state
    const subscriptions = useStore.getState().subscriptions;
    const slots = useStore.getState().slots;
    const conflictEvents = useStore.getState().conflictEvents;
    const lagHistory = useStore.getState().lagHistory;

    const lines: string[] = [];

    // Lag bytes metric
    lines.push('# HELP replmon_lag_bytes Replication lag in bytes');
    lines.push('# TYPE replmon_lag_bytes gauge');
    for (const [key, history] of lagHistory) {
      const [nodeId, subscriptionName] = key.split(':');
      const latest = history[history.length - 1];
      if (latest && nodeId && subscriptionName) {
        const node = nodes.get(nodeId);
        const nodeName = node?.name ?? nodeId;
        lines.push(
          `replmon_lag_bytes{node="${nodeName}",subscription="${subscriptionName}"} ${latest.lagBytes}`
        );
      }
    }
    lines.push('');

    // Lag seconds metric
    lines.push('# HELP replmon_lag_seconds Replication lag in seconds');
    lines.push('# TYPE replmon_lag_seconds gauge');
    for (const [key, history] of lagHistory) {
      const [nodeId, subscriptionName] = key.split(':');
      const latest = history[history.length - 1];
      if (latest?.lagSeconds !== null && latest?.lagSeconds !== undefined && nodeId && subscriptionName) {
        const node = nodes.get(nodeId);
        const nodeName = node?.name ?? nodeId;
        lines.push(
          `replmon_lag_seconds{node="${nodeName}",subscription="${subscriptionName}"} ${latest.lagSeconds}`
        );
      }
    }
    lines.push('');

    // Subscription status metric
    lines.push('# HELP replmon_subscription_status Subscription status (1=active, 0=paused)');
    lines.push('# TYPE replmon_subscription_status gauge');
    for (const [nodeId, subs] of subscriptions) {
      const node = nodes.get(nodeId);
      const nodeName = node?.name ?? nodeId;
      for (const sub of subs) {
        const value = sub.enabled && sub.status === 'replicating' ? 1 : 0;
        lines.push(
          `replmon_subscription_status{node="${nodeName}",subscription="${sub.subscriptionName}"} ${value}`
        );
      }
    }
    lines.push('');

    // Slot WAL retention metric
    lines.push('# HELP replmon_slot_wal_retention_bytes WAL retained by slot in bytes');
    lines.push('# TYPE replmon_slot_wal_retention_bytes gauge');
    for (const [nodeId, nodeSlots] of slots) {
      const node = nodes.get(nodeId);
      const nodeName = node?.name ?? nodeId;
      for (const slot of nodeSlots) {
        lines.push(
          `replmon_slot_wal_retention_bytes{node="${nodeName}",slot_name="${slot.slotName}"} ${slot.pendingBytes}`
        );
      }
    }
    lines.push('');

    // Conflict total metric
    lines.push('# HELP replmon_conflict_total Total conflicts by type');
    lines.push('# TYPE replmon_conflict_total counter');
    const conflictCounts = new Map<string, Map<string, number>>();
    for (const [nodeId, events] of conflictEvents) {
      const node = nodes.get(nodeId);
      const nodeName = node?.name ?? nodeId;
      if (!conflictCounts.has(nodeName)) {
        conflictCounts.set(nodeName, new Map());
      }
      for (const event of events) {
        const typeMap = conflictCounts.get(nodeName);
        if (typeMap) {
          typeMap.set(event.conflictType, (typeMap.get(event.conflictType) ?? 0) + 1);
        }
      }
    }
    for (const [nodeName, typeMap] of conflictCounts) {
      for (const [conflictType, count] of typeMap) {
        lines.push(
          `replmon_conflict_total{node="${nodeName}",type="${conflictType}"} ${count}`
        );
      }
    }

    return lines.join('\n');
  }, [nodes]);

  return {
    availableOperations,
    history,
    currentOperation,
    confirmationState,
    isExecuting,
    currentContext,
    startOperation,
    executeOperation,
    updateConfirmInput,
    cancel,
    exportMetrics,
  };
}
