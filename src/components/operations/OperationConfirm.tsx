/**
 * OperationConfirm Component
 *
 * Confirmation prompt for operations.
 * Supports simple yes/no confirmation and type-to-confirm for dangerous operations.
 *
 * Feature: 013-operations-modal
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import { Badge } from '../atoms/Badge.js';
import type { Severity, OperationConfirmProps } from '../../types/operations.js';

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

export function OperationConfirm({
  state,
  onInputChange,
  onConfirm,
  onCancel,
}: OperationConfirmProps): React.ReactElement {
  const colors = useTheme();
  const { operation, context, confirmationInput, isValid } = state;

  // Handle keyboard input for type-to-confirm
  useInput((inputChar, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      if (!operation.requiresTypeToConfirm || isValid) {
        onConfirm();
      }
      return;
    }

    // Type-to-confirm input handling
    if (operation.requiresTypeToConfirm) {
      if (key.backspace || key.delete) {
        onInputChange(confirmationInput.slice(0, -1));
      } else if (!key.ctrl && !key.meta && inputChar && inputChar.length === 1) {
        onInputChange(confirmationInput + inputChar);
      }
    }
  });

  // Render type-to-confirm variant
  if (operation.requiresTypeToConfirm) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Badge label={operation.severity} variant={getSeverityVariant(operation.severity)} />
          <Text bold color={colors.foreground}> {operation.name}</Text>
        </Box>

        <Text color={colors.foreground}>{operation.description}</Text>

        <Box marginTop={1}>
          <Text color={colors.muted}>Target: </Text>
          <Text color={colors.critical} bold>{context.resourceName}</Text>
          <Text color={colors.muted}> @ </Text>
          <Text color={colors.foreground}>{context.nodeName}</Text>
        </Box>

        <Box marginTop={2} flexDirection="column">
          <Text color={colors.warning}>Type the resource name to confirm:</Text>
          <Box
            borderStyle="single"
            borderColor={isValid ? colors.success : colors.muted}
            paddingX={1}
            marginTop={1}
          >
            <Text color={colors.foreground}>
              {confirmationInput}
              <Text color={colors.primary}>{'\u2588'}</Text>
            </Text>
          </Box>
        </Box>

        <Box marginTop={2}>
          {isValid ? (
            <>
              <Text color={colors.success}>[Enter]</Text>
              <Text color={colors.muted}> Confirm  </Text>
            </>
          ) : (
            <Text color={colors.muted}>[Type exact name to confirm]  </Text>
          )}
          <Text color={colors.warning}>[Esc]</Text>
          <Text color={colors.muted}> Cancel</Text>
        </Box>
      </Box>
    );
  }

  // Render simple confirmation variant
  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Badge label={operation.severity} variant={getSeverityVariant(operation.severity)} />
        <Text bold color={colors.foreground}> {operation.name}</Text>
      </Box>

      <Text color={colors.foreground}>{operation.description}</Text>

      <Box marginTop={1}>
        <Text color={colors.muted}>Target: </Text>
        <Text color={colors.foreground}>{context.resourceName}</Text>
        <Text color={colors.muted}> @ </Text>
        <Text color={colors.foreground}>{context.nodeName}</Text>
      </Box>

      <Box marginTop={2}>
        <Text color={colors.success}>[Enter]</Text>
        <Text color={colors.muted}> Confirm  </Text>
        <Text color={colors.warning}>[Esc]</Text>
        <Text color={colors.muted}> Cancel</Text>
      </Box>
    </Box>
  );
}
