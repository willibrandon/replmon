import os from 'os';
import type { CLIArguments } from '../types/cli.js';
import type { Configuration } from '../types/config.js';
import type { ConnectionConfig } from '../types/connection.js';
import { loadConfigFile } from './loader.js';
import { transformToConfiguration } from './validator.js';

/**
 * Error thrown when CLI arguments are insufficient.
 */
export class InsufficientArgumentsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientArgumentsError';
  }
}

/**
 * Get the default PostgreSQL user.
 * Priority: current OS user.
 */
function getDefaultUser(): string {
  return os.userInfo().username;
}

/**
 * Get password from CLI args or PGPASSWORD environment variable.
 */
function getPassword(cliPassword?: string): string | undefined {
  if (cliPassword !== undefined) {
    return cliPassword;
  }
  const envPassword = process.env['PGPASSWORD'];
  if (envPassword !== undefined && envPassword !== '') {
    return envPassword;
  }
  return undefined;
}

/**
 * Build a Configuration from CLI arguments only (no config file).
 * Applies default port (5432) and default user (current OS user).
 */
export function buildConfigurationFromCLI(args: CLIArguments): Configuration {
  const nodeConfig: ConnectionConfig = {
    host: args.host!,
    port: args.port ?? 5432,
    database: args.database!,
    user: args.user ?? getDefaultUser(),
    name: 'default',
  };

  // Only add password if available (exactOptionalPropertyTypes)
  const password = getPassword(args.password);
  if (password !== undefined) {
    nodeConfig.password = password;
  }

  return {
    nodes: {
      default: nodeConfig,
    },
    pglogical: args.pglogical ?? false,
    source: 'cli',
  };
}

/**
 * Merge CLI overrides into a file-based configuration.
 * CLI flags take precedence over config file values.
 * Returns a merged configuration with source='merged'.
 */
export function mergeConfigWithCLI(
  fileConfig: Configuration,
  args: CLIArguments
): Configuration {
  // If no inline connection args, just apply pglogical override
  const hasInlineArgs =
    args.host !== undefined ||
    args.port !== undefined ||
    args.database !== undefined ||
    args.user !== undefined ||
    args.password !== undefined;

  if (!hasInlineArgs) {
    // Only pglogical flag needs merging
    if (args.pglogical) {
      return {
        ...fileConfig,
        pglogical: true,
        source: 'merged',
      };
    }
    return fileConfig;
  }

  // Merge inline args into the first node (or all nodes if host is specified)
  const mergedNodes: Record<string, ConnectionConfig> = {};
  const password = getPassword(args.password);

  for (const [name, node] of Object.entries(fileConfig.nodes)) {
    const mergedNode: ConnectionConfig = {
      host: args.host ?? node.host,
      port: args.port ?? node.port,
      database: args.database ?? node.database,
      user: args.user ?? node.user,
      name: node.name ?? name,
    };

    // Handle password: CLI > env > file
    if (password !== undefined) {
      mergedNode.password = password;
    } else if (node.password !== undefined) {
      mergedNode.password = node.password;
    }

    mergedNodes[name] = mergedNode;
  }

  const result: Configuration = {
    nodes: mergedNodes,
    pglogical: args.pglogical ?? fileConfig.pglogical,
    source: 'merged',
  };

  if (fileConfig.configPath !== undefined) {
    result.configPath = fileConfig.configPath;
  }

  return result;
}

/**
 * Validate that minimum required CLI arguments are provided.
 * When no config file is specified, --host and --database are required.
 * Throws InsufficientArgumentsError if validation fails.
 */
export function validateMinimumArgs(args: CLIArguments): void {
  // If config file is provided, no minimum args required
  if (args.config !== undefined) {
    return;
  }

  // Without config, host and database are required
  const missing: string[] = [];
  if (args.host === undefined) {
    missing.push('--host');
  }
  if (args.database === undefined) {
    missing.push('--database');
  }

  if (missing.length > 0) {
    throw new InsufficientArgumentsError(
      `Either --config or (--host and --database) required`
    );
  }
}

/**
 * Parse CLI arguments and load configuration.
 * Handles three cases:
 * 1. Config file only: Load from YAML file
 * 2. Inline flags only: Build from CLI args
 * 3. Mixed: Load from file, merge with CLI overrides
 */
export function parseConfiguration(args: CLIArguments): Configuration {
  // Validate minimum requirements
  validateMinimumArgs(args);

  // Case 1: Config file provided
  if (args.config !== undefined) {
    const yamlConfig = loadConfigFile(args.config);
    const fileConfig = transformToConfiguration(yamlConfig, args.config);

    // Check if we need to merge CLI overrides
    const hasInlineArgs =
      args.host !== undefined ||
      args.port !== undefined ||
      args.database !== undefined ||
      args.user !== undefined ||
      args.password !== undefined ||
      args.pglogical === true;

    if (hasInlineArgs) {
      return mergeConfigWithCLI(fileConfig, args);
    }

    return fileConfig;
  }

  // Case 2: Inline flags only
  return buildConfigurationFromCLI(args);
}
