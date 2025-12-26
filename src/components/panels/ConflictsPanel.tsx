/**
 * ConflictsPanel Component
 *
 * Displays a consolidated list of all pglogical replication conflicts
 * across connected nodes. Shows conflict type badges, table names,
 * resolutions, timestamps, and supports keyboard navigation.
 *
 * Feature: 012-conflicts-panel
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Badge } from '../atoms/Badge.js';
import { ConflictTypeBadge } from '../atoms/ConflictTypeBadge.js';
import { ResolutionBadge } from '../atoms/ResolutionBadge.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useConflicts, type ConflictListItem } from '../../hooks/useConflicts.js';
import type { Configuration } from '../../types/config.js';

// =============================================================================
// Props
// =============================================================================

export interface ConflictsPanelProps {
  config: Configuration;
}

export interface ConflictRowProps {
  item: ConflictListItem;
}

// =============================================================================
// Internal Components
// =============================================================================

/**
 * Empty state when no conflicts exist.
 */
function EmptyState(): React.ReactElement {
  const colors = useTheme();
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Text color={colors.success}>No replication conflicts detected</Text>
      <Text color={colors.muted} dimColor>
        Conflicts will appear here when detected
      </Text>
    </Box>
  );
}

/**
 * Unavailable state when conflict data source is not available.
 */
function UnavailableState(): React.ReactElement {
  const colors = useTheme();
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Text color={colors.warning}>Conflict monitoring unavailable</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text color={colors.muted} dimColor>
          To enable conflict monitoring:
        </Text>
        <Text color={colors.muted} dimColor>
          1. Enable pglogical.conflict_history_enabled = on
        </Text>
        <Text color={colors.muted} dimColor>
          2. Or configure log_config in replmon.yaml
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Single conflict row in the list.
 */
function ConflictRow({ item }: ConflictRowProps): React.ReactElement {
  const colors = useTheme();

  // Muted style for stale conflicts
  const dimColor = item.isStale;

  // Selection uses primary color highlighting
  const rowColor = item.isSelected ? colors.primary : colors.foreground;

  return (
    <Box paddingX={1}>
      {/* Selection indicator */}
      <Box width={2}>
        <Text color={colors.primary}>{item.isSelected ? '›' : ' '}</Text>
      </Box>

      {/* Conflict type badge */}
      <Box width={10} marginRight={1}>
        <ConflictTypeBadge type={item.conflictType} />
      </Box>

      {/* Table name (qualified) */}
      <Box width={25} marginRight={1}>
        <Text bold={item.isSelected} color={rowColor} dimColor={dimColor} wrap="truncate">
          {item.qualifiedTable}
        </Text>
      </Box>

      {/* Resolution badge */}
      <Box width={10} marginRight={1}>
        <ResolutionBadge resolution={item.resolution} />
      </Box>

      {/* Relative time */}
      <Box width={10} marginRight={1}>
        <Text color={colors.muted} dimColor={dimColor}>
          {item.formattedTime}
        </Text>
      </Box>

      {/* Node name */}
      <Box width={14}>
        <Text color={colors.muted} dimColor={dimColor} wrap="truncate">
          {item.nodeName}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Summary header with aggregated conflict statistics.
 */
function SummaryHeader({
  total,
  lastHour,
  last24h,
  historyCount,
  logCount,
  unavailableCount,
  staleCount,
}: {
  total: number;
  lastHour: number;
  last24h: number;
  historyCount: number;
  logCount: number;
  unavailableCount: number;
  staleCount: number;
}): React.ReactElement {
  const colors = useTheme();

  const badges: React.ReactElement[] = [];

  // Time-based counts
  if (lastHour > 0) {
    badges.push(<Badge key="last-hour" label={`${lastHour} last hour`} variant="warning" />);
  }
  if (last24h > lastHour && last24h > 0) {
    badges.push(<Badge key="last-24h" label={`${last24h} last 24h`} variant="muted" />);
  }

  // Source indicators
  if (historyCount > 0) {
    badges.push(<Badge key="history" label={`${historyCount} history`} variant="success" />);
  }
  if (logCount > 0) {
    badges.push(<Badge key="log" label={`${logCount} log`} variant="secondary" />);
  }
  if (unavailableCount > 0) {
    badges.push(<Badge key="unavailable" label={`${unavailableCount} n/a`} variant="muted" />);
  }

  // Stale conflicts badge
  if (staleCount > 0) {
    badges.push(<Badge key="stale" label={`${staleCount} stale`} variant="muted" />);
  }

  return (
    <Box marginBottom={1} gap={1}>
      <Text color={total > 0 ? colors.warning : colors.success}>
        {total} conflict{total !== 1 ? 's' : ''}
      </Text>
      {badges}
    </Box>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ConflictsPanel displays all replication conflicts across connected nodes.
 *
 * Handles:
 * - Empty state (no conflicts)
 * - List of conflicts with type, table, resolution, time, node
 * - Selection highlighting
 * - Stale node indication
 * - Summary header with totals and time breakdowns
 */
export function ConflictsPanel({ config: _config }: ConflictsPanelProps): React.ReactElement {
  const {
    items,
    count,
    summary,
    historySourceCount,
    logSourceCount,
    unavailableSourceCount,
    staleCount,
  } = useConflicts();

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Summary header */}
      <SummaryHeader
        total={count}
        lastHour={summary.lastHour}
        last24h={summary.last24h}
        historyCount={historySourceCount}
        logCount={logSourceCount}
        unavailableCount={unavailableSourceCount}
        staleCount={staleCount}
      />

      {/* Conflict list */}
      {unavailableSourceCount > 0 && historySourceCount === 0 && logSourceCount === 0 ? (
        <UnavailableState />
      ) : count === 0 ? (
        <EmptyState />
      ) : (
        <Box flexDirection="column">
          {items.map((item) => (
            <ConflictRow key={item.id} item={item} />
          ))}
        </Box>
      )}
    </Box>
  );
}
