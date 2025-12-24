# Data Model: Polling Service

**Feature**: 004-polling-service
**Date**: 2025-12-23
**Spec**: [spec.md](./spec.md)

## Entities

### PollingConfig

Configuration for the polling service.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| intervalMs | number | No | 1000 | Polling interval in milliseconds |

**Validation Rules**:
- `intervalMs` minimum: 250 (FR-003)
- `intervalMs` maximum: none defined (practical limit ~60000)

---

### ReplicationStats

Per-node replication statistics from pg_stat_replication.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nodeId | string | Yes | Node identifier from ConnectionManager |
| applicationName | string | Yes | Standby application name |
| clientAddr | string \| null | No | Client IP address |
| state | ReplicationState | Yes | Replication connection state |
| lagBytes | number | Yes | WAL lag in bytes |
| lagSeconds | number \| null | No | Lag duration in seconds (null if unavailable) |
| syncState | SyncState | Yes | Synchronization state |
| sentLsn | string | Yes | Last WAL sent position |
| writeLsn | string | Yes | Last WAL written by standby |
| flushLsn | string | Yes | Last WAL flushed by standby |
| replayLsn | string | Yes | Last WAL replayed by standby |
| timestamp | Date | Yes | When this data was collected |

**Enum: ReplicationState**
- `streaming` - Normal replication
- `catchup` - Standby catching up
- `backup` - Backup in progress
- `startup` - Connection starting

**Enum: SyncState**
- `async` - Asynchronous replication
- `sync` - Synchronous replication
- `potential` - Potential sync standby
- `quorum` - Quorum standby

---

### SlotData

Per-node replication slot information from pg_replication_slots.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nodeId | string | Yes | Node identifier |
| slotName | string | Yes | Replication slot name |
| plugin | string \| null | No | Output plugin (logical slots only) |
| slotType | SlotType | Yes | Physical or logical |
| database | string \| null | No | Database name (logical slots only) |
| active | boolean | Yes | Whether slot is in use |
| retainedBytes | number | Yes | WAL bytes retained by slot |
| walStatus | WalStatus \| null | No | WAL status (PG13+) |
| isStale | boolean | Yes | Inactive with >1GB retention |
| timestamp | Date | Yes | When this data was collected |

**Enum: SlotType**
- `physical` - Streaming replication slot
- `logical` - Logical replication slot

**Enum: WalStatus**
- `reserved` - WAL within max_wal_size
- `extended` - WAL beyond max_wal_size but still available
- `unreserved` - WAL may be removed soon
- `lost` - Required WAL has been removed

---

### SubscriptionData

Per-node subscription information.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nodeId | string | Yes | Node identifier |
| subscriptionName | string | Yes | Subscription name |
| enabled | boolean | Yes | Whether subscription is enabled |
| status | SubscriptionStatus | Yes | Current status |
| providerNode | string \| null | No | Provider node name (pglogical) |
| slotName | string \| null | No | Associated replication slot |
| receivedLsn | string \| null | No | Last received LSN |
| latestEndLsn | string \| null | No | Latest processed LSN |
| replicationSets | string[] | No | Replication sets (pglogical) |
| lastMessageTime | Date \| null | No | Last message timestamp |
| workerPid | number \| null | No | Apply worker PID |
| source | SubscriptionSource | Yes | Native or pglogical |
| timestamp | Date | Yes | When this data was collected |

**Enum: SubscriptionStatus**
- `initializing` - Initial sync in progress
- `replicating` - Normal replication
- `down` - Subscription not running
- `catchup` - Catching up after lag
- `unknown` - Status cannot be determined

**Enum: SubscriptionSource**
- `native` - PostgreSQL native logical replication
- `pglogical` - pglogical extension

---

### ConflictData

Per-node conflict information.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nodeId | string | Yes | Node identifier |
| subscriptionName | string | Yes | Subscription with conflicts |
| applyErrorCount | number | Yes | Total apply errors |
| insertConflicts | number | Yes | INSERT-INSERT conflicts |
| updateOriginDiffers | number | Yes | UPDATE origin differs conflicts |
| updateExists | number | Yes | UPDATE-UPDATE conflicts |
| updateDeleted | number | Yes | UPDATE-DELETE conflicts |
| updateMissing | number | Yes | UPDATE target missing conflicts |
| deleteOriginDiffers | number | Yes | DELETE origin differs conflicts |
| deleteMissing | number | Yes | DELETE target missing conflicts |
| multipleUniqueConflicts | number | Yes | Multiple unique constraint conflicts |
| statsReset | Date \| null | No | When stats were last reset |
| source | ConflictSource | Yes | How conflicts were detected |
| timestamp | Date | Yes | When this data was collected |

**Enum: ConflictSource**
- `native` - PostgreSQL 16+ pg_stat_subscription_stats
- `pglogical_log` - pglogical (log-based, limited)
- `unavailable` - No conflict tracking available

---

### PollingCycleResult

Aggregated result of a complete polling cycle.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cycleId | string | Yes | Unique cycle identifier |
| startedAt | Date | Yes | Cycle start timestamp |
| completedAt | Date | Yes | Cycle end timestamp |
| durationMs | number | Yes | Total cycle duration |
| stats | NodeData<ReplicationStats[]>[] | Yes | Per-node replication stats |
| subscriptions | NodeData<SubscriptionData[]>[] | Yes | Per-node subscriptions |
| slots | NodeData<SlotData[]>[] | Yes | Per-node slots |
| conflicts | NodeData<ConflictData[]>[] | Yes | Per-node conflicts |

---

### NodeData<T>

Generic wrapper for per-node query results.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nodeId | string | Yes | Node identifier |
| nodeName | string | Yes | Node display name |
| success | boolean | Yes | Whether query succeeded |
| data | T | Conditional | Data when success=true |
| error | Error | Conditional | Error when success=false |
| durationMs | number | Yes | Query execution time |
| hasPglogical | boolean | Yes | Whether node has pglogical |

---

### PollingEvents

Event map for PollingService typed EventEmitter.

| Event | Payload Type | Description |
|-------|-------------|-------------|
| `data` | PollingCycleResult | Complete cycle data (all categories) |
| `stats` | NodeData<ReplicationStats[]>[] | Replication statistics |
| `subscriptions` | NodeData<SubscriptionData[]>[] | Subscription data |
| `slots` | NodeData<SlotData[]>[] | Slot data |
| `conflicts` | NodeData<ConflictData[]>[] | Conflict data |
| `error` | PollingError | Polling cycle failure |
| `started` | { timestamp: Date } | Polling service started |
| `stopped` | { timestamp: Date } | Polling service stopped |
| `cycle:start` | { cycleId: string; timestamp: Date } | Cycle beginning |
| `cycle:complete` | { cycleId: string; durationMs: number } | Cycle finished |
| `cycle:skip` | { reason: string } | Cycle skipped (overlap) |

---

### PollingError

Error details when polling fails.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | Yes | Error message |
| cycleId | string \| null | No | Cycle ID if applicable |
| nodeErrors | { nodeId: string; error: Error }[] | No | Per-node errors |
| timestamp | Date | Yes | When error occurred |

---

## State Transitions

### PollingService State

```
            ┌─────────┐
            │ stopped │◄──────────────────┐
            └────┬────┘                   │
                 │ start()                │ stop()
                 ▼                        │
            ┌─────────┐                   │
    ┌──────►│ running │───────────────────┤
    │       └────┬────┘                   │
    │            │                        │
    │            │ poll cycle             │
    │            ▼                        │
    │       ┌─────────┐                   │
    │       │ polling │                   │
    │       └────┬────┘                   │
    │            │                        │
    │            │ cycle complete         │
    └────────────┘                        │
                                          │
    Note: stop() during 'polling' state   │
    discards results (FR-012)             │
                                          ▼
```

### pglogical Detection State (per node)

```
            ┌───────────┐
            │ unchecked │
            └─────┬─────┘
                  │ first query
                  ▼
        ┌─────────────────┐
        │ detecting       │
        └────────┬────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   ┌─────────┐      ┌───────────┐
   │ native  │      │ pglogical │
   └─────────┘      └───────────┘

Note: Detection is cached per-node for session lifetime.
Re-detection occurs if node is removed and re-added.
```

---

## Relationships

```
ConnectionManager (003)
        │
        │ provides queryHealthy()
        ▼
┌───────────────────┐
│  PollingService   │
└────────┬──────────┘
         │
         │ emits events
         ▼
┌───────────────────────────────────────────────────┐
│                 PollingEvents                      │
├───────────┬───────────┬───────────┬───────────────┤
│   stats   │   subs    │   slots   │   conflicts   │
└─────┬─────┴─────┬─────┴─────┬─────┴───────┬───────┘
      │           │           │             │
      ▼           ▼           ▼             ▼
┌─────────────────────────────────────────────────┐
│              Zustand Store (future)              │
│        (integration handled separately)          │
└─────────────────────────────────────────────────┘
```

---

## Query Modules

Each data category has a dedicated query module:

| Module | Queries | Fallback |
|--------|---------|----------|
| `queries/stats.ts` | pg_stat_replication | N/A (always available) |
| `queries/slots.ts` | pg_replication_slots | N/A (always available) |
| `queries/subscriptions.ts` | pg_stat_subscription, pglogical.show_subscription_status() | Return empty if no subs |
| `queries/conflicts.ts` | pg_stat_subscription_stats (PG16+) | Return zeros for older PG |
| `pglogical-detector.ts` | pg_extension check | Schema check fallback |
