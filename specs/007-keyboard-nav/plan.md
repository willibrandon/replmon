# Implementation Plan: Keyboard Navigation

**Branch**: `007-keyboard-nav` | **Date**: 2025-12-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-keyboard-nav/spec.md`

## Summary

Add missing keyboard navigation functionality: arrow keys for list navigation, 'h' key as alternate help shortcut, and 'q' behavior refinement for modal context. Most keyboard navigation is already implemented in features 005-state-management and 006-ui-framework.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**: React 18.x, Ink 5.x, Zustand 5.x (existing stack)
**Storage**: N/A (UI-only feature, uses existing Zustand store)
**Testing**: Bun test with ink-testing-library (existing test framework)
**Target Platform**: Terminal/CLI (macOS, Linux)
**Project Type**: Single project
**Performance Goals**: Immediate keypress response (<16ms)
**Constraints**: All navigation via keyboard, no mouse required
**Scale/Scope**: 5 panels, 4 modal types, list navigation per panel

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First Architecture | ✅ PASS | Builds on existing Panel, Modal, MainLayout components |
| II. Type Safety (NON-NEGOTIABLE) | ✅ PASS | All keyboard handlers use typed Panel/ModalType from store/types.ts |
| III. Real-Time Reactive State | ✅ PASS | Focus/selection state managed via Zustand, UI derives from store |
| IV. Keyboard-First UX | ✅ PASS | **Core principle** - this feature implements it |
| V. PostgreSQL Compatibility | N/A | No database interaction in this feature |
| VI. Fail-Safe Operations | ✅ PASS | No destructive operations, q requires modal closed |
| VII. Complete Implementation (NON-NEGOTIABLE) | ✅ PASS | Minimal scope, all requirements clearcut |

## Project Structure

### Documentation (this feature)

```text
specs/007-keyboard-nav/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal - UI state only)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── layout/
│   │   ├── MainLayout.tsx    # ADD: arrow key handlers, 'h' key
│   │   └── Modal.tsx         # Already handles Esc
│   └── panels/               # Already have focus indicators
├── store/
│   ├── types.ts              # Already has Panel, ModalType, PANEL_SHORTCUTS
│   └── ui.ts                 # Already has selectNext/selectPrevious
└── hooks/                    # No changes needed

tests/
└── unit/
    └── keyboard.test.ts      # ADD: keyboard navigation tests
```

**Structure Decision**: Existing single-project structure. Minimal changes to MainLayout.tsx to add arrow key handlers and 'h' key support. No new files needed for implementation.

## Existing Implementation Analysis

**Already Implemented (005/006 features)**:
- Tab/Shift+Tab panel cycling (`focusNextPanel`/`focusPreviousPanel`)
- Direct panel shortcuts t/s/l/c/o (`PANEL_SHORTCUTS`)
- j/k list navigation (`selectNext`/`selectPrevious`)
- Escape modal close (`closeModal`)
- ? help modal open
- q quit (when no modal)
- Focus state with visual indicators (bold border, primary color)
- Selection state per panel
- Modal focus preservation/restoration

**Gaps to Implement (spec requirements)**:
1. Arrow keys (Up/Down) for list navigation - FR-004
2. 'h' key as alternate help trigger - FR-007
3. Tests verifying all keyboard interactions

## Complexity Tracking

> No violations. Minimal incremental work on existing architecture.
