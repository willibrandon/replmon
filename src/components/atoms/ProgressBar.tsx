import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';

export interface ProgressBarProps {
  percent: number;
  width?: number;
  showLabel?: boolean;
}

export function ProgressBar({ percent, width = 20, showLabel = true }: ProgressBarProps): React.ReactElement {
  const colors = useTheme();
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const filledCount = Math.round((clampedPercent / 100) * width);

  return (
    <Box>
      <Text color={colors.primary}>{'█'.repeat(filledCount)}</Text>
      <Text color={colors.muted}>{'░'.repeat(width - filledCount)}</Text>
      {showLabel && <Text color={colors.muted}> {clampedPercent.toFixed(0)}%</Text>}
    </Box>
  );
}
