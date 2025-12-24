import os from 'os';
import { z } from 'zod';
import { YAMLConfigFileSchema } from './schemas.js';
import type { YAMLConfigFile } from '../types/yaml-config.js';
import type { Configuration } from '../types/config.js';
import type { ConnectionConfig } from '../types/connection.js';
import {
  ConfigError,
  ConfigValidationError,
  ClusterNodeReferenceError,
  ClusterNotFoundError,
} from '../types/errors.js';
import { DEFAULT_THEME, DEFAULT_THRESHOLDS } from './defaults.js';
import type { YAMLClusterConfig } from '../types/yaml-config.js';
import type { ClusterConfig } from '../types/config.js';

// Re-export for backwards compatibility
export { ConfigValidationError, ClusterNodeReferenceError, ClusterNotFoundError };

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
 * Truncate a message to fit under 100 characters.
 * Preserves the start and adds ellipsis if needed.
 */
function truncateMessage(message: string, maxLen: number = 93): string {
  // Account for "Error: " prefix (7 chars) to keep total under 100
  if (message.length <= maxLen) {
    return message;
  }
  return message.slice(0, maxLen - 3) + '...';
}

/**
 * Format any config-related error into a user-friendly message.
 * All messages are guaranteed to be under 100 characters per SC-004.
 */
export function formatConfigError(error: unknown): string {
  // Handle our custom config errors
  if (error instanceof ConfigError) {
    return `Error: ${truncateMessage(error.message)}`;
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    const issues = formatZodError(error);
    const msg = issues.length === 1 ? issues[0]! : `${issues.length} validation errors`;
    return `Error: ${truncateMessage(msg)}`;
  }

  // Handle generic errors
  if (error instanceof Error) {
    return `Error: ${truncateMessage(error.message)}`;
  }

  return `Error: ${truncateMessage(String(error))}`;
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
 * Validate that all cluster node references exist in the nodes map.
 * Throws ClusterNodeReferenceError if any referenced nodes are undefined.
 */
export function validateClusterNodeReferences(
  clusters: Record<string, YAMLClusterConfig>,
  nodeNames: string[]
): void {
  for (const [clusterName, cluster] of Object.entries(clusters)) {
    const missingNodes = cluster.nodes.filter(
      (nodeName) => !nodeNames.includes(nodeName)
    );
    if (missingNodes.length > 0) {
      throw new ClusterNodeReferenceError(clusterName, missingNodes);
    }
  }
}

/**
 * Select the default cluster from a clusters map.
 * Returns the cluster marked as default: true, or the first defined cluster.
 * Throws ConfigValidationError if no clusters are defined.
 */
export function selectDefaultCluster(
  clusters: Record<string, YAMLClusterConfig>
): string {
  const clusterNames = Object.keys(clusters);
  if (clusterNames.length === 0) {
    throw new ConfigValidationError(['No clusters defined']);
  }

  // Find explicit default
  for (const [name, cluster] of Object.entries(clusters)) {
    if (cluster.default === true) {
      return name;
    }
  }

  // Fall back to first defined
  return clusterNames[0]!;
}

/**
 * Resolve cluster from --cluster flag or default.
 * Throws ClusterNotFoundError if specified cluster doesn't exist.
 */
export function resolveCluster(
  clusters: Record<string, YAMLClusterConfig>,
  requestedCluster?: string
): string {
  const availableClusters = Object.keys(clusters);

  // If cluster is explicitly requested, validate it exists
  if (requestedCluster !== undefined) {
    if (!availableClusters.includes(requestedCluster)) {
      throw new ClusterNotFoundError(requestedCluster, availableClusters);
    }
    return requestedCluster;
  }

  // Otherwise, select the default
  return selectDefaultCluster(clusters);
}

/**
 * Transform YAML cluster configs to resolved ClusterConfig objects.
 */
export function transformClusters(
  yamlClusters: Record<string, YAMLClusterConfig>
): Record<string, ClusterConfig> {
  const resolved: Record<string, ClusterConfig> = {};
  for (const [name, cluster] of Object.entries(yamlClusters)) {
    resolved[name] = {
      nodes: cluster.nodes,
      default: cluster.default ?? false,
    };
  }
  return resolved;
}

/**
 * Filter nodes to only include those in the active cluster.
 */
export function filterNodesToCluster(
  nodes: Record<string, ConnectionConfig>,
  clusterNodes: string[]
): Record<string, ConnectionConfig> {
  const filtered: Record<string, ConnectionConfig> = {};
  for (const nodeName of clusterNodes) {
    const node = nodes[nodeName];
    if (node !== undefined) {
      filtered[nodeName] = node;
    }
  }
  return filtered;
}

/**
 * Transform and validate a YAML config into a full Configuration object.
 * Applies defaults and validates all required fields.
 * If clusters are defined, validates node references and selects active cluster.
 */
export function transformToConfiguration(
  yamlConfig: YAMLConfigFile,
  configPath: string,
  requestedCluster?: string
): Configuration {
  // Validate raw structure first
  validateYAMLConfig(yamlConfig);

  if (!yamlConfig.nodes || Object.keys(yamlConfig.nodes).length === 0) {
    throw new ConfigValidationError(['At least one node must be configured']);
  }

  // Build nodes with defaults applied
  const allNodes: Record<string, ConnectionConfig> = {};
  const validationIssues: string[] = [];
  const currentUser = os.userInfo().username;
  const nodeNames = Object.keys(yamlConfig.nodes);

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
      allNodes[name] = nodeConfig;
    }
  }

  if (validationIssues.length > 0) {
    throw new ConfigValidationError(validationIssues);
  }

  // Handle clusters if defined
  let activeCluster: string | undefined;
  let clusters: Record<string, ClusterConfig> | undefined;
  let nodes = allNodes;

  if (yamlConfig.clusters && Object.keys(yamlConfig.clusters).length > 0) {
    // Validate that all cluster node references exist
    validateClusterNodeReferences(yamlConfig.clusters, nodeNames);

    // Transform clusters to resolved format
    clusters = transformClusters(yamlConfig.clusters);

    // Resolve which cluster to use (from flag or default)
    activeCluster = resolveCluster(yamlConfig.clusters, requestedCluster);

    // Filter nodes to only include those in the active cluster
    const clusterConfig = yamlConfig.clusters[activeCluster]!;
    nodes = filterNodesToCluster(allNodes, clusterConfig.nodes);
  }

  const config: Configuration = {
    nodes,
    theme: DEFAULT_THEME,
    thresholds: DEFAULT_THRESHOLDS,
    pglogical: yamlConfig.pglogical ?? false,
    source: 'file',
    configPath,
  };

  // Add optional cluster fields
  if (clusters !== undefined) {
    config.clusters = clusters;
  }
  if (activeCluster !== undefined) {
    config.activeCluster = activeCluster;
  }

  return config;
}

/**
 * Check if a value is a config-related error.
 */
export function isConfigError(error: unknown): boolean {
  return error instanceof ConfigError;
}
