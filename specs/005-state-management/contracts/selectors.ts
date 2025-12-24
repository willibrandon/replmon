/**
 * Store Selector Contracts
 *
 * Type definitions and signatures for memoized selectors.
 *
 * Feature: 005-state-management
 * Date: 2025-12-23
 */

import type {
  ReplmonStore,
  Selector,
  Panel,
  NodeInfo,
  SubscriptionData,
  SlotData,
  ConflictData,
  LagSample,
  HealthStatus,
  FilterOptions,
} from './store-types.js';

// =============================================================================
// Basic Selectors (Direct State Access)
// =============================================================================

/**
 * Basic selectors for direct state property access.
 * These are simple and don't require memoization.
 */
export interface BasicSelectors {
  /** Get current screen */
  selectCurrentScreen: Selector<ReplmonStore['currentScreen']>;

  /** Get focused panel */
  selectFocusedPanel: Selector<Panel>;

  /** Get active modal type */
  selectActiveModal: Selector<ReplmonStore['activeModal']>;

  /** Get modal configuration */
  selectModalData: Selector<ReplmonStore['modalData']>;

  /** Get pglogical mode */
  selectPglogicalMode: Selector<boolean>;

  /** Check if a specific modal is open */
  selectIsModalOpen: (modal: ReplmonStore['activeModal']) => Selector<boolean>;
}

// =============================================================================
// Node Selectors
// =============================================================================

/**
 * Selectors for node-related data.
 */
export interface NodeSelectors {
  /** Get all node IDs */
  selectNodeIds: Selector<string[]>;

  /** Get node info by ID */
  selectNodeById: (nodeId: string) => Selector<NodeInfo | undefined>;

  /** Get node connection status by ID */
  selectNodeStatus: (
    nodeId: string
  ) => Selector<ReplmonStore['nodeStatus'] extends Map<string, infer V>
    ? V | undefined
    : never>;

  /** Get node health status by ID */
  selectNodeHealth: (nodeId: string) => Selector<HealthStatus | undefined>;

  /** Check if node is stale */
  selectIsNodeStale: (nodeId: string) => Selector<boolean>;

  /** Get last updated timestamp for node */
  selectNodeLastUpdated: (nodeId: string) => Selector<Date | undefined>;

  /** Get all healthy node IDs */
  selectHealthyNodeIds: Selector<string[]>;

  /** Get all stale node IDs */
  selectStaleNodeIds: Selector<string[]>;

  /** Get node pglogical status */
  selectNodeHasPglogical: (nodeId: string) => Selector<boolean>;
}

// =============================================================================
// Subscription Selectors
// =============================================================================

/**
 * Selectors for subscription data.
 */
export interface SubscriptionSelectors {
  /** Get subscriptions for a specific node */
  selectSubscriptionsByNode: (nodeId: string) => Selector<SubscriptionData[]>;

  /** Get all subscriptions across all nodes (aggregation) */
  selectAllSubscriptions: Selector<SubscriptionData[]>;

  /** Get subscription by name within a node */
  selectSubscriptionByName: (
    nodeId: string,
    subscriptionName: string
  ) => Selector<SubscriptionData | undefined>;

  /** Get subscriptions filtered by options */
  selectFilteredSubscriptions: (
    options: FilterOptions
  ) => Selector<SubscriptionData[]>;

  /** Get subscriptions with lag above threshold */
  selectLaggingSubscriptions: (
    minLagSeconds: number
  ) => Selector<SubscriptionData[]>;

  /** Get down/error subscriptions */
  selectUnhealthySubscriptions: Selector<SubscriptionData[]>;

  /** Get total subscription count */
  selectTotalSubscriptionCount: Selector<number>;
}

// =============================================================================
// Slot Selectors
// =============================================================================

/**
 * Selectors for slot data.
 */
export interface SlotSelectors {
  /** Get slots for a specific node */
  selectSlotsByNode: (nodeId: string) => Selector<SlotData[]>;

  /** Get all slots across all nodes (aggregation) */
  selectAllSlots: Selector<SlotData[]>;

  /** Get slot by name within a node */
  selectSlotByName: (
    nodeId: string,
    slotName: string
  ) => Selector<SlotData | undefined>;

  /** Get active slots only */
  selectActiveSlots: Selector<SlotData[]>;

  /** Get inactive slots only */
  selectInactiveSlots: Selector<SlotData[]>;

  /** Get stale slots (inactive with high retention) */
  selectStaleSlots: Selector<SlotData[]>;

  /** Get logical slots only */
  selectLogicalSlots: Selector<SlotData[]>;

  /** Get physical slots only */
  selectPhysicalSlots: Selector<SlotData[]>;

  /** Get total slot count */
  selectTotalSlotCount: Selector<number>;

  /** Get active slot count */
  selectActiveSlotCount: Selector<number>;
}

// =============================================================================
// Conflict Selectors
// =============================================================================

/**
 * Selectors for conflict data.
 */
export interface ConflictSelectors {
  /** Get conflicts for a specific node */
  selectConflictsByNode: (nodeId: string) => Selector<ConflictData[]>;

  /** Get all conflicts across all nodes (aggregation) */
  selectAllConflicts: Selector<ConflictData[]>;

  /** Get conflicts for a specific subscription */
  selectConflictsBySubscription: (
    nodeId: string,
    subscriptionName: string
  ) => Selector<ConflictData | undefined>;

  /** Get total conflict count (sum of all conflict types) */
  selectTotalConflictCount: Selector<number>;

  /** Check if any conflicts exist */
  selectHasConflicts: Selector<boolean>;

  /** Get subscriptions with conflicts */
  selectSubscriptionsWithConflicts: Selector<string[]>;
}

// =============================================================================
// Lag History Selectors
// =============================================================================

/**
 * Selectors for lag history time-series data.
 */
export interface LagHistorySelectors {
  /** Get lag history for a subscription */
  selectLagHistory: (
    nodeId: string,
    subscriptionName: string
  ) => Selector<LagSample[]>;

  /** Get latest lag sample for a subscription */
  selectLatestLagSample: (
    nodeId: string,
    subscriptionName: string
  ) => Selector<LagSample | undefined>;

  /** Get lag trend (increasing, decreasing, stable) */
  selectLagTrend: (
    nodeId: string,
    subscriptionName: string
  ) => Selector<'increasing' | 'decreasing' | 'stable' | 'unknown'>;

  /** Get max lag in history window */
  selectMaxHistoricalLag: (
    nodeId: string,
    subscriptionName: string
  ) => Selector<number>;

  /** Get min lag in history window */
  selectMinHistoricalLag: (
    nodeId: string,
    subscriptionName: string
  ) => Selector<number>;

  /** Get average lag in history window */
  selectAverageLag: (
    nodeId: string,
    subscriptionName: string
  ) => Selector<number>;
}

// =============================================================================
// UI Selectors
// =============================================================================

/**
 * Selectors for UI state.
 */
export interface UISelectors {
  /** Get selection for a panel */
  selectPanelSelection: (panel: Panel) => Selector<string | null>;

  /** Get current panel's selection */
  selectCurrentSelection: Selector<string | null>;

  /** Check if an item is selected */
  selectIsSelected: (panel: Panel, itemId: string) => Selector<boolean>;

  /** Get items available for selection in current panel */
  selectSelectableItems: Selector<string[]>;

  /** Get next selectable item ID */
  selectNextSelectableItem: Selector<string | null>;

  /** Get previous selectable item ID */
  selectPreviousSelectableItem: Selector<string | null>;
}

// =============================================================================
// Computed/Aggregate Selectors
// =============================================================================

/**
 * Selectors for computed/aggregate values.
 */
export interface ComputedSelectors {
  /** Get maximum lag across all subscriptions (seconds) */
  selectMaxLagSeconds: Selector<number | null>;

  /** Get maximum lag across all subscriptions (bytes) */
  selectMaxLagBytes: Selector<number>;

  /** Get total retained bytes across all slots */
  selectTotalRetainedBytes: Selector<number>;

  /** Get count of nodes by status */
  selectNodeCountByStatus: Selector<
    Record<'connecting' | 'connected' | 'failed', number>
  >;

  /** Get overall system health summary */
  selectSystemHealthSummary: Selector<{
    totalNodes: number;
    healthyNodes: number;
    staleNodes: number;
    totalSubscriptions: number;
    laggingSubscriptions: number;
    totalSlots: number;
    staleSlots: number;
    hasConflicts: boolean;
  }>;

  /** Check if polling is active (any recent updates) */
  selectIsPollingActive: Selector<boolean>;

  /** Get most recent polling timestamp across all nodes */
  selectLastPollingTime: Selector<Date | null>;
}

// =============================================================================
// Combined Selectors Interface
// =============================================================================

/**
 * All store selectors combined.
 */
export interface StoreSelectors
  extends BasicSelectors,
    NodeSelectors,
    SubscriptionSelectors,
    SlotSelectors,
    ConflictSelectors,
    LagHistorySelectors,
    UISelectors,
    ComputedSelectors {}
