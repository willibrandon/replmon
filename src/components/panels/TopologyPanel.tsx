/**
 * TopologyPanel Component
 *
 * Displays an ASCII-art visualization of PostgreSQL replication cluster nodes.
 * Shows node boxes with status indicators, role badges, and connection lines.
 *
 * Feature: 008-topology-panel
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Badge } from '../atoms/Badge.js';
import { TopologyNode, TopologyLayout } from '../topology/index.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useTopology } from '../../hooks/useTopology.js';
import { useTopologyLayout } from '../../hooks/useTopologyLayout.js';
import { useStore } from '../../store/index.js';
import type { Configuration } from '../../types/config.js';
import type { TopologyNodeData } from '../../types/topology.js';

export interface TopologyPanelProps {
  config: Configuration;
}

/**
 * Empty state when no nodes are configured.
 */
function EmptyState(): React.ReactElement {
  const colors = useTheme();
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Text color={colors.muted}>No nodes configured</Text>
      <Text color={colors.muted} dimColor>
        Add nodes to replmon.yaml to see topology
      </Text>
    </Box>
  );
}

/**
 * Single node view when only one node is configured.
 */
function SingleNodeView({
  node,
  nodeWidth,
}: {
  node: TopologyNodeData;
  nodeWidth: number;
}): React.ReactElement {
  const colors = useTheme();

  return (
    <Box flexDirection="column" alignItems="center">
      <TopologyNode node={node} width={nodeWidth} />
      <Box marginTop={1}>
        <Text color={colors.muted} dimColor>
          Single node - no replication relationships
        </Text>
      </Box>
    </Box>
  );
}

/**
 * TopologyPanel displays the replication topology visualization.
 *
 * Handles:
 * - Empty state (no nodes configured)
 * - Single node state (no connections)
 * - Multi-node state (with connection lines)
 */
export function TopologyPanel({ config: _config }: TopologyPanelProps): React.ReactElement {
  const colors = useTheme();
  const pglogicalMode = useStore((s) => s.pglogicalMode);
  const { nodes, edges, hasCriticalLag } = useTopology();
  const layout = useTopologyLayout(nodes.length);

  // Count summary
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const staleCount = nodes.filter((n) => n.isStale).length;

  // Header badges
  const badges: React.ReactElement[] = [];
  if (pglogicalMode) {
    badges.push(<Badge key="pglogical" label="pglogical" variant="secondary" />);
  }
  if (hasCriticalLag) {
    badges.push(<Badge key="lag" label="LAG!" variant="critical" />);
  }
  if (staleCount > 0) {
    badges.push(
      <Badge key="stale" label={`${staleCount} stale`} variant="muted" />
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Summary header */}
      <Box marginBottom={1} gap={1}>
        <Text color={colors.muted}>
          {nodeCount} node{nodeCount !== 1 ? 's' : ''}
          {edgeCount > 0 && `, ${edgeCount} connection${edgeCount !== 1 ? 's' : ''}`}
        </Text>
        {badges}
      </Box>

      {/* Topology visualization */}
      {nodeCount === 0 ? (
        <EmptyState />
      ) : nodeCount === 1 && nodes[0] ? (
        <SingleNodeView node={nodes[0]} nodeWidth={layout.nodeWidth} />
      ) : (
        // Multi-node view with connection lines
        <TopologyLayout
          nodes={nodes}
          edges={edges}
          layout={layout}
          showLag={true}
        />
      )}
    </Box>
  );
}
