/**
 * TopologyLayout Component
 *
 * Orchestrates multi-row layout of topology nodes with responsive sizing.
 * Handles row arrangement based on terminal width and node count.
 *
 * Feature: 008-topology-panel
 */

import React from 'react';
import { Box } from 'ink';
import { TopologyRow } from './TopologyRow.js';
import { TopologyNode } from './TopologyNode.js';
import { ConnectionLine } from './ConnectionLine.js';
import type {
  TopologyNodeData,
  TopologyEdge,
  TopologyLayoutConfig,
} from '../../types/topology.js';

export interface TopologyLayoutProps {
  /** All topology nodes to display */
  nodes: TopologyNodeData[];
  /** All topology edges */
  edges: TopologyEdge[];
  /** Layout configuration from useTopologyLayout */
  layout: TopologyLayoutConfig;
  /** Whether to show lag values on connection lines */
  showLag?: boolean;
}

/**
 * Split nodes into rows based on nodesPerRow configuration.
 */
function splitIntoRows(
  nodes: TopologyNodeData[],
  nodesPerRow: number
): TopologyNodeData[][] {
  const rows: TopologyNodeData[][] = [];
  for (let i = 0; i < nodes.length; i += nodesPerRow) {
    rows.push(nodes.slice(i, i + nodesPerRow));
  }
  return rows;
}

/**
 * Find edges connecting nodes between rows.
 */
function findInterRowEdges(
  row1: TopologyNodeData[],
  row2: TopologyNodeData[],
  edges: TopologyEdge[]
): TopologyEdge[] {
  const row1Ids = new Set(row1.map((n) => n.nodeId));
  const row2Ids = new Set(row2.map((n) => n.nodeId));

  return edges.filter(
    (e) =>
      (row1Ids.has(e.sourceNodeId) && row2Ids.has(e.targetNodeId)) ||
      (row2Ids.has(e.sourceNodeId) && row1Ids.has(e.targetNodeId))
  );
}

/**
 * TopologyLayout orchestrates the display of multiple rows of nodes.
 *
 * Supports:
 * - Horizontal layout (multiple nodes per row)
 * - Vertical layout (single column)
 * - Responsive resizing based on terminal width
 * - Connection lines between adjacent nodes
 */
export const TopologyLayout = React.memo(function TopologyLayout({
  nodes,
  edges,
  layout,
  showLag = true,
}: TopologyLayoutProps): React.ReactElement {
  if (layout.isVertical) {
    // Vertical layout: stack nodes vertically with connection lines between
    return (
      <Box flexDirection="column" gap={0}>
        {nodes.map((node, index) => {
          const nextNode = nodes[index + 1];
          const edge = nextNode
            ? edges.find(
                (e) =>
                  (e.sourceNodeId === node.nodeId &&
                    e.targetNodeId === nextNode.nodeId) ||
                  (e.sourceNodeId === nextNode.nodeId &&
                    e.targetNodeId === node.nodeId)
              )
            : null;

          return (
            <React.Fragment key={node.nodeId}>
              <TopologyNode node={node} width={layout.nodeWidth} />
              {edge && index < nodes.length - 1 && (
                <Box alignSelf="center" marginY={0}>
                  <ConnectionLine
                    edge={edge}
                    showLag={showLag}
                    width={layout.connectionWidth}
                    orientation="vertical"
                  />
                </Box>
              )}
            </React.Fragment>
          );
        })}
      </Box>
    );
  }

  // Horizontal layout: split into rows
  const rows = splitIntoRows(nodes, layout.nodesPerRow);

  return (
    <Box flexDirection="column" gap={1}>
      {rows.map((rowNodes, rowIndex) => {
        const nextRow = rows[rowIndex + 1];
        const interRowEdges = nextRow
          ? findInterRowEdges(rowNodes, nextRow, edges)
          : [];

        return (
          <React.Fragment key={`row-${rowIndex}`}>
            <TopologyRow
              nodes={rowNodes}
              allEdges={edges}
              nodeWidth={layout.nodeWidth}
              connectionWidth={layout.connectionWidth}
              showLag={showLag}
            />
            {/* Show inter-row connections if they exist */}
            {interRowEdges.length > 0 && (
              <Box justifyContent="center">
                {interRowEdges.slice(0, 1).map((edge) => (
                  <ConnectionLine
                    key={edge.id}
                    edge={edge}
                    showLag={showLag}
                    width={layout.connectionWidth}
                    orientation="vertical"
                  />
                ))}
              </Box>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
});
