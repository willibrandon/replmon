/**
 * SlotNameInput Component
 *
 * Input component for specifying a new slot name when creating slots.
 * Validates slot name format.
 *
 * Feature: 013-operations-modal
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';

// =============================================================================
// Types
// =============================================================================

export interface SlotNameInputProps {
  /** Current slot name value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when submit (Enter) */
  onSubmit: () => void;
  /** Callback when cancel (Esc) */
  onCancel: () => void;
  /** Slot type being created */
  slotType: 'logical' | 'physical';
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Get validation error message.
 */
function getValidationError(name: string): string | null {
  if (name.length === 0) {
    return 'Slot name is required';
  }
  if (!/^[a-z]/.test(name)) {
    return 'Slot name must start with a lowercase letter';
  }
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    return 'Slot name can only contain lowercase letters, numbers, and underscores';
  }
  if (name.length > 63) {
    return 'Slot name must be 63 characters or less';
  }
  return null;
}

// =============================================================================
// Component
// =============================================================================

export function SlotNameInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  slotType,
}: SlotNameInputProps): React.ReactElement {
  const colors = useTheme();
  const validationError = getValidationError(value);
  const isValid = validationError === null;

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      if (isValid) {
        onSubmit();
      }
      return;
    }

    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }

    // Only allow valid slot name characters
    if (!key.ctrl && !key.meta && input && input.length === 1) {
      // Convert to lowercase
      const char = input.toLowerCase();
      // Only allow a-z, 0-9, and underscore
      if (/^[a-z0-9_]$/.test(char)) {
        onChange(value + char);
      }
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color={colors.primary}>Create {slotType} Replication Slot</Text>

      <Box marginTop={1} flexDirection="column">
        <Text color={colors.muted}>Enter slot name:</Text>
        <Box
          borderStyle="single"
          borderColor={value.length > 0 ? (isValid ? colors.success : colors.critical) : colors.muted}
          paddingX={1}
          marginTop={1}
        >
          <Text color={colors.foreground}>
            {value}
            <Text color={colors.primary}>{'\u2588'}</Text>
          </Text>
        </Box>
      </Box>

      {validationError && value.length > 0 && (
        <Box marginTop={1}>
          <Text color={colors.critical}>{validationError}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={colors.muted} dimColor>
          Valid characters: a-z, 0-9, underscore (_)
        </Text>
      </Box>

      <Box marginTop={2}>
        {isValid ? (
          <>
            <Text color={colors.success}>[Enter]</Text>
            <Text color={colors.muted}> Create  </Text>
          </>
        ) : (
          <Text color={colors.muted}>[Enter valid name to create]  </Text>
        )}
        <Text color={colors.warning}>[Esc]</Text>
        <Text color={colors.muted}> Cancel</Text>
      </Box>
    </Box>
  );
}
