/**
 * Configuration Error Contracts
 *
 * Error types for configuration loading and validation.
 *
 * Feature: 002-yaml-config
 * Date: 2025-12-23
 */

/**
 * Base class for all configuration errors.
 * Provides consistent error formatting.
 */
export abstract class ConfigError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when config file cannot be found.
 */
export class ConfigFileNotFoundError extends ConfigError {
  readonly code = 'CONFIG_FILE_NOT_FOUND';

  constructor(filePath: string) {
    super(`Config file not found: ${filePath}`);
  }
}

/**
 * Error thrown when config file is not readable (permissions).
 */
export class ConfigFilePermissionError extends ConfigError {
  readonly code = 'CONFIG_FILE_PERMISSION';

  constructor(filePath: string) {
    super(`Cannot read config file (permission denied): ${filePath}`);
  }
}

/**
 * Error thrown when YAML parsing fails.
 */
export class YAMLParseError extends ConfigError {
  readonly code = 'YAML_PARSE_ERROR';

  constructor(message: string) {
    super(`Invalid YAML syntax: ${message}`);
  }
}

/**
 * Error thrown when environment variable interpolation fails.
 */
export class EnvVarInterpolationError extends ConfigError {
  readonly code = 'ENV_VAR_MISSING';
  readonly variableName: string;

  constructor(varName: string) {
    super(`Missing env var: ${varName}`);
    this.variableName = varName;
  }
}

/**
 * Error thrown when configuration validation fails.
 */
export class ConfigValidationError extends ConfigError {
  readonly code = 'CONFIG_VALIDATION';
  readonly issues: string[];

  constructor(issues: string[]) {
    const message = issues.length === 1
      ? issues[0]!
      : `${issues.length} validation errors`;
    super(message);
    this.issues = issues;
  }
}

/**
 * Error thrown when a cluster references undefined nodes.
 */
export class ClusterNodeReferenceError extends ConfigError {
  readonly code = 'CLUSTER_NODE_REFERENCE';
  readonly clusterName: string;
  readonly missingNodes: string[];

  constructor(clusterName: string, missingNodes: string[]) {
    super(`Cluster '${clusterName}' references undefined nodes: ${missingNodes.join(', ')}`);
    this.clusterName = clusterName;
    this.missingNodes = missingNodes;
  }
}

/**
 * Error thrown when requested cluster doesn't exist.
 */
export class ClusterNotFoundError extends ConfigError {
  readonly code = 'CLUSTER_NOT_FOUND';
  readonly requestedCluster: string;
  readonly availableClusters: string[];

  constructor(requestedCluster: string, availableClusters: string[]) {
    super(`Cluster '${requestedCluster}' not found. Available: ${availableClusters.join(', ')}`);
    this.requestedCluster = requestedCluster;
    this.availableClusters = availableClusters;
  }
}

/**
 * Error thrown when threshold value is invalid.
 */
export class InvalidThresholdError extends ConfigError {
  readonly code = 'INVALID_THRESHOLD';
  readonly field: string;
  readonly value: string;

  constructor(field: string, value: string) {
    super(`Invalid threshold ${field}: ${value}`);
    this.field = field;
    this.value = value;
  }
}

/**
 * Error thrown when CLI arguments are insufficient.
 */
export class InsufficientArgumentsError extends ConfigError {
  readonly code = 'INSUFFICIENT_ARGS';

  constructor(message: string) {
    super(message);
  }
}
