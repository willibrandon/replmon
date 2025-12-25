# Data Model: Replication Slots Panel

**Feature**: 010-slots-panel
**Date**: 2025-12-24

## Entity Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Data Flow                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PollingService ──▶ Store (slots Map) ──▶ useSlots ──▶ SlotsPanel   │
│                                                                      │
│  SlotData (raw)     Map<nodeId,         SlotListItem    UI render   │
│  from PG            SlotData[]>         (enriched)                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Existing Entities (Read-Only)

### SlotData (from `src/services/polling/types.ts`)

Raw slot data from PostgreSQL, populated by PollingService.

| Field | Type | Description |
|-------|------|-------------|
| nodeId | string | Node identifier from ConnectionManager |
| slotName | string | Replication slot name |
| plugin | string \| null | Output plugin (logical slots only) |
| slotType | 'physical' \| 'logical' | Slot type |
| database | string \| null | Database name (logical slots only) |
| active | boolean | Whether slot is currently in use |
| retainedBytes | number | WAL bytes retained by slot |
| walStatus | 'reserved' \| 'extended' \| 'unreserved' \| 'lost' \| null | WAL status (PG13+, null if unavailable) |
| isStale | boolean | Marked true if node is disconnected |
| timestamp | Date | When this data was collected |

### Configuration Thresholds (from `src/config/defaults.ts`)

| Constant | Value | Description |
|----------|-------|-------------|
| DEFAULT_RETENTION_WARNING_BYTES | 1073741824 (1GB) | Warning threshold |
| DEFAULT_RETENTION_CRITICAL_BYTES | 5368709120 (5GB) | Critical threshold |

---

## New Entities

### SlotListItem

Enriched slot item with derived display metadata, returned by `useSlots` hook.

```typescript
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
  walStatus: 'reserved' | 'extended' | 'unreserved' | 'lost' | null;
  timestamp: Date;

  // ─── Derived display fields ────────────────────────────────────
  /** Node display name (from NodeInfo) */
  nodeName: string;

  /** Whether the slot's node is stale (disconnected) */
  isStale: boolean;

  /** Whether this item is currently selected */
  isSelected: boolean;

  /** Retention severity based on thresholds */
  retentionSeverity: 'healthy' | 'warning' | 'critical';

  /** WAL status severity */
  walStatusSeverity: 'healthy' | 'warning' | 'critical' | null;

  /** Retention as percentage of critical threshold (capped at 100) */
  retentionPercent: number;

  /** Formatted retained bytes (e.g., "1.5 GB") */
  formattedRetention: string;
}
```

### UseSlotResult

Return type for the `useSlots` hook.

```typescript
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
```

---

## Severity Calculation Rules

### Retention Severity

```typescript
function getRetentionSeverity(
  retainedBytes: number,
  thresholds: ThresholdLevels
): 'healthy' | 'warning' | 'critical' {
  if (retainedBytes >= thresholds.critical) return 'critical';
  if (retainedBytes >= thresholds.warning) return 'warning';
  return 'healthy';
}
```

### WAL Status Severity

```typescript
function getWalStatusSeverity(
  walStatus: WalStatus | null
): 'healthy' | 'warning' | 'critical' | null {
  if (walStatus === null) return null;
  switch (walStatus) {
    case 'reserved': return 'healthy';
    case 'extended': return 'warning';
    case 'unreserved':
    case 'lost': return 'critical';
  }
}
```

### Retention Percent

```typescript
function getRetentionPercent(
  retainedBytes: number,
  criticalThreshold: number
): number {
  const percent = (retainedBytes / criticalThreshold) * 100;
  return Math.min(100, Math.max(0, percent));
}
```

---

## State Transitions

### Selection State

```
┌─────────────┐    j/k keys    ┌─────────────┐
│ No Selection│ ──────────────▶│  Selected   │
└─────────────┘                 └─────────────┘
       ▲                              │
       │         Panel blur           │
       └──────────────────────────────┘
```

- Selection stored in `store.selections.get('slots')`
- Selection ID format: `${nodeId}:${slotName}`
- Initial selection: first item when panel gains focus (if any)

### Stale State

```
┌─────────────┐    Node disconnect    ┌─────────────┐
│   Fresh     │ ───────────────────▶  │    Stale    │
└─────────────┘                       └─────────────┘
       ▲                                    │
       │          Node reconnect            │
       └────────────────────────────────────┘
```

- Stale determined by `staleNodes.has(slot.nodeId)`
- Stale slots retain last-known data
- Visual: dimmed text + stale badge

---

## Validation Rules

| Field | Rule | Error Handling |
|-------|------|----------------|
| retainedBytes | Must be >= 0 | Default to 0 if negative |
| retentionPercent | Capped at [0, 100] | Math.min/max clamp |
| slotName | Non-empty string | Should never be empty from PG |
| nodeId | Must exist in nodes Map | Filter out orphaned slots |

---

## Relationships

```
NodeInfo (1) ◀──────────────── (N) SlotData
   │                                 │
   │ id = nodeId                     │ nodeId
   │                                 │
   ▼                                 ▼
   └─────────────────────────────────┘
         Joined in useSlots hook
```

- Each slot belongs to exactly one node
- Each node may have 0..N slots
- Slots are grouped by nodeId in the store's `slots` Map
