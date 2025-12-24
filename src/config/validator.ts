import os from 'os';
import { z } from 'zod';
import { YAMLConfigFileSchema } from './schemas.js';
import type { YAMLConfigFile } from '../types/yaml-config.js';
import type { Configuration } from '../types/config.js';
import type { ConnectionConfig } from '../types/connection.js';
import {
  ConfigFileNotFoundError,
  YAMLParseError,
  EnvVarInterpolationError,
} from './loader.js';

/**
 * Error thrown when configuration validation fails.
 */
export class ConfigValidationError extends Error {
  public readonly issues: string[];

  constructor(issues: string[]) {
    const message = `Config validation failed: ${issues.join('; ')}`;
    super(message);
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

/**
 * Format a Zod error into a human-readable message.
 */
function formatZodError(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    const prefix = path ? `${path}: ` : '';
    return `${prefix}${issue.message}`;
  });
}

/**
 * Format any config-related error into a user-friendly message.
 */
export function formatConfigError(error: unknown): string {
  if (error instanceof ConfigFileNotFoundError) {
    return `Error: ${error.message}`;
  }
  if (error instanceof YAMLParseError) {
    return `Error: ${error.message}`;
  }
  if (error instanceof EnvVarInterpolationError) {
    return `Error: ${error.message}`;
  }
  if (error instanceof ConfigValidationError) {
    return `Error: ${error.message}`;
  }
  if (error instanceof z.ZodError) {
    const issues = formatZodError(error);
    return `Error: Config validation failed: ${issues.join('; ')}`;
  }
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}

/**
 * Validate raw YAML config structure.
 * Returns the raw data if valid, throws ConfigValidationError otherwise.
 */
export function validateYAMLConfig(raw: unknown): void {
  const result = YAMLConfigFileSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigValidationError(formatZodError(result.error));
  }
}

/**
 * Transform and validate a YAML config into a full Configuration object.
 * Applies defaults and validates all required fields.
 */
export function transformToConfiguration(
  yamlConfig: YAMLConfigFile,
  configPath: string
): Configuration {
  // Validate raw structure first
  validateYAMLConfig(yamlConfig);

  if (!yamlConfig.nodes || Object.keys(yamlConfig.nodes).length === 0) {
    throw new ConfigValidationError(['At least one node must be configured']);
  }

  // Build nodes with defaults applied
  const nodes: Record<string, ConnectionConfig> = {};
  const validationIssues: string[] = [];
  const currentUser = os.userInfo().username;

  for (const [name, node] of Object.entries(yamlConfig.nodes)) {
    // Validate required fields
    if (!node.host) {
      validationIssues.push(`nodes.${name}.host: Host is required`);
    }
    if (!node.database) {
      validationIssues.push(`nodes.${name}.database: Database is required`);
    }

    if (validationIssues.length === 0) {
      const nodeConfig: ConnectionConfig = {
        host: node.host!,
        port: typeof node.port === 'number' ? node.port : 5432,
        database: node.database!,
        user: node.user ?? currentUser,
        name,
      };
      // Only add password if defined (exactOptionalPropertyTypes)
      if (node.password !== undefined) {
        nodeConfig.password = node.password;
      }
      nodes[name] = nodeConfig;
    }
  }

  if (validationIssues.length > 0) {
    throw new ConfigValidationError(validationIssues);
  }

  const config: Configuration = {
    nodes,
    pglogical: yamlConfig.pglogical ?? false,
    source: 'file',
    configPath,
  };

  return config;
}

/**
 * Check if a value is a config-related error.
 */
export function isConfigError(error: unknown): boolean {
  return (
    error instanceof ConfigFileNotFoundError ||
    error instanceof YAMLParseError ||
    error instanceof EnvVarInterpolationError ||
    error instanceof ConfigValidationError
  );
}
