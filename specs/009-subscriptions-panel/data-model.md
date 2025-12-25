# Data Model: Subscriptions Panel

**Feature**: 009-subscriptions-panel
**Date**: 2025-12-24

## Overview

This feature is UI-only and does not introduce new data entities. All data comes from existing store types defined in `src/store/types.ts` and `src/services/polling/types.ts`.

## Existing Entities (Read-Only)

### SubscriptionData
**Source**: `src/services/polling/types.ts:124-155`

Represents a PostgreSQL logical replication subscription.

| Field | Type | Description |
|-------|------|-------------|
| `nodeId` | `string` | Node identifier from config |
| `subscriptionName` | `string` | Subscription name |
| `enabled` | `boolean` | Whether subscription is enabled |
| `status` | `SubscriptionStatus` | Current operational status |
| `providerNode` | `string \| null` | Provider node name (pglogical) |
| `providerHost` | `string \| null` | Provider host for auto-discovery |
| `providerPort` | `number \| null` | Provider port for auto-discovery |
| `slotName` | `string \| null` | Associated replication slot |
| `receivedLsn` | `string \| null` | Last received LSN |
| `latestEndLsn` | `string \| null` | Latest processed LSN |
| `replicationSets` | `string[]` | Replication sets (pglogical) |
| `lastMessageTime` | `Date \| null` | Last message timestamp |
| `workerPid` | `number \| null` | Apply worker PID |
| `source` | `SubscriptionSource` | 'native' or 'pglogical' |
| `timestamp` | `Date` | When data was collected |

### LagSample
**Source**: `src/store/types.ts:104-111`

A timestamped lag measurement.

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | `Date` | When measurement was taken |
| `lagBytes` | `number` | WAL lag in bytes |
| `lagSeconds` | `number \| null` | Lag duration in seconds |

### NodeInfo
**Source**: `src/store/types.ts:86-99`

Node configuration and runtime info.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (from YAML) |
| `name` | `string` | Display name |
| `host` | `string` | PostgreSQL host |
| `port` | `number` | PostgreSQL port |
| `database` | `string` | Database name |
| `hasPglogical` | `boolean` | Whether pglogical is installed |

## Derived Types (New)

### SubscriptionListItem
**Location**: `src/hooks/useSubscriptions.ts` (to be created)

Derived type combining subscription data with display metadata.

```typescript
interface SubscriptionListItem {
  /** Unique key: `${nodeId}:${subscriptionName}` */
  id: string;
  /** Subscription data from store */
  subscription: SubscriptionData;
  /** Node display name */
  nodeName: string;
  /** Latest lag sample (if available) */
  latestLag: LagSample | null;
  /** Status dot variant for rendering */
  statusVariant: StatusDotVariant;
  /** Lag severity for color coding */
  lagSeverity: LagSeverity;
  /** Whether node is stale */
  isStale: boolean;
  /** Whether this item is currently selected */
  isSelected: boolean;
}
```

### UseSubscriptionsResult
**Location**: `src/hooks/useSubscriptions.ts` (to be created)

Return type for the useSubscriptions hook.

```typescript
interface UseSubscriptionsResult {
  /** All subscriptions as list items */
  items: SubscriptionListItem[];
  /** Currently selected item */
  selectedItem: SubscriptionListItem | null;
  /** Total subscription count */
  count: number;
  /** Count of subscriptions with critical lag */
  criticalCount: number;
  /** Count of subscriptions with warning lag */
  warningCount: number;
  /** Count of stale subscriptions */
  staleCount: number;
  /** Whether pglogical mode is active */
  pglogicalMode: boolean;
}
```

## Enums

### SubscriptionStatus (Existing)
**Source**: `src/services/polling/types.ts:48-53`

```typescript
type SubscriptionStatus =
  | 'initializing'
  | 'replicating'
  | 'down'
  | 'catchup'
  | 'unknown';
```

### SubscriptionSource (Existing)
**Source**: `src/services/polling/types.ts:56`

```typescript
type SubscriptionSource = 'native' | 'pglogical';
```

### StatusDotVariant (Existing)
**Source**: `src/components/atoms/StatusDot.tsx:5`

```typescript
type StatusDotVariant = 'success' | 'warning' | 'critical' | 'muted' | 'connecting';
```

### LagSeverity (Existing)
**Source**: `src/types/topology.ts`

```typescript
type LagSeverity = 'normal' | 'warning' | 'critical' | 'unknown';
```

## State Access

### Store Slices Used

| Slice | Fields | Purpose |
|-------|--------|---------|
| Replication | `subscriptions`, `lagHistory`, `nodes`, `staleNodes` | Subscription data and lag |
| UI | `selections`, `focusedPanel`, `activeModal`, `modalData` | Selection and modal state |
| Connection | `pglogicalMode` | pglogical badge display |

### Key Selectors

| Selector | Returns | Purpose |
|----------|---------|---------|
| `selectAllSubscriptions` | `SubscriptionData[]` | All subscriptions across nodes |
| `selectLatestLagSample(nodeId, name)` | `LagSample \| undefined` | Latest lag for a subscription |
| `selectPanelSelection('subscriptions')` | `string \| null` | Current selection key |
| `selectIsNodeStale(nodeId)` | `boolean` | Whether node is stale |
| `selectNodeById(nodeId)` | `NodeInfo \| undefined` | Node display name |

## Relationships

```
NodeInfo (1) ───< SubscriptionData (n)
     │                    │
     │                    └───< LagSample (n)  [via lagHistory Map]
     │
     └─── staleNodes (Set)
```

## Validation Rules

No validation at component level - all data is already validated at polling/store boundaries.

## State Transitions

Subscription status transitions are handled by PostgreSQL and reflected in polling data:

```
[initial] → initializing → catchup → replicating
                              ↓
                            down
                              ↓
                           unknown (if connection lost)
```

The panel displays these states but does not modify them.
