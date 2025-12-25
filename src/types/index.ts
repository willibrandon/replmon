/**
 * Type Definitions Index
 *
 * Central export point for all type definitions.
 *
 * Feature: 002-yaml-config
 */

// Runtime configuration types
export type {
  Configuration,
  ClusterConfig,
  ResolvedTheme,
  ResolvedThresholds,
  ThresholdLevels,
  ThemeColors,
} from './config.js';

// Connection types
export type { ConnectionConfig } from './connection.js';

// CLI argument types
export type { CLIArguments } from './cli.js';

// YAML configuration types
export type {
  YAMLConfigFile,
  YAMLNodeConfig,
  YAMLClusterConfig,
  YAMLThemeConfig,
  YAMLColorOverrides,
  YAMLThresholdConfig,
  YAMLThresholdLevels,
} from './yaml-config.js';

// Theme types (re-exported from config for convenience)
export type { ResolvedTheme as Theme, ThemeColors as Colors } from './theme.js';

// Error types
export {
  ConfigError,
  ConfigFileNotFoundError,
  ConfigFilePermissionError,
  YAMLParseError,
  EnvVarInterpolationError,
  ConfigValidationError,
  ClusterNodeReferenceError,
  ClusterNotFoundError,
  InvalidThresholdError,
  InsufficientArgumentsError,
} from './errors.js';

// Polling service types
export type {
  PollingConfig,
  ResolvedPollingConfig,
  ReplicationState,
  SyncState,
  SlotType,
  WalStatus,
  SubscriptionStatus,
  SubscriptionSource,
  ConflictSource,
  ReplicationStats,
  SlotData,
  SubscriptionData,
  ConflictData,
  NodeData,
  PollingCycleResult,
  PollingError,
  PollingEvents,
  QueryFn,
  QueryModule,
  PglogicalDetectionResult,
} from './polling.js';

// Topology panel types (008-topology-panel)
export type {
  ReplicationType,
  EdgeDirection,
  NodeRole,
  LagSeverity,
  TopologyEdge,
  TopologyNodeData,
  LayoutBreakpoint,
  TopologyLayoutConfig,
  UseTopologyResult,
  EdgeLagData,
} from './topology.js';
