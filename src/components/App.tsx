import React from 'react';
import { Box } from 'ink';
import { useConnectionStore } from '../store/connection.js';
import { useStore } from '../store/index.js';
import type { Configuration } from '../types/config.js';
import type { NodeInfo } from '../store/types.js';
import { ConnectionStatus } from './ConnectionStatus.js';
import { Dashboard } from './Dashboard.js';
import { ThemeProvider } from '../theme/index.js';

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
  const initializeNodesInfo = useStore((s) => s.initializeNodesInfo);
  const resetConnectionStates = useConnectionStore((s) => s.resetConnectionStates);

  // Initialize store with config on mount
  React.useEffect(() => {
    setPglogicalMode(config.pglogical);
    initializeNodes(Object.keys(config.nodes));

    // Initialize node info for topology panel
    const nodeInfos: NodeInfo[] = Object.entries(config.nodes).map(
      ([id, node]) => ({
        id,
        name: id,
        host: node.host,
        port: node.port,
        database: node.database,
        hasPglogical: false, // Will be detected at runtime
      })
    );
    initializeNodesInfo(nodeInfos);
  }, [config, setPglogicalMode, initializeNodes, initializeNodesInfo]);

  // Handle retry action from ConnectionStatus
  const handleRetry = React.useCallback(() => {
    resetConnectionStates();
  }, [resetConnectionStates]);

  return (
    <ThemeProvider theme={config.theme}>
      <Box flexDirection="column" width="100%" height="100%">
        {currentScreen === 'connection-status' && (
          <ConnectionStatus config={config} onRetry={handleRetry} />
        )}
        {currentScreen === 'dashboard' && <Dashboard config={config} />}
      </Box>
    </ThemeProvider>
  );
}
