import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYAML } from 'yaml';
import type { YAMLConfigFile, YAMLNodeConfig } from '../types/yaml-config.js';

/**
 * Error thrown when config file cannot be found.
 */
export class ConfigFileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`Config file not found: ${filePath}`);
    this.name = 'ConfigFileNotFoundError';
  }
}

/**
 * Error thrown when YAML parsing fails.
 */
export class YAMLParseError extends Error {
  constructor(message: string) {
    super(`Invalid YAML syntax in config: ${message}`);
    this.name = 'YAMLParseError';
  }
}

/**
 * Error thrown when environment variable interpolation fails.
 */
export class EnvVarInterpolationError extends Error {
  constructor(varName: string) {
    super(`Config interpolation failed: Environment variable not found: ${varName}`);
    this.name = 'EnvVarInterpolationError';
  }
}

/**
 * Pattern for environment variable interpolation.
 * Matches ${VAR_NAME} or ${VAR_NAME:-default}
 */
const ENV_VAR_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g;

/**
 * Interpolate environment variables in a string value.
 * Supports ${VAR_NAME} and ${VAR_NAME:-default} syntax.
 */
export function interpolateEnvVars(value: string): string {
  return value.replace(ENV_VAR_PATTERN, (_match, varName: string, defaultValue?: string) => {
    const envValue = process.env[varName];
    if (envValue !== undefined) {
      return envValue;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new EnvVarInterpolationError(varName);
  });
}

/**
 * Interpolate environment variables in a node configuration.
 */
function interpolateNodeConfig(node: YAMLNodeConfig): YAMLNodeConfig {
  const result: YAMLNodeConfig = {};

  if (node.host !== undefined) {
    result.host = interpolateEnvVars(node.host);
  }
  if (node.port !== undefined) {
    // Port may be a string with env var, convert to number after interpolation
    if (typeof node.port === 'string') {
      const interpolated = interpolateEnvVars(node.port);
      result.port = parseInt(interpolated, 10);
    } else {
      result.port = node.port;
    }
  }
  if (node.database !== undefined) {
    result.database = interpolateEnvVars(node.database);
  }
  if (node.user !== undefined) {
    result.user = interpolateEnvVars(node.user);
  }
  if (node.password !== undefined) {
    result.password = interpolateEnvVars(node.password);
  }

  return result;
}

/**
 * Interpolate environment variables in the entire config file.
 */
function interpolateConfig(config: YAMLConfigFile): YAMLConfigFile {
  const result: YAMLConfigFile = {};

  if (config.pglogical !== undefined) {
    result.pglogical = config.pglogical;
  }

  if (config.nodes) {
    result.nodes = {};
    for (const [name, node] of Object.entries(config.nodes)) {
      result.nodes[name] = interpolateNodeConfig(node);
    }
  }

  return result;
}

/**
 * Load and parse a YAML configuration file.
 * Performs environment variable interpolation on string values.
 *
 * @param filePath - Path to the YAML configuration file
 * @returns Parsed and interpolated configuration
 * @throws ConfigFileNotFoundError if file doesn't exist
 * @throws YAMLParseError if YAML is invalid
 * @throws EnvVarInterpolationError if required env var is missing
 */
export function loadConfigFile(filePath: string): YAMLConfigFile {
  // Resolve path (handles relative paths)
  const resolvedPath = path.resolve(filePath);

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    throw new ConfigFileNotFoundError(resolvedPath);
  }

  // Read file contents
  let content: string;
  try {
    content = fs.readFileSync(resolvedPath, 'utf-8');
  } catch (err) {
    throw new ConfigFileNotFoundError(resolvedPath);
  }

  // Parse YAML
  let parsed: unknown;
  try {
    parsed = parseYAML(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new YAMLParseError(message);
  }

  // Handle empty file or null content
  if (parsed === null || parsed === undefined) {
    return {};
  }

  // Cast to expected type (validation happens in validator.ts)
  const rawConfig = parsed as YAMLConfigFile;

  // Interpolate environment variables
  return interpolateConfig(rawConfig);
}
