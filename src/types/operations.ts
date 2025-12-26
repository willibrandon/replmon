/**
 * Operations Modal Type Contracts
 * Feature: 013-operations-modal
 *
 * These types define the contract for the operations modal feature.
 * Implementation must adhere to these interfaces.
 */

// =============================================================================
// Enumerations
// =============================================================================

/**
 * Categories for grouping operations in the UI
 */
export type OperationCategory = 'subscription' | 'slot' | 'conflict' | 'metrics';

/**
 * Severity levels for operations
 * - info: Safe, read-only or easily reversible
 * - warning: Requires caution, may cause brief disruption
 * - danger: Destructive or irreversible action
 */
export type Severity = 'info' | 'warning' | 'danger';

/**
 * Type of resource an operation targets
 */
export type TargetType = 'subscription' | 'slot' | 'node' | 'table';

/**
 * Which replication systems support the operation
 */
export type ReplicationType = 'pglogical' | 'native' | 'both';

/**
 * Outcome status of an operation
 */
export type ResultStatus = 'success' | 'failure' | 'timeout' | 'cancelled';

/**
 * Prometheus metric types
 */
export type MetricType = 'gauge' | 'counter';

// =============================================================================
// Core Entities
// =============================================================================

/**
 * Definition of a DBA operation
 */
export interface Operation {
  /** Unique operation identifier (e.g., 'pause-subscription') */
  readonly id: string;
  /** Display name (e.g., 'Pause Subscription') */
  readonly name: string;
  /** Brief description of what the operation does */
  readonly description: string;
  /** Category for grouping in UI */
  readonly category: OperationCategory;
  /** Risk level */
  readonly severity: Severity;
  /** Whether confirmation prompt is needed */
  readonly requiresConfirmation: boolean;
  /** Whether user must type resource name to confirm */
  readonly requiresTypeToConfirm: boolean;
  /** What the operation targets */
  readonly targetType: TargetType;
  /** Which replication types support this operation */
  readonly availableFor: readonly ReplicationType[];
}

/**
 * Context required to execute an operation
 */
export interface OperationContext {
  /** Target node identifier */
  readonly nodeId: string;
  /** Display name of target node */
  readonly nodeName: string;
  /** Identifier of the resource being operated on */
  readonly resourceId: string;
  /** Display name of the resource */
  readonly resourceName: string;
  /** Extra parameters (e.g., table name for resync) */
  readonly additionalParams?: Readonly<Record<string, unknown>>;
}

/**
 * Result of an operation execution
 */
export interface OperationResult {
  /** Unique result identifier */
  readonly id: string;
  /** Reference to Operation.id */
  readonly operationId: string;
  /** Context that was used */
  readonly context: OperationContext;
  /** Outcome status */
  readonly status: ResultStatus;
  /** Human-readable result message */
  readonly message: string;
  /** Error details if failed */
  readonly error: string | null;
  /** Suggested fix if failed */
  readonly remediationHint: string | null;
  /** When operation completed */
  readonly timestamp: Date;
  /** How long operation took in milliseconds */
  readonly durationMs: number;
}

/**
 * State for the confirmation flow
 */
export interface ConfirmationState {
  /** Operation being confirmed */
  readonly operation: Operation;
  /** Target context */
  readonly context: OperationContext;
  /** Current user input for type-to-confirm */
  confirmationInput: string;
  /** Whether input matches required confirmation */
  readonly isValid: boolean;
  /** Whether user has seen the warning */
  warningAcknowledged: boolean;
}

/**
 * A single Prometheus metric
 */
export interface PrometheusMetric {
  /** Metric name (e.g., 'replmon_lag_bytes') */
  readonly name: string;
  /** Metric type */
  readonly type: MetricType;
  /** HELP text for the metric */
  readonly help: string;
  /** Label key-value pairs */
  readonly labels: Readonly<Record<string, string>>;
  /** Numeric value */
  readonly value: number;
}

// =============================================================================
// Store Types
// =============================================================================

/**
 * Operations slice state in Zustand store
 */
export interface OperationsSliceState {
  /** Session operation history (max 100 entries) */
  readonly history: readonly OperationResult[];
  /** Currently executing operation, if any */
  readonly currentOperation: Operation | null;
  /** Active confirmation flow state */
  readonly confirmationState: ConfirmationState | null;
  /** Whether an operation is currently executing */
  readonly isExecuting: boolean;
}

/**
 * Operations slice actions
 */
export interface OperationsSliceActions {
  /** Start confirmation flow for an operation */
  startConfirmation: (operation: Operation, context: OperationContext) => void;
  /** Update confirmation input text */
  updateConfirmationInput: (input: string) => void;
  /** Cancel confirmation flow */
  cancelConfirmation: () => void;
  /** Execute an operation */
  executeOperation: (operation: Operation, context: OperationContext) => Promise<OperationResult>;
  /** Add result to history */
  addToHistory: (result: OperationResult) => void;
  /** Clear all history */
  clearHistory: () => void;
}

// =============================================================================
// Service Interfaces
// =============================================================================

/**
 * Function signature for executing database queries
 * Matches ConnectionManager.query signature
 */
export type QueryFn = <T>(
  nodeId: string,
  queryText: string,
  params?: unknown[]
) => Promise<T[]>;

/**
 * Parameters for pause/resume subscription operations
 */
export interface SubscriptionOperationParams {
  /** Node where subscription exists */
  nodeId: string;
  /** Name of the subscription */
  subscriptionName: string;
  /** Whether to apply immediately (default: true) */
  immediate?: boolean;
}

/**
 * Parameters for table resync operation
 */
export interface ResyncTableParams extends SubscriptionOperationParams {
  /** Schema-qualified table name to resync */
  tableName: string;
}

/**
 * Parameters for slot operations
 */
export interface SlotOperationParams {
  /** Node where slot exists/will be created */
  nodeId: string;
  /** Name of the replication slot */
  slotName: string;
}

/**
 * Parameters for creating a slot
 */
export interface CreateSlotParams extends SlotOperationParams {
  /** Type of slot to create */
  slotType: 'logical' | 'physical';
  /** Output plugin for logical slots (default: 'pgoutput') */
  outputPlugin?: string;
}

/**
 * Parameters for clearing conflict log
 */
export interface ClearConflictsParams {
  /** Node where conflicts should be cleared */
  nodeId: string;
}

/**
 * Operation executor service interface
 */
export interface OperationExecutor {
  /** Pause a pglogical subscription */
  pauseSubscription: (params: SubscriptionOperationParams, queryFn: QueryFn) => Promise<OperationResult>;
  /** Resume a pglogical subscription */
  resumeSubscription: (params: SubscriptionOperationParams, queryFn: QueryFn) => Promise<OperationResult>;
  /** Resync a specific table */
  resyncTable: (params: ResyncTableParams, queryFn: QueryFn) => Promise<OperationResult>;
  /** Create a replication slot */
  createSlot: (params: CreateSlotParams, queryFn: QueryFn) => Promise<OperationResult>;
  /** Drop a replication slot */
  dropSlot: (params: SlotOperationParams, queryFn: QueryFn) => Promise<OperationResult>;
  /** Clear conflict history */
  clearConflicts: (params: ClearConflictsParams, queryFn: QueryFn) => Promise<OperationResult>;
}

/**
 * Prometheus metrics collector interface
 */
export interface MetricsCollector {
  /** Collect all current metrics from store state */
  collectMetrics: () => PrometheusMetric[];
  /** Format metrics as Prometheus text exposition format */
  formatAsPrometheus: (metrics: PrometheusMetric[]) => string;
}

// =============================================================================
// UI Component Props
// =============================================================================

/**
 * Props for OperationsList component
 */
export interface OperationsListProps {
  /** Available operations based on current context */
  readonly operations: readonly Operation[];
  /** Currently selected operation index */
  readonly selectedIndex: number;
  /** Callback when selection changes */
  readonly onSelectionChange: (index: number) => void;
  /** Callback when operation is selected for execution */
  readonly onOperationSelect: (operation: Operation) => void;
  /** Whether operations are disabled (executing) */
  readonly disabled: boolean;
}

/**
 * Props for OperationConfirm component
 */
export interface OperationConfirmProps {
  /** Current confirmation state */
  readonly state: ConfirmationState;
  /** Callback when input changes */
  readonly onInputChange: (input: string) => void;
  /** Callback when confirmed */
  readonly onConfirm: () => void;
  /** Callback when cancelled */
  readonly onCancel: () => void;
}

/**
 * Props for OperationHistory component
 */
export interface OperationHistoryProps {
  /** History entries to display */
  readonly history: readonly OperationResult[];
  /** Currently selected history index */
  readonly selectedIndex: number;
  /** Callback when selection changes */
  readonly onSelectionChange: (index: number) => void;
}

/**
 * Props for OperationResult display component
 */
export interface OperationResultProps {
  /** Result to display */
  readonly result: OperationResult;
  /** Callback to dismiss */
  readonly onDismiss: () => void;
}

/**
 * Props for PrometheusExport component
 */
export interface PrometheusExportProps {
  /** Formatted metrics text */
  readonly metricsText: string;
  /** Callback to dismiss */
  readonly onDismiss: () => void;
  /** Optional: callback for file export */
  readonly onExportToFile?: (filePath: string) => void;
}

/**
 * Props for TableSelector component (for resync operation)
 */
export interface TableSelectorProps {
  /** List of tables in the subscription */
  readonly tables: readonly string[];
  /** Currently selected table index */
  readonly selectedIndex: number;
  /** Callback when selection changes */
  readonly onSelectionChange: (index: number) => void;
  /** Callback when table is selected */
  readonly onTableSelect: (tableName: string) => void;
  /** Callback to go back */
  readonly onBack: () => void;
}

// =============================================================================
// Hook Return Types
// =============================================================================

/**
 * Return type for useOperations hook
 */
export interface UseOperationsResult {
  /** Operations available for current panel/selection */
  readonly availableOperations: readonly Operation[];
  /** Current operation history */
  readonly history: readonly OperationResult[];
  /** Currently executing operation */
  readonly currentOperation: Operation | null;
  /** Confirmation state if confirming */
  readonly confirmationState: ConfirmationState | null;
  /** Whether operation is executing */
  readonly isExecuting: boolean;
  /** Current context (panel, selection) */
  readonly currentContext: OperationContext | null;
  /** Start an operation (shows confirmation if needed) */
  readonly startOperation: (operation: Operation) => void;
  /** Execute operation (after confirmation) */
  readonly executeOperation: () => Promise<void>;
  /** Update confirmation input */
  readonly updateConfirmInput: (input: string) => void;
  /** Cancel current operation/confirmation */
  readonly cancel: () => void;
  /** Export metrics as Prometheus format */
  readonly exportMetrics: () => string;
}

// =============================================================================
// Operation Definitions (Static)
// =============================================================================

/**
 * All available operations
 * This serves as the operation registry
 */
export const OPERATIONS: readonly Operation[] = [
  {
    id: 'pause-subscription',
    name: 'Pause Subscription',
    description: 'Disable the subscription and stop receiving changes from provider',
    category: 'subscription',
    severity: 'warning',
    requiresConfirmation: true,
    requiresTypeToConfirm: false,
    targetType: 'subscription',
    availableFor: ['pglogical', 'native'],
  },
  {
    id: 'resume-subscription',
    name: 'Resume Subscription',
    description: 'Enable the subscription and resume receiving changes from provider',
    category: 'subscription',
    severity: 'info',
    requiresConfirmation: true,
    requiresTypeToConfirm: false,
    targetType: 'subscription',
    availableFor: ['pglogical', 'native'],
  },
  {
    id: 'resync-table',
    name: 'Resync Table',
    description: 'Re-copy table data from provider (WARNING: table will be truncated first)',
    category: 'subscription',
    severity: 'danger',
    requiresConfirmation: true,
    requiresTypeToConfirm: true,
    targetType: 'table',
    availableFor: ['pglogical'],
  },
  {
    id: 'create-slot',
    name: 'Create Replication Slot',
    description: 'Create a new replication slot for logical or physical replication',
    category: 'slot',
    severity: 'info',
    requiresConfirmation: true,
    requiresTypeToConfirm: false,
    targetType: 'slot',
    availableFor: ['pglogical', 'native'],
  },
  {
    id: 'drop-slot',
    name: 'Drop Replication Slot',
    description: 'Remove replication slot (may break active replication)',
    category: 'slot',
    severity: 'danger',
    requiresConfirmation: true,
    requiresTypeToConfirm: true,
    targetType: 'slot',
    availableFor: ['pglogical', 'native'],
  },
  {
    id: 'clear-conflicts',
    name: 'Clear Conflict Log',
    description: 'Remove all entries from pglogical conflict history',
    category: 'conflict',
    severity: 'danger',
    requiresConfirmation: true,
    requiresTypeToConfirm: true,
    targetType: 'node',
    availableFor: ['pglogical'],
  },
  {
    id: 'export-metrics',
    name: 'Export Prometheus Metrics',
    description: 'Display current metrics in Prometheus text format for copying',
    category: 'metrics',
    severity: 'info',
    requiresConfirmation: false,
    requiresTypeToConfirm: false,
    targetType: 'node',
    availableFor: ['pglogical', 'native'],
  },
] as const;

/**
 * Maximum number of history entries to retain
 */
export const MAX_HISTORY_ENTRIES = 100;

/**
 * Default operation timeout in milliseconds
 */
export const OPERATION_TIMEOUT_MS = 30000;
