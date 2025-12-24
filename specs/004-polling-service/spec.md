# Feature Specification: Polling Service

**Feature Branch**: `004-polling-service`
**Created**: 2025-12-23
**Status**: Draft
**Input**: User description: "EventEmitter-based PollingService for real-time data collection. Configurable intervals, parallel queries for replication stats, subscriptions, slots, and conflicts. Start/stop control."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time Monitoring Data Collection (Priority: P1)

A user running the replmon TUI wants to see live replication metrics updating automatically. They start the application and expect the dashboard to show current replication lag, slot status, subscription states, and conflict counts without manual refresh.

**Why this priority**: This is the core value of a monitoring tool - providing continuous visibility into replication health without user intervention.

**Independent Test**: Can be fully tested by starting the service with mock ConnectionManager, verifying events are emitted at configured intervals with replication data.

**Acceptance Scenarios**:

1. **Given** PollingService is started with default settings, **When** one polling interval passes, **Then** the service emits events with data for replication stats, subscriptions, slots, and conflicts.
2. **Given** PollingService is connected to multiple nodes, **When** a polling cycle runs, **Then** queries execute in parallel across all healthy nodes.
3. **Given** PollingService is running, **When** replication data changes on a node, **Then** the emitted data reflects the new state on the next polling cycle.

---

### User Story 2 - Configurable Polling Interval (Priority: P1)

A user wants to balance between data freshness and database load. They configure the polling interval via the configuration file to match their operational needs - faster for critical production systems, slower for development environments.

**Why this priority**: Configurability is essential for the tool to be usable across different environments and use cases without code changes.

**Independent Test**: Can be fully tested by starting the service with different interval values and measuring actual emission timing.

**Acceptance Scenarios**:

1. **Given** configuration specifies a 2-second polling interval, **When** PollingService starts, **Then** data events are emitted approximately every 2 seconds.
2. **Given** configuration specifies a 5-second polling interval, **When** PollingService starts, **Then** data events are emitted approximately every 5 seconds.
3. **Given** no polling interval is configured, **When** PollingService starts, **Then** it uses the default 1-second interval.

---

### User Story 3 - Start and Stop Control (Priority: P2)

A user or the application needs to pause polling temporarily (e.g., during maintenance mode, modal dialogs, or when the TUI is backgrounded) and resume later without restarting.

**Why this priority**: Lifecycle control enables proper resource management and prevents unnecessary database queries when data isn't being displayed.

**Independent Test**: Can be fully tested by starting, stopping, and restarting the service and verifying event emission starts/stops accordingly.

**Acceptance Scenarios**:

1. **Given** PollingService is running, **When** stop() is called, **Then** no further data events are emitted.
2. **Given** PollingService is stopped, **When** start() is called, **Then** data events resume on the configured interval.
3. **Given** PollingService is running, **When** the application prepares to exit, **Then** stop() can be called for graceful cleanup.

---

### User Story 4 - Graceful Error Handling (Priority: P2)

A user monitors a cluster where one node becomes temporarily unavailable. They expect the monitoring to continue for healthy nodes and to see error indicators for the failed node rather than the entire polling cycle failing.

**Why this priority**: Resilience is important for production monitoring - partial data is better than no data during degraded conditions.

**Independent Test**: Can be fully tested by simulating node failures and verifying partial results are emitted with error information.

**Acceptance Scenarios**:

1. **Given** 3 nodes where 1 is unhealthy, **When** a polling cycle runs, **Then** data from 2 healthy nodes is emitted, and the unhealthy node shows error status.
2. **Given** a query to a healthy node times out, **When** the polling cycle completes, **Then** other node results are still emitted and the timeout is reported.
3. **Given** all nodes are unhealthy, **When** a polling cycle runs, **Then** an error event is emitted indicating no data is available.

---

### User Story 5 - Multiple Data Type Subscriptions (Priority: P3)

A user's UI has multiple panels (Topology, Subscriptions, Slots, Conflicts) that each need different subsets of the polled data. Panels can subscribe to specific event types to receive only relevant updates.

**Why this priority**: Event-based architecture enables loose coupling between data collection and UI components, allowing components to update independently.

**Independent Test**: Can be fully tested by subscribing to individual event types and verifying only relevant events are received.

**Acceptance Scenarios**:

1. **Given** a component subscribes to "slots" events, **When** a polling cycle runs, **Then** it receives slot data but not subscription or conflict data directly.
2. **Given** a component subscribes to "conflicts" events, **When** a polling cycle runs, **Then** it receives conflict data.
3. **Given** a component subscribes to "stats" events, **When** a polling cycle runs, **Then** it receives aggregated replication statistics.

---

### Edge Cases

- What happens when polling interval is extremely short (< 100ms)? The service should enforce a minimum interval (e.g., 250ms) to prevent database overload.
- How does the system handle if a query takes longer than the polling interval? The next cycle should be skipped (no overlapping queries) and resume on the following interval.
- What happens when ConnectionManager is not yet initialized? The service should wait or emit an error event indicating it cannot poll.
- How does the system handle when the polling service is started multiple times? Subsequent start() calls should be no-ops if already running.
- What happens when the service is stopped during an active query? In-flight queries complete but results are discarded; no events are emitted after stop().

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST emit events at configurable intervals containing replication monitoring data.
- **FR-002**: System MUST support a default polling interval of 1 second.
- **FR-003**: System MUST enforce a minimum polling interval of 250ms to prevent excessive database load.
- **FR-004**: System MUST execute queries in parallel across all healthy nodes via ConnectionManager.
- **FR-005**: System MUST collect four data categories: replication statistics, subscriptions, replication slots, and conflicts.
- **FR-005a**: System MUST detect per-node whether pglogical extension is available and use appropriate queries (pglogical-specific or native replication) accordingly.
- **FR-006**: System MUST provide start() and stop() methods for lifecycle control.
- **FR-006a**: System MUST execute an immediate poll when start() is called, then continue polling at the configured interval.
- **FR-007**: System MUST prevent overlapping query cycles (skip if previous cycle is still running).
- **FR-008**: System MUST emit partial results when some nodes fail but others succeed.
- **FR-009**: System MUST emit typed events for each data category (stats, subscriptions, slots, conflicts).
- **FR-010**: System MUST emit an aggregated "data" event containing all categories per cycle.
- **FR-011**: System MUST emit error events when polling fails entirely.
- **FR-012**: System MUST discard query results if stop() is called during an active polling cycle.
- **FR-013**: System MUST support event subscription and unsubscription via standard EventEmitter pattern.
- **FR-014**: System MUST track and expose polling state (running/stopped) for consumers.
- **FR-015**: System MUST support graceful degradation when ConnectionManager is not ready.

### Key Entities

- **PollingService**: Singleton service that orchestrates periodic data collection. Has polling interval, running state, and ConnectionManager dependency.
- **PollingConfig**: Configuration for the polling service. Contains intervalMs (polling frequency).
- **ReplicationStats**: Aggregated replication metrics per node. Contains node ID, replication lag, apply lag, and timestamp.
- **SubscriptionData**: Subscription state information. Contains subscription name, status, provider node, and related slot info.
- **SlotData**: Replication slot information. Contains slot name, plugin, database, active state, and retention bytes.
- **ConflictData**: Replication conflict information. Contains conflict type, table, resolution, and timestamp.
- **PollingEvents**: Event type map defining all emittable events (data, stats, subscriptions, slots, conflicts, error).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Data events are emitted within 50ms of the configured interval (e.g., 1000ms interval results in 950-1050ms between events).
- **SC-002**: Parallel queries across 10 nodes complete within 2x the time of a single node query (baseline: single node query typically completes in <100ms, so 10-node parallel should complete in <200ms).
- **SC-003**: UI components can subscribe to data events and receive updates within 100ms of data collection completing.
- **SC-004**: Stop command halts all polling within 100ms (in-flight queries may complete but no events emitted).
- **SC-005**: Service handles node failures gracefully: 99% of polling cycles complete when at least one node is healthy.
- **SC-006**: Memory usage remains stable during extended polling sessions (heap growth <50MB over 1 hour of continuous operation at 1s polling interval).
- **SC-007**: Service recovers automatically when ConnectionManager becomes available after initial unavailability.

## Clarifications

### Session 2025-12-23

- Q: When PollingService starts, should it poll immediately or wait for first interval? → A: Poll immediately on start, then continue at intervals
- Q: How should PollingService determine pglogical vs native replication queries per node? → A: Detect per-node at runtime by checking for pglogical extension/schema

## Assumptions

- ConnectionManager (feature 003-connection-management) is available and provides `queryHealthy()` for parallel queries across healthy nodes.
- PostgreSQL nodes are running version 10+ with native replication or pglogical extension; each node's replication type is detected at runtime.
- The YAML configuration system (feature 002-yaml-config) may provide polling interval configuration; if not present, the service uses defaults.
- UI components (future features) will subscribe to PollingService events via the standard on/off EventEmitter API.
- Query timeout is handled by ConnectionManager; PollingService respects those timeouts rather than implementing its own.
- Zustand store integration (updating store from events) will be handled by separate integration code, not within PollingService itself.
