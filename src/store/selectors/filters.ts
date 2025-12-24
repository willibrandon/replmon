/**
 * Filter Selectors
 *
 * Filtered views for subscriptions, slots, conflicts based on criteria.
 *
 * Feature: 005-state-management
 */

import type {
  Selector,
  SubscriptionData,
  SlotData,
  FilterOptions,
} from '../types.js';

// =============================================================================
// Subscription Filters
// =============================================================================

/**
 * Get subscriptions filtered by options.
 */
export const selectFilteredSubscriptions =
  (options: FilterOptions): Selector<SubscriptionData[]> =>
  (state) => {
    const all: SubscriptionData[] = [];

    for (const [nodeId, subs] of state.subscriptions) {
      // Skip if filtering by nodeId and it doesn't match
      if (options.nodeId && options.nodeId !== nodeId) {
        continue;
      }

      // Skip stale nodes if not including stale
      if (options.includeStale === false && state.staleNodes.has(nodeId)) {
        continue;
      }

      for (const sub of subs) {
        // Filter by status
        if (options.subscriptionStatus && sub.status !== options.subscriptionStatus) {
          continue;
        }

        all.push(sub);
      }
    }

    return all;
  };

/**
 * Get subscriptions with lag above threshold (seconds).
 * Note: Lag data comes from replication stats, not directly on subscription.
 * This selector uses lag history for accurate filtering.
 */
export const selectLaggingSubscriptions =
  (minLagSeconds: number): Selector<SubscriptionData[]> =>
  (state) => {
    const lagging: SubscriptionData[] = [];

    for (const subs of state.subscriptions.values()) {
      for (const sub of subs) {
        const key = `${sub.nodeId}:${sub.subscriptionName}`;
        const history = state.lagHistory.get(key);
        if (history && history.length > 0) {
          const latestSample = history[history.length - 1];
          if (latestSample !== undefined && latestSample.lagSeconds !== null && latestSample.lagSeconds >= minLagSeconds) {
            lagging.push(sub);
          }
        }
      }
    }

    return lagging;
  };

/**
 * Get down/error subscriptions.
 */
export const selectUnhealthySubscriptions: Selector<SubscriptionData[]> = (state) => {
  const unhealthy: SubscriptionData[] = [];

  for (const subs of state.subscriptions.values()) {
    for (const sub of subs) {
      if (sub.status === 'down' || sub.status === 'unknown') {
        unhealthy.push(sub);
      }
    }
  }

  return unhealthy;
};

// =============================================================================
// Slot Filters
// =============================================================================

/**
 * Get active slots only.
 */
export const selectActiveSlots: Selector<SlotData[]> = (state) => {
  const active: SlotData[] = [];

  for (const slots of state.slots.values()) {
    for (const slot of slots) {
      if (slot.active) {
        active.push(slot);
      }
    }
  }

  return active;
};

/**
 * Get inactive slots only.
 */
export const selectInactiveSlots: Selector<SlotData[]> = (state) => {
  const inactive: SlotData[] = [];

  for (const slots of state.slots.values()) {
    for (const slot of slots) {
      if (!slot.active) {
        inactive.push(slot);
      }
    }
  }

  return inactive;
};

/**
 * Get stale slots (inactive with high retention).
 */
export const selectStaleSlots: Selector<SlotData[]> = (state) => {
  const stale: SlotData[] = [];

  for (const slots of state.slots.values()) {
    for (const slot of slots) {
      if (slot.isStale) {
        stale.push(slot);
      }
    }
  }

  return stale;
};

/**
 * Get logical slots only.
 */
export const selectLogicalSlots: Selector<SlotData[]> = (state) => {
  const logical: SlotData[] = [];

  for (const slots of state.slots.values()) {
    for (const slot of slots) {
      if (slot.slotType === 'logical') {
        logical.push(slot);
      }
    }
  }

  return logical;
};

/**
 * Get physical slots only.
 */
export const selectPhysicalSlots: Selector<SlotData[]> = (state) => {
  const physical: SlotData[] = [];

  for (const slots of state.slots.values()) {
    for (const slot of slots) {
      if (slot.slotType === 'physical') {
        physical.push(slot);
      }
    }
  }

  return physical;
};
