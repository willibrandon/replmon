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
 * Check if an identifier is a PostgreSQL reserved word.
 * This is a subset of the most commonly conflicting reserved words.
 */
function isReservedWord(word: string): boolean {
  const reservedWords = new Set([
    'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc',
    'asymmetric', 'authorization', 'binary', 'both', 'case', 'cast',
    'check', 'collate', 'collation', 'column', 'concurrently', 'constraint',
    'create', 'cross', 'current_catalog', 'current_date', 'current_role',
    'current_schema', 'current_time', 'current_timestamp', 'current_user',
    'default', 'deferrable', 'desc', 'distinct', 'do', 'else', 'end',
    'except', 'false', 'fetch', 'for', 'foreign', 'freeze', 'from', 'full',
    'grant', 'group', 'having', 'ilike', 'in', 'initially', 'inner', 'intersect',
    'into', 'is', 'isnull', 'join', 'lateral', 'leading', 'left', 'like',
    'limit', 'localtime', 'localtimestamp', 'natural', 'not', 'notnull',
    'null', 'offset', 'on', 'only', 'or', 'order', 'outer', 'overlaps',
    'placing', 'primary', 'references', 'returning', 'right', 'select',
    'session_user', 'similar', 'some', 'symmetric', 'table', 'tablesample',
    'then', 'to', 'trailing', 'true', 'union', 'unique', 'user', 'using',
    'variadic', 'verbose', 'when', 'where', 'window', 'with',
  ]);
  return reservedWords.has(word.toLowerCase());
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
