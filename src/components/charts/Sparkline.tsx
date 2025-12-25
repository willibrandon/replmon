/**
 * Sparkline Component
 *
 * Renders a sparkline chart using Unicode block characters for
 * visualizing replication lag trends over time.
 *
 * Feature: 011-lag-visualization
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import { Badge } from '../atoms/Badge.js';
import type { LagSample } from '../../store/types.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Unicode block characters for sparkline rendering.
 * 9 levels: index 0 = empty (space), index 8 = full block.
 */
const BLOCK_CHARS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;

/**
 * Minimum sparkline width in characters.
 */
const MIN_WIDTH = 10;

/**
 * Maximum sparkline width in characters.
 */
const MAX_WIDTH = 60;

/**
 * Default sparkline width in characters.
 */
const DEFAULT_WIDTH = 40;

// =============================================================================
// Types
// =============================================================================

export interface SparklineProps {
  /** Lag samples to visualize (time-ordered, oldest first) */
  samples: LagSample[];

  /** Chart width in characters (default: 40, clamped to 10-60) */
  width?: number;

  /** Whether to prefer lagSeconds over lagBytes (default: true) */
  preferSeconds?: boolean;

  /** Whether the data source is stale (default: false) */
  isStale?: boolean;
}

/**
 * Internal state for rendering the sparkline.
 */
interface SparklineState {
  /** Normalized values (0-1) for each display column */
  bars: number[];

  /** Maximum value in the visible window */
  maxValue: number;

  /** Whether data uses seconds (true) or bytes (false) */
  usesSeconds: boolean;

  /** Number of samples in the data */
  sampleCount: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract value from a LagSample, preferring seconds if available.
 */
function extractValue(sample: LagSample, preferSeconds: boolean): number {
  if (preferSeconds && sample.lagSeconds !== null) {
    return sample.lagSeconds;
  }
  return sample.lagBytes;
}

/**
 * Check if any sample has lagSeconds available.
 */
function hasSecondsData(samples: LagSample[]): boolean {
  return samples.some((s) => s.lagSeconds !== null);
}

/**
 * Resample data to fit target width using bucket averaging.
 */
function resampleData(
  samples: LagSample[],
  targetWidth: number,
  preferSeconds: boolean
): number[] {
  if (samples.length === 0) return [];

  if (samples.length <= targetWidth) {
    // No downsampling needed, return values directly
    return samples.map((s) => extractValue(s, preferSeconds));
  }

  // Downsample: average each bucket
  const bucketSize = samples.length / targetWidth;
  const result: number[] = [];

  for (let i = 0; i < targetWidth; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    const bucket = samples.slice(start, end);

    if (bucket.length === 0) {
      result.push(0);
    } else {
      const sum = bucket.reduce(
        (acc, s) => acc + extractValue(s, preferSeconds),
        0
      );
      result.push(sum / bucket.length);
    }
  }

  return result;
}

/**
 * Normalize values to 0-1 range using linear scaling.
 * Returns normalized values and the max used for scaling.
 */
function normalizeValues(values: number[]): { normalized: number[]; max: number } {
  if (values.length === 0) {
    return { normalized: [], max: 0 };
  }

  const max = Math.max(...values);

  // Handle all-zero case (flat line at bottom)
  if (max === 0) {
    return { normalized: values.map(() => 0), max: 0 };
  }

  return {
    normalized: values.map((v) => v / max),
    max,
  };
}

/**
 * Convert a normalized value (0-1) to a block character.
 */
function valueToBlock(normalizedValue: number): string {
  // Clamp to 0-1 range
  const clamped = Math.max(0, Math.min(1, normalizedValue));
  // Map to index 0-8
  const index = Math.round(clamped * 8);
  return BLOCK_CHARS[index] ?? ' ';
}

/**
 * Clamp width to valid range.
 */
function clampWidth(width: number): number {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.floor(width)));
}

/**
 * Format the max value label for display.
 */
function formatMaxLabel(maxValue: number, usesSeconds: boolean): string {
  if (usesSeconds) {
    if (maxValue < 60) {
      return `max: ${maxValue.toFixed(1)}s`;
    }
    return `max: ${(maxValue / 60).toFixed(1)}m`;
  }

  // Format bytes
  if (maxValue < 1024) {
    return `max: ${Math.round(maxValue)}B`;
  }
  if (maxValue < 1024 * 1024) {
    return `max: ${(maxValue / 1024).toFixed(1)}KB`;
  }
  if (maxValue < 1024 * 1024 * 1024) {
    return `max: ${(maxValue / (1024 * 1024)).toFixed(1)}MB`;
  }
  return `max: ${(maxValue / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

/**
 * Get time axis labels based on sample count.
 * Assumes 1 sample per second.
 */
function getTimeAxisLabels(sampleCount: number): { left: string; right: string } {
  const secondsOfData = sampleCount;

  if (secondsOfData >= 300) {
    return { left: '-5m', right: 'now' };
  }
  if (secondsOfData >= 60) {
    const minutes = Math.floor(secondsOfData / 60);
    return { left: `-${minutes}m`, right: 'now' };
  }
  return { left: `-${secondsOfData}s`, right: 'now' };
}

/**
 * Compute sparkline state from samples.
 */
function computeSparklineState(
  samples: LagSample[],
  width: number,
  preferSeconds: boolean
): SparklineState {
  const clampedWidth = clampWidth(width);
  const usesSeconds = preferSeconds && hasSecondsData(samples);

  // Resample to fit width
  const resampled = resampleData(samples, clampedWidth, usesSeconds);

  // Normalize to 0-1
  const { normalized, max } = normalizeValues(resampled);

  return {
    bars: normalized,
    maxValue: max,
    usesSeconds,
    sampleCount: samples.length,
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Sparkline chart component for visualizing lag trends.
 *
 * Renders:
 * - Unicode block characters (▁▂▃▄▅▆▇█) for data visualization
 * - Y-axis max indicator (e.g., "max: 5.2s")
 * - Time axis labels (e.g., "-5m" to "now")
 * - Empty state placeholder when no data
 * - Stale badge when data source is disconnected
 */
export function Sparkline({
  samples,
  width = DEFAULT_WIDTH,
  preferSeconds = true,
  isStale = false,
}: SparklineProps): React.ReactElement {
  const colors = useTheme();

  // Handle empty state
  if (samples.length === 0) {
    return (
      <Box flexDirection="column">
        <Box gap={1}>
          <Text color={colors.muted}>Lag Trend</Text>
          {isStale && <Badge label="stale" variant="warning" />}
        </Box>
        <Text color={colors.muted}>No lag data available</Text>
      </Box>
    );
  }

  // Compute sparkline state
  const state = computeSparklineState(samples, width, preferSeconds);
  const timeLabels = getTimeAxisLabels(state.sampleCount);

  // Build the sparkline string
  const sparklineChars = state.bars.map((v) => valueToBlock(v)).join('');

  // Format max label
  const maxLabel =
    state.maxValue === 0
      ? 'max: 0'
      : formatMaxLabel(state.maxValue, state.usesSeconds);

  return (
    <Box flexDirection="column">
      {/* Header with title, max indicator, and stale badge */}
      <Box gap={1}>
        <Text color={colors.muted}>Lag Trend</Text>
        <Text color={colors.muted}>({maxLabel})</Text>
        {isStale && <Badge label="stale" variant="warning" />}
      </Box>

      {/* Sparkline bars */}
      <Text color={isStale ? colors.muted : colors.primary}>{sparklineChars}</Text>

      {/* Time axis labels */}
      <Box>
        <Text color={colors.muted}>{timeLabels.left}</Text>
        <Box flexGrow={1} />
        <Text color={colors.muted}>{timeLabels.right}</Text>
      </Box>
    </Box>
  );
}
