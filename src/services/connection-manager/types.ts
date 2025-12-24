/**
 * Connection Manager Types
 *
 * Core type definitions for the ConnectionManager service.
 * Based on contracts/connection-manager.ts specification.
 */

/**
 * Health status of a node connection.
 */
export type HealthStatusEnum =
  | 'connecting'    // Initial connection in progress
  | 'healthy'       // Connection active and responsive
  | 'unhealthy'     // Failed consecutive health checks (threshold reached)
  | 'reconnecting'  // Retrying connection with backoff
  | 'disconnected'; // Explicitly removed or shutdown

/**
 * SSL/TLS configuration for PostgreSQL connection.
 */
export interface SSLConfig {
  /** Enable SSL/TLS connection */
  enabled: boolean;
  /** Verify server certificate (default: true) */
  rejectUnauthorized?: boolean;
  /** CA certificate - path or PEM content */
  ca?: string;
  /** Client certificate - path or PEM content */
  cert?: string;
  /** Client private key - path or PEM content */
  key?: string;
}

/**
 * Connection pool configuration.
 */
export interface PoolConfig {
  /** Minimum connections to maintain (default: 1) */
  min?: number;
  /** Maximum connections allowed (default: 10) */
  max?: number;
  /** Idle connection timeout in ms (default: 30000) */
  idleTimeoutMs?: number;
  /** Connection establishment timeout in ms (default: 5000) */
  connectionTimeoutMs?: number;
}

/**
 * Full connection configuration for a PostgreSQL node.
 */
export interface NodeConnectionConfig {
  /** PostgreSQL host address */
  host: string;
  /** PostgreSQL port (default: 5432) */
  port: number;
  /** Database name */
  database: string;
  /** Database user */
  user: string;
  /** Database password (can use env var interpolation) */
  password?: string;
  /** Display name for the node */
  name?: string;
  /** SSL/TLS configuration */
  ssl?: SSLConfig;
  /** Pool configuration */
  pool?: PoolConfig;
}

/**
 * Health status of a single node.
 */
export interface HealthStatus {
  /** Current health status */
  status: HealthStatusEnum;
  /** Timestamp of last health check */
  lastCheckTime: Date;
  /** Timestamp of last successful health check */
  lastSuccessTime?: Date;
  /** Count of consecutive health check failures */
  consecutiveFailures: number;
  /** Current retry attempt (0 when healthy) */
  retryAttempt: number;
  /** When next retry will occur (during reconnection) */
  nextRetryTime?: Date;
  /** Last error message if unhealthy */
  lastError?: string;
  /** Last health check latency in ms */
  latencyMs?: number;
}

/**
 * Connection pool statistics for a node.
 */
export interface PoolStats {
  /** Node identifier */
  nodeId: string;
  /** Total clients in pool */
  totalConnections: number;
  /** Idle clients available */
  idleConnections: number;
  /** Queued requests waiting for client */
  waitingRequests: number;
}

/**
 * Result from a query on a single node.
 */
export interface NodeQueryResult<T> {
  /** Node identifier */
  nodeId: string;
  /** Whether query succeeded */
  success: boolean;
  /** Query result data (when success=true) */
  data?: T;
  /** Error details (when success=false) */
  error?: Error;
  /** Query execution time in ms */
  durationMs: number;
}

/**
 * Represents a managed PostgreSQL node (public interface).
 */
export interface ManagedNode {
  /** Unique node identifier */
  id: string;
  /** Display name */
  name: string;
  /** Connection configuration */
  config: NodeConnectionConfig;
  /** Current health status */
  health: HealthStatus;
}

/**
 * Events emitted by ConnectionManager.
 */
export interface ConnectionManagerEvents {
  /** Node connected successfully */
  'node:connected': { nodeId: string };
  /** Node disconnected (error or removed) */
  'node:disconnected': { nodeId: string; error?: Error };
  /** Node health status changed */
  'node:health': { nodeId: string; status: HealthStatus };
  /** New node added */
  'node:added': { nodeId: string };
  /** Node removed */
  'node:removed': { nodeId: string };
  /** Pool stats updated */
  'pool:stats': { nodeId: string; stats: PoolStats };
}

/**
 * ConnectionManager configuration options.
 */
export interface ConnectionManagerConfig {
  /** Health check interval in ms (default: 5000) */
  healthCheckIntervalMs?: number;
  /** Consecutive failures before marking unhealthy (default: 3) */
  unhealthyThreshold?: number;
  /** Graceful shutdown timeout in ms (default: 10000) */
  shutdownTimeoutMs?: number;
  /** Query timeout in ms for parallel queries (default: 30000) */
  queryTimeoutMs?: number;
}

// ============================================================================
// Internal Types (not exported from index.ts)
// ============================================================================

import type { Pool } from 'pg';

/**
 * Internal node representation with Pool instance.
 * Extends ManagedNode with the actual pg-pool reference.
 * This type is internal and should NOT be exported from the module.
 */
export interface InternalNode extends ManagedNode {
  /** pg-pool instance for this node */
  pool: Pool;
}
