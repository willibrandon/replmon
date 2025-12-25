/**
 * SlotsPanel Component
 *
 * Displays a consolidated list of all PostgreSQL replication slots
 * across connected nodes. Shows status indicators, WAL retention progress bars,
 * WAL status badges, and supports keyboard navigation with a detail modal.
 *
 * Feature: 010-slots-panel
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Badge } from '../atoms/Badge.js';
import { StatusDot } from '../atoms/StatusDot.js';
import { ProgressBar } from '../atoms/ProgressBar.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useSlots, type SlotListItem, type Severity } from '../../hooks/useSlots.js';
import type { Configuration } from '../../types/config.js';

// =============================================================================
// Props
// =============================================================================

export interface SlotsPanelProps {
  config: Configuration;
}

export interface SlotRowProps {
  item: SlotListItem;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get theme color for severity level.
 */
function getSeverityColor(
  severity: Severity | null,
  colors: ReturnType<typeof useTheme>
): string {
  if (severity === null) return colors.muted;
  switch (severity) {
    case 'healthy':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'critical':
      return colors.critical;
  }
}

// =============================================================================
// Internal Components
// =============================================================================

/**
 * Empty state when no slots exist.
 */
function EmptyState(): React.ReactElement {
  const colors = useTheme();
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Text color={colors.muted}>No replication slots found</Text>
      <Text color={colors.muted} dimColor>
        Create replication slots to see them here
      </Text>
    </Box>
  );
}

/**
 * Single slot row in the list.
 */
function SlotRow({ item }: SlotRowProps): React.ReactElement {
  const colors = useTheme();

  // Severity colors
  const retentionColor = getSeverityColor(item.retentionSeverity, colors);

  // Muted style for stale slots
  const dimColor = item.isStale;

  // Selection uses primary color highlighting
  const rowColor = item.isSelected ? colors.primary : colors.foreground;

  // Status variant based on active state
  const statusVariant = item.active ? 'success' : 'muted';

  return (
    <Box paddingX={1}>
      {/* Selection indicator */}
      <Box width={2}>
        <Text color={colors.primary}>{item.isSelected ? '›' : ' '}</Text>
      </Box>

      {/* Status indicator (active/inactive) */}
      <Box width={3}>
        <StatusDot variant={statusVariant} />
      </Box>

      {/* Slot name */}
      <Box width={20} marginRight={1}>
        <Text bold={item.isSelected} color={rowColor} dimColor={dimColor} wrap="truncate">
          {item.slotName}
        </Text>
      </Box>

      {/* Node name */}
      <Box width={14} marginRight={1}>
        <Text color={colors.muted} dimColor={dimColor} wrap="truncate">
          {item.nodeName}
        </Text>
      </Box>

      {/* Slot type badge */}
      <Box width={11} marginRight={1}>
        <Badge
          label={item.slotType}
          variant={item.slotType === 'logical' ? 'secondary' : 'muted'}
        />
      </Box>

      {/* Progress bar for retention */}
      <Box width={12} marginRight={1}>
        <ProgressBar
          percent={item.retentionPercent}
          width={8}
          showLabel={false}
          color={retentionColor}
        />
      </Box>

      {/* Formatted retention */}
      <Box width={10} marginRight={1} justifyContent="flex-end">
        <Text color={retentionColor} dimColor={dimColor}>
          {item.formattedRetention}
        </Text>
      </Box>

      {/* WAL status badge (PG13+, null for older versions) */}
      {item.walStatus !== null ? (
        <Box width={12}>
          <Badge
            label={item.walStatus}
            variant={
              item.walStatusSeverity === 'critical'
                ? 'critical'
                : item.walStatusSeverity === 'warning'
                  ? 'warning'
                  : 'success'
            }
          />
        </Box>
      ) : (
        <Box width={12}>
          <Text color={colors.muted} dimColor>-</Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Summary header with aggregated slot statistics.
 */
function SummaryHeader({
  count,
  activeCount,
  inactiveCount,
  criticalCount,
  warningCount,
  staleCount,
  formattedTotalRetention,
}: {
  count: number;
  activeCount: number;
  inactiveCount: number;
  criticalCount: number;
  warningCount: number;
  staleCount: number;
  formattedTotalRetention: string;
}): React.ReactElement {
  const colors = useTheme();

  const badges: React.ReactElement[] = [];

  // Active/inactive status
  if (activeCount > 0) {
    badges.push(<Badge key="active" label={`${activeCount} active`} variant="success" />);
  }
  if (inactiveCount > 0) {
    badges.push(<Badge key="inactive" label={`${inactiveCount} inactive`} variant="muted" />);
  }

  // Severity badges
  if (criticalCount > 0) {
    badges.push(<Badge key="critical" label={`${criticalCount} critical`} variant="critical" />);
  }
  if (warningCount > 0) {
    badges.push(<Badge key="warning" label={`${warningCount} warning`} variant="warning" />);
  }

  // Stale nodes badge
  if (staleCount > 0) {
    badges.push(<Badge key="stale" label={`${staleCount} stale`} variant="muted" />);
  }

  return (
    <Box marginBottom={1} gap={1}>
      <Text color={colors.muted}>
        {count} slot{count !== 1 ? 's' : ''}
      </Text>
      <Text color={colors.muted}>•</Text>
      <Text color={colors.muted}>{formattedTotalRetention}</Text>
      {badges}
    </Box>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * SlotsPanel displays all replication slots across connected nodes.
 *
 * Handles:
 * - Empty state (no slots)
 * - List of slots with status, retention, WAL status
 * - Selection highlighting
 * - Stale node indication
 * - Summary header with totals
 */
export function SlotsPanel({ config: _config }: SlotsPanelProps): React.ReactElement {
  const {
    items,
    count,
    activeCount,
    inactiveCount,
    criticalCount,
    warningCount,
    staleCount,
    formattedTotalRetention,
  } = useSlots();

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Summary header */}
      <SummaryHeader
        count={count}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        criticalCount={criticalCount}
        warningCount={warningCount}
        staleCount={staleCount}
        formattedTotalRetention={formattedTotalRetention}
      />

      {/* Slot list */}
      {count === 0 ? (
        <EmptyState />
      ) : (
        <Box flexDirection="column">
          {items.map((item) => (
            <SlotRow key={item.id} item={item} />
          ))}
        </Box>
      )}
    </Box>
  );
}
