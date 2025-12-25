/**
 * SubscriptionsPanel Component
 *
 * Displays a consolidated list of all PostgreSQL logical replication subscriptions
 * across connected nodes. Shows status indicators, lag metrics, LSN positions,
 * and supports keyboard navigation with a detail modal.
 *
 * Feature: 009-subscriptions-panel
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Badge } from '../atoms/Badge.js';
import { StatusDot } from '../atoms/StatusDot.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useSubscriptions, type SubscriptionListItem } from '../../hooks/useSubscriptions.js';
import { getLagColor } from '../../utils/topology.js';
import type { Configuration } from '../../types/config.js';

// =============================================================================
// Props
// =============================================================================

export interface SubscriptionsPanelProps {
  config: Configuration;
}

export interface SubscriptionRowProps {
  item: SubscriptionListItem;
  width?: number;
}

// =============================================================================
// Formatting Utilities
// =============================================================================

/**
 * Format bytes to human-readable string.
 *
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 KB", "2.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format duration in seconds to human-readable string.
 *
 * @param seconds - Duration in seconds (null if unavailable)
 * @returns Formatted string (e.g., "5s", "2m 30s", "-")
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// =============================================================================
// Internal Components
// =============================================================================

/**
 * Empty state when no subscriptions exist.
 */
function EmptyState(): React.ReactElement {
  const colors = useTheme();
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Text color={colors.muted}>No subscriptions found</Text>
      <Text color={colors.muted} dimColor>
        Configure logical replication to see subscriptions
      </Text>
    </Box>
  );
}

/**
 * Single subscription row in the list.
 */
function SubscriptionRow({ item }: SubscriptionRowProps): React.ReactElement {
  const colors = useTheme();

  // Lag color based on severity
  const lagColorKey = getLagColor(item.lagSeverity);
  const lagColor = colors[lagColorKey];

  // Muted style for stale subscriptions
  const dimColor = item.isStale;

  // Selection uses primary color highlighting
  const rowColor = item.isSelected ? colors.primary : colors.foreground;

  // Only show lag values if we have data
  const hasLagData = item.latestLag !== null;

  return (
    <Box paddingX={1}>
      {/* Selection indicator */}
      <Box width={2}>
        <Text color={colors.primary}>{item.isSelected ? '›' : ' '}</Text>
      </Box>

      {/* Status indicator */}
      <Box width={3}>
        <StatusDot variant={item.statusVariant} />
      </Box>

      {/* Subscription name */}
      <Box width={18} marginRight={1}>
        <Text bold={item.isSelected} color={rowColor} dimColor={dimColor} wrap="truncate">
          {item.subscriptionName}
        </Text>
      </Box>

      {/* Node name */}
      <Box width={16} marginRight={1}>
        <Text color={colors.muted} dimColor={dimColor} wrap="truncate">
          {item.nodeName}
        </Text>
      </Box>

      {/* Source badge */}
      <Box width={12} marginRight={1}>
        <Badge
          label={item.source}
          variant={item.source === 'pglogical' ? 'secondary' : 'muted'}
        />
      </Box>

      {/* Lag info - only show if we have data */}
      {hasLagData ? (
        <>
          <Box width={9} marginRight={1} justifyContent="flex-end">
            <Text color={lagColor} dimColor={dimColor}>
              {formatBytes(item.latestLag!.lagBytes)}
            </Text>
          </Box>
          <Box width={7} justifyContent="flex-end">
            <Text color={lagColor} dimColor={dimColor}>
              {formatDuration(item.latestLag!.lagSeconds)}
            </Text>
          </Box>
        </>
      ) : (
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={colors.muted} dimColor={dimColor}>no lag data</Text>
        </Box>
      )}
    </Box>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * SubscriptionsPanel displays all subscriptions across connected nodes.
 *
 * Handles:
 * - Empty state (no subscriptions)
 * - List of subscriptions with status, lag, LSN
 * - Selection highlighting
 * - Stale node indication
 */
export function SubscriptionsPanel({ config: _config }: SubscriptionsPanelProps): React.ReactElement {
  const colors = useTheme();
  const {
    items,
    count,
    criticalCount,
    warningCount,
    staleCount,
    pglogicalMode,
  } = useSubscriptions();

  // Header badges
  const badges: React.ReactElement[] = [];
  if (pglogicalMode) {
    badges.push(<Badge key="pglogical" label="pglogical" variant="secondary" />);
  }
  if (criticalCount > 0) {
    badges.push(<Badge key="critical" label={`${criticalCount} critical`} variant="critical" />);
  }
  if (warningCount > 0) {
    badges.push(<Badge key="warning" label={`${warningCount} warning`} variant="warning" />);
  }
  if (staleCount > 0) {
    badges.push(<Badge key="stale" label={`${staleCount} stale`} variant="muted" />);
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Summary header */}
      <Box marginBottom={1} gap={1}>
        <Text color={colors.muted}>
          {count} subscription{count !== 1 ? 's' : ''}
        </Text>
        {badges}
      </Box>

      {/* Subscription list */}
      {count === 0 ? (
        <EmptyState />
      ) : (
        <Box flexDirection="column">
          {items.map((item) => (
            <SubscriptionRow key={item.id} item={item} />
          ))}
        </Box>
      )}
    </Box>
  );
}
