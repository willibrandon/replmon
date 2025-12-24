/**
 * Aggregation Selectors
 *
 * Cross-node aggregation selectors for subscriptions, slots, conflicts.
 *
 * Feature: 005-state-management
 */

import type {
  Selector,
  NodeInfo,
  SubscriptionData,
  SlotData,
  ConflictData,
  LagSample,
  HealthStatus,
} from '../types.js';

// =============================================================================
// Node Selectors
// =============================================================================

/**
 * Get all node IDs.
 */
export const selectNodeIds: Selector<string[]> = (state) =>
  Array.from(state.nodes.keys());

/**
 * Get node info by ID.
 */
export const selectNodeById =
  (nodeId: string): Selector<NodeInfo | undefined> =>
  (state) =>
    state.nodes.get(nodeId);

/**
 * Get node connection status by ID.
 */
export const selectNodeStatus =
  (nodeId: string): Selector<'connecting' | 'connected' | 'failed' | undefined> =>
  (state) =>
    state.nodeStatus.get(nodeId);

/**
 * Get node health status by ID.
 */
export const selectNodeHealth =
  (nodeId: string): Selector<HealthStatus | undefined> =>
  (state) =>
    state.healthStatus.get(nodeId);

/**
 * Check if node is stale.
 */
export const selectIsNodeStale =
  (nodeId: string): Selector<boolean> =>
  (state) =>
    state.staleNodes.has(nodeId);

/**
 * Get last updated timestamp for node.
 */
export const selectNodeLastUpdated =
  (nodeId: string): Selector<Date | undefined> =>
  (state) =>
    state.lastUpdated.get(nodeId);

/**
 * Get all healthy node IDs (connected and not stale).
 */
export const selectHealthyNodeIds: Selector<string[]> = (state) => {
  const healthyIds: string[] = [];
  for (const nodeId of state.nodes.keys()) {
    const status = state.nodeStatus.get(nodeId);
    const isStale = state.staleNodes.has(nodeId);
    if (status === 'connected' && !isStale) {
      healthyIds.push(nodeId);
    }
  }
  return healthyIds;
};

/**
 * Get all stale node IDs.
 */
export const selectStaleNodeIds: Selector<string[]> = (state) =>
  Array.from(state.staleNodes);

/**
 * Get node pglogical status.
 */
export const selectNodeHasPglogical =
  (nodeId: string): Selector<boolean> =>
  (state) =>
    state.nodes.get(nodeId)?.hasPglogical ?? false;

// =============================================================================
// Subscription Selectors
// =============================================================================

/**
 * Get subscriptions for a specific node.
 */
export const selectSubscriptionsByNode =
  (nodeId: string): Selector<SubscriptionData[]> =>
  (state) =>
    state.subscriptions.get(nodeId) ?? [];

/**
 * Get all subscriptions across all nodes (aggregation).
 */
export const selectAllSubscriptions: Selector<SubscriptionData[]> = (state) => {
  const all: SubscriptionData[] = [];
  for (const subs of state.subscriptions.values()) {
    all.push(...subs);
  }
  return all;
};

/**
 * Get subscription by name within a node.
 */
export const selectSubscriptionByName =
  (nodeId: string, subscriptionName: string): Selector<SubscriptionData | undefined> =>
  (state) => {
    const subs = state.subscriptions.get(nodeId) ?? [];
    return subs.find((s) => s.subscriptionName === subscriptionName);
  };

// =============================================================================
// Slot Selectors
// =============================================================================

/**
 * Get slots for a specific node.
 */
export const selectSlotsByNode =
  (nodeId: string): Selector<SlotData[]> =>
  (state) =>
    state.slots.get(nodeId) ?? [];

/**
 * Get all slots across all nodes (aggregation).
 */
export const selectAllSlots: Selector<SlotData[]> = (state) => {
  const all: SlotData[] = [];
  for (const slots of state.slots.values()) {
    all.push(...slots);
  }
  return all;
};

/**
 * Get slot by name within a node.
 */
export const selectSlotByName =
  (nodeId: string, slotName: string): Selector<SlotData | undefined> =>
  (state) => {
    const slots = state.slots.get(nodeId) ?? [];
    return slots.find((s) => s.slotName === slotName);
  };

// =============================================================================
// Conflict Selectors
// =============================================================================

/**
 * Get conflicts for a specific node.
 */
export const selectConflictsByNode =
  (nodeId: string): Selector<ConflictData[]> =>
  (state) =>
    state.conflicts.get(nodeId) ?? [];

/**
 * Get all conflicts across all nodes (aggregation).
 */
export const selectAllConflicts: Selector<ConflictData[]> = (state) => {
  const all: ConflictData[] = [];
  for (const conflicts of state.conflicts.values()) {
    all.push(...conflicts);
  }
  return all;
};

/**
 * Get conflicts for a specific subscription.
 */
export const selectConflictsBySubscription =
  (nodeId: string, subscriptionName: string): Selector<ConflictData | undefined> =>
  (state) => {
    const conflicts = state.conflicts.get(nodeId) ?? [];
    return conflicts.find((c) => c.subscriptionName === subscriptionName);
  };

// =============================================================================
// Lag History Selectors
// =============================================================================

/**
 * Get lag history for a subscription.
 */
export const selectLagHistory =
  (nodeId: string, subscriptionName: string): Selector<LagSample[]> =>
  (state) => {
    const key = `${nodeId}:${subscriptionName}`;
    return state.lagHistory.get(key) ?? [];
  };

/**
 * Get latest lag sample for a subscription.
 */
export const selectLatestLagSample =
  (nodeId: string, subscriptionName: string): Selector<LagSample | undefined> =>
  (state) => {
    const key = `${nodeId}:${subscriptionName}`;
    const history = state.lagHistory.get(key);
    return history?.[history.length - 1];
  };
