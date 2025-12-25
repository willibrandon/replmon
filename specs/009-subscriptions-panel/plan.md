# Implementation Plan: Subscriptions Panel

**Branch**: `009-subscriptions-panel` | **Date**: 2025-12-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-subscriptions-panel/spec.md`

## Summary

Implement a Subscriptions Panel component that displays a consolidated, scrollable list of all PostgreSQL logical replication subscriptions across connected nodes. Each subscription shows status indicators (replicating/catchup/down/disabled), lag metrics (bytes and time), and LSN positions. The panel supports keyboard navigation (j/k) for selection and opens a detail modal on Enter. Integrates with existing Zustand store and follows established patterns from TopologyPanel.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**: React 18.3.x, Ink 5.0.x, Zustand 5.x (existing stack)
**Storage**: N/A (UI-only feature, reads from existing Zustand store)
**Testing**: bun test with ink-testing-library, Vitest patterns
**Target Platform**: Terminal (POSIX + Windows Terminal)
**Project Type**: single
**Performance Goals**: Panel updates within 500ms of new polling data; list handles 20+ subscriptions smoothly
**Constraints**: Usable on terminals as narrow as 80 columns; no external dependencies beyond existing stack
**Scale/Scope**: Typical clusters with 1-20 subscriptions across 1-10 nodes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First | ✅ PASS | SubscriptionsPanel as container; SubscriptionRow, SubscriptionDetailModal as presentational |
| II. Type Safety | ✅ PASS | All types exist in store/types.ts (SubscriptionData, LagSample); new component props will be typed |
| III. Reactive State | ✅ PASS | Derives from existing `subscriptions`, `lagHistory`, `staleNodes` Maps in Zustand store |
| IV. Keyboard-First | ✅ PASS | j/k navigation, Enter for details, Escape to close modal - following TopologyPanel pattern |
| V. PostgreSQL Compatibility | ✅ PASS | Uses existing SubscriptionData which already handles native vs pglogical sources |
| VI. Fail-Safe | ✅ PASS | Read-only panel; no destructive operations; errors surfaced via status indicators |
| VII. Complete Implementation | ✅ PASS | Spec defines all acceptance criteria; component pattern well-established |

**Gate Status**: PASS - No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/009-subscriptions-panel/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── atoms/
│   │   └── StatusDot.tsx          # Existing - reuse for status indicators
│   ├── layout/
│   │   └── Modal.tsx              # Existing - reuse for detail modal
│   └── panels/
│       └── SubscriptionsPanel.tsx # NEW - main panel component
├── hooks/
│   └── useSubscriptions.ts        # NEW - subscription data aggregation hook
└── store/
    └── selectors/              # Uses existing selectors

tests/
└── unit/
    └── components/panels/
        └── SubscriptionsPanel.test.tsx  # NEW - component tests
```

**Structure Decision**: Single project structure following existing patterns. New files are minimal:
- 1 panel component (SubscriptionsPanel.tsx)
- 1 custom hook (useSubscriptions.ts)
- 1 selector file (subscriptions.ts)
- 1 test file (SubscriptionsPanel.test.tsx)

## Complexity Tracking

> No violations - table not required.

## Post-Design Constitution Check

*Re-evaluation after Phase 1 design completion.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First | ✅ PASS | Design confirms: SubscriptionsPanel (container) + internal SubscriptionRow (presentational). No inline styles. |
| II. Type Safety | ✅ PASS | Contracts define all new types: `SubscriptionListItem`, `UseSubscriptionsResult`, component props. No `any` types. |
| III. Reactive State | ✅ PASS | `useSubscriptions` hook derives from store via `useMemo`. No local state for shared data. |
| IV. Keyboard-First | ✅ PASS | j/k navigation via existing store actions. Enter opens modal. Escape closes. Mouse not required. |
| V. PostgreSQL Compatibility | ✅ PASS | Handles both native and pglogical sources with appropriate badges. Graceful degradation for missing data. |
| VI. Fail-Safe | ✅ PASS | Read-only panel. All edge cases addressed: empty state, stale nodes, null lag values, unknown status. |
| VII. Complete Implementation | ✅ PASS | All acceptance scenarios mappable to implementation. No TODOs or placeholders in design. |

**Final Gate Status**: PASS - Ready for `/speckit.tasks`

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| research.md | `specs/009-subscriptions-panel/research.md` | Research findings and decisions |
| data-model.md | `specs/009-subscriptions-panel/data-model.md` | Entity definitions and relationships |
| contracts/ | `specs/009-subscriptions-panel/contracts/` | TypeScript interface contracts |
| quickstart.md | `specs/009-subscriptions-panel/quickstart.md` | Implementation guide |
| CLAUDE.md | Updated | Agent context updated with feature tech |
