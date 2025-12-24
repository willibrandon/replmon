# Tasks: State Management

**Input**: Design documents from `/specs/005-state-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (per plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared type definitions

- [x] T001 [P] Install dev dependency `@redux-devtools/extension` for TypeScript types
- [x] T002 Create store types at `src/store/types.ts` based on contracts/store-types.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core store infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create replication slice at `src/store/replication.ts` with state and actions per contracts
- [x] T004 Create UI slice at `src/store/ui.ts` with state and actions per contracts
- [x] T005 Update combined store export at `src/store/index.ts` to merge connection, replication, and UI slices with devtools middleware
- [x] T006 Create selectors index at `src/store/selectors/index.ts` with re-exports
- [x] T007 [P] Create aggregation selectors at `src/store/selectors/aggregations.ts` per contracts/selectors.ts
- [x] T008 [P] Create filter selectors at `src/store/selectors/filters.ts` per contracts/selectors.ts
- [x] T009 [P] Create computed selectors at `src/store/selectors/computed.ts` per contracts/selectors.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Real-Time Connection Status (Priority: P1) 🎯 MVP

**Goal**: Display live connection health for each node, allowing users to quickly identify connectivity issues

**Independent Test**: Configure multiple nodes and observe connection status updates as nodes become available or unavailable

### Implementation for User Story 1

- [x] T010 [US1] Extend connection slice at `src/store/connection.ts` with node initialization action `initializeNodes(nodeIds: string[])` *(implemented in src/store/index.ts)*
- [x] T011 [US1] Add node status selectors to `src/store/selectors/computed.ts`: `selectNodeCountByStatus`, `selectIsPollingActive`
- [x] T012 [US1] Add node health selectors to `src/store/selectors/aggregations.ts`: `selectNodeIds`, `selectNodeById`, `selectNodeStatus`, `selectNodeHealth`, `selectHealthyNodeIds`, `selectStaleNodeIds`
- [x] T013 [US1] Implement `initializeNodesInfo` action in `src/store/replication.ts` to populate nodes Map from config
- [x] T014 [US1] Implement `markNodeStale` and `clearNodeStale` actions in `src/store/replication.ts` for stale data handling
- [x] T015 [US1] Add `selectIsNodeStale`, `selectNodeLastUpdated`, `selectNodeHasPglogical` selectors to `src/store/selectors/aggregations.ts`

**Checkpoint**: User Story 1 complete - connection status displayed with stale indicators

---

## Phase 4: User Story 2 - Navigate Between Panels via Keyboard (Priority: P1)

**Goal**: Enable keyboard navigation between panels (Topology, Subscriptions, Slots, Conflicts, Operations)

**Independent Test**: Press panel shortcuts (t/s/l/c/o) and verify correct panel receives focus with visual feedback

### Implementation for User Story 2

- [x] T016 [US2] Implement `setFocusedPanel` action in `src/store/ui.ts` with panel validation
- [x] T017 [US2] Implement `focusNextPanel` action in `src/store/ui.ts` using PANEL_ORDER constant for Tab cycling
- [x] T018 [US2] Implement `focusPreviousPanel` action in `src/store/ui.ts` for Shift+Tab reverse cycling
- [x] T019 [US2] Add basic UI selectors to `src/store/selectors/computed.ts`: `selectCurrentScreen`, `selectFocusedPanel`, `selectPglogicalMode`
- [x] T020 [US2] Export PANEL_ORDER and PANEL_SHORTCUTS constants from `src/store/types.ts` for keyboard handling

**Checkpoint**: User Story 2 complete - panel navigation via keyboard works

---

## Phase 5: User Story 3 - View Subscription Details (Priority: P2)

**Goal**: Display all active subscriptions across configured nodes with their current replication state

**Independent Test**: Configure nodes with active subscriptions and verify subscription list displays with accurate status information

### Implementation for User Story 3

- [x] T021 [US3] Implement `setSubscriptions` action in `src/store/replication.ts` to update per-node subscription data
- [x] T022 [US3] Add subscription selectors to `src/store/selectors/aggregations.ts`: `selectSubscriptionsByNode`, `selectAllSubscriptions`, `selectSubscriptionByName`
- [x] T023 [US3] Add subscription filter selectors to `src/store/selectors/filters.ts`: `selectFilteredSubscriptions`, `selectLaggingSubscriptions`, `selectUnhealthySubscriptions`
- [x] T024 [US3] Add subscription computed selector `selectTotalSubscriptionCount` to `src/store/selectors/computed.ts`
- [x] T025 [US3] Implement `setSelection` action in `src/store/ui.ts` for subscription selection within panel
- [x] T026 [US3] Add selection selectors to `src/store/selectors/computed.ts`: `selectPanelSelection`, `selectCurrentSelection`, `selectIsSelected`

**Checkpoint**: User Story 3 complete - subscription list with selection works

---

## Phase 6: User Story 4 - Monitor Replication Slots (Priority: P2)

**Goal**: Display all replication slots with their current state and WAL retention

**Independent Test**: Query nodes with replication slots and verify slot details display correctly

### Implementation for User Story 4

- [x] T027 [US4] Implement `setSlots` action in `src/store/replication.ts` to update per-node slot data
- [x] T028 [US4] Add slot selectors to `src/store/selectors/aggregations.ts`: `selectSlotsByNode`, `selectAllSlots`, `selectSlotByName`
- [x] T029 [US4] Add slot filter selectors to `src/store/selectors/filters.ts`: `selectActiveSlots`, `selectInactiveSlots`, `selectStaleSlots`, `selectLogicalSlots`, `selectPhysicalSlots`
- [x] T030 [US4] Add slot computed selectors to `src/store/selectors/computed.ts`: `selectTotalSlotCount`, `selectActiveSlotCount`, `selectTotalRetainedBytes`

**Checkpoint**: User Story 4 complete - slot monitoring with filtering works

---

## Phase 7: User Story 5 - Review Replication Conflicts (Priority: P2)

**Goal**: List detected pglogical conflicts with enough context to understand and resolve them

**Independent Test**: Trigger conflicts in a pglogical setup and verify they appear with actionable information

### Implementation for User Story 5

- [x] T031 [US5] Implement `setConflicts` action in `src/store/replication.ts` to update per-node conflict data
- [x] T032 [US5] Add conflict selectors to `src/store/selectors/aggregations.ts`: `selectConflictsByNode`, `selectAllConflicts`, `selectConflictsBySubscription`
- [x] T033 [US5] Add conflict computed selectors to `src/store/selectors/computed.ts`: `selectTotalConflictCount`, `selectHasConflicts`, `selectSubscriptionsWithConflicts`

**Checkpoint**: User Story 5 complete - conflict review works

---

## Phase 8: User Story 6 - Track Replication Lag History (Priority: P3)

**Goal**: Maintain history of lag measurements and display them as sparklines or trend indicators

**Independent Test**: Run application for several polling intervals and verify lag history accumulates and displays correctly

### Implementation for User Story 6

- [x] T034 [US6] Implement `appendLagSample` action in `src/store/replication.ts` with FIFO eviction at MAX_LAG_HISTORY_SAMPLES
- [x] T035 [US6] Add lag history selectors to `src/store/selectors/aggregations.ts`: `selectLagHistory`, `selectLatestLagSample`
- [x] T036 [US6] Add lag trend selectors to `src/store/selectors/computed.ts`: `selectLagTrend`, `selectMaxHistoricalLag`, `selectMinHistoricalLag`, `selectAverageLag`
- [x] T037 [US6] Add global lag selectors to `src/store/selectors/computed.ts`: `selectMaxLagSeconds`, `selectMaxLagBytes`

**Checkpoint**: User Story 6 complete - lag history tracking with sparkline data works

---

## Phase 9: User Story 7 - Interact with Modals (Priority: P3)

**Goal**: Modal dialogs for operations and help that overlay the main interface with focus capture

**Independent Test**: Trigger modal display (pressing 'o' for operations, '?' for help) and verify focus capture and dismissal

### Implementation for User Story 7

- [x] T038 [US7] Implement `openModal` action in `src/store/ui.ts` with focus preservation (previousFocusedPanel)
- [x] T039 [US7] Implement `closeModal` action in `src/store/ui.ts` with focus restoration
- [x] T040 [US7] Add modal selectors to `src/store/selectors/computed.ts`: `selectActiveModal`, `selectModalData`, `selectIsModalOpen`

**Checkpoint**: User Story 7 complete - modal interaction with focus management works

---

## Phase 10: Integration & Polish

**Purpose**: PollingService integration and cross-cutting concerns

- [x] T041 Implement `handlePollingData` action in `src/store/replication.ts` to process complete PollingCycleResult (subscriptions, slots, conflicts, lag samples)
- [x] T042 Implement `setLastUpdated` action in `src/store/replication.ts` for polling timestamp tracking
- [x] T043 Implement `setNodePglogical` action in `src/store/replication.ts` for runtime pglogical detection
- [x] T044 Implement `clearReplicationData` action in `src/store/replication.ts` for store reset
- [x] T045 Implement `resetUIState` action in `src/store/ui.ts` for UI reset
- [x] T046 Implement `selectNext` and `selectPrevious` actions in `src/store/ui.ts` for j/k list navigation
- [x] T047 Add `selectSelectableItems`, `selectNextSelectableItem`, `selectPreviousSelectableItem` to `src/store/selectors/computed.ts`
- [x] T048 Add `selectSystemHealthSummary`, `selectLastPollingTime` to `src/store/selectors/computed.ts`
- [x] T049 Validate quickstart.md usage examples against implemented store

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1 and US2 can proceed in parallel (both P1)
  - US3, US4, US5 can proceed in parallel (all P2, after US1/US2 if preferred)
  - US6, US7 can proceed in parallel (both P3, after P2 stories if preferred)
- **Integration & Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational - Selection depends on UI slice from US2
- **User Story 4 (P2)**: Can start after Foundational - No dependencies on other stories
- **User Story 5 (P2)**: Can start after Foundational - No dependencies on other stories
- **User Story 6 (P3)**: Can start after Foundational - Builds on subscription data from US3
- **User Story 7 (P3)**: Can start after Foundational - Uses focus management from US2

### Within Each User Story

- Actions before selectors that use them
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T001 and T002 can run in parallel (Setup phase)
- T007, T008, T009 can run in parallel (selector files)
- Once Foundational completes, US1 and US2 can start in parallel
- After US1/US2, US3/US4/US5 can start in parallel
- After P2 stories, US6/US7 can start in parallel

---

## Parallel Example: Foundational Phase

```bash
# After T003-T006 complete sequentially, launch selector tasks together:
Task: "Create aggregation selectors at src/store/selectors/aggregations.ts"
Task: "Create filter selectors at src/store/selectors/filters.ts"
Task: "Create computed selectors at src/store/selectors/computed.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (connection status)
4. Complete Phase 4: User Story 2 (keyboard navigation)
5. **STOP and VALIDATE**: Test US1 & US2 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 → Test independently → Deploy/Demo (MVP!)
3. Add US3 + US4 + US5 → Test independently → Deploy/Demo (P2 features)
4. Add US6 + US7 → Test independently → Deploy/Demo (P3 features)
5. Add Integration & Polish → Final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + User Story 3
   - Developer B: User Story 2 + User Story 4 + User Story 5
3. Then:
   - Developer A: User Story 6
   - Developer B: User Story 7
4. Both: Integration & Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Existing `src/store/connection.ts` pattern guides all slice implementations
