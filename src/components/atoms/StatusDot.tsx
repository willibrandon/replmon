import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';

export type StatusDotVariant = 'success' | 'warning' | 'critical' | 'muted' | 'connecting';

export interface StatusDotProps {
  variant: StatusDotVariant;
  label?: string;
}

export function StatusDot({ variant, label }: StatusDotProps): React.ReactElement {
  const colors = useTheme();
  const symbol = variant === 'success' || variant === 'critical' ? '●' : variant === 'muted' ? '○' : '◐';
  const color = variant === 'success' ? colors.success : variant === 'critical' ? colors.critical : variant === 'warning' || variant === 'connecting' ? colors.warning : colors.muted;

  return (
    <Box>
      <Text color={color}>{symbol}</Text>
      {label && <Text color={colors.foreground}> {label}</Text>}
    </Box>
  );
}
