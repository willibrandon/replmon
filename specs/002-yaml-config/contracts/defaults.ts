/**
 * Default Configuration Values
 *
 * Canonical default values for configuration.
 * These are used when values are not specified in config file or CLI.
 *
 * Feature: 002-yaml-config
 * Date: 2025-12-23
 */

import type { ResolvedTheme, ResolvedThresholds, ThemeColors } from './configuration.js';

// =============================================================================
// Threshold Defaults
// =============================================================================

/** Default replication lag warning threshold (seconds) */
export const DEFAULT_LAG_WARNING_SECONDS = 10;

/** Default replication lag critical threshold (seconds) */
export const DEFAULT_LAG_CRITICAL_SECONDS = 60;

/** Default slot retention warning threshold (bytes) - 1GB */
export const DEFAULT_RETENTION_WARNING_BYTES = 1073741824;

/** Default slot retention critical threshold (bytes) - 5GB */
export const DEFAULT_RETENTION_CRITICAL_BYTES = 5368709120;

/** Default conflict rate warning threshold (conflicts per minute) */
export const DEFAULT_CONFLICT_RATE_WARNING = 5;

/** Default conflict rate critical threshold (conflicts per minute) */
export const DEFAULT_CONFLICT_RATE_CRITICAL = 20;

/** Default threshold configuration */
export const DEFAULT_THRESHOLDS: ResolvedThresholds = {
  replicationLag: {
    warning: DEFAULT_LAG_WARNING_SECONDS,
    critical: DEFAULT_LAG_CRITICAL_SECONDS,
  },
  slotRetention: {
    warning: DEFAULT_RETENTION_WARNING_BYTES,
    critical: DEFAULT_RETENTION_CRITICAL_BYTES,
  },
  conflictRate: {
    warning: DEFAULT_CONFLICT_RATE_WARNING,
    critical: DEFAULT_CONFLICT_RATE_CRITICAL,
  },
};

// =============================================================================
// Theme Defaults
// =============================================================================

/** Dark theme color palette */
export const DARK_THEME_COLORS: ThemeColors = {
  background: '#000000',
  foreground: '#FFFFFF',
  primary: '#00BFFF',
  secondary: '#6A5ACD',
  success: '#00FF00',
  warning: '#FFD700',
  critical: '#FF4500',
  muted: '#808080',
};

/** Light theme color palette */
export const LIGHT_THEME_COLORS: ThemeColors = {
  background: '#FFFFFF',
  foreground: '#000000',
  primary: '#0066CC',
  secondary: '#4B0082',
  success: '#228B22',
  warning: '#FF8C00',
  critical: '#DC143C',
  muted: '#A9A9A9',
};

/** Default theme (dark) */
export const DEFAULT_THEME: ResolvedTheme = {
  name: 'dark',
  colors: DARK_THEME_COLORS,
};

// =============================================================================
// Connection Defaults
// =============================================================================

/** Default PostgreSQL port */
export const DEFAULT_PORT = 5432;

/** Default database name */
export const DEFAULT_DATABASE = 'postgres';

// =============================================================================
// Path Constants
// =============================================================================

/** Config file name */
export const CONFIG_FILENAME = 'config.yaml';

/** Application config directory name */
export const CONFIG_DIR_NAME = 'replmon';
