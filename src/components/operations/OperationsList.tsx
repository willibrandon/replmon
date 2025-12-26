/**
 * OperationsList Component
 *
 * Displays available operations with j/k navigation.
 * Shows severity badges and groups by category with separators.
 *
 * Feature: 013-operations-modal
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import { Badge } from '../atoms/Badge.js';
import type { Severity, OperationsListProps } from '../../types/operations.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get badge variant for severity level.
 */
function getSeverityVariant(severity: Severity): 'success' | 'warning' | 'critical' {
  switch (severity) {
    case 'info':
      return 'success';
    case 'warning':
      return 'warning';
    case 'danger':
      return 'critical';
  }
}

// =============================================================================
// Component
// =============================================================================

export function OperationsList({
  operations,
  selectedIndex,
  disabled,
}: Omit<OperationsListProps, 'onSelectionChange' | 'onOperationSelect'>): React.ReactElement {
  const colors = useTheme();

  if (operations.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={colors.muted}>No operations available for this context.</Text>
      </Box>
    );
  }

  // Group operations by category with separators
  let lastCategory: string | null = null;

  return (
    <Box flexDirection="column">
      {operations.map((op, index) => {
        const isSelected = index === selectedIndex;
        const showSeparator = lastCategory !== null && op.category !== lastCategory;
        lastCategory = op.category;

        return (
          <React.Fragment key={op.id}>
            {showSeparator && (
              <Box marginY={0}>
                <Text color={colors.muted}>{'\u2500'.repeat(40)}</Text>
              </Box>
            )}
            <Box>
              <Box width={3}>
                <Text color={isSelected ? colors.primary : colors.muted}>
                  {isSelected ? '\u203a' : ' '}
                </Text>
              </Box>
              <Box flexGrow={1}>
                <Text
                  color={disabled ? colors.muted : isSelected ? colors.foreground : colors.muted}
                  bold={isSelected}
                >
                  {op.name}
                </Text>
              </Box>
              <Box marginLeft={2}>
                <Badge label={op.severity} variant={getSeverityVariant(op.severity)} />
              </Box>
            </Box>
          </React.Fragment>
        );
      })}
    </Box>
  );
}
