# Research: Polling Service

**Feature**: 004-polling-service
**Date**: 2025-12-23
**Sources**: Local repos `../postgres/`, `../pglogical/`, `../pg_lag_monitor/`

## PostgreSQL Replication Monitoring Queries

### 1. Replication Statistics (pg_stat_replication)

**Source**: `postgres/src/backend/catalog/system_views.sql:928-952`

```sql
-- Native PostgreSQL 10+ replication stats
SELECT
    pid,
    usesysid,
    usename,
    application_name,
    client_addr,
    client_hostname,
    client_port,
    backend_start,
    backend_xmin,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    write_lag,
    flush_lag,
    replay_lag,
    sync_priority,
    sync_state,
    reply_time
FROM pg_stat_replication;
```

**Lag Calculation** (from `pg_lag_monitor/src/replication.rs:28-41`):

```sql
SELECT
    application_name::text,
    client_addr::text,
    state::text,
    pg_wal_lsn_diff(
        COALESCE(pg_current_wal_lsn(), '0/0'),
        COALESCE(replay_lsn, '0/0')
    )::bigint as lag_bytes,
    EXTRACT(EPOCH FROM replay_lag)::integer as lag_seconds,
    sync_state::text
FROM pg_stat_replication
WHERE state IS NOT NULL;
```

**Decision**: Use `pg_wal_lsn_diff()` for byte-level lag and `EXTRACT(EPOCH FROM replay_lag)` for time-based lag.

**Rationale**: This is the pattern used by pg_lag_monitor and provides both byte and time metrics.

---

### 2. Replication Slots (pg_replication_slots)

**Source**: `postgres/src/backend/catalog/system_views.sql:1041-1066`

```sql
-- Full slot information
SELECT
    slot_name,
    plugin,
    slot_type,
    datoid,
    database,
    temporary,
    active,
    active_pid,
    xmin,
    catalog_xmin,
    restart_lsn,
    confirmed_flush_lsn,
    wal_status,
    safe_wal_size,
    two_phase,
    inactive_since,
    conflicting,
    invalidation_reason,
    failover,
    synced
FROM pg_replication_slots;
```

**WAL Retention Calculation** (from `pg_lag_monitor/src/slots.rs:24-35`):

```sql
SELECT
    slot_name::text,
    slot_type::text,
    active,
    pg_wal_lsn_diff(
        pg_current_wal_lsn(),
        restart_lsn
    )::bigint as wal_retained_bytes,
    database::text
FROM pg_replication_slots;
```

**Decision**: Calculate WAL retention using `pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)`.

**Rationale**: Direct measurement of bytes between current WAL position and slot's restart point.

---

### 3. Native Subscriptions (pg_stat_subscription)

**Source**: `postgres/src/backend/catalog/system_views.sql:1001-1016`

```sql
-- PostgreSQL 10+ native logical replication subscriptions
SELECT
    subid,
    subname,
    worker_type,
    pid,
    leader_pid,
    relid,
    received_lsn,
    last_msg_send_time,
    last_msg_receipt_time,
    latest_end_lsn,
    latest_end_time
FROM pg_stat_subscription;
```

**Decision**: Query `pg_stat_subscription` for native PostgreSQL logical replication status.

**Rationale**: Standard view available in PostgreSQL 10+ for subscription monitoring.

---

### 4. Native Conflict Statistics (pg_stat_subscription_stats)

**Source**: `postgres/src/backend/catalog/system_views.sql:1416-1433`

```sql
-- PostgreSQL 16+ conflict statistics
SELECT
    subid,
    subname,
    apply_error_count,
    sync_seq_error_count,
    sync_table_error_count,
    confl_insert_exists,
    confl_update_origin_differs,
    confl_update_exists,
    confl_update_deleted,
    confl_update_missing,
    confl_delete_origin_differs,
    confl_delete_missing,
    confl_multiple_unique_conflicts,
    stats_reset
FROM pg_stat_subscription_stats;
```

**Decision**: Use `pg_stat_subscription_stats` for PostgreSQL 16+ conflict tracking.

**Rationale**: Native conflict counters available in PG16+ without extensions.

**Alternatives**: For PG10-15, conflicts are only available via pglogical or application logging.

---

### 5. pglogical Detection

**Source**: `pglogical/pglogical--2.4.6.sql` (schema inspection)

```sql
-- Check if pglogical extension is installed
SELECT EXISTS(
    SELECT 1 FROM pg_extension WHERE extname = 'pglogical'
) AS has_pglogical;

-- Alternative: check for schema
SELECT EXISTS(
    SELECT 1 FROM pg_namespace WHERE nspname = 'pglogical'
) AS has_pglogical_schema;
```

**Decision**: Check `pg_extension` first, fallback to schema check.

**Rationale**: Extension check is canonical; schema check handles edge cases.

---

### 6. pglogical Subscriptions

**Source**: `pglogical/pglogical--2.4.6.sql:21-34, 78-82`

**Table structure** (`pglogical.subscription`):
```sql
-- pglogical subscription table
CREATE TABLE pglogical.subscription (
    sub_id oid NOT NULL PRIMARY KEY,
    sub_name name NOT NULL UNIQUE,
    sub_origin oid NOT NULL REFERENCES node(node_id),
    sub_target oid NOT NULL REFERENCES node(node_id),
    sub_origin_if oid NOT NULL REFERENCES node_interface(if_id),
    sub_target_if oid NOT NULL REFERENCES node_interface(if_id),
    sub_enabled boolean NOT NULL DEFAULT true,
    sub_slot_name name NOT NULL,
    sub_replication_sets text[],
    sub_forward_origins text[],
    sub_apply_delay interval NOT NULL DEFAULT '0',
    sub_force_text_transfer boolean NOT NULL DEFAULT 'f'
);
```

**Status function**:
```sql
-- pglogical subscription status
SELECT
    subscription_name,
    status,
    provider_node,
    provider_dsn,
    slot_name,
    replication_sets,
    forward_origins
FROM pglogical.show_subscription_status(NULL);
```

**Decision**: Use `pglogical.show_subscription_status()` function for runtime status.

**Rationale**: Function provides computed status fields not available in raw table.

---

### 7. pglogical Conflicts

**Source**: `pglogical/pglogical_conflict.h:43-49, pglogical_conflict.c:630-740`

**Conflict Types** (enum `PGLogicalConflictType`):
- `CONFLICT_INSERT_INSERT` - Insert conflicts with existing row
- `CONFLICT_UPDATE_UPDATE` - Update conflicts with concurrent update
- `CONFLICT_UPDATE_DELETE` - Update targets deleted row
- `CONFLICT_DELETE_DELETE` - Delete targets already-deleted row

**Resolution Types** (enum `PGLogicalConflictResolution`):
- `PGLogicalResolution_ApplyRemote` - Apply incoming change
- `PGLogicalResolution_KeepLocal` - Keep local version
- `PGLogicalResolution_Skip` - Skip the change

**Important Discovery**: pglogical logs conflicts to PostgreSQL server log via `ereport()`, NOT to a table. Configurable via `pglogical.conflict_log_level` GUC.

**Decision**: For pglogical conflict monitoring:
1. Query `pg_stat_activity` for apply worker errors (limited)
2. Recommend users configure log forwarding for full conflict visibility
3. Future: Consider parsing `pg_read_file()` on log if accessible

**Rationale**: pglogical doesn't persist conflicts to queryable storage by default.

**Alternatives Considered**:
- Custom conflict logging table (requires pglogical modification)
- Log file parsing (complex, permission issues)
- LISTEN/NOTIFY for real-time (requires custom triggers)

---

### 8. pglogical Node Topology

**Source**: `pglogical/pglogical--2.4.6.sql:3-19`

```sql
-- Local node info
SELECT
    n.node_id,
    n.node_name,
    ni.if_dsn
FROM pglogical.local_node ln
JOIN pglogical.node n ON n.node_id = ln.node_id
JOIN pglogical.node_interface ni ON ni.if_id = ln.node_local_interface;

-- All known nodes
SELECT node_id, node_name FROM pglogical.node;

-- Node info function
SELECT * FROM pglogical.pglogical_node_info();
```

**Decision**: Use `pglogical.pglogical_node_info()` for local node, `pglogical.node` for topology.

---

## Query Strategy by Data Category

### Stats Query (per node)

```sql
-- Works on all PostgreSQL 10+
SELECT
    application_name,
    client_addr::text,
    state,
    pg_wal_lsn_diff(
        COALESCE(pg_current_wal_lsn(), '0/0'),
        COALESCE(replay_lsn, '0/0')
    )::bigint as lag_bytes,
    EXTRACT(EPOCH FROM replay_lag)::numeric as lag_seconds,
    sync_state
FROM pg_stat_replication
WHERE state IS NOT NULL;
```

### Slots Query (per node)

```sql
SELECT
    slot_name,
    plugin,
    slot_type,
    database,
    active,
    pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::bigint as retained_bytes,
    wal_status,
    CASE WHEN NOT active AND pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) > 1073741824
         THEN true ELSE false END as is_stale
FROM pg_replication_slots;
```

### Subscriptions Query (per node)

```sql
-- Native (PostgreSQL 10+)
SELECT
    su.oid as sub_id,
    su.subname,
    su.subenabled as enabled,
    st.received_lsn,
    st.latest_end_lsn,
    st.last_msg_receipt_time,
    st.pid as worker_pid
FROM pg_subscription su
LEFT JOIN pg_stat_subscription st ON st.subid = su.oid;

-- pglogical (when detected)
SELECT
    subscription_name,
    status,
    provider_node,
    slot_name,
    replication_sets
FROM pglogical.show_subscription_status(NULL);
```

### Conflicts Query (per node)

```sql
-- Native (PostgreSQL 16+)
SELECT
    subname,
    apply_error_count,
    confl_insert_exists,
    confl_update_origin_differs,
    confl_update_exists,
    confl_update_deleted,
    confl_update_missing,
    confl_delete_origin_differs,
    confl_delete_missing,
    confl_multiple_unique_conflicts,
    stats_reset
FROM pg_stat_subscription_stats;

-- pglogical: No queryable conflict table exists.
-- Conflicts logged to server log only.
```

---

## Version Compatibility Matrix

| Feature | PG10 | PG11 | PG12 | PG13 | PG14 | PG15 | PG16+ |
|---------|------|------|------|------|------|------|-------|
| pg_stat_replication | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| pg_replication_slots | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| pg_stat_subscription | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| pg_stat_subscription_stats | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| replay_lag column | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| wal_status column | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| inactive_since column | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

**Decision**: Target PostgreSQL 10+ with graceful feature degradation for newer columns.

---

## TypeScript EventEmitter Pattern

**Source**: Existing `connection-manager/events.ts`

```typescript
// Typed EventEmitter pattern from ConnectionManager
export class TypedEventEmitter {
  private emitter: EventEmitter;

  on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): void;
  off<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): void;
  emit<K extends keyof Events>(event: K, payload: Events[K]): boolean;
}
```

**Decision**: Reuse same `TypedEventEmitter` pattern for PollingService.

**Rationale**: Consistent API across services; already proven in ConnectionManager.
