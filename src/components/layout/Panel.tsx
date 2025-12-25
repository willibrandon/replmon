import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import { useStore } from '../../store/index.js';
import type { Panel as PanelType } from '../../store/types.js';

export interface PanelProps {
  panelId: PanelType;
  title: string;
  badges?: string[];
  children: React.ReactNode;
}

export function Panel({ panelId, title, badges, children }: PanelProps): React.ReactElement {
  const colors = useTheme();
  const focusedPanel = useStore((s) => s.focusedPanel);
  const isFocused = focusedPanel === panelId;

  return (
    <Box flexDirection="column" borderStyle={isFocused ? 'bold' : 'single'} borderColor={isFocused ? colors.primary : colors.muted} flexGrow={1} overflow="hidden">
      <Box paddingX={1}>
        <Text bold={isFocused} color={isFocused ? colors.primary : colors.foreground}>{title}</Text>
        {badges && badges.length > 0 && <Box marginLeft={1}>{badges.map((b, i) => <Text key={i} color={colors.muted}>[{b}]</Text>)}</Box>}
      </Box>
      <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">{children}</Box>
    </Box>
  );
}
