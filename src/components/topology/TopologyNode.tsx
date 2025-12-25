/**
 * TopologyNode Component
 *
 * Renders a single node box in the topology panel with status indicator,
 * name, role badge, and host information.
 *
 * Feature: 008-topology-panel
 */

import React from 'react';
import { Box, Text } from 'ink';
import { StatusDot, type StatusDotVariant } from '../atoms/StatusDot.js';
import { Badge, type BadgeVariant } from '../atoms/Badge.js';
import { useTheme } from '../../hooks/useTheme.js';
import type { TopologyNodeData, NodeRole } from '../../types/topology.js';
import { getRoleBadgeLabel } from '../../utils/topology.js';

export interface TopologyNodeProps {
  /** Node data from topology selector */
  node: TopologyNodeData;
  /** Width of the node box in characters */
  width?: number;
}

/**
 * Map connection status to StatusDot variant.
 */
function getStatusVariant(
  status: 'connecting' | 'connected' | 'failed' | undefined,
  isStale: boolean
): StatusDotVariant {
  if (isStale) return 'muted';
  if (status === 'connected') return 'success';
  if (status === 'connecting') return 'connecting';
  if (status === 'failed') return 'critical';
  return 'muted';
}

/**
 * Map node role to Badge variant.
 */
function getRoleBadgeVariant(role: NodeRole): BadgeVariant {
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

/**
 * TopologyNode displays a single node as a bordered box with:
 * - Status indicator (StatusDot)
 * - Node name
 * - Role badge
 * - Host:port info
 * - Stale badge (if applicable)
 */
export const TopologyNode = React.memo(function TopologyNode({
  node,
  width = 24,
}: TopologyNodeProps): React.ReactElement {
  const colors = useTheme();

  const statusVariant = getStatusVariant(node.connectionStatus, node.isStale);
  const roleBadgeVariant = getRoleBadgeVariant(node.role);
  const roleLabel = getRoleBadgeLabel(node.role);

  // Determine colors based on selection and stale state
  const borderColor = node.isSelected
    ? colors.primary
    : node.isStale
      ? colors.muted
      : colors.secondary;

  const textColor = node.isStale ? colors.muted : colors.foreground;
  const nameColor = node.isSelected ? colors.primary : textColor;

  return (
    <Box
      flexDirection="column"
      borderStyle={node.isSelected ? 'bold' : 'single'}
      borderColor={borderColor}
      width={width}
      paddingX={1}
    >
      {/* Row 1: Status + Node Name */}
      <Box>
        <Box marginRight={1}>
          <StatusDot variant={statusVariant} />
        </Box>
        <Text bold={node.isSelected} color={nameColor}>
          {node.displayName}
        </Text>
      </Box>

      {/* Row 2: Role Badge + Stale indicator */}
      <Box>
        <Badge label={roleLabel} variant={roleBadgeVariant} />
        {node.isStale && (
          <Box marginLeft={1}>
            <Badge label="STALE" variant="muted" />
          </Box>
        )}
      </Box>

      {/* Row 3: Host info */}
      <Box>
        <Text color={colors.muted} dimColor={node.isStale}>
          {node.hostInfo}
        </Text>
      </Box>
    </Box>
  );
});
