/**
 * Runtime Configuration Contracts
 *
 * TypeScript interfaces for the resolved, validated configuration.
 * These define the "runtime" config shapes after validation and transformation.
 *
 * Feature: 002-yaml-config
 * Date: 2025-12-23
 */

// =============================================================================
// Runtime Types (Post-Validation)
// =============================================================================

/**
 * PostgreSQL connection configuration for a single node.
 * All required fields are guaranteed to be present after validation.
 */
export interface ConnectionConfig {
  /** PostgreSQL host address */
  host: string;

  /** PostgreSQL port */
  port: number;

  /** Database name */
  database: string;

  /** Database user */
  user: string;

  /** Database password (optional, can use PGPASSWORD env) */
  password?: string;

  /** Node display name (derived from config key if not set) */
  name?: string;
}

/**
 * Resolved cluster configuration.
 * Node references have been validated to exist.
 */
export interface ClusterConfig {
  /** List of node names in this cluster */
  nodes: string[];

  /** Whether this cluster is the default */
  default: boolean;
}

/**
 * Complete application configuration after merging
 * config file, CLI flags, and environment variables.
 */
export interface Configuration {
  /** Named database connections */
  nodes: Record<string, ConnectionConfig>;

  /** Named cluster definitions */
  clusters?: Record<string, ClusterConfig>;

  /** Currently active cluster name */
  activeCluster?: string;

  /** Resolved theme configuration */
  theme: ResolvedTheme;

  /** Resolved threshold configuration */
  thresholds: ResolvedThresholds;

  /** Enable pglogical-specific monitoring */
  pglogical: boolean;

  /** Source of configuration (for debugging) */
  source: 'file' | 'cli' | 'merged';

  /** Path to config file if loaded from file */
  configPath?: string;
}

/**
 * Fully resolved theme with all colors defined.
 */
export interface ResolvedTheme {
  /** Theme identifier */
  name: 'dark' | 'light' | 'custom';

  /** Complete color palette */
  colors: ThemeColors;
}

/**
 * Complete color palette for UI rendering.
 * All fields are required (defaults applied during resolution).
 */
export interface ThemeColors {
  /** Main background color (hex) */
  background: string;

  /** Primary text color (hex) */
  foreground: string;

  /** Accent color for highlights (hex) */
  primary: string;

  /** Secondary accent color (hex) */
  secondary: string;

  /** Healthy/OK state color (hex) */
  success: string;

  /** Warning state color (hex) */
  warning: string;

  /** Critical/error state color (hex) */
  critical: string;

  /** Dimmed/inactive text color (hex) */
  muted: string;
}

/**
 * Resolved threshold values in canonical units.
 * Human-readable formats have been converted to numbers.
 */
export interface ResolvedThresholds {
  /** Replication lag thresholds (in seconds) */
  replicationLag: ThresholdLevels;

  /** Slot retention thresholds (in bytes) */
  slotRetention: ThresholdLevels;

  /** Conflict rate thresholds (conflicts per minute) */
  conflictRate: ThresholdLevels;
}

/**
 * Resolved warning and critical levels for a metric.
 */
export interface ThresholdLevels {
  /** Warning threshold (numeric, in canonical units) */
  warning: number;

  /** Critical threshold (numeric, in canonical units) */
  critical: number;
}
