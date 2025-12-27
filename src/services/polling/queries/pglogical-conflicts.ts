/**
 * pglogical Conflicts Query Module
 *
 * Queries conflict data from pglogical conflict_history table (pglogical 2.5.0+).
 * Falls back to PostgreSQL csvlog parsing when conflict_history is unavailable.
 *
 * Feature: 012-conflicts-panel
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import type { QueryFn } from '../types.js';
import type {
  ConflictEvent,
  ConflictSource,
  ConflictType,
  ConflictResolution,
  LogFileConfig,
} from '../../../types/conflicts.js';

// =============================================================================
// Constants
// =============================================================================

/** Default conflict limit per query */
const DEFAULT_CONFLICT_LIMIT = 500;

/** Time window for conflicts (7 days) - long enough to investigate patterns */
const CONFLICT_WINDOW_HOURS = 24 * 7;

/** Log position persistence file */
const LOG_POSITIONS_FILE = join(homedir(), '.replmon', 'log-positions.json');

/** Maximum log content to read per cycle (1MB) */
const MAX_LOG_READ_BYTES = 1024 * 1024;

// =============================================================================
// SQL Queries
// =============================================================================

/**
 * SQL query to detect conflict_history availability.
 */
const DETECT_SOURCE_QUERY = `
SELECT
  EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'pglogical'
    AND tablename = 'conflict_history'
  ) AS table_exists,
  COALESCE(
    current_setting('pglogical.conflict_history_enabled', true)::boolean,
    false
  ) AS is_enabled
`;

/**
 * SQL query to fetch recent conflicts from conflict_history table.
 */
const CONFLICT_HISTORY_QUERY = `
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
  remote_commit_lsn::text AS remote_commit_lsn
FROM pglogical.conflict_history
WHERE recorded_at > now() - interval '${CONFLICT_WINDOW_HOURS} hours'
ORDER BY recorded_at DESC
LIMIT $1
`;

/**
 * SQL query to read log file content using pg_read_file().
 * Requires superuser or pg_read_server_files role.
 */
const READ_LOG_FILE_QUERY = `
SELECT pg_read_file($1, $2, $3) AS content
`;

/**
 * SQL query to get current log file path from PostgreSQL.
 */
const GET_LOG_FILE_QUERY = `
SELECT pg_current_logfile('csvlog') AS logfile
`;

// =============================================================================
// Types
// =============================================================================

/** Result row from source detection query */
interface SourceDetectionRow {
  table_exists: boolean;
  is_enabled: boolean;
}

/** Result row from conflict_history query */
interface ConflictHistoryRow {
  id: number | string;
  recorded_at: Date | string;
  sub_name: string | null;
  conflict_type: string;
  resolution: string;
  schema_name: string;
  table_name: string;
  index_name: string | null;
  local_tuple: Record<string, unknown> | null;
  local_commit_ts: Date | string | null;
  remote_tuple: Record<string, unknown> | null;
  remote_commit_ts: Date | string | null;
  remote_commit_lsn: string | null;
}

/** Result row from pg_read_file query */
interface ReadFileRow {
  content: string;
}

/** Result row from pg_current_logfile query */
interface LogFileRow {
  logfile: string | null;
}

/** Persisted log positions per node */
interface LogPositions {
  [nodeId: string]: {
    filePath: string;
    offset: number;
    lastRead: string;
  };
}


// =============================================================================
// Transformation Functions
// =============================================================================

/**
 * Parse conflict type from database string.
 */
function parseConflictType(value: string): ConflictType {
  switch (value.toLowerCase()) {
    case 'insert_insert':
      return 'insert_insert';
    case 'update_update':
      return 'update_update';
    case 'update_delete':
      return 'update_delete';
    case 'delete_delete':
      return 'delete_delete';
    default:
      // Default to update_update for unknown types
      return 'update_update';
  }
}

/**
 * Parse resolution from database string.
 */
function parseResolution(value: string): ConflictResolution {
  switch (value.toLowerCase()) {
    case 'apply_remote':
      return 'apply_remote';
    case 'keep_local':
      return 'keep_local';
    case 'skip':
      return 'skip';
    default:
      // Default to apply_remote for unknown resolutions
      return 'apply_remote';
  }
}

/**
 * Transform conflict_history row to ConflictEvent.
 */
function transformHistoryRow(
  nodeId: string,
  row: ConflictHistoryRow
): ConflictEvent {
  return {
    id: `${nodeId}:${row.id}`,
    nodeId,
    recordedAt: row.recorded_at instanceof Date
      ? row.recorded_at
      : new Date(row.recorded_at),
    subscriptionName: row.sub_name,
    conflictType: parseConflictType(row.conflict_type),
    resolution: parseResolution(row.resolution),
    schemaName: row.schema_name,
    tableName: row.table_name,
    indexName: row.index_name,
    localTuple: row.local_tuple,
    remoteTuple: row.remote_tuple,
    localCommitTs: row.local_commit_ts
      ? (row.local_commit_ts instanceof Date
          ? row.local_commit_ts
          : new Date(row.local_commit_ts))
      : null,
    remoteCommitTs: row.remote_commit_ts
      ? (row.remote_commit_ts instanceof Date
          ? row.remote_commit_ts
          : new Date(row.remote_commit_ts))
      : null,
    remoteLsn: row.remote_commit_lsn,
    source: 'history',
  };
}

// =============================================================================
// Log Position Persistence
// =============================================================================

/** In-memory cache of log positions */
let logPositionsCache: LogPositions | null = null;

/** Lock to prevent concurrent save operations */
let saveInProgress: Promise<void> | null = null;

/** Flag indicating cache is being loaded from disk */
let loadInProgress: Promise<LogPositions> | null = null;

/**
 * Load log positions from disk.
 * Uses a loading lock to prevent duplicate reads.
 */
async function loadLogPositions(): Promise<LogPositions> {
  // Return cached value if available
  if (logPositionsCache !== null) {
    return logPositionsCache;
  }

  // If already loading, wait for that to complete
  if (loadInProgress !== null) {
    return loadInProgress;
  }

  // Start loading with lock
  loadInProgress = (async (): Promise<LogPositions> => {
    try {
      if (existsSync(LOG_POSITIONS_FILE)) {
        const content = await readFile(LOG_POSITIONS_FILE, 'utf-8');
        const parsed = JSON.parse(content) as LogPositions;
        logPositionsCache = parsed;
        return parsed;
      }
    } catch {
      // Ignore read errors, start fresh
    }

    logPositionsCache = {};
    return logPositionsCache;
  })();

  try {
    const result = await loadInProgress;
    return result;
  } finally {
    loadInProgress = null;
  }
}

/**
 * Save log positions to disk.
 * Uses a lock to prevent concurrent writes and ensures
 * the latest cache state is always written.
 */
async function saveLogPositions(positions: LogPositions): Promise<void> {
  // Always update cache immediately (synchronous)
  logPositionsCache = positions;

  // If a save is in progress, wait for it to complete
  // then the latest cache state will be saved
  if (saveInProgress !== null) {
    await saveInProgress;
  }

  // Start new save operation with lock
  saveInProgress = (async () => {
    try {
      const dir = dirname(LOG_POSITIONS_FILE);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      // Always write the current cache state (may include updates from other calls)
      await writeFile(LOG_POSITIONS_FILE, JSON.stringify(logPositionsCache, null, 2));
    } catch {
      // Ignore write errors
    }
  })();

  try {
    await saveInProgress;
  } finally {
    saveInProgress = null;
  }
}

/**
 * Get log position for a node.
 */
async function getLogPosition(nodeId: string): Promise<{ filePath: string; offset: number } | null> {
  const positions = await loadLogPositions();
  const entry = positions[nodeId];
  if (!entry) return null;
  return { filePath: entry.filePath, offset: entry.offset };
}

/**
 * Update log position for a node.
 */
async function updateLogPosition(nodeId: string, filePath: string, offset: number): Promise<void> {
  const positions = await loadLogPositions();
  positions[nodeId] = {
    filePath,
    offset,
    lastRead: new Date().toISOString(),
  };
  await saveLogPositions(positions);
}

// =============================================================================
// Log Parsing Functions
// =============================================================================

/**
 * Regex pattern for pglogical conflict log entries.
 *
 * Supports both quoted and unquoted identifiers:
 * - Unquoted: public.users
 * - Quoted: "my-schema"."my-table"
 * - Mixed: public."my-table"
 *
 * Example log lines:
 * "CONFLICT: remote INSERT on relation public.users; ... update_update apply_remote"
 * "CONFLICT: remote UPDATE on relation "my-schema"."users"; ... insert_insert keep_local"
 *
 * Capture groups:
 * 1: operation (INSERT/UPDATE/DELETE)
 * 2: quoted schema name (if quoted) or undefined
 * 3: unquoted schema name (if unquoted) or undefined
 * 4: quoted table name (if quoted) or undefined
 * 5: unquoted table name (if unquoted) or undefined
 * 6: conflict type (insert_insert, update_update, etc.)
 * 7: resolution (apply_remote, keep_local, skip)
 */
const CONFLICT_LOG_PATTERN = /CONFLICT:\s+remote\s+(\w+)\s+on\s+relation\s+(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_$]*))\s*\.\s*(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_$]*)).*?(\w+_\w+)\s+(apply_remote|keep_local|skip)/gi;

/**
 * Parse conflict entries from PostgreSQL csvlog content.
 *
 * @param content - Raw log file content
 * @param nodeId - Node identifier for generated events
 * @returns Array of parsed conflict events
 */
export function parseConflictLog(
  content: string,
  nodeId: string
): ConflictEvent[] {
  const events: ConflictEvent[] = [];
  let eventId = 0;

  // Split by newlines and process each line
  const lines = content.split('\n');

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Try to extract timestamp from CSV format (first field)
    let timestamp: Date;
    try {
      const csvMatch = line.match(/^"?(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)/);
      timestamp = csvMatch && csvMatch[1] ? new Date(csvMatch[1]) : new Date();
    } catch {
      timestamp = new Date();
    }

    // Look for conflict patterns in the line
    let match: RegExpExecArray | null;
    CONFLICT_LOG_PATTERN.lastIndex = 0;

    while ((match = CONFLICT_LOG_PATTERN.exec(line)) !== null) {
      // Extract capture groups (see pattern documentation above)
      const [, operation, quotedSchema, unquotedSchema, quotedTable, unquotedTable, conflictTypeStr, resolutionStr] = match;

      // Use quoted name if available, otherwise unquoted
      const schemaName = quotedSchema ?? unquotedSchema ?? 'unknown';
      const tableName = quotedTable ?? unquotedTable ?? 'unknown';

      // Map operation to conflict type
      let conflictType: ConflictType;
      const opLower = operation?.toLowerCase() ?? '';
      const typeStrLower = conflictTypeStr?.toLowerCase() ?? '';

      if (typeStrLower.includes('insert_insert')) {
        conflictType = 'insert_insert';
      } else if (typeStrLower.includes('update_update')) {
        conflictType = 'update_update';
      } else if (typeStrLower.includes('update_delete')) {
        conflictType = 'update_delete';
      } else if (typeStrLower.includes('delete_delete')) {
        conflictType = 'delete_delete';
      } else if (opLower === 'insert') {
        conflictType = 'insert_insert';
      } else if (opLower === 'delete') {
        conflictType = 'delete_delete';
      } else {
        conflictType = 'update_update';
      }

      // Parse resolution
      const resolution = parseResolution(resolutionStr ?? 'apply_remote');

      eventId++;
      events.push({
        id: `${nodeId}:log:${eventId}`,
        nodeId,
        recordedAt: timestamp,
        subscriptionName: null, // Not available in log
        conflictType,
        resolution,
        schemaName,
        tableName,
        indexName: null,
        localTuple: null, // Not available in log
        remoteTuple: null, // Not available in log
        localCommitTs: null,
        remoteCommitTs: null,
        remoteLsn: null,
        source: 'log',
      });
    }
  }

  return events;
}

/**
 * Read log file from local filesystem.
 *
 * @param filePath - Path to log file
 * @param offset - Byte offset to start reading from
 * @returns Log content and new offset
 */
export async function readLogFile(
  filePath: string,
  offset: number = 0
): Promise<{ content: string; newOffset: number }> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const contentFromOffset = content.slice(offset);
    const newOffset = content.length;

    return {
      content: contentFromOffset.slice(0, MAX_LOG_READ_BYTES),
      newOffset,
    };
  } catch {
    return { content: '', newOffset: offset };
  }
}

/**
 * Read log file from PostgreSQL server using pg_read_file().
 *
 * @param queryFn - Query execution function
 * @param logDirectory - PostgreSQL log directory (or null to auto-detect)
 * @param offset - Byte offset to start reading from
 * @returns Log content and new offset
 */
export async function readLogFileRemote(
  queryFn: QueryFn,
  logDirectory: string | null,
  offset: number = 0
): Promise<{ content: string; newOffset: number; filePath: string }> {
  try {
    // Get current log file path
    const logFileRows = await queryFn<LogFileRow>(GET_LOG_FILE_QUERY);
    const logFile = logFileRows[0]?.logfile;

    if (!logFile) {
      return { content: '', newOffset: offset, filePath: '' };
    }

    // Construct full path
    const filePath = logDirectory ? join(logDirectory, logFile) : logFile;

    // Read file content from offset
    const rows = await queryFn<ReadFileRow>(READ_LOG_FILE_QUERY, [
      filePath,
      offset,
      MAX_LOG_READ_BYTES,
    ]);

    const content = rows[0]?.content ?? '';
    const newOffset = offset + content.length;

    return { content, newOffset, filePath };
  } catch {
    return { content: '', newOffset: offset, filePath: '' };
  }
}

/**
 * Query conflicts from PostgreSQL log file.
 *
 * @param nodeId - Node identifier
 * @param queryFn - Query execution function
 * @param logConfig - Log file configuration
 * @returns Array of ConflictEvent for this node
 */
export async function queryConflictLog(
  nodeId: string,
  queryFn: QueryFn,
  logConfig: LogFileConfig
): Promise<ConflictEvent[]> {
  try {
    // Get last position
    const lastPosition = await getLogPosition(nodeId);
    const startOffset = lastPosition?.offset ?? 0;

    let content: string;
    let newOffset: number;
    let filePath: string;

    if (logConfig.localPath) {
      // Local file access
      const result = await readLogFile(logConfig.localPath, startOffset);
      content = result.content;
      newOffset = result.newOffset;
      filePath = logConfig.localPath;
    } else if (logConfig.useRemoteRead) {
      // Remote access via pg_read_file
      const result = await readLogFileRemote(
        queryFn,
        logConfig.logDirectory ?? null,
        startOffset
      );
      content = result.content;
      newOffset = result.newOffset;
      filePath = result.filePath;
    } else {
      // No log access configured
      return [];
    }

    // Handle log rotation (file path changed)
    if (lastPosition && lastPosition.filePath !== filePath) {
      // New log file, start from beginning
      if (logConfig.localPath) {
        const result = await readLogFile(logConfig.localPath, 0);
        content = result.content;
        newOffset = result.newOffset;
      } else if (logConfig.useRemoteRead) {
        const result = await readLogFileRemote(
          queryFn,
          logConfig.logDirectory ?? null,
          0
        );
        content = result.content;
        newOffset = result.newOffset;
      }
    }

    // Parse conflicts from content
    const events = parseConflictLog(content, nodeId);

    // Update position
    if (filePath) {
      await updateLogPosition(nodeId, filePath, newOffset);
    }

    return events;
  } catch {
    return [];
  }
}

// =============================================================================
// Query Module Functions
// =============================================================================

/**
 * Detect the best available conflict data source for a node.
 *
 * Detection logic:
 * 1. Check for pglogical.conflict_history table existence
 * 2. Check pglogical.conflict_history_enabled GUC
 * 3. If both true → source = 'history'
 * 4. If log config provided → source = 'log'
 * 5. Otherwise → source = 'unavailable'
 *
 * @param nodeId - Node identifier
 * @param queryFn - Query execution function from ConnectionManager
 * @param logConfig - Optional log file configuration for fallback
 * @returns The available source type
 */
export async function detectSource(
  _nodeId: string,
  queryFn: QueryFn,
  logConfig?: LogFileConfig
): Promise<ConflictSource> {
  try {
    const rows = await queryFn<SourceDetectionRow>(DETECT_SOURCE_QUERY);
    const row = rows[0];

    if (row && row.table_exists && row.is_enabled) {
      return 'history';
    }

    // Fall back to log if configured
    if (logConfig && (logConfig.localPath || logConfig.useRemoteRead)) {
      return 'log';
    }

    return 'unavailable';
  } catch {
    // Query failed - pglogical may not be installed
    // Fall back to log if configured
    if (logConfig && (logConfig.localPath || logConfig.useRemoteRead)) {
      return 'log';
    }
    return 'unavailable';
  }
}

/**
 * Query conflicts from pglogical.conflict_history table.
 *
 * @param nodeId - Node identifier
 * @param queryFn - Query execution function
 * @param limit - Maximum number of conflicts to return
 * @returns Array of ConflictEvent for this node
 */
export async function queryConflictHistory(
  nodeId: string,
  queryFn: QueryFn,
  limit: number = DEFAULT_CONFLICT_LIMIT
): Promise<ConflictEvent[]> {
  try {
    const rows = await queryFn<ConflictHistoryRow>(CONFLICT_HISTORY_QUERY, [limit]);
    return rows.map((row) => transformHistoryRow(nodeId, row));
  } catch (error) {
    // Query failed - return empty array
    return [];
  }
}

/**
 * Execute conflicts query on a node using the appropriate source.
 *
 * @param nodeId - Node identifier
 * @param queryFn - Query execution function
 * @param source - Pre-detected source type
 * @param limit - Maximum number of conflicts to return
 * @param logConfig - Optional log file configuration for log source
 * @returns Array of ConflictEvent for this node
 */
export async function execute(
  nodeId: string,
  queryFn: QueryFn,
  source: ConflictSource,
  limit: number = DEFAULT_CONFLICT_LIMIT,
  logConfig?: LogFileConfig
): Promise<ConflictEvent[]> {
  switch (source) {
    case 'history':
      return queryConflictHistory(nodeId, queryFn, limit);
    case 'log':
      if (logConfig) {
        const events = await queryConflictLog(nodeId, queryFn, logConfig);
        return events.slice(0, limit);
      }
      return [];
    case 'unavailable':
    default:
      return [];
  }
}

/**
 * Combined query module export.
 */
export const pglogicalConflictsQueryModule = {
  detectSource,
  queryConflictHistory,
  queryConflictLog,
  parseConflictLog,
  readLogFile,
  readLogFileRemote,
  execute,
};
