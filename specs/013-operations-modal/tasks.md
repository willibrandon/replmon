# Tasks: Operations Modal

**Input**: Design documents from `/specs/013-operations-modal/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/operations.ts, quickstart.md

**Tests**: Not explicitly requested in specification. Tests omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single TUI app**: `src/` at repository root per plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type contracts and project structure for operations modal

- [ ] T001 Copy type contracts from specs/013-operations-modal/contracts/operations.ts to src/types/operations.ts
- [ ] T002 [P] Create src/components/operations/ directory structure
- [ ] T003 [P] Create src/services/operations/ directory structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create operations Zustand slice with OperationsSliceState and OperationsSliceActions in src/store/operations.ts
- [ ] T005 Update src/store/types.ts to include OperationsSliceState in RootState
- [ ] T006 Update src/store/index.ts to integrate operations slice into root store
- [ ] T006a Add isExecuting guard in executeOperation to reject concurrent calls with "Operation in progress" error in src/store/operations.ts
- [ ] T007 Create useOperations hook with availableOperations, history, confirmationState in src/hooks/useOperations.ts
- [ ] T008 Create OperationsModal container component shell in src/components/modals/OperationsModal.tsx
- [ ] T009 Integrate 'o' keyboard shortcut to open OperationsModal in src/components/layout/MainLayout.tsx

**Checkpoint**: Foundation ready - operations modal opens with 'o' key, useOperations hook available

---

## Phase 3: User Story 1 - Pause/Resume Subscriptions (Priority: P1)

**Goal**: DBA can pause a subscription during peak hours and resume it later

**Independent Test**: Open modal on subscription, pause it, verify state changes, resume it, verify replication continues

### Implementation for User Story 1

- [ ] T010 [US1] Implement pauseSubscription function (pglogical.alter_subscription_disable) in src/services/operations/subscription-ops.ts
- [ ] T011 [US1] Implement resumeSubscription function (pglogical.alter_subscription_enable) in src/services/operations/subscription-ops.ts
- [ ] T012 [US1] Create OperationsList presentational component with j/k navigation in src/components/operations/OperationsList.tsx
- [ ] T013 [US1] Create OperationConfirm component for simple yes/no confirmations in src/components/operations/OperationConfirm.tsx
- [ ] T014 [US1] Create OperationResult display component for success/failure messages in src/components/operations/OperationResult.tsx
- [ ] T015 [US1] Wire pause/resume operations into useOperations hook execution flow in src/hooks/useOperations.ts
- [ ] T016 [US1] Add subscription context detection (focused panel, selected subscription) to useOperations in src/hooks/useOperations.ts
- [ ] T017 [US1] Handle pglogical vs native subscription differences (ALTER SUBSCRIPTION DISABLE for native) in src/services/operations/subscription-ops.ts

**Checkpoint**: User Story 1 complete - can pause and resume subscriptions from operations modal

---

## Phase 4: User Story 2 - Resync Tables (Priority: P1)

**Goal**: DBA can trigger a resync of a specific table to fix data inconsistency

**Independent Test**: Select subscription, choose table, trigger resync, verify table truncated and re-copied

### Implementation for User Story 2

- [ ] T018 [US2] Implement resyncTable function (pglogical.alter_subscription_resynchronize_table) in src/services/operations/subscription-ops.ts
- [ ] T019 [US2] Create TableSelector component for choosing table within subscription in src/components/operations/TableSelector.tsx
- [ ] T020 [US2] Add type-to-confirm functionality to OperationConfirm for danger operations in src/components/operations/OperationConfirm.tsx
- [ ] T021 [US2] Add resync table query to fetch replicated tables for subscription in src/services/operations/subscription-ops.ts
- [ ] T022 [US2] Wire resync operation into useOperations with table selection flow in src/hooks/useOperations.ts
- [ ] T023 [US2] Add pglogical-only availability check (resync not available for native LR) in src/hooks/useOperations.ts

**Checkpoint**: User Story 2 complete - can resync specific tables with type-to-confirm

---

## Phase 5: User Story 3 - Manage Replication Slots (Priority: P2)

**Goal**: DBA can create and drop replication slots for system maintenance

**Independent Test**: View slots panel, drop unused slot (type-to-confirm), create new slot, verify slot list updates

### Implementation for User Story 3

- [ ] T024 [P] [US3] Implement createSlot function (pg_create_logical/physical_replication_slot) in src/services/operations/slot-ops.ts
- [ ] T025 [P] [US3] Implement dropSlot function (pg_drop_replication_slot) with active slot check in src/services/operations/slot-ops.ts
- [ ] T026 [US3] Add slot context detection (focused panel, selected slot) to useOperations in src/hooks/useOperations.ts
- [ ] T027 [US3] Add slot name input field to OperationConfirm for create slot operation in src/components/operations/OperationConfirm.tsx
- [ ] T028 [US3] Wire slot operations into useOperations execution flow in src/hooks/useOperations.ts

**Checkpoint**: User Story 3 complete - can create and drop replication slots

---

## Phase 6: User Story 4 - Clear Conflict Log (Priority: P2)

**Goal**: DBA can clear pglogical conflict history to reduce noise

**Independent Test**: View conflicts panel, clear conflict log (type-to-confirm), verify conflicts cleared

### Implementation for User Story 4

- [ ] T029 [US4] Implement clearConflicts function (TRUNCATE pglogical.conflict_history) in src/services/operations/conflict-ops.ts
- [ ] T030 [US4] Add conflict count pre-check query for confirmation display in src/services/operations/conflict-ops.ts
- [ ] T031 [US4] Add conflict context detection (focused panel) to useOperations in src/hooks/useOperations.ts
- [ ] T032 [US4] Add log-based conflict detection handling (show "cannot clear" message) in src/hooks/useOperations.ts
- [ ] T033 [US4] Wire clear conflicts operation into useOperations with type-to-confirm (type node name to confirm) in src/hooks/useOperations.ts

**Checkpoint**: User Story 4 complete - can clear pglogical conflict history

---

## Phase 7: User Story 5 - Export Prometheus Metrics (Priority: P3)

**Goal**: DBA can export replmon metrics in Prometheus text format for integration

**Independent Test**: Trigger metrics export, verify output is valid Prometheus text format

### Implementation for User Story 5

- [ ] T034 [P] [US5] Implement collectMetrics function to gather metrics from Zustand store in src/services/operations/prometheus.ts
- [ ] T035 [P] [US5] Implement formatAsPrometheus function for text exposition format in src/services/operations/prometheus.ts
- [ ] T036 [US5] Create PrometheusExport scrollable modal component in src/components/operations/PrometheusExport.tsx
- [ ] T037 [US5] Add exportMetrics function to useOperations hook in src/hooks/useOperations.ts
- [ ] T038 [US5] Wire export metrics operation (no confirmation needed) in src/hooks/useOperations.ts
- [ ] T038a [US5] Add file output option with path input to PrometheusExport in src/components/operations/PrometheusExport.tsx
- [ ] T038b [US5] Implement writeMetricsToFile function using Node.js fs.writeFile in src/services/operations/prometheus.ts

**Checkpoint**: User Story 5 complete - can export Prometheus metrics in scrollable modal or to file

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: History tab, error handling, and final integration

- [ ] T039 [P] Create OperationHistory component for session history display in src/components/operations/OperationHistory.tsx
- [ ] T040 Add Tab switching between Operations and History tabs in OperationsModal in src/components/modals/OperationsModal.tsx
- [ ] T041 Implement history entry selection and detail view in OperationHistory in src/components/operations/OperationHistory.tsx
- [ ] T042 Add comprehensive error handling with remediation hints per research.md in src/services/operations/index.ts
- [ ] T043 Add disconnected node detection and "Node Unavailable" error state in src/hooks/useOperations.ts
- [ ] T044 Add operation timeout handling (30 second default) in src/services/operations/index.ts
- [ ] T045 Implement severity color coding (info=green, warning=yellow, danger=red) in OperationsList in src/components/operations/OperationsList.tsx
- [ ] T046 Add operation separators (divider lines) between categories in OperationsList in src/components/operations/OperationsList.tsx
- [ ] T047 Create OperationExecutor service index for unified operation dispatch in src/services/operations/index.ts
- [ ] T048 Run quickstart.md validation - verify all keyboard flows work as documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority - complete both before P2 stories
  - US3 and US4 are both P2 priority - can be done in parallel after US1+US2
  - US5 is P3 priority - lowest priority, do last
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories
- **User Story 2 (P1)**: Can reuse OperationConfirm from US1 (extends with type-to-confirm)
- **User Story 3 (P2)**: Can reuse OperationConfirm type-to-confirm from US2
- **User Story 4 (P2)**: Can reuse OperationConfirm type-to-confirm from US2
- **User Story 5 (P3)**: No dependencies - can start anytime after Foundational

### Within Each User Story

- Services before UI components (data layer first)
- Core operations before hook integration
- Hook integration before modal wiring

### Parallel Opportunities

- T002, T003: Directory structure creation (parallel)
- T024, T025: Create and drop slot services (parallel)
- T034, T035: Metrics collection and formatting (parallel)
- T039, T040+: History component and other polish tasks (parallel)

---

## Parallel Example: User Story 1

```bash
# After T010, T011 (services) complete, launch UI components in parallel:
Task: "Create OperationsList component in src/components/operations/OperationsList.tsx"
Task: "Create OperationConfirm component in src/components/operations/OperationConfirm.tsx"
Task: "Create OperationResult component in src/components/operations/OperationResult.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (3 tasks)
2. Complete Phase 2: Foundational (6 tasks) - CRITICAL
3. Complete Phase 3: User Story 1 - Pause/Resume (8 tasks)
4. Complete Phase 4: User Story 2 - Resync Tables (6 tasks)
5. **STOP and VALIDATE**: Test pause/resume and resync independently
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational (9 tasks) -> Foundation ready
2. Add User Story 1 -> Test independently -> Pause/Resume works
3. Add User Story 2 -> Test independently -> Resync works (MVP complete!)
4. Add User Story 3 -> Test independently -> Slot management works
5. Add User Story 4 -> Test independently -> Conflict clearing works
6. Add User Story 5 -> Test independently -> Prometheus export works
7. Polish phase -> History tab, error handling refinements

---

## Summary

| Phase | Tasks | Cumulative |
|-------|-------|------------|
| Phase 1: Setup | 3 | 3 |
| Phase 2: Foundational | 7 | 10 |
| Phase 3: US1 - Pause/Resume | 8 | 18 |
| Phase 4: US2 - Resync Tables | 6 | 24 |
| Phase 5: US3 - Manage Slots | 5 | 29 |
| Phase 6: US4 - Clear Conflicts | 5 | 34 |
| Phase 7: US5 - Prometheus Metrics | 7 | 41 |
| Phase 8: Polish | 10 | 51 |
| **Total** | **51 tasks** | |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Type-to-confirm is required for: resync-table, drop-slot, clear-conflicts
- pglogical-specific operations: resync-table, clear-conflicts (not available for native LR)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
