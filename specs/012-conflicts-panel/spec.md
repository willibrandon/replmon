# Feature Specification: Conflicts Panel

**Feature Branch**: `012-conflicts-panel`
**Created**: 2025-12-25
**Status**: Draft
**Input**: User description: "pglogical conflict detection and display with dual data sources (conflict_history table and log parsing fallback)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Conflicts List (Priority: P1)

As a DBA monitoring a bidirectional pglogical replication cluster, I want to see all recent replication conflicts across nodes so I can identify and investigate data synchronization issues.

**Why this priority**: Conflict visibility is the core value proposition. Without seeing conflicts, the panel has no purpose.

**Independent Test**: Can be fully tested by generating test conflicts on a pglogical node and verifying they appear in the panel with correct type, table, and resolution information.

**Acceptance Scenarios**:

1. **Given** a pglogical node with `conflict_history` enabled and conflicts recorded, **When** the Conflicts Panel is displayed, **Then** conflicts are shown in a timestamp-ordered list with most recent first
2. **Given** a pglogical node with conflict_history enabled, **When** a new conflict occurs, **Then** it appears in the list on the next polling cycle
3. **Given** multiple nodes in the cluster, **When** viewing the Conflicts Panel, **Then** conflicts from all connected nodes are aggregated and displayed
4. **Given** no conflicts exist, **When** viewing the Conflicts Panel, **Then** an empty state message indicates no conflicts detected

---

### User Story 2 - View Conflict Details (Priority: P1)

As a DBA investigating a replication conflict, I want to see the full details of a specific conflict including the local and remote tuple data so I can understand what data diverged and why.

**Why this priority**: Detail view is essential for conflict investigation and resolution. Without tuple data visibility, DBAs cannot diagnose root causes.

**Independent Test**: Can be tested by selecting a conflict from the list and verifying the detail modal shows complete conflict information including tuple data.

**Acceptance Scenarios**:

1. **Given** a conflict is selected in the list, **When** the user presses Enter, **Then** a detail modal opens showing: conflict type, resolution applied, affected table (schema.table), timestamp, subscription name, local tuple data (JSONB), remote tuple data (JSONB), commit timestamps, and LSN
2. **Given** a conflict with tuple storage disabled, **When** viewing details, **Then** the detail view indicates tuple data is not available and shows only metadata
3. **Given** a conflict from log parsing (fallback source), **When** viewing details, **Then** a notice indicates that tuple data is unavailable for log-sourced conflicts

---

### User Story 3 - Log-Based Conflict Fallback (Priority: P1)

As a DBA running pglogical without conflict_history (older version or disabled), I want to still see conflict information parsed from PostgreSQL server logs so I have visibility into replication issues.

**Why this priority**: Essential for backwards compatibility and environments where conflict_history is unavailable. The feature must work with both data sources.

**Independent Test**: Can be tested by disabling conflict_history and generating conflicts, then verifying they appear in the panel sourced from log parsing.

**Acceptance Scenarios**:

1. **Given** a node without conflict_history table or with it disabled, **When** log file access is configured, **Then** conflicts are parsed from PostgreSQL csvlog format and displayed
2. **Given** log-based conflicts are active, **When** viewing the panel, **Then** a "LOG" badge indicates the data source
3. **Given** conflict_history is available and enabled, **When** viewing the panel, **Then** a "HISTORY" badge indicates the preferred data source is in use
4. **Given** neither conflict_history nor log access is available, **When** viewing the panel, **Then** an informative message explains how to enable conflict monitoring

---

### User Story 4 - Navigate and Filter Conflicts (Priority: P2)

As a DBA managing a busy replication cluster with many conflicts, I want to navigate the conflict list using keyboard shortcuts and see summary statistics so I can quickly triage issues.

**Why this priority**: Navigation and filtering improve usability but are secondary to core conflict display functionality.

**Independent Test**: Can be tested by populating conflicts and verifying keyboard navigation (j/k), selection (Enter), and summary counts work correctly.

**Acceptance Scenarios**:

1. **Given** the Conflicts Panel is focused, **When** user presses j/k, **Then** selection moves down/up through the conflict list
2. **Given** the panel header, **When** viewing the panel, **Then** summary counts show total conflicts, conflicts by type, and conflicts by time window (last hour, last 24h)
3. **Given** multiple conflict types exist, **When** viewing the list, **Then** each conflict displays: conflict type badge, table name, resolution badge, timestamp, and node identifier

---

### User Story 5 - Automatic Source Detection (Priority: P2)

As a DBA, I want replmon to automatically detect the best available conflict data source on connection so I don't need to manually configure it.

**Why this priority**: Automatic detection improves user experience but relies on the core data access functionality being implemented first.

**Independent Test**: Can be tested by connecting to nodes with different configurations and verifying the correct source is detected and used.

**Acceptance Scenarios**:

1. **Given** connecting to a node, **When** `pglogical.conflict_history` exists and `pglogical.conflict_history_enabled = on`, **Then** the history table source is automatically selected
2. **Given** connecting to a node without conflict_history, **When** log file path is configured, **Then** log parsing is used as fallback
3. **Given** connecting to a node, **When** source detection changes (e.g., conflict_history is enabled), **Then** the panel updates to use the new source on next poll

---

### Edge Cases

- What happens when conflict_history table exists but is empty? Display empty state with source badge showing "HISTORY"
- How does the system handle very large tuple data (>1KB)? Display truncation indicator with expandable view in detail modal
- What happens when log file is rotated during parsing? Continue from current position; note in UI that some conflicts may be missed
- How does system handle malformed log entries? Skip unparseable entries and continue; log warning to application logs
- What happens when a node disconnects mid-poll? Mark node as stale; retain last conflict data with visual indicator

### Out of Scope

- Manual conflict resolution actions (apply_remote, keep_local, skip) - this is a view-only monitoring feature
- Conflict alerting or notifications (future feature)
- Historical conflict trend analysis or charting (future feature)
- Automatic conflict remediation or retry logic

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST query `pglogical.conflict_history` table when available and enabled, retrieving: id, recorded_at, conflict_type, resolution, schema_name, table_name, local_tuple, remote_tuple, local_commit_ts, remote_commit_ts, remote_commit_lsn, sub_name
- **FR-002**: System MUST detect conflict_history availability on connection using the detection query that checks for table existence AND enabled setting; when available, history table is the exclusive source (log parsing is not used as supplement)
- **FR-003**: System MUST parse PostgreSQL csvlog format to extract conflicts when conflict_history is unavailable
- **FR-004**: System MUST support log file access via two methods: (a) direct local filesystem path, or (b) PostgreSQL `pg_read_file()` function for remote access; method is configurable per node in YAML
- **FR-005**: System MUST display a source indicator badge (HISTORY/LOG) showing the active data source for each node
- **FR-006**: System MUST display conflicts in a timestamp-ordered list (most recent first) with: conflict type, table name, resolution, timestamp, and source node
- **FR-007**: System MUST provide a detail modal accessible via Enter key showing full conflict metadata and tuple data when available
- **FR-008**: System MUST aggregate conflicts from all connected nodes into a unified view
- **FR-009**: System MUST display summary statistics in the panel header: total conflicts, breakdown by conflict type, and time-windowed counts (last hour, last 24 hours)
- **FR-010**: System MUST support keyboard navigation: j/k for list navigation, Enter for detail view, Escape to close modal, 'c' as panel focus shortcut
- **FR-011**: System MUST gracefully handle unavailable conflict data by displaying an informative empty state with guidance
- **FR-012**: System MUST persist log file read position to avoid re-parsing on restart
- **FR-013**: System MUST limit displayed conflicts to a 24-hour time window with a configurable maximum count (default 500 conflicts)

### Key Entities

- **Conflict**: A single replication conflict event with type (insert_insert, update_update, update_delete, delete_delete), resolution (apply_remote, keep_local, skip), affected table (schema.table), local and remote tuple data, timestamps, subscription info, and data source indicator
- **ConflictSource**: Enum indicating data origin: 'history' (conflict_history table), 'log' (server log parsing), 'unavailable'
- **ConflictSummary**: Aggregated statistics including total count, counts by type, counts by time window, and breakdown by node

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view conflicts from either data source (history table or log parsing) within 2 seconds of panel focus
- **SC-002**: Conflict detail modal displays complete information within 500ms of selection
- **SC-003**: System correctly auto-detects data source availability on 100% of connections
- **SC-004**: Users can navigate a list of 100+ conflicts smoothly using keyboard shortcuts
- **SC-005**: Summary statistics update on each polling cycle (default 1 second)
- **SC-006**: Log parsing correctly identifies and extracts at least 95% of pglogical conflict log entries

## Clarifications

### Session 2025-12-25

- Q: How many conflicts should the panel retain and display? → A: Last 24 hours with configurable limit (default 500)
- Q: How should the panel handle potentially sensitive data in conflict tuples? → A: Display tuple data directly (trust DBA authorization)
- Q: Should the panel support conflict resolution actions? → A: View-only (no resolution actions in this feature)
- Q: How should replmon access PostgreSQL log files for conflict parsing? → A: Local file path + PostgreSQL pg_read_file() function
- Q: When both conflict_history AND log access are available, should they be combined? → A: History table only when available (log is pure fallback)

## Assumptions

- PostgreSQL csvlog format follows standard PostgreSQL 10+ logging conventions
- pglogical conflict log messages follow the established format: `CONFLICT: ... on relation "schema.table" ...`
- Log files are accessible either locally or via pg_read_file() (requires superuser or pg_read_server_files role)
- conflict_history table schema matches the documented pglogical 2.5.0+ structure
- Polling interval of 1 second is appropriate for conflict monitoring (matches existing panel behavior)
- Users have basic familiarity with replmon keyboard navigation patterns (j/k, Enter, Escape)
- Users with access to replmon are authorized DBAs; tuple data display does not require additional masking or access controls
