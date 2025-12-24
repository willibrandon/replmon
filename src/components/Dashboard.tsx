import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useConnectionStore } from '../store/connection.js';
import { exitApp } from '../index.js';
import type { Configuration } from '../types/config.js';

interface DashboardProps {
  config: Configuration;
}

/**
 * Main dashboard view with topology panel placeholder.
 * Shows connected nodes and monitoring status.
 */
export function Dashboard({ config }: DashboardProps): React.ReactElement {
  const pglogicalMode = useConnectionStore((s) => s.pglogicalMode);

  // Handle keyboard input
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exitApp(0);
    }
    // Future: 't' for topology, 's' for subscriptions, etc.
  });

  const nodeIds = Object.keys(config.nodes);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} borderStyle="single" paddingX={1}>
        <Text bold>Topology</Text>
        {pglogicalMode && (
          <Box marginLeft={1}>
            <Text color="cyan">[pglogical]</Text>
          </Box>
        )}
      </Box>

      <Box flexDirection="column" paddingX={1}>
        {nodeIds.length === 0 ? (
          <Text dimColor>No nodes configured</Text>
        ) : (
          nodeIds.map((nodeId) => (
            <TopologyNode key={nodeId} nodeId={nodeId} config={config} />
          ))
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Monitoring {nodeIds.length} node{nodeIds.length !== 1 ? 's' : ''}
          {pglogicalMode ? ' with pglogical' : ''}
        </Text>
      </Box>
    </Box>
  );
}

interface TopologyNodeProps {
  nodeId: string;
  config: Configuration;
}

function TopologyNode({
  nodeId,
  config,
}: TopologyNodeProps): React.ReactElement {
  const status = useConnectionStore((s) => s.nodeStatus.get(nodeId));

  const nodeConfig = config.nodes[nodeId];
  const hostInfo = nodeConfig
    ? `${nodeConfig.host}:${nodeConfig.port}`
    : '';

  const statusIcon =
    status === 'connected'
      ? '●'
      : status === 'connecting'
        ? '◐'
        : '○';

  const statusColor =
    status === 'connected'
      ? 'green'
      : status === 'connecting'
        ? 'yellow'
        : 'gray';

  return (
    <Box>
      <Box width={4}>
        <Text color={statusColor}>{statusIcon}</Text>
      </Box>
      <Box width={20}>
        <Text bold>{nodeId}</Text>
      </Box>
      <Box>
        <Text dimColor>{hostInfo}</Text>
      </Box>
    </Box>
  );
}
