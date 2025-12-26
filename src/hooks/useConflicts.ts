/**
 * Conflicts Data Hook
 *
 * Aggregates conflict event data from store for ConflictsPanel.
 * Derives enriched list items with display metadata, selection state,
 * and aggregated summary statistics.
 *
 * Feature: 012-conflicts-panel
 */

import { useMemo } from 'react';
import { useStore } from '../store/index.js';
import type {
  ConflictEvent,
  ConflictSource,
  ConflictType,
  ConflictResolution,
  ConflictSummary,
  ConflictListItem,
  UseConflictsResult,
} from '../types/conflicts.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format relative time from a date.
 * @param date - The date to format
 * @returns Human-readable relative time (e.g., "2m ago")
 */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

/**
 * Create an empty summary with zeroed counts.
 */
function createEmptySummary(): ConflictSummary {
  return {
    total: 0,
    byType: {
      insert_insert: 0,
      update_update: 0,
      update_delete: 0,
      delete_delete: 0,
    },
    byResolution: {
      apply_remote: 0,
      keep_local: 0,
      skip: 0,
    },
    lastHour: 0,
    last24h: 0,
    byNode: {},
  };
}

/**
 * Compute summary statistics from a list of conflict items.
 */
function computeSummary(items: ConflictListItem[]): ConflictSummary {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const summary = createEmptySummary();
  summary.total = items.length;

  for (const item of items) {
    // Count by type
    if (item.conflictType in summary.byType) {
      summary.byType[item.conflictType]++;
    }

    // Count by resolution
    if (item.resolution in summary.byResolution) {
      summary.byResolution[item.resolution]++;
    }

    // Count by time window
    const time = item.recordedAt.getTime();
    if (time >= oneHourAgo) summary.lastHour++;
    if (time >= oneDayAgo) summary.last24h++;

    // Count by node
    summary.byNode[item.nodeId] = (summary.byNode[item.nodeId] ?? 0) + 1;
  }

  return summary;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Aggregate conflict event data from store for panel rendering.
 *
 * @returns Conflict list items with derived metadata and aggregated statistics
 */
export function useConflicts(): UseConflictsResult {
  // Select raw data from store
  const nodes = useStore((s) => s.nodes);
  const conflictEvents = useStore((s) => s.conflictEvents);
  const conflictSources = useStore((s) => s.conflictSources);
  const staleNodes = useStore((s) => s.staleNodes);
  const selections = useStore((s) => s.selections);

  // Derive conflict list in useMemo
  return useMemo(() => {
    const items: ConflictListItem[] = [];
    const selectedId = selections.get('conflicts') ?? null;

    // Track source counts
    let historySourceCount = 0;
    let logSourceCount = 0;
    let unavailableSourceCount = 0;

    // Count sources from conflictSources map
    for (const [nodeId, source] of conflictSources) {
      // Only count if node still exists
      if (!nodes.has(nodeId)) continue;
      switch (source) {
        case 'history':
          historySourceCount++;
          break;
        case 'log':
          logSourceCount++;
          break;
        case 'unavailable':
          unavailableSourceCount++;
          break;
      }
    }

    // Aggregate conflicts from all nodes
    for (const [nodeId, nodeConflicts] of conflictEvents) {
      const nodeInfo = nodes.get(nodeId);
      // Filter out orphaned conflicts (nodeId not in nodes Map)
      if (!nodeInfo) continue;

      const nodeName = nodeInfo.name ?? nodeId;
      const isStale = staleNodes.has(nodeId);

      for (const conflict of nodeConflicts) {
        const isSelected = conflict.id === selectedId;
        const formattedTime = formatRelativeTime(conflict.recordedAt);
        const qualifiedTable = `${conflict.schemaName}.${conflict.tableName}`;

        items.push({
          ...conflict,
          nodeName,
          isStale,
          isSelected,
          formattedTime,
          qualifiedTable,
        });
      }
    }

    // Sort by recordedAt descending (most recent first)
    items.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());

    // Compute counts and find selected item
    let staleCount = 0;
    let selectedItem: ConflictListItem | null = null;

    for (const item of items) {
      if (item.isStale) staleCount++;
      if (item.isSelected) selectedItem = item;
    }

    // Compute summary statistics
    const summary = computeSummary(items);

    // Build source by node map
    const sourceByNode = new Map<string, ConflictSource>();
    for (const [nodeId, source] of conflictSources) {
      if (nodes.has(nodeId)) {
        sourceByNode.set(nodeId, source);
      }
    }

    return {
      items,
      selectedItem,
      count: items.length,
      summary,
      sourceByNode,
      historySourceCount,
      logSourceCount,
      unavailableSourceCount,
      staleCount,
    };
  }, [nodes, conflictEvents, conflictSources, staleNodes, selections]);
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type {
  ConflictEvent,
  ConflictSource,
  ConflictType,
  ConflictResolution,
  ConflictSummary,
  ConflictListItem,
  UseConflictsResult,
};
