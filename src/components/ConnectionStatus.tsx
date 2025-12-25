import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useConnectionStore } from '../store/connection.js';
import { useStore } from '../store/index.js';
import { exitApp } from '../index.js';
import { ConnectionManager } from '../services/connection-manager/index.js';
import { PollingService } from '../services/polling/index.js';
import type { Configuration } from '../types/config.js';

// Module-level manager instance for the app
let connectionManager: ConnectionManager | null = null;
let pollingService: PollingService | null = null;

export function getConnectionManager(): ConnectionManager | null {
  return connectionManager;
}

export function getPollingService(): PollingService | null {
  return pollingService;
}

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
  const setNodeStatus = useConnectionStore((s) => s.setNodeStatus);
  const setConnectionError = useConnectionStore((s) => s.setConnectionError);
  const setCurrentScreen = useConnectionStore((s) => s.setCurrentScreen);
  const [connectionAttempt, setConnectionAttempt] = React.useState(0);
  const quittingRef = React.useRef(false);

  // Attempt connections when component mounts or retry is triggered
  React.useEffect(() => {
    let cancelled = false;

    async function connect() {
      // Shutdown existing manager if any
      if (connectionManager) {
        await connectionManager.shutdown();
        connectionManager = null;
      }

      // Create new manager
      connectionManager = new ConnectionManager({
        healthCheckIntervalMs: 5000,
        unhealthyThreshold: 3,
        queryTimeoutMs: 30000,
      });

      // Subscribe to health events to update UI when status changes
      connectionManager.on('node:connected', ({ nodeId }) => {
        if (!cancelled && !quittingRef.current) {
          setNodeStatus(nodeId, 'connected');
          // Check if all nodes are now connected and transition to dashboard
          const allConnected = nodeIds.every((id) => {
            if (id === nodeId) return true; // This one just connected
            return useConnectionStore.getState().nodeStatus.get(id) === 'connected';
          });
          if (allConnected) {
            // Start polling service before transitioning to dashboard
            if (connectionManager && !pollingService) {
              pollingService = new PollingService(connectionManager, { intervalMs: 1000 });

              // Wire polling events to store
              const store = useStore.getState();
              pollingService.on('subscriptions', (nodeDataList) => {
                for (const nodeData of nodeDataList) {
                  if (nodeData.success && nodeData.data) {
                    store.setSubscriptions(nodeData.nodeId, nodeData.data);
                  }
                  // Update pglogical detection
                  if (nodeData.hasPglogical) {
                    store.setNodePglogical(nodeData.nodeId, true);
                  }
                }
              });

              pollingService.on('slots', (nodeDataList) => {
                for (const nodeData of nodeDataList) {
                  if (nodeData.success && nodeData.data) {
                    store.setSlots(nodeData.nodeId, nodeData.data);
                  }
                }
              });

              pollingService.on('conflicts', (nodeDataList) => {
                for (const nodeData of nodeDataList) {
                  if (nodeData.success && nodeData.data) {
                    store.setConflicts(nodeData.nodeId, nodeData.data);
                  }
                }
              });

              pollingService.start();
            }
            setCurrentScreen('dashboard');
          }
        }
      });

      connectionManager.on('node:disconnected', ({ nodeId, error }) => {
        if (!cancelled && !quittingRef.current) {
          setNodeStatus(nodeId, 'failed');
          if (error) {
            setConnectionError(nodeId, error.message);
          }
        }
      });

      const nodeIds = Object.keys(config.nodes);

      // Set all nodes to connecting initially
      for (const nodeId of nodeIds) {
        setNodeStatus(nodeId, 'connecting');
      }

      // Build node configs for initialize
      const nodeConfigs: Array<{ id: string; config: { host: string; port: number; database: string; user: string; password?: string; name?: string } }> = [];
      for (const nodeId of nodeIds) {
        const nodeConfig = config.nodes[nodeId];
        if (!nodeConfig) continue;
        nodeConfigs.push({
          id: nodeId,
          config: {
            host: nodeConfig.host,
            port: nodeConfig.port,
            database: nodeConfig.database,
            user: nodeConfig.user,
            ...(nodeConfig.password !== undefined && { password: nodeConfig.password }),
            ...(nodeConfig.name !== undefined && { name: nodeConfig.name }),
          },
        });
      }

      try {
        // Initialize all nodes - this starts health checking
        await connectionManager.initialize(nodeConfigs);
      } catch (err) {
        // Initialize failed for some reason
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          for (const nodeId of nodeIds) {
            setConnectionError(nodeId, errorMessage);
          }
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
    };
  }, [config, connectionAttempt, setNodeStatus, setConnectionError, setCurrentScreen]);

  // Handle keyboard input
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      // Mark as quitting to prevent UI updates during shutdown
      quittingRef.current = true;
      // Stop polling first
      if (pollingService) {
        pollingService.stop();
        pollingService = null;
      }
      // Cleanup before exit
      if (connectionManager) {
        connectionManager.shutdown().finally(() => exitApp(0));
      } else {
        exitApp(0);
      }
      return;
    }
    if (input === 'r') {
      onRetry();
      setConnectionAttempt((prev) => prev + 1);
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
