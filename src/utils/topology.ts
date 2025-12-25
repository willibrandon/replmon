/**
 * Topology Utility Functions
 *
 * Helper functions for topology panel rendering including
 * lag severity calculation, formatting, and role detection.
 *
 * Feature: 008-topology-panel
 */

import type {
  LagSeverity,
  NodeRole,
  TopologyEdge,
} from '../types/topology.js';

// =============================================================================
// Lag Severity & Formatting
// =============================================================================

/**
 * Lag severity thresholds in seconds.
 */
const LAG_THRESHOLDS = {
  WARNING: 5,
  CRITICAL: 30,
} as const;

/**
 * Determine lag severity based on thresholds.
 *
 * @param lagSeconds - Lag duration in seconds (null if unavailable)
 * @returns Severity level for color coding
 */
export function getLagSeverity(lagSeconds: number | null): LagSeverity {
  if (lagSeconds === null) return 'unknown';
  if (lagSeconds < LAG_THRESHOLDS.WARNING) return 'normal';
  if (lagSeconds <= LAG_THRESHOLDS.CRITICAL) return 'warning';
  return 'critical';
}

/**
 * Format lag duration for display.
 *
 * @param lagSeconds - Lag duration in seconds (null if unavailable)
 * @returns Formatted lag string (e.g., "250ms", "5.2s", "2m 15s", "?")
 */
export function formatLag(lagSeconds: number | null): string {
  if (lagSeconds === null) return '?';
  if (lagSeconds < 1) return `${Math.round(lagSeconds * 1000)}ms`;
  if (lagSeconds < 60) return `${lagSeconds.toFixed(1)}s`;
  const minutes = Math.floor(lagSeconds / 60);
  const seconds = Math.round(lagSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

/**
 * Get color key for lag severity (to be used with theme colors).
 *
 * @param severity - Lag severity level
 * @returns Theme color key
 */
export function getLagColor(
  severity: LagSeverity
): 'success' | 'warning' | 'critical' | 'muted' {
  switch (severity) {
    case 'normal':
      return 'success';
    case 'warning':
      return 'warning';
    case 'critical':
      return 'critical';
    case 'unknown':
      return 'muted';
  }
}

// =============================================================================
// Node Role Detection
// =============================================================================

/**
 * Derive node role from edge analysis.
 *
 * @param nodeId - Node identifier
 * @param edges - All topology edges
 * @returns Detected node role
 */
export function deriveNodeRole(nodeId: string, edges: TopologyEdge[]): NodeRole {
  const isSource = edges.some((e) => e.sourceNodeId === nodeId);
  const isTarget = edges.some((e) => e.targetNodeId === nodeId);
  const hasPglogical = edges.some(
    (e) =>
      (e.sourceNodeId === nodeId || e.targetNodeId === nodeId) &&
      e.replicationType === 'pglogical'
  );

  if (hasPglogical) {
    if (isSource && isTarget) return 'bidirectional';
    if (isSource) return 'provider';
    if (isTarget) return 'subscriber';
  }

  if (isSource) return 'primary';
  if (isTarget) return 'standby';
  return 'standalone';
}

/**
 * Get human-readable label for node role (for Badge component).
 *
 * @param role - Node role
 * @returns Display label for the role
 */
export function getRoleBadgeLabel(role: NodeRole): string {
  switch (role) {
    case 'primary':
      return 'PRIMARY';
    case 'standby':
      return 'STANDBY';
    case 'provider':
      return 'PROVIDER';
    case 'subscriber':
      return 'SUBSCRIBER';
    case 'bidirectional':
      return 'BIDI';
    case 'standalone':
      return 'STANDALONE';
  }
}

/**
 * Get color key for node role badge.
 *
 * @param role - Node role
 * @returns Theme color key for the badge
 */
export function getRoleBadgeColor(
  role: NodeRole
): 'primary' | 'secondary' | 'success' | 'warning' | 'muted' {
  switch (role) {
    case 'primary':
    case 'provider':
      return 'primary';
    case 'standby':
    case 'subscriber':
      return 'secondary';
    case 'bidirectional':
      return 'success';
    case 'standalone':
      return 'muted';
  }
}

// =============================================================================
// Edge Utilities
// =============================================================================

/**
 * Generate a unique edge ID from source and target node IDs.
 *
 * @param sourceNodeId - Source node ID
 * @param targetNodeId - Target node ID
 * @returns Unique edge identifier
 */
export function createEdgeId(sourceNodeId: string, targetNodeId: string): string {
  return `${sourceNodeId}→${targetNodeId}`;
}

/**
 * Check if a bidirectional relationship exists between two nodes.
 *
 * @param nodeA - First node ID
 * @param nodeB - Second node ID
 * @param edges - All topology edges
 * @returns True if edges exist in both directions
 */
export function hasBidirectionalEdge(
  nodeA: string,
  nodeB: string,
  edges: TopologyEdge[]
): boolean {
  const aToB = edges.some(
    (e) => e.sourceNodeId === nodeA && e.targetNodeId === nodeB
  );
  const bToA = edges.some(
    (e) => e.sourceNodeId === nodeB && e.targetNodeId === nodeA
  );
  return aToB && bToA;
}

/**
 * Get all edges connected to a specific node.
 *
 * @param nodeId - Node identifier
 * @param edges - All topology edges
 * @returns Object containing incoming and outgoing edges
 */
export function getNodeEdges(
  nodeId: string,
  edges: TopologyEdge[]
): { incoming: TopologyEdge[]; outgoing: TopologyEdge[] } {
  return {
    incoming: edges.filter((e) => e.targetNodeId === nodeId),
    outgoing: edges.filter((e) => e.sourceNodeId === nodeId),
  };
}
