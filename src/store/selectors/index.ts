/**
 * Store Selectors Index
 *
 * Re-exports all selectors from category files.
 *
 * Feature: 005-state-management
 */

// Aggregation selectors
export {
  // Node selectors
  selectNodeIds,
  selectNodeById,
  selectNodeStatus,
  selectNodeHealth,
  selectIsNodeStale,
  selectNodeLastUpdated,
  selectHealthyNodeIds,
  selectStaleNodeIds,
  selectNodeHasPglogical,
  // Subscription selectors
  selectSubscriptionsByNode,
  selectAllSubscriptions,
  selectSubscriptionByName,
  // Slot selectors
  selectSlotsByNode,
  selectAllSlots,
  selectSlotByName,
  // Conflict selectors
  selectConflictsByNode,
  selectAllConflicts,
  selectConflictsBySubscription,
  // Lag history selectors
  selectLagHistory,
  selectLatestLagSample,
} from './aggregations.js';

// Filter selectors
export {
  selectFilteredSubscriptions,
  selectLaggingSubscriptions,
  selectUnhealthySubscriptions,
  selectActiveSlots,
  selectInactiveSlots,
  selectStaleSlots,
  selectLogicalSlots,
  selectPhysicalSlots,
} from './filters.js';

// Computed selectors
export {
  // Basic UI
  selectCurrentScreen,
  selectFocusedPanel,
  selectActiveModal,
  selectModalData,
  selectPglogicalMode,
  selectIsModalOpen,
  // Selection
  selectPanelSelection,
  selectCurrentSelection,
  selectIsSelected,
  selectSelectableItems,
  selectNextSelectableItem,
  selectPreviousSelectableItem,
  // Counts
  selectTotalSubscriptionCount,
  selectTotalSlotCount,
  selectActiveSlotCount,
  selectTotalConflictCount,
  selectHasConflicts,
  selectSubscriptionsWithConflicts,
  selectTotalRetainedBytes,
  // Node status
  selectNodeCountByStatus,
  selectIsPollingActive,
  // Lag
  selectMaxLagSeconds,
  selectMaxLagBytes,
  selectLagTrend,
  selectMaxHistoricalLag,
  selectMinHistoricalLag,
  selectAverageLag,
  // System health
  selectSystemHealthSummary,
  selectLastPollingTime,
} from './computed.js';

// Topology selectors (008-topology-panel)
export {
  selectTopologyEdges,
  selectTopologyNodes,
  selectNodeEdges,
  selectNodeRole,
  selectEdgeLag,
  selectActiveEdgeCount,
  selectHasCriticalLag,
  selectNodesByRole,
  selectSelectedTopologyNode,
} from './topology.js';
