import { z } from 'zod';
import os from 'os';

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

/**
 * Schema for the complete application configuration.
 */
export const ConfigurationSchema = z.object({
  nodes: z
    .record(z.string(), ConnectionConfigSchema)
    .refine((nodes) => Object.keys(nodes).length > 0, {
      message: 'At least one node must be configured',
    }),
  pglogical: z.boolean().default(false),
  source: z.enum(['file', 'cli', 'merged']),
  configPath: z.string().optional(),
});

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
  pglogical: z.boolean().optional(),
});

export type ValidatedConnectionConfig = z.infer<typeof ConnectionConfigSchema>;
export type ValidatedConfiguration = z.infer<typeof ConfigurationSchema>;
