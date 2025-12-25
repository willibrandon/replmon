/**
 * Selector API Contracts: Topology Panel
 *
 * Defines the selector functions for deriving topology data from store.
 * These contracts serve as the implementation specification.
 *
 * Feature: 008-topology-panel
 */

import type { ReplmonStore, Selector } from '../../../src/store/types.js';
import type {
  TopologyEdge,
  TopologyNodeData,
  NodeRole,
  LagSeverity,
} from './components.js';

// =============================================================================
// Primary Selectors
// =============================================================================

/**
 * Select all topology edges derived from subscriptions and replication stats.
 *
 * Implementation notes:
 * - Iterate all subscriptions, create edges where providerNode matches a configured node
 * - For native replication, match pg_stat_replication application_name to node IDs
 * - Detect bidirectional by checking for reverse edges
 * - Include lag data from lagHistory
 *
 * @returns Array of TopologyEdge representing all replication relationships
 */
export const selectTopologyEdges: Selector<TopologyEdge[]> = (state: ReplmonStore) => {
  // Implementation in store/selectors/topology.ts
  throw new Error('Contract only - implementation in topology.ts');
};

/**
 * Select all nodes with aggregated topology data for rendering.
 *
 * Implementation notes:
 * - Aggregate node info, status, role, and edges
 * - Include selection state from UI slice
 * - Mark stale nodes appropriately
 *
 * @returns Array of TopologyNodeData with all rendering information
 */
export const selectTopologyNodes: Selector<TopologyNodeData[]> = (state: ReplmonStore) => {
  // Implementation in store/selectors/topology.ts
  throw new Error('Contract only - implementation in topology.ts');
};

// =============================================================================
// Parameterized Selectors
// =============================================================================

/**
 * Select role for a specific node based on its edges.
 *
 * @param nodeId - Node identifier
 * @returns Selector function returning the node's role
 */
export const selectNodeRole = (nodeId: string): Selector<NodeRole> => {
  return (state: ReplmonStore) => {
    // Implementation in store/selectors/topology.ts
    throw new Error('Contract only - implementation in topology.ts');
  };
};

/**
 * Select lag data for a specific edge.
 *
 * @param sourceId - Source node identifier
 * @param targetId - Target node identifier
 * @returns Selector function returning lag information
 */
export const selectEdgeLag = (
  sourceId: string,
  targetId: string
): Selector<{ lagSeconds: number | null; lagBytes: number; severity: LagSeverity }> => {
  return (state: ReplmonStore) => {
    // Implementation in store/selectors/topology.ts
    throw new Error('Contract only - implementation in topology.ts');
  };
};

/**
 * Select edges for a specific node (both incoming and outgoing).
 *
 * @param nodeId - Node identifier
 * @returns Selector function returning arrays of incoming and outgoing edges
 */
export const selectNodeEdges = (
  nodeId: string
): Selector<{ incoming: TopologyEdge[]; outgoing: TopologyEdge[] }> => {
  return (state: ReplmonStore) => {
    // Implementation in store/selectors/topology.ts
    throw new Error('Contract only - implementation in topology.ts');
  };
};

// =============================================================================
// Derived Selectors
// =============================================================================

/**
 * Select count of active replication relationships.
 *
 * @returns Number of edges with active status
 */
export const selectActiveEdgeCount: Selector<number> = (state: ReplmonStore) => {
  // Count edges where status is 'streaming' or 'replicating'
  throw new Error('Contract only - implementation in topology.ts');
};

/**
 * Select whether any edge has critical lag.
 *
 * @returns True if any edge has lagSeconds > 30
 */
export const selectHasCriticalLag: Selector<boolean> = (state: ReplmonStore) => {
  // Check if any edge has critical lag
  throw new Error('Contract only - implementation in topology.ts');
};

/**
 * Select nodes grouped by role.
 *
 * @returns Map of role to array of node IDs
 */
export const selectNodesByRole: Selector<Map<NodeRole, string[]>> = (state: ReplmonStore) => {
  // Group nodes by their derived role
  throw new Error('Contract only - implementation in topology.ts');
};

// =============================================================================
// Implementation Requirements
// =============================================================================

/**
 * Edge Derivation Logic:
 *
 * 1. For each node's subscriptions:
 *    - If subscription.source === 'pglogical' && subscription.providerNode:
 *      - If providerNode matches a configured node ID:
 *        - Create edge: providerNode → subscription.nodeId
 *        - Set replicationType: 'pglogical'
 *        - Get lag from lagHistory[`${nodeId}:${subscriptionName}`]
 *
 * 2. For replication stats (pg_stat_replication):
 *    - For each stat entry on a node:
 *      - If stat.applicationName matches a configured node ID:
 *        - Create edge: stat.nodeId → applicationName
 *        - Set replicationType: 'native'
 *        - Get lag from stat.lagSeconds, stat.lagBytes
 *
 * 3. Bidirectional detection:
 *    - After creating all edges, for each edge A→B:
 *      - If reverse edge B→A exists and both are pglogical:
 *        - Update direction to 'bidirectional' on one edge
 *        - Remove the reverse edge (deduplicate)
 *
 * 4. Lag data:
 *    - For pglogical edges: use lagHistory samples
 *    - For native edges: use ReplicationStats directly
 *    - If no lag data available: lagSeconds = null
 */

/**
 * Role Derivation Logic:
 *
 * function deriveNodeRole(nodeId: string, edges: TopologyEdge[]): NodeRole {
 *   const isSource = edges.some(e => e.sourceNodeId === nodeId);
 *   const isTarget = edges.some(e => e.targetNodeId === nodeId);
 *   const hasPglogical = edges.some(e =>
 *     (e.sourceNodeId === nodeId || e.targetNodeId === nodeId) &&
 *     e.replicationType === 'pglogical'
 *   );
 *
 *   if (hasPglogical) {
 *     if (isSource && isTarget) return 'bidirectional';
 *     if (isSource) return 'provider';
 *     if (isTarget) return 'subscriber';
 *   }
 *
 *   if (isSource) return 'primary';
 *   if (isTarget) return 'standby';
 *   return 'standalone';
 * }
 */

/**
 * Memoization Requirements:
 *
 * Use createSelector or useMemo for:
 * - selectTopologyEdges (depends on subscriptions, lagHistory)
 * - selectTopologyNodes (depends on edges, nodes, nodeStatus, selections)
 *
 * Parameterized selectors should use factory pattern:
 * const makeSelectNodeRole = () => createSelector(
 *   [selectTopologyEdges, (_, nodeId) => nodeId],
 *   (edges, nodeId) => deriveNodeRole(nodeId, edges)
 * );
 */
