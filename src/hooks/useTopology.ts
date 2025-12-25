/**
 * Topology Data Hook
 *
 * Aggregates topology data from store using topology selectors.
 *
 * Feature: 008-topology-panel
 */

import { useMemo } from 'react';
import { useStore } from '../store/index.js';
import { useConnectionStore } from '../store/connection.js';
import type { UseTopologyResult, TopologyNodeData, TopologyEdge } from '../types/topology.js';
import { deriveNodeRole, createEdgeId } from '../utils/topology.js';

/**
 * Find configured node ID by host:port match.
 */
function findNodeByHostPort(
  nodes: Map<string, { host: string; port: number }>,
  host: string | null,
  port: number | null
): string | null {
  if (!host || !port) return null;

  for (const [nodeId, nodeInfo] of nodes) {
    if (nodeInfo.host === host && nodeInfo.port === port) {
      return nodeId;
    }
  }
  return null;
}

/**
 * Aggregate topology data from store for panel rendering.
 *
 * @returns Topology nodes, edges, and derived status
 */
export function useTopology(): UseTopologyResult {
  // Select raw data from store - these are stable references (Map/Set)
  const nodes = useStore((s) => s.nodes);
  const subscriptions = useStore((s) => s.subscriptions);
  const lagHistory = useStore((s) => s.lagHistory);
  // Read nodeStatus from connection store (where it's actually updated)
  const nodeStatus = useConnectionStore((s) => s.nodeStatus);
  const staleNodes = useStore((s) => s.staleNodes);
  const selections = useStore((s) => s.selections);

  // Derive topology in useMemo to prevent infinite re-renders
  return useMemo(() => {
    const nodeIds = new Set(nodes.keys());
    const edges: TopologyEdge[] = [];

    // Derive edges from subscriptions
    for (const [nodeId, subs] of subscriptions) {
      for (const sub of subs) {
        // Try to find provider node by host:port (auto-discovery)
        let sourceNodeId = findNodeByHostPort(nodes, sub.providerHost, sub.providerPort);

        // Fall back to name match if host:port not available
        if (!sourceNodeId && sub.providerNode && nodeIds.has(sub.providerNode)) {
          sourceNodeId = sub.providerNode;
        }

        if (sourceNodeId) {
          const edgeId = createEdgeId(sourceNodeId, nodeId);
          const lagKey = `${nodeId}:${sub.subscriptionName}`;
          const history = lagHistory.get(lagKey);
          const latestLag = history?.[history.length - 1];

          edges.push({
            id: edgeId,
            sourceNodeId,
            targetNodeId: nodeId,
            direction: 'unidirectional',
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
    for (const edge of edges) {
      const reverseId = createEdgeId(edge.targetNodeId, edge.sourceNodeId);
      const reverseEdge = edges.find((e) => e.id === reverseId);
      if (reverseEdge && edge.replicationType === 'pglogical') {
        edge.direction = 'bidirectional';
      }
    }

    // Build nodes with derived data
    const selectedNodeId = selections.get('topology') ?? null;
    const topologyNodes: TopologyNodeData[] = [];

    for (const [nodeId, nodeInfo] of nodes) {
      const connectionStatus = nodeStatus.get(nodeId);
      const isStale = staleNodes.has(nodeId);
      const role = deriveNodeRole(nodeId, edges);

      topologyNodes.push({
        nodeId,
        displayName: nodeInfo.name,
        hostInfo: `${nodeInfo.host}:${nodeInfo.port}`,
        connectionStatus,
        role,
        isStale,
        isSelected: nodeId === selectedNodeId,
        hasPglogical: nodeInfo.hasPglogical,
        outgoingEdges: edges.filter((e) => e.sourceNodeId === nodeId),
        incomingEdges: edges.filter((e) => e.targetNodeId === nodeId),
      });
    }

    // Compute derived values
    const hasCriticalLag = edges.some(
      (e) => e.lagSeconds !== null && e.lagSeconds > 30
    );
    const activeEdgeCount = edges.filter(
      (e) => e.status === 'replicating' || e.status === 'streaming'
    ).length;

    return {
      nodes: topologyNodes,
      edges,
      selectedNodeId,
      hasCriticalLag,
      activeEdgeCount,
    };
  }, [nodes, subscriptions, lagHistory, nodeStatus, staleNodes, selections]);
}
