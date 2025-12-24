# Implementation Plan: State Management

**Branch**: `005-state-management` | **Date**: 2025-12-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-state-management/spec.md`

## Summary

Implement a comprehensive Zustand store for replmon application state management. The store manages:
- **Replication Data**: Connection status, nodes, subscriptions, slots, conflicts (per-node from PollingService)
- **Time-Series Data**: Lag history with configurable FIFO retention (default 60 samples)
- **UI State**: Focused panel, selections per panel, active modals, focus restoration
- **Derived Selectors**: Memoized aggregations, filters, computed values across all nodes

Technical approach: Extend existing `src/store/connection.ts` pattern using Zustand with `subscribeWithSelector` and `devtools` middleware. Normalize polling data by node, integrate with PollingService events, provide typed selectors for component consumption.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**: Zustand 5.x (with subscribeWithSelector + devtools middleware), React 18.x, Ink 5.x
**Storage**: In-memory Zustand store (no persistence required)
**Testing**: Bun test runner + zustand/testing utilities
**Target Platform**: Bun 1.x (Node.js 18+ fallback), terminal (TUI via Ink)
**Project Type**: Single project (TUI application)
**Performance Goals**: UI reflects state changes <100ms, panel focus <50ms, maintain 60 FPS with 10 nodes/50 subscriptions/100 slots
**Constraints**: Lag history capped at 60 samples per subscription, state consistency after 1000+ polling cycles
**Scale/Scope**: Up to 10 PostgreSQL nodes, 50 subscriptions, 100 slots, 5 panels, multiple modal types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First Architecture | ✅ PASS | Store provides state; components consume via hooks. No inline logic in store. |
| II. Type Safety (NON-NEGOTIABLE) | ✅ PASS | Full TypeScript generics for store, typed selectors, no `any` types. |
| III. Real-Time Reactive State | ✅ PASS | Zustand subscriptions trigger re-renders. subscribeWithSelector for fine-grained updates. |
| IV. Keyboard-First UX | ✅ PASS | Store tracks focused panel, selections. UI state enables keyboard navigation. |
| V. PostgreSQL Compatibility | ✅ PASS | Store agnostic to data source. PollingService handles version differences. |
| VI. Fail-Safe Operations | ✅ PASS | Modal state for confirmations. Per-node error tracking. Isolated failures. |
| VII. Complete Implementation (NON-NEGOTIABLE) | ✅ PASS | All store slices, actions, selectors fully implemented. No stubs. |

**Technology Constraints**:
- ✅ Runtime: Bun/Node.js 18+
- ✅ State: Zustand with subscribeWithSelector middleware (existing pattern)
- ✅ Functional components only (store consumed via hooks)
- ⚠️ NEW: devtools middleware for development debugging (per FR-021)

## Project Structure

### Documentation (this feature)

```text
specs/005-state-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal TypeScript interfaces)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── store/
│   ├── index.ts                 # Unified store export + hook
│   ├── connection.ts            # [EXISTING] Connection state slice
│   ├── replication.ts           # [NEW] Replication data slice (nodes, subscriptions, slots, conflicts)
│   ├── ui.ts                    # [NEW] UI state slice (focus, selections, modals)
│   ├── selectors/
│   │   ├── index.ts             # Selector exports
│   │   ├── aggregations.ts      # Cross-node aggregations
│   │   ├── filters.ts           # Filtered views (by threshold, status)
│   │   └── computed.ts          # Computed values (totals, max lag)
│   └── types.ts                 # Store type definitions
├── types/
│   ├── store.ts                 # [NEW] Unified store types
│   └── ui.ts                    # [NEW] UI state types (panels, modals)
├── hooks/
│   └── useStore.ts              # [NEW] Convenience hooks for store access
└── components/
    └── ...                      # [EXISTING] Components consume store via hooks
```

**Structure Decision**: Single project structure. Store organized into slices (connection, replication, ui) with dedicated selectors directory for derived state. Follows existing `src/store/connection.ts` pattern.

## Complexity Tracking

> **No violations. All constitution principles pass.**

N/A - No complexity justifications required.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts generated.*

| Principle | Status | Design Validation |
|-----------|--------|-------------------|
| I. Component-First Architecture | ✅ PASS | Store slices separate from components. Components use `useStore` hook. |
| II. Type Safety (NON-NEGOTIABLE) | ✅ PASS | `contracts/store-types.ts` defines all interfaces. No `any` types in contracts. |
| III. Real-Time Reactive State | ✅ PASS | `handlePollingData` action integrates with PollingService events. subscribeWithSelector enables fine-grained subscriptions. |
| IV. Keyboard-First UX | ✅ PASS | `UISliceActions` includes `setFocusedPanel`, `focusNextPanel`, `focusPreviousPanel`, `selectNext`, `selectPrevious`. Panel shortcuts defined in `PANEL_SHORTCUTS`. |
| V. PostgreSQL Compatibility | ✅ PASS | Store re-exports types from `polling/types.ts` which handle both native and pglogical sources. |
| VI. Fail-Safe Operations | ✅ PASS | `ModalConfig` with `confirmation` type. `staleNodes` Set tracks disconnected nodes. Per-node error handling via `markNodeStale`. |
| VII. Complete Implementation (NON-NEGOTIABLE) | ✅ PASS | All action signatures defined. All selector contracts specified. No placeholder implementations in contracts. |

**All gates passed. Ready for Phase 2 task generation.**

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Research | `research.md` | Technology decisions and best practices |
| Data Model | `data-model.md` | Entity definitions and state structure |
| Store Types | `contracts/store-types.ts` | TypeScript interfaces for state and actions |
| Selectors | `contracts/selectors.ts` | Selector signatures for derived state |
| Quickstart | `quickstart.md` | Usage examples and integration patterns |

## Next Step

Run `/speckit.tasks` to generate implementation tasks from this plan.
