# Tasks: Replication Slots Panel

**Input**: Design documents from `/specs/010-slots-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included (spec mentions 24 test cases across 5 user stories, SC-002)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Extend existing atoms and create hook infrastructure

- [ ] T001 [P] Extend ProgressBar with color prop in src/components/atoms/ProgressBar.tsx
- [ ] T002 [P] Create SlotListItem and UseSlotsResult types in src/hooks/useSlots.ts

**Checkpoint**: Atoms extended, types defined

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hook that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Create useSlots hook with store selectors in src/hooks/useSlots.ts
- [ ] T004 Implement severity calculation functions (getRetentionSeverity, getWalStatusSeverity, getRetentionPercent) in src/hooks/useSlots.ts
- [ ] T005 Implement slot aggregation and enrichment logic (SlotListItem derivation, all UseSlotsResult counts) in src/hooks/useSlots.ts
- [ ] T006 Implement formatBytes utility for retention display in src/hooks/useSlots.ts
- [ ] T007 [P] Write useSlots hook tests in src/hooks/useSlots.test.ts

**Checkpoint**: Foundation ready - useSlots hook complete with tests

---

## Phase 3: User Story 1 - View All Slots with Health Status (Priority: P1) 🎯 MVP

**Goal**: Display all replication slots across nodes with active/inactive status indicators

**Independent Test**: Navigate to slots panel and verify all slots appear with correct StatusDot colors

### Tests for User Story 1

- [ ] T008 [P] [US1] Write test for empty state rendering in src/components/panels/SlotsPanel.test.tsx
- [ ] T009 [P] [US1] Write test for slot row rendering with StatusDot in src/components/panels/SlotsPanel.test.tsx
- [ ] T010 [P] [US1] Write test for stale node slot display in src/components/panels/SlotsPanel.test.tsx

### Implementation for User Story 1

- [ ] T011 [US1] Create EmptyState subcomponent in src/components/panels/SlotsPanel.tsx
- [ ] T012 [US1] Create SlotRow subcomponent with StatusDot and basic layout in src/components/panels/SlotsPanel.tsx
- [ ] T013 [US1] Create SlotsPanel main component with list rendering in src/components/panels/SlotsPanel.tsx
- [ ] T014 [US1] Export SlotsPanel from src/components/panels/index.ts

**Checkpoint**: User Story 1 complete - slots visible with active/inactive indicators

---

## Phase 4: User Story 2 - WAL Retention Progress Bars with Severity (Priority: P1)

**Goal**: Show WAL retention with color-coded progress bars based on thresholds

**Independent Test**: Create slots with varying retention levels and verify progress bar colors match thresholds

### Tests for User Story 2

- [ ] T015 [P] [US2] Write test for progress bar severity colors in src/components/panels/SlotsPanel.test.tsx
- [ ] T016 [P] [US2] Write test for retention percentage calculation in src/hooks/useSlots.test.ts

### Implementation for User Story 2

- [ ] T017 [US2] Add ProgressBar to SlotRow with severity-based color in src/components/panels/SlotsPanel.tsx
- [ ] T018 [US2] Add formatted retention display next to progress bar in src/components/panels/SlotsPanel.tsx

**Checkpoint**: User Story 2 complete - progress bars show with severity colors

---

## Phase 5: User Story 3 - WAL Status Indicator (Priority: P2)

**Goal**: Display PostgreSQL WAL status (reserved/extended/unreserved/lost) with severity coloring

**Independent Test**: Connect to PG13+ and verify WAL status badges, connect to PG12 and verify graceful degradation

### Tests for User Story 3

- [ ] T019 [P] [US3] Write test for WAL status severity mapping in src/hooks/useSlots.test.ts
- [ ] T020 [P] [US3] Write test for WAL status badge rendering in src/components/panels/SlotsPanel.test.tsx
- [ ] T021 [P] [US3] Write test for null WAL status (PG12) handling in src/components/panels/SlotsPanel.test.tsx

### Implementation for User Story 3

- [ ] T022 [US3] Add WAL status Badge to SlotRow with severity color in src/components/panels/SlotsPanel.tsx

**Checkpoint**: User Story 3 complete - WAL status visible with severity colors

---

## Phase 6: User Story 4 - Summary Header with Aggregated Stats (Priority: P2)

**Goal**: Show summary header with total slots, active/inactive counts, and total WAL retention

**Independent Test**: Verify header counts match sum of individual slots, total retention matches sum of retained bytes

### Tests for User Story 4

- [ ] T023 [P] [US4] Write test for summary header badge counts in src/components/panels/SlotsPanel.test.tsx
- [ ] T024 [P] [US4] Write test for total retention display in src/components/panels/SlotsPanel.test.tsx
- [ ] T025 [P] [US4] Write test for critical/warning count badges in src/components/panels/SlotsPanel.test.tsx

### Implementation for User Story 4

- [ ] T026 [US4] Create summary header component with Badges in src/components/panels/SlotsPanel.tsx

**Checkpoint**: User Story 4 complete - summary header shows aggregated stats

---

## Phase 7: User Story 5 - Keyboard Navigation and Detail Modal (Priority: P3)

**Goal**: Enable j/k navigation and Enter to open detail modal with full slot information

**Independent Test**: Use j/k to move selection, press Enter to open modal, verify all slot fields displayed

### Tests for User Story 5

- [ ] T027 [P] [US5] Write test for selection highlighting in src/components/panels/SlotsPanel.test.tsx
- [ ] T028 [P] [US5] Write test for modal content rendering in src/components/layout/Modal.test.tsx (if exists) or SlotsPanel.test.tsx

### Implementation for User Story 5

- [ ] T029 [US5] Add selection indicator to SlotRow in src/components/panels/SlotsPanel.tsx
- [ ] T030 [US5] Create SlotDetailContent component in src/components/layout/Modal.tsx
- [ ] T031 [US5] Add slot type guard to Modal renderContent switch in src/components/layout/Modal.tsx

**Checkpoint**: User Story 5 complete - keyboard navigation and detail modal working

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T032 Verify responsive layout at all breakpoints (standard/narrow/short/compact)
- [ ] T033 Run full test suite: bun test
- [ ] T034 Run type check: bun run typecheck
- [ ] T035 Validate quickstart.md scenarios manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 + US2 are both P1 and share SlotsPanel, so do sequentially
  - US3 + US4 are both P2 and can proceed after US1/US2
  - US5 is P3 and depends on panel structure from US1
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Creates base SlotsPanel structure
- **User Story 2 (P1)**: Depends on US1 (adds to SlotRow) - Adds progress bar to existing rows
- **User Story 3 (P2)**: Depends on US1 (adds to SlotRow) - Adds WAL status badge to existing rows
- **User Story 4 (P2)**: Depends on US1 (adds header) - Adds summary header above list
- **User Story 5 (P3)**: Depends on US1 (selection) + Modal.tsx modification

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Hook logic before component logic
- Component structure before styling details
- Story complete before moving to next priority

### Parallel Opportunities

- T001, T002 can run in parallel (Setup phase)
- T007 can run parallel once T003-T006 structure exists
- All tests within a user story marked [P] can run in parallel
- US3 and US4 tests can run in parallel (both P2, different focus)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write test for empty state rendering in src/components/panels/SlotsPanel.test.tsx"
Task: "Write test for slot row rendering with StatusDot in src/components/panels/SlotsPanel.test.tsx"
Task: "Write test for stale node slot display in src/components/panels/SlotsPanel.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (view slots with status)
4. Complete Phase 4: User Story 2 (progress bars)
5. **STOP and VALIDATE**: Test slot list with progress bars independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 + 4 → Test independently → Deploy/Demo (WAL status + summary)
4. Add User Story 5 → Test independently → Deploy/Demo (keyboard nav + modal)
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- ProgressBar color prop is the key extension in Setup phase
- useSlots hook follows useSubscriptions pattern exactly
