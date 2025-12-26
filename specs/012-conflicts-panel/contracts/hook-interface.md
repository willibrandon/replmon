# Contract: useConflicts Hook Interface

**Feature**: 012-conflicts-panel
**Date**: 2025-12-25

## Overview

React hook that aggregates conflict data from the Zustand store for the ConflictsPanel component.

## Hook Interface

```typescript
// src/hooks/useConflicts.ts

import type {
  ConflictEvent,
  ConflictSource,
  ConflictType,
  ConflictResolution,
  ConflictSummary,
} from '../types/conflicts.js';

/**
 * A conflict item with derived display metadata.
 */
export interface ConflictListItem extends ConflictEvent {
  /** Node display name (from NodeInfo) */
  nodeName: string;

  /** Whether the conflict's node is stale (disconnected) */
  isStale: boolean;

  /** Whether this item is currently selected */
  isSelected: boolean;

  /** Human-readable relative time (e.g., "2m ago") */
  formattedTime: string;

  /** Combined "schema.table" string */
  qualifiedTable: string;
}

/**
 * Return type for useConflicts hook.
 */
export interface UseConflictsResult {
  /** All conflicts as enriched list items, sorted by recordedAt DESC */
  items: ConflictListItem[];

  /** Currently selected item (null if none) */
  selectedItem: ConflictListItem | null;

  /** Total conflict count */
  count: number;

  /** Aggregated summary statistics */
  summary: ConflictSummary;

  /** Data source per node */
  sourceByNode: Map<string, ConflictSource>;

  /** Count of nodes with 'history' source */
  historySourceCount: number;

  /** Count of nodes with 'log' source */
  logSourceCount: number;

  /** Count of nodes with 'unavailable' source */
  unavailableSourceCount: number;

  /** Count of conflicts from stale nodes */
  staleCount: number;
}

/**
 * Aggregate conflict data from store for panel rendering.
 *
 * @returns Conflict list items with derived metadata and aggregated statistics
 */
export function useConflicts(): UseConflictsResult;
```

## Store Selectors Used

```typescript
// Selectors accessed by useConflicts
const nodes = useStore((s) => s.nodes);
const conflicts = useStore((s) => s.conflicts);
const conflictSources = useStore((s) => s.conflictSources);
const staleNodes = useStore((s) => s.staleNodes);
const selections = useStore((s) => s.selections);
```

## Derivation Logic

### 1. Item Enrichment

```typescript
function enrichConflict(
  conflict: ConflictEvent,
  nodeInfo: NodeInfo,
  isStale: boolean,
  isSelected: boolean
): ConflictListItem {
  return {
    ...conflict,
    nodeName: nodeInfo.name ?? conflict.nodeId,
    isStale,
    isSelected,
    formattedTime: formatRelativeTime(conflict.recordedAt),
    qualifiedTable: `${conflict.schemaName}.${conflict.tableName}`,
  };
}
```

### 2. Sorting

Items sorted by `recordedAt` descending (most recent first).

```typescript
items.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
```

### 3. Summary Computation

```typescript
function computeSummary(items: ConflictListItem[]): ConflictSummary {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const summary: ConflictSummary = {
    total: items.length,
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

  for (const item of items) {
    // Count by type
    summary.byType[item.conflictType]++;

    // Count by resolution
    summary.byResolution[item.resolution]++;

    // Count by time window
    const time = item.recordedAt.getTime();
    if (time >= oneHourAgo) summary.lastHour++;
    if (time >= oneDayAgo) summary.last24h++;

    // Count by node
    summary.byNode[item.nodeId] = (summary.byNode[item.nodeId] ?? 0) + 1;
  }

  return summary;
}
```

### 4. Relative Time Formatting

```typescript
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}
```

## Usage Example

```typescript
// In ConflictsPanel.tsx
import { useConflicts } from '../../hooks/useConflicts.js';

export function ConflictsPanel(): React.ReactElement {
  const {
    items,
    count,
    summary,
    sourceByNode,
    historySourceCount,
    logSourceCount,
  } = useConflicts();

  return (
    <Box flexDirection="column" flexGrow={1}>
      <SummaryHeader
        total={count}
        lastHour={summary.lastHour}
        byType={summary.byType}
        historyCount={historySourceCount}
        logCount={logSourceCount}
      />
      {count === 0 ? (
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
```

## Memoization Strategy

The hook uses `useMemo` with dependencies on:
- `nodes` (Map)
- `conflicts` (Map)
- `conflictSources` (Map)
- `staleNodes` (Set)
- `selections` (Map)

```typescript
return useMemo(() => {
  // ... derivation logic
}, [nodes, conflicts, conflictSources, staleNodes, selections]);
```

## Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Large item count (500+) | Pre-limited by query module; slice if needed |
| Frequent re-renders | useMemo prevents recalculation on unrelated state changes |
| Selection changes | Only affects `isSelected` flag; minimal recalc |
| Time formatting | Formatted once per item in memoized pass |
