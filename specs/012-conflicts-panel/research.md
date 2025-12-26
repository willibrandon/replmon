# Research: Conflicts Panel

**Feature**: 012-conflicts-panel
**Date**: 2025-12-25

## Summary

This document consolidates research findings for implementing the Conflicts Panel in replmon. The panel displays pglogical replication conflicts from two data sources: the `pglogical.conflict_history` table (preferred) and PostgreSQL csvlog parsing (fallback).

## Technical Decisions

### 1. Conflict Data Source: conflict_history Table

**Decision**: Query `pglogical.conflict_history` as the primary (and preferred) data source.

**Rationale**:
- Provides structured, queryable conflict data directly from the database
- Includes full tuple data (local and remote) as JSONB for detailed investigation
- Available in pglogical 2.5.0+ when `pglogical.conflict_history_enabled = on`
- Table is partitioned by month, enabling efficient time-range queries

**Detection Query**:
```sql
SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'pglogical'
    AND tablename = 'conflict_history'
) AND current_setting('pglogical.conflict_history_enabled', true)::boolean
AS history_available;
```

**Data Query** (last 24 hours, limit 500):
```sql
SELECT
    id,
    recorded_at,
    sub_id,
    sub_name,
    conflict_type,
    resolution,
    schema_name,
    table_name,
    index_name,
    local_tuple,
    local_origin,
    local_commit_ts,
    remote_tuple,
    remote_origin,
    remote_commit_ts,
    remote_commit_lsn
FROM pglogical.conflict_history
WHERE recorded_at > now() - interval '24 hours'
ORDER BY recorded_at DESC
LIMIT 500;
```

### 2. Fallback Data Source: PostgreSQL csvlog Parsing

**Decision**: Parse PostgreSQL csvlog files when conflict_history is unavailable.

**Rationale**:
- Provides conflict visibility for older pglogical versions
- Provides conflict visibility when conflict_history is disabled
- PostgreSQL csvlog format is standardized and parseable

**Log Message Format** (from pglogical_conflict.c):
```
CONFLICT: remote {INSERT|UPDATE|DELETE} on relation {schema.table} (local index {index}). Resolution: {resolution}.
CONFLICT: remote {UPDATE|DELETE} on relation {schema.table} replica identity index {index} (tuple not found). Resolution: {resolution}.
```

**csvlog Column Layout** (PostgreSQL 10+):
| Column | Index | Content |
|--------|-------|---------|
| log_time | 0 | Timestamp with timezone |
| user_name | 1 | Database user |
| database_name | 2 | Database name |
| process_id | 3 | Backend PID |
| connection_from | 4 | Client address |
| session_id | 5 | Session identifier |
| session_line_num | 6 | Line number in session |
| command_tag | 7 | SQL command tag |
| session_start_time | 8 | Session start time |
| virtual_transaction_id | 9 | Virtual transaction ID |
| transaction_id | 10 | Transaction ID |
| error_severity | 11 | WARNING/ERROR/etc. |
| sql_state_code | 12 | SQLSTATE code (23505 for conflicts) |
| message | 13 | **The conflict message** |
| detail | 14 | Additional details |
| hint | 15 | Hint message |
| ... | | (additional columns in PG 14+) |

**Regex Pattern for Parsing**:
```javascript
const CONFLICT_PATTERN = /^CONFLICT: remote (INSERT|UPDATE|DELETE) on relation ([^\s]+)(?: \(local index ([^\)]+)\)| replica identity index ([^\s]+) \(tuple not found\))\. Resolution: (apply_remote|keep_local|skip)\.$/;
```

**Log Access Methods**:
1. **Local filesystem**: Direct file read when replmon runs on same host
2. **pg_read_file()**: Remote access via PostgreSQL function (requires superuser or pg_read_server_files role)

```sql
-- Get log file path
SELECT current_setting('log_directory') AS log_dir,
       current_setting('log_filename') AS log_filename;

-- Read log content (remote)
SELECT pg_read_file(log_path, offset, bytes) AS content;
```

### 3. Source Detection and Priority

**Decision**: Detect conflict_history availability on connection; use exclusively when available.

**Rationale**:
- conflict_history provides richer data (tuple contents, LSN, etc.)
- Combining sources would create duplicate entries
- Log parsing is maintenance burden; minimize when not needed

**Detection Flow**:
```
1. On node connection:
   a. Check for pglogical.conflict_history table existence
   b. Check pglogical.conflict_history_enabled GUC
   c. If both true → source = 'history'
   d. Else if log_path configured → source = 'log'
   e. Else → source = 'unavailable'

2. Store source per-node in ConnectionManager metadata
3. Query module selects appropriate data fetching strategy
```

### 4. conflict_history Table Schema

**Source**: Local pglogical fork (`/Users/brandon/src/pglogical/specs/001-conflict-history/data-model.md`)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | BIGSERIAL | NO | Unique identifier within partition |
| `recorded_at` | TIMESTAMPTZ | NO | When conflict was recorded (partition key) |
| `sub_id` | OID | NO | Subscription OID from `pglogical.subscription` |
| `sub_name` | NAME | YES | Subscription name (denormalized) |
| `conflict_type` | TEXT | NO | insert_insert, update_update, update_delete, delete_delete |
| `resolution` | TEXT | NO | apply_remote, keep_local, skip |
| `schema_name` | NAME | NO | Schema containing the affected table |
| `table_name` | NAME | NO | Name of the affected table |
| `index_name` | NAME | YES | Index where conflict was detected |
| `local_tuple` | JSONB | YES | Local row data as JSONB |
| `local_origin` | INTEGER | YES | Replication origin of local tuple |
| `local_commit_ts` | TIMESTAMPTZ | YES | Commit timestamp of local tuple |
| `remote_tuple` | JSONB | YES | Remote row data as JSONB |
| `remote_origin` | INTEGER | NO | Replication origin of remote change |
| `remote_commit_ts` | TIMESTAMPTZ | NO | Commit timestamp on remote origin |
| `remote_commit_lsn` | PG_LSN | NO | LSN of remote commit |
| `has_before_triggers` | BOOLEAN | NO | Whether BEFORE triggers modified remote tuple |

**GUC Configuration** (pglogical 2.5.0+):
| GUC | Type | Default | Purpose |
|-----|------|---------|---------|
| `pglogical.conflict_history_enabled` | bool | false | Master enable/disable |
| `pglogical.conflict_history_store_tuples` | bool | true | Include tuple JSONB |
| `pglogical.conflict_history_max_tuple_size` | int | 1024 | Truncation threshold |

### 5. UI Data Model Mapping

**Decision**: Map both sources to a unified `ConflictEvent` type.

**Mapping**:
| ConflictEvent Field | history Source | log Source |
|---------------------|----------------|------------|
| id | `${nodeId}:${id}` | `${nodeId}:${hash}` |
| nodeId | from connection | from connection |
| recordedAt | recorded_at | log_time |
| subscriptionName | sub_name | null |
| conflictType | conflict_type | parsed from message |
| resolution | resolution | parsed from message |
| schemaName | schema_name | parsed from relation |
| tableName | table_name | parsed from relation |
| indexName | index_name | parsed from message |
| localTuple | local_tuple | null (unavailable) |
| remoteTuple | remote_tuple | null (unavailable) |
| localCommitTs | local_commit_ts | null |
| remoteCommitTs | remote_commit_ts | null |
| remoteLsn | remote_commit_lsn | null |
| source | 'history' | 'log' |

### 6. Store Integration

**Decision**: Extend replication store slice with conflicts data.

**Store Shape**:
```typescript
interface ReplicationState {
  // ... existing fields
  conflicts: Map<string, ConflictEvent[]>;  // nodeId → conflicts
  conflictSources: Map<string, ConflictSource>;  // nodeId → 'history' | 'log' | 'unavailable'
  conflictSummary: ConflictSummary;  // aggregated stats
}
```

**Polling Integration**:
- Add `pglogicalConflictsQueryModule` to PollingService query set
- Query runs on 1s interval like other data
- Results merged into store via `setConflicts` action

### 7. Log File Position Persistence

**Decision**: Store last-read position per node in a local state file.

**Format** (`.replmon/log-positions.json`):
```json
{
  "node-1": { "path": "/var/log/postgresql/postgresql-18-main.csv", "offset": 12345678, "lastRead": "2025-12-25T10:00:00Z" },
  "node-2": { "path": "/pg/logs/server.csv", "offset": 9876543, "lastRead": "2025-12-25T10:00:00Z" }
}
```

**Rationale**:
- Avoids re-parsing entire log on restart
- Handles log rotation by detecting path changes
- Simple JSON format, no additional dependencies

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              replmon                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  PollingService                                                              │
│  ├── queries/pglogical-conflicts.ts                                         │
│  │   ├── detectConflictSource(nodeId, queryFn)                              │
│  │   │   └── Returns: 'history' | 'log' | 'unavailable'                     │
│  │   ├── queryConflictHistory(nodeId, queryFn)                              │
│  │   │   └── SELECT FROM pglogical.conflict_history                         │
│  │   └── parseConflictLog(nodeId, logContent)                               │
│  │       └── Regex extraction from csvlog                                   │
│  │                                                                          │
│  └── execute() → emits 'data' event with conflicts                         │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Store (replication slice)                                                   │
│  ├── conflicts: Map<nodeId, ConflictEvent[]>                                │
│  ├── conflictSources: Map<nodeId, ConflictSource>                           │
│  └── conflictSummary: { total, byType, byResolution, lastHour, last24h }   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  hooks/useConflicts.ts                                                       │
│  ├── Aggregates conflicts across nodes                                      │
│  ├── Computes derived display state (selection, sorting)                    │
│  └── Returns ConflictListItem[] + summary                                   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  components/panels/ConflictsPanel.tsx                                        │
│  ├── SummaryHeader (counts, badges)                                         │
│  ├── ConflictRow (type, table, resolution, timestamp, source badge)        │
│  └── ConflictDetailModal (full tuple data, metadata)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/services/polling/queries/pglogical-conflicts.ts` | Create | Query module for both sources |
| `src/types/conflicts.ts` | Create | ConflictEvent, ConflictSource, ConflictSummary |
| `src/store/replication.ts` | Modify | Add conflicts slice |
| `src/hooks/useConflicts.ts` | Create | Aggregation hook (pattern: useSlots) |
| `src/components/panels/ConflictsPanel.tsx` | Create | Main panel component |
| `src/components/modals/ConflictDetailModal.tsx` | Create | Detail modal for conflict inspection |

## Dependencies Resolved

1. **conflict_history schema**: Documented in local pglogical fork (2.5.0)
2. **Log format**: Extracted from pglogical_conflict.c source
3. **csvlog format**: Standard PostgreSQL documentation
4. **pg_read_file**: Available since PG 8.1, requires appropriate permissions
5. **Store pattern**: Established by useSlots, useSubscriptions hooks

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| conflict_history not available | Automatic fallback to log parsing |
| Log file access denied | Informative error message; guide user to configure permissions |
| Large conflict volumes | 24h window + 500 limit; pagination if needed |
| Log rotation during read | Detect path change; reset position; accept some data loss |
| Performance with 500+ items | Virtual list scrolling if needed (future enhancement) |
