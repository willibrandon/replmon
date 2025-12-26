# Feature Specification: Operations Modal

**Feature Branch**: `013-operations-modal`
**Created**: 2025-12-25
**Status**: Draft
**Input**: User description: "Operations Modal - DBA operations interface. Pause/resume subscriptions, resync tables, drop/create slots, clear conflict log, export Prometheus metrics. Confirmation prompts for dangerous actions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pause/Resume Subscriptions (Priority: P1)

A DBA notices a replication subscription is causing excessive load on the target database during peak hours. They need to temporarily pause the subscription to reduce load, then resume it later during off-peak hours.

**Why this priority**: Subscription control is the most commonly needed operational action. Pausing subscriptions is critical for maintenance windows, troubleshooting, and managing replication lag during high-load periods.

**Independent Test**: Can be fully tested by selecting a subscription, pausing it, verifying the pause took effect, then resuming it and confirming replication continues.

**Acceptance Scenarios**:

1. **Given** a running pglogical subscription is selected in the subscriptions panel, **When** the user opens the operations modal and selects "Pause Subscription", **Then** the system prompts for confirmation, and upon confirmation, the subscription is disabled and the UI reflects the paused state.
2. **Given** a paused pglogical subscription is selected, **When** the user opens the operations modal and selects "Resume Subscription", **Then** the subscription is enabled and replication resumes.
3. **Given** the user attempts to pause a subscription, **When** the pause operation fails (e.g., permissions issue), **Then** the system displays an error message explaining the failure.

---

### User Story 2 - Resync Tables (Priority: P1)

A DBA discovers data inconsistency on a specific table after a failed DDL change. They need to trigger a resync of that table to re-copy data from the provider without affecting other tables.

**Why this priority**: Table resync is essential for resolving data consistency issues without dropping/recreating entire subscriptions. Critical for production environments where targeted fixes are needed.

**Independent Test**: Can be fully tested by selecting a subscription, choosing a specific table, triggering resync, and verifying the table is re-synchronized.

**Acceptance Scenarios**:

1. **Given** a subscription is selected and the user opens the operations modal, **When** the user selects "Resync Table" and chooses a replicated table, **Then** the system prompts for confirmation and initiates the resync operation.
2. **Given** a resync is triggered, **When** the operation completes, **Then** the user sees a success message and the table resync is visible in subscription status.
3. **Given** a resync is in progress, **When** the user views the subscriptions panel, **Then** they can see the resync progress/status indicator.

---

### User Story 3 - Manage Replication Slots (Priority: P2)

A DBA needs to clean up an orphaned replication slot that is causing WAL retention issues, or create a new slot for setting up replication.

**Why this priority**: Slot management is important for system health (WAL bloat prevention) but is less frequently needed than subscription operations.

**Independent Test**: Can be fully tested by viewing existing slots, dropping an unused slot, creating a new slot, and verifying the slot list updates.

**Acceptance Scenarios**:

1. **Given** a replication slot is selected in the slots panel, **When** the user opens the operations modal and selects "Drop Slot", **Then** the system displays a high-severity confirmation warning (since slot drops can break replication) and proceeds only after explicit confirmation.
2. **Given** the user opens the operations modal from the slots panel, **When** the user selects "Create Slot", **Then** they can specify the slot name and type (logical/physical), and the slot is created after confirmation.
3. **Given** the user attempts to drop an active slot, **When** the confirmation appears, **Then** the warning clearly indicates this is a destructive action that may impact active replication.

---

### User Story 4 - Clear Conflict Log (Priority: P2)

A DBA has resolved multiple pglogical conflicts manually and wants to clear the conflict history to reduce noise in the conflicts panel.

**Why this priority**: Conflict management is important for maintaining operational clarity but is a housekeeping task rather than critical operation.

**Independent Test**: Can be fully tested by viewing conflicts, clearing the conflict log, and verifying conflicts are removed from the display.

**Acceptance Scenarios**:

1. **Given** there are conflicts shown in the conflicts panel, **When** the user opens the operations modal and selects "Clear Conflict Log", **Then** the system prompts for confirmation with the number of conflicts to be cleared.
2. **Given** the user confirms clearing conflicts, **When** the operation completes, **Then** the conflict history table is cleared and the conflicts panel reflects the empty state.
3. **Given** the system is using log-based conflict detection (fallback mode), **When** the user attempts to clear conflicts, **Then** the system explains that log-based conflicts cannot be cleared (they are read from PostgreSQL logs, not a table).

---

### User Story 5 - Export Prometheus Metrics (Priority: P3)

A DBA wants to integrate replmon metrics into their existing Prometheus monitoring stack without running replmon continuously.

**Why this priority**: Metrics export is a convenience feature for integration with external systems. Core monitoring is already provided by the TUI itself.

**Independent Test**: Can be fully tested by triggering metrics export and verifying the output is valid Prometheus text format.

**Acceptance Scenarios**:

1. **Given** the user opens the operations modal, **When** the user selects "Export Prometheus Metrics", **Then** current replication metrics are exported in Prometheus text exposition format.
2. **Given** metrics are exported, **When** the user specifies an output path, **Then** metrics are written to the specified file.
3. **Given** metrics are exported, **When** no output path is specified, **Then** metrics are displayed in a scrollable modal for manual copying.

---

### Edge Cases

- What happens when the user attempts an operation on a disconnected/stale node?
- How does the system handle operations on native PostgreSQL replication (non-pglogical) where certain operations may not be available?
- What happens if an operation times out or the connection is lost mid-operation?
- How are concurrent operations handled if the user triggers multiple operations quickly?
- What happens when the user lacks PostgreSQL permissions for the requested operation?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an operations modal accessible via keyboard shortcut ('o') from any panel
- **FR-002**: System MUST display context-sensitive operations based on the currently focused panel and selected item
- **FR-003**: System MUST support pausing and resuming pglogical subscriptions via `pglogical.alter_subscription_disable()` and `pglogical.alter_subscription_enable()` functions
- **FR-004**: System MUST support resyncing specific tables within a subscription via `pglogical.alter_subscription_resynchronize_table()` function
- **FR-005**: System MUST support creating replication slots with user-specified name and type (logical/physical)
- **FR-006**: System MUST support dropping replication slots
- **FR-007**: System MUST support clearing the pglogical conflict history table (`pglogical.conflict_history`)
- **FR-008**: System MUST export metrics in Prometheus text exposition format including: lag bytes, lag time, slot WAL retention, conflict counts, subscription status
- **FR-009**: System MUST require typing the resource name to confirm destructive operations (drop slot, clear conflicts)
- **FR-010**: System MUST display enhanced warnings with severity indicators for high-risk operations
- **FR-011**: System MUST display operation results (success/failure) with appropriate error messages
- **FR-012**: System MUST gracefully handle operations on disconnected nodes with clear error messaging
- **FR-013**: System MUST indicate when operations are not available (e.g., native replication limitations, pglogical not installed)
- **FR-014**: System MUST prevent concurrent operations by disabling operation buttons while an operation is executing
- **FR-015**: System MUST display a "History" section within the operations modal showing session operation log with timestamps and results

### Key Entities

- **Operation**: Represents a DBA action with name, target (subscription/slot/conflicts), severity level, required confirmations, and execution function
- **OperationResult**: Captures success/failure status, message, timestamp, and affected resource
- **ConfirmationPrompt**: Contains operation description, severity level (info/warning/danger), confirmation text, and cancel option
- **PrometheusMetric**: Metric name, type (gauge/counter), labels, value, and help text

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete any supported operation within 5 interactions (open modal, select operation, confirm, view result)
- **SC-002**: All destructive operations require explicit confirmation with clear indication of consequences
- **SC-003**: Operation results are displayed within 2 seconds of completion
- **SC-004**: Error messages clearly explain why an operation failed and suggest remediation steps
- **SC-005**: 100% of operations are logged in-memory with timestamp, user action, and result (viewable in current session)
- **SC-006**: Exported Prometheus metrics are valid and parseable by standard Prometheus scrapers

## Clarifications

### Session 2025-12-25

- Q: Where should audit logs be stored? → A: In-memory only (visible in current session, lost on exit)
- Q: How are Prometheus metrics displayed when no output path specified? → A: Display in a scrollable modal for manual copying
- Q: How to handle concurrent operation attempts? → A: Disable operation buttons while an operation is executing
- Q: What confirmation mechanism for destructive operations? → A: Type the resource name to confirm (e.g., type slot name to drop it)
- Q: Where should users view operation history? → A: Dedicated "History" section within the operations modal

## Assumptions

- pglogical is the primary target for subscription management operations (native logical replication has limited operational controls)
- Users have appropriate PostgreSQL permissions (SUPERUSER or replication role) for the operations they attempt
- Operations are executed synchronously with reasonable timeout (30 seconds default)
- The operations modal follows the existing modal pattern used for Help and detail views
- Keyboard navigation follows existing patterns (j/k for selection, Enter to confirm, Esc to cancel)
- Metrics export follows the Prometheus text exposition format specification
