import React from 'react';
import { Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'critical' | 'muted';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'muted' }: BadgeProps): React.ReactElement {
  const colors = useTheme();
  const color = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.secondary : variant === 'success' ? colors.success : variant === 'warning' ? colors.warning : variant === 'critical' ? colors.critical : colors.muted;
  return <Text color={color}>[{label}]</Text>;
}
