/**
 * Subscriptions Data Hook
 *
 * Aggregates subscription data from store for SubscriptionsPanel.
 * Derives enriched list items with status variants, lag severity, and selection state.
 *
 * Feature: 009-subscriptions-panel
 */

import { useMemo } from 'react';
import { useStore } from '../store/index.js';
import { useConnectionStore } from '../store/connection.js';
import { getLagSeverity } from '../utils/topology.js';
import type { StatusDotVariant } from '../components/atoms/StatusDot.js';
import type { LagSample, SubscriptionStatus } from '../store/types.js';
import type { LagSeverity } from '../types/topology.js';

// =============================================================================
// Types
// =============================================================================

/**
 * A subscription item with derived display metadata.
 */
export interface SubscriptionListItem {
  /** Unique key: `${nodeId}:${subscriptionName}` */
  id: string;

  /** Node ID the subscription belongs to */
  nodeId: string;

  /** Subscription name */
  subscriptionName: string;

  /** Whether subscription is enabled */
  enabled: boolean;

  /** Current operational status */
  status: SubscriptionStatus;

  /** Native or pglogical */
  source: 'native' | 'pglogical';

  /** Provider node name (pglogical) */
  providerNode: string | null;

  /** Provider host (pglogical) */
  providerHost: string | null;

  /** Provider port (pglogical) */
  providerPort: number | null;

  /** Associated replication slot */
  slotName: string | null;

  /** Last received LSN */
  receivedLsn: string | null;

  /** Latest processed LSN */
  latestEndLsn: string | null;

  /** Replication sets (pglogical) */
  replicationSets: string[];

  /** Last message timestamp */
  lastMessageTime: Date | null;

  /** Apply worker PID */
  workerPid: number | null;

  /** Node display name */
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
// Status Mapping
// =============================================================================

/**
 * Map subscription status to StatusDot variant.
 *
 * Mapping:
 * - replicating → success (●)
 * - catchup → warning (◐)
 * - initializing → connecting (◐)
 * - down → critical (●)
 * - unknown/disabled → muted (○)
 */
export function getStatusVariant(
  status: SubscriptionStatus,
  enabled: boolean
): StatusDotVariant {
  if (!enabled) return 'muted';
  switch (status) {
    case 'replicating':
      return 'success';
    case 'catchup':
      return 'warning';
    case 'initializing':
      return 'connecting';
    case 'down':
      return 'critical';
    default:
      return 'muted';
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Aggregate subscription data from store for panel rendering.
 *
 * @returns Subscription list items with derived metadata
 */
export function useSubscriptions(): UseSubscriptionsResult {
  // Select raw data from store
  const nodes = useStore((s) => s.nodes);
  const subscriptions = useStore((s) => s.subscriptions);
  const lagHistory = useStore((s) => s.lagHistory);
  const staleNodes = useStore((s) => s.staleNodes);
  const selections = useStore((s) => s.selections);
  const pglogicalMode = useConnectionStore((s) => s.pglogicalMode);

  // Derive subscription list in useMemo
  return useMemo(() => {
    const items: SubscriptionListItem[] = [];
    const selectedId = selections.get('subscriptions') ?? null;

    // Aggregate subscriptions from all nodes
    for (const [nodeId, subs] of subscriptions) {
      const nodeInfo = nodes.get(nodeId);
      const nodeName = nodeInfo?.name ?? nodeId;
      const isStale = staleNodes.has(nodeId);

      for (const sub of subs) {
        const id = `${nodeId}:${sub.subscriptionName}`;
        const lagKey = `${nodeId}:${sub.subscriptionName}`;
        const history = lagHistory.get(lagKey);
        const latestLag = history?.[history.length - 1] ?? null;
        const lagSeverity = getLagSeverity(latestLag?.lagSeconds ?? null);
        const statusVariant = getStatusVariant(sub.status, sub.enabled);

        items.push({
          id,
          nodeId,
          subscriptionName: sub.subscriptionName,
          enabled: sub.enabled,
          status: sub.status,
          source: sub.source,
          providerNode: sub.providerNode,
          providerHost: sub.providerHost,
          providerPort: sub.providerPort,
          slotName: sub.slotName,
          receivedLsn: sub.receivedLsn,
          latestEndLsn: sub.latestEndLsn,
          replicationSets: sub.replicationSets,
          lastMessageTime: sub.lastMessageTime,
          workerPid: sub.workerPid,
          nodeName,
          latestLag,
          statusVariant,
          lagSeverity,
          isStale,
          isSelected: id === selectedId,
        });
      }
    }

    // Compute derived counts
    let criticalCount = 0;
    let warningCount = 0;
    let staleCount = 0;
    let selectedItem: SubscriptionListItem | null = null;

    for (const item of items) {
      if (item.lagSeverity === 'critical') criticalCount++;
      if (item.lagSeverity === 'warning') warningCount++;
      if (item.isStale) staleCount++;
      if (item.isSelected) selectedItem = item;
    }

    return {
      items,
      selectedItem,
      count: items.length,
      criticalCount,
      warningCount,
      staleCount,
      pglogicalMode,
    };
  }, [nodes, subscriptions, lagHistory, staleNodes, selections, pglogicalMode]);
}
