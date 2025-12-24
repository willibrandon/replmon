/**
 * pglogical Detection Module
 *
 * Detects whether pglogical extension is installed on each PostgreSQL node.
 * Results are cached per-node for the session lifetime to avoid repeated queries.
 *
 * Detection Strategy:
 * 1. Primary: Check pg_extension table for 'pglogical' extension
 * 2. Fallback: Check pg_namespace for 'pglogical' schema
 */

import type { PglogicalDetectionResult, QueryFn } from './types.js';

/** Query to check if pglogical extension is installed */
const EXTENSION_CHECK_QUERY = `
SELECT
  extname,
  extversion
FROM pg_extension
WHERE extname = 'pglogical'
`;

/** Fallback query to check if pglogical schema exists */
const SCHEMA_CHECK_QUERY = `
SELECT EXISTS(
  SELECT 1 FROM pg_namespace WHERE nspname = 'pglogical'
) AS has_schema
`;

/** Row type for extension check query */
interface ExtensionRow {
  extname: string;
  extversion: string;
}

/** Row type for schema check query */
interface SchemaRow {
  has_schema: boolean;
}

/**
 * Cached detection results per node.
 * Key: nodeId, Value: detection result
 */
const detectionCache = new Map<string, PglogicalDetectionResult>();

/**
 * Detect whether pglogical is installed on a node.
 * Uses cached result if available.
 *
 * @param nodeId - Node identifier
 * @param queryFn - Query execution function
 * @returns Detection result with pglogical status and version
 */
export async function detectPglogical(
  nodeId: string,
  queryFn: QueryFn
): Promise<PglogicalDetectionResult> {
  // Return cached result if available
  const cached = detectionCache.get(nodeId);
  if (cached) {
    return cached;
  }

  const result = await performDetection(nodeId, queryFn);
  detectionCache.set(nodeId, result);
  return result;
}

/**
 * Perform the actual pglogical detection.
 * Tries extension check first, falls back to schema check.
 */
async function performDetection(
  nodeId: string,
  queryFn: QueryFn
): Promise<PglogicalDetectionResult> {
  const detectedAt = new Date();

  try {
    // Primary detection: check pg_extension
    const extensionRows = await queryFn<ExtensionRow>(EXTENSION_CHECK_QUERY);

    const extensionRow = extensionRows[0];
    if (extensionRow) {
      return {
        nodeId,
        hasPglogical: true,
        version: extensionRow.extversion,
        detectedAt,
      };
    }

    // Extension not found, try fallback schema check
    // This handles edge cases where extension metadata is missing
    const schemaRows = await queryFn<SchemaRow>(SCHEMA_CHECK_QUERY);
    const schemaRow = schemaRows[0];

    if (schemaRow?.has_schema) {
      return {
        nodeId,
        hasPglogical: true,
        version: null, // Unknown version when detected via schema only
        detectedAt,
      };
    }

    // pglogical not detected
    return {
      nodeId,
      hasPglogical: false,
      version: null,
      detectedAt,
    };
  } catch (err) {
    // If detection fails, assume no pglogical to avoid blocking queries
    // This is a safe default - native replication queries work everywhere
    return {
      nodeId,
      hasPglogical: false,
      version: null,
      detectedAt,
    };
  }
}

/**
 * Check if a node has cached pglogical detection.
 *
 * @param nodeId - Node identifier
 * @returns true if detection result is cached
 */
export function hasDetectionCached(nodeId: string): boolean {
  return detectionCache.has(nodeId);
}

/**
 * Get cached detection result for a node.
 *
 * @param nodeId - Node identifier
 * @returns Cached result or undefined
 */
export function getCachedDetection(
  nodeId: string
): PglogicalDetectionResult | undefined {
  return detectionCache.get(nodeId);
}

/**
 * Clear cached detection for a specific node.
 * Use when a node is removed or needs re-detection.
 *
 * @param nodeId - Node identifier
 */
export function clearNodeCache(nodeId: string): void {
  detectionCache.delete(nodeId);
}

/**
 * Clear all cached detection results.
 * Use during shutdown or full reset.
 */
export function clearAllCache(): void {
  detectionCache.clear();
}

/**
 * Get all cached detection results.
 *
 * @returns Map of nodeId to detection results
 */
export function getAllCachedDetections(): Map<string, PglogicalDetectionResult> {
  return new Map(detectionCache);
}
