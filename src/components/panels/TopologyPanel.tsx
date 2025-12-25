import React from 'react';
import { Box, Text } from 'ink';
import { StatusDot } from '../atoms/StatusDot.js';
import type { StatusDotVariant } from '../atoms/StatusDot.js';
import { Badge } from '../atoms/Badge.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useConnectionStore } from '../../store/connection.js';
import { useStore } from '../../store/index.js';
import type { Configuration } from '../../types/config.js';

export interface TopologyPanelProps {
  config: Configuration;
}

function getStatusVariant(status: 'connecting' | 'connected' | 'failed' | undefined): StatusDotVariant {
  if (status === 'connected') return 'success';
  if (status === 'connecting') return 'connecting';
  if (status === 'failed') return 'critical';
  return 'muted';
}

function TopologyNode({ nodeId, config }: { nodeId: string; config: Configuration }): React.ReactElement {
  const colors = useTheme();
  const status = useConnectionStore((s) => s.nodeStatus.get(nodeId));
  const selection = useStore((s) => s.selections.get('topology'));
  const isSelected = selection === nodeId;
  const nodeConfig = config.nodes[nodeId];
  const hostInfo = nodeConfig ? `${nodeConfig.host}:${nodeConfig.port}` : '';

  return (
    <Box>
      <Box width={3}><StatusDot variant={getStatusVariant(status)} /></Box>
      <Box width={20}><Text bold={isSelected} color={isSelected ? colors.primary : colors.foreground}>{nodeId}</Text></Box>
      <Box><Text color={colors.muted}>{hostInfo}</Text></Box>
    </Box>
  );
}

export function TopologyPanel({ config }: TopologyPanelProps): React.ReactElement {
  const colors = useTheme();
  const pglogicalMode = useConnectionStore((s) => s.pglogicalMode);
  const nodeIds = Object.keys(config.nodes);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={colors.muted}>{nodeIds.length} node{nodeIds.length !== 1 ? 's' : ''}</Text>
        {pglogicalMode && <Box marginLeft={1}><Badge label="pglogical" variant="secondary" /></Box>}
      </Box>
      {nodeIds.length === 0 ? <Text color={colors.muted}>No nodes configured</Text> : nodeIds.map((nodeId) => <TopologyNode key={nodeId} nodeId={nodeId} config={config} />)}
    </Box>
  );
}
