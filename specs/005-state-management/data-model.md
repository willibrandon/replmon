# Data Model: State Management

**Feature**: 005-state-management
**Date**: 2025-12-23
**Purpose**: Define store state structure, entity relationships, and state transitions

## Entity Definitions

### 1. NodeInfo

Represents a PostgreSQL instance being monitored.

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `id` | `string` | Unique identifier (from YAML config) | Config |
| `name` | `string` | Display name (from YAML config) | Config |
| `host` | `string` | PostgreSQL host | Config |
| `port` | `number` | PostgreSQL port | Config |
| `database` | `string` | Database name | Config |
| `hasPglogical` | `boolean` | Whether pglogical is installed | PollingService |

**Relationships**:
- Has many `SubscriptionData` (1:N)
- Has many `SlotData` (1:N)
- Has many `ConflictData` (1:N)
- Has one `HealthStatus` (1:1)

---

### 2. SubscriptionData

Represents a logical replication subscription. *Re-exported from `services/polling/types.ts`*.

| Field | Type | Description |
|-------|------|-------------|
| `nodeId` | `string` | Parent node identifier |
| `subscriptionName` | `string` | Subscription name |
| `enabled` | `boolean` | Whether subscription is enabled |
| `status` | `SubscriptionStatus` | Current operational status |
| `providerNode` | `string \| null` | Provider node name (pglogical) |
| `slotName` | `string \| null` | Associated replication slot |
| `receivedLsn` | `string \| null` | Last received LSN |
| `latestEndLsn` | `string \| null` | Latest processed LSN |
| `replicationSets` | `string[]` | Replication sets (pglogical) |
| `lastMessageTime` | `Date \| null` | Last message timestamp |
| `workerPid` | `number \| null` | Apply worker PID |
| `source` | `SubscriptionSource` | 'native' or 'pglogical' |
| `timestamp` | `Date` | When data was collected |

**Validation Rules**:
- `subscriptionName` must be non-empty
- `status` must be valid enum value

---

### 3. SlotData

Represents a replication slot. *Re-exported from `services/polling/types.ts`*.

| Field | Type | Description |
|-------|------|-------------|
| `nodeId` | `string` | Parent node identifier |
| `slotName` | `string` | Slot name |
| `plugin` | `string \| null` | Output plugin (logical only) |
| `slotType` | `SlotType` | 'physical' or 'logical' |
| `database` | `string \| null` | Database name (logical only) |
| `active` | `boolean` | Whether slot is in use |
| `retainedBytes` | `number` | WAL bytes retained |
| `walStatus` | `WalStatus \| null` | WAL status (PG13+) |
| `isStale` | `boolean` | Inactive with >1GB retention |
| `timestamp` | `Date` | When data was collected |

**Validation Rules**:
- `slotName` must be non-empty
- `retainedBytes` must be >= 0

---

### 4. ConflictData

Represents pglogical replication conflict statistics. *Re-exported from `services/polling/types.ts`*.

| Field | Type | Description |
|-------|------|-------------|
| `nodeId` | `string` | Parent node identifier |
| `subscriptionName` | `string` | Subscription with conflicts |
| `applyErrorCount` | `number` | Total apply errors |
| `insertConflicts` | `number` | INSERT-INSERT conflicts |
| `updateOriginDiffers` | `number` | UPDATE origin conflicts |
| `updateExists` | `number` | UPDATE-UPDATE conflicts |
| `updateDeleted` | `number` | UPDATE-DELETE conflicts |
| `updateMissing` | `number` | UPDATE target missing |
| `deleteOriginDiffers` | `number` | DELETE origin conflicts |
| `deleteMissing` | `number` | DELETE target missing |
| `multipleUniqueConflicts` | `number` | Unique constraint conflicts |
| `statsReset` | `Date \| null` | When stats were reset |
| `source` | `ConflictSource` | Detection source |
| `timestamp` | `Date` | When data was collected |

---

### 5. LagSample

A timestamped lag measurement for time-series history.

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | `Date` | When measurement was taken |
| `lagBytes` | `number` | WAL lag in bytes |
| `lagSeconds` | `number \| null` | Lag duration (if available) |

**Constraints**:
- Maximum 60 samples per subscription (FIFO eviction)
- Key format: `${nodeId}:${subscriptionName}`

---

### 6. UIState

Current UI configuration.

| Field | Type | Description |
|-------|------|-------------|
| `focusedPanel` | `Panel` | Currently focused panel |
| `previousFocusedPanel` | `Panel \| null` | Panel before modal opened |
| `activeModal` | `ModalType \| null` | Currently open modal |
| `selections` | `Map<Panel, string \| null>` | Selected item per panel |

**Panel Enum**:
```typescript
type Panel = 'topology' | 'subscriptions' | 'slots' | 'conflicts' | 'operations'
```

**ModalType Enum**:
```typescript
type ModalType = 'help' | 'operations' | 'confirmation' | 'details'
```

---

## State Structure

### Combined Store State

```typescript
interface ReplmonStoreState {
  // === Connection Slice (existing) ===
  currentScreen: AppScreen;
  nodeStatus: Map<string, NodeConnectionStatus>;
  connectionErrors: Map<string, string>;
  pglogicalMode: boolean;
  healthStatus: Map<string, HealthStatus>;
  poolStats: Map<string, PoolStats>;

  // === Replication Slice (new) ===
  /** Node info from config */
  nodes: Map<string, NodeInfo>;
  /** Subscriptions per node */
  subscriptions: Map<string, SubscriptionData[]>;
  /** Slots per node */
  slots: Map<string, SlotData[]>;
  /** Conflicts per node */
  conflicts: Map<string, ConflictData[]>;
  /** Lag history per subscription (key: nodeId:subscriptionName) */
  lagHistory: Map<string, LagSample[]>;
  /** Nodes with stale data (disconnected) */
  staleNodes: Set<string>;
  /** Last successful polling timestamp per node */
  lastUpdated: Map<string, Date>;

  // === UI Slice (new) ===
  /** Currently focused panel */
  focusedPanel: Panel;
  /** Panel focused before modal opened */
  previousFocusedPanel: Panel | null;
  /** Currently open modal */
  activeModal: ModalType | null;
  /** Modal configuration data */
  modalData: unknown | null;
  /** Selected item per panel (nodeId, subscriptionName, slotName, etc.) */
  selections: Map<Panel, string | null>;
}
```

---

## State Transitions

### Connection Status Flow

```
connecting → connected
connecting → failed
connected → disconnected (health check failure)
failed → connecting (retry)
disconnected → connecting (recovery)
```

### Stale Data Flow

```
[Normal Operation]
  Node connected → staleNodes.delete(nodeId)
  Polling success → lastUpdated.set(nodeId, timestamp)

[Disconnect Detected]
  Health status → unhealthy → staleNodes.add(nodeId)
  Data retained with stale flag

[Reconnect]
  Health status → healthy
  First successful poll → staleNodes.delete(nodeId)
  Old data replaced with fresh data
```

### Panel Focus Flow

```
[Normal Navigation]
  focusedPanel: 'topology' → 'subscriptions' → 'slots' → ...
  Tab cycles through panels in order

[Modal Open]
  previousFocusedPanel = focusedPanel
  activeModal = 'help' | 'operations' | ...
  Focus captured by modal

[Modal Close]
  focusedPanel = previousFocusedPanel
  previousFocusedPanel = null
  activeModal = null
```

### Lag History Flow

```
[New Polling Data]
  For each subscription:
    key = `${nodeId}:${subscriptionName}`
    sample = { timestamp, lagBytes, lagSeconds }
    history = lagHistory.get(key) ?? []
    history.push(sample)
    if history.length > MAX_SAMPLES:
      history.shift() // FIFO eviction
    lagHistory.set(key, history)
```

---

## Relationships Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     ReplmonStore                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐     ┌──────────────────┐                │
│  │ ConnectionSlice│     │ ReplicationSlice │                │
│  │───────────────│     │──────────────────│                │
│  │ nodeStatus    │────▶│ nodes            │                │
│  │ healthStatus  │     │ subscriptions    │                │
│  │ poolStats     │     │ slots            │                │
│  │ connectionErrs│     │ conflicts        │                │
│  └───────────────┘     │ lagHistory       │                │
│                        │ staleNodes       │                │
│                        │ lastUpdated      │                │
│                        └──────────────────┘                │
│                                                             │
│  ┌───────────────┐                                         │
│  │   UISlice     │                                         │
│  │───────────────│                                         │
│  │ focusedPanel  │                                         │
│  │ activeModal   │                                         │
│  │ selections    │                                         │
│  │ modalData     │                                         │
│  └───────────────┘                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

External Dependencies:
  - PollingService events → update ReplicationSlice
  - ConnectionManager events → update ConnectionSlice
  - Keyboard events → update UISlice
```

---

## Index Strategy

For efficient lookups, the following access patterns are optimized:

| Access Pattern | Data Structure | Lookup |
|----------------|----------------|--------|
| Node by ID | `nodes: Map<string, NodeInfo>` | O(1) |
| Subscriptions by node | `subscriptions: Map<nodeId, []>` | O(1) |
| Slots by node | `slots: Map<nodeId, []>` | O(1) |
| Lag history by subscription | `lagHistory: Map<key, []>` | O(1) |
| Is node stale? | `staleNodes: Set<string>` | O(1) |
| Selection for panel | `selections: Map<Panel, string>` | O(1) |

Cross-node aggregations (e.g., "all subscriptions") require iteration but are handled by memoized selectors.
