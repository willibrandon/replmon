# Research: Operations Modal

**Feature**: 013-operations-modal
**Date**: 2025-12-25

## Research Topics

### 1. pglogical Subscription Management Functions

**Decision**: Use pglogical 2.x native functions for subscription control

**Rationale**: pglogical provides purpose-built functions for subscription management that handle internal state correctly. Native PostgreSQL `ALTER SUBSCRIPTION` commands are not compatible with pglogical subscriptions.

**Functions to Use**:

| Operation | Function | Parameters |
|-----------|----------|------------|
| Pause | `pglogical.alter_subscription_disable(name, immediate)` | subscription_name, immediate (bool, default false) |
| Resume | `pglogical.alter_subscription_enable(name, immediate)` | subscription_name, immediate (bool, default false) |
| Resync Table | `pglogical.alter_subscription_resynchronize_table(name, relation)` | subscription_name, table (regclass) |

**Critical Warning for Resync**: The resync operation will TRUNCATE the table first. Users must be warned that the table will be empty between resync start and completion.

**Alternatives Considered**:
- Native `ALTER SUBSCRIPTION DISABLE/ENABLE`: Not compatible with pglogical subscriptions
- Direct pg_subscription catalog manipulation: Unsafe, bypasses pglogical state management

**Source**: [EDB pglogical Subscription Documentation](https://www.enterprisedb.com/docs/pgd/3.7/pglogical/subscriptions/)

---

### 2. Replication Slot Management

**Decision**: Use native PostgreSQL slot management functions

**Rationale**: Replication slots are managed at the PostgreSQL level regardless of whether pglogical is used.

**Functions to Use**:

| Operation | Function | Parameters |
|-----------|----------|------------|
| Create Logical Slot | `pg_create_logical_replication_slot(slot_name, plugin)` | slot name, output plugin (typically 'pglogical_output' or 'pgoutput') |
| Create Physical Slot | `pg_create_physical_replication_slot(slot_name)` | slot name |
| Drop Slot | `pg_drop_replication_slot(slot_name)` | slot name |

**Active Slot Check**: Before dropping, query `pg_stat_replication` to warn if slot is in active use:
```sql
SELECT pid, client_addr, state FROM pg_stat_replication WHERE slot_name = $1;
```

**Alternatives Considered**:
- pglogical-specific slot functions: Don't exist; pglogical uses native slot management

---

### 3. Conflict Log Clearing

**Decision**: Use `TRUNCATE` on `pglogical.conflict_history` table

**Rationale**: The conflict history is a regular table that can be truncated. Log-based conflicts cannot be cleared (read-only from PostgreSQL csvlog).

**Implementation**:
```sql
TRUNCATE pglogical.conflict_history;
```

**Pre-check**: Count conflicts to display in confirmation:
```sql
SELECT COUNT(*) FROM pglogical.conflict_history;
```

**Log-based Fallback**: When using log file parsing (no conflict_history table), display error explaining conflicts cannot be cleared.

**Alternatives Considered**:
- DELETE FROM: Slower for large tables, generates WAL
- Mark as resolved column: Would require schema change, adds complexity

---

### 4. Prometheus Metrics Export Format

**Decision**: Use Prometheus text exposition format version 0.0.4

**Rationale**: Standard format parseable by all Prometheus scrapers. Simple text format suitable for display and manual copy.

**Format Specification**:
- Content-Type: `text/plain; version=0.0.4`
- Encoding: UTF-8 with `\n` line endings
- Structure: `# HELP`, `# TYPE`, then metric lines

**Metrics to Export** (derived from FR-008):

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `replmon_lag_bytes` | gauge | node, subscription | Replication lag in bytes |
| `replmon_lag_seconds` | gauge | node, subscription | Replication lag in seconds |
| `replmon_slot_wal_retention_bytes` | gauge | node, slot_name | WAL retained by slot |
| `replmon_conflict_total` | counter | node, conflict_type | Total conflicts by type |
| `replmon_subscription_status` | gauge | node, subscription | 1=active, 0=paused |

**Example Output**:
```
# HELP replmon_lag_bytes Replication lag in bytes
# TYPE replmon_lag_bytes gauge
replmon_lag_bytes{node="primary",subscription="my_sub"} 1024

# HELP replmon_subscription_status Subscription status (1=active, 0=paused)
# TYPE replmon_subscription_status gauge
replmon_subscription_status{node="subscriber",subscription="my_sub"} 1
```

**Alternatives Considered**:
- OpenMetrics format: More complex, not needed for basic metrics
- JSON format: Not standard for Prometheus, requires custom parser

**Source**: [Prometheus Exposition Formats](https://prometheus.io/docs/instrumenting/exposition_formats/)

---

### 5. Confirmation UX Pattern

**Decision**: Type-to-confirm for destructive operations

**Rationale**: Spec requirement FR-009 specifies typing resource name. More secure than yes/no confirmation for dangerous actions.

**Implementation Pattern**:
1. Display operation description with severity badge
2. Show target resource name clearly
3. Require exact match of resource name to proceed
4. Case-sensitive matching
5. Escape key cancels at any point

**Severity Levels**:
| Level | Color | Operations |
|-------|-------|------------|
| info | green | Export metrics |
| warning | yellow | Pause subscription, resync table |
| danger | red | Drop slot, clear conflicts |

**Alternatives Considered**:
- Yes/No confirmation: Less secure, easy to accidentally confirm
- Hold-to-confirm: Harder to implement in TUI, less accessible

---

### 6. Native PostgreSQL Replication Limitations

**Decision**: Gracefully disable unavailable operations

**Rationale**: Native logical replication (PostgreSQL 10+) has limited operational controls compared to pglogical.

**Availability Matrix**:

| Operation | pglogical | Native LR |
|-----------|-----------|-----------|
| Pause subscription | Yes | Yes (ALTER SUBSCRIPTION DISABLE) |
| Resume subscription | Yes | Yes (ALTER SUBSCRIPTION ENABLE) |
| Resync table | Yes | No (must recreate subscription) |
| Drop slot | Yes | Yes |
| Create slot | Yes | Yes |
| Clear conflict log | Yes | N/A (no conflict table) |

**UI Behavior**: Gray out unavailable operations with tooltip explaining limitation.

---

### 7. Error Handling and Messaging

**Decision**: Structured error responses with remediation hints

**Rationale**: SC-004 requires clear error messages with remediation steps.

**Error Categories**:

| Category | Example | Remediation Hint |
|----------|---------|------------------|
| Permission | `permission denied for function` | Check PostgreSQL role has SUPERUSER or replication privilege |
| Connection | `connection refused` | Verify node is reachable and PostgreSQL is running |
| Not Found | `subscription "x" does not exist` | Subscription may have been dropped; refresh the view |
| Timeout | `canceling statement due to statement timeout` | Operation took too long; retry or increase timeout |
| Conflict | `replication slot "x" is active` | Active connections must be terminated before dropping slot |

---

## Implementation Notes

1. **Immediate vs Deferred**: Use `immediate = true` for pause/resume to give instant feedback
2. **Resync Warning**: Always show prominent warning about table truncation during resync
3. **Slot Drop Safety**: Query active connections before allowing slot drop; require typing slot name
4. **Metrics Collection**: Aggregate from existing store state, not fresh queries (avoid additional DB load)
5. **History Limit**: Cap in-memory history at 100 entries to prevent memory growth

## Sources

- [EDB pglogical Subscriptions](https://www.enterprisedb.com/docs/pgd/3.7/pglogical/subscriptions/)
- [Prometheus Exposition Formats](https://prometheus.io/docs/instrumenting/exposition_formats/)
- [PostgreSQL ALTER SUBSCRIPTION](https://www.postgresql.org/docs/current/sql-altersubscription.html)
- [2ndQuadrant pglogical GitHub](https://github.com/2ndQuadrant/pglogical)
