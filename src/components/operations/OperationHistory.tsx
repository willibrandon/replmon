/**
 * OperationHistory Component
 *
 * Displays session operation history with navigation.
 * Shows selected entry details when Enter is pressed.
 *
 * Feature: 013-operations-modal
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import type { OperationHistoryProps, OperationResult } from '../../types/operations.js';

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

/**
 * Format operation ID to display name.
 */
function formatOperationName(operationId: string): string {
  return operationId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// =============================================================================
// Detail View Component
// =============================================================================

function HistoryDetailView({
  entry,
  onClose,
}: {
  entry: OperationResult;
  onClose: () => void;
}): React.ReactElement {
  const colors = useTheme();
  const isSuccess = entry.status === 'success';

  useInput((_input, key) => {
    if (key.escape || key.return) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text color={isSuccess ? colors.success : colors.critical}>
          {getStatusIcon(entry.status)} {formatOperationName(entry.operationId)}
        </Text>
      </Box>

      <Box flexDirection="column">
        <Text color={colors.muted}>Target:</Text>
        <Box marginLeft={2}>
          <Text color={colors.foreground}>{entry.context.resourceName}</Text>
          <Text color={colors.muted}> @ </Text>
          <Text color={colors.foreground}>{entry.context.nodeName}</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color={colors.muted}>Message:</Text>
        <Box marginLeft={2}>
          <Text color={colors.foreground}>{entry.message}</Text>
        </Box>
      </Box>

      {entry.error && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.muted}>Error:</Text>
          <Box marginLeft={2}>
            <Text color={colors.critical}>{entry.error}</Text>
          </Box>
        </Box>
      )}

      {entry.remediationHint && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.muted}>Suggestion:</Text>
          <Box marginLeft={2}>
            <Text color={colors.warning}>{entry.remediationHint}</Text>
          </Box>
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        <Text color={colors.muted}>Timing:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text color={colors.foreground}>
            {entry.timestamp.toLocaleString()}
          </Text>
          <Text color={colors.foreground}>
            Duration: {entry.durationMs}ms
          </Text>
        </Box>
      </Box>

      <Box marginTop={2}>
        <Text color={colors.success}>[Enter/Esc]</Text>
        <Text color={colors.muted}> Close</Text>
      </Box>
    </Box>
  );
}

// =============================================================================
// Component
// =============================================================================

export function OperationHistory({
  history,
  selectedIndex,
  onSelectionChange,
}: OperationHistoryProps): React.ReactElement {
  const colors = useTheme();
  const [showDetail, setShowDetail] = useState(false);

  useInput((input, key) => {
    if (showDetail) {
      // Detail view handles its own input
      return;
    }

    if (input === 'j' || key.downArrow) {
      onSelectionChange(Math.min(selectedIndex + 1, history.length - 1));
      return;
    }

    if (input === 'k' || key.upArrow) {
      onSelectionChange(Math.max(selectedIndex - 1, 0));
      return;
    }

    if (key.return) {
      if (history[selectedIndex]) {
        setShowDetail(true);
      }
    }
  });

  if (history.length === 0) {
    return (
      <Box paddingY={1}>
        <Text color={colors.muted}>No operations in history.</Text>
      </Box>
    );
  }

  // Show detail view
  if (showDetail && history[selectedIndex]) {
    return (
      <HistoryDetailView
        entry={history[selectedIndex]}
        onClose={() => setShowDetail(false)}
      />
    );
  }

  return (
    <Box flexDirection="column">
      {history.map((entry, index) => {
        const isSelected = index === selectedIndex;
        const time = entry.timestamp.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const statusColor =
          entry.status === 'success'
            ? colors.success
            : entry.status === 'failure'
              ? colors.critical
              : colors.warning;

        return (
          <Box key={entry.id}>
            <Box width={3}>
              <Text color={isSelected ? colors.primary : colors.muted}>
                {isSelected ? '\u203a' : ' '}
              </Text>
            </Box>
            <Box width={10}>
              <Text color={colors.muted}>{time}</Text>
            </Box>
            <Box width={3}>
              <Text color={statusColor}>{getStatusIcon(entry.status)}</Text>
            </Box>
            <Box width={22}>
              <Text color={isSelected ? colors.foreground : colors.muted}>
                {formatOperationName(entry.operationId).slice(0, 20)}
              </Text>
            </Box>
            <Box flexGrow={1}>
              <Text color={colors.muted}>
                {entry.context.resourceName} @ {entry.context.nodeName}
              </Text>
            </Box>
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text color={colors.muted}>[j/k] Navigate  </Text>
        <Text color={colors.success}>[Enter]</Text>
        <Text color={colors.muted}> View details</Text>
      </Box>
    </Box>
  );
}
