import React from 'react';
import { Box } from 'ink';
import { useConnectionStore } from '../store/connection.js';
import type { Configuration } from '../types/config.js';
import { StatusBar } from './StatusBar.js';

export interface AppProps {
  config: Configuration;
}

/**
 * Root application component.
 * Manages screen transitions between connection-status and dashboard.
 */
export function App({ config }: AppProps): React.ReactElement {
  const currentScreen = useConnectionStore((s) => s.currentScreen);
  const setPglogicalMode = useConnectionStore((s) => s.setPglogicalMode);
  const initializeNodes = useConnectionStore((s) => s.initializeNodes);

  // Initialize store with config on mount
  React.useEffect(() => {
    setPglogicalMode(config.pglogical);
    initializeNodes(Object.keys(config.nodes));
  }, [config, setPglogicalMode, initializeNodes]);

  return (
    <Box flexDirection="column" width="100%">
      <Box flexGrow={1}>
        {currentScreen === 'connection-status' && (
          <Box flexDirection="column" padding={1}>
            <Box>Connection Status</Box>
            <Box marginTop={1}>
              {Object.keys(config.nodes).map((nodeId) => (
                <NodeStatusLine key={nodeId} nodeId={nodeId} />
              ))}
            </Box>
          </Box>
        )}
        {currentScreen === 'dashboard' && (
          <Box flexDirection="column" padding={1}>
            <Box>Dashboard - Topology Panel</Box>
          </Box>
        )}
      </Box>
      <StatusBar />
    </Box>
  );
}

interface NodeStatusLineProps {
  nodeId: string;
}

function NodeStatusLine({ nodeId }: NodeStatusLineProps): React.ReactElement {
  const status = useConnectionStore((s) => s.nodeStatus.get(nodeId));
  const error = useConnectionStore((s) => s.connectionErrors.get(nodeId));

  const statusText =
    status === 'connecting'
      ? 'Connecting...'
      : status === 'connected'
        ? 'Connected'
        : status === 'failed'
          ? `Failed${error ? `: ${error}` : ''}`
          : 'Unknown';

  return (
    <Box>
      {nodeId}: {statusText}
    </Box>
  );
}
