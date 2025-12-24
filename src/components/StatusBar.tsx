import React from 'react';
import { Box, Text } from 'ink';
import { useConnectionStore } from '../store/connection.js';

/**
 * Bottom status bar showing current mode and keyboard hints.
 */
export function StatusBar(): React.ReactElement {
  const currentScreen = useConnectionStore((s) => s.currentScreen);
  const pglogicalMode = useConnectionStore((s) => s.pglogicalMode);

  return (
    <Box
      borderStyle="single"
      borderTop={true}
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
    >
      <Box flexGrow={1}>
        <Text>
          {pglogicalMode ? '[pglogical] ' : ''}
          {currentScreen === 'connection-status'
            ? '[r] retry  [q] quit'
            : '[t] topology  [q] quit'}
        </Text>
      </Box>
      <Box>
        <Text dimColor>replmon</Text>
      </Box>
    </Box>
  );
}
