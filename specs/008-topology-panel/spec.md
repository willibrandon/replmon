# Feature Specification: Topology Panel

**Feature Branch**: `008-topology-panel`
**Created**: 2025-12-24
**Status**: Draft
**Input**: User description: "ASCII-art visualization of replication cluster nodes. Show node names, roles, status indicators, connection lines with latency. Bidirectional relationship display."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Cluster Topology at a Glance (Priority: P1)

A database administrator launches replmon and immediately sees a visual representation of all configured PostgreSQL nodes in the cluster. Each node displays its name, role (primary/standby/provider/subscriber), and connection status, allowing the DBA to quickly assess the overall cluster health.

**Why this priority**: This is the core value of the topology panel - providing immediate visual understanding of cluster structure and health without reading logs or querying databases.

**Independent Test**: Can be fully tested by launching replmon with a multi-node configuration and verifying all nodes appear with correct names, roles, and status indicators. Delivers immediate value by showing cluster overview.

**Acceptance Scenarios**:

1. **Given** a configuration with 3 PostgreSQL nodes, **When** the topology panel is displayed, **Then** all 3 nodes appear as distinct visual boxes showing node name, role badge, and status indicator
2. **Given** a node is connected, **When** viewing the topology panel, **Then** a green status indicator (filled circle) appears next to that node
3. **Given** a node connection has failed, **When** viewing the topology panel, **Then** a red status indicator appears and the node is visually marked as offline
4. **Given** a node is still connecting, **When** viewing the topology panel, **Then** a yellow/amber status indicator shows connecting state

---

### User Story 2 - Understand Replication Relationships (Priority: P2)

A DBA needs to understand which nodes replicate to which other nodes. The topology panel displays connection lines between nodes showing the replication flow direction and whether relationships are bidirectional. This helps identify the replication topology (star, chain, mesh).

**Why this priority**: Understanding replication relationships is essential for troubleshooting and capacity planning, but requires nodes to be visible first.

**Independent Test**: Can be tested with a bidirectional replication setup (pglogical) and verified by checking that connection lines appear between provider/subscriber pairs with correct directional arrows.

**Acceptance Scenarios**:

1. **Given** node A subscribes to node B, **When** viewing the topology, **Then** a directed connection line (arrow) appears from B to A indicating replication flow
2. **Given** bidirectional replication between node A and B (pglogical), **When** viewing the topology, **Then** a double-headed arrow or bidirectional connection indicator appears between them
3. **Given** node A subscribes to both B and C, **When** viewing the topology, **Then** connection lines appear from both B and C pointing to A

---

### User Story 3 - Monitor Replication Latency (Priority: P3)

A DBA monitoring a geographically distributed cluster needs to see replication latency between nodes. Connection lines in the topology display latency values (in milliseconds), allowing quick identification of slow replication paths that may need attention.

**Why this priority**: Latency visibility enhances monitoring but is additive to the core topology visualization.

**Independent Test**: Can be tested with active replication and verified by observing latency values displayed on connection lines that update with polling data.

**Acceptance Scenarios**:

1. **Given** active replication from node A to B with measurable lag, **When** viewing the topology, **Then** the connection line displays the current lag value (e.g., "45ms")
2. **Given** lag is between 5 and 30 seconds, **When** viewing the topology, **Then** the lag value is highlighted in warning color (yellow/amber)
3. **Given** lag exceeds 30 seconds, **When** viewing the topology, **Then** the lag value is highlighted in critical color (red)
4. **Given** lag cannot be determined, **When** viewing the topology, **Then** a placeholder indicator (e.g., "?") appears instead of a numeric value

---

### User Story 4 - Select Nodes for Detail View (Priority: P4)

A DBA can navigate to and select individual nodes in the topology panel using keyboard navigation (j/k or arrow keys). The selected node is visually highlighted, and this selection can trigger detail views in other panels.

**Why this priority**: Interactive selection enhances usability but requires the base visualization to work first.

**Independent Test**: Can be tested by using j/k keys to move selection between nodes and verifying the selection highlight updates correctly.

**Acceptance Scenarios**:

1. **Given** the topology panel is focused, **When** pressing 'j' or down arrow, **Then** the selection moves to the next node in sequence
2. **Given** the topology panel is focused, **When** pressing 'k' or up arrow, **Then** the selection moves to the previous node in sequence
3. **Given** a node is selected, **When** viewing the topology, **Then** that node has a distinct visual highlight (bold text, different border, or color accent)
4. **Given** the last node is selected and 'j' is pressed, **When** attempting to move past the last node, **Then** selection remains on the last node (no wrap)

---

### Edge Cases

- What happens when only one node is configured? Display single node without connection lines.
- What happens when a node becomes stale (disconnected but data retained)? Show node with muted/dimmed appearance and stale indicator.
- How does the layout adapt to many nodes (5+)? Layout should adapt to available terminal width, potentially wrapping to multiple rows.
- What happens when terminal width is very narrow? Switch to a compact vertical layout or show abbreviated node information.
- How are pglogical vs native replication relationships distinguished? Native connections use solid lines; pglogical connections use dashed lines or display a "pglogical" badge on the connection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all configured nodes as distinct visual elements showing node identifier and host:port information
- **FR-002**: System MUST show a status indicator (dot/circle) for each node with color coding: green (connected), red (failed), yellow (connecting), gray (unknown/stale)
- **FR-003**: System MUST display node role information (primary, standby, provider, subscriber, or bidirectional) via text label or badge
- **FR-004**: System MUST draw connection lines between nodes that have active replication relationships
- **FR-005**: System MUST indicate replication direction on connection lines using arrows or directional markers
- **FR-006**: System MUST display bidirectional connections with double-headed arrows or paired directional indicators for pglogical bidirectional setups
- **FR-007**: System MUST show replication lag values on connection lines when lag data is available from the store
- **FR-008**: System MUST color-code lag values based on severity: normal (green, <5s), warning (yellow/amber, 5-30s), critical (red, >30s) using theme colors
- **FR-009**: System MUST support keyboard navigation (j/k or arrow keys) to select nodes when the panel is focused
- **FR-010**: System MUST visually highlight the currently selected node
- **FR-011**: System MUST integrate with the existing Zustand store to read node status, subscription data, and lag information
- **FR-012**: System MUST update visualization in real-time as polling data arrives (reactive to store changes)
- **FR-013**: System MUST indicate stale nodes (disconnected but with retained data) with a muted visual appearance
- **FR-014**: System MUST adapt layout responsively based on terminal dimensions using existing breakpoint hooks
- **FR-015**: System MUST use the existing theme system for all colors and styling

### Key Entities *(include if feature involves data)*

- **Node**: Represents a PostgreSQL instance with id, name, host, port, role, connection status, and pglogical flag
- **Connection/Relationship**: Represents a replication relationship between two nodes with source, target, direction (unidirectional/bidirectional), and lag metrics
- **Subscription**: Existing entity from store providing replication relationship and lag data

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify all cluster nodes and their status within 2 seconds of viewing the panel
- **SC-002**: Users can determine which nodes replicate to which other nodes by following visual connection lines
- **SC-003**: Users can identify replication latency issues by seeing color-coded lag values on connections
- **SC-004**: Users can navigate between 5 or more nodes using keyboard in under 3 seconds
- **SC-005**: Panel renders correctly and remains usable on terminals as narrow as 80 columns
- **SC-006**: Panel updates within 500ms of new polling data arriving in the store
- **SC-007**: Bidirectional relationships are clearly distinguishable from unidirectional ones at a glance

## Clarifications

### Session 2025-12-24

- Q: What are the lag threshold values for warning and critical states? → A: 5 seconds for warning, 30 seconds for critical

## Assumptions

- Local reference repositories available for planning: `../pglogical/` (pglogical extension) and `../postgres/` (PostgreSQL source)
- The existing TopologyPanel component stub will be enhanced rather than replaced
- Node role information will be derived from subscription data (subscriber nodes have subscriptions, provider nodes are referenced by subscriptions)
- Lag data will come from the existing lagHistory in the replication store slice
- Connection relationships will be inferred from subscription data (each subscription represents a connection from provider to subscriber)
- The ASCII-art visualization will use box-drawing characters available in most modern terminals
- For initial implementation, a horizontal layout with nodes side-by-side is acceptable; vertical/adaptive layouts can be enhanced later
