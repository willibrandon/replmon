# Contract: pglogical Conflicts Query Module

**Feature**: 012-conflicts-panel
**Date**: 2025-12-25

## Overview

Query module for fetching pglogical conflict data from either `conflict_history` table or csvlog parsing.

## Module Interface

```typescript
// src/services/polling/queries/pglogical-conflicts.ts

import type { QueryFn } from '../types.js';
import type { ConflictEvent, ConflictSource } from '../../../types/conflicts.js';

/**
 * Query module for pglogical conflicts.
 */
export interface PglogicalConflictsQueryModule {
  /**
   * Detect the best available conflict data source for a node.
   *
   * @param nodeId - Node identifier
   * @param queryFn - Query execution function from ConnectionManager
   * @returns The available source type
   */
  detectSource(
    nodeId: string,
    queryFn: QueryFn
  ): Promise<ConflictSource>;

  /**
   * Execute conflicts query on a node using the appropriate source.
   *
   * @param nodeId - Node identifier
   * @param queryFn - Query execution function
   * @param source - Pre-detected source type
   * @param logConfig - Optional log file configuration
   * @returns Array of ConflictEvent for this node
   */
  execute(
    nodeId: string,
    queryFn: QueryFn,
    source: ConflictSource,
    logConfig?: LogFileConfig
  ): Promise<ConflictEvent[]>;
}

/**
 * Configuration for log file access.
 */
export interface LogFileConfig {
  /** Local filesystem path or null for pg_read_file */
  localPath: string | null;
  /** Use pg_read_file() function for remote access */
  useRemoteRead: boolean;
  /** Last read position for incremental parsing */
  lastOffset?: number;
}

/**
 * Result from log parsing including new offset.
 */
export interface LogParseResult {
  conflicts: ConflictEvent[];
  newOffset: number;
}
```

## SQL Queries

### Source Detection Query

```sql
-- Check for conflict_history availability
SELECT
  EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'pglogical'
    AND tablename = 'conflict_history'
  ) AS table_exists,
  COALESCE(
    current_setting('pglogical.conflict_history_enabled', true)::boolean,
    false
  ) AS is_enabled;
```

### Conflict History Query

```sql
-- Fetch recent conflicts from history table
SELECT
  id,
  recorded_at,
  sub_name,
  conflict_type,
  resolution,
  schema_name,
  table_name,
  index_name,
  local_tuple,
  local_commit_ts,
  remote_tuple,
  remote_commit_ts,
  remote_commit_lsn::text
FROM pglogical.conflict_history
WHERE recorded_at > now() - interval '24 hours'
ORDER BY recorded_at DESC
LIMIT $1;
```

### Log File Path Query

```sql
-- Get PostgreSQL log file configuration
SELECT
  current_setting('log_directory') AS log_dir,
  current_setting('log_filename') AS log_filename,
  current_setting('data_directory') AS data_dir;
```

### Remote Log Read Query

```sql
-- Read log file content via pg_read_file
SELECT pg_read_file($1, $2, $3) AS content;
```

## Type Transformations

### conflict_history Row → ConflictEvent

```typescript
function transformHistoryRow(
  nodeId: string,
  row: ConflictHistoryRow
): ConflictEvent {
  return {
    id: `${nodeId}:${row.id}`,
    nodeId,
    recordedAt: new Date(row.recorded_at),
    subscriptionName: row.sub_name,
    conflictType: row.conflict_type as ConflictType,
    resolution: row.resolution as ConflictResolution,
    schemaName: row.schema_name,
    tableName: row.table_name,
    indexName: row.index_name,
    localTuple: row.local_tuple,
    remoteTuple: row.remote_tuple,
    localCommitTs: row.local_commit_ts ? new Date(row.local_commit_ts) : null,
    remoteCommitTs: row.remote_commit_ts ? new Date(row.remote_commit_ts) : null,
    remoteLsn: row.remote_commit_lsn,
    source: 'history',
  };
}
```

### csvlog Line → ConflictEvent

```typescript
const CONFLICT_PATTERN = /^CONFLICT: remote (INSERT|UPDATE|DELETE) on relation ([^\s]+)(?: \(local index ([^\)]+)\)| replica identity index ([^\s]+) \(tuple not found\))\. Resolution: (apply_remote|keep_local|skip)\.$/;

function parseLogLine(
  nodeId: string,
  csvRow: string[],
  lineHash: string
): ConflictEvent | null {
  const message = csvRow[13]; // message column
  const match = message?.match(CONFLICT_PATTERN);
  if (!match) return null;

  const [, operation, relation, localIndex, missingIndex, resolution] = match;
  const [schemaName, tableName] = parseRelation(relation);
  const conflictType = inferConflictType(operation, missingIndex !== undefined);

  return {
    id: `${nodeId}:${lineHash}`,
    nodeId,
    recordedAt: new Date(csvRow[0]), // log_time column
    subscriptionName: null,
    conflictType,
    resolution: resolution as ConflictResolution,
    schemaName,
    tableName,
    indexName: localIndex || missingIndex || null,
    localTuple: null,
    remoteTuple: null,
    localCommitTs: null,
    remoteCommitTs: null,
    remoteLsn: null,
    source: 'log',
  };
}

function inferConflictType(
  operation: string,
  isMissing: boolean
): ConflictType {
  if (operation === 'INSERT') return 'insert_insert';
  if (operation === 'UPDATE' && isMissing) return 'update_delete';
  if (operation === 'UPDATE') return 'update_update';
  if (operation === 'DELETE') return 'delete_delete';
  throw new Error(`Unknown operation: ${operation}`);
}

function parseRelation(relation: string): [string, string] {
  // Handle "schema.table" or just "table" (public schema)
  const parts = relation.split('.');
  if (parts.length === 2) return [parts[0], parts[1]];
  return ['public', parts[0]];
}
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| conflict_history table missing | Return source='unavailable', empty conflicts |
| conflict_history query fails | Log warning, return empty conflicts for node |
| Log file not accessible | Return source='unavailable', empty conflicts |
| Log file read error | Log warning, continue with partial data |
| Malformed log entry | Skip entry, continue parsing |
| pg_read_file permission denied | Log error with guidance, return empty |

## Usage Example

```typescript
import { pglogicalConflictsQueryModule } from './queries/pglogical-conflicts.js';

// In PollingService.executeCycle()
const source = await pglogicalConflictsQueryModule.detectSource(nodeId, queryFn);
const conflicts = await pglogicalConflictsQueryModule.execute(
  nodeId,
  queryFn,
  source,
  node.logConfig
);
```
