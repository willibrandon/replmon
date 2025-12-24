# Feature Specification: Connection Management

**Feature Branch**: `003-connection-management`
**Created**: 2025-12-23
**Status**: Draft
**Input**: User description: "ConnectionManager class with pg-pool for multi-node PostgreSQL connections. Dynamic node addition, health tracking, parallel queries across nodes, graceful cleanup."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect to Multiple PostgreSQL Nodes (Priority: P1)

A user monitoring PostgreSQL logical replication wants to connect to multiple nodes in their cluster simultaneously. They configure their nodes in the YAML config file and expect the application to establish and maintain connections to all of them without manual intervention.

**Why this priority**: This is the foundational capability - without multi-node connections, no other monitoring features can work. This delivers the core value of the replmon tool.

**Independent Test**: Can be fully tested by configuring 2+ PostgreSQL nodes and verifying successful connections to each. Delivers the ability to query any node in the cluster.

**Acceptance Scenarios**:

1. **Given** a YAML config with 3 PostgreSQL nodes defined, **When** the application starts, **Then** it establishes connection pools to all 3 nodes.
2. **Given** a node requires SSL/TLS, **When** the application connects, **Then** it uses the SSL configuration from the node's connection settings.
3. **Given** a node's credentials are stored in environment variables, **When** the application connects, **Then** it correctly interpolates the env vars from the YAML config.

---

### User Story 2 - Monitor Node Health Status (Priority: P1)

A user needs visibility into the health of each PostgreSQL node connection. They want to see which nodes are healthy, degraded, or unreachable so they can troubleshoot issues and understand the cluster state at a glance.

**Why this priority**: Health visibility is essential for a monitoring tool - users cannot effectively monitor replication if they don't know which nodes are accessible.

**Independent Test**: Can be fully tested by starting connections to healthy nodes and intentionally stopping one PostgreSQL instance. Delivers real-time health status visibility.

**Acceptance Scenarios**:

1. **Given** a node is responding to queries within expected time, **When** health is checked, **Then** the node status is "healthy".
2. **Given** a node stops responding, **When** health is checked after the timeout threshold, **Then** the node status changes to "unhealthy".
3. **Given** a previously unhealthy node becomes responsive again, **When** health is checked, **Then** the node status returns to "healthy".
4. **Given** connection to a node fails repeatedly, **When** the failure threshold is reached, **Then** the system emits an event for downstream consumers (UI, alerts).

---

### User Story 3 - Execute Parallel Queries Across Nodes (Priority: P2)

A user wants to run the same monitoring query (e.g., replication slot status) across all connected nodes and receive aggregated results. The queries should execute in parallel to minimize latency when monitoring large clusters.

**Why this priority**: Parallel querying is the key performance optimization that enables responsive monitoring of multi-node clusters. Without it, sequential queries would make the UI feel slow.

**Independent Test**: Can be fully tested by running a query across 3 nodes and measuring that total time is closer to single-query time than 3x sequential time. Delivers fast aggregated query results.

**Acceptance Scenarios**:

1. **Given** 5 healthy nodes, **When** a parallel query is executed, **Then** results from all nodes are returned within roughly the time of the slowest single node.
2. **Given** 5 nodes where 1 is unhealthy, **When** a parallel query is executed, **Then** results from 4 healthy nodes are returned and the unhealthy node returns an error indicator.
3. **Given** a parallel query is in progress, **When** a node times out, **Then** the other results are still returned (partial success).

---

### User Story 4 - Dynamically Add Nodes at Runtime (Priority: P2)

A user scales their PostgreSQL cluster and wants to add monitoring for the new node without restarting the application. They update their config or trigger an API call, and the new node is added to the connection pool.

**Why this priority**: Dynamic scaling enables the monitoring tool to adapt to cluster changes, which is important for production environments but not strictly required for basic functionality.

**Independent Test**: Can be fully tested by starting with 2 nodes, adding a 3rd via the add method, and verifying queries include the new node. Delivers zero-downtime node additions.

**Acceptance Scenarios**:

1. **Given** the application is running with 2 connected nodes, **When** a third node is added via the ConnectionManager API, **Then** a new connection pool is created for that node.
2. **Given** a new node is added, **When** health checking runs, **Then** the new node is included in health checks.
3. **Given** a node with the same ID already exists, **When** an add is attempted, **Then** the operation fails with a clear error message.

---

### User Story 5 - Graceful Connection Cleanup (Priority: P3)

When the application shuts down or a node is removed, connections should be properly cleaned up to avoid resource leaks and ensure PostgreSQL doesn't have orphaned connections.

**Why this priority**: Graceful cleanup prevents resource leaks and is good practice, but the application can function during a session without it.

**Independent Test**: Can be fully tested by starting the app, connecting to nodes, then shutting down and verifying all pool connections are released. Delivers clean resource management.

**Acceptance Scenarios**:

1. **Given** active connection pools, **When** the application shuts down, **Then** all pools are drained and closed properly.
2. **Given** a specific node is removed from monitoring, **When** the remove operation completes, **Then** that node's pool is closed and resources are freed.
3. **Given** queries are in-flight during shutdown, **When** graceful shutdown is triggered, **Then** the system waits for queries to complete (up to a timeout) before closing pools.

---

### Edge Cases

- What happens when all configured nodes are unreachable at startup? The system should start but report all nodes as unhealthy, allowing the user to see the issue.
- How does the system handle a node that intermittently fails? A node should not flip between healthy/unhealthy on every check; use a threshold (e.g., 3 consecutive failures) before marking unhealthy.
- What happens when a parallel query is cancelled? All in-flight queries for that batch should be cancelled to free resources.
- How does the system handle duplicate node IDs? Reject the duplicate with a clear error; do not silently overwrite.
- What happens during config reload if a node is removed? The removed node's pool should be gracefully closed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a connection pool per PostgreSQL node using pg-pool
- **FR-002**: System MUST support standard PostgreSQL connection options (host, port, database, user, password, SSL)
- **FR-003**: System MUST support environment variable interpolation in connection configuration (dependency: 002-yaml-config feature provides `${VAR_NAME}` syntax - no implementation needed here)
- **FR-004**: System MUST track health status for each node (healthy, unhealthy, connecting, reconnecting, disconnected)
- **FR-005**: System MUST perform periodic health checks using a lightweight query (e.g., `SELECT 1`)
- **FR-006**: System MUST use configurable thresholds for marking a node unhealthy: `unhealthyThreshold` (default: 3 consecutive failures), `healthCheckIntervalMs` (default: 5000ms), `queryTimeoutMs` (default: 30000ms)
- **FR-007**: System MUST automatically retry failed connections using exponential backoff (1s, 2s, 4s, 8s, capped at 30s) until connection succeeds or node is removed
- **FR-008**: System MUST execute queries in parallel across multiple nodes and aggregate results
- **FR-009**: System MUST handle partial failures in parallel queries (return successful results even if some nodes fail)
- **FR-010**: System MUST support dynamic addition of nodes at runtime without restarting
- **FR-011**: System MUST support removal of nodes at runtime with graceful pool cleanup
- **FR-012**: System MUST gracefully close all connection pools on application shutdown
- **FR-013**: System MUST wait for in-flight queries during shutdown (with configurable timeout)
- **FR-014**: System MUST emit events for connection state changes (connected, disconnected, health changes) for downstream consumers
- **FR-015**: System MUST prevent duplicate node IDs and return clear errors on conflicts
- **FR-016**: System MUST expose pool statistics (active connections, idle connections, waiting requests) per node

### Key Entities

- **Node**: Represents a PostgreSQL server to monitor. Has ID (unique string), connection configuration, health status, and associated connection pool.
- **ConnectionPool**: A pg-pool instance managing connections to a single node. Has min/max connection settings, idle timeout, and connection timeout.
- **HealthStatus**: The current state of a node's connectivity. Includes status enum (healthy, unhealthy, connecting, reconnecting, disconnected), last check timestamp, consecutive failure count, last error message, and current retry attempt count.
- **QueryResult**: Result from a parallel query. Contains node ID, success/failure status, data or error, and execution time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Application connects to all configured nodes within 5 seconds of startup under normal conditions
- **SC-002**: Health status updates are reflected within 2 seconds of a node becoming unreachable
- **SC-003**: Parallel queries across 10 nodes complete in under 2x the time of querying a single node
- **SC-004**: Adding or removing a node at runtime completes within 1 second
- **SC-005**: Graceful shutdown completes within 10 seconds (configurable timeout for in-flight queries)
- **SC-006**: Zero connection leaks: all connections are properly released during normal operation and shutdown
- **SC-007**: System handles cluster sizes from 1 to 20+ nodes without performance degradation
- **SC-008**: Connection pool statistics are available for all nodes at all times for monitoring/debugging

## Clarifications

### Session 2025-12-23

- Q: Should failed node connections be automatically retried, and with what strategy? → A: Automatic retry with exponential backoff (1s, 2s, 4s, 8s, max 30s) until success or removal

## Assumptions

- PostgreSQL nodes are running version 10 or later (aligned with project's PostgreSQL compatibility requirement)
- Network latency between the monitoring application and PostgreSQL nodes is reasonable (< 100ms typical)
- Users have appropriate PostgreSQL credentials configured for each node
- The YAML configuration system from feature 002-yaml-config is available and used for node configuration
- Connection pools use sensible defaults (min: 1, max: 10 connections per node) which can be overridden in config
- Health check interval defaults to 5 seconds, configurable per cluster or globally
- The application runs in an environment where environment variables for secrets are securely managed
- Environment variable interpolation in YAML configs is handled by the 002-yaml-config feature; ConnectionManager receives already-interpolated values
