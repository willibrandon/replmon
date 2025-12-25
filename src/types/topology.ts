/**
 * Topology Panel Type Definitions
 *
 * Types for representing replication topology graph structure,
 * including nodes, edges, roles, and layout configuration.
 *
 * Feature: 008-topology-panel
 */

import type { SubscriptionStatus } from './polling.js';

// =============================================================================
// Replication Types
// =============================================================================

/**
 * Type of replication relationship.
 */
export type ReplicationType = 'native' | 'pglogical';

/**
 * Direction of replication flow.
 */
export type EdgeDirection = 'unidirectional' | 'bidirectional';

/**
 * Role of a node in the replication topology.
 * Derived from edge analysis.
 */
export type NodeRole =
  | 'primary' // Native replication: has standbys
  | 'standby' // Native replication: connected to primary
  | 'provider' // pglogical: other nodes subscribe to it
  | 'subscriber' // pglogical: subscribes to other nodes
  | 'bidirectional' // pglogical: both provider and subscriber
  | 'standalone'; // No replication relationships detected

/**
 * Lag severity for color coding.
 */
export type LagSeverity = 'normal' | 'warning' | 'critical' | 'unknown';

// =============================================================================
// Edge Types
// =============================================================================

/**
 * A directed edge representing replication flow between nodes.
 * Derived from SubscriptionData and ReplicationStats.
 */
export interface TopologyEdge {
  /** Unique identifier: `${sourceNodeId}→${targetNodeId}` */
  id: string;

  /** Node providing data (primary/provider) */
  sourceNodeId: string;

  /** Node receiving data (standby/subscriber) */
  targetNodeId: string;

  /** Direction of replication */
  direction: EdgeDirection;

  /** Type of replication */
  replicationType: ReplicationType;

  /** Current lag in seconds (null if unavailable) */
  lagSeconds: number | null;

  /** Current lag in bytes */
  lagBytes: number;

  /** Associated subscription name (pglogical only) */
  subscriptionName: string | null;

  /** Subscription status for this edge */
  status: SubscriptionStatus | 'streaming';
}

// =============================================================================
// Node Types
// =============================================================================

/**
 * Complete node data for topology visualization.
 * Aggregates node info, status, role, and connections.
 */
export interface TopologyNodeData {
  /** Node identifier from config */
  nodeId: string;

  /** Display name (same as nodeId) */
  displayName: string;

  /** Host and port for display */
  hostInfo: string;

  /** Connection status */
  connectionStatus: 'connecting' | 'connected' | 'failed' | undefined;

  /** Derived role in topology */
  role: NodeRole;

  /** Whether node data is stale */
  isStale: boolean;

  /** Whether this node is currently selected */
  isSelected: boolean;

  /** Whether node has pglogical installed */
  hasPglogical: boolean;

  /** Outgoing edges (this node is source) */
  outgoingEdges: TopologyEdge[];

  /** Incoming edges (this node is target) */
  incomingEdges: TopologyEdge[];
}

// =============================================================================
// Layout Types
// =============================================================================

/**
 * Terminal breakpoint for responsive layout.
 */
export type LayoutBreakpoint = 'standard' | 'narrow' | 'short' | 'compact';

/**
 * Layout configuration based on terminal size and node count.
 */
export interface TopologyLayoutConfig {
  /** Width of each node box in characters */
  nodeWidth: number;

  /** Number of nodes per horizontal row */
  nodesPerRow: number;

  /** Whether to use vertical stacked layout */
  isVertical: boolean;

  /** Width of connection lines between nodes */
  connectionWidth: number;

  /** Current terminal breakpoint */
  breakpoint: LayoutBreakpoint;
}

// =============================================================================
// Hook Return Types
// =============================================================================

/**
 * Return type for useTopology hook.
 */
export interface UseTopologyResult {
  /** All topology nodes with derived data */
  nodes: TopologyNodeData[];

  /** All topology edges */
  edges: TopologyEdge[];

  /** Currently selected node ID */
  selectedNodeId: string | null;

  /** Whether any node has critical lag */
  hasCriticalLag: boolean;

  /** Number of active edges */
  activeEdgeCount: number;
}

/**
 * Lag data for a specific edge.
 */
export interface EdgeLagData {
  lagSeconds: number | null;
  lagBytes: number;
  severity: LagSeverity;
}
