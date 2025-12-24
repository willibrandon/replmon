# Tasks: UI Framework & Layout

**Input**: Design documents from `/specs/006-ui-framework/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in specification. Test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure and barrel exports for new components

- [ ] T001 Create directory structure: `src/theme/`, `src/components/atoms/`, `src/components/layout/`, `src/components/panels/`
- [ ] T002 [P] Create barrel export in `src/theme/index.ts`
- [ ] T003 [P] Create barrel export in `src/components/atoms/index.ts`
- [ ] T004 [P] Create barrel export in `src/components/layout/index.ts`
- [ ] T005 [P] Create barrel export in `src/components/panels/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Theme system and responsive hooks that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create ThemeContext in `src/theme/ThemeContext.ts` defining context for ResolvedTheme
- [ ] T007 Create ThemeProvider in `src/theme/ThemeProvider.tsx` accepting theme prop and providing via context
- [ ] T008 Create useTheme hook in `src/hooks/useTheme.ts` consuming ThemeContext and returning ThemeColors
- [ ] T009 Create useTerminalSize hook in `src/hooks/useTerminalSize.ts` with debounced resize handling (100ms)
- [ ] T010 Create useBreakpoint hook in `src/hooks/useBreakpoint.ts` deriving breakpoint from terminal size
- [ ] T011 Wire ThemeProvider in `src/components/App.tsx` wrapping existing content with config.theme prop

**Checkpoint**: Foundation ready - theme context available via useTheme(), terminal size/breakpoint available

---

## Phase 3: User Story 1 - Responsive Dashboard Layout (Priority: P1) 🎯 MVP

**Goal**: MainLayout organizes Header, panel grid, Footer with responsive breakpoints

**Independent Test**: Launch app in terminals of various sizes (80x24, 120x40, 60x24), verify all content visible and layout adapts

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create Header component in `src/components/layout/Header.tsx` with title, pglogical badge, status indicators
- [ ] T013 [P] [US1] Create Footer component in `src/components/layout/Footer.tsx` with keyboard hints, panel name, timestamp (merge StatusBar logic)
- [ ] T014 [US1] Create MainLayout component in `src/components/layout/MainLayout.tsx` using useBreakpoint for responsive arrangement
- [ ] T015 [US1] Update barrel export in `src/components/layout/index.ts` with Header, Footer, MainLayout
- [ ] T016 [US1] Delete `src/components/StatusBar.tsx` after Footer is complete

**Checkpoint**: MainLayout renders with Header/Footer, adapts to terminal size

---

## Phase 4: User Story 2 - Panel Focus and Visual Feedback (Priority: P1)

**Goal**: Panel component with focus state from store, visual feedback on focus change

**Independent Test**: Launch app, press t/s/l/c/o keys, verify focus indicator updates on correct panel

### Implementation for User Story 2

- [ ] T017 [P] [US2] Create StatusDot atom in `src/components/atoms/StatusDot.tsx` with variant-based color/symbol
- [ ] T018 [P] [US2] Create Badge atom in `src/components/atoms/Badge.tsx` with variant-based styling
- [ ] T019 [P] [US2] Create ProgressBar atom in `src/components/atoms/ProgressBar.tsx` with percent and width props
- [ ] T020 [P] [US2] Create Spinner atom in `src/components/atoms/Spinner.tsx` with animated indicator
- [ ] T021 [US2] Update barrel export in `src/components/atoms/index.ts` with all atoms
- [ ] T022 [US2] Create Panel component in `src/components/layout/Panel.tsx` reading focusedPanel from store, applying focus styling
- [ ] T023 [US2] Update barrel export in `src/components/layout/index.ts` with Panel
- [ ] T024 [US2] Create TopologyPanel in `src/components/panels/TopologyPanel.tsx` extracting node list logic from Dashboard, using StatusDot/Badge
- [ ] T025 [US2] Update barrel export in `src/components/panels/index.ts` with TopologyPanel
- [ ] T026 [US2] Refactor `src/components/Dashboard.tsx` to use MainLayout with Panel components and keyboard handling

**Checkpoint**: All panels visible with focus indicators, keyboard navigation (t/s/l/c/o/Tab) works

---

## Phase 5: User Story 3 - Modal Overlay Display (Priority: P2)

**Goal**: Modal component renders centered with focus trapping, closes with Escape

**Independent Test**: Press '?' to open help modal, verify overlay appearance, press Escape to close and confirm focus restoration

### Implementation for User Story 3

- [ ] T027 [US3] Create Modal component in `src/components/layout/Modal.tsx` with config prop, onClose handler, centered layout
- [ ] T028 [US3] Update barrel export in `src/components/layout/index.ts` with Modal
- [ ] T029 [US3] Integrate Modal rendering in MainLayout when activeModal !== null with keyboard trapping

**Checkpoint**: Modal opens centered, blocks panel navigation, closes with Escape, focus restored

---

## Phase 6: User Story 4 - Theme Color Application (Priority: P2)

**Goal**: All UI components consistently apply theme colors (dark/light themes)

**Independent Test**: Launch with dark theme, verify colors; edit config to light theme, re-launch, verify light colors

### Implementation for User Story 4

- [ ] T030 [US4] Apply useTheme colors to Header in `src/components/layout/Header.tsx`
- [ ] T031 [P] [US4] Apply useTheme colors to Footer in `src/components/layout/Footer.tsx`
- [ ] T032 [P] [US4] Apply useTheme colors to Panel borders/title in `src/components/layout/Panel.tsx`
- [ ] T033 [P] [US4] Apply useTheme colors to Modal in `src/components/layout/Modal.tsx`
- [ ] T034 [US4] Verify all atoms (StatusDot, Badge, ProgressBar, Spinner) use theme colors consistently

**Checkpoint**: Dark and light themes render correctly across all components

---

## Phase 7: User Story 5 - SplitView Layout for Detail Views (Priority: P3)

**Goal**: SplitView divides space for list + detail panes

**Independent Test**: Select item in panel, verify split view appears with detail content

### Implementation for User Story 5

- [ ] T035 [US5] Create SplitView component in `src/components/layout/SplitView.tsx` with direction and ratio props
- [ ] T036 [US5] Update barrel export in `src/components/layout/index.ts` with SplitView
- [ ] T037 [US5] Apply useBreakpoint logic to SplitView for narrow/compact fallback behavior

**Checkpoint**: SplitView renders with configurable ratio, adapts to breakpoints

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T038 Validate all success criteria (SC-001 through SC-008) from spec.md
- [ ] T039 Run quickstart.md verification checklist
- [ ] T040 Verify type exports are complete in all barrel files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority but US1 (MainLayout) should complete before US2 (Panel)
  - US3 and US4 are P2 priority, can proceed after US1/US2
  - US5 is P3 priority, can proceed after US1
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (Phase 2) - Creates MainLayout structure
- **User Story 2 (P1)**: Depends on US1 (needs MainLayout to add Panel) - Creates atoms and Panel
- **User Story 3 (P2)**: Depends on US2 (needs Panel and MainLayout) - Adds Modal overlay
- **User Story 4 (P2)**: Depends on US2 (needs all components created) - Applies theme colors
- **User Story 5 (P3)**: Depends on US1 (needs MainLayout) - Can run parallel with US3/US4

### Within Each User Story

- Atoms before layout components that use them
- Layout components before integration
- Store integration during component creation

### Parallel Opportunities

Within Phase 2 (Foundational):
- T006-T010 are sequential (context → provider → hooks → wiring)

Within Phase 3 (US1):
- T012 and T013 can run in parallel (Header and Footer)

Within Phase 4 (US2):
- T017, T018, T019, T020 can run in parallel (all atoms)

Within Phase 6 (US4):
- T031, T032, T033 can run in parallel (applying theme to different components)

---

## Parallel Example: User Story 2

```bash
# Launch all atom implementations together:
Task: "Create StatusDot atom in src/components/atoms/StatusDot.tsx"
Task: "Create Badge atom in src/components/atoms/Badge.tsx"
Task: "Create ProgressBar atom in src/components/atoms/ProgressBar.tsx"
Task: "Create Spinner atom in src/components/atoms/Spinner.tsx"

# Then sequentially:
Task: "Update barrel export in src/components/atoms/index.ts"
Task: "Create Panel component in src/components/layout/Panel.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Complete Phase 1: Setup (directory structure)
2. Complete Phase 2: Foundational (theme system, responsive hooks)
3. Complete Phase 3: User Story 1 (MainLayout, Header, Footer)
4. Complete Phase 4: User Story 2 (atoms, Panel, Dashboard refactor)
5. **STOP and VALIDATE**: Full dashboard layout with panel navigation works
6. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → Theme and hooks ready
2. Add User Story 1 → MainLayout structure visible
3. Add User Story 2 → Full panel navigation working (MVP!)
4. Add User Story 3 → Modal overlays working
5. Add User Story 4 → Theme colors consistent
6. Add User Story 5 → SplitView for details

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable after completion
- StatusBar.tsx is deleted after Footer absorbs its logic (T016)
- Keyboard handling moves from Dashboard to MainLayout (T026)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
