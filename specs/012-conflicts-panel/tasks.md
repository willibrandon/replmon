# Tasks: Conflicts Panel

**Input**: Design documents from `/specs/012-conflicts-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested - implementation tasks only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization - type definitions and store foundation

- [X] T001 [P] Create ConflictEvent, ConflictSource, ConflictType, ConflictResolution types in src/types/conflicts.ts
- [X] T002 [P] Create ConflictSummary type in src/types/conflicts.ts
- [X] T003 Add conflicts slice (conflicts Map, conflictSources Map) to store in src/store/replication.ts
- [X] T004 Add setConflicts and setConflictSource actions to store in src/store/replication.ts

**Checkpoint**: Types defined, store ready for conflict data

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core query module that MUST be complete before ANY user story can display data

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create pglogical-conflicts.ts query module structure in src/services/polling/queries/pglogical-conflicts.ts
- [X] T006 Implement detectSource() function that checks for conflict_history table existence and enabled GUC in src/services/polling/queries/pglogical-conflicts.ts
- [X] T007 Implement queryConflictHistory() function with SQL query and row-to-ConflictEvent transform in src/services/polling/queries/pglogical-conflicts.ts
- [X] T008 Implement execute() function that calls queryConflictHistory when source='history' in src/services/polling/queries/pglogical-conflicts.ts
- [X] T009 Integrate pglogicalConflictsQueryModule into PollingService data cycle in src/services/polling/PollingService.ts

**Checkpoint**: Foundation ready - conflict data flows from database to store

---

## Phase 3: User Story 1 - View Conflicts List (Priority: P1) MVP

**Goal**: Display conflicts from conflict_history table in a timestamp-ordered list with type, table, resolution badges

**Independent Test**: Generate test conflicts using quickstart.md script, verify they appear in panel with correct display

### Implementation for User Story 1

- [X] T010 [US1] Create useConflicts hook with basic items aggregation (flatten conflicts Map, sort by recordedAt DESC) in src/hooks/useConflicts.ts
- [X] T011 [US1] Add ConflictListItem derivation (nodeName, qualifiedTable, formattedTime) to useConflicts in src/hooks/useConflicts.ts
- [X] T012 [US1] Compute summary statistics (total, byType, lastHour, last24h) in useConflicts in src/hooks/useConflicts.ts
- [X] T013 [P] [US1] Create ConflictTypeBadge atom component in src/components/atoms/ConflictTypeBadge.tsx
- [X] T014 [P] [US1] Create ResolutionBadge atom component in src/components/atoms/ResolutionBadge.tsx
- [X] T015 [P] [US1] Create SourceBadge atom component (HISTORY/LOG) in src/components/atoms/SourceBadge.tsx
- [X] T016 [US1] Create ConflictRow component with type badge, table name, resolution, timestamp, node in src/components/panels/ConflictsPanel.tsx
- [X] T017 [US1] Create SummaryHeader component with conflict counts and type breakdown in src/components/panels/ConflictsPanel.tsx
- [X] T018 [US1] Create ConflictsPanel component with SummaryHeader and ConflictRow list in src/components/panels/ConflictsPanel.tsx
- [X] T019 [US1] Create EmptyState component for zero conflicts case in src/components/panels/ConflictsPanel.tsx
- [X] T020 [US1] Register ConflictsPanel in MainLayout and add 'c' keyboard shortcut for panel focus in src/components/layout/MainLayout.tsx

**Checkpoint**: User Story 1 complete - conflicts visible in panel from history source

---

## Phase 4: User Story 2 - View Conflict Details (Priority: P1)

**Goal**: Display full conflict details including tuple data in a modal accessible via Enter key

**Independent Test**: Select a conflict with tuple data, press Enter, verify modal shows all fields from component-interface.md layout

### Implementation for User Story 2

- [X] T021 [US2] Create ConflictDetailModal component structure with header, metadata section in src/components/layout/Modal.tsx
- [X] T022 [US2] Add TupleSection to ConflictDetailModal for local/remote tuple JSONB display in src/components/layout/Modal.tsx
- [X] T023 [US2] Add LSNSection to ConflictDetailModal for remote LSN and commit timestamps in src/components/layout/Modal.tsx
- [X] T024 [US2] Add conditional rendering for unavailable tuple data (log source or disabled storage) in src/components/layout/Modal.tsx
- [X] T025 [US2] Add selectedConflictId state and openDetailModal action to UI store (using existing modal system)
- [X] T026 [US2] Wire Enter key handler in ConflictsPanel to open detail modal in src/components/layout/MainLayout.tsx
- [X] T027 [US2] Wire Escape key handler in ConflictDetailModal to close modal in src/components/layout/Modal.tsx

**Checkpoint**: User Story 2 complete - conflict details viewable in modal

---

## Phase 5: User Story 3 - Log-Based Conflict Fallback (Priority: P1)

**Goal**: Parse conflicts from PostgreSQL csvlog when conflict_history is unavailable

**Independent Test**: Disable conflict_history, configure log_path, generate conflicts, verify they appear with LOG source badge

### Implementation for User Story 3

- [X] T028 [US3] Add LogFileConfig type and logConfig to node configuration in src/types/connection.ts
- [X] T029 [US3] Implement parseConflictLog() function with regex extraction in src/services/polling/queries/pglogical-conflicts.ts
- [X] T030 [US3] Implement readLogFile() for local filesystem access in src/services/polling/queries/pglogical-conflicts.ts
- [X] T031 [US3] Implement readLogFileRemote() using pg_read_file() in src/services/polling/queries/pglogical-conflicts.ts
- [X] T032 [US3] Extend execute() to call log parsing when source='log' in src/services/polling/queries/pglogical-conflicts.ts
- [X] T033 [US3] Implement log position persistence (read on init, write after parse) at .replmon/log-positions.json in src/services/polling/queries/pglogical-conflicts.ts
- [X] T034 [US3] Create UnavailableState component with setup instructions in src/components/panels/ConflictsPanel.tsx

**Checkpoint**: User Story 3 complete - fallback log parsing works when history unavailable

---

## Phase 6: User Story 4 - Navigate and Filter Conflicts (Priority: P2)

**Goal**: Keyboard navigation (j/k) through conflict list with selection state and summary statistics

**Independent Test**: Generate 10+ conflicts, use j/k to navigate, verify selection indicator moves correctly

### Implementation for User Story 4

- [X] T035 [US4] Add selection state (selectedIndex) tracking to useConflicts hook in src/hooks/useConflicts.ts
- [X] T036 [US4] Implement j/k keyboard handlers for list navigation in src/components/layout/MainLayout.tsx
- [X] T037 [US4] Add selection indicator (>) to ConflictRow component in src/components/panels/ConflictsPanel.tsx
- [X] T038 [US4] Add isSelected prop derivation in useConflicts for each ConflictListItem in src/hooks/useConflicts.ts
- [X] T039 [US4] Add source counts (historyCount, logCount) to SummaryHeader in src/components/panels/ConflictsPanel.tsx

**Checkpoint**: User Story 4 complete - keyboard navigation and summary statistics work

---

## Phase 7: User Story 5 - Automatic Source Detection (Priority: P2)

**Goal**: Automatically detect best conflict data source on connection without manual configuration

**Independent Test**: Connect to nodes with different configurations, verify correct source badge appears

### Implementation for User Story 5

- [X] T040 [US5] Import detectSource from pglogical-conflicts.ts and call on node connection in src/services/polling/index.ts
- [X] T041 [US5] Store detected source per node and emit to store in src/store/replication.ts
- [X] T042 [US5] Add re-detection on polling cycle when source changes (conflict_history enabled/disabled) in src/services/polling/index.ts
- [X] T043 [US5] Display per-node source badges in SummaryHeader showing source distribution in src/components/panels/ConflictsPanel.tsx

**Checkpoint**: User Story 5 complete - automatic source detection works across all nodes

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, error handling, and refinements

- [X] T044 [P] Handle node disconnect gracefully - mark conflicts as stale in useConflicts in src/hooks/useConflicts.ts
- [X] T045 [P] Add stale indicator styling to ConflictRow for disconnected nodes in src/components/panels/ConflictsPanel.tsx
- [X] T046 Handle log file rotation by detecting path changes in src/services/polling/queries/pglogical-conflicts.ts
- [X] T047 Handle malformed log entries gracefully (skip and continue) in src/services/polling/queries/pglogical-conflicts.ts
- [X] T048 Add truncation detection for tuple data >1KB with indicator label in ConflictDetailModal in src/components/layout/Modal.tsx
- [X] T049 Add scrollable Box wrapper for TupleSection to enable viewing full JSONB content in src/components/layout/Modal.tsx
- [X] T050 Run quickstart.md validation scenarios and fix any issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (P1): View Conflicts List - first to implement
  - US2 (P1): View Conflict Details - requires US1 items to select from
  - US3 (P1): Log Fallback - independent of US1/US2, but same priority
  - US4 (P2): Navigate/Filter - requires US1 list to navigate
  - US5 (P2): Auto Detection - independent, enhances all other stories
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Requires US1 list to select items from (T010-T020 complete)
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Independent of US1/US2
- **User Story 4 (P2)**: Requires US1 list to navigate (T010-T020 complete)
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Enhances all stories

### Within Each User Story

- Types/models before hooks
- Hooks before components
- Atoms before composite components
- Core functionality before edge cases

### Parallel Opportunities

- T001 + T002: Both type files can be written in parallel
- T013 + T014 + T015: All badge atoms can be built in parallel
- T044 + T045: Stale handling can be done in parallel
- US3 and US5 can be implemented in parallel with US1/US2

---

## Parallel Example: User Story 1 Badge Components

```bash
# Launch all badge atoms together:
Task: "Create ConflictTypeBadge atom component in src/components/atoms/ConflictTypeBadge.tsx"
Task: "Create ResolutionBadge atom component in src/components/atoms/ResolutionBadge.tsx"
Task: "Create SourceBadge atom component (HISTORY/LOG) in src/components/atoms/SourceBadge.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Complete Phase 1: Setup (types, store)
2. Complete Phase 2: Foundational (query module, polling integration)
3. Complete Phase 3: User Story 1 (view conflicts list)
4. Complete Phase 4: User Story 2 (view conflict details)
5. **STOP and VALIDATE**: Test US1+US2 with conflict_history source
6. Deploy/demo if ready

### Full Feature Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → List visible (MVP!)
3. User Story 2 → Details viewable
4. User Story 3 → Log fallback works
5. User Story 4 → Navigation works
6. User Story 5 → Auto-detection works
7. Polish → Edge cases handled

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1+US2 are the core MVP (view list + view details with history source)
- US3 adds log fallback for backwards compatibility
- US4+US5 add UX refinements
- Pattern follows useSlots/SlotsPanel implementation
- Commit after each task or logical group
