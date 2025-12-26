# Data Model: Conflicts Panel

**Feature**: 012-conflicts-panel
**Date**: 2025-12-25

## Entity Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ConflictEvent                                   │
│                    (Core conflict record from any source)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  IDENTITY                                                                    │
│  ├── id: string               # Unique: `${nodeId}:${sourceId}`             │
│  ├── nodeId: string           # Source node identifier                       │
│  └── recordedAt: Date         # When conflict was recorded                  │
│                                                                              │
│  SUBSCRIPTION CONTEXT                                                        │
│  └── subscriptionName: string | null  # pglogical subscription name         │
│                                                                              │
│  CONFLICT CLASSIFICATION                                                     │
│  ├── conflictType: ConflictType       # insert_insert, update_update, etc. │
│  └── resolution: ConflictResolution   # apply_remote, keep_local, skip     │
│                                                                              │
│  RELATION CONTEXT                                                            │
│  ├── schemaName: string       # Schema containing affected table             │
│  ├── tableName: string        # Table where conflict occurred               │
│  └── indexName: string | null # Index where conflict was detected           │
│                                                                              │
│  TUPLE DATA (history source only)                                           │
│  ├── localTuple: JsonObject | null    # Local row as JSONB                  │
│  └── remoteTuple: JsonObject | null   # Remote row as JSONB                 │
│                                                                              │
│  TIMESTAMPS & LSN (history source only)                                     │
│  ├── localCommitTs: Date | null       # When local tuple was committed      │
│  ├── remoteCommitTs: Date | null      # When remote change was committed    │
│  └── remoteLsn: string | null         # LSN of remote commit                │
│                                                                              │
│  SOURCE TRACKING                                                            │
│  └── source: ConflictSource           # 'history' | 'log'                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ aggregated into
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ConflictSummary                                   │
│                    (Aggregated statistics for header)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ├── total: number                    # Total conflict count                │
│  ├── byType: Record<ConflictType, number>    # Counts per type             │
│  ├── byResolution: Record<ConflictResolution, number>  # Counts per res    │
│  ├── lastHour: number                 # Conflicts in last 60 minutes        │
│  ├── last24h: number                  # Conflicts in last 24 hours          │
│  └── byNode: Record<string, number>   # Counts per node                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ derived into
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ConflictListItem                                   │
│                    (Display-enriched item for UI)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ├── [all ConflictEvent fields]                                             │
│  ├── nodeName: string         # Display name from NodeInfo                  │
│  ├── isStale: boolean         # Node is disconnected                        │
│  ├── isSelected: boolean      # Currently selected in list                  │
│  ├── formattedTime: string    # Human-readable relative time                │
│  └── qualifiedTable: string   # "schema.table" formatted                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Enums

### ConflictType

```typescript
type ConflictType =
  | 'insert_insert'   // INSERT conflicts with existing row
  | 'update_update'   // UPDATE conflicts with local modification
  | 'update_delete'   // UPDATE target not found (deleted locally)
  | 'delete_delete';  // DELETE target not found (deleted locally)
```

| Value | Description | Has Local Tuple |
|-------|-------------|-----------------|
| `insert_insert` | Remote INSERT conflicts with existing local row | Yes |
| `update_update` | Remote UPDATE conflicts with local modification | Yes |
| `update_delete` | Remote UPDATE target was deleted locally | No |
| `delete_delete` | Remote DELETE target was already deleted | No |

### ConflictResolution

```typescript
type ConflictResolution =
  | 'apply_remote'  // Applied the remote change
  | 'keep_local'    // Kept the local version
  | 'skip';         // Skipped the operation
```

### ConflictSource

```typescript
type ConflictSource =
  | 'history'      // From pglogical.conflict_history table
  | 'log'          // From PostgreSQL csvlog parsing
  | 'unavailable'; // No source available for this node
```

## Entity: ConflictEvent

### Purpose
Represents a single replication conflict event from any data source. This is the core data structure stored in the Zustand store and used throughout the application.

### TypeScript Definition

```typescript
interface ConflictEvent {
  // Identity
  id: string;
  nodeId: string;
  recordedAt: Date;

  // Subscription context
  subscriptionName: string | null;

  // Conflict classification
  conflictType: ConflictType;
  resolution: ConflictResolution;

  // Relation context
  schemaName: string;
  tableName: string;
  indexName: string | null;

  // Tuple data (history source only)
  localTuple: Record<string, unknown> | null;
  remoteTuple: Record<string, unknown> | null;

  // Timestamps & LSN (history source only)
  localCommitTs: Date | null;
  remoteCommitTs: Date | null;
  remoteLsn: string | null;

  // Source tracking
  source: ConflictSource;
}
```

### Field Specifications

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | NO | Unique identifier: `${nodeId}:${sourceId}` |
| `nodeId` | string | NO | Node identifier from ConnectionManager |
| `recordedAt` | Date | NO | When conflict was recorded/logged |
| `subscriptionName` | string | YES | pglogical subscription name (null for log source) |
| `conflictType` | ConflictType | NO | Type of conflict detected |
| `resolution` | ConflictResolution | NO | How conflict was resolved |
| `schemaName` | string | NO | Schema containing affected table |
| `tableName` | string | NO | Table where conflict occurred |
| `indexName` | string | YES | Index where conflict was detected |
| `localTuple` | object | YES | Local row data (history source only) |
| `remoteTuple` | object | YES | Remote row data (history source only) |
| `localCommitTs` | Date | YES | Local tuple commit timestamp |
| `remoteCommitTs` | Date | YES | Remote change commit timestamp |
| `remoteLsn` | string | YES | LSN of remote commit |
| `source` | ConflictSource | NO | Data source indicator |

## Entity: ConflictSummary

### Purpose
Aggregated statistics for the panel header and quick status overview.

### TypeScript Definition

```typescript
interface ConflictSummary {
  total: number;
  byType: Record<ConflictType, number>;
  byResolution: Record<ConflictResolution, number>;
  lastHour: number;
  last24h: number;
  byNode: Record<string, number>;
}
```

### Field Specifications

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total conflict count across all nodes |
| `byType` | Record | Count breakdown by conflict type |
| `byResolution` | Record | Count breakdown by resolution type |
| `lastHour` | number | Conflicts recorded in last 60 minutes |
| `last24h` | number | Conflicts recorded in last 24 hours |
| `byNode` | Record | Count breakdown by node ID |

## Entity: ConflictListItem

### Purpose
Display-enriched version of ConflictEvent for UI rendering in the panel list.

### TypeScript Definition

```typescript
interface ConflictListItem extends ConflictEvent {
  // Derived display fields
  nodeName: string;
  isStale: boolean;
  isSelected: boolean;
  formattedTime: string;
  qualifiedTable: string;
}
```

### Field Specifications

| Field | Type | Description |
|-------|------|-------------|
| `nodeName` | string | Display name from NodeInfo |
| `isStale` | boolean | Whether node is disconnected |
| `isSelected` | boolean | Currently selected in list |
| `formattedTime` | string | Relative time (e.g., "2m ago") |
| `qualifiedTable` | string | Combined "schema.table" |

## Store Shape

### Integration with Existing Store

```typescript
interface ReplicationState {
  // ... existing fields (subscriptions, slots, etc.)

  // New conflicts data
  conflicts: Map<string, ConflictEvent[]>;
  conflictSources: Map<string, ConflictSource>;
}
```

### Derived Data (computed in useConflicts hook)

```typescript
interface UseConflictsResult {
  items: ConflictListItem[];
  selectedItem: ConflictListItem | null;
  summary: ConflictSummary;
  sourceByNode: Map<string, ConflictSource>;
}
```

## Validation Rules

| Field | Validation |
|-------|------------|
| `conflictType` | Must be one of: insert_insert, update_update, update_delete, delete_delete |
| `resolution` | Must be one of: apply_remote, keep_local, skip |
| `source` | Must be one of: history, log, unavailable |
| `recordedAt` | Must be valid Date, within last 24 hours for display |
| `schemaName` | Non-empty string |
| `tableName` | Non-empty string |

## Relationships

```
pglogical.conflict_history          ConflictEvent
┌─────────────────────────┐        ┌─────────────────────────┐
│ id (PK)                 │───────►│ id (derived)            │
│ recorded_at             │        │ recordedAt              │
│ sub_name                │        │ subscriptionName        │
│ conflict_type           │        │ conflictType            │
│ resolution              │        │ resolution              │
│ schema_name             │        │ schemaName              │
│ table_name              │        │ tableName               │
│ local_tuple             │        │ localTuple              │
│ remote_tuple            │        │ remoteTuple             │
└─────────────────────────┘        └─────────────────────────┘

PostgreSQL csvlog                   ConflictEvent
┌─────────────────────────┐        ┌─────────────────────────┐
│ log_time                │───────►│ recordedAt              │
│ message (parsed)        │        │ conflictType            │
│                         │        │ resolution              │
│                         │        │ schemaName              │
│                         │        │ tableName               │
│ (no tuple data)         │        │ localTuple: null        │
│                         │        │ remoteTuple: null       │
└─────────────────────────┘        └─────────────────────────┘
```

## Sample Data

### ConflictEvent from history source

```typescript
{
  id: "node-1:42",
  nodeId: "node-1",
  recordedAt: new Date("2025-12-25T10:30:00Z"),
  subscriptionName: "sub_from_node2",
  conflictType: "insert_insert",
  resolution: "apply_remote",
  schemaName: "public",
  tableName: "users",
  indexName: "users_pkey",
  localTuple: { id: "100", name: "Alice", email: "alice@example.com" },
  remoteTuple: { id: "100", name: "Bob", email: "bob@example.com" },
  localCommitTs: new Date("2025-12-25T10:29:55Z"),
  remoteCommitTs: new Date("2025-12-25T10:29:50Z"),
  remoteLsn: "0/1A2B3C4D",
  source: "history"
}
```

### ConflictEvent from log source

```typescript
{
  id: "node-2:a1b2c3d4",
  nodeId: "node-2",
  recordedAt: new Date("2025-12-25T10:35:00Z"),
  subscriptionName: null,
  conflictType: "update_delete",
  resolution: "skip",
  schemaName: "public",
  tableName: "orders",
  indexName: "orders_pkey",
  localTuple: null,
  remoteTuple: null,
  localCommitTs: null,
  remoteCommitTs: null,
  remoteLsn: null,
  source: "log"
}
```

### ConflictSummary

```typescript
{
  total: 42,
  byType: {
    insert_insert: 15,
    update_update: 20,
    update_delete: 5,
    delete_delete: 2
  },
  byResolution: {
    apply_remote: 30,
    keep_local: 10,
    skip: 2
  },
  lastHour: 8,
  last24h: 42,
  byNode: {
    "node-1": 25,
    "node-2": 17
  }
}
```
