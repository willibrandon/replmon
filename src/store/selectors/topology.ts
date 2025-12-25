/**
 * Topology Selectors
 *
 * Selectors for deriving topology graph structure from store state.
 * Includes edge derivation, node role detection, and aggregations.
 *
 * Feature: 008-topology-panel
 */

import type { Selector } from '../types.js';
import type {
  TopologyEdge,
  TopologyNodeData,
  NodeRole,
  LagSeverity,
  EdgeLagData,
} from '../../types/topology.js';
import {
  deriveNodeRole,
  getLagSeverity,
  createEdgeId,
} from '../../utils/topology.js';

// =============================================================================
// Edge Selectors
// =============================================================================

/**
 * Select all topology edges derived from subscription and replication data.
 *
 * Edges are created from:
 * 1. pglogical subscriptions where providerNode matches a configured node
 * 2. Native streaming replication (derived from replication stats)
 *
 * For bidirectional detection, we check if edges exist in both directions.
 */
export const selectTopologyEdges: Selector<TopologyEdge[]> = (state) => {
  const edges: TopologyEdge[] = [];
  const nodeIds = new Set(state.nodes.keys());

  // Build edges from subscriptions (pglogical)
  for (const [nodeId, subscriptions] of state.subscriptions) {
    for (const sub of subscriptions) {
      // Only create edge if providerNode is set and is a configured node
      if (sub.providerNode && nodeIds.has(sub.providerNode)) {
        const edgeId = createEdgeId(sub.providerNode, nodeId);

        // Get latest lag from history
        const lagKey = `${nodeId}:${sub.subscriptionName}`;
        const lagHistory = state.lagHistory.get(lagKey);
        const latestLag = lagHistory?.[lagHistory.length - 1];

        edges.push({
          id: edgeId,
          sourceNodeId: sub.providerNode,
          targetNodeId: nodeId,
          direction: 'unidirectional', // Will be updated below for bidirectional
          replicationType: sub.source === 'pglogical' ? 'pglogical' : 'native',
          lagSeconds: latestLag?.lagSeconds ?? null,
          lagBytes: latestLag?.lagBytes ?? 0,
          subscriptionName: sub.subscriptionName,
          status: sub.status,
        });
      }
    }
  }

  // Mark bidirectional edges
  // For each edge A→B, check if B→A also exists
  for (const edge of edges) {
    const reverseId = createEdgeId(edge.targetNodeId, edge.sourceNodeId);
    const reverseEdge = edges.find((e) => e.id === reverseId);
    if (reverseEdge && edge.replicationType === 'pglogical') {
      edge.direction = 'bidirectional';
    }
  }

  return edges;
};

/**
 * Select edges for a specific node (both incoming and outgoing).
 */
export const selectNodeEdges =
  (nodeId: string): Selector<{ incoming: TopologyEdge[]; outgoing: TopologyEdge[] }> =>
  (state) => {
    const allEdges = selectTopologyEdges(state);
    return {
      incoming: allEdges.filter((e) => e.targetNodeId === nodeId),
      outgoing: allEdges.filter((e) => e.sourceNodeId === nodeId),
    };
  };

// =============================================================================
// Node Selectors
// =============================================================================

/**
 * Select aggregated node data for topology rendering.
 * Includes role, edges, and display state for each node.
 */
export const selectTopologyNodes: Selector<TopologyNodeData[]> = (state) => {
  const edges = selectTopologyEdges(state);
  const selectedNodeId = state.selections.get('topology') ?? null;
  const nodes: TopologyNodeData[] = [];

  for (const [nodeId, nodeInfo] of state.nodes) {
    const connectionStatus = state.nodeStatus.get(nodeId);
    const isStale = state.staleNodes.has(nodeId);
    const role = deriveNodeRole(nodeId, edges);

    const incomingEdges = edges.filter((e) => e.targetNodeId === nodeId);
    const outgoingEdges = edges.filter((e) => e.sourceNodeId === nodeId);

    nodes.push({
      nodeId,
      displayName: nodeInfo.name,
      hostInfo: `${nodeInfo.host}:${nodeInfo.port}`,
      connectionStatus,
      role,
      isStale,
      isSelected: nodeId === selectedNodeId,
      hasPglogical: nodeInfo.hasPglogical,
      outgoingEdges,
      incomingEdges,
    });
  }

  return nodes;
};

/**
 * Select role for a specific node.
 */
export const selectNodeRole =
  (nodeId: string): Selector<NodeRole> =>
  (state) => {
    const edges = selectTopologyEdges(state);
    return deriveNodeRole(nodeId, edges);
  };

// =============================================================================
// Lag Selectors
// =============================================================================

/**
 * Select lag data for a specific edge.
 */
export const selectEdgeLag =
  (sourceId: string, targetId: string): Selector<EdgeLagData> =>
  (state) => {
    const edges = selectTopologyEdges(state);
    const edgeId = createEdgeId(sourceId, targetId);
    const edge = edges.find((e) => e.id === edgeId);

    if (!edge) {
      return {
        lagSeconds: null,
        lagBytes: 0,
        severity: 'unknown' as LagSeverity,
      };
    }

    return {
      lagSeconds: edge.lagSeconds,
      lagBytes: edge.lagBytes,
      severity: getLagSeverity(edge.lagSeconds),
    };
  };

// =============================================================================
// Derived/Computed Selectors
// =============================================================================

/**
 * Select count of active edges (edges with status 'replicating' or 'streaming').
 */
export const selectActiveEdgeCount: Selector<number> = (state) => {
  const edges = selectTopologyEdges(state);
  return edges.filter(
    (e) => e.status === 'replicating' || e.status === 'streaming'
  ).length;
};

/**
 * Check if any edge has critical lag (>30 seconds).
 */
export const selectHasCriticalLag: Selector<boolean> = (state) => {
  const edges = selectTopologyEdges(state);
  return edges.some((e) => e.lagSeconds !== null && e.lagSeconds > 30);
};

/**
 * Select nodes grouped by role.
 */
export const selectNodesByRole: Selector<Map<NodeRole, TopologyNodeData[]>> = (
  state
) => {
  const nodes = selectTopologyNodes(state);
  const byRole = new Map<NodeRole, TopologyNodeData[]>();

  for (const node of nodes) {
    const existing = byRole.get(node.role) ?? [];
    existing.push(node);
    byRole.set(node.role, existing);
  }

  return byRole;
};

/**
 * Get the selected topology node.
 */
export const selectSelectedTopologyNode: Selector<TopologyNodeData | null> = (
  state
) => {
  const nodes = selectTopologyNodes(state);
  return nodes.find((n) => n.isSelected) ?? null;
};
