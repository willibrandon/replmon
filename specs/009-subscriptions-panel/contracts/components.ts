/**
 * Component Contracts: Subscriptions Panel
 *
 * TypeScript interfaces defining component props and hook returns.
 * These contracts define the public API for all new components.
 *
 * Feature: 009-subscriptions-panel
 */

import type { Configuration } from '../../../src/types/config.js';
import type { SubscriptionData, LagSample } from '../../../src/store/types.js';
import type { StatusDotVariant } from '../../../src/components/atoms/StatusDot.js';

// =============================================================================
// Lag Severity Type
// =============================================================================

/**
 * Lag severity levels based on thresholds.
 * - normal: < 5 seconds
 * - warning: 5-30 seconds
 * - critical: > 30 seconds
 * - unknown: lag data unavailable
 */
export type LagSeverity = 'normal' | 'warning' | 'critical' | 'unknown';

// =============================================================================
// Hook Types
// =============================================================================

/**
 * A subscription item with derived display metadata.
 */
export interface SubscriptionListItem {
  /** Unique key: `${nodeId}:${subscriptionName}` */
  id: string;

  /** Raw subscription data from store */
  subscription: SubscriptionData;

  /** Node display name (from NodeInfo) */
  nodeName: string;

  /** Latest lag sample if available */
  latestLag: LagSample | null;

  /** StatusDot variant for status indicator */
  statusVariant: StatusDotVariant;

  /** Lag severity for color coding */
  lagSeverity: LagSeverity;

  /** Whether the subscription's node is stale */
  isStale: boolean;

  /** Whether this item is currently selected */
  isSelected: boolean;
}

/**
 * Return type for useSubscriptions hook.
 */
export interface UseSubscriptionsResult {
  /** All subscriptions as enriched list items */
  items: SubscriptionListItem[];

  /** Currently selected item (null if none) */
  selectedItem: SubscriptionListItem | null;

  /** Total subscription count */
  count: number;

  /** Count of subscriptions with critical lag (>30s) */
  criticalCount: number;

  /** Count of subscriptions with warning lag (5-30s) */
  warningCount: number;

  /** Count of subscriptions from stale nodes */
  staleCount: number;

  /** Whether any node has pglogical installed */
  pglogicalMode: boolean;
}

// =============================================================================
// Component Props
// =============================================================================

/**
 * Props for SubscriptionsPanel component.
 */
export interface SubscriptionsPanelProps {
  /** Application configuration */
  config: Configuration;
}

/**
 * Props for SubscriptionRow component (internal).
 */
export interface SubscriptionRowProps {
  /** Subscription list item to render */
  item: SubscriptionListItem;

  /** Available width for the row */
  width?: number;
}

/**
 * Props for SubscriptionDetailModal content.
 */
export interface SubscriptionDetailProps {
  /** Subscription data to display */
  subscription: SubscriptionData;

  /** Latest lag sample */
  latestLag: LagSample | null;

  /** Node display name */
  nodeName: string;
}

// =============================================================================
// Formatting Functions
// =============================================================================

/**
 * Format bytes to human-readable string.
 *
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 MB", "256 KB")
 *
 * @example
 * formatBytes(1536) // "1.5 KB"
 * formatBytes(2621440) // "2.5 MB"
 */
export type FormatBytesFn = (bytes: number) => string;

/**
 * Format duration in seconds to human-readable string.
 *
 * @param seconds - Duration in seconds (null if unavailable)
 * @returns Formatted string (e.g., "5s", "2m 30s", "-")
 *
 * @example
 * formatDuration(5) // "5s"
 * formatDuration(150) // "2m 30s"
 * formatDuration(null) // "-"
 */
export type FormatDurationFn = (seconds: number | null) => string;

/**
 * Map subscription status to StatusDot variant.
 *
 * @param status - Subscription status from SubscriptionData
 * @param enabled - Whether subscription is enabled
 * @returns StatusDot variant for rendering
 *
 * Mapping:
 * - replicating → success (●)
 * - catchup → warning (◐)
 * - initializing → connecting (◐)
 * - down → critical (●)
 * - unknown/disabled → muted (○)
 */
export type GetStatusVariantFn = (
  status: SubscriptionData['status'],
  enabled: boolean
) => StatusDotVariant;

/**
 * Get lag severity from seconds.
 *
 * @param lagSeconds - Lag in seconds (null if unavailable)
 * @returns Severity level for color coding
 *
 * Thresholds:
 * - normal: < 5s
 * - warning: 5-30s
 * - critical: > 30s
 * - unknown: null
 */
export type GetLagSeverityFn = (lagSeconds: number | null) => LagSeverity;
