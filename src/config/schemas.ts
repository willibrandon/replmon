import { z } from 'zod';
import os from 'os';

// =============================================================================
// Connection Schemas
// =============================================================================

/**
 * Schema for a single PostgreSQL connection configuration.
 */
export const ConnectionConfigSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535).default(5432),
  database: z.string().min(1, 'Database is required'),
  user: z.string().min(1).default(os.userInfo().username),
  password: z.string().optional(),
  name: z.string().optional(),
});

// =============================================================================
// Cluster Schemas
// =============================================================================

/**
 * Schema for cluster configuration from YAML.
 */
export const YAMLClusterConfigSchema = z.object({
  nodes: z.array(z.string()).min(1, 'Cluster must have at least one node'),
  default: z.boolean().optional(),
});

/**
 * Schema for resolved cluster configuration.
 */
export const ClusterConfigSchema = z.object({
  nodes: z.array(z.string()).min(1),
  default: z.boolean(),
});

// =============================================================================
// Theme Schemas
// =============================================================================

/**
 * Regex pattern for valid hex color codes.
 */
const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/**
 * Schema for hex color validation.
 */
export const HexColorSchema = z
  .string()
  .regex(HEX_COLOR_PATTERN, 'Invalid hex color format (use #RGB or #RRGGBB)');

/**
 * Schema for custom color overrides from YAML.
 */
export const YAMLColorOverridesSchema = z.object({
  background: HexColorSchema.optional(),
  foreground: HexColorSchema.optional(),
  primary: HexColorSchema.optional(),
  secondary: HexColorSchema.optional(),
  success: HexColorSchema.optional(),
  warning: HexColorSchema.optional(),
  critical: HexColorSchema.optional(),
  muted: HexColorSchema.optional(),
});

/**
 * Schema for theme configuration from YAML.
 * Can be a simple string (theme name) or object with custom colors.
 */
export const YAMLThemeConfigSchema = z.object({
  name: z.enum(['dark', 'light']).optional(),
  colors: YAMLColorOverridesSchema.optional(),
});

/**
 * Schema for complete theme colors (all required).
 */
export const ThemeColorsSchema = z.object({
  background: HexColorSchema,
  foreground: HexColorSchema,
  primary: HexColorSchema,
  secondary: HexColorSchema,
  success: HexColorSchema,
  warning: HexColorSchema,
  critical: HexColorSchema,
  muted: HexColorSchema,
});

/**
 * Schema for resolved theme configuration.
 */
export const ResolvedThemeSchema = z.object({
  name: z.enum(['dark', 'light', 'custom']),
  colors: ThemeColorsSchema,
});

// =============================================================================
// Threshold Schemas
// =============================================================================

/**
 * Schema for threshold levels from YAML.
 * Accepts numbers or human-readable strings like "10s", "1GB".
 */
export const YAMLThresholdLevelsSchema = z.object({
  warning: z.union([z.number(), z.string()]).optional(),
  critical: z.union([z.number(), z.string()]).optional(),
});

/**
 * Schema for threshold configuration from YAML.
 */
export const YAMLThresholdConfigSchema = z.object({
  replication_lag: YAMLThresholdLevelsSchema.optional(),
  slot_retention: YAMLThresholdLevelsSchema.optional(),
  conflict_rate: YAMLThresholdLevelsSchema.optional(),
});

/**
 * Schema for resolved threshold levels (all numeric).
 */
export const ThresholdLevelsSchema = z.object({
  warning: z.number().positive(),
  critical: z.number().positive(),
});

/**
 * Schema for resolved threshold configuration.
 */
export const ResolvedThresholdsSchema = z.object({
  replicationLag: ThresholdLevelsSchema,
  slotRetention: ThresholdLevelsSchema,
  conflictRate: ThresholdLevelsSchema,
});

// =============================================================================
// YAML Input Schemas
// =============================================================================

/**
 * Schema for raw YAML node configuration (before interpolation).
 */
export const YAMLNodeConfigSchema = z.object({
  host: z.string().optional(),
  port: z.union([z.number(), z.string()]).optional(),
  database: z.string().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
});

/**
 * Schema for raw YAML configuration file.
 */
export const YAMLConfigFileSchema = z.object({
  nodes: z.record(z.string(), YAMLNodeConfigSchema).optional(),
  clusters: z.record(z.string(), YAMLClusterConfigSchema).optional(),
  theme: z.union([z.string(), YAMLThemeConfigSchema]).optional(),
  thresholds: YAMLThresholdConfigSchema.optional(),
  pglogical: z.boolean().optional(),
});

// =============================================================================
// Configuration Output Schema
// =============================================================================

/**
 * Schema for the complete application configuration.
 */
export const ConfigurationSchema = z.object({
  nodes: z
    .record(z.string(), ConnectionConfigSchema)
    .refine((nodes) => Object.keys(nodes).length > 0, {
      message: 'At least one node must be configured',
    }),
  clusters: z.record(z.string(), ClusterConfigSchema).optional(),
  activeCluster: z.string().optional(),
  theme: ResolvedThemeSchema,
  thresholds: ResolvedThresholdsSchema,
  pglogical: z.boolean().default(false),
  source: z.enum(['file', 'cli', 'merged']),
  configPath: z.string().optional(),
});

// =============================================================================
// Type Exports
// =============================================================================

export type ValidatedConnectionConfig = z.infer<typeof ConnectionConfigSchema>;
export type ValidatedConfiguration = z.infer<typeof ConfigurationSchema>;
export type ValidatedClusterConfig = z.infer<typeof ClusterConfigSchema>;
export type ValidatedYAMLClusterConfig = z.infer<typeof YAMLClusterConfigSchema>;
export type ValidatedYAMLThemeConfig = z.infer<typeof YAMLThemeConfigSchema>;
export type ValidatedYAMLThresholdConfig = z.infer<typeof YAMLThresholdConfigSchema>;
