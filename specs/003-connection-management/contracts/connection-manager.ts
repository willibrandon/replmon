/**
 * Connection Manager API Contracts
 *
 * This file defines the public TypeScript interfaces for the ConnectionManager service.
 * These contracts are the source of truth for implementation.
 *
 * Feature: 003-connection-management
 * Date: 2025-12-23
 */

import type { Pool } from 'pg';

// ============================================================================
// Enums
// ============================================================================

/**
 * Health status of a node connection.
 */
export type HealthStatusEnum =
  | 'connecting'    // Initial connection in progress
  | 'healthy'       // Connection active and responsive
  | 'unhealthy'     // Failed consecutive health checks (threshold reached)
  | 'reconnecting'  // Retrying connection with backoff
  | 'disconnected'; // Explicitly removed or shutdown

// ============================================================================
// Configuration Types
// ============================================================================

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

// ============================================================================
// Health Types
// ============================================================================

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

// ============================================================================
// Query Types
// ============================================================================

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

// ============================================================================
// Node Types
// ============================================================================

/**
 * Represents a managed PostgreSQL node.
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

// ============================================================================
// Event Types
// ============================================================================

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

// ============================================================================
// Configuration Types
// ============================================================================

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
// ConnectionManager Interface
// ============================================================================

/**
 * ConnectionManager public API.
 *
 * Manages pg-pool connections to multiple PostgreSQL nodes with health tracking,
 * parallel queries, dynamic node management, and graceful shutdown.
 */
export interface IConnectionManager {
  // -------------------------------------------------------------------------
  // Node Management
  // -------------------------------------------------------------------------

  /**
   * Add a new node to the connection manager.
   * Creates a connection pool and starts health monitoring.
   *
   * @param nodeId - Unique identifier for the node
   * @param config - Connection configuration
   * @throws Error if nodeId already exists
   */
  addNode(nodeId: string, config: NodeConnectionConfig): Promise<void>;

  /**
   * Remove a node from the connection manager.
   * Gracefully closes the connection pool.
   *
   * @param nodeId - Node identifier to remove
   * @throws Error if nodeId does not exist
   */
  removeNode(nodeId: string): Promise<void>;

  /**
   * Get a managed node by ID.
   *
   * @param nodeId - Node identifier
   * @returns ManagedNode or undefined if not found
   */
  getNode(nodeId: string): ManagedNode | undefined;

  /**
   * Get all managed nodes.
   *
   * @returns Array of all managed nodes
   */
  getAllNodes(): ManagedNode[];

  /**
   * Check if a node exists.
   *
   * @param nodeId - Node identifier
   * @returns true if node exists
   */
  hasNode(nodeId: string): boolean;

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------

  /**
   * Get health status for a specific node.
   *
   * @param nodeId - Node identifier
   * @returns HealthStatus or undefined if node not found
   */
  getHealth(nodeId: string): HealthStatus | undefined;

  /**
   * Get health status for all nodes.
   *
   * @returns Map of nodeId to HealthStatus
   */
  getAllHealth(): Map<string, HealthStatus>;

  /**
   * Get only healthy nodes.
   *
   * @returns Array of nodes with status='healthy'
   */
  getHealthyNodes(): ManagedNode[];

  // -------------------------------------------------------------------------
  // Pool Statistics
  // -------------------------------------------------------------------------

  /**
   * Get pool statistics for a specific node.
   *
   * @param nodeId - Node identifier
   * @returns PoolStats or undefined if node not found
   */
  getPoolStats(nodeId: string): PoolStats | undefined;

  /**
   * Get pool statistics for all nodes.
   *
   * @returns Array of PoolStats for all nodes
   */
  getAllPoolStats(): PoolStats[];

  // -------------------------------------------------------------------------
  // Querying
  // -------------------------------------------------------------------------

  /**
   * Execute a query on a specific node.
   *
   * @param nodeId - Node identifier
   * @param query - SQL query string
   * @param params - Query parameters
   * @returns Query result
   * @throws Error if node not found or query fails
   */
  query<T>(nodeId: string, query: string, params?: unknown[]): Promise<T[]>;

  /**
   * Execute a query on all nodes in parallel.
   * Returns results from all nodes, including failures.
   *
   * @param query - SQL query string
   * @param params - Query parameters
   * @returns Array of results from all nodes
   */
  queryAll<T>(query: string, params?: unknown[]): Promise<NodeQueryResult<T[]>[]>;

  /**
   * Execute a query on all healthy nodes in parallel.
   * Skips unhealthy nodes.
   *
   * @param query - SQL query string
   * @param params - Query parameters
   * @returns Array of results from healthy nodes
   */
  queryHealthy<T>(query: string, params?: unknown[]): Promise<NodeQueryResult<T[]>[]>;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Initialize the connection manager.
   * Connects to all configured nodes and starts health monitoring.
   *
   * @param nodes - Initial nodes to connect to
   */
  initialize(nodes: Array<{ id: string; config: NodeConnectionConfig }>): Promise<void>;

  /**
   * Gracefully shutdown all connections.
   * Waits for in-flight queries up to the configured timeout.
   */
  shutdown(): Promise<void>;

  /**
   * Check if the connection manager is running.
   */
  isRunning(): boolean;

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  /**
   * Subscribe to connection manager events.
   *
   * @param event - Event name
   * @param handler - Event handler function
   */
  on<K extends keyof ConnectionManagerEvents>(
    event: K,
    handler: (payload: ConnectionManagerEvents[K]) => void
  ): void;

  /**
   * Unsubscribe from connection manager events.
   *
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  off<K extends keyof ConnectionManagerEvents>(
    event: K,
    handler: (payload: ConnectionManagerEvents[K]) => void
  ): void;
}
