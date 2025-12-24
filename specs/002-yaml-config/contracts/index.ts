/**
 * Configuration Contracts - Public API
 *
 * Feature: 002-yaml-config
 * Date: 2025-12-23
 */

// YAML input types (pre-validation)
export type {
  YAMLConfigFile,
  YAMLNodeConfig,
  YAMLClusterConfig,
  YAMLThemeConfig,
  YAMLColorOverrides,
  YAMLThresholdConfig,
  YAMLThresholdLevels,
} from './yaml-config.js';

// Runtime types (post-validation)
export type {
  ConnectionConfig,
  ClusterConfig,
  Configuration,
  ResolvedTheme,
  ThemeColors,
  ResolvedThresholds,
  ThresholdLevels,
} from './configuration.js';

// CLI argument types
export type { CLIArguments } from './cli.js';

// Default values
export {
  DEFAULT_LAG_WARNING_SECONDS,
  DEFAULT_LAG_CRITICAL_SECONDS,
  DEFAULT_RETENTION_WARNING_BYTES,
  DEFAULT_RETENTION_CRITICAL_BYTES,
  DEFAULT_CONFLICT_RATE_WARNING,
  DEFAULT_CONFLICT_RATE_CRITICAL,
  DEFAULT_THRESHOLDS,
  DARK_THEME_COLORS,
  LIGHT_THEME_COLORS,
  DEFAULT_THEME,
  DEFAULT_PORT,
  DEFAULT_DATABASE,
  CONFIG_FILENAME,
  CONFIG_DIR_NAME,
} from './defaults.js';

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
