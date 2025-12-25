# Feature Specification: Subscriptions Panel

**Feature Branch**: `009-subscriptions-panel`
**Created**: 2025-12-24
**Status**: Draft
**Input**: User description: "Live subscription status display. Status dot indicators (replicating, catchup, down, disabled). LSN positions, lag bytes, lag time. Selectable list with detail view."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Monitor All Subscriptions at a Glance (Priority: P1)

A database administrator opens replmon and views the Subscriptions panel to quickly assess the health of all logical replication subscriptions across the cluster. Each subscription displays its name, status indicator, and node context, allowing the DBA to immediately identify which subscriptions need attention.

**Why this priority**: This is the core value of the panel - providing immediate visibility into subscription health without querying each node individually.

**Independent Test**: Can be fully tested by launching replmon with multiple nodes containing subscriptions and verifying all subscriptions appear with correct names, status dots, and node identifiers. Delivers immediate value by showing cluster-wide subscription health.

**Acceptance Scenarios**:

1. **Given** 3 nodes with a total of 5 subscriptions configured, **When** the subscriptions panel is displayed, **Then** all 5 subscriptions appear in a scrollable list showing subscription name, status indicator, and node name
2. **Given** a subscription with status "replicating", **When** viewing the panel, **Then** a green filled dot (●) appears next to that subscription
3. **Given** a subscription with status "catchup", **When** viewing the panel, **Then** a yellow/amber half-filled dot (◐) appears indicating it is catching up
4. **Given** a subscription with status "down", **When** viewing the panel, **Then** a red filled dot (●) appears indicating a problem
5. **Given** a subscription that is disabled (enabled=false), **When** viewing the panel, **Then** a gray empty dot (○) appears indicating disabled state

---

### User Story 2 - View Subscription Lag Metrics (Priority: P2)

A DBA needs to understand how far behind each subscription is lagging. The panel displays lag bytes and lag time for each subscription, allowing quick identification of subscriptions falling behind or experiencing replication delays.

**Why this priority**: Lag metrics are essential for understanding replication health, but require status visibility to be meaningful.

**Independent Test**: Can be tested with active replication and verified by observing lag values displayed next to each subscription that update in real-time with polling data.

**Acceptance Scenarios**:

1. **Given** a subscription with measurable lag, **When** viewing the subscriptions panel, **Then** the lag bytes value is displayed (e.g., "128 KB", "2.3 MB")
2. **Given** a subscription with time-based lag available, **When** viewing the panel, **Then** the lag time is displayed (e.g., "5s", "2m 30s")
3. **Given** lag exceeds 5 seconds, **When** viewing the panel, **Then** the lag value is highlighted in warning color
4. **Given** lag exceeds 30 seconds, **When** viewing the panel, **Then** the lag value is highlighted in critical color
5. **Given** lag data is unavailable (no corresponding stats), **When** viewing the panel, **Then** a placeholder (e.g., "-" or "N/A") appears instead

---

### User Story 3 - View LSN Positions (Priority: P3)

A DBA troubleshooting replication issues needs to see the current LSN (Log Sequence Number) positions for subscriptions to understand where each subscription stands in the replication stream and compare against source WAL positions.

**Why this priority**: LSN positions are technical details useful for debugging but are secondary to status and lag visibility.

**Independent Test**: Can be tested by verifying LSN values appear for subscriptions and match expected format (e.g., "0/3000158").

**Acceptance Scenarios**:

1. **Given** a subscription with received LSN data, **When** viewing the subscriptions panel, **Then** the received LSN is displayed (e.g., "0/3000158")
2. **Given** a subscription with latest end LSN data, **When** viewing the panel, **Then** the latest processed LSN is displayed
3. **Given** LSN data is null, **When** viewing the panel, **Then** a placeholder appears indicating no data

---

### User Story 4 - Select Subscription for Details (Priority: P4)

A DBA can navigate to and select individual subscriptions in the list using keyboard navigation (j/k or arrow keys). The selected subscription is visually highlighted, and pressing Enter opens a detail view showing comprehensive subscription information.

**Why this priority**: Interactive selection enhances usability but requires the base list to function first.

**Independent Test**: Can be tested by using j/k keys to move selection between subscriptions and verifying the selection highlight updates correctly.

**Acceptance Scenarios**:

1. **Given** the subscriptions panel is focused, **When** pressing 'j' or down arrow, **Then** the selection moves to the next subscription in the list
2. **Given** the subscriptions panel is focused, **When** pressing 'k' or up arrow, **Then** the selection moves to the previous subscription in the list
3. **Given** a subscription is selected, **When** viewing the panel, **Then** that subscription row has a distinct visual highlight
4. **Given** the last subscription is selected and 'j' is pressed, **When** attempting to move past the last item, **Then** selection remains on the last item (no wrap)
5. **Given** a subscription is selected, **When** pressing Enter, **Then** a detail modal opens showing comprehensive subscription information

---

### User Story 5 - View Subscription Detail Modal (Priority: P5)

When a subscription is selected and Enter is pressed, a detail modal appears showing comprehensive information about the subscription including provider details, replication sets, slot information, and worker status.

**Why this priority**: Detail view is additive to selection functionality and provides deep-dive capability.

**Independent Test**: Can be tested by selecting a subscription, pressing Enter, and verifying the modal displays all available subscription fields.

**Acceptance Scenarios**:

1. **Given** a subscription is selected, **When** pressing Enter, **Then** a modal appears with subscription name as the title
2. **Given** the detail modal is open for a pglogical subscription, **When** viewing the modal, **Then** provider node name, host, and port are displayed
3. **Given** the detail modal is open, **When** viewing the modal, **Then** replication sets are listed (if available)
4. **Given** the detail modal is open, **When** viewing the modal, **Then** slot name, worker PID, and last message time are displayed
5. **Given** the detail modal is open, **When** pressing Escape, **Then** the modal closes and focus returns to the subscriptions panel

---

### Edge Cases

- What happens when no subscriptions exist across any node? Display an empty state with informative message (e.g., "No subscriptions found")
- What happens when a node's data becomes stale? Show subscriptions from stale nodes with muted/dimmed appearance and stale indicator
- How does the list handle many subscriptions (20+)? List should be scrollable with visible scroll indicators and maintain selection position
- What happens when subscription status cannot be determined? Display "unknown" status with muted indicator (gray empty dot ○), same as disabled state
- How are native vs pglogical subscriptions distinguished? Display a small badge or indicator showing the source type

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all subscriptions from all connected nodes in a consolidated list, grouped or tagged by node
- **FR-002**: System MUST show a status indicator (dot) for each subscription with color coding: green (replicating), yellow (catchup/initializing), red (down), gray (disabled/unknown)
- **FR-003**: System MUST display subscription name and associated node identifier for each list item
- **FR-004**: System MUST display lag bytes for each subscription when available, with human-readable formatting (KB, MB, GB)
- **FR-005**: System MUST display lag time in seconds for each subscription when available, with human-readable formatting (s, m, h)
- **FR-006**: System MUST color-code lag values based on severity: normal (green, <5s), warning (yellow/amber, 5-30s), critical (red, >30s) using theme colors
- **FR-007**: System MUST display received LSN and latest end LSN for each subscription when available
- **FR-008**: System MUST support keyboard navigation (j/k or arrow keys) to select subscriptions when the panel is focused
- **FR-009**: System MUST visually highlight the currently selected subscription
- **FR-010**: System MUST open a detail modal when Enter is pressed on a selected subscription
- **FR-011**: System MUST display comprehensive subscription details in the modal including: provider info (name, host, port), replication sets, slot name, worker PID, enabled status, source type (native/pglogical), and last message time
- **FR-012**: System MUST close the detail modal when Escape is pressed, restoring focus to the subscriptions panel
- **FR-013**: System MUST integrate with the existing Zustand store to read subscription data and lag history
- **FR-014**: System MUST update the list in real-time as polling data arrives (reactive to store changes)
- **FR-015**: System MUST indicate stale subscriptions (from disconnected nodes) with a muted visual appearance
- **FR-016**: System MUST display an empty state message when no subscriptions exist
- **FR-017**: System MUST use the existing theme system for all colors and styling
- **FR-018**: System MUST display a source badge distinguishing native subscriptions from pglogical subscriptions

### Key Entities *(include if feature involves data)*

- **SubscriptionData**: Existing entity containing subscription name, enabled flag, status, provider info, slot name, LSN positions, replication sets, last message time, worker PID, source type, and timestamp
- **LagSample**: Existing entity containing timestamp, lag bytes, and lag seconds for time-series display
- **NodeInfo**: Existing entity providing node context (id, name, host, port, hasPglogical flag)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify all cluster subscriptions and their status within 3 seconds of viewing the panel
- **SC-002**: Users can identify which subscriptions are experiencing lag problems by seeing color-coded lag values
- **SC-003**: Users can navigate between 10 or more subscriptions using keyboard in under 5 seconds
- **SC-004**: Users can access detailed subscription information in under 2 interactions (select + Enter)
- **SC-005**: Panel updates within 500ms of new polling data arriving in the store
- **SC-006**: Status indicators correctly map to subscription states with 100% accuracy (replicating=green, catchup=yellow, down=red, disabled=gray)
- **SC-007**: Panel remains usable on terminals as narrow as 80 columns (information may be truncated but readable)

## Assumptions

- The SubscriptionsPanel component will be created as a new component in `src/components/panels/`
- Subscription data is already available in the Zustand store via the `subscriptions` Map
- Lag data is available via the `lagHistory` Map keyed by `${nodeId}:${subscriptionName}`
- The existing StatusDot component will be used for status indicators with appropriate variant mapping
- The existing Modal component will be used for the detail view
- The existing keyboard navigation patterns from other panels (j/k, Enter, Escape) will be followed
- Lag thresholds follow the same values as topology panel: 5 seconds for warning, 30 seconds for critical
- Panel will follow the same responsive patterns using existing breakpoint hooks
