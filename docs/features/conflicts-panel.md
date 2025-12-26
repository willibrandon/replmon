# Conflicts Panel

pglogical conflict detection and display. Conflict types (update/update, insert/insert, etc.), resolution applied, table affected. Timestamp-ordered list with detail view.

## Data Sources

The ConflictsPanel supports two data sources with automatic fallback:

### 1. Primary: Conflict History Table (Preferred)

When `pglogical.conflict_history` is available and enabled, replmon queries it directly for rich conflict data including full tuple details.

**Requirements:**
- pglogical 2.5.0+ (fork with conflict history feature)
- `pglogical.conflict_history_enabled = on`

See: [pglogical Conflict History](./pglogical-conflict-history.md) for full documentation.

**Advantages:**
- Full tuple data (local and remote)
- Structured, queryable data
- Subscription and origin tracking
- Commit timestamps and LSN

### 2. Fallback: PostgreSQL Server Logs

When conflict history is unavailable, replmon can parse conflicts from PostgreSQL server logs.

**Requirements:**
- Log access (csvlog format preferred for structured parsing)
- `log_min_messages = LOG` or lower
- pglogical must be configured to log conflicts (default behavior)

**Limitations:**
- No tuple data (just conflict type, table, resolution)
- Requires log file access or log_destination configuration
- Less structured data requiring regex parsing
- May miss conflicts if logs are rotated before parsing

## Detection Logic

On connection, replmon checks for conflict history availability:

```sql
SELECT EXISTS (
  SELECT 1 FROM pg_catalog.pg_tables
  WHERE schemaname = 'pglogical' AND tablename = 'conflict_history'
) AND current_setting('pglogical.conflict_history_enabled', true)::boolean AS available
```

If `available = true`, uses `RECENT_CONFLICTS_HISTORY` query.
If `available = false`, falls back to log parsing (when configured).

## UI Behavior

The panel displays a source indicator showing where conflict data originates:
- **HISTORY** badge: Data from `pglogical.conflict_history` table (full details available)
- **LOG** badge: Data parsed from server logs (limited details)

When using log-based conflicts, the detail view shows a notice that tuple data is unavailable.
