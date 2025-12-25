# Implementation Plan: Replication Slots Panel

**Branch**: `010-slots-panel` | **Date**: 2025-12-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-slots-panel/spec.md`

## Summary

Implement a TUI panel for monitoring PostgreSQL replication slots with visual progress bars showing WAL retention severity, active/inactive status indicators, WAL status (reserved/extended/unreserved/lost), and a summary header with aggregated statistics. Follows the established pattern from SubscriptionsPanel with a dedicated hook for data aggregation.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**: React 18.x, Ink 5.x, Zustand 5.x (existing stack)
**Storage**: N/A (reads from existing Zustand store, populated by PollingService)
**Testing**: ink-testing-library, vitest (following existing test patterns)
**Target Platform**: Terminal (Node.js 18+ / Bun 1.x)
**Project Type**: single (existing TUI application)
**Performance Goals**: <100ms keyboard response, instant visual updates from store
**Constraints**: Keyboard-first UX, responsive layout (standard/narrow/short/compact breakpoints)
**Scale/Scope**: Single panel feature with ~5 components, 1 hook, 1 modal content type

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First Architecture | ✅ Pass | SlotsPanel, SlotRow, EmptyState are presentational; hook handles data |
| II. Type Safety (NON-NEGOTIABLE) | ✅ Pass | All types derived from existing SlotData; new SlotListItem interface |
| III. Real-Time Reactive State | ✅ Pass | Derives from Zustand store via useSlots hook; no local shared state |
| IV. Keyboard-First UX | ✅ Pass | j/k navigation, Enter for detail modal, 'l' for panel focus |
| V. PostgreSQL Compatibility | ✅ Pass | Graceful degradation for walStatus (null for PG<13) |
| VI. Fail-Safe Operations | ✅ Pass | Read-only display panel; no destructive operations |
| VII. Complete Implementation (NON-NEGOTIABLE) | ✅ Pass | All components, hook, modal content fully specified |

## Project Structure

### Documentation (this feature)

```text
specs/010-slots-panel/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── atoms/
│   │   └── ProgressBar.tsx     # Extend with color prop
│   ├── panels/
│   │   ├── SlotsPanel.tsx      # NEW: Main panel component
│   │   ├── SlotsPanel.test.tsx # NEW: Component tests
│   │   └── index.ts            # Export SlotsPanel
│   └── layout/
│       └── Modal.tsx           # Add SlotDetailContent
├── hooks/
│   ├── useSlots.ts             # NEW: Data aggregation hook
│   └── useSlots.test.ts        # NEW: Hook tests
└── types/
    └── slots.ts                # NEW: SlotListItem type (optional, can inline)
```

**Structure Decision**: Follows existing pattern established by SubscriptionsPanel (009). Panel component in `components/panels/`, dedicated data hook in `hooks/`, modal content added to existing Modal.tsx.

## Complexity Tracking

> No constitution violations requiring justification.

N/A - Feature follows established patterns with minimal complexity.
