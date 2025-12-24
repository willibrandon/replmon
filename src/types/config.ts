/**
 * Runtime Configuration Type Definitions
 *
 * TypeScript interfaces for the resolved, validated configuration.
 * These define the "runtime" config shapes after validation and transformation.
 *
 * Feature: 002-yaml-config
 */

import type { ConnectionConfig } from './connection.js';
import type {
  ResolvedTheme,
  ResolvedThresholds,
  ThresholdLevels,
  ThemeColors,
} from '../config/defaults.js';

// Re-export theme and threshold types for convenience
export type { ResolvedTheme, ResolvedThresholds, ThresholdLevels, ThemeColors };

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
