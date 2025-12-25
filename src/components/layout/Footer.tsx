import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import { useConnectionStore } from '../../store/connection.js';
import { useStore } from '../../store/index.js';
import type { Panel } from '../../store/types.js';

export interface FooterProps {
  currentPanel?: Panel;
  showTimestamp?: boolean;
  keyboardHints?: string;
}

export function Footer({ currentPanel, showTimestamp = false, keyboardHints }: FooterProps): React.ReactElement {
  const colors = useTheme();
  const currentScreen = useConnectionStore((s) => s.currentScreen);
  const pglogicalMode = useConnectionStore((s) => s.pglogicalMode);
  const focusedPanel = useStore((s) => s.focusedPanel);
  const displayPanel = currentPanel ?? focusedPanel;
  const hints = keyboardHints ?? (currentScreen === 'connection-status' ? '[r] retry  [q] quit' : '[t]op [s]ubs [sl]ots [c]onf [o]ps  [?] help  [q] quit');

  return (
    <Box borderStyle="single" borderTop={true} borderBottom={false} borderLeft={false} borderRight={false} borderColor={colors.muted} paddingX={1}>
      <Box flexGrow={1}><Text color={colors.muted}>{pglogicalMode && '[pglogical] '}{hints}</Text></Box>
      <Box>
        {currentScreen === 'dashboard' && <Text color={colors.primary} bold>{displayPanel.charAt(0).toUpperCase() + displayPanel.slice(1)}</Text>}
        {showTimestamp && <Text color={colors.muted} dimColor> {new Date().toLocaleTimeString()}</Text>}
      </Box>
    </Box>
  );
}
