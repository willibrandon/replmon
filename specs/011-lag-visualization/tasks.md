# Tasks: Lag Visualization

**Input**: Design documents from `/specs/011-lag-visualization/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No tests explicitly requested in specification. Test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Increase lag history window to support 5-minute visualization

- [X] T001 Update MAX_LAG_HISTORY_SAMPLES constant from 60 to 300 in src/store/types.ts

---

## Phase 2: Foundational (Sparkline Component)

**Purpose**: Create the core Sparkline component that all user stories depend on

**⚠️ CRITICAL**: User story work requires this component to exist

- [X] T002 Create src/components/charts/ directory structure
- [X] T003 Implement Sparkline component with block character rendering in src/components/charts/Sparkline.tsx
  - Props: samples (LagSample[]), width (number), preferSeconds (boolean), isStale (boolean)
  - Block characters: ▁▂▃▄▅▆▇█
  - Linear scaling with dynamic max
  - Downsampling for width adaptation
- [X] T004 Add empty state rendering ("No lag data available") to src/components/charts/Sparkline.tsx
- [X] T005 Add stale state rendering (badge indicator) to src/components/charts/Sparkline.tsx

**Checkpoint**: Sparkline component ready - user story integration can now begin

---

## Phase 3: User Story 1 - View Real-Time Lag Trend (Priority: P1) 🎯 MVP

**Goal**: Operators can quickly assess whether replication lag is stable, improving, or degrading over time by viewing sparkline visualization in subscription detail modal.

**Independent Test**: Open subscription detail modal (Enter key) and observe sparkline updating every second; visual trend should match underlying lag pattern (flat for stable, upward for degrading, downward for recovering).

### Implementation for User Story 1

- [X] T006 [US1] Add lagHistory field to SubscriptionListItem interface in src/hooks/useSubscriptions.ts
- [X] T007 [US1] Populate lagHistory from store in useSubscriptions hook in src/hooks/useSubscriptions.ts
- [X] T008 [US1] Import Sparkline component in src/components/layout/Modal.tsx
- [X] T009 [US1] Add Sparkline to SubscriptionDetailContent in src/components/layout/Modal.tsx
  - Display above or below the Lag section
  - Pass lagHistory, isStale, and appropriate width

**Checkpoint**: User Story 1 complete - operators can view lag trends in subscription detail modal

---

## Phase 4: User Story 2 - Compare Lag Across Subscriptions (Priority: P2)

**Goal**: Operators can quickly identify which subscriptions are lagging most and compare relative performance across the cluster.

**Independent Test**: Open detail modals for 3+ subscriptions with different lag patterns; higher lag subscriptions should show taller bars relative to consistent linear scaling.

### Implementation for User Story 2

- [X] T010 [US2] Verify linear scaling normalizes correctly across different max values in src/components/charts/Sparkline.tsx
- [X] T011 [US2] Add y-axis max indicator ("max: Xs" or "max: XKB") to Sparkline output in src/components/charts/Sparkline.tsx

**Checkpoint**: User Story 2 complete - operators can compare lag severity across subscriptions

---

## Phase 5: User Story 3 - Understand Time Context (Priority: P3)

**Goal**: Operators can understand when lag events occurred within the 5-minute history window to correlate with external events.

**Independent Test**: View sparkline with varying amounts of data (new subscription vs full history); axis labels should accurately reflect actual time range ("-5m" to "now" or shorter for partial data).

### Implementation for User Story 3

- [X] T012 [US3] Add time axis labels ("-5m" / "now") rendering to Sparkline in src/components/charts/Sparkline.tsx
- [X] T013 [US3] Handle partial data time axis labels (e.g., "-2m" to "now") in src/components/charts/Sparkline.tsx

**Checkpoint**: User Story 3 complete - operators can correlate lag events with time

---

## Phase 6: Polish & Edge Cases

**Purpose**: Handle edge cases defined in specification

- [X] T014 Handle zero lag values (flat line at bottom) in src/components/charts/Sparkline.tsx
- [X] T015 Handle extreme lag spikes (linear scaling, spike at top) in src/components/charts/Sparkline.tsx
- [X] T016 Handle bytes fallback when lagSeconds is null in src/components/charts/Sparkline.tsx
- [X] T017 Verify no flicker during 1-second polling updates in Modal rendering

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 - creates core component
- **User Story 1 (Phase 3)**: Depends on Phase 2 - integrates component into modal
- **User Story 2 (Phase 4)**: Depends on Phase 2 - can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Phase 2 - can run in parallel with US1/US2
- **Polish (Phase 6)**: Can be done incrementally during or after user stories

### User Story Dependencies

- **User Story 1 (P1)**: Requires Sparkline component (Phase 2)
- **User Story 2 (P2)**: Requires Sparkline component (Phase 2) - adds y-axis indicator
- **User Story 3 (P3)**: Requires Sparkline component (Phase 2) - adds time axis labels

### Parallel Opportunities

After Phase 2 completes:
- T006, T007 (US1 hook changes) can run in parallel with T010, T011 (US2 scaling)
- T012, T013 (US3 time axis) can run in parallel with US1/US2 tasks
- T014, T015, T016, T017 (Polish) can run after their relevant component sections exist

---

## Parallel Example: After Phase 2

```bash
# After Sparkline component exists, these can run in parallel:

# User Story 1 (hook integration):
Task: "Add lagHistory field to SubscriptionListItem in src/hooks/useSubscriptions.ts"
Task: "Populate lagHistory from store in src/hooks/useSubscriptions.ts"

# User Story 2 (scaling enhancements):
Task: "Add y-axis max indicator to src/components/charts/Sparkline.tsx"

# User Story 3 (time context):
Task: "Add time axis labels to src/components/charts/Sparkline.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001) - 1 task
2. Complete Phase 2: Foundational (T002-T005) - 4 tasks
3. Complete Phase 3: User Story 1 (T006-T009) - 4 tasks
4. **STOP and VALIDATE**: Test sparkline in subscription detail modal
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Sparkline component ready
2. Add User Story 1 → Operators can view lag trends (MVP!)
3. Add User Story 2 → Operators can compare lag across subscriptions
4. Add User Story 3 → Operators can correlate with time
5. Polish → Edge cases handled

### Files Modified Summary

| File | Tasks | Action |
|------|-------|--------|
| src/store/types.ts | T001 | MODIFY constant |
| src/components/charts/Sparkline.tsx | T003-T005, T011-T016 | CREATE new component |
| src/hooks/useSubscriptions.ts | T006, T007 | MODIFY add lagHistory |
| src/components/layout/Modal.tsx | T008, T009 | MODIFY add Sparkline |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total: 17 tasks across 6 phases
