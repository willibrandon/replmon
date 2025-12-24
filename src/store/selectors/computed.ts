/**
 * Computed Selectors
 *
 * Computed values, counts, aggregates, and derived state.
 *
 * Feature: 005-state-management
 */

import type {
  ReplmonStore,
  Selector,
  Panel,
  ModalType,
} from '../types.js';

// =============================================================================
// Basic UI Selectors
// =============================================================================

/**
 * Get current screen.
 */
export const selectCurrentScreen: Selector<ReplmonStore['currentScreen']> = (state) =>
  state.currentScreen;

/**
 * Get focused panel.
 */
export const selectFocusedPanel: Selector<Panel> = (state) =>
  state.focusedPanel;

/**
 * Get active modal type.
 */
export const selectActiveModal: Selector<ModalType | null> = (state) =>
  state.activeModal;

/**
 * Get modal configuration.
 */
export const selectModalData: Selector<ReplmonStore['modalData']> = (state) =>
  state.modalData;

/**
 * Get pglogical mode.
 */
export const selectPglogicalMode: Selector<boolean> = (state) =>
  state.pglogicalMode;

/**
 * Check if a specific modal is open.
 */
export const selectIsModalOpen =
  (modal: ModalType): Selector<boolean> =>
  (state) =>
    state.activeModal === modal;

// =============================================================================
// Selection Selectors
// =============================================================================

/**
 * Get selection for a panel.
 */
export const selectPanelSelection =
  (panel: Panel): Selector<string | null> =>
  (state) =>
    state.selections.get(panel) ?? null;

/**
 * Get current panel's selection.
 */
export const selectCurrentSelection: Selector<string | null> = (state) =>
  state.selections.get(state.focusedPanel) ?? null;

/**
 * Check if an item is selected.
 */
export const selectIsSelected =
  (panel: Panel, itemId: string): Selector<boolean> =>
  (state) =>
    state.selections.get(panel) === itemId;

/**
 * Get items available for selection in current panel.
 */
export const selectSelectableItems: Selector<string[]> = (state) => {
  const panel = state.focusedPanel;

  switch (panel) {
    case 'topology':
      return Array.from(state.nodes.keys());

    case 'subscriptions': {
      const items: string[] = [];
      for (const subs of state.subscriptions.values()) {
        for (const sub of subs) {
          items.push(`${sub.nodeId}:${sub.subscriptionName}`);
        }
      }
      return items;
    }

    case 'slots': {
      const items: string[] = [];
      for (const slots of state.slots.values()) {
        for (const slot of slots) {
          items.push(`${slot.nodeId}:${slot.slotName}`);
        }
      }
      return items;
    }

    case 'conflicts': {
      const items: string[] = [];
      for (const conflicts of state.conflicts.values()) {
        for (const conflict of conflicts) {
          items.push(`${conflict.nodeId}:${conflict.subscriptionName}`);
        }
      }
      return items;
    }

    case 'operations':
      return [];

    default:
      return [];
  }
};

/**
 * Get next selectable item ID.
 */
export const selectNextSelectableItem: Selector<string | null> = (state) => {
  const items = selectSelectableItems(state);
  if (items.length === 0) return null;

  const current = state.selections.get(state.focusedPanel) ?? null;
  if (current === null) return items[0] ?? null;

  const currentIndex = items.indexOf(current);
  if (currentIndex >= items.length - 1) return items[items.length - 1] ?? null;
  return items[currentIndex + 1] ?? null;
};

/**
 * Get previous selectable item ID.
 */
export const selectPreviousSelectableItem: Selector<string | null> = (state) => {
  const items = selectSelectableItems(state);
  if (items.length === 0) return null;

  const current = state.selections.get(state.focusedPanel) ?? null;
  if (current === null) return items[items.length - 1] ?? null;

  const currentIndex = items.indexOf(current);
  if (currentIndex <= 0) return items[0] ?? null;
  return items[currentIndex - 1] ?? null;
};

// =============================================================================
// Count Selectors
// =============================================================================

/**
 * Get total subscription count.
 */
export const selectTotalSubscriptionCount: Selector<number> = (state) => {
  let count = 0;
  for (const subs of state.subscriptions.values()) {
    count += subs.length;
  }
  return count;
};

/**
 * Get total slot count.
 */
export const selectTotalSlotCount: Selector<number> = (state) => {
  let count = 0;
  for (const slots of state.slots.values()) {
    count += slots.length;
  }
  return count;
};

/**
 * Get active slot count.
 */
export const selectActiveSlotCount: Selector<number> = (state) => {
  let count = 0;
  for (const slots of state.slots.values()) {
    for (const slot of slots) {
      if (slot.active) count++;
    }
  }
  return count;
};

/**
 * Get total conflict count (sum of all conflict types).
 */
export const selectTotalConflictCount: Selector<number> = (state) => {
  let count = 0;
  for (const conflicts of state.conflicts.values()) {
    for (const conflict of conflicts) {
      count +=
        conflict.applyErrorCount +
        conflict.insertConflicts +
        conflict.updateOriginDiffers +
        conflict.updateExists +
        conflict.updateDeleted +
        conflict.updateMissing +
        conflict.deleteOriginDiffers +
        conflict.deleteMissing +
        conflict.multipleUniqueConflicts;
    }
  }
  return count;
};

/**
 * Check if any conflicts exist.
 */
export const selectHasConflicts: Selector<boolean> = (state) =>
  selectTotalConflictCount(state) > 0;

/**
 * Get subscriptions with conflicts.
 */
export const selectSubscriptionsWithConflicts: Selector<string[]> = (state) => {
  const subsWithConflicts: string[] = [];
  for (const conflicts of state.conflicts.values()) {
    for (const conflict of conflicts) {
      const totalConflicts =
        conflict.applyErrorCount +
        conflict.insertConflicts +
        conflict.updateOriginDiffers +
        conflict.updateExists +
        conflict.updateDeleted +
        conflict.updateMissing +
        conflict.deleteOriginDiffers +
        conflict.deleteMissing +
        conflict.multipleUniqueConflicts;

      if (totalConflicts > 0) {
        subsWithConflicts.push(`${conflict.nodeId}:${conflict.subscriptionName}`);
      }
    }
  }
  return subsWithConflicts;
};

/**
 * Get total retained bytes across all slots.
 */
export const selectTotalRetainedBytes: Selector<number> = (state) => {
  let total = 0;
  for (const slots of state.slots.values()) {
    for (const slot of slots) {
      total += slot.retainedBytes;
    }
  }
  return total;
};

// =============================================================================
// Node Status Selectors
// =============================================================================

/**
 * Get count of nodes by status.
 */
export const selectNodeCountByStatus: Selector<
  Record<'connecting' | 'connected' | 'failed', number>
> = (state) => {
  const counts = { connecting: 0, connected: 0, failed: 0 };
  for (const status of state.nodeStatus.values()) {
    counts[status]++;
  }
  return counts;
};

/**
 * Check if polling is active (any recent updates within 30 seconds).
 */
export const selectIsPollingActive: Selector<boolean> = (state) => {
  const now = Date.now();
  const thirtySecondsAgo = now - 30000;

  for (const timestamp of state.lastUpdated.values()) {
    if (timestamp.getTime() > thirtySecondsAgo) {
      return true;
    }
  }

  return false;
};

// =============================================================================
// Lag Selectors
// =============================================================================

/**
 * Get maximum lag across all subscriptions (seconds).
 */
export const selectMaxLagSeconds: Selector<number | null> = (state) => {
  let max: number | null = null;

  for (const history of state.lagHistory.values()) {
    if (history.length > 0) {
      const latest = history[history.length - 1];
      if (latest !== undefined && latest.lagSeconds !== null) {
        if (max === null || latest.lagSeconds > max) {
          max = latest.lagSeconds;
        }
      }
    }
  }

  return max;
};

/**
 * Get maximum lag across all subscriptions (bytes).
 */
export const selectMaxLagBytes: Selector<number> = (state) => {
  let max = 0;

  for (const history of state.lagHistory.values()) {
    if (history.length > 0) {
      const latest = history[history.length - 1];
      if (latest !== undefined && latest.lagBytes > max) {
        max = latest.lagBytes;
      }
    }
  }

  return max;
};

/**
 * Get lag trend (increasing, decreasing, stable).
 */
export const selectLagTrend =
  (
    nodeId: string,
    subscriptionName: string
  ): Selector<'increasing' | 'decreasing' | 'stable' | 'unknown'> =>
  (state) => {
    const key = `${nodeId}:${subscriptionName}`;
    const history = state.lagHistory.get(key);

    if (!history || history.length < 3) {
      return 'unknown';
    }

    // Compare last 3 samples
    const recent = history.slice(-3);
    const lag0 = recent[0];
    const lag1 = recent[1];
    const lag2 = recent[2];

    if (lag0 === undefined || lag1 === undefined || lag2 === undefined) {
      return 'unknown';
    }

    const v0 = lag0.lagSeconds ?? lag0.lagBytes;
    const v1 = lag1.lagSeconds ?? lag1.lagBytes;
    const v2 = lag2.lagSeconds ?? lag2.lagBytes;

    if (v2 > v1 && v1 > v0) {
      return 'increasing';
    }
    if (v2 < v1 && v1 < v0) {
      return 'decreasing';
    }
    return 'stable';
  };

/**
 * Get max lag in history window.
 */
export const selectMaxHistoricalLag =
  (nodeId: string, subscriptionName: string): Selector<number> =>
  (state) => {
    const key = `${nodeId}:${subscriptionName}`;
    const history = state.lagHistory.get(key) ?? [];

    let max = 0;
    for (const sample of history) {
      const lag = sample.lagSeconds ?? sample.lagBytes;
      if (lag > max) max = lag;
    }
    return max;
  };

/**
 * Get min lag in history window.
 */
export const selectMinHistoricalLag =
  (nodeId: string, subscriptionName: string): Selector<number> =>
  (state) => {
    const key = `${nodeId}:${subscriptionName}`;
    const history = state.lagHistory.get(key) ?? [];

    if (history.length === 0) return 0;

    let min = Infinity;
    for (const sample of history) {
      const lag = sample.lagSeconds ?? sample.lagBytes;
      if (lag < min) min = lag;
    }
    return min === Infinity ? 0 : min;
  };

/**
 * Get average lag in history window.
 */
export const selectAverageLag =
  (nodeId: string, subscriptionName: string): Selector<number> =>
  (state) => {
    const key = `${nodeId}:${subscriptionName}`;
    const history = state.lagHistory.get(key) ?? [];

    if (history.length === 0) return 0;

    let sum = 0;
    for (const sample of history) {
      sum += sample.lagSeconds ?? sample.lagBytes;
    }
    return sum / history.length;
  };

// =============================================================================
// System Health Summary
// =============================================================================

/**
 * Get overall system health summary.
 */
export const selectSystemHealthSummary: Selector<{
  totalNodes: number;
  healthyNodes: number;
  staleNodes: number;
  totalSubscriptions: number;
  laggingSubscriptions: number;
  totalSlots: number;
  staleSlots: number;
  hasConflicts: boolean;
}> = (state) => {
  const totalNodes = state.nodes.size;
  let healthyNodes = 0;
  for (const [nodeId, status] of state.nodeStatus) {
    if (status === 'connected' && !state.staleNodes.has(nodeId)) {
      healthyNodes++;
    }
  }

  let totalSubscriptions = 0;
  for (const subs of state.subscriptions.values()) {
    totalSubscriptions += subs.length;
  }

  let laggingSubscriptions = 0;
  for (const history of state.lagHistory.values()) {
    if (history.length > 0) {
      const latest = history[history.length - 1];
      // Consider lagging if lag > 10 seconds
      if (latest !== undefined && latest.lagSeconds !== null && latest.lagSeconds > 10) {
        laggingSubscriptions++;
      }
    }
  }

  let totalSlots = 0;
  let staleSlots = 0;
  for (const slots of state.slots.values()) {
    totalSlots += slots.length;
    for (const slot of slots) {
      if (slot.isStale) staleSlots++;
    }
  }

  return {
    totalNodes,
    healthyNodes,
    staleNodes: state.staleNodes.size,
    totalSubscriptions,
    laggingSubscriptions,
    totalSlots,
    staleSlots,
    hasConflicts: selectHasConflicts(state),
  };
};

/**
 * Get most recent polling timestamp across all nodes.
 */
export const selectLastPollingTime: Selector<Date | null> = (state) => {
  let latest: Date | null = null;

  for (const timestamp of state.lastUpdated.values()) {
    if (latest === null || timestamp.getTime() > latest.getTime()) {
      latest = timestamp;
    }
  }

  return latest;
};
