# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

replmon is a TUI application for monitoring PostgreSQL logical replication, with first-class support for pglogical bidirectional replication. Built with TypeScript, React, Ink, and Yoga (same stack as Claude Code).

## Technology Stack

- **Runtime**: Bun (preferred) or Node.js 18+
- **UI**: Ink 5.x + React 18.x (functional components only)
- **State**: Zustand with subscribeWithSelector middleware
- **Database**: pg + pg-pool (no ORMs)
- **CLI**: meow for argument parsing
- **Config**: YAML with environment variable interpolation

## Architecture

```
src/
├── components/
│   ├── atoms/          # StatusDot, Badge, ProgressBar, Spinner
│   ├── layout/         # Panel, Modal, SplitView, MainLayout
│   ├── panels/         # TopologyPanel, SubscriptionsPanel, SlotsPanel, ConflictsPanel
│   ├── charts/         # Sparkline, TopologyGraph
│   └── modals/         # OperationsModal, HelpModal
├── hooks/              # usePolling, useKeyboardNavigation, useSubscriptions
├── services/           # ConnectionManager, PollingService, queries
├── store/              # Zustand store (connection, replication, ui slices)
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
- **Keyboard shortcuts**: t/s/l/c/o/q for panel focus, Tab for cycling, j/k for lists
- **State**: `useStore` hook for all state access; selectors for derived data; devtools in dev mode
- **Stale handling**: Nodes marked stale on disconnect; data retained with visual indicator until reconnect

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

## Development Environment

- Multiple PostgreSQL instances (PG13-18) running locally via pgrx
- Active replication setup: PG18 primary (28818) + standby (28819)
- Homebrew PG18 on default port 5432
- User has extensive PostgreSQL/replication expertise - skip basic DB setup explanations

## Recent Changes
- 006-ui-framework: Added TypeScript 5.7 (strict mode) + React 18.3.x, Ink 5.0.x, Zustand 5.0.x (existing stack)
- 005-state-management: Implemented Zustand store with connection, replication, and UI slices. Replication slice tracks nodes, subscriptions, slots, conflicts, and lag history (60-sample FIFO). UI slice handles panel focus, modal state with focus preservation, and j/k list navigation. Includes 56 passing tests and memoized selectors for aggregations, filters, and computed values.
- 004-polling-service: Added PollingService with event-based data collection, configurable intervals (250ms min), per-node pglogical detection, partial results on node failure, and typed event subscriptions for stats/slots/subscriptions/conflicts
