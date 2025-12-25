import React from 'react';
import { Box } from 'ink';
import { useBreakpoint } from '../../hooks/useBreakpoint.js';

export interface SplitViewProps {
  direction: 'horizontal' | 'vertical';
  ratio?: number;
  children: [React.ReactNode, React.ReactNode];
}

export function SplitView({ direction, ratio = 0.5, children }: SplitViewProps): React.ReactElement {
  const breakpoint = useBreakpoint();
  const isStacked = breakpoint === 'compact' || breakpoint === 'narrow';
  const effectiveDirection = isStacked ? 'column' : (direction === 'horizontal' ? 'row' : 'column');

  return (
    <Box flexDirection={effectiveDirection} width="100%" height="100%">
      <Box flexGrow={ratio}>{children[0]}</Box>
      <Box flexGrow={1 - ratio}>{children[1]}</Box>
    </Box>
  );
}
