/**
 * SourceBadge Component
 *
 * Displays a colored badge for conflict data sources.
 * Indicates whether conflicts came from history table or log parsing.
 *
 * Feature: 012-conflicts-panel
 */

import React from 'react';
import { Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import type { ConflictSource } from '../../types/conflicts.js';
import { SOURCE_LABELS } from '../../types/conflicts.js';

export interface SourceBadgeProps {
  source: ConflictSource;
}

/**
 * Get badge color for source type.
 */
function getSourceColor(source: ConflictSource, colors: ReturnType<typeof useTheme>): string {
  switch (source) {
    case 'history':
      return colors.success;
    case 'log':
      return colors.secondary;
    case 'unavailable':
      return colors.critical;
  }
}

export function SourceBadge({ source }: SourceBadgeProps): React.ReactElement {
  const colors = useTheme();
  const color = getSourceColor(source, colors);
  const label = SOURCE_LABELS[source];

  return <Text color={color}>[{label}]</Text>;
}
