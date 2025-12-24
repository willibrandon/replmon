/**
 * HealthChecker
 *
 * Monitors health of PostgreSQL nodes using periodic SELECT 1 queries.
 * Based on node-postgres recommended pattern from:
 * https://github.com/brianc/node-postgres/issues/3208
 */

import type { Pool } from 'pg';
import type {
  HealthStatus,
  HealthStatusEnum,
  InternalNode,
  PoolStats,
} from './types.js';
import { TypedEventEmitter } from './events.js';

const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_UNHEALTHY_THRESHOLD = 3;
const DEFAULT_TIMEOUT_MS = 5000;

export interface HealthCheckerConfig {
  healthCheckIntervalMs: number;
  unhealthyThreshold: number;
  healthCheckTimeoutMs?: number;
}

export class HealthChecker {
  private readonly config: Required<HealthCheckerConfig>;
  private readonly events: TypedEventEmitter;
  private readonly nodes: Map<string, InternalNode>;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    nodes: Map<string, InternalNode>,
    events: TypedEventEmitter,
    config: Partial<HealthCheckerConfig> = {}
  ) {
    this.nodes = nodes;
    this.events = events;
    this.config = {
      healthCheckIntervalMs: config.healthCheckIntervalMs ?? DEFAULT_INTERVAL_MS,
      unhealthyThreshold: config.unhealthyThreshold ?? DEFAULT_UNHEALTHY_THRESHOLD,
      healthCheckTimeoutMs: config.healthCheckTimeoutMs ?? DEFAULT_TIMEOUT_MS,
    };
  }

  start(): void {
    if (this.intervalId !== null) {
      return;
    }

    // Check immediately on start
    this.checkAllNodes();

    // Then check on interval
    this.intervalId = setInterval(() => {
      this.checkAllNodes();
    }, this.config.healthCheckIntervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  startNode(nodeId: string): void {
    this.checkNode(nodeId);
  }

  stopNode(_nodeId: string): void {
    // Nothing to do - single interval handles all nodes
  }

  private checkAllNodes(): void {
    for (const nodeId of this.nodes.keys()) {
      this.checkNode(nodeId);
    }
  }

  private checkNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return;
    }

    const startTime = Date.now();
    const previousStatus = node.health.status;

    // Run SELECT 1 with timeout
    this.runHealthQuery(node.pool)
      .then(() => {
        // Success
        const latencyMs = Date.now() - startTime;
        const now = new Date();

        const newHealth: HealthStatus = {
          status: 'healthy',
          lastCheckTime: now,
          lastSuccessTime: now,
          consecutiveFailures: 0,
          retryAttempt: 0,
          latencyMs,
        };

        node.health = newHealth;

        if (previousStatus !== 'healthy') {
          this.events.emit('node:health', { nodeId, status: newHealth });
          this.events.emit('node:connected', { nodeId });
        }
      })
      .catch((err) => {
        // Failure
        const latencyMs = Date.now() - startTime;
        const now = new Date();
        const error = err instanceof Error ? err : new Error(String(err));

        const consecutiveFailures = node.health.consecutiveFailures + 1;
        const isUnhealthy = consecutiveFailures >= this.config.unhealthyThreshold;
        const newStatus: HealthStatusEnum = isUnhealthy ? 'unhealthy' : previousStatus;

        const newHealth: HealthStatus = {
          status: newStatus,
          lastCheckTime: now,
          consecutiveFailures,
          retryAttempt: 0,
          lastError: error.message,
          latencyMs,
        };

        if (node.health.lastSuccessTime) {
          newHealth.lastSuccessTime = node.health.lastSuccessTime;
        }

        const wasHealthy = previousStatus === 'healthy';
        node.health = newHealth;

        if (wasHealthy && isUnhealthy) {
          this.events.emit('node:health', { nodeId, status: newHealth });
          this.events.emit('node:disconnected', { nodeId, error });
        }
      });
  }

  private runHealthQuery(pool: Pool): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Health check timeout'));
      }, this.config.healthCheckTimeoutMs);

      pool.query('SELECT 1')
        .then(() => {
          clearTimeout(timeoutId);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  }

  emitPoolStats(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return;
    }

    const stats: PoolStats = {
      nodeId,
      totalConnections: node.pool.totalCount,
      idleConnections: node.pool.idleCount,
      waitingRequests: node.pool.waitingCount,
    };

    this.events.emit('pool:stats', { nodeId, stats });
  }
}
