/**
 * YAML Configuration Contracts
 *
 * TypeScript interfaces for the YAML configuration file structure.
 * These define the "raw" config shapes before validation and transformation.
 *
 * Feature: 002-yaml-config
 * Date: 2025-12-23
 */

// =============================================================================
// YAML Input Types (Pre-Validation)
// =============================================================================

/**
 * Raw YAML configuration file structure.
 * This is the shape of the parsed YAML before Zod validation.
 */
export interface YAMLConfigFile {
  /** Named node configurations */
  nodes?: Record<string, YAMLNodeConfig>;

  /** Named cluster definitions (groups of nodes) */
  clusters?: Record<string, YAMLClusterConfig>;

  /** Theme configuration */
  theme?: string | YAMLThemeConfig;

  /** Threshold settings for alerts */
  thresholds?: YAMLThresholdConfig;

  /** Enable pglogical mode */
  pglogical?: boolean;
}

/**
 * Raw node configuration from YAML.
 * Supports environment variable interpolation via ${VAR_NAME} syntax.
 */
export interface YAMLNodeConfig {
  /** PostgreSQL host address */
  host?: string;

  /** PostgreSQL port (may be string before interpolation) */
  port?: number | string;

  /** Database name */
  database?: string;

  /** Database user */
  user?: string;

  /** Database password (supports env var interpolation) */
  password?: string;
}

/**
 * Cluster configuration from YAML.
 * References nodes by name defined at the top level.
 */
export interface YAMLClusterConfig {
  /** List of node names to include in this cluster */
  nodes: string[];

  /** Mark this cluster as the default when --cluster is not specified */
  default?: boolean;
}

/**
 * Theme configuration from YAML.
 * Can be a simple string (theme name) or object with custom colors.
 */
export interface YAMLThemeConfig {
  /** Base theme name: "dark" or "light" */
  name?: string;

  /** Custom color overrides (hex codes) */
  colors?: Partial<YAMLColorOverrides>;
}

/**
 * Custom color overrides.
 * All colors are optional; missing colors use base theme defaults.
 */
export interface YAMLColorOverrides {
  /** Main background color */
  background: string;

  /** Primary text color */
  foreground: string;

  /** Accent color for highlights */
  primary: string;

  /** Secondary accent color */
  secondary: string;

  /** Healthy/OK state color */
  success: string;

  /** Warning state color */
  warning: string;

  /** Critical/error state color */
  critical: string;

  /** Dimmed/inactive text color */
  muted: string;
}

/**
 * Threshold configuration from YAML.
 */
export interface YAMLThresholdConfig {
  /** Replication lag thresholds (in seconds) */
  replication_lag?: YAMLThresholdLevels;

  /** Slot retention thresholds (in bytes, accepts "1GB" format) */
  slot_retention?: YAMLThresholdLevels;

  /** Conflict rate thresholds (conflicts per minute) */
  conflict_rate?: YAMLThresholdLevels;
}

/**
 * Warning and critical levels for a metric.
 * Accepts numbers or human-readable strings like "10s", "1GB".
 */
export interface YAMLThresholdLevels {
  /** Warning threshold */
  warning?: number | string;

  /** Critical threshold */
  critical?: number | string;
}
