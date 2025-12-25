import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';

export interface HeaderProps {
  title?: string;
  showPglogicalBadge?: boolean;
  statusIndicators?: React.ReactNode;
}

export function Header({ title = 'replmon', showPglogicalBadge = false, statusIndicators }: HeaderProps): React.ReactElement {
  const colors = useTheme();
  return (
    <Box borderStyle="single" borderBottom={true} borderTop={false} borderLeft={false} borderRight={false} borderColor={colors.muted} paddingX={1}>
      <Box flexGrow={1}>
        <Text bold color={colors.primary}>{title}</Text>
        {showPglogicalBadge && <Box marginLeft={1}><Text color={colors.secondary}>[pglogical]</Text></Box>}
      </Box>
      {statusIndicators && <Box>{statusIndicators}</Box>}
    </Box>
  );
}
