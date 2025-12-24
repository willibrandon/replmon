# Data Model: Connection Management

**Feature**: 003-connection-management
**Date**: 2025-12-23

## Entities

### Node

Represents a PostgreSQL server being monitored.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (from config key) |
| name | string | Yes | Display name for UI |
| config | NodeConnectionConfig | Yes | Connection parameters |
| health | HealthStatus | Yes | Current health state |
| pool | Pool | Yes | pg-pool instance (internal) |

**Constraints**:
- `id` must be unique across all nodes in the cluster
- `id` is immutable after creation

**Internal vs Public Types**:
- `ManagedNode`: Public interface exposed to consumers (id, name, config, health)
- `InternalNode`: Internal type extending ManagedNode with `pool: Pool` reference (not exported)

**State Transitions**: None (Node is a container; health has transitions)

### NodeConnectionConfig

Connection configuration for a single PostgreSQL node. Extends existing `ConnectionConfig`.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| host | string | Yes | - | PostgreSQL host address |
| port | number | Yes | 5432 | PostgreSQL port |
| database | string | Yes | - | Database name |
| user | string | Yes | - | Database user |
| password | string | No | - | Database password (can use env var) |
| ssl | SSLConfig | No | disabled | SSL/TLS configuration |
| pool | PoolConfig | No | defaults | Pool sizing configuration |

### SSLConfig

SSL/TLS connection configuration.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| enabled | boolean | Yes | false | Enable SSL/TLS |
| rejectUnauthorized | boolean | No | true | Verify server certificate |
| ca | string | No | - | CA certificate (path or PEM content) |
| cert | string | No | - | Client certificate (path or PEM content) |
| key | string | No | - | Client private key (path or PEM content) |

### PoolConfig

Connection pool configuration per node.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| min | number | No | 1 | Minimum connections |
| max | number | No | 10 | Maximum connections |
| idleTimeoutMs | number | No | 30000 | Idle connection timeout (ms) |
| connectionTimeoutMs | number | No | 5000 | Connection establishment timeout (ms) |

### HealthStatus

Health state of a node connection.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | HealthStatusEnum | Yes | Current status |
| lastCheckTime | Date | Yes | Timestamp of last health check |
| lastSuccessTime | Date | No | Timestamp of last successful check |
| consecutiveFailures | number | Yes | Count of consecutive failures |
| retryAttempt | number | Yes | Current retry attempt (0 when healthy) |
| nextRetryTime | Date | No | When next retry will occur |
| lastError | string | No | Last error message |
| latencyMs | number | No | Last health check latency |

**State Machine**:

```
                 ┌──────────────┐
                 │  connecting  │
                 └──────┬───────┘
                        │ success
                        ▼
┌───────────────────────────────────────────────────────┐
│                                                       │
│    ┌─────────────┐    failure     ┌─────────────┐    │
│    │   healthy   │───────────────▶│  unhealthy  │    │
│    └─────────────┘                └──────┬──────┘    │
│          ▲                               │           │
│          │ success                       │ retry     │
│          │                               ▼           │
│          │                      ┌──────────────┐     │
│          └──────────────────────│ reconnecting │     │
│                                 └──────────────┘     │
│                                                       │
└───────────────────────────────────────────────────────┘
                        │
                        │ removed
                        ▼
                ┌──────────────┐
                │ disconnected │
                └──────────────┘
```

### HealthStatusEnum

```typescript
type HealthStatusEnum =
  | 'connecting'    // Initial connection in progress
  | 'healthy'       // Connection active and responsive
  | 'unhealthy'     // Failed consecutive health checks (threshold reached)
  | 'reconnecting'  // Retrying connection with backoff
  | 'disconnected'; // Explicitly removed or shutdown
```

### PoolStats

Statistics for a connection pool.

| Field | Type | Description |
|-------|------|-------------|
| nodeId | string | Node identifier |
| totalConnections | number | Total clients in pool |
| idleConnections | number | Idle clients available |
| waitingRequests | number | Queued requests waiting for client |

### QueryResult\<T\>

Result from a parallel query execution.

| Field | Type | Description |
|-------|------|-------------|
| nodeId | string | Node identifier |
| success | boolean | Whether query succeeded |
| data | T | Query result (when success=true) |
| error | Error | Error details (when success=false) |
| durationMs | number | Query execution time |

## Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    ConnectionManager                        │
│                                                             │
│  nodes: Map<string, Node>                                   │
│  healthChecker: HealthChecker                               │
│  events: TypedEventEmitter                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ manages 1..*
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          Node                               │
│                                                             │
│  id: string                                                 │
│  name: string                                               │
│  config: NodeConnectionConfig ──────────┐                   │
│  health: HealthStatus ───────────────┐  │                   │
│  pool: Pool ─────────────────────┐   │  │                   │
└──────────────────────────────────┼───┼──┼───────────────────┘
                                   │   │  │
                                   ▼   │  │
                    ┌──────────────────┼──┼───────────────────┐
                    │      Pool        │  │                   │
                    │ (pg-pool)        │  │                   │
                    └──────────────────┼──┼───────────────────┘
                                       │  │
                                       ▼  │
                    ┌─────────────────────┼───────────────────┐
                    │   HealthStatus      │                   │
                    │                     │                   │
                    │ status              │                   │
                    │ consecutiveFailures │                   │
                    │ retryAttempt        │                   │
                    └─────────────────────┼───────────────────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────┐
                    │      NodeConnectionConfig               │
                    │                                         │
                    │ host, port, database, user, password    │
                    │ ssl: SSLConfig                          │
                    │ pool: PoolConfig                        │
                    └─────────────────────────────────────────┘
```

## Validation Rules

### Node ID
- Must be non-empty string
- Must be unique within ConnectionManager
- Pattern: `^[a-zA-Z][a-zA-Z0-9_-]*$` (alphanumeric, starts with letter)

### Connection Config
- `host`: Non-empty string
- `port`: Integer 1-65535
- `database`: Non-empty string
- `user`: Non-empty string
- `password`: Optional, can reference env var via `${VAR_NAME}`

### Pool Config
- `min`: Integer >= 0, must be <= max
- `max`: Integer >= 1, must be >= min
- `idleTimeoutMs`: Integer >= 0
- `connectionTimeoutMs`: Integer > 0

### Health Thresholds
- `consecutiveFailures`: Integer >= 0
- Default unhealthy threshold: 3 consecutive failures
- `retryAttempt`: Integer >= 0

## Indexes and Lookups

| Lookup | Key | Returns | Use Case |
|--------|-----|---------|----------|
| Node by ID | nodeId (string) | Node | Primary lookup |
| Healthy nodes | - | Node[] | Parallel query filtering |
| Unhealthy nodes | - | Node[] | Status display |
| All pool stats | - | PoolStats[] | Dashboard display |
