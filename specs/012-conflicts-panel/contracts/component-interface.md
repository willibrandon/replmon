# Contract: ConflictsPanel Component Interface

**Feature**: 012-conflicts-panel
**Date**: 2025-12-25

## Overview

React component hierarchy for displaying pglogical conflicts in the replmon TUI.

## Component Hierarchy

```
ConflictsPanel
├── SummaryHeader
│   ├── Badge (conflict count)
│   ├── Badge (last hour)
│   ├── Badge (HISTORY/LOG source indicators)
│   └── Badge (by type breakdown)
├── EmptyState (when count === 0)
│   └── Guidance message
└── ConflictList (when count > 0)
    └── ConflictRow (×N)
        ├── SelectionIndicator
        ├── ConflictTypeBadge
        ├── TableName
        ├── ResolutionBadge
        ├── Timestamp
        ├── NodeName
        └── SourceBadge

ConflictDetailModal (overlay when item selected + Enter pressed)
├── Header (conflict type, table)
├── MetadataSection
│   ├── Timestamp
│   ├── Subscription
│   ├── Resolution
│   └── Node
├── TupleSection (history source only)
│   ├── LocalTuple (JSONB display)
│   └── RemoteTuple (JSONB display)
└── LSNSection (history source only)
    ├── Remote LSN
    ├── Local Commit TS
    └── Remote Commit TS
```

## Component Props

### ConflictsPanel

```typescript
export interface ConflictsPanelProps {
  config: Configuration;
}
```

### ConflictRow

```typescript
export interface ConflictRowProps {
  item: ConflictListItem;
}
```

### ConflictDetailModal

```typescript
export interface ConflictDetailModalProps {
  item: ConflictListItem;
  onClose: () => void;
}
```

### SummaryHeader

```typescript
export interface SummaryHeaderProps {
  total: number;
  lastHour: number;
  byType: Record<ConflictType, number>;
  historyCount: number;
  logCount: number;
  unavailableCount: number;
}
```

## Keyboard Interactions

| Key | Context | Action |
|-----|---------|--------|
| `c` | Global | Focus ConflictsPanel |
| `j` | Panel focused | Select next conflict |
| `k` | Panel focused | Select previous conflict |
| `Enter` | Item selected | Open detail modal |
| `Escape` | Modal open | Close modal |

## Visual Layout

### ConflictRow Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ›  INSERT_INSERT  public.users         apply_remote    2m ago  node-1  HIST │
│    UPDATE_UPDATE  public.orders        keep_local      5m ago  node-2  LOG  │
│    UPDATE_DELETE  inventory.products   skip           12m ago  node-1  HIST │
└──────────────────────────────────────────────────────────────────────────────┘
  │  └──────┬─────┘ └──────┬────────┘    └────┬─────┘   └──┬──┘ └──┬──┘ └─┬──┘
  │         │              │                  │            │       │      │
  │   ConflictType     TableName         Resolution    Time    Node   Source
  │
  └── Selection indicator
```

### SummaryHeader Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 42 conflicts • 8 last hour • 15 insert • 20 update • 5 update_del • 2 del   │
│ HISTORY (2) LOG (1)                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Detail Modal Layout

```
┌─────────────────────────── Conflict Details ────────────────────────────────┐
│                                                                              │
│  Type:         INSERT_INSERT                                                │
│  Table:        public.users                                                 │
│  Resolution:   apply_remote                                                 │
│  Timestamp:    2025-12-25 10:30:00 UTC                                     │
│  Node:         node-1                                                       │
│  Subscription: sub_from_node2                                               │
│  Source:       HISTORY                                                      │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Local Tuple:                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ {                                                                      │ │
│  │   "id": "100",                                                         │ │
│  │   "name": "Alice",                                                     │ │
│  │   "email": "alice@example.com"                                         │ │
│  │ }                                                                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Remote Tuple:                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ {                                                                      │ │
│  │   "id": "100",                                                         │ │
│  │   "name": "Bob",                                                       │ │
│  │   "email": "bob@example.com"                                           │ │
│  │ }                                                                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Remote LSN:       0/1A2B3C4D                                               │
│  Local Commit:     2025-12-25 10:29:55 UTC                                 │
│  Remote Commit:    2025-12-25 10:29:50 UTC                                 │
│                                                                              │
│                                                        [Escape] Close       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Empty State Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         No conflicts detected                                │
│                                                                              │
│           Conflicts will appear here when pglogical detects                  │
│           replication conflicts between nodes.                               │
│                                                                              │
│           Data sources:                                                      │
│           • HISTORY: pglogical.conflict_history table (preferred)           │
│           • LOG: PostgreSQL server log parsing (fallback)                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Unavailable State Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                      Conflict monitoring unavailable                         │
│                                                                              │
│           To enable conflict monitoring:                                     │
│                                                                              │
│           1. Enable conflict_history (pglogical 2.5.0+):                    │
│              SET pglogical.conflict_history_enabled = on;                    │
│                                                                              │
│           2. Or configure log file access in replmon.yaml:                  │
│              nodes:                                                          │
│                - name: my-node                                              │
│                  log_path: /var/log/postgresql/postgresql.csv              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Color Mapping

### Conflict Type Colors

| Type | Badge Variant |
|------|---------------|
| `insert_insert` | `primary` |
| `update_update` | `secondary` |
| `update_delete` | `warning` |
| `delete_delete` | `muted` |

### Resolution Colors

| Resolution | Badge Variant |
|------------|---------------|
| `apply_remote` | `success` |
| `keep_local` | `warning` |
| `skip` | `muted` |

### Source Colors

| Source | Badge Variant |
|--------|---------------|
| `history` | `success` (preferred) |
| `log` | `secondary` |
| `unavailable` | `critical` |

## Accessibility

- All interactive elements navigable via keyboard
- Selection state clearly indicated with `›` marker
- Color not sole indicator of state (badges include text labels)
- Modal has explicit close instruction
