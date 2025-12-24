import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useConnectionStore } from '../store/connection.js';
import { exitApp } from '../index.js';
import type { Configuration } from '../types/config.js';

interface ConnectionStatusProps {
  config: Configuration;
  onRetry: () => void;
}

/**
 * Connection status screen showing per-node connection status.
 * Displays status for each configured node and handles retry/quit keyboard input.
 */
export function ConnectionStatus({
  config,
  onRetry,
}: ConnectionStatusProps): React.ReactElement {
  // Handle keyboard input
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exitApp(0);
    }
    if (input === 'r') {
      onRetry();
    }
  });

  const nodeIds = Object.keys(config.nodes);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Connection Status</Text>
      </Box>

      <Box flexDirection="column">
        {nodeIds.map((nodeId) => (
          <NodeStatusLine key={nodeId} nodeId={nodeId} config={config} />
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Press [r] to retry connection, [q] to quit
        </Text>
      </Box>
    </Box>
  );
}

interface NodeStatusLineProps {
  nodeId: string;
  config: Configuration;
}

function NodeStatusLine({
  nodeId,
  config,
}: NodeStatusLineProps): React.ReactElement {
  const status = useConnectionStore((s) => s.nodeStatus.get(nodeId));
  const error = useConnectionStore((s) => s.connectionErrors.get(nodeId));

  const nodeConfig = config.nodes[nodeId];
  const hostInfo = nodeConfig
    ? `${nodeConfig.host}:${nodeConfig.port}/${nodeConfig.database}`
    : '';

  const statusColor =
    status === 'connecting'
      ? 'yellow'
      : status === 'connected'
        ? 'green'
        : status === 'failed'
          ? 'red'
          : 'gray';

  const statusIcon =
    status === 'connecting'
      ? '◐'
      : status === 'connected'
        ? '●'
        : status === 'failed'
          ? '✖'
          : '○';

  const statusText =
    status === 'connecting'
      ? 'Connecting...'
      : status === 'connected'
        ? 'Connected'
        : status === 'failed'
          ? 'Failed'
          : 'Ready';

  return (
    <Box>
      <Box width={16}>
        <Text bold>{nodeId}</Text>
      </Box>
      <Box width={4}>
        <Text color={statusColor}>{statusIcon}</Text>
      </Box>
      <Box width={14}>
        <Text color={statusColor}>{statusText}</Text>
      </Box>
      <Box>
        <Text dimColor>{hostInfo}</Text>
      </Box>
      {error && (
        <Box marginLeft={1}>
          <Text color="red">({error})</Text>
        </Box>
      )}
    </Box>
  );
}
