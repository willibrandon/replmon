/**
 * TableSelector Component
 *
 * Allows selecting a table within a subscription for resync operation.
 * Uses j/k navigation.
 *
 * Feature: 013-operations-modal
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import type { TableSelectorProps } from '../../types/operations.js';

export function TableSelector({
  tables,
  selectedIndex,
  onSelectionChange,
  onTableSelect,
  onBack,
}: TableSelectorProps): React.ReactElement {
  const colors = useTheme();

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    if (input === 'j' || key.downArrow) {
      onSelectionChange(Math.min(selectedIndex + 1, tables.length - 1));
      return;
    }

    if (input === 'k' || key.upArrow) {
      onSelectionChange(Math.max(selectedIndex - 1, 0));
      return;
    }

    if (key.return) {
      const selectedTable = tables[selectedIndex];
      if (selectedTable) {
        onTableSelect(selectedTable);
      }
    }
  });

  if (tables.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={colors.muted}>No tables found in this subscription.</Text>
        <Box marginTop={1}>
          <Text color={colors.warning}>[Esc]</Text>
          <Text color={colors.muted}> Back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color={colors.primary}>Select Table to Resync</Text>
      <Text color={colors.critical}>
        Warning: Selected table will be TRUNCATED and re-copied
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {tables.map((table, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={table}>
              <Box width={3}>
                <Text color={isSelected ? colors.primary : colors.muted}>
                  {isSelected ? '\u203a' : ' '}
                </Text>
              </Box>
              <Text
                color={isSelected ? colors.foreground : colors.muted}
                bold={isSelected}
              >
                {table}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text color={colors.muted}>[j/k] Navigate  </Text>
        <Text color={colors.success}>[Enter]</Text>
        <Text color={colors.muted}> Select  </Text>
        <Text color={colors.warning}>[Esc]</Text>
        <Text color={colors.muted}> Back</Text>
      </Box>
    </Box>
  );
}
