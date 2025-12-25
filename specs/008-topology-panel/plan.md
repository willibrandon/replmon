# Implementation Plan: Topology Panel

**Branch**: `008-topology-panel` | **Date**: 2025-12-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-topology-panel/spec.md`

## Summary

Enhance the existing TopologyPanel component to display an ASCII-art visualization of PostgreSQL replication cluster nodes. The panel will show node boxes with status indicators, role badges, and connection lines between provider/subscriber pairs with replication lag values. Bidirectional pglogical relationships will be displayed with double-headed arrows. All visualization derives from the existing Zustand store (nodes, subscriptions, lagHistory) with theme-based color coding.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**: React 18.3.x, Ink 5.0.x, Zustand 5.x (existing stack)
**Storage**: N/A (UI-only feature, reads from existing Zustand store)
**Testing**: Bun test with ink-testing-library
**Target Platform**: Terminal/CLI (cross-platform via Ink)
**Project Type**: Single project (existing TUI application)
**Performance Goals**: Panel renders within 16ms; updates within 500ms of polling data
**Constraints**: Must work on terminals as narrow as 80 columns; keyboard-first navigation
**Scale/Scope**: 1-10 nodes typically; up to 20 nodes for complex clusters

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First Architecture | PASS | TopologyPanel is a component; will use atoms (StatusDot, Badge) and compose with TopologyNode, ConnectionLine sub-components |
| II. Type Safety (NON-NEGOTIABLE) | PASS | All types defined in store/types.ts; new types for TopologyEdge will follow strict typing |
| III. Real-Time Reactive State | PASS | Reads from Zustand store; subscriptions/lagHistory update reactively from PollingService |
| IV. Keyboard-First UX | PASS | j/k/arrow navigation for node selection; integration with existing MainLayout input handling |
| V. PostgreSQL Compatibility | PASS | Works with both native subscriptions and pglogical; uses existing subscription source detection |
| VI. Fail-Safe Operations | PASS | Read-only visualization; no destructive operations in this feature |
| VII. Complete Implementation (NON-NEGOTIABLE) | PASS | All user stories implementable in single session; no placeholders or future work deferred |

**Gate Status**: PASS - No violations. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/008-topology-panel/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal component APIs)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── atoms/           # Existing: StatusDot, Badge (reused)
│   ├── panels/
│   │   └── TopologyPanel.tsx  # Enhanced with ASCII visualization
│   └── topology/        # NEW: Topology-specific sub-components
│       ├── TopologyNode.tsx       # Node box with status, role, host info
│       ├── ConnectionLine.tsx     # Line drawing between nodes
│       └── TopologyLayout.tsx     # Layout calculation and rendering
├── hooks/
│   └── useTopology.ts   # NEW: Derive topology graph from store
├── store/
│   └── selectors/
│       └── topology.ts  # NEW: Topology-specific selectors
└── types/
    └── topology.ts      # NEW: TopologyEdge, NodeRole, LayoutConfig

tests/
└── components/
    └── topology/        # NEW: Topology panel tests
        ├── TopologyPanel.test.tsx
        └── TopologyNode.test.tsx
```

**Structure Decision**: Single project with new `topology/` subdirectory under components for topology-specific rendering. New selectors in `store/selectors/topology.ts` for deriving graph relationships from subscription data.

## Complexity Tracking

> No violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
