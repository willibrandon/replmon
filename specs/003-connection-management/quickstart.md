# Quickstart: Connection Management

**Feature**: 003-connection-management
**Date**: 2025-12-23

## Overview

The ConnectionManager provides a unified interface for managing PostgreSQL connections across multiple nodes in a replication cluster. It handles connection pooling, health monitoring, parallel queries, and graceful lifecycle management.

## Quick Start

### 1. Basic Usage

```typescript
import { ConnectionManager } from './services/connection-manager';

// Create manager instance
const manager = new ConnectionManager({
  healthCheckIntervalMs: 5000,
  unhealthyThreshold: 3,
  shutdownTimeoutMs: 10000,
});

// Initialize with nodes from config
await manager.initialize([
  {
    id: 'primary',
    config: {
      host: 'pg-primary.example.com',
      port: 5432,
      database: 'mydb',
      user: 'monitor',
      password: process.env.PG_PASSWORD,
    },
  },
  {
    id: 'replica-1',
    config: {
      host: 'pg-replica1.example.com',
      port: 5432,
      database: 'mydb',
      user: 'monitor',
      password: process.env.PG_PASSWORD,
    },
  },
]);

// Query a specific node
const slots = await manager.query<ReplicationSlot>('primary', `
  SELECT slot_name, active, restart_lsn
  FROM pg_replication_slots
`);

// Query all nodes in parallel
const results = await manager.queryAll<ReplicationSlot>(`
  SELECT slot_name, active, restart_lsn
  FROM pg_replication_slots
`);

// Process results
for (const result of results) {
  if (result.success) {
    console.log(`${result.nodeId}: ${result.data.length} slots`);
  } else {
    console.error(`${result.nodeId}: ${result.error.message}`);
  }
}

// Graceful shutdown
await manager.shutdown();
```

### 2. Health Monitoring

```typescript
// Subscribe to health events
manager.on('node:health', ({ nodeId, status }) => {
  console.log(`${nodeId}: ${status.status}`);
  if (status.status === 'unhealthy') {
    console.error(`  Error: ${status.lastError}`);
    console.error(`  Failures: ${status.consecutiveFailures}`);
  }
});

// Get current health
const health = manager.getHealth('primary');
if (health?.status === 'healthy') {
  console.log(`Primary healthy, latency: ${health.latencyMs}ms`);
}

// Get all healthy nodes
const healthyNodes = manager.getHealthyNodes();
console.log(`${healthyNodes.length} nodes available`);
```

### 3. Dynamic Node Management

```typescript
// Add a node at runtime
await manager.addNode('replica-2', {
  host: 'pg-replica2.example.com',
  port: 5432,
  database: 'mydb',
  user: 'monitor',
  password: process.env.PG_PASSWORD,
});

// Remove a node
await manager.removeNode('replica-2');

// Check if node exists
if (manager.hasNode('primary')) {
  const node = manager.getNode('primary');
  console.log(`Primary: ${node.health.status}`);
}
```

### 4. Pool Statistics

```typescript
// Get stats for all nodes
const allStats = manager.getAllPoolStats();
for (const stats of allStats) {
  console.log(`${stats.nodeId}:`);
  console.log(`  Total: ${stats.totalConnections}`);
  console.log(`  Idle: ${stats.idleConnections}`);
  console.log(`  Waiting: ${stats.waitingRequests}`);
}

// Get stats for specific node
const stats = manager.getPoolStats('primary');
if (stats && stats.waitingRequests > 0) {
  console.warn('Queries waiting for connections');
}
```

### 5. SSL Configuration

```typescript
await manager.addNode('secure-node', {
  host: 'pg-secure.example.com',
  port: 5432,
  database: 'mydb',
  user: 'monitor',
  password: process.env.PG_PASSWORD,
  ssl: {
    enabled: true,
    rejectUnauthorized: true,
    ca: '/path/to/ca.crt',
  },
});
```

### 6. Integration with Zustand Store

```typescript
import { useConnectionStore } from './store/connection';

// In your React component
function ConnectionStatus() {
  const { nodes, health } = useConnectionStore();

  return (
    <Box flexDirection="column">
      {nodes.map(node => (
        <Text key={node.id}>
          {node.name}: {health.get(node.id)?.status ?? 'unknown'}
        </Text>
      ))}
    </Box>
  );
}

// In your service layer, sync manager events to store
manager.on('node:health', ({ nodeId, status }) => {
  useConnectionStore.getState().setHealth(nodeId, status);
});
```

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `healthCheckIntervalMs` | number | 5000 | Health check frequency |
| `unhealthyThreshold` | number | 3 | Failures before unhealthy |
| `shutdownTimeoutMs` | number | 10000 | Max shutdown wait time |
| `queryTimeoutMs` | number | 30000 | Per-query timeout |

## Node Configuration Reference

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `host` | string | Yes | - | PostgreSQL host |
| `port` | number | Yes | 5432 | PostgreSQL port |
| `database` | string | Yes | - | Database name |
| `user` | string | Yes | - | Database user |
| `password` | string | No | - | Database password |
| `ssl.enabled` | boolean | No | false | Enable SSL |
| `ssl.rejectUnauthorized` | boolean | No | true | Verify server cert |
| `ssl.ca` | string | No | - | CA certificate path |
| `pool.min` | number | No | 1 | Min pool connections |
| `pool.max` | number | No | 10 | Max pool connections |

## Events Reference

| Event | Payload | Description |
|-------|---------|-------------|
| `node:connected` | `{ nodeId }` | Node connected |
| `node:disconnected` | `{ nodeId, error? }` | Node disconnected |
| `node:health` | `{ nodeId, status }` | Health status changed |
| `node:added` | `{ nodeId }` | Node added |
| `node:removed` | `{ nodeId }` | Node removed |
| `pool:stats` | `{ nodeId, stats }` | Pool stats updated |

## Common Patterns

### Error Handling

```typescript
try {
  await manager.query('primary', 'SELECT * FROM large_table');
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Query timed out');
  } else if (error.message.includes('not found')) {
    console.error('Node not found');
  } else {
    console.error('Query failed:', error.message);
  }
}
```

### Graceful Shutdown with Signals

```typescript
const shutdown = async () => {
  console.log('Shutting down...');
  await manager.shutdown();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

### Query Only Healthy Nodes

```typescript
// Skip unhealthy nodes automatically
const results = await manager.queryHealthy<Stats>('SELECT * FROM stats');

// Or filter manually
const healthyNodes = manager.getHealthyNodes();
for (const node of healthyNodes) {
  const data = await manager.query(node.id, 'SELECT ...');
}
```
