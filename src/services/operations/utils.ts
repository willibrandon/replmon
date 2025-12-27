/**
 * Shared Operation Utilities
 *
 * Common helper functions for operation result creation and error handling.
 * Used by all operation services to ensure consistent behavior.
 *
 * Feature: 013-operations-modal
 */

import type { OperationResult, OperationContext } from '../../types/operations.js';

// =============================================================================
// Result Builders
// =============================================================================

/**
 * Create a successful operation result.
 */
export function createSuccessResult(
  operationId: string,
  context: OperationContext,
  message: string,
  durationMs: number
): OperationResult {
  return {
    id: crypto.randomUUID(),
    operationId,
    context,
    status: 'success',
    message,
    error: null,
    remediationHint: null,
    timestamp: new Date(),
    durationMs,
  };
}

/**
 * Create a failure operation result with remediation hint.
 */
export function createFailureResult(
  operationId: string,
  context: OperationContext,
  error: string,
  durationMs: number
): OperationResult {
  return {
    id: crypto.randomUUID(),
    operationId,
    context,
    status: 'failure',
    message: 'Operation failed',
    error,
    remediationHint: getRemediationHint(error),
    timestamp: new Date(),
    durationMs,
  };
}

/**
 * Create a timeout operation result.
 */
export function createTimeoutResult(
  operationId: string,
  context: OperationContext,
  durationMs: number
): OperationResult {
  return {
    id: crypto.randomUUID(),
    operationId,
    context,
    status: 'timeout',
    message: 'Operation timed out',
    error: `Operation exceeded ${durationMs}ms timeout`,
    remediationHint: 'The operation took too long. Retry or consider increasing the timeout.',
    timestamp: new Date(),
    durationMs,
  };
}

// =============================================================================
// Remediation Hints
// =============================================================================

/**
 * Error pattern to remediation hint mapping.
 * Centralized error handling for consistent user guidance.
 */
const REMEDIATION_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  hint: string;
}> = [
  {
    pattern: /permission denied/i,
    hint: 'Check that the PostgreSQL role has SUPERUSER or replication privileges.',
  },
  {
    pattern: /connection refused|could not connect/i,
    hint: 'Verify the node is reachable and PostgreSQL is running.',
  },
  {
    pattern: /does not exist/i,
    hint: 'The resource may have been dropped. Refresh the view to update.',
  },
  {
    pattern: /already exists/i,
    hint: 'A resource with this name already exists. Choose a different name.',
  },
  {
    pattern: /already enabled|already disabled/i,
    hint: 'The subscription is already in the requested state.',
  },
  {
    pattern: /is active|slot is active/i,
    hint: 'Terminate active connections using this slot before dropping it.',
  },
  {
    pattern: /invalid slot name/i,
    hint: 'Slot names must contain only lowercase letters, numbers, and underscores.',
  },
  {
    pattern: /timeout|statement timeout/i,
    hint: 'The operation took too long. Retry or consider increasing the timeout.',
  },
  {
    pattern: /relation.*does not exist/i,
    hint: 'The table does not exist or is not part of this subscription.',
  },
  {
    pattern: /pglogical.*not.*available|not.*pglogical/i,
    hint: 'This feature requires pglogical extension to be installed.',
  },
  {
    pattern: /conflict_history.*does not exist/i,
    hint: 'The pglogical.conflict_history table does not exist. This may not be a pglogical node.',
  },
  {
    pattern: /truncate/i,
    hint: 'Check that the PostgreSQL role has TRUNCATE permission on the table.',
  },
];

/**
 * Get remediation hint based on error message patterns.
 * Returns null if no matching pattern is found.
 */
export function getRemediationHint(errorMessage: string): string | null {
  for (const { pattern, hint } of REMEDIATION_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return hint;
    }
  }
  return null;
}

// =============================================================================
// SQL Utilities
// =============================================================================

/**
 * Quote a PostgreSQL identifier for safe use in SQL statements.
 *
 * This handles identifiers that need quoting due to:
 * - Containing special characters
 * - Being reserved words
 * - Containing uppercase characters
 *
 * Note: For operations using DDL (ALTER SUBSCRIPTION, etc.) we cannot use
 * parameterized queries for identifiers. This function provides safe quoting
 * similar to PostgreSQL's quote_ident().
 *
 * @param identifier - The identifier to quote
 * @returns Safely quoted identifier
 */
export function quoteIdent(identifier: string): string {
  // Empty identifier is invalid
  if (!identifier) {
    throw new Error('Identifier cannot be empty');
  }

  // Check if identifier is a simple lowercase identifier that doesn't need quoting
  // PostgreSQL folds unquoted identifiers to lowercase
  if (/^[a-z_][a-z0-9_]*$/.test(identifier) && !isReservedWord(identifier)) {
    return identifier;
  }

  // Escape double quotes by doubling them, then wrap in double quotes
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Complete list of PostgreSQL reserved words from PostgreSQL 17 documentation.
 * Includes all reserved words (reserved, reserved for type/function names,
 * and can be function/type names but requires AS for column labels).
 *
 * Source: https://www.postgresql.org/docs/17/sql-keywords-appendix.html
 *
 * These words cannot be used as unquoted identifiers in PostgreSQL and
 * must be quoted with double quotes when used as identifiers.
 */
const POSTGRESQL_RESERVED_WORDS = new Set([
  // A
  'abort', 'absolute', 'access', 'action', 'add', 'admin', 'after', 'aggregate',
  'all', 'also', 'alter', 'always', 'analyse', 'analyze', 'and', 'any', 'array',
  'as', 'asc', 'asensitive', 'assertion', 'assignment', 'asymmetric', 'at',
  'atomic', 'attach', 'attribute', 'authorization',
  // B
  'backward', 'before', 'begin', 'between', 'bigint', 'binary', 'bit', 'boolean',
  'both', 'breadth', 'by',
  // C
  'cache', 'call', 'called', 'cascade', 'cascaded', 'case', 'cast', 'catalog',
  'chain', 'char', 'character', 'characteristics', 'check', 'checkpoint', 'class',
  'close', 'cluster', 'coalesce', 'collate', 'collation', 'column', 'columns',
  'comment', 'comments', 'commit', 'committed', 'compression', 'concurrently',
  'condition', 'configuration', 'conflict', 'connect', 'connection', 'constraint',
  'constraints', 'content', 'continue', 'conversion', 'copy', 'cost', 'create',
  'cross', 'csv', 'cube', 'current', 'current_catalog', 'current_date',
  'current_role', 'current_schema', 'current_time', 'current_timestamp',
  'current_user', 'cursor', 'cycle',
  // D
  'data', 'database', 'day', 'deallocate', 'dec', 'decimal', 'declare', 'default',
  'defaults', 'deferrable', 'deferred', 'definer', 'delete', 'delimiter',
  'delimiters', 'depends', 'depth', 'desc', 'detach', 'dictionary', 'disable',
  'discard', 'distinct', 'do', 'document', 'domain', 'double', 'drop',
  // E
  'each', 'else', 'enable', 'encoding', 'encrypted', 'end', 'enum', 'escape',
  'event', 'except', 'exclude', 'excluding', 'exclusive', 'execute', 'exists',
  'explain', 'expression', 'extension', 'external', 'extract',
  // F
  'false', 'family', 'fetch', 'filter', 'finalize', 'first', 'float', 'following',
  'for', 'force', 'foreign', 'format', 'forward', 'freeze', 'from', 'full',
  'function', 'functions',
  // G
  'generated', 'global', 'grant', 'granted', 'greatest', 'group', 'grouping',
  'groups',
  // H
  'handler', 'having', 'header', 'hold', 'hour',
  // I
  'identity', 'if', 'ilike', 'immediate', 'immutable', 'implicit', 'import', 'in',
  'include', 'including', 'increment', 'indent', 'index', 'indexes', 'inherit',
  'inherits', 'initially', 'inline', 'inner', 'inout', 'input', 'insensitive',
  'insert', 'instead', 'int', 'integer', 'intersect', 'interval', 'into',
  'invoker', 'is', 'isnull', 'isolation',
  // J
  'join', 'json', 'json_array', 'json_arrayagg', 'json_exists', 'json_object',
  'json_objectagg', 'json_query', 'json_scalar', 'json_serialize', 'json_table',
  'json_value',
  // K
  'key', 'keys',
  // L
  'label', 'language', 'large', 'last', 'lateral', 'leading', 'leakproof', 'least',
  'left', 'level', 'like', 'limit', 'listen', 'load', 'local', 'localtime',
  'localtimestamp', 'location', 'lock', 'locked', 'logged',
  // M
  'mapping', 'match', 'matched', 'materialized', 'maxvalue', 'merge', 'method',
  'minute', 'minvalue', 'mode', 'modifies', 'month', 'move',
  // N
  'name', 'names', 'national', 'natural', 'nchar', 'nested', 'new', 'next', 'nfc',
  'nfd', 'nfkc', 'nfkd', 'no', 'none', 'normalize', 'normalized', 'not', 'nothing',
  'notify', 'notnull', 'nowait', 'null', 'nullif', 'nulls', 'numeric',
  // O
  'object', 'of', 'off', 'offset', 'oids', 'old', 'on', 'only', 'operator',
  'option', 'options', 'or', 'order', 'ordinality', 'others', 'out', 'outer',
  'over', 'overlaps', 'overlay', 'overriding', 'owned', 'owner',
  // P
  'parallel', 'parameter', 'parser', 'partial', 'partition', 'passing', 'password',
  'path', 'placing', 'plan', 'plans', 'policy', 'position', 'preceding', 'precision',
  'prepare', 'prepared', 'preserve', 'primary', 'prior', 'privileges', 'procedural',
  'procedure', 'procedures', 'program', 'publication',
  // Q
  'quote', 'quotes',
  // R
  'range', 'read', 'reads', 'real', 'reassign', 'recheck', 'recursive', 'ref',
  'references', 'referencing', 'refresh', 'reindex', 'relative', 'release',
  'rename', 'repeatable', 'replace', 'replica', 'reset', 'restart', 'restrict',
  'return', 'returning', 'returns', 'revoke', 'right', 'role', 'rollback', 'rollup',
  'routine', 'routines', 'row', 'rows', 'rule',
  // S
  'savepoint', 'scalar', 'schema', 'schemas', 'scroll', 'search', 'second',
  'security', 'select', 'sequence', 'sequences', 'serializable', 'server',
  'session', 'session_user', 'set', 'setof', 'sets', 'share', 'show', 'similar',
  'simple', 'skip', 'smallint', 'snapshot', 'some', 'source', 'sql', 'stable',
  'standalone', 'start', 'statement', 'statistics', 'stdin', 'stdout', 'storage',
  'stored', 'strict', 'string', 'strip', 'subscription', 'substring', 'support',
  'symmetric', 'sysid', 'system', 'system_user',
  // T
  'table', 'tables', 'tablesample', 'tablespace', 'target', 'temp', 'template',
  'temporary', 'text', 'then', 'ties', 'time', 'timestamp', 'to', 'trailing',
  'transaction', 'transform', 'treat', 'trigger', 'trim', 'true', 'truncate',
  'trusted', 'type', 'types',
  // U
  'uescape', 'unbounded', 'uncommitted', 'unconditional', 'unencrypted', 'union',
  'unique', 'unknown', 'unlisten', 'unlogged', 'until', 'update', 'user', 'using',
  // V
  'vacuum', 'valid', 'validate', 'validator', 'value', 'values', 'varchar',
  'variadic', 'varying', 'verbose', 'version', 'view', 'views', 'volatile',
  // W
  'when', 'where', 'whitespace', 'window', 'with', 'within', 'without', 'work',
  'wrapper', 'write',
  // X
  'xml', 'xmlagg', 'xmlattributes', 'xmlconcat', 'xmlelement', 'xmlexists',
  'xmlforest', 'xmlnamespaces', 'xmlparse', 'xmlpi', 'xmlroot', 'xmlserialize',
  'xmltable',
  // Y
  'year', 'yes',
  // Z
  'zone',
]);

/**
 * Check if an identifier is a PostgreSQL reserved word.
 * Uses the complete PostgreSQL 17 reserved word list.
 */
function isReservedWord(word: string): boolean {
  return POSTGRESQL_RESERVED_WORDS.has(word.toLowerCase());
}

// =============================================================================
// Error Normalization
// =============================================================================

/**
 * Normalize an unknown error into a consistent format.
 */
export function normalizeError(err: unknown): { message: string; error: Error } {
  if (err instanceof Error) {
    return { message: err.message, error: err };
  }
  const message = String(err);
  return { message, error: new Error(message) };
}
