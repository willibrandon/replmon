# Implementation Plan: Operations Modal

**Branch**: `013-operations-modal` | **Date**: 2025-12-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-operations-modal/spec.md`

## Summary

DBA operations interface for replmon TUI providing subscription management (pause/resume), table resync, replication slot management (create/drop), conflict log clearing, and Prometheus metrics export. Features context-sensitive operations based on focused panel, type-to-confirm for destructive actions, in-memory operation history, and clear error messaging.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**: React 18.3.x, Ink 5.0.x, Zustand 5.x, pg (^8.x), pg-pool (^3.x)
**Storage**: In-memory only (operation history lost on exit); queries PostgreSQL nodes via ConnectionManager
**Testing**: ink-testing-library for components, manual QA against real PostgreSQL cluster
**Target Platform**: Node.js 18+ or Bun runtime (macOS/Linux terminal)
**Project Type**: Single TUI application
**Performance Goals**: Operation results displayed within 2 seconds of completion (SC-003)
**Constraints**: 30-second default operation timeout; keyboard-first interaction; 5 interactions max per operation (SC-001)
**Scale/Scope**: Multi-node PostgreSQL clusters (2-8 nodes typical); session-scoped history

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Implementation Notes |
|-----------|--------|----------------------|
| I. Component-First Architecture | ✅ PASS | OperationsModal as container component; OperationsList, ConfirmationPrompt, OperationHistory as presentational components; all built with Ink primitives |
| II. Type Safety | ✅ PASS | Full TypeScript strict mode; typed Operation, OperationResult, ConfirmationPrompt interfaces; typed pglogical query results; Zustand store fully typed |
| III. Real-Time Reactive State | ✅ PASS | Operation history and execution state in Zustand store; UI derives from store; no local state for shared operation data |
| IV. Keyboard-First UX | ✅ PASS | 'o' shortcut opens modal; j/k navigation in operation list; Enter to select; type-to-confirm for destructive ops; Escape to cancel |
| V. PostgreSQL Compatibility | ✅ PASS | pglogical functions for subscription management; graceful degradation when pglogical unavailable; parameterized queries; connection pooling via existing ConnectionManager |
| VI. Fail-Safe Operations | ✅ PASS | Type resource name to confirm destructive ops (FR-009); confirmation prompts with severity indicators (FR-010); clear error messaging (FR-011, FR-012); isolated node failures |
| VII. Complete Implementation | ✅ PASS | Full operation logic; all error paths handled; no TODOs/stubs; all edge cases addressed per spec |

## Project Structure

### Documentation (this feature)

```text
specs/013-operations-modal/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── operations.ts    # Operation type definitions and interfaces
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── modals/
│   │   └── OperationsModal.tsx       # Main operations modal container
│   └── operations/                   # NEW: Operations-specific components
│       ├── OperationsList.tsx        # List of available operations
│       ├── OperationConfirm.tsx      # Confirmation prompt component
│       ├── OperationHistory.tsx      # Session operation history view
│       ├── OperationResult.tsx       # Success/error result display
│       ├── PrometheusExport.tsx      # Metrics display for manual copy
│       └── TableSelector.tsx         # Table selection for resync
├── hooks/
│   └── useOperations.ts              # NEW: Operations state and execution
├── services/
│   ├── operations/                   # NEW: Operation execution services
│   │   ├── index.ts                  # OperationExecutor main entry
│   │   ├── subscription-ops.ts       # Pause/resume/resync operations
│   │   ├── slot-ops.ts               # Create/drop slot operations
│   │   ├── conflict-ops.ts           # Clear conflict log operations
│   │   └── prometheus.ts             # Metrics collection and formatting
│   └── connection-manager/           # EXISTING: Used for query execution
└── store/
    ├── types.ts                      # MODIFY: Add operation types
    └── operations.ts                 # NEW: Operations slice for Zustand
```

**Structure Decision**: Single TUI application structure following existing patterns. New components in `src/components/operations/`, new services in `src/services/operations/`, new Zustand slice in `src/store/operations.ts`. Follows established separation: container components for logic, presentational for rendering.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations - all gates pass.*

## Post-Design Constitution Re-Check

*Verified after Phase 1 design completion (2025-12-25)*

| Principle | Status | Design Validation |
|-----------|--------|-------------------|
| I. Component-First | ✅ CONFIRMED | data-model.md defines clear entity separation; contracts/operations.ts provides typed component props; quickstart.md shows UI component hierarchy |
| II. Type Safety | ✅ CONFIRMED | contracts/operations.ts exports 30+ typed interfaces including Operation, OperationResult, ConfirmationState; all props interfaces defined |
| III. Reactive State | ✅ CONFIRMED | OperationsSliceState/Actions defined for Zustand; useOperations hook return type specified; no local state for shared data |
| IV. Keyboard-First | ✅ CONFIRMED | quickstart.md documents full keyboard flow; j/k/Enter/Esc/Tab navigation; type-to-confirm for destructive actions |
| V. PostgreSQL Compat | ✅ CONFIRMED | research.md documents pglogical functions + native fallbacks; availability matrix defined; graceful degradation for native LR |
| VI. Fail-Safe | ✅ CONFIRMED | research.md defines severity levels and error categories; type-to-confirm for danger ops; remediation hints in OperationResult |
| VII. Complete Impl | ✅ CONFIRMED | All entities, state transitions, validation rules documented; no placeholders; implementation checklist in quickstart.md |

**Design Gate: PASSED** - Ready for `/speckit.tasks`
