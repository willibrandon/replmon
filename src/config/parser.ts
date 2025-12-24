import os from 'os';
import type { CLIArguments } from '../types/cli.js';
import type { Configuration } from '../types/config.js';
import type { ConnectionConfig } from '../types/connection.js';
import { InsufficientArgumentsError } from '../types/errors.js';
import { loadConfigFile, tryLoadDefaultConfig } from './loader.js';
import { transformToConfiguration } from './validator.js';
import { DEFAULT_THEME, DEFAULT_THRESHOLDS } from './defaults.js';

// =============================================================================
// Warning Logging
// =============================================================================

/**
 * Log a configuration warning to stderr.
 * Used for non-fatal issues like invalid theme name fallback.
 */
function logConfigWarning(message: string): void {
  console.warn(`[config] Warning: ${message}`);
}

// Re-export for backwards compatibility
export { InsufficientArgumentsError };

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
    theme: DEFAULT_THEME,
    thresholds: DEFAULT_THRESHOLDS,
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
        theme: fileConfig.theme ?? DEFAULT_THEME,
        thresholds: fileConfig.thresholds ?? DEFAULT_THRESHOLDS,
        pglogical: true,
        source: 'merged',
      };
    }
    // Ensure theme and thresholds have defaults
    return {
      ...fileConfig,
      theme: fileConfig.theme ?? DEFAULT_THEME,
      thresholds: fileConfig.thresholds ?? DEFAULT_THRESHOLDS,
    };
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
    theme: fileConfig.theme ?? DEFAULT_THEME,
    thresholds: fileConfig.thresholds ?? DEFAULT_THRESHOLDS,
    pglogical: args.pglogical ?? fileConfig.pglogical,
    source: 'merged',
  };

  // Preserve optional fields from file config
  if (fileConfig.configPath !== undefined) {
    result.configPath = fileConfig.configPath;
  }
  if (fileConfig.clusters !== undefined) {
    result.clusters = fileConfig.clusters;
  }
  if (fileConfig.activeCluster !== undefined) {
    result.activeCluster = fileConfig.activeCluster;
  }

  return result;
}

/**
 * Validate that minimum required CLI arguments are provided.
 * When no config file is available, --host and --database are required.
 * Note: This is called AFTER checking for default config file.
 * Throws InsufficientArgumentsError if validation fails.
 */
export function validateMinimumArgs(args: CLIArguments, hasDefaultConfig: boolean): void {
  // If config file is provided explicitly, no minimum args required
  if (args.config !== undefined) {
    return;
  }

  // If default config exists and will be loaded, no minimum args required
  if (hasDefaultConfig) {
    return;
  }

  // Without any config, host and database are required
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
 * Handles four cases:
 * 1. Explicit --config file: Load from specified YAML file
 * 2. Default config file exists: Load from ~/.config/replmon/config.yaml
 * 3. Inline flags only: Build from CLI args
 * 4. Mixed: Load from file, merge with CLI overrides
 *
 * When clusters are defined, uses --cluster flag or selects default cluster.
 */
export function parseConfiguration(args: CLIArguments): Configuration {
  // Check for explicit config file first
  if (args.config !== undefined) {
    const yamlConfig = loadConfigFile(args.config);
    const fileConfig = transformToConfiguration(
      yamlConfig,
      args.config,
      args.cluster,
      logConfigWarning
    );

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

    // Theme and thresholds are already resolved by transformToConfiguration
    return fileConfig;
  }

  // Try to load default config file (graceful fallback if not found)
  const defaultResult = tryLoadDefaultConfig();

  // Validate minimum requirements (now that we know if default config exists)
  validateMinimumArgs(args, defaultResult.found);

  // Case 2: Default config exists and was loaded
  if (defaultResult.found && defaultResult.config !== undefined) {
    const fileConfig = transformToConfiguration(
      defaultResult.config,
      defaultResult.path,
      args.cluster,
      logConfigWarning
    );

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

    // Theme and thresholds are already resolved by transformToConfiguration
    return fileConfig;
  }

  // Case 3: Inline flags only (no config file)
  return buildConfigurationFromCLI(args);
}
