/**
 * Operations Modal Container Component
 *
 * Main modal for DBA operations. Displays context-sensitive operations list,
 * handles confirmation flows, and shows operation history.
 *
 * Feature: 013-operations-modal
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import { useOperations } from '../../hooks/useOperations.js';
import { Badge } from '../atoms/Badge.js';
import { PrometheusExport } from '../operations/PrometheusExport.js';
import type { Operation, Severity } from '../../types/operations.js';

// =============================================================================
// Types
// =============================================================================

export interface OperationsModalProps {
  onClose: () => void;
}

type Tab = 'operations' | 'history';

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
// Sub-components
// =============================================================================

/**
 * Operations list with j/k navigation.
 */
function OperationsList({
  operations,
  selectedIndex,
  disabled,
  context,
}: {
  operations: readonly Operation[];
  selectedIndex: number;
  disabled: boolean;
  context: { nodeName: string; resourceName: string } | null;
}): React.ReactElement {
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

      {/* Context display */}
      {context && (
        <Box marginTop={1} borderStyle="single" borderColor={colors.muted} paddingX={1}>
          <Text color={colors.muted}>
            Target: <Text color={colors.foreground}>{context.resourceName}</Text>
            {' @ '}
            <Text color={colors.foreground}>{context.nodeName}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Simple confirmation prompt.
 */
function SimpleConfirmation({
  operationName,
  resourceName,
  nodeName,
  severity,
  description,
}: {
  operationName: string;
  resourceName: string;
  nodeName: string;
  severity: Severity;
  description: string;
}): React.ReactElement {
  const colors = useTheme();

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Badge label={severity} variant={getSeverityVariant(severity)} />
        <Text bold color={colors.foreground}> {operationName}</Text>
      </Box>

      <Text color={colors.foreground}>
        {description}
      </Text>

      <Box marginTop={1}>
        <Text color={colors.muted}>Target: </Text>
        <Text color={colors.foreground}>{resourceName}</Text>
        <Text color={colors.muted}> @ </Text>
        <Text color={colors.foreground}>{nodeName}</Text>
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

/**
 * Type-to-confirm prompt for dangerous operations.
 */
function TypeToConfirm({
  operationName,
  resourceName,
  nodeName,
  severity,
  description,
  input,
  isValid,
  onInputChange,
}: {
  operationName: string;
  resourceName: string;
  nodeName: string;
  severity: Severity;
  description: string;
  input: string;
  isValid: boolean;
  onInputChange: (input: string) => void;
}): React.ReactElement {
  const colors = useTheme();

  useInput((inputChar, key) => {
    if (key.backspace || key.delete) {
      onInputChange(input.slice(0, -1));
    } else if (!key.ctrl && !key.meta && inputChar && inputChar.length === 1) {
      onInputChange(input + inputChar);
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Badge label={severity} variant={getSeverityVariant(severity)} />
        <Text bold color={colors.foreground}> {operationName}</Text>
      </Box>

      <Text color={colors.foreground}>
        {description}
      </Text>

      <Box marginTop={1}>
        <Text color={colors.muted}>Target: </Text>
        <Text color={colors.critical} bold>{resourceName}</Text>
        <Text color={colors.muted}> @ </Text>
        <Text color={colors.foreground}>{nodeName}</Text>
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text color={colors.warning}>
          Type the resource name to confirm:
        </Text>
        <Box
          borderStyle="single"
          borderColor={isValid ? colors.success : colors.muted}
          paddingX={1}
          marginTop={1}
        >
          <Text color={colors.foreground}>
            {input}
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

/**
 * Operation result display.
 */
function OperationResultDisplay({
  result,
  onDismiss,
}: {
  result: {
    status: string;
    message: string;
    error: string | null;
    remediationHint: string | null;
    durationMs: number;
  };
  onDismiss: () => void;
}): React.ReactElement {
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

/**
 * Operation history list.
 */
function HistoryList({
  history,
  selectedIndex,
}: {
  history: readonly {
    id: string;
    operationId: string;
    context: { resourceName: string; nodeName: string };
    status: string;
    timestamp: Date;
  }[];
  selectedIndex: number;
}): React.ReactElement {
  const colors = useTheme();

  if (history.length === 0) {
    return (
      <Box paddingY={1}>
        <Text color={colors.muted}>No operations in history.</Text>
      </Box>
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
            <Box flexGrow={1}>
              <Text color={isSelected ? colors.foreground : colors.muted}>
                {entry.operationId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
            </Box>
            <Box>
              <Text color={colors.muted}>
                {entry.context.resourceName} @ {entry.context.nodeName}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function OperationsModal({ onClose }: OperationsModalProps): React.ReactElement {
  const colors = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('operations');
  const [selectedOpIndex, setSelectedOpIndex] = useState(0);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);
  const [showingResult, setShowingResult] = useState<{
    status: string;
    message: string;
    error: string | null;
    remediationHint: string | null;
    durationMs: number;
  } | null>(null);
  const [showingMetrics, setShowingMetrics] = useState(false);

  const {
    availableOperations,
    history,
    confirmationState,
    isExecuting,
    currentContext,
    startOperation,
    executeOperation,
    updateConfirmInput,
    cancel,
    exportMetrics,
  } = useOperations();

  // Handle keyboard input
  useInput((input, key) => {
    // Handle metrics display dismissal
    if (showingMetrics) {
      if (key.escape) {
        setShowingMetrics(false);
      }
      // PrometheusExport component handles its own j/k scrolling
      return;
    }

    // Handle result dismissal
    if (showingResult) {
      if (key.return || key.escape) {
        setShowingResult(null);
      }
      return;
    }

    // Handle confirmation state
    if (confirmationState) {
      if (key.escape) {
        cancel();
        return;
      }
      if (key.return) {
        if (!confirmationState.operation.requiresTypeToConfirm || confirmationState.isValid) {
          executeOperation()
            .then((result) => {
              if (result) {
                setShowingResult({
                  status: result.status,
                  message: result.message,
                  error: result.error ?? null,
                  remediationHint: result.remediationHint ?? null,
                  durationMs: result.durationMs,
                });
              }
            })
            .catch((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
              setShowingResult({
                status: 'failure',
                message: 'Operation failed unexpectedly',
                error: errorMessage,
                remediationHint: null,
                durationMs: 0,
              });
            });
        }
        return;
      }
      // Type-to-confirm input is handled by TypeToConfirm component
      return;
    }

    // Handle modal close
    if (key.escape) {
      onClose();
      return;
    }

    // Handle tab switching
    if (key.tab) {
      setActiveTab((prev) => (prev === 'operations' ? 'history' : 'operations'));
      return;
    }

    // Handle navigation in operations list
    if (activeTab === 'operations') {
      if (input === 'j' || key.downArrow) {
        setSelectedOpIndex((prev) => Math.min(prev + 1, availableOperations.length - 1));
        return;
      }
      if (input === 'k' || key.upArrow) {
        setSelectedOpIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (key.return) {
        const selectedOp = availableOperations[selectedOpIndex];
        if (selectedOp && !isExecuting) {
          // Handle export-metrics specially - show the metrics view
          if (selectedOp.id === 'export-metrics') {
            setShowingMetrics(true);
            return;
          }
          startOperation(selectedOp);
        }
        return;
      }
    }

    // Handle navigation in history list
    if (activeTab === 'history') {
      if (input === 'j' || key.downArrow) {
        setSelectedHistoryIndex((prev) => Math.min(prev + 1, history.length - 1));
        return;
      }
      if (input === 'k' || key.upArrow) {
        setSelectedHistoryIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
    }
  });

  // Render Prometheus metrics export
  if (showingMetrics) {
    const metricsText = exportMetrics();
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        width="100%"
        height="100%"
      >
        <Box
          flexDirection="column"
          borderStyle="double"
          borderColor={colors.primary}
          paddingX={2}
          paddingY={1}
          minWidth={60}
        >
          <PrometheusExport
            metricsText={metricsText}
            onDismiss={() => setShowingMetrics(false)}
          />
        </Box>
      </Box>
    );
  }

  // Render confirmation flow
  if (confirmationState) {
    const { operation, context, confirmationInput, isValid } = confirmationState;

    if (operation.requiresTypeToConfirm) {
      return (
        <Box
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width="100%"
          height="100%"
        >
          <Box
            flexDirection="column"
            borderStyle="double"
            borderColor={colors.critical}
            paddingX={2}
            paddingY={1}
            minWidth={50}
          >
            <TypeToConfirm
              operationName={operation.name}
              resourceName={context.resourceName}
              nodeName={context.nodeName}
              severity={operation.severity}
              description={operation.description}
              input={confirmationInput}
              isValid={isValid}
              onInputChange={updateConfirmInput}
            />
          </Box>
        </Box>
      );
    }

    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        width="100%"
        height="100%"
      >
        <Box
          flexDirection="column"
          borderStyle="double"
          borderColor={colors.warning}
          paddingX={2}
          paddingY={1}
          minWidth={50}
        >
          <SimpleConfirmation
            operationName={operation.name}
            resourceName={context.resourceName}
            nodeName={context.nodeName}
            severity={operation.severity}
            description={operation.description}
          />
        </Box>
      </Box>
    );
  }

  // Render result display
  if (showingResult) {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        width="100%"
        height="100%"
      >
        <Box
          flexDirection="column"
          borderStyle="double"
          borderColor={showingResult.status === 'success' ? colors.success : colors.critical}
          paddingX={2}
          paddingY={1}
          minWidth={50}
        >
          <OperationResultDisplay
            result={showingResult}
            onDismiss={() => setShowingResult(null)}
          />
        </Box>
      </Box>
    );
  }

  // Render main modal
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
        minWidth={50}
      >
        {/* Header */}
        <Box marginBottom={1}>
          <Text bold color={colors.primary}>Operations</Text>
          <Box flexGrow={1} />
          <Text color={colors.muted}>[Esc]</Text>
        </Box>

        {/* Tabs */}
        <Box marginBottom={1}>
          <Text
            color={activeTab === 'operations' ? colors.primary : colors.muted}
            bold={activeTab === 'operations'}
          >
            [Operations]
          </Text>
          <Text color={colors.muted}>  </Text>
          <Text
            color={activeTab === 'history' ? colors.primary : colors.muted}
            bold={activeTab === 'history'}
          >
            [History]
          </Text>
        </Box>

        {/* Content */}
        {activeTab === 'operations' ? (
          <OperationsList
            operations={availableOperations}
            selectedIndex={selectedOpIndex}
            disabled={isExecuting}
            context={currentContext ? {
              nodeName: currentContext.nodeName,
              resourceName: currentContext.resourceName,
            } : null}
          />
        ) : (
          <HistoryList history={history} selectedIndex={selectedHistoryIndex} />
        )}

        {/* Footer */}
        <Box marginTop={1} borderStyle="single" borderColor={colors.muted} borderTop borderBottom={false} borderLeft={false} borderRight={false} paddingTop={1}>
          <Text color={colors.muted}>
            [j/k] Navigate  [Enter] Select  [Tab] Switch tab  [Esc] Close
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
