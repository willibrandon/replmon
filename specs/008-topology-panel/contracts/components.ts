/**
 * Component API Contracts: Topology Panel
 *
 * Defines the public interfaces for all topology-related components.
 * These contracts serve as the implementation specification.
 *
 * Feature: 008-topology-panel
 */

import type { ReactElement } from 'react';
import type { Configuration } from '../../../src/types/config.js';

// =============================================================================
// Data Types (from data-model.md)
// =============================================================================

/**
 * Replication type indicator.
 */
export type ReplicationType = 'native' | 'pglogical';

/**
 * Role of a node in the replication topology.
 */
export type NodeRole =
  | 'primary'
  | 'standby'
  | 'provider'
  | 'subscriber'
  | 'bidirectional'
  | 'standalone';

/**
 * Lag severity for color coding.
 */
export type LagSeverity = 'normal' | 'warning' | 'critical' | 'unknown';

/**
 * Direction of replication edge.
 */
export type EdgeDirection = 'unidirectional' | 'bidirectional';

/**
 * A directed edge representing replication flow between nodes.
 */
export interface TopologyEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  direction: EdgeDirection;
  replicationType: ReplicationType;
  lagSeconds: number | null;
  lagBytes: number;
  subscriptionName: string | null;
  status: 'streaming' | 'initializing' | 'replicating' | 'down' | 'catchup' | 'unknown';
}

/**
 * Aggregated node data for topology visualization.
 */
export interface TopologyNodeData {
  nodeId: string;
  displayName: string;
  hostInfo: string;
  connectionStatus: 'connecting' | 'connected' | 'failed' | undefined;
  role: NodeRole;
  isStale: boolean;
  isSelected: boolean;
  hasPglogical: boolean;
  outgoingEdges: TopologyEdge[];
  incomingEdges: TopologyEdge[];
}

/**
 * Layout configuration for topology rendering.
 */
export interface TopologyLayoutConfig {
  nodeWidth: number;
  nodesPerRow: number;
  isVertical: boolean;
  connectionWidth: number;
  breakpoint: 'standard' | 'narrow' | 'short' | 'compact';
}

// =============================================================================
// Component Props
// =============================================================================

/**
 * Props for TopologyPanel (container component).
 *
 * The panel receives configuration and reads all dynamic data from Zustand store.
 */
export interface TopologyPanelProps {
  /**
   * Application configuration with node definitions.
   */
  config: Configuration;
}

/**
 * Props for TopologyLayout (layout component).
 *
 * Responsible for arranging nodes and connections based on terminal size.
 */
export interface TopologyLayoutProps {
  /**
   * Node data array with all topology information.
   */
  nodes: TopologyNodeData[];

  /**
   * All edges between nodes.
   */
  edges: TopologyEdge[];

  /**
   * Layout configuration from useTopologyLayout hook.
   */
  layout: TopologyLayoutConfig;
}

/**
 * Props for TopologyRow (horizontal row of nodes).
 *
 * Renders a subset of nodes with their connecting edges.
 */
export interface TopologyRowProps {
  /**
   * Nodes to render in this row.
   */
  nodes: TopologyNodeData[];

  /**
   * Edges relevant to nodes in this row.
   */
  edges: TopologyEdge[];

  /**
   * Width of each node box.
   */
  nodeWidth: number;
}

/**
 * Props for TopologyNode (individual node box).
 *
 * Renders a single node with status, role, and host information.
 */
export interface TopologyNodeProps {
  /**
   * Node ID for store lookups.
   */
  nodeId: string;

  /**
   * Display name shown in the node box.
   */
  displayName: string;

  /**
   * Host:port information.
   */
  hostInfo: string;

  /**
   * Current connection status.
   */
  status: 'connecting' | 'connected' | 'failed' | undefined;

  /**
   * Derived role in topology.
   */
  role: NodeRole;

  /**
   * Whether this node is currently selected.
   */
  isSelected: boolean;

  /**
   * Whether node data is stale (disconnected).
   */
  isStale: boolean;

  /**
   * Whether node has pglogical installed.
   */
  hasPglogical: boolean;

  /**
   * Width of the node box in characters.
   */
  width: number;
}

/**
 * Props for ConnectionLine (edge between nodes).
 *
 * Renders an arrow with optional lag indicator.
 */
export interface ConnectionLineProps {
  /**
   * Direction of the connection.
   */
  direction: EdgeDirection;

  /**
   * Replication type for styling.
   */
  replicationType: ReplicationType;

  /**
   * Current lag in seconds (null if unavailable).
   */
  lagSeconds: number | null;

  /**
   * Width of the connection area in characters.
   */
  width: number;

  /**
   * Whether to show lag value (false hides the label).
   */
  showLag?: boolean;
}

// =============================================================================
// Hook Return Types
// =============================================================================

/**
 * Return type for useTopology hook.
 *
 * Provides all derived topology data for rendering.
 */
export interface UseTopologyResult {
  /**
   * All nodes with aggregated topology data.
   */
  nodes: TopologyNodeData[];

  /**
   * All edges between nodes.
   */
  edges: TopologyEdge[];

  /**
   * Number of configured nodes.
   */
  nodeCount: number;

  /**
   * Whether pglogical mode is detected.
   */
  pglogicalMode: boolean;
}

/**
 * Return type for useTopologyLayout hook.
 *
 * Provides layout configuration based on terminal size.
 */
export interface UseTopologyLayoutResult extends TopologyLayoutConfig {
  /**
   * Terminal width in columns.
   */
  terminalWidth: number;

  /**
   * Terminal height in rows.
   */
  terminalHeight: number;
}

// =============================================================================
// Component Signatures
// =============================================================================

/**
 * TopologyPanel component signature.
 *
 * Container component that orchestrates topology visualization.
 */
export type TopologyPanelComponent = (props: TopologyPanelProps) => ReactElement;

/**
 * TopologyLayout component signature.
 *
 * Layout component that arranges nodes and edges.
 */
export type TopologyLayoutComponent = (props: TopologyLayoutProps) => ReactElement;

/**
 * TopologyRow component signature.
 *
 * Renders a horizontal row of nodes with connections.
 */
export type TopologyRowComponent = (props: TopologyRowProps) => ReactElement;

/**
 * TopologyNode component signature.
 *
 * Renders an individual node box.
 */
export type TopologyNodeComponent = (props: TopologyNodeProps) => ReactElement;

/**
 * ConnectionLine component signature.
 *
 * Renders a connection line between nodes.
 */
export type ConnectionLineComponent = (props: ConnectionLineProps) => ReactElement;

// =============================================================================
// Selector Signatures
// =============================================================================

/**
 * Selector for all topology edges.
 */
export type SelectTopologyEdges = () => TopologyEdge[];

/**
 * Selector for all topology nodes.
 */
export type SelectTopologyNodes = () => TopologyNodeData[];

/**
 * Selector for a specific node's role.
 */
export type SelectNodeRole = (nodeId: string) => NodeRole;

/**
 * Selector for edge lag data.
 */
export type SelectEdgeLag = (sourceId: string, targetId: string) => {
  lagSeconds: number | null;
  lagBytes: number;
  severity: LagSeverity;
};

// =============================================================================
// Utility Function Signatures
// =============================================================================

/**
 * Determine lag severity based on seconds threshold.
 *
 * @param lagSeconds - Lag in seconds (null if unavailable)
 * @returns Severity classification
 */
export type GetLagSeverity = (lagSeconds: number | null) => LagSeverity;

/**
 * Format lag value for display.
 *
 * @param lagSeconds - Lag in seconds (null if unavailable)
 * @returns Formatted string (e.g., "45ms", "2.5s", "1m 30s", "?")
 */
export type FormatLag = (lagSeconds: number | null) => string;

/**
 * Get color for lag severity.
 *
 * @param severity - Lag severity classification
 * @returns Theme color key to use
 */
export type GetLagColor = (severity: LagSeverity) => 'success' | 'warning' | 'critical' | 'muted';

/**
 * Derive node role from edges.
 *
 * @param nodeId - Node to check
 * @param edges - All topology edges
 * @returns Derived role
 */
export type DeriveNodeRole = (nodeId: string, edges: TopologyEdge[]) => NodeRole;

/**
 * Get role badge text.
 *
 * @param role - Node role
 * @returns Short label for badge display
 */
export type GetRoleBadgeLabel = (role: NodeRole) => string;
