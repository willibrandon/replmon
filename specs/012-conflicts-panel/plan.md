# Implementation Plan: Conflicts Panel

**Branch**: `012-conflicts-panel` | **Date**: 2025-12-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-conflicts-panel/spec.md`

## Summary

Implement a Conflicts Panel for replmon that displays pglogical replication conflicts from two data sources: the `pglogical.conflict_history` table (preferred, pglogical 2.5.0+) and PostgreSQL csvlog parsing (fallback). The panel aggregates conflicts across all connected nodes, displays them in a timestamp-ordered list with conflict type/resolution badges, supports keyboard navigation (j/k, Enter for details, Escape to close), and shows summary statistics. The implementation follows the existing panel architecture (SlotsPanel, SubscriptionsPanel patterns) with a `useConflicts` hook and `ConflictsPanel` component.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**: React 18.3.x, Ink 5.0.x, Zustand 5.x, pg (^8.x), pg-pool (^3.x)
**Storage**: N/A (queries PostgreSQL nodes via ConnectionManager; optional log file access)
**Testing**: Bun test runner, ink-testing-library for component tests
**Target Platform**: Node.js 18+ / Bun 1.x CLI
**Project Type**: Single project (TUI application)
**Performance Goals**: <2s initial load, <500ms detail modal, smooth j/k navigation at 100+ items
**Constraints**: 24-hour conflict window, max 500 conflicts (configurable), 1s polling interval
**Scale/Scope**: Support 1-10 nodes, each with 0-500 conflicts; aggregate view across all nodes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|------------|-------|
| I. Component-First Architecture | ✅ Pass | ConflictsPanel (presentational) + useConflicts (container logic) pattern matches existing panels |
| II. Type Safety (NON-NEGOTIABLE) | ✅ Pass | All types defined: ConflictEvent, ConflictSource, ConflictSummary, ConflictListItem |
| III. Real-Time Reactive State | ✅ Pass | Zustand store slice for conflicts; 1s polling via PollingService |
| IV. Keyboard-First UX | ✅ Pass | j/k navigation, Enter detail, Escape close, 'c' focus shortcut (spec FR-010) |
| V. PostgreSQL Compatibility | ✅ Pass | Dual source support: pglogical conflict_history + csvlog fallback; graceful degradation |
| VI. Fail-Safe Operations | ✅ Pass | View-only (no destructive ops); connection failures isolated per-node |
| VII. Complete Implementation | ✅ Pass | All acceptance criteria testable; no TODOs or placeholders permitted |

**Pre-Phase 0 Gate**: PASSED

## Project Structure

### Documentation (this feature)

```text
specs/012-conflicts-panel/
├── plan.md              # This file
├── research.md          # Phase 0: Log parsing patterns, conflict_history schema
├── data-model.md        # Phase 1: ConflictEvent, ConflictSource entities
├── quickstart.md        # Phase 1: Testing with sample conflicts
├── contracts/           # Phase 1: Query contracts, hook interface
└── tasks.md             # Phase 2: Implementation tasks (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── panels/
│       └── ConflictsPanel.tsx       # Main panel component
├── hooks/
│   └── useConflicts.ts              # Aggregation hook (pattern: useSlots.ts)
├── services/
│   └── polling/
│       └── queries/
│           └── pglogical-conflicts.ts  # conflict_history query + log parser
├── store/
│   └── conflicts.ts                 # New store slice (or extend replication.ts)
└── types/
    └── conflicts.ts                 # ConflictEvent, ConflictSource, etc.

tests/
├── unit/
│   └── hooks/
│       └── useConflicts.test.ts
└── integration/
    └── pglogical-conflicts.test.ts
```

**Structure Decision**: Follows single-project pattern established by 010-slots-panel and 011-lag-visualization. New files for conflicts domain; integrates with existing PollingService and store architecture.

## Complexity Tracking

> No complexity violations. Feature follows established patterns.

