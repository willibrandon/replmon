/**
 * Slots Data Hook
 *
 * Aggregates replication slot data from store for SlotsPanel.
 * Derives enriched list items with severity indicators and selection state.
 *
 * Feature: 010-slots-panel
 */

import { useMemo } from 'react';
import { useStore } from '../store/index.js';
import {
  DEFAULT_RETENTION_WARNING_BYTES,
  DEFAULT_RETENTION_CRITICAL_BYTES,
} from '../config/defaults.js';
import type { WalStatus } from '../store/types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Severity level for visual indicators.
 */
export type Severity = 'healthy' | 'warning' | 'critical';

/**
 * A slot item with derived display metadata.
 */
export interface SlotListItem {
  /** Unique key: `${nodeId}:${slotName}` */
  id: string;

  // ─── Raw SlotData fields ───────────────────────────────────────
  nodeId: string;
  slotName: string;
  plugin: string | null;
  slotType: 'physical' | 'logical';
  database: string | null;
  active: boolean;
  retainedBytes: number;
  walStatus: WalStatus | null;
  timestamp: Date;

  // ─── Derived display fields ────────────────────────────────────
  /** Node display name (from NodeInfo) */
  nodeName: string;

  /** Whether the slot's node is stale (disconnected) */
  isStale: boolean;

  /** Whether this item is currently selected */
  isSelected: boolean;

  /** Retention severity based on thresholds */
  retentionSeverity: Severity;

  /** WAL status severity */
  walStatusSeverity: Severity | null;

  /** Retention as percentage of critical threshold (capped at 100) */
  retentionPercent: number;

  /** Formatted retained bytes (e.g., "1.5 GB") */
  formattedRetention: string;
}

/**
 * Return type for useSlots hook.
 */
export interface UseSlotsResult {
  /** All slots as enriched list items, sorted by nodeName then slotName */
  items: SlotListItem[];

  /** Currently selected item (null if none) */
  selectedItem: SlotListItem | null;

  /** Total slot count */
  count: number;

  /** Count of active slots */
  activeCount: number;

  /** Count of inactive slots */
  inactiveCount: number;

  /** Count of slots with critical retention */
  criticalCount: number;

  /** Count of slots with warning retention */
  warningCount: number;

  /** Count of slots from stale nodes */
  staleCount: number;

  /** Total retained bytes across all slots */
  totalRetainedBytes: number;

  /** Formatted total retention (e.g., "12.5 GB") */
  formattedTotalRetention: string;
}

// =============================================================================
// Severity Calculation Functions
// =============================================================================

/**
 * Calculate retention severity based on thresholds.
 *
 * @param retainedBytes - Number of bytes retained
 * @param warningThreshold - Warning threshold in bytes
 * @param criticalThreshold - Critical threshold in bytes
 * @returns Severity level
 */
export function getRetentionSeverity(
  retainedBytes: number,
  warningThreshold: number = DEFAULT_RETENTION_WARNING_BYTES,
  criticalThreshold: number = DEFAULT_RETENTION_CRITICAL_BYTES
): Severity {
  if (retainedBytes >= criticalThreshold) return 'critical';
  if (retainedBytes >= warningThreshold) return 'warning';
  return 'healthy';
}

/**
 * Map PostgreSQL WAL status to visual severity.
 *
 * Mapping:
 * - reserved: healthy (normal operation)
 * - extended: warning (beyond wal_keep_size but within max_slot_wal_keep_size)
 * - unreserved: critical (WAL may be removed at checkpoint)
 * - lost: critical (slot can no longer catch up)
 *
 * @param walStatus - WAL status from PostgreSQL (null for PG < 13)
 * @returns Severity level or null if walStatus is null
 */
export function getWalStatusSeverity(walStatus: WalStatus | null): Severity | null {
  if (walStatus === null) return null;
  switch (walStatus) {
    case 'reserved':
      return 'healthy';
    case 'extended':
      return 'warning';
    case 'unreserved':
    case 'lost':
      return 'critical';
  }
}

/**
 * Calculate retention as percentage of critical threshold.
 *
 * @param retainedBytes - Number of bytes retained
 * @param criticalThreshold - Critical threshold in bytes
 * @returns Percentage clamped between 0 and 100
 */
export function getRetentionPercent(
  retainedBytes: number,
  criticalThreshold: number = DEFAULT_RETENTION_CRITICAL_BYTES
): number {
  const percent = (retainedBytes / criticalThreshold) * 100;
  return Math.min(100, Math.max(0, percent));
}

/**
 * Format bytes to human-readable string.
 *
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 GB")
 */
export function formatBytes(bytes: number): string {
  if (bytes < 0) bytes = 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Aggregate slot data from store for panel rendering.
 *
 * @returns Slot list items with derived metadata and aggregated counts
 */
export function useSlots(): UseSlotsResult {
  // Select raw data from store
  const nodes = useStore((s) => s.nodes);
  const slots = useStore((s) => s.slots);
  const staleNodes = useStore((s) => s.staleNodes);
  const selections = useStore((s) => s.selections);

  // Derive slot list in useMemo
  return useMemo(() => {
    const items: SlotListItem[] = [];
    const selectedId = selections.get('slots') ?? null;

    // Aggregate slots from all nodes
    for (const [nodeId, nodeSlots] of slots) {
      const nodeInfo = nodes.get(nodeId);
      // Filter out orphaned slots (nodeId not in nodes Map)
      if (!nodeInfo) continue;

      const nodeName = nodeInfo.name ?? nodeId;
      const isStale = staleNodes.has(nodeId);

      for (const slot of nodeSlots) {
        const id = `${nodeId}:${slot.slotName}`;
        const retainedBytes = Math.max(0, slot.retainedBytes);
        const retentionSeverity = getRetentionSeverity(retainedBytes);
        const walStatusSeverity = getWalStatusSeverity(slot.walStatus);
        const retentionPercent = getRetentionPercent(retainedBytes);
        const formattedRetention = formatBytes(retainedBytes);

        items.push({
          id,
          nodeId,
          slotName: slot.slotName,
          plugin: slot.plugin,
          slotType: slot.slotType,
          database: slot.database,
          active: slot.active,
          retainedBytes,
          walStatus: slot.walStatus,
          timestamp: slot.timestamp,
          nodeName,
          isStale,
          isSelected: id === selectedId,
          retentionSeverity,
          walStatusSeverity,
          retentionPercent,
          formattedRetention,
        });
      }
    }

    // Sort by nodeName, then slotName (alphabetical)
    items.sort((a, b) => {
      const nodeCompare = a.nodeName.localeCompare(b.nodeName);
      if (nodeCompare !== 0) return nodeCompare;
      return a.slotName.localeCompare(b.slotName);
    });

    // Compute derived counts
    let activeCount = 0;
    let inactiveCount = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let staleCount = 0;
    let totalRetainedBytes = 0;
    let selectedItem: SlotListItem | null = null;

    for (const item of items) {
      if (item.active) activeCount++;
      else inactiveCount++;

      if (item.retentionSeverity === 'critical') criticalCount++;
      else if (item.retentionSeverity === 'warning') warningCount++;

      if (item.isStale) staleCount++;

      totalRetainedBytes += item.retainedBytes;

      if (item.isSelected) selectedItem = item;
    }

    return {
      items,
      selectedItem,
      count: items.length,
      activeCount,
      inactiveCount,
      criticalCount,
      warningCount,
      staleCount,
      totalRetainedBytes,
      formattedTotalRetention: formatBytes(totalRetainedBytes),
    };
  }, [nodes, slots, staleNodes, selections]);
}
