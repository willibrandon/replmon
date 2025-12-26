/**
 * PrometheusExport Component
 *
 * Displays Prometheus metrics in a scrollable modal.
 * Supports file export option.
 *
 * Feature: 013-operations-modal
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import type { PrometheusExportProps } from '../../types/operations.js';

export function PrometheusExport({
  metricsText,
  onDismiss,
  onExportToFile,
}: PrometheusExportProps): React.ReactElement {
  const colors = useTheme();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showFileInput, setShowFileInput] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const lines = metricsText.split('\n');
  const visibleLines = 15; // Number of lines to show at once

  useInput((input, key) => {
    if (showFileInput) {
      if (key.escape) {
        setShowFileInput(false);
        setFilePath('');
        return;
      }

      if (key.return) {
        if (filePath && onExportToFile) {
          try {
            onExportToFile(filePath);
            setExportStatus('success');
            setTimeout(() => {
              setShowFileInput(false);
              setFilePath('');
              setExportStatus('idle');
            }, 2000);
          } catch {
            setExportStatus('error');
          }
        }
        return;
      }

      if (key.backspace || key.delete) {
        setFilePath(filePath.slice(0, -1));
        return;
      }

      if (!key.ctrl && !key.meta && input && input.length === 1) {
        setFilePath(filePath + input);
        return;
      }
      return;
    }

    if (key.escape) {
      onDismiss();
      return;
    }

    if (input === 'j' || key.downArrow) {
      setScrollOffset((prev) => Math.min(prev + 1, Math.max(0, lines.length - visibleLines)));
      return;
    }

    if (input === 'k' || key.upArrow) {
      setScrollOffset((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (input === 'f' && onExportToFile) {
      setShowFileInput(true);
      return;
    }
  });

  // File input mode
  if (showFileInput) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color={colors.primary}>Export to File</Text>

        <Box marginTop={1} flexDirection="column">
          <Text color={colors.muted}>Enter file path:</Text>
          <Box
            borderStyle="single"
            borderColor={colors.primary}
            paddingX={1}
            marginTop={1}
          >
            <Text color={colors.foreground}>
              {filePath}
              <Text color={colors.primary}>{'\u2588'}</Text>
            </Text>
          </Box>
        </Box>

        {exportStatus === 'success' && (
          <Box marginTop={1}>
            <Text color={colors.success}>File exported successfully!</Text>
          </Box>
        )}

        {exportStatus === 'error' && (
          <Box marginTop={1}>
            <Text color={colors.critical}>Failed to export file.</Text>
          </Box>
        )}

        <Box marginTop={2}>
          <Text color={colors.success}>[Enter]</Text>
          <Text color={colors.muted}> Save  </Text>
          <Text color={colors.warning}>[Esc]</Text>
          <Text color={colors.muted}> Cancel</Text>
        </Box>
      </Box>
    );
  }

  // Metrics display
  const visibleContent = lines.slice(scrollOffset, scrollOffset + visibleLines);
  const hasMore = lines.length > visibleLines;
  const scrollPercent = lines.length <= visibleLines
    ? 100
    : Math.round((scrollOffset / (lines.length - visibleLines)) * 100);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>Prometheus Metrics</Text>
        {hasMore && (
          <Text color={colors.muted}> ({scrollPercent}%)</Text>
        )}
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={colors.muted}
        paddingX={1}
        height={visibleLines + 2}
      >
        {visibleContent.map((line, index) => (
          <Text
            key={index}
            color={
              line.startsWith('# HELP')
                ? colors.muted
                : line.startsWith('# TYPE')
                  ? colors.secondary
                  : colors.foreground
            }
          >
            {line || ' '}
          </Text>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color={colors.muted}>[j/k] Scroll  </Text>
        {onExportToFile && (
          <>
            <Text color={colors.primary}>[f]</Text>
            <Text color={colors.muted}> Export to file  </Text>
          </>
        )}
        <Text color={colors.warning}>[Esc]</Text>
        <Text color={colors.muted}> Close</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={colors.muted} dimColor>
          Tip: Copy text from terminal to use with Prometheus
        </Text>
      </Box>
    </Box>
  );
}
