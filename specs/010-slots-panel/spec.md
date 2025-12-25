# Feature Specification: Replication Slots Panel

**Feature Branch**: `010-slots-panel`
**Created**: 2025-12-24
**Status**: Draft
**Input**: User description: "Replication Slots Panel - Slot health monitoring with progress bars. Active/inactive status, retained WAL bytes, WAL status (healthy/warning/critical). Total WAL retention summary."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View All Slots with Health Status (Priority: P1)

As a DBA, I want to see all replication slots across connected nodes with their health status at a glance, so I can quickly identify which slots need attention.

**Why this priority**: This is the core value proposition - without being able to see slots and their status, the panel has no purpose. This enables the DBA to monitor slot health without running SQL queries.

**Independent Test**: Can be fully tested by navigating to the slots panel and verifying all slots from connected nodes appear with correct active/inactive status indicators.

**Acceptance Scenarios**:

1. **Given** multiple nodes with replication slots, **When** the user presses `l` to focus the slots panel, **Then** all slots from all nodes are displayed in a consolidated list.
2. **Given** a slot that is actively in use, **When** viewing the slots panel, **Then** the slot shows a success (green) status indicator.
3. **Given** a slot that is inactive, **When** viewing the slots panel, **Then** the slot shows a muted (gray) status indicator.
4. **Given** a node that has disconnected (stale), **When** viewing slots from that node, **Then** slots appear dimmed with a stale indicator.

---

### User Story 2 - WAL Retention Progress Bars with Severity (Priority: P1)

As a DBA, I want to see how much WAL each slot is retaining with visual progress bars colored by severity, so I can quickly spot slots that are consuming excessive disk space.

**Why this priority**: WAL retention is the primary health metric for slots. Excessive retention causes disk space issues and can crash the database. Visual progress bars make this immediately apparent.

**Independent Test**: Can be tested by creating slots with varying WAL retention levels and verifying progress bars display with correct severity colors based on configured thresholds.

**Acceptance Scenarios**:

1. **Given** a slot with retained WAL below the warning threshold (default 1GB), **When** viewing the slots panel, **Then** the progress bar displays in success/green color.
2. **Given** a slot with retained WAL between warning and critical thresholds (1GB-5GB by default), **When** viewing the slots panel, **Then** the progress bar displays in warning/yellow color.
3. **Given** a slot with retained WAL above the critical threshold (default 5GB), **When** viewing the slots panel, **Then** the progress bar displays in critical/red color.
4. **Given** a slot with 2.5GB retained and 5GB critical threshold, **When** viewing the slots panel, **Then** the progress bar shows approximately 50% filled.

---

### User Story 3 - WAL Status Indicator (Priority: P2)

As a DBA, I want to see the PostgreSQL WAL status for each slot (reserved/extended/unreserved/lost), so I can understand if slots are at risk of losing their position.

**Why this priority**: WAL status is a PostgreSQL 13+ feature that provides critical insight into slot health beyond just byte count. "Lost" status means the slot can no longer catch up.

**Independent Test**: Can be tested by verifying WAL status displays correctly for each slot when connected to PostgreSQL 13+, and shows graceful degradation for older versions.

**Acceptance Scenarios**:

1. **Given** a slot with WAL status "reserved", **When** viewing the slots panel, **Then** the slot shows a healthy/success indicator.
2. **Given** a slot with WAL status "extended", **When** viewing the slots panel, **Then** the slot shows a warning indicator.
3. **Given** a slot with WAL status "unreserved" or "lost", **When** viewing the slots panel, **Then** the slot shows a critical indicator.
4. **Given** a connection to PostgreSQL 12 or earlier, **When** viewing the slots panel, **Then** WAL status shows as unavailable/"-" (graceful degradation).

---

### User Story 4 - Summary Header with Aggregated Stats (Priority: P2)

As a DBA, I want to see a summary of total slots, active/inactive counts, and total WAL retention at the top of the panel, so I can get an overview without scanning the entire list.

**Why this priority**: Summary stats provide at-a-glance health assessment. Knowing "3 inactive slots, 12GB total retention" immediately signals whether investigation is needed.

**Independent Test**: Can be tested by verifying the header shows correct counts and total retention that matches the sum of individual slot values.

**Acceptance Scenarios**:

1. **Given** 5 slots total (3 active, 2 inactive), **When** viewing the slots panel, **Then** the header shows "5 slots" with badges for "3 active" and "2 inactive".
2. **Given** slots with a combined 2.5GB WAL retention, **When** viewing the slots panel, **Then** the header shows total retention as "2.5 GB" (or appropriate unit).
3. **Given** any slots above critical threshold, **When** viewing the slots panel, **Then** the header shows a critical badge with count.
4. **Given** no replication slots exist, **When** viewing the slots panel, **Then** an empty state message is displayed.

---

### User Story 5 - Keyboard Navigation and Detail Modal (Priority: P3)

As a DBA, I want to navigate slots with keyboard (j/k) and press Enter to see full slot details, so I can investigate individual slots without using a mouse.

**Why this priority**: Keyboard navigation follows the app's keyboard-first design. Detail modal provides complete information that doesn't fit in the list view.

**Independent Test**: Can be tested by using j/k to move selection and Enter to open detail modal, verifying all slot fields are displayed.

**Acceptance Scenarios**:

1. **Given** the slots panel is focused with multiple slots, **When** the user presses `j` or down arrow, **Then** the next slot is selected (highlighted).
2. **Given** a slot is selected, **When** the user presses `k` or up arrow, **Then** the previous slot is selected.
3. **Given** a slot is selected, **When** the user presses Enter, **Then** a detail modal opens showing: slot name, node, type (physical/logical), plugin (if logical), database, active status, retained bytes (formatted), WAL status, and timestamp.
4. **Given** the detail modal is open, **When** the user presses Escape, **Then** the modal closes and selection is preserved.

---

### Edge Cases

- What happens when a slot has 0 bytes retained? Progress bar shows empty (0%) with success color.
- What happens when retained bytes exceed the critical threshold by 10x? Progress bar shows 100% filled (capped) in critical color; actual bytes still shown numerically.
- What happens when all nodes are disconnected? Panel shows stale data for all slots with stale indicators.
- What happens when a slot is deleted while viewing? Slot disappears from list on next poll; no crash or error.
- What happens when slot name is very long? Name is truncated with ellipsis in list view; full name shown in detail modal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all replication slots from all connected nodes in a single consolidated list.
- **FR-002**: System MUST show active/inactive status for each slot using StatusDot component (success for active, muted for inactive).
- **FR-003**: System MUST display retained WAL bytes for each slot with a ProgressBar component.
- **FR-004**: System MUST color progress bars based on configured slot_retention thresholds (success < warning < critical).
- **FR-005**: System MUST show WAL status (reserved/extended/unreserved/lost) when available (PostgreSQL 13+), with appropriate color coding.
- **FR-006**: System MUST display a summary header with total slot count, active/inactive counts, and total WAL retention.
- **FR-007**: System MUST support keyboard navigation (j/k or arrows) for selecting slots.
- **FR-008**: System MUST open a detail modal when Enter is pressed on a selected slot.
- **FR-009**: System MUST show slot type badge (physical/logical) for each slot.
- **FR-010**: System MUST dim slots from stale (disconnected) nodes with a stale indicator.
- **FR-011**: System MUST show empty state when no slots exist across all nodes.
- **FR-012**: System MUST display formatted byte values (B, KB, MB, GB) for retained WAL.

### Key Entities

- **SlotData**: Represents a replication slot with nodeId, slotName, slotType (physical/logical), plugin, database, active, retainedBytes, walStatus, isStale, and timestamp.
- **SlotListItem**: Derived display item with SlotData fields plus isSelected, retentionSeverity, walStatusSeverity, nodeName, and formatted values.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: DBAs can identify slots with critical WAL retention within 2 seconds of viewing the panel (visual scan using color-coded progress bars).
- **SC-002**: All 24 test cases covering 5 user stories pass (following existing test patterns).
- **SC-003**: Panel renders correctly at all supported terminal widths (standard, narrow, short, compact breakpoints).
- **SC-004**: Keyboard navigation between slots responds within 100ms (perceived instant).
- **SC-005**: Progress bar severity colors match configured threshold values exactly.

## Assumptions

- Progress bar width is calculated relative to the critical threshold (100% = critical threshold reached). Values beyond critical still show 100% but with critical coloring.
- Default slot_retention thresholds from config/defaults.ts are used: warning=1GB, critical=5GB.
- Slot list is sorted by node name, then slot name (alphabetical) for consistent ordering.
- The existing ProgressBar atom component will be reused; if color customization is needed, the component may be extended.
- Selection state follows the existing pattern using the store's selections Map with key 'slots'.
