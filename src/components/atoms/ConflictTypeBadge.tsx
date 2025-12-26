/**
 * ConflictTypeBadge Component
 *
 * Displays a colored badge for conflict types.
 * Uses distinct colors to differentiate between conflict types.
 *
 * Feature: 012-conflicts-panel
 */

import React from 'react';
import { Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import type { ConflictType } from '../../types/conflicts.js';
import { CONFLICT_TYPE_LABELS } from '../../types/conflicts.js';

export interface ConflictTypeBadgeProps {
  type: ConflictType;
}

/**
 * Get badge color for conflict type.
 */
function getConflictTypeColor(type: ConflictType, colors: ReturnType<typeof useTheme>): string {
  switch (type) {
    case 'insert_insert':
      return colors.primary;
    case 'update_update':
      return colors.secondary;
    case 'update_delete':
      return colors.warning;
    case 'delete_delete':
      return colors.muted;
  }
}

export function ConflictTypeBadge({ type }: ConflictTypeBadgeProps): React.ReactElement {
  const colors = useTheme();
  const color = getConflictTypeColor(type, colors);
  const label = CONFLICT_TYPE_LABELS[type];

  return <Text color={color}>[{label}]</Text>;
}
