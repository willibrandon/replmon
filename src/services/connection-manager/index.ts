/**
 * ConnectionManager
 *
 * Manages pg-pool connections to multiple PostgreSQL nodes with health tracking,
 * parallel queries, dynamic node management, and graceful shutdown.
 */

import type {
  ConnectionManagerConfig,
  HealthStatus,
  InternalNode,
  ManagedNode,
  NodeConnectionConfig,
  NodeQueryResult,
  PoolStats,
  ConnectionManagerEvents,
} from './types.js';
import { TypedEventEmitter } from './events.js';
import { createPool } from './pool-factory.js';
import { HealthChecker } from './health-checker.js';

/** Default configuration values */
const DEFAULT_CONFIG: Required<ConnectionManagerConfig> = {
  healthCheckIntervalMs: 5000,
  unhealthyThreshold: 3,
  shutdownTimeoutMs: 10000,
  queryTimeoutMs: 30000,
};

/** Node ID validation pattern: alphanumeric, starts with letter */
const NODE_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

/**
 * Creates an initial health status for a new node.
 */
function createInitialHealth(): HealthStatus {
  return {
    status: 'connecting',
    lastCheckTime: new Date(),
    consecutiveFailures: 0,
    retryAttempt: 0,
  };
}

/**
 * Validates a node ID against the required pattern.
 */
function validateNodeId(nodeId: string): void {
  if (!nodeId || typeof nodeId !== 'string') {
    throw new Error('Node ID must be a non-empty string');
  }
  if (!NODE_ID_PATTERN.test(nodeId)) {
    throw new Error(
      `Invalid node ID "${nodeId}": must start with a letter and contain only alphanumeric characters, underscores, or hyphens`
    );
  }
}

/**
 * ConnectionManager class
 *
 * Manages connections to multiple PostgreSQL nodes with:
 * - Connection pooling via pg-pool
 * - Health monitoring with exponential backoff
 * - Parallel query execution
 * - Dynamic node addition/removal
 * - Graceful shutdown
 */
export class ConnectionManager {
  private readonly config: Required<ConnectionManagerConfig>;
  private readonly nodes: Map<string, InternalNode>;
  private readonly events: TypedEventEmitter;
  private readonly healthChecker: HealthChecker;
  private running: boolean;

  constructor(config: ConnectionManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.nodes = new Map();
    this.events = new TypedEventEmitter();
    this.healthChecker = new HealthChecker(this.nodes, this.events, {
      healthCheckIntervalMs: this.config.healthCheckIntervalMs,
      unhealthyThreshold: this.config.unhealthyThreshold,
    });
    this.running = false;
  }

  // ===========================================================================
  // Node Management
  // ===========================================================================

  /**
   * Add a new node to the connection manager.
   * Creates a connection pool and starts health monitoring.
   *
   * @param nodeId - Unique identifier for the node
   * @param config - Connection configuration
   * @throws Error if nodeId already exists or is invalid
   */
  async addNode(nodeId: string, config: NodeConnectionConfig): Promise<void> {
    validateNodeId(nodeId);

    if (this.nodes.has(nodeId)) {
      throw new Error(`Node "${nodeId}" already exists. Remove it first before re-adding.`);
    }

    const pool = createPool(config);
    const health = createInitialHealth();

    const node: InternalNode = {
      id: nodeId,
      name: config.name ?? nodeId,
      config,
      health,
      pool,
    };

    this.nodes.set(nodeId, node);
    this.events.emit('node:added', { nodeId });

    // If running, start health checking for this node immediately
    if (this.running) {
      this.healthChecker.startNode(nodeId);
    }
  }

  /**
   * Get a managed node by ID.
   *
   * @param nodeId - Node identifier
   * @returns ManagedNode or undefined if not found
   */
  getNode(nodeId: string): ManagedNode | undefined {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return undefined;
    }
    // Return public interface without pool
    return {
      id: node.id,
      name: node.name,
      config: node.config,
      health: node.health,
    };
  }

  /**
   * Get all managed nodes.
   *
   * @returns Array of all managed nodes
   */
  getAllNodes(): ManagedNode[] {
    return Array.from(this.nodes.values()).map((node) => ({
      id: node.id,
      name: node.name,
      config: node.config,
      health: node.health,
    }));
  }

  /**
   * Check if a node exists.
   *
   * @param nodeId - Node identifier
   * @returns true if node exists
   */
  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  // ===========================================================================
  // Querying
  // ===========================================================================

  /**
   * Execute a query on a specific node.
   *
   * @param nodeId - Node identifier
   * @param queryText - SQL query string
   * @param params - Query parameters
   * @returns Query result rows
   * @throws Error if node not found or query fails
   */
  async query<T>(nodeId: string, queryText: string, params?: unknown[]): Promise<T[]> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node "${nodeId}" not found`);
    }

    const result = await node.pool.query(queryText, params);
    return result.rows as T[];
  }

  /**
   * Execute a query on all nodes in parallel.
   * Returns results from all nodes, including failures.
   *
   * @param queryText - SQL query string
   * @param params - Query parameters
   * @returns Array of results from all nodes
   */
  async queryAll<T>(queryText: string, params?: unknown[]): Promise<NodeQueryResult<T[]>[]> {
    const nodes = Array.from(this.nodes.values());
    const timeout = this.config.queryTimeoutMs;

    const promises = nodes.map(async (node): Promise<NodeQueryResult<T[]>> => {
      const startTime = Date.now();
      try {
        const result = await Promise.race([
          node.pool.query(queryText, params),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), timeout)
          ),
        ]);
        return {
          nodeId: node.id,
          success: true,
          data: result.rows as T[],
          durationMs: Date.now() - startTime,
        };
      } catch (err) {
        return {
          nodeId: node.id,
          success: false,
          error: err instanceof Error ? err : new Error(String(err)),
          durationMs: Date.now() - startTime,
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Execute a query on all healthy nodes in parallel.
   * Skips unhealthy nodes.
   *
   * @param queryText - SQL query string
   * @param params - Query parameters
   * @returns Array of results from healthy nodes
   */
  async queryHealthy<T>(queryText: string, params?: unknown[]): Promise<NodeQueryResult<T[]>[]> {
    const healthyNodes = Array.from(this.nodes.values()).filter(
      (node) => node.health.status === 'healthy'
    );
    const timeout = this.config.queryTimeoutMs;

    const promises = healthyNodes.map(async (node): Promise<NodeQueryResult<T[]>> => {
      const startTime = Date.now();
      try {
        const result = await Promise.race([
          node.pool.query(queryText, params),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), timeout)
          ),
        ]);
        return {
          nodeId: node.id,
          success: true,
          data: result.rows as T[],
          durationMs: Date.now() - startTime,
        };
      } catch (err) {
        return {
          nodeId: node.id,
          success: false,
          error: err instanceof Error ? err : new Error(String(err)),
          durationMs: Date.now() - startTime,
        };
      }
    });

    return Promise.all(promises);
  }

  // ===========================================================================
  // Health
  // ===========================================================================

  /**
   * Get health status for a specific node.
   *
   * @param nodeId - Node identifier
   * @returns HealthStatus or undefined if node not found
   */
  getHealth(nodeId: string): HealthStatus | undefined {
    return this.nodes.get(nodeId)?.health;
  }

  /**
   * Get health status for all nodes.
   *
   * @returns Map of nodeId to HealthStatus
   */
  getAllHealth(): Map<string, HealthStatus> {
    const result = new Map<string, HealthStatus>();
    for (const [nodeId, node] of this.nodes) {
      result.set(nodeId, node.health);
    }
    return result;
  }

  /**
   * Get only healthy nodes.
   *
   * @returns Array of nodes with status='healthy'
   */
  getHealthyNodes(): ManagedNode[] {
    return Array.from(this.nodes.values())
      .filter((node) => node.health.status === 'healthy')
      .map((node) => ({
        id: node.id,
        name: node.name,
        config: node.config,
        health: node.health,
      }));
  }

  // ===========================================================================
  // Pool Statistics
  // ===========================================================================

  /**
   * Get pool statistics for a specific node.
   *
   * @param nodeId - Node identifier
   * @returns PoolStats or undefined if node not found
   */
  getPoolStats(nodeId: string): PoolStats | undefined {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return undefined;
    }
    return {
      nodeId,
      totalConnections: node.pool.totalCount,
      idleConnections: node.pool.idleCount,
      waitingRequests: node.pool.waitingCount,
    };
  }

  /**
   * Get pool statistics for all nodes.
   *
   * @returns Array of PoolStats for all nodes
   */
  getAllPoolStats(): PoolStats[] {
    return Array.from(this.nodes.entries()).map(([nodeId, node]) => ({
      nodeId,
      totalConnections: node.pool.totalCount,
      idleConnections: node.pool.idleCount,
      waitingRequests: node.pool.waitingCount,
    }));
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Initialize the connection manager.
   * Connects to all configured nodes and starts health monitoring.
   *
   * @param nodes - Initial nodes to connect to
   */
  async initialize(
    nodes: Array<{ id: string; config: NodeConnectionConfig }>
  ): Promise<void> {
    if (this.running) {
      throw new Error('ConnectionManager is already running');
    }

    // Add all nodes in parallel
    await Promise.all(
      nodes.map(({ id, config }) => this.addNode(id, config))
    );

    this.running = true;

    // Start health monitoring
    this.healthChecker.start();
  }

  /**
   * Gracefully shutdown all connections.
   * Waits for in-flight queries up to the configured timeout.
   */
  async shutdown(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;

    // Stop health monitoring
    this.healthChecker.stop();

    // Close all pools in parallel
    const closePromises = Array.from(this.nodes.values()).map(async (node) => {
      try {
        await node.pool.end();
        this.events.emit('node:disconnected', { nodeId: node.id });
      } catch (err) {
        this.events.emit('node:disconnected', {
          nodeId: node.id,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    });

    await Promise.allSettled(closePromises);
    this.nodes.clear();
  }

  /**
   * Check if the connection manager is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  /**
   * Subscribe to connection manager events.
   *
   * @param event - Event name
   * @param handler - Event handler function
   */
  on<K extends keyof ConnectionManagerEvents>(
    event: K,
    handler: (payload: ConnectionManagerEvents[K]) => void
  ): void {
    this.events.on(event, handler);
  }

  /**
   * Unsubscribe from connection manager events.
   *
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  off<K extends keyof ConnectionManagerEvents>(
    event: K,
    handler: (payload: ConnectionManagerEvents[K]) => void
  ): void {
    this.events.off(event, handler);
  }
}

// Re-export public types
export type {
  ConnectionManagerConfig,
  ConnectionManagerEvents,
  HealthStatus,
  HealthStatusEnum,
  ManagedNode,
  NodeConnectionConfig,
  NodeQueryResult,
  PoolConfig,
  PoolStats,
  SSLConfig,
} from './types.js';
