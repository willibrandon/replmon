/**
 * OperationResult Component
 *
 * Displays the result of an operation execution.
 * Shows success/failure status, message, error details, and remediation hints.
 *
 * Feature: 013-operations-modal
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import type { OperationResultProps } from '../../types/operations.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get status icon for operation result.
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'success':
      return '\u2713'; // checkmark
    case 'failure':
      return '\u2717'; // x mark
    case 'timeout':
      return '\u23f1'; // stopwatch
    case 'cancelled':
      return '\u2298'; // circle with diagonal
    default:
      return '?';
  }
}

// =============================================================================
// Component
// =============================================================================

export function OperationResultDisplay({
  result,
  onDismiss,
}: OperationResultProps): React.ReactElement {
  const colors = useTheme();
  const isSuccess = result.status === 'success';

  useInput((_input, key) => {
    if (key.return || key.escape) {
      onDismiss();
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text color={isSuccess ? colors.success : colors.critical}>
          {getStatusIcon(result.status)} {isSuccess ? 'Operation Complete' : 'Operation Failed'}
        </Text>
      </Box>

      <Text color={colors.foreground}>{result.message}</Text>

      {result.error && (
        <Box marginTop={1}>
          <Text color={colors.critical}>Error: {result.error}</Text>
        </Box>
      )}

      {result.remediationHint && (
        <Box marginTop={1}>
          <Text color={colors.warning}>Suggestion: {result.remediationHint}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={colors.muted}>Duration: {result.durationMs}ms</Text>
      </Box>

      <Box marginTop={2}>
        <Text color={colors.success}>[Enter]</Text>
        <Text color={colors.muted}> Dismiss</Text>
      </Box>
    </Box>
  );
}
