/**
 * State Management Store Types
 *
 * Internal TypeScript contracts for the Zustand store.
 * These types define the shape of state, actions, and selectors.
 *
 * Feature: 005-state-management
 * Date: 2025-12-23
 */

// Re-export existing types from polling service
export type {
  ReplicationStats,
  SlotData,
  SubscriptionData,
  ConflictData,
  PollingCycleResult,
  PollingError,
  NodeData,
  ReplicationState,
  SyncState,
  SlotType,
  WalStatus,
  SubscriptionStatus,
  SubscriptionSource,
  ConflictSource,
} from '../../../src/services/polling/types.js';

// Re-export existing types from connection manager
export type {
  HealthStatus,
  PoolStats,
} from '../../../src/services/connection-manager/types.js';

// =============================================================================
// UI Types
// =============================================================================

/**
 * Application panels for TUI navigation.
 */
export type Panel =
  | 'topology'
  | 'subscriptions'
  | 'slots'
  | 'conflicts'
  | 'operations';

/**
 * Modal dialog types.
 */
export type ModalType =
  | 'help'
  | 'operations'
  | 'confirmation'
  | 'details';

/**
 * Application screens.
 */
export type AppScreen = 'connection-status' | 'dashboard';

/**
 * Node connection status for UI display.
 */
export type NodeConnectionStatus = 'connecting' | 'connected' | 'failed';

// =============================================================================
// Data Types
// =============================================================================

/**
 * Node information derived from YAML configuration.
 */
export interface NodeInfo {
  /** Unique identifier (from YAML config name) */
  id: string;
  /** Display name */
  name: string;
  /** PostgreSQL host */
  host: string;
  /** PostgreSQL port */
  port: number;
  /** Database name */
  database: string;
  /** Whether pglogical is installed (detected at runtime) */
  hasPglogical: boolean;
}

/**
 * A timestamped lag measurement for time-series display.
 */
export interface LagSample {
  /** When measurement was taken */
  timestamp: Date;
  /** WAL lag in bytes */
  lagBytes: number;
  /** Lag duration in seconds (null if unavailable) */
  lagSeconds: number | null;
}

/**
 * Modal configuration data.
 */
export interface ModalConfig {
  /** Modal type */
  type: ModalType;
  /** Title for the modal */
  title?: string;
  /** Entity being operated on (e.g., slotName, subscriptionName) */
  targetEntity?: string;
  /** Node context */
  nodeId?: string;
  /** Additional data for modal content */
  data?: unknown;
}

// =============================================================================
// Store State Types
// =============================================================================

/**
 * Connection slice state (existing, for reference).
 */
export interface ConnectionSliceState {
  /** Current screen being displayed */
  currentScreen: AppScreen;
  /** Per-node connection status */
  nodeStatus: Map<string, NodeConnectionStatus>;
  /** Per-node connection error messages */
  connectionErrors: Map<string, string>;
  /** Whether pglogical mode is enabled */
  pglogicalMode: boolean;
  /** Per-node health status from ConnectionManager */
  healthStatus: Map<string, HealthStatus>;
  /** Per-node pool statistics from ConnectionManager */
  poolStats: Map<string, PoolStats>;
}

/**
 * Replication data slice state.
 */
export interface ReplicationSliceState {
  /** Node information from config */
  nodes: Map<string, NodeInfo>;
  /** Subscriptions per node (key: nodeId) */
  subscriptions: Map<string, SubscriptionData[]>;
  /** Slots per node (key: nodeId) */
  slots: Map<string, SlotData[]>;
  /** Conflicts per node (key: nodeId) */
  conflicts: Map<string, ConflictData[]>;
  /** Lag history per subscription (key: `${nodeId}:${subscriptionName}`) */
  lagHistory: Map<string, LagSample[]>;
  /** Nodes with stale data (disconnected) */
  staleNodes: Set<string>;
  /** Last successful polling timestamp per node */
  lastUpdated: Map<string, Date>;
}

/**
 * UI state slice.
 */
export interface UISliceState {
  /** Currently focused panel */
  focusedPanel: Panel;
  /** Panel focused before modal opened (for restoration) */
  previousFocusedPanel: Panel | null;
  /** Currently open modal */
  activeModal: ModalType | null;
  /** Modal configuration/data */
  modalData: ModalConfig | null;
  /** Selected item per panel (nodeId, subscriptionName, slotName, etc.) */
  selections: Map<Panel, string | null>;
}

// =============================================================================
// Store Actions Types
// =============================================================================

/**
 * Connection slice actions (existing, for reference).
 */
export interface ConnectionSliceActions {
  setNodeStatus: (nodeId: string, status: NodeConnectionStatus) => void;
  setConnectionError: (nodeId: string, error: string) => void;
  clearConnectionError: (nodeId: string) => void;
  setCurrentScreen: (screen: AppScreen) => void;
  setPglogicalMode: (enabled: boolean) => void;
  resetConnectionStates: () => void;
  initializeNodes: (nodeIds: string[]) => void;
  setHealth: (nodeId: string, status: HealthStatus) => void;
  setPoolStats: (nodeId: string, stats: PoolStats) => void;
  clearHealth: (nodeId: string) => void;
  clearPoolStats: (nodeId: string) => void;
}

/**
 * Replication slice actions.
 */
export interface ReplicationSliceActions {
  /** Initialize nodes from config */
  initializeNodesInfo: (nodes: NodeInfo[]) => void;

  /** Update subscriptions for a node from polling data */
  setSubscriptions: (nodeId: string, data: SubscriptionData[]) => void;

  /** Update slots for a node from polling data */
  setSlots: (nodeId: string, data: SlotData[]) => void;

  /** Update conflicts for a node from polling data */
  setConflicts: (nodeId: string, data: ConflictData[]) => void;

  /** Append lag sample for a subscription */
  appendLagSample: (
    nodeId: string,
    subscriptionName: string,
    sample: LagSample
  ) => void;

  /** Mark a node's data as stale (on disconnect) */
  markNodeStale: (nodeId: string) => void;

  /** Clear stale flag for a node (on reconnect with fresh data) */
  clearNodeStale: (nodeId: string) => void;

  /** Update last polling timestamp for a node */
  setLastUpdated: (nodeId: string, timestamp: Date) => void;

  /** Update pglogical detection result for a node */
  setNodePglogical: (nodeId: string, hasPglogical: boolean) => void;

  /** Process complete polling cycle result */
  handlePollingData: (result: PollingCycleResult) => void;

  /** Clear all replication data (for reset) */
  clearReplicationData: () => void;
}

/**
 * UI slice actions.
 */
export interface UISliceActions {
  /** Set focused panel */
  setFocusedPanel: (panel: Panel) => void;

  /** Cycle to next panel (Tab navigation) */
  focusNextPanel: () => void;

  /** Cycle to previous panel (Shift+Tab navigation) */
  focusPreviousPanel: () => void;

  /** Open a modal (preserves focus for restoration) */
  openModal: (config: ModalConfig) => void;

  /** Close current modal (restores previous focus) */
  closeModal: () => void;

  /** Set selection for a panel */
  setSelection: (panel: Panel, itemId: string | null) => void;

  /** Move selection up in current panel */
  selectPrevious: () => void;

  /** Move selection down in current panel */
  selectNext: () => void;

  /** Clear all UI state (for reset) */
  resetUIState: () => void;
}

// =============================================================================
// Combined Store Type
// =============================================================================

/**
 * Combined store state.
 */
export type ReplmonStoreState = ConnectionSliceState &
  ReplicationSliceState &
  UISliceState;

/**
 * Combined store actions.
 */
export type ReplmonStoreActions = ConnectionSliceActions &
  ReplicationSliceActions &
  UISliceActions;

/**
 * Complete store type (state + actions).
 */
export type ReplmonStore = ReplmonStoreState & ReplmonStoreActions;

// =============================================================================
// Selector Types
// =============================================================================

/**
 * Type for store selectors.
 */
export type Selector<T> = (state: ReplmonStore) => T;

/**
 * Aggregation selector results.
 */
export interface AggregationResults {
  /** All subscriptions across all nodes */
  allSubscriptions: SubscriptionData[];
  /** All slots across all nodes */
  allSlots: SlotData[];
  /** All conflicts across all nodes */
  allConflicts: ConflictData[];
}

/**
 * Computed value results.
 */
export interface ComputedValues {
  /** Total subscription count across all nodes */
  totalSubscriptions: number;
  /** Total slot count across all nodes */
  totalSlots: number;
  /** Total conflict count across all nodes */
  totalConflicts: number;
  /** Maximum lag in seconds across all subscriptions */
  maxLagSeconds: number | null;
  /** Maximum lag in bytes across all subscriptions */
  maxLagBytes: number;
  /** Number of stale nodes */
  staleNodeCount: number;
  /** Number of active slots */
  activeSlotsCount: number;
  /** Number of inactive slots */
  inactiveSlotsCount: number;
}

/**
 * Filter options for selectors.
 */
export interface FilterOptions {
  /** Filter subscriptions with lag above threshold (seconds) */
  minLagSeconds?: number;
  /** Filter subscriptions with lag above threshold (bytes) */
  minLagBytes?: number;
  /** Filter by subscription status */
  subscriptionStatus?: SubscriptionStatus;
  /** Filter by slot active status */
  slotActive?: boolean;
  /** Filter by node ID */
  nodeId?: string;
  /** Filter stale vs fresh nodes */
  includeStale?: boolean;
}

// =============================================================================
// Middleware Types
// =============================================================================

/**
 * Devtools middleware options.
 */
export interface DevtoolsOptions {
  /** Store name in Redux DevTools */
  name: string;
  /** Whether devtools is enabled */
  enabled: boolean;
}

/**
 * Action name for devtools logging.
 */
export type ActionName =
  | 'connection/setNodeStatus'
  | 'connection/setConnectionError'
  | 'connection/clearConnectionError'
  | 'connection/setCurrentScreen'
  | 'connection/setPglogicalMode'
  | 'connection/resetConnectionStates'
  | 'connection/initializeNodes'
  | 'connection/setHealth'
  | 'connection/setPoolStats'
  | 'connection/clearHealth'
  | 'connection/clearPoolStats'
  | 'replication/initializeNodesInfo'
  | 'replication/setSubscriptions'
  | 'replication/setSlots'
  | 'replication/setConflicts'
  | 'replication/appendLagSample'
  | 'replication/markNodeStale'
  | 'replication/clearNodeStale'
  | 'replication/setLastUpdated'
  | 'replication/setNodePglogical'
  | 'replication/handlePollingData'
  | 'replication/clearReplicationData'
  | 'ui/setFocusedPanel'
  | 'ui/focusNextPanel'
  | 'ui/focusPreviousPanel'
  | 'ui/openModal'
  | 'ui/closeModal'
  | 'ui/setSelection'
  | 'ui/selectPrevious'
  | 'ui/selectNext'
  | 'ui/resetUIState';

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum lag history samples per subscription.
 * Default: 60 (1 minute at 1s polling interval).
 */
export const MAX_LAG_HISTORY_SAMPLES = 60;

/**
 * Panel navigation order for Tab cycling.
 */
export const PANEL_ORDER: readonly Panel[] = [
  'topology',
  'subscriptions',
  'slots',
  'conflicts',
  'operations',
] as const;

/**
 * Keyboard shortcuts for direct panel access.
 */
export const PANEL_SHORTCUTS: Readonly<Record<string, Panel>> = {
  t: 'topology',
  s: 'subscriptions',
  l: 'slots',
  c: 'conflicts',
  o: 'operations',
} as const;
