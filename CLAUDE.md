# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

replmon is a TUI application for monitoring PostgreSQL logical replication, with first-class support for pglogical bidirectional replication. Built with TypeScript, React, Ink, and Yoga (same stack as Claude Code).

## Technology Stack

- **Runtime**: Bun (preferred) or Node.js 18+
- **UI**: Ink 5.x + React 18.x (functional components only) + fullscreen-ink for alternate screen buffer
- **State**: Zustand with subscribeWithSelector middleware
- **Database**: pg + pg-pool (no ORMs)
- **CLI**: meow for argument parsing
- **Config**: YAML with environment variable interpolation

## Architecture

```
src/
├── components/
│   ├── atoms/          # StatusDot, Badge, ProgressBar, Spinner, ConflictTypeBadge, ResolutionBadge, SourceBadge
│   ├── layout/         # Panel, Modal, SplitView, MainLayout
│   ├── panels/         # TopologyPanel, SubscriptionsPanel, SlotsPanel, ConflictsPanel
│   ├── topology/       # TopologyNode, ConnectionLine, TopologyRow, TopologyLayout
│   ├── charts/         # Sparkline, TopologyGraph
│   ├── modals/         # OperationsModal, HelpModal
│   └── operations/     # OperationsList, OperationConfirm, OperationResult, OperationHistory, TableSelector, PrometheusExport, SlotNameInput
├── hooks/              # useTheme, useTerminalSize, useBreakpoint, usePolling, useTopology, useTopologyLayout, useSubscriptions, useSlots, useConflicts, useOperations
├── services/           # ConnectionManager, PollingService, queries, operations (subscription-ops, slot-ops, conflict-ops, prometheus)
├── store/              # Zustand store (connection, replication, ui, operations slices)
│   └── selectors/      # Aggregation, filter, and computed selectors
├── theme/              # Color schemes and theming
└── types/              # TypeScript interfaces
```

## Constitution (Non-Negotiable Rules)

1. **Type Safety**: TypeScript strict mode. No `any` types except at FFI boundaries with justification.
2. **Component-First**: Container components for logic, presentational for rendering. No inline styles.
3. **Reactive State**: All UI derives from Zustand store. No local state for shared data.
4. **Keyboard-First**: Full functionality via keyboard. Mouse optional.
5. **PostgreSQL Compatibility**: Support native replication (v10+) and pglogical. Graceful degradation.
6. **Fail-Safe**: Dangerous ops require confirmation. Errors surfaced, never swallowed.
7. **Complete Implementation**: Every task produces working, runnable code. No TODOs, placeholders, stubs, or partial implementations. All error paths handled, all edge cases addressed, code compiles/runs without modification.

## Speckit Workflow

Use `/speckit.*` commands for feature development:
- `/speckit.specify` - Create feature specification
- `/speckit.plan` - Generate implementation plan
- `/speckit.tasks` - Generate task list
- `/speckit.implement` - Execute implementation

Feature prompts are in `docs/features/`. Implementation order in `docs/features/IMPLEMENTATION_ORDER.md`.

## Key Patterns

- **Polling**: PollingService emits data events at 1s intervals; components subscribe via Zustand
- **Multi-node**: ConnectionManager maintains pg-pool per node; queries run in parallel
- **Keyboard shortcuts**: t/s/l/c/o/q for panel focus, Tab for cycling, j/k for lists, ? for help
- **State**: `useStore` hook for all state access; selectors for derived data; devtools in dev mode
- **Stale handling**: Nodes marked stale on disconnect; data retained with visual indicator until reconnect
- **Theming**: ThemeProvider wraps app; useTheme() hook returns current colors; dark/light/custom themes
- **Responsive**: useBreakpoint() returns standard/narrow/short/compact; layout adapts automatically
- **Layout**: MainLayout contains Header/Footer; Panel components read focus from store; Modal overlays block navigation
- **Topology**: useTopology hook derives edges from pglogical subscriptions; auto-discovers relationships via provider DSN parsing; TopologyLayout handles responsive node arrangement

## Active Technologies
- TypeScript 5.x (strict mode) on Bun 1.x (Node.js 18+ fallback) + React 18.x, Ink 5.x, meow 13.x, js-yaml, Zustand (001-project-setup-cli)
- YAML configuration files (no database for this feature) (001-project-setup-cli)
- TypeScript 5.7 (strict mode) + yaml 2.6.x, zod 3.24.x, meow 13.x, React 18.x, Ink 5.x, zustand 5.x (002-yaml-config)
- YAML files (no database) (002-yaml-config)
- TypeScript 5.7 (strict mode) + pg (^8.x), pg-pool (^3.x), existing Zustand store, existing YAML config system (002-yaml-config) (003-connection-management)
- PostgreSQL 10+ (external nodes being monitored) (003-connection-management)
- TypeScript 5.7 (strict mode) + Node.js EventEmitter, ConnectionManager (003-connection-management), pg (^8.x) (004-polling-service)
- N/A (queries PostgreSQL nodes via ConnectionManager, no local storage) (004-polling-service)
- TypeScript 5.7 (strict mode) + Zustand 5.x (with subscribeWithSelector + devtools middleware), React 18.x, Ink 5.x (005-state-management)
- In-memory Zustand store (no persistence required) (005-state-management)
- TypeScript 5.7 (strict mode) + React 18.3.x, Ink 5.0.x, Zustand 5.0.x (existing stack) (006-ui-framework)
- N/A (UI-only feature, uses existing Zustand store) (006-ui-framework)
- TypeScript 5.7 (strict mode) + React 18.x, Ink 5.x, Zustand 5.x (existing stack) (007-keyboard-nav)
- TypeScript 5.7 (strict mode) + React 18.3.x, Ink 5.0.x, Zustand 5.x (existing stack) (008-topology-panel)
- N/A (UI-only feature, reads from existing Zustand store) (008-topology-panel)
- N/A (reads from existing Zustand store, populated by PollingService) (010-slots-panel)
- In-memory Zustand store (existing `lagHistory` Map) (011-lag-visualization)
- TypeScript 5.7 (strict mode) + React 18.3.x, Ink 5.0.x, Zustand 5.x, pg (^8.x), pg-pool (^3.x) (012-conflicts-panel)
- N/A (queries PostgreSQL nodes via ConnectionManager; optional log file access) (012-conflicts-panel)
- In-memory only (operation history lost on exit); queries PostgreSQL nodes via ConnectionManager (013-operations-modal)

## Development Environment

- Multiple PostgreSQL instances (PG13-18) running locally via pgrx
- Active replication setup: PG18 primary (28818) + standby (28819)
- Homebrew PG18 on default port 5432
- User has extensive PostgreSQL/replication expertise - skip basic DB setup explanations

## Recent Changes
- 013-operations-modal: Implemented OperationsModal with full DBA operations support. Press 'o' to open operations modal. Supports: Pause/Resume subscriptions (pglogical + native), Resync table (pglogical only with type-to-confirm), Create/Drop replication slots (with active slot check), Clear conflict history (pglogical only), Export Prometheus metrics. Features confirmation dialogs (simple and type-to-confirm), operation history tab, severity color coding, disconnected node detection, and 30s timeout handling. Components: OperationsModal, OperationsList, OperationConfirm, OperationResult, OperationHistory, TableSelector, PrometheusExport, SlotNameInput. Services: subscription-ops, slot-ops, conflict-ops, prometheus metrics collection.
- 012-conflicts-panel: Implemented ConflictsPanel with useConflicts hook. Queries pglogical.conflict_history table (pglogical 2.5.0+) with fallback to PostgreSQL csvlog parsing. Shows conflict type badges (INSERT/UPDATE/DELETE), resolution badges (REMOTE/LOCAL/SKIP), source badges (HISTORY/LOG/N/A), affected tables, timestamps, and node names. Detail modal displays local/remote tuple data for debugging. Incremental log parsing with position persistence in ~/.replmon/log-positions.json. Auto-detects best available source per node.
- 011-lag-visualization: Implemented Sparkline component with Unicode block characters (▁▂▃▄▅▆▇█) for lag trend visualization. Added to subscription detail modals via lagHistory in useSubscriptions. 5-minute rolling window (300 samples). Linear scaling with dynamic max indicator and time axis labels. Refactored PollingService to emit unified 'data' event for cross-node lag calculation. Added origins query for pg_replication_origin_status. Includes generate-lag.sh test script.
