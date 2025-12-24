# Research: Connection Management

**Feature**: 003-connection-management
**Date**: 2025-12-23
**Status**: Complete

## Research Areas

### 1. pg-pool Configuration Best Practices

**Decision**: Use the following default pool configuration for monitoring tool use case:

```typescript
{
  max: 10,                      // Max connections per node (spec default)
  min: 1,                       // Min connections per node (spec default)
  idleTimeoutMillis: 30000,     // 30s idle timeout
  connectionTimeoutMillis: 5000, // 5s connection timeout (SC-001)
  allowExitOnIdle: false,       // TUI app, not CLI script
}
```

**Rationale**:
- `max: 10` prevents resource exhaustion while allowing concurrent queries
- `min: 1` ensures at least one connection ready for health checks
- 30s idle timeout balances connection freshness with reconnection overhead
- 5s connection timeout supports SC-001 (5s startup target)
- `allowExitOnIdle: false` because TUI runs continuously

**Alternatives Considered**:
- Higher `min` (2-3): Rejected; wastes connections for monitoring use case with infrequent queries
- Shorter idle timeout: Rejected; would cause excessive reconnections in quiet periods

### 2. Health Check Implementation

**Decision**: Use lightweight `SELECT 1` query with timeout tracking and consecutive failure threshold.

**Rationale**:
- `SELECT 1` is PostgreSQL's recommended minimal query for health checks
- Consecutive failure threshold (3 failures) prevents flapping (per edge case in spec)
- Tracking latency enables SC-002 (2s detection) validation

**Pattern**:
```typescript
interface HealthCheckResult {
  healthy: boolean;
  latency: number;
  consecutiveFailures: number;
  lastError?: string;
}
```

**Alternatives Considered**:
- `SELECT NOW()`: Slightly heavier, no added value for health check
- Connection-only check (no query): Doesn't verify full path to database

### 3. Exponential Backoff Retry Strategy

**Decision**: Implement exponential backoff with jitter: 1s → 2s → 4s → 8s → ... → 30s cap.

**Rationale**:
- Matches spec clarification (FR-007)
- Jitter prevents thundering herd when multiple nodes recover simultaneously
- 30s cap prevents excessive delays for persistent failures

**Implementation**:
```typescript
function getBackoffDelay(attempt: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}
```

**Alternatives Considered**:
- Fixed interval retry: Rejected; doesn't reduce load during outages
- No jitter: Rejected; could cause connection storms

### 4. Graceful Shutdown Pattern

**Decision**: Drain in-flight queries with configurable timeout, then close pools in parallel.

**Rationale**:
- Supports SC-005 (10s graceful shutdown)
- Parallel pool closure minimizes shutdown time
- Timeout prevents indefinite hang on stuck queries

**Implementation Pattern**:
```typescript
async shutdown(timeout: number = 10000): Promise<void> {
  // 1. Stop accepting new queries
  // 2. Wait for in-flight queries (with timeout)
  // 3. Close all pools in parallel with Promise.allSettled
}
```

**Alternatives Considered**:
- Sequential pool closure: Rejected; slower for multi-node setups
- Immediate termination: Rejected; loses in-flight query results

### 5. Event System Design

**Decision**: Use typed EventEmitter for connection state changes.

**Rationale**:
- Supports FR-014 (emit events for state changes)
- TypeScript-first with typed event payloads
- Decouples ConnectionManager from UI/store

**Event Types**:
```typescript
type ConnectionEvents = {
  'node:connected': { nodeId: string };
  'node:disconnected': { nodeId: string; error?: Error };
  'node:health': { nodeId: string; status: HealthStatus };
  'node:added': { nodeId: string };
  'node:removed': { nodeId: string };
  'pool:stats': { nodeId: string; stats: PoolStats };
};
```

**Alternatives Considered**:
- Direct Zustand store updates: Rejected; creates tight coupling
- Callback functions: Rejected; less flexible than EventEmitter

### 6. SSL/TLS Configuration

**Decision**: Support SSL via connection config with environment-based mode selection.

**Rationale**:
- Supports FR-002 (SSL connection option)
- Integrates with 002-yaml-config environment variable interpolation
- Covers common deployment scenarios (self-signed dev, CA-verified prod)

**Configuration Shape**:
```typescript
interface SSLConfig {
  enabled: boolean;
  rejectUnauthorized: boolean;
  ca?: string;   // CA certificate path or content
  cert?: string; // Client certificate path or content
  key?: string;  // Client key path or content
}
```

**Alternatives Considered**:
- Connection string only: Rejected; harder to configure programmatically
- Environment variables only: Rejected; less flexible for multi-node configs

### 7. Parallel Query Execution

**Decision**: Use `Promise.allSettled` for parallel queries with per-node timeout.

**Rationale**:
- `allSettled` supports FR-009 (partial failure handling)
- Per-node timeout prevents slow nodes from blocking others
- Aggregated results include both successes and failures

**Implementation Pattern**:
```typescript
async queryAll<T>(query: string, params?: unknown[]): Promise<NodeQueryResult<T>[]> {
  const promises = Array.from(this.pools.entries()).map(([nodeId, pool]) =>
    this.queryWithTimeout(pool, nodeId, query, params)
  );
  const results = await Promise.allSettled(promises);
  return results.map(this.normalizeResult);
}
```

**Alternatives Considered**:
- `Promise.all`: Rejected; fails fast on first error
- Sequential queries: Rejected; too slow for multi-node monitoring

### 8. Pool Statistics Exposure

**Decision**: Expose pg-pool native statistics via getter methods.

**Rationale**:
- Supports FR-016 (expose pool statistics)
- pg-pool provides `totalCount`, `idleCount`, `waitingCount` directly
- No additional tracking overhead

**Available Stats**:
```typescript
interface PoolStats {
  totalConnections: number;  // pool.totalCount
  idleConnections: number;   // pool.idleCount
  waitingRequests: number;   // pool.waitingCount
}
```

## Dependencies

### Required New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| pg | ^8.13.x | PostgreSQL client |
| pg-pool | ^3.7.x | Connection pooling (included with pg) |
| @types/pg | ^8.11.x | TypeScript types |

### Existing Dependencies (No Changes)

- zustand: State management for health status
- yaml: YAML config parsing (002-yaml-config)
- zod: Schema validation

## Architecture Notes

### Integration with Existing Code

1. **Types Extension**: Extend `src/types/connection.ts` with SSL options
2. **Store Extension**: Extend `src/store/connection.ts` with health status and pool stats
3. **New Service**: Create `src/services/connection-manager/` module

### File Organization

```
src/services/connection-manager/
├── index.ts              # Main ConnectionManager class, exports public API
├── types.ts              # Internal types (Node, HealthStatus, QueryResult)
├── health-checker.ts     # Health check loop, exponential backoff
├── parallel-query.ts     # Parallel query executor with timeout
├── pool-factory.ts       # Pool creation with SSL config
└── events.ts             # Typed EventEmitter wrapper
```

### Thread Safety Considerations

- All pool operations are async and non-blocking
- Node Map mutations are synchronous and atomic
- Health check loop uses setInterval (single-threaded)
- Graceful shutdown sets flag before awaiting pool.end()
