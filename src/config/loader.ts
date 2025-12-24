import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYAML } from 'yaml';
import type { YAMLConfigFile, YAMLNodeConfig } from '../types/yaml-config.js';
import {
  ConfigFileNotFoundError,
  ConfigFilePermissionError,
  YAMLParseError,
  EnvVarInterpolationError,
  ConfigValidationError,
} from '../types/errors.js';
import { getDefaultConfigPath } from './defaults.js';

// Re-export error types for backwards compatibility
export {
  ConfigFileNotFoundError,
  ConfigFilePermissionError,
  YAMLParseError,
  EnvVarInterpolationError,
  ConfigValidationError,
};

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
 * Validates that port is a valid number after interpolation.
 */
function interpolateNodeConfig(node: YAMLNodeConfig, nodeName: string): YAMLNodeConfig {
  const result: YAMLNodeConfig = {};

  if (node.host !== undefined) {
    result.host = interpolateEnvVars(node.host);
  }
  if (node.port !== undefined) {
    // Port may be a string with env var, convert to number after interpolation
    if (typeof node.port === 'string') {
      const interpolated = interpolateEnvVars(node.port);
      const parsedPort = parseInt(interpolated, 10);
      // Validate port is a valid number after interpolation
      if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        throw new ConfigValidationError([
          `nodes.${nodeName}.port: Invalid port '${interpolated}'`,
        ]);
      }
      result.port = parsedPort;
    } else {
      // Validate numeric port value
      if (node.port < 1 || node.port > 65535) {
        throw new ConfigValidationError([
          `nodes.${nodeName}.port: Invalid port ${node.port}`,
        ]);
      }
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
 * Passes through clusters, theme, and thresholds unchanged.
 */
function interpolateConfig(config: YAMLConfigFile): YAMLConfigFile {
  const result: YAMLConfigFile = {};

  if (config.pglogical !== undefined) {
    result.pglogical = config.pglogical;
  }

  if (config.nodes) {
    result.nodes = {};
    for (const [name, node] of Object.entries(config.nodes)) {
      result.nodes[name] = interpolateNodeConfig(node, name);
    }
  }

  // Pass through clusters unchanged (no env var interpolation needed)
  if (config.clusters !== undefined) {
    result.clusters = config.clusters;
  }

  // Pass through theme unchanged (no env var interpolation needed)
  if (config.theme !== undefined) {
    result.theme = config.theme;
  }

  // Pass through thresholds unchanged (no env var interpolation needed)
  if (config.thresholds !== undefined) {
    result.thresholds = config.thresholds;
  }

  return result;
}

/**
 * Result of attempting to load a config file.
 * Used to differentiate between "file not found" and "file found but error".
 */
export interface LoadConfigResult {
  /** Whether a config file was successfully loaded */
  found: boolean;
  /** The loaded config, if found */
  config?: YAMLConfigFile;
  /** The resolved path that was used */
  path: string;
}

/**
 * Load and parse a YAML configuration file.
 * Performs environment variable interpolation on string values.
 *
 * @param filePath - Path to the YAML configuration file
 * @returns Parsed and interpolated configuration
 * @throws ConfigFileNotFoundError if file doesn't exist
 * @throws ConfigFilePermissionError if file is not readable
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
    // Check if it's a permission error
    if (err instanceof Error && 'code' in err) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'EACCES' || nodeErr.code === 'EPERM') {
        throw new ConfigFilePermissionError(resolvedPath);
      }
    }
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

/**
 * Try to load a config file from the default path.
 * Returns null if the default config file doesn't exist (graceful fallback).
 * Throws errors for permission issues or invalid YAML.
 *
 * @returns LoadConfigResult with found=true if loaded, found=false if not found
 * @throws ConfigFilePermissionError if file exists but is not readable
 * @throws YAMLParseError if file exists but contains invalid YAML
 * @throws EnvVarInterpolationError if required env var is missing
 */
export function tryLoadDefaultConfig(): LoadConfigResult {
  const defaultPath = getDefaultConfigPath();

  // Check if default config file exists
  if (!fs.existsSync(defaultPath)) {
    return { found: false, path: defaultPath };
  }

  // File exists - try to load it (errors here are real errors, not graceful fallback)
  const config = loadConfigFile(defaultPath);
  return { found: true, config, path: defaultPath };
}
