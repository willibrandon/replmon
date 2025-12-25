import React from 'react';
import { Box } from 'ink';
import { useConnectionStore } from '../store/connection.js';
import type { Configuration } from '../types/config.js';
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
  const resetConnectionStates = useConnectionStore((s) => s.resetConnectionStates);

  // Initialize store with config on mount
  React.useEffect(() => {
    setPglogicalMode(config.pglogical);
    initializeNodes(Object.keys(config.nodes));
  }, [config, setPglogicalMode, initializeNodes]);

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
