/**
 * TopologyRow Component
 *
 * Renders a horizontal row of topology nodes with connection lines between them.
 *
 * Feature: 008-topology-panel
 */

import React from 'react';
import { Box } from 'ink';
import { TopologyNode } from './TopologyNode.js';
import { ConnectionLine } from './ConnectionLine.js';
import type { TopologyNodeData, TopologyEdge } from '../../types/topology.js';

export interface TopologyRowProps {
  /** Nodes to display in this row */
  nodes: TopologyNodeData[];
  /** All edges for finding connections between nodes */
  allEdges: TopologyEdge[];
  /** Width of each node box */
  nodeWidth: number;
  /** Width of connection lines */
  connectionWidth: number;
  /** Whether to show lag values on connection lines */
  showLag?: boolean;
}

/**
 * Find edge between two nodes (in either direction).
 */
function findEdgeBetween(
  nodeA: string,
  nodeB: string,
  edges: TopologyEdge[]
): TopologyEdge | null {
  // Check A → B
  const aToB = edges.find(
    (e) => e.sourceNodeId === nodeA && e.targetNodeId === nodeB
  );
  if (aToB) return aToB;

  // Check B → A (will show as reverse direction)
  const bToA = edges.find(
    (e) => e.sourceNodeId === nodeB && e.targetNodeId === nodeA
  );
  return bToA ?? null;
}

/**
 * TopologyRow displays nodes horizontally with connection lines between adjacent nodes.
 *
 * Layout: [Node] ──→ [Node] ──→ [Node]
 */
export const TopologyRow = React.memo(function TopologyRow({
  nodes,
  allEdges,
  nodeWidth,
  connectionWidth,
  showLag = true,
}: TopologyRowProps): React.ReactElement {
  return (
    <Box flexDirection="row" alignItems="center">
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1;
        const nextNode = nodes[index + 1];

        // Find edge between this node and the next
        const edge = nextNode
          ? findEdgeBetween(node.nodeId, nextNode.nodeId, allEdges)
          : null;

        return (
          <React.Fragment key={node.nodeId}>
            <TopologyNode node={node} width={nodeWidth} />
            {!isLast && edge && (
              <Box alignItems="center" justifyContent="center" paddingX={1}>
                <ConnectionLine
                  edge={edge}
                  showLag={showLag}
                  width={connectionWidth}
                  orientation="horizontal"
                />
              </Box>
            )}
            {!isLast && !edge && (
              // Spacer when no edge exists (connectionWidth + 2 for paddingX parity)
              <Box width={connectionWidth + 2} />
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
});
