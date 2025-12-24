# Feature Specification: State Management

**Feature Branch**: `005-state-management`
**Created**: 2025-12-23
**Status**: Draft
**Input**: User description: "Zustand store for application state. Connection status, nodes, subscriptions, slots, conflicts, lag history. UI state for focused panel, selections, modals. Derived selectors."

## Clarifications

### Session 2025-12-23

- Q: When a node disconnects, should the store immediately clear all data for that node, or retain it with a "stale" marker until reconnection? → A: Retain with stale marker, clear on reconnect when fresh data arrives
- Q: What property uniquely identifies a node in the store? → A: Node name from YAML config (user-defined identifier)
- Q: Should the store provide observability hooks for debugging state changes? → A: Zustand devtools middleware for development debugging

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Real-Time Connection Status (Priority: P1)

A user monitors PostgreSQL replication and needs to see the current connection status for all configured nodes at a glance. The application displays live connection health for each node, allowing the user to quickly identify connectivity issues.

**Why this priority**: Connection status is foundational - users cannot monitor replication without knowing which nodes are connected. This is the first thing users see and determines whether other features can function.

**Independent Test**: Can be fully tested by configuring multiple nodes and observing connection status updates as nodes become available or unavailable.

**Acceptance Scenarios**:

1. **Given** the application is started with configured nodes, **When** the store initializes, **Then** each node shows its current connection status (connected, disconnected, connecting, error)
2. **Given** a connected node becomes unreachable, **When** the connection drops, **Then** the status updates to disconnected within 5 seconds
3. **Given** a disconnected node becomes available, **When** the connection is restored, **Then** the status updates to connected

---

### User Story 2 - Navigate Between Panels via Keyboard (Priority: P1)

A user navigates the TUI using keyboard shortcuts to focus different panels (Topology, Subscriptions, Slots, Conflicts, Operations). The focused panel is visually highlighted and accepts keyboard input for navigation within its content.

**Why this priority**: Keyboard-first navigation is a constitution requirement and core to the TUI experience. Users must be able to navigate efficiently without a mouse.

**Independent Test**: Can be tested by pressing panel shortcuts (t/s/l/c/o) and verifying the correct panel receives focus with visual feedback.

**Acceptance Scenarios**:

1. **Given** the application is running, **When** the user presses 't', **Then** the Topology panel becomes focused
2. **Given** the Subscriptions panel is focused, **When** the user presses 'l', **Then** the Slots panel becomes focused
3. **Given** any panel is focused, **When** the user presses Tab, **Then** focus cycles to the next panel in sequence

---

### User Story 3 - View Subscription Details (Priority: P2)

A user monitors replication subscriptions and needs to see their status, lag, and configuration. The subscriptions panel displays all active subscriptions across configured nodes with their current replication state.

**Why this priority**: Subscriptions are the core of logical replication monitoring. After confirming connectivity, users need to understand subscription health.

**Independent Test**: Can be tested by configuring nodes with active subscriptions and verifying the subscription list displays with accurate status information.

**Acceptance Scenarios**:

1. **Given** nodes have active subscriptions, **When** polling data arrives, **Then** subscriptions are displayed with name, status, and lag
2. **Given** a subscription is selected, **When** the user presses Enter, **Then** detailed subscription information is shown
3. **Given** subscription lag changes, **When** new polling data arrives, **Then** the displayed lag updates immediately

---

### User Story 4 - Monitor Replication Slots (Priority: P2)

A user monitors replication slots to ensure they are not accumulating excessive WAL or becoming inactive. The slots panel shows all replication slots with their current state and WAL retention.

**Why this priority**: Slots directly impact disk usage and replication health. Problems with slots can cause serious operational issues.

**Independent Test**: Can be tested by querying nodes with replication slots and verifying slot details display correctly.

**Acceptance Scenarios**:

1. **Given** nodes have replication slots, **When** polling data arrives, **Then** slots are displayed with name, type, active status, and WAL lag
2. **Given** a slot's WAL retention exceeds a threshold, **When** the display updates, **Then** the slot is visually flagged as a warning
3. **Given** a slot becomes inactive, **When** polling detects the change, **Then** the status updates to reflect inactive state

---

### User Story 5 - Review Replication Conflicts (Priority: P2)

A user needs to identify and understand replication conflicts that have occurred in pglogical bidirectional replication. The conflicts panel lists detected conflicts with enough context to understand and resolve them.

**Why this priority**: Conflicts are critical in bidirectional replication - unresolved conflicts can cause data inconsistencies.

**Independent Test**: Can be tested by triggering conflicts in a pglogical setup and verifying they appear with actionable information.

**Acceptance Scenarios**:

1. **Given** pglogical conflicts have occurred, **When** polling data arrives, **Then** conflicts are listed with timestamp, type, and affected table
2. **Given** no conflicts exist, **When** the conflicts panel is focused, **Then** an empty state message is displayed
3. **Given** a conflict is selected, **When** the user presses Enter, **Then** detailed conflict information is shown

---

### User Story 6 - Track Replication Lag History (Priority: P3)

A user wants to understand lag trends over time, not just current values. The application maintains a history of lag measurements and can display them as sparklines or trend indicators.

**Why this priority**: Historical lag data provides context for current values and helps identify patterns. Less urgent than real-time monitoring.

**Independent Test**: Can be tested by running the application for several polling intervals and verifying lag history accumulates and displays correctly.

**Acceptance Scenarios**:

1. **Given** the application is running, **When** new lag measurements arrive, **Then** they are appended to the lag history for each subscription
2. **Given** lag history has accumulated, **When** a subscription is displayed, **Then** a sparkline shows recent lag trend
3. **Given** lag history exceeds the retention limit, **When** new measurements arrive, **Then** oldest entries are removed (FIFO)

---

### User Story 7 - Interact with Modals (Priority: P3)

A user accesses modal dialogs for operations (like dropping a slot) or help information. Modals overlay the main interface, capture keyboard focus, and can be dismissed.

**Why this priority**: Modals are needed for confirmations and detailed views but are secondary to the main monitoring experience.

**Independent Test**: Can be tested by triggering modal display (pressing 'o' for operations, '?' for help) and verifying focus capture and dismissal.

**Acceptance Scenarios**:

1. **Given** any panel is focused, **When** the user presses '?', **Then** the Help modal opens and captures focus
2. **Given** a modal is open, **When** the user presses Escape, **Then** the modal closes and focus returns to the previous panel
3. **Given** the Operations modal is open, **When** an operation is selected, **Then** a confirmation prompt appears before execution

---

### Edge Cases

- What happens when all nodes are disconnected? Display shows all nodes as disconnected with appropriate styling; application remains responsive and continues polling.
- How does the system handle rapid panel switching? Focus changes are immediate (no debounce); Zustand's synchronous updates prevent visual artifacts or state corruption.
- What if lag history storage grows unbounded? Lag history is capped at a configurable maximum (default: 60 entries per subscription representing 1 minute at 1s polling).
- How are stale subscriptions/slots handled when a node reconnects? Data is marked stale on disconnect (retained with visual indicator), then replaced with fresh state upon reconnection.
- What happens if a modal is open when a critical error occurs? Error notifications appear without interrupting the modal; modal can be dismissed to see details.

## Requirements *(mandatory)*

### Functional Requirements

#### Core State Structure

- **FR-001**: System MUST maintain connection status (connected, disconnected, connecting, error) for each configured node
- **FR-002**: System MUST store node information including name (unique identifier from YAML config), host, port, database name, and health status
- **FR-003**: System MUST store subscription data including name, status, origin, target, and current lag
- **FR-004**: System MUST store replication slot data including name, type, plugin, active status, and WAL position
- **FR-005**: System MUST store conflict data including timestamp, conflict type, table name, and resolution status (pglogical nodes only)
- **FR-006**: System MUST maintain lag history as time-series data with configurable retention (default: 60 samples per subscription)
- **FR-006a**: System MUST track a stale flag per node to indicate data freshness (stale when disconnected, fresh when connected)

#### UI State

- **FR-007**: System MUST track the currently focused panel (topology, subscriptions, slots, conflicts, operations)
- **FR-008**: System MUST track selected items within each panel (selected node, selected subscription, etc.)
- **FR-009**: System MUST track modal state including which modal is open and its configuration
- **FR-010**: System MUST preserve focus state when modals open and restore it when they close

#### State Updates

- **FR-011**: System MUST update state reactively when PollingService emits new data
- **FR-012**: System MUST merge partial node data gracefully (if one node fails, others remain current)
- **FR-013**: System MUST mark data as stale (not clear) when a node disconnects, and replace with fresh data upon reconnection

#### Derived Selectors

- **FR-014**: System MUST provide selectors for aggregated views (e.g., all subscriptions across all nodes)
- **FR-015**: System MUST provide selectors for filtered views (e.g., only subscriptions with lag above threshold)
- **FR-016**: System MUST provide selectors for computed values (e.g., total slot count, max lag, conflict count)
- **FR-017**: Selectors MUST use memoization to prevent unnecessary re-renders

#### Integration

- **FR-018**: Store MUST integrate with Zustand's subscribeWithSelector middleware for fine-grained subscriptions
- **FR-019**: Store MUST be accessible to all React components via a provider or hook
- **FR-020**: Store actions MUST be type-safe and produce predictable state transitions
- **FR-021**: Store MUST integrate with devtools middleware for development-time state debugging (disabled in production)

### Key Entities

- **Node**: Represents a PostgreSQL instance being monitored. Uniquely identified by name from YAML config. Contains connection info, health status, stale flag, capabilities (pglogical support), and associated replication data.
- **Subscription**: Represents a logical replication subscription. Belongs to a node. Contains status, origin/target info, and lag measurements.
- **Slot**: Represents a replication slot. Belongs to a node. Contains type (logical/physical), plugin, active status, and WAL position metrics.
- **Conflict**: Represents a pglogical replication conflict. Belongs to a node. Contains conflict type, affected table, timestamp, and resolution status.
- **LagSample**: A timestamped lag measurement. Belongs to a subscription. Used for historical trend display.
- **UIState**: Current UI configuration including focused panel, selections per panel, and active modal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: UI reflects state changes from PollingService within 100ms of data arrival
- **SC-002**: Panel focus changes are reflected in UI within 50ms of keyboard input
- **SC-003**: Application maintains 60 FPS during normal operation with up to 10 nodes, 50 subscriptions, and 100 slots
- **SC-004**: Users can navigate between all 5 main panels using single keystrokes
- **SC-005**: Modal open/close operations complete within 50ms with no dropped keyboard events
- **SC-006**: Lag history visualization updates smoothly without visual stuttering
- **SC-007**: State remains consistent after 1000 polling cycles with no memory leaks or stale data accumulation
