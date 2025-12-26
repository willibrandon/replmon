/**
 * ResolutionBadge Component
 *
 * Displays a colored badge for conflict resolutions.
 * Uses semantic colors to indicate the resolution outcome.
 *
 * Feature: 012-conflicts-panel
 */

import React from 'react';
import { Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import type { ConflictResolution } from '../../types/conflicts.js';
import { RESOLUTION_LABELS } from '../../types/conflicts.js';

export interface ResolutionBadgeProps {
  resolution: ConflictResolution;
}

/**
 * Get badge color for resolution type.
 */
function getResolutionColor(resolution: ConflictResolution, colors: ReturnType<typeof useTheme>): string {
  switch (resolution) {
    case 'apply_remote':
      return colors.success;
    case 'keep_local':
      return colors.warning;
    case 'skip':
      return colors.muted;
  }
}

export function ResolutionBadge({ resolution }: ResolutionBadgeProps): React.ReactElement {
  const colors = useTheme();
  const color = getResolutionColor(resolution, colors);
  const label = RESOLUTION_LABELS[resolution];

  return <Text color={color}>[{label}]</Text>;
}
