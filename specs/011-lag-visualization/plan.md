# Implementation Plan: Lag Visualization

**Branch**: `011-lag-visualization` | **Date**: 2025-12-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-lag-visualization/spec.md`

## Summary

Add sparkline visualization to the subscription detail modal showing replication lag trends over a rolling 5-minute window (300 samples at 1-second intervals). Uses Unicode block characters (▁▂▃▄▅▆▇█) with linear scaling, time axis labels (-5m to now), and y-axis max indicator.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**: React 18.x, Ink 5.x, Zustand 5.x (existing stack)
**Storage**: In-memory Zustand store (existing `lagHistory` Map)
**Testing**: ink-testing-library for component tests
**Target Platform**: Terminal/CLI (macOS, Linux)
**Project Type**: Single (TUI application)
**Performance Goals**: 60 fps render, no flicker during 1-second polling updates
**Constraints**: Terminal width 40-200+ columns, ASCII/Unicode compatibility
**Scale/Scope**: 5-50 subscriptions typical, 300 samples per subscription

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First Architecture | ✅ PASS | Sparkline will be a reusable presentational component |
| II. Type Safety (NON-NEGOTIABLE) | ✅ PASS | Existing `LagSample` interface; new `SparklineProps` interface |
| III. Real-Time Reactive State | ✅ PASS | Existing `lagHistory` store; increase `MAX_LAG_HISTORY_SAMPLES` to 300 |
| IV. Keyboard-First UX | ✅ PASS | Sparkline displayed in existing modal (Enter key opens) |
| V. PostgreSQL Compatibility | ✅ PASS | Uses existing lag data collection; no new queries |
| VI. Fail-Safe Operations | ✅ PASS | Read-only visualization; no database mutations |
| VII. Complete Implementation | ✅ PASS | Single-session implementable; clear scope |

**Gate Result**: PASS - All principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/011-lag-visualization/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── charts/
│       └── Sparkline.tsx       # NEW: Sparkline component
├── hooks/
│   └── useSubscriptions.ts     # MODIFY: Add lagHistory to SubscriptionListItem
├── store/
│   └── types.ts                # MODIFY: MAX_LAG_HISTORY_SAMPLES = 300
└── components/
    └── layout/
        └── Modal.tsx           # MODIFY: Add Sparkline to SubscriptionDetailContent
```

**Structure Decision**: Single project structure. New `Sparkline.tsx` component in `src/components/charts/` (new directory). Minimal modifications to existing files.

## Complexity Tracking

> No violations - feature fits within existing architecture.

| Aspect | Complexity | Justification |
|--------|------------|---------------|
| New component | Low | Single file, ~100-150 lines |
| Store changes | Minimal | Only constant value change |
| Modal integration | Low | Add one component to existing content |

