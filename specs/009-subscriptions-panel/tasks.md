# Tasks: Subscriptions Panel

**Input**: Design documents from `/specs/009-subscriptions-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are included as this is a UI component that benefits from unit tests with ink-testing-library.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Hook and utility infrastructure needed by all user stories

- [ ] T001 Create useSubscriptions hook with basic structure in src/hooks/useSubscriptions.ts
- [ ] T002 [P] Add formatBytes utility function in src/components/panels/SubscriptionsPanel.tsx
- [ ] T003 [P] Add formatDuration utility function in src/components/panels/SubscriptionsPanel.tsx
- [ ] T004 [P] Add getStatusVariant mapping function in src/hooks/useSubscriptions.ts

**Checkpoint**: Core utilities ready - panel implementation can begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: SubscriptionsPanel shell component that all user stories build upon

**CRITICAL**: The panel container must exist before any story-specific features

- [ ] T005 Create SubscriptionsPanel component shell with props interface in src/components/panels/SubscriptionsPanel.tsx
- [ ] T006 Create internal SubscriptionRow component shell in src/components/panels/SubscriptionsPanel.tsx
- [ ] T007 Wire SubscriptionsPanel into MainLayout to render when focusedPanel === 'subscriptions' in src/components/layout/MainLayout.tsx
- [ ] T008 Create test file with basic render test in src/components/panels/SubscriptionsPanel.test.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Monitor All Subscriptions at a Glance (Priority: P1) MVP

**Goal**: Display all subscriptions from all nodes with status indicators

**Independent Test**: Launch replmon with multiple nodes, verify all subscriptions appear with names, status dots, and node identifiers

### Tests for User Story 1

- [ ] T009 [P] [US1] Test empty state renders "No subscriptions found" message in src/components/panels/SubscriptionsPanel.test.tsx
- [ ] T010 [P] [US1] Test list renders multiple subscriptions with names and node identifiers in src/components/panels/SubscriptionsPanel.test.tsx
- [ ] T011 [P] [US1] Test status indicator shows correct variant for each status (replicating/catchup/down/disabled) in src/components/panels/SubscriptionsPanel.test.tsx

### Implementation for User Story 1

- [ ] T012 [US1] Implement useSubscriptions hook to aggregate subscriptions from store with node names in src/hooks/useSubscriptions.ts
- [ ] T013 [US1] Implement status-to-variant mapping (replicating→success, catchup→warning, down→critical, disabled→muted) in src/hooks/useSubscriptions.ts
- [ ] T014 [US1] Implement SubscriptionRow to display StatusDot, subscription name, and node name in src/components/panels/SubscriptionsPanel.tsx
- [ ] T015 [US1] Implement panel header showing subscription count in src/components/panels/SubscriptionsPanel.tsx
- [ ] T016 [US1] Implement empty state with "No subscriptions found" message in src/components/panels/SubscriptionsPanel.tsx
- [ ] T017 [US1] Implement stale subscription handling with dimmed appearance for stale nodes in src/components/panels/SubscriptionsPanel.tsx

**Checkpoint**: User Story 1 complete - can see all subscriptions with status indicators

---

## Phase 4: User Story 2 - View Subscription Lag Metrics (Priority: P2)

**Goal**: Display lag bytes and lag time with color-coded severity

**Independent Test**: With active replication, verify lag values display next to subscriptions and update with polling

### Tests for User Story 2

- [ ] T018 [P] [US2] Test lag bytes displays in human-readable format (KB, MB, GB) in src/components/panels/SubscriptionsPanel.test.tsx
- [ ] T019 [P] [US2] Test lag time displays in human-readable format (s, m, h) in src/components/panels/SubscriptionsPanel.test.tsx
- [ ] T020 [P] [US2] Test warning color applied when lag > 5s in src/components/panels/SubscriptionsPanel.test.tsx
- [ ] T021 [P] [US2] Test critical color applied when lag > 30s in src/components/panels/SubscriptionsPanel.test.tsx

### Implementation for User Story 2

- [ ] T022 [US2] Extend useSubscriptions to include latest lag sample and lag severity in src/hooks/useSubscriptions.ts
- [ ] T023 [US2] Integrate existing getLagSeverity utility for threshold calculations in src/hooks/useSubscriptions.ts
- [ ] T024 [US2] Add lag bytes column to SubscriptionRow using formatBytes in src/components/panels/SubscriptionsPanel.tsx
- [ ] T025 [US2] Add lag time column to SubscriptionRow using formatDuration in src/components/panels/SubscriptionsPanel.tsx
- [ ] T026 [US2] Apply warning/critical colors to lag values based on severity in src/components/panels/SubscriptionsPanel.tsx
- [ ] T027 [US2] Handle null lag data with placeholder display ("-") in src/components/panels/SubscriptionsPanel.tsx

**Checkpoint**: User Story 2 complete - lag metrics visible with color coding

---

## Phase 5: User Story 3 - View LSN Positions (Priority: P3)

**Goal**: Display LSN positions for debugging replication issues

**Independent Test**: Verify LSN values appear for subscriptions in expected format (e.g., "0/3000158")

### Tests for User Story 3

- [ ] T028 [P] [US3] Test LSN column displays received LSN value in src/components/panels/SubscriptionsPanel.test.tsx
- [ ] T029 [P] [US3] Test null LSN displays placeholder in src/components/panels/SubscriptionsPanel.test.tsx

### Implementation for User Story 3

- [ ] T030 [US3] Add LSN column to SubscriptionRow displaying receivedLsn in src/components/panels/SubscriptionsPanel.tsx
- [ ] T031 [US3] Handle null LSN with placeholder display in src/components/panels/SubscriptionsPanel.tsx

**Checkpoint**: User Story 3 complete - LSN positions visible

---

## Phase 6: User Story 4 - Select Subscription for Details (Priority: P4)

**Goal**: Keyboard navigation to select subscriptions in the list

**Independent Test**: Use j/k keys to move selection, verify highlight updates correctly

### Tests for User Story 4

- [ ] T032 [P] [US4] Test selected subscription has distinct visual highlight in src/components/panels/SubscriptionsPanel.test.tsx
- [ ] T033 [P] [US4] Test selection state read from store selections Map in src/components/panels/SubscriptionsPanel.test.tsx

### Implementation for User Story 4

- [ ] T034 [US4] Extend useSubscriptions to track isSelected from store selections in src/hooks/useSubscriptions.ts
- [ ] T035 [US4] Extend useSubscriptions to return selectedItem for current selection in src/hooks/useSubscriptions.ts
- [ ] T036 [US4] Apply selection highlight background to selected SubscriptionRow in src/components/panels/SubscriptionsPanel.tsx
- [ ] T037 [US4] Verify MainLayout keyboard handling (j/k and arrow keys) works with subscriptions panel selectables in src/components/layout/MainLayout.tsx

**Checkpoint**: User Story 4 complete - keyboard selection working

---

## Phase 7: User Story 5 - View Subscription Detail Modal (Priority: P5)

**Goal**: Open detail modal showing comprehensive subscription information

**Independent Test**: Select subscription, press Enter, verify modal displays all fields

### Tests for User Story 5

- [ ] T038 [P] [US5] Test modal content renders subscription name as title in src/components/panels/SubscriptionsPanel.test.tsx
- [ ] T039 [P] [US5] Test modal displays provider info for pglogical subscriptions in src/components/panels/SubscriptionsPanel.test.tsx
- [ ] T040 [P] [US5] Test modal displays slot name, worker PID, and timestamps in src/components/panels/SubscriptionsPanel.test.tsx

### Implementation for User Story 5

- [ ] T041 [US5] Create SubscriptionDetailContent component for modal in src/components/panels/SubscriptionsPanel.tsx
- [ ] T042 [US5] Implement detail fields: status, source type, enabled state in src/components/panels/SubscriptionsPanel.tsx
- [ ] T043 [US5] Implement provider info section (name, host, port) for pglogical in src/components/panels/SubscriptionsPanel.tsx
- [ ] T044 [US5] Implement replication sets display for pglogical in src/components/panels/SubscriptionsPanel.tsx
- [ ] T045 [US5] Implement slot name, worker PID, last message time display in src/components/panels/SubscriptionsPanel.tsx
- [ ] T046 [US5] Implement LSN positions (received, latest end) display in src/components/panels/SubscriptionsPanel.tsx
- [ ] T047 [US5] Wire Enter key in MainLayout to open modal with selected subscription data in src/components/layout/MainLayout.tsx

**Checkpoint**: User Story 5 complete - detail modal fully functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and verification

- [ ] T048 [P] Add source badge (native/pglogical) to SubscriptionRow in src/components/panels/SubscriptionsPanel.tsx
- [ ] T049 [P] Add stale count and pglogical mode badges to panel header in src/components/panels/SubscriptionsPanel.tsx
- [ ] T050 [P] Add warning and critical counts to useSubscriptions result in src/hooks/useSubscriptions.ts
- [ ] T051 Verify panel works on 80-column terminals (truncation handling) in src/components/panels/SubscriptionsPanel.tsx
- [ ] T052 Run all tests to verify complete implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed sequentially in priority order (P1 → P2 → P3 → P4 → P5)
  - Some stories build on previous (US4 selection needs US1 list, US5 modal needs US4 selection)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Extends US1 rows with lag columns - can start after US1 complete
- **User Story 3 (P3)**: Extends US1 rows with LSN column - can start after US1 complete (parallel with US2)
- **User Story 4 (P4)**: Adds selection to US1 list - can start after US1 complete (parallel with US2/US3)
- **User Story 5 (P5)**: Requires US4 selection to open modal - must start after US4 complete

### Within Each User Story

- Tests SHOULD be written and FAIL before implementation
- Hook logic before component rendering
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T003, T004 can run in parallel (different utilities)
- T009, T010, T011 can run in parallel (different test cases)
- T018, T019, T020, T021 can run in parallel (different test cases)
- T028, T029 can run in parallel (different test cases)
- T032, T033 can run in parallel (different test cases)
- T038, T039, T040 can run in parallel (different test cases)
- T048, T049, T050 can run in parallel (different files/features)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: T009 "Test empty state renders"
Task: T010 "Test list renders multiple subscriptions"
Task: T011 "Test status indicator shows correct variant"

# Then implement sequentially:
Task: T012 "Implement useSubscriptions hook"
Task: T013 "Implement status-to-variant mapping"
Task: T014 "Implement SubscriptionRow"
Task: T015 "Implement panel header"
Task: T016 "Implement empty state"
Task: T017 "Implement stale handling"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test that subscriptions appear with status dots
5. Demo/verify basic panel functionality

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test → **MVP complete** (visible subscription list)
3. Add User Story 2 → Test → Lag metrics visible
4. Add User Story 3 → Test → LSN positions visible
5. Add User Story 4 → Test → Selection working
6. Add User Story 5 → Test → Detail modal complete
7. Add Polish → Final verification

### Suggested MVP Scope

**User Story 1 only** provides immediate value:
- All subscriptions visible in list
- Status indicators (replicating/catchup/down/disabled)
- Node identification
- Empty state handling
- Stale node indication

This delivers the core monitoring capability without lag/LSN details or selection features.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Uses existing patterns from TopologyPanel and useTopology hook
- Reuses StatusDot, Badge, Modal components from existing codebase
