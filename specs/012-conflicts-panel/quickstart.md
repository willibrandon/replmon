# Quickstart: Conflicts Panel Testing

**Feature**: 012-conflicts-panel
**Date**: 2025-12-25

## Prerequisites

1. **pglogical 2.5.0+** installed on at least one PostgreSQL node with bidirectional replication
2. **conflict_history enabled** (or log file access configured)
3. **replmon** running and connected to the cluster

## Setup: Enable conflict_history

On each pglogical node (subscriber side):

```sql
-- Enable conflict history recording
ALTER SYSTEM SET pglogical.conflict_history_enabled = on;

-- Optional: Configure tuple storage
ALTER SYSTEM SET pglogical.conflict_history_store_tuples = on;
ALTER SYSTEM SET pglogical.conflict_history_max_tuple_size = 1024;

-- Reload configuration
SELECT pg_reload_conf();

-- Verify settings
SHOW pglogical.conflict_history_enabled;
```

## Setup: Alternative Log-Based Fallback

If conflict_history is not available, configure log access in `replmon.yaml`:

```yaml
nodes:
  - name: node-1
    dsn: postgresql://localhost:28818/postgres
    log_path: /var/log/postgresql/postgresql-18-main.csv
    # OR for remote access via pg_read_file:
    log_remote: true
```

Ensure PostgreSQL is configured for CSV logging:

```sql
ALTER SYSTEM SET log_destination = 'csvlog';
ALTER SYSTEM SET logging_collector = on;
SELECT pg_reload_conf();
```

## Generate Test Conflicts

Use the following script to generate conflicts for testing:

```bash
#!/bin/bash
# generate-conflicts.sh
# Run on two nodes simultaneously to create conflicts

NODE1_PORT=28818
NODE2_PORT=28819

# Create test table if not exists
psql -h localhost -p $NODE1_PORT -d postgres -c "
  CREATE TABLE IF NOT EXISTS conflict_test (
    id SERIAL PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
  );
"

# Add to replication set
psql -h localhost -p $NODE1_PORT -d postgres -c "
  SELECT pglogical.replication_set_add_table('default', 'conflict_test', true);
" 2>/dev/null || true

# Wait for sync
sleep 2

# Generate INSERT-INSERT conflict
echo "Generating INSERT-INSERT conflict..."
psql -h localhost -p $NODE1_PORT -d postgres -c "INSERT INTO conflict_test (id, value) VALUES (1000, 'from-node1');" &
psql -h localhost -p $NODE2_PORT -d postgres -c "INSERT INTO conflict_test (id, value) VALUES (1000, 'from-node2');" &
wait
sleep 1

# Generate UPDATE-UPDATE conflict
echo "Generating UPDATE-UPDATE conflict..."
psql -h localhost -p $NODE1_PORT -d postgres -c "UPDATE conflict_test SET value = 'node1-update', updated_at = now() WHERE id = 1000;" &
psql -h localhost -p $NODE2_PORT -d postgres -c "UPDATE conflict_test SET value = 'node2-update', updated_at = now() WHERE id = 1000;" &
wait
sleep 1

# Generate UPDATE-DELETE conflict
echo "Generating UPDATE-DELETE conflict..."
psql -h localhost -p $NODE1_PORT -d postgres -c "INSERT INTO conflict_test (id, value) VALUES (1001, 'will-be-deleted');"
sleep 1
psql -h localhost -p $NODE1_PORT -d postgres -c "DELETE FROM conflict_test WHERE id = 1001;" &
psql -h localhost -p $NODE2_PORT -d postgres -c "UPDATE conflict_test SET value = 'orphan-update' WHERE id = 1001;" &
wait
sleep 1

echo "Conflicts generated. Check replmon Conflicts Panel."
```

## Verify Conflicts in Database

Query the conflict_history table directly:

```sql
-- Count recent conflicts
SELECT count(*) FROM pglogical.conflict_history
WHERE recorded_at > now() - interval '1 hour';

-- View recent conflicts
SELECT
  recorded_at,
  conflict_type,
  resolution,
  schema_name || '.' || table_name AS relation,
  sub_name
FROM pglogical.conflict_history
ORDER BY recorded_at DESC
LIMIT 10;

-- View with tuple data
SELECT
  recorded_at,
  conflict_type,
  local_tuple,
  remote_tuple
FROM pglogical.conflict_history
WHERE local_tuple IS NOT NULL
ORDER BY recorded_at DESC
LIMIT 5;
```

## Test Scenarios

### Scenario 1: View Conflicts List

1. Start replmon: `bun run dev`
2. Press `c` to focus Conflicts Panel
3. Verify conflicts appear in timestamp order (most recent first)
4. Verify each row shows: type badge, table name, resolution, timestamp, node, source

**Expected**: List of conflicts with HISTORY or LOG source badges

### Scenario 2: Navigate Conflicts

1. With Conflicts Panel focused, press `j` to move down
2. Press `k` to move up
3. Verify selection indicator (`›`) moves correctly

**Expected**: Smooth navigation through conflict list

### Scenario 3: View Conflict Details

1. Select a conflict using j/k
2. Press `Enter` to open detail modal
3. Verify modal shows:
   - Conflict type and resolution
   - Table and schema names
   - Timestamp and node
   - Local and remote tuple data (history source only)
   - LSN and commit timestamps (history source only)
4. Press `Escape` to close modal

**Expected**: Full conflict details displayed, modal closes on Escape

### Scenario 4: Empty State

1. Clear conflict_history: `TRUNCATE pglogical.conflict_history;`
2. Wait for next polling cycle (1 second)
3. Verify empty state message appears

**Expected**: "No conflicts detected" with guidance message

### Scenario 5: Unavailable State

1. Disable conflict_history: `SET pglogical.conflict_history_enabled = off;`
2. Remove log_path from replmon.yaml
3. Restart replmon
4. Navigate to Conflicts Panel

**Expected**: "Conflict monitoring unavailable" with setup instructions

### Scenario 6: Source Detection

1. Enable conflict_history on node-1
2. Disable conflict_history on node-2, configure log_path
3. Generate conflicts on both nodes
4. Verify node-1 conflicts show "HISTORY" badge
5. Verify node-2 conflicts show "LOG" badge

**Expected**: Correct source badges per node

### Scenario 7: Summary Statistics

1. Generate multiple conflicts of different types
2. Verify header shows:
   - Total conflict count
   - Last hour count
   - Breakdown by type
   - Source counts (HISTORY/LOG)

**Expected**: Accurate aggregate statistics in header

## Troubleshooting

### No conflicts appearing

1. Check conflict_history is enabled:
   ```sql
   SHOW pglogical.conflict_history_enabled;
   ```

2. Check table exists:
   ```sql
   SELECT * FROM pg_tables WHERE tablename = 'conflict_history';
   ```

3. Check for conflicts in table:
   ```sql
   SELECT count(*) FROM pglogical.conflict_history;
   ```

### Log parsing not working

1. Verify log_destination includes csvlog:
   ```sql
   SHOW log_destination;
   ```

2. Verify log file path is correct:
   ```sql
   SELECT current_setting('log_directory') || '/' ||
          current_setting('log_filename');
   ```

3. Check file permissions (replmon user needs read access)

### Permission errors with pg_read_file

Grant required role to replmon database user:

```sql
GRANT pg_read_server_files TO replmon_user;
```

Or use superuser connection in replmon.yaml.
