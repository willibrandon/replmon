/**
 * ConnectionLine Component
 *
 * Renders a connection line between nodes showing replication flow direction.
 * Supports unidirectional (→) and bidirectional (↔) arrows with optional lag display.
 *
 * Feature: 008-topology-panel
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import type { TopologyEdge, ReplicationType, EdgeDirection } from '../../types/topology.js';
import { formatLag, getLagSeverity, getLagColor } from '../../utils/topology.js';

export interface ConnectionLineProps {
  /** Edge data from topology selector */
  edge: TopologyEdge;
  /** Whether to show lag value on the line */
  showLag?: boolean;
  /** Width of the connection line in characters */
  width?: number;
  /** Orientation of the line */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Unicode characters for connection lines.
 */
const LINE_CHARS = {
  horizontal: '─',
  vertical: '│',
  rightArrow: '→',
  leftArrow: '←',
  bidirectional: '↔',
  downArrow: '↓',
  upArrow: '↑',
} as const;

/**
 * Get the arrow character based on direction.
 */
function getArrowChar(
  direction: EdgeDirection,
  orientation: 'horizontal' | 'vertical'
): string {
  if (direction === 'bidirectional') {
    return orientation === 'horizontal' ? LINE_CHARS.bidirectional : '↕';
  }
  return orientation === 'horizontal'
    ? LINE_CHARS.rightArrow
    : LINE_CHARS.downArrow;
}

/**
 * Get line style based on replication type.
 * Native uses solid line, pglogical uses dashed-style label.
 */
function getLineLabel(replicationType: ReplicationType): string | null {
  if (replicationType === 'pglogical') {
    return 'pgl';
  }
  return null;
}

/**
 * ConnectionLine displays the replication relationship between nodes.
 *
 * Features:
 * - Direction indicator (→ for unidirectional, ↔ for bidirectional)
 * - Optional lag value with severity color coding
 * - Replication type indicator (pgl for pglogical)
 */
export const ConnectionLine = React.memo(function ConnectionLine({
  edge,
  showLag = true,
  width = 12,
  orientation = 'horizontal',
}: ConnectionLineProps): React.ReactElement {
  const colors = useTheme();

  const arrowChar = getArrowChar(edge.direction, orientation);
  const lineLabel = getLineLabel(edge.replicationType);
  const lagSeverity = getLagSeverity(edge.lagSeconds);
  const lagColorKey = getLagColor(lagSeverity);
  const lagColor = colors[lagColorKey];

  // Build the line segments
  const lineChar =
    orientation === 'horizontal' ? LINE_CHARS.horizontal : LINE_CHARS.vertical;

  // Short lines on each side of arrow
  const sideLineLength = 3;
  const leftLine = lineChar.repeat(sideLineLength);
  const rightLine = lineChar.repeat(sideLineLength);

  if (orientation === 'vertical') {
    // Vertical layout: arrow on separate line
    return (
      <Box flexDirection="column" alignItems="center" height={3}>
        <Text color={colors.secondary}>{lineChar}</Text>
        <Box>
          <Text color={colors.secondary}>{arrowChar}</Text>
          {showLag && edge.lagSeconds !== null && (
            <Text color={lagColor}> {formatLag(edge.lagSeconds)}</Text>
          )}
          {lineLabel && (
            <Text color={colors.muted} dimColor>
              {' '}
              {lineLabel}
            </Text>
          )}
        </Box>
        <Text color={colors.secondary}>{lineChar}</Text>
      </Box>
    );
  }

  // Horizontal layout
  return (
    <Box flexDirection="column" alignItems="center" width={width}>
      {/* Main line with arrow in center */}
      <Box>
        <Text color={colors.secondary}>
          {leftLine} {arrowChar} {rightLine}
        </Text>
      </Box>

      {/* Lag value and/or type label below the line */}
      {(showLag || lineLabel) && (
        <Box>
          {showLag && edge.lagSeconds !== null && (
            <Text color={lagColor}>{formatLag(edge.lagSeconds)}</Text>
          )}
          {showLag && edge.lagSeconds !== null && lineLabel && (
            <Text color={colors.muted}> </Text>
          )}
          {lineLabel && (
            <Text color={colors.muted} dimColor>
              {lineLabel}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
});
