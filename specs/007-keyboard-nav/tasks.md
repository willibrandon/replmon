# Tasks: Keyboard Navigation

**Input**: Design documents from `/specs/007-keyboard-nav/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Implementation Note**: Most keyboard navigation is already implemented in features 005-state-management and 006-ui-framework. This task list covers only the remaining gaps identified in plan.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Already Implemented (No Tasks Needed)

The following user stories are **100% complete** from previous features:

- **User Story 1 - Panel Navigation with Tab Cycling** (P1): Implemented in 005-state-management
- **User Story 2 - Direct Panel Access via Shortcut Keys** (P1): Implemented in 005-state-management
- **User Story 4 - Modal Open and Close with Escape** (P2): Implemented in 006-ui-framework
- **User Story 6 - Application Quit** (P3): Implemented in 006-ui-framework

## Gaps to Implement

| User Story | Gap | Status |
|------------|-----|--------|
| US3 - List Navigation | Arrow keys not implemented (only j/k) | Needs implementation |
| US5 - Help Modal Access | 'h' key not implemented (only '?') | Needs implementation |
| Cross-cutting | Help text doesn't show arrow keys or 'h' | Needs update |

---

## Phase 1: Setup

**Purpose**: No new project setup required - extending existing implementation

- [x] T001 Verify existing keyboard handlers work correctly in src/components/layout/MainLayout.tsx

**Checkpoint**: Existing navigation confirmed working

---

## Phase 2: Foundational

**Purpose**: No new foundational infrastructure required

This feature builds entirely on existing infrastructure:
- `useInput` hook from Ink (already used in MainLayout.tsx)
- `selectNext/selectPrevious` actions (already in src/store/ui.ts)
- `openModal` action (already in src/store/ui.ts)

**Checkpoint**: Foundation ready - skip to user story implementation

---

## Phase 3: User Story 3 - List Navigation within Panels (Priority: P2)

**Goal**: Add arrow key support (↑/↓) as alternatives to j/k for list navigation

**Independent Test**: Press ↑/↓ keys in any panel with a list and verify selection moves

### Implementation for User Story 3

- [x] T002 [US3] Add downArrow handler to selectNext() in src/components/layout/MainLayout.tsx
- [x] T003 [US3] Add upArrow handler to selectPrevious() in src/components/layout/MainLayout.tsx

**Code Change** (lines 38-39 of MainLayout.tsx):
```typescript
// Change from:
if (input === 'j') { selectNext(); return; }
if (input === 'k') { selectPrevious(); return; }

// Change to:
if (input === 'j' || key.downArrow) { selectNext(); return; }
if (input === 'k' || key.upArrow) { selectPrevious(); return; }
```

**Checkpoint**: Arrow keys ↑/↓ navigate list items same as k/j

---

## Phase 4: User Story 5 - Help Modal Access (Priority: P2)

**Goal**: Add 'h' key as alternate trigger for help modal (in addition to '?')

**Independent Test**: Press 'h' key and verify help modal opens

### Implementation for User Story 5

- [x] T004 [US5] Add 'h' key handler for help modal in src/components/layout/MainLayout.tsx

**Code Change** (line 40 of MainLayout.tsx):
```typescript
// Change from:
if (input === '?') { openModal({ type: 'help', title: 'Help' }); }

// Change to:
if (input === '?' || input === 'h') { openModal({ type: 'help', title: 'Help' }); }
```

**Checkpoint**: Both 'h' and '?' open help modal

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Update help modal content to show all available shortcuts

- [x] T005 [P] Update help text to show arrow key shortcuts in src/components/layout/Modal.tsx
- [x] T006 [P] Update help text to show 'h' as help shortcut in src/components/layout/Modal.tsx
- [x] T007 Run manual testing per quickstart.md validation steps

**Help Text Update** (Modal.tsx help section):
```typescript
<Text><Text color={colors.secondary}>↑/k</Text>      Previous item</Text>
<Text><Text color={colors.secondary}>↓/j</Text>      Next item</Text>
<Text><Text color={colors.secondary}>h/?</Text>      Show this help</Text>
```

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Verification only - no blocking work
- **Foundational (Phase 2)**: Skip - using existing infrastructure
- **US3 List Navigation (Phase 3)**: Can start immediately
- **US5 Help Modal (Phase 4)**: Can start immediately, parallel with Phase 3
- **Polish (Phase 5)**: Depends on Phases 3 and 4 completion

### User Story Dependencies

- **User Story 3 (List Navigation)**: Independent - can start immediately
- **User Story 5 (Help Modal)**: Independent - can start immediately

### Parallel Opportunities

- T002 and T003 can be done together (same file, but sequential edits on adjacent lines)
- T004 can be done in parallel with T002/T003 (different line in same file)
- T005 and T006 can be done together (same file, help section)
- **Recommended**: Do T002-T004 in a single edit to MainLayout.tsx

---

## Parallel Example: All Implementation Tasks

```bash
# All user story implementation happens in MainLayout.tsx lines 38-40
# Recommended: Single edit combining T002, T003, T004

# Then update help text in Modal.tsx
Task: "Update help text to show arrow key and 'h' shortcuts"
```

---

## Implementation Strategy

### MVP First (Minimal Change)

1. Edit 3 lines in MainLayout.tsx (T002, T003, T004)
2. Update help section in Modal.tsx (T005, T006)
3. Manual test per quickstart.md (T007)
4. **Done** - all gaps addressed

### Single Developer Path

1. T001: Quick verification of existing handlers
2. T002-T004: Edit MainLayout.tsx (3 line changes)
3. T005-T006: Edit Modal.tsx help content
4. T007: Manual testing validation

### Estimated Scope

- **Files changed**: 2 (MainLayout.tsx, Modal.tsx)
- **Lines changed**: ~6-10
- **Complexity**: Trivial - adding OR conditions to existing handlers

---

## Notes

- All existing shortcuts (Tab, Shift+Tab, t/s/l/c/o, j/k, ?, q, Esc) remain unchanged
- Arrow keys and 'h' key are additive - no breaking changes
- Modal blocking logic already prevents arrow/h keys when modal is open (early return)
- Tests from 005-state-management cover the underlying state actions (selectNext, selectPrevious, openModal)
