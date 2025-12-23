<!--
Sync Impact Report
==================
Version change: 0.0.0 → 1.0.0 (initial ratification)
Added principles:
  - I. Component-First Architecture
  - II. Type Safety (NON-NEGOTIABLE)
  - III. Real-Time Reactive State
  - IV. Keyboard-First UX
  - V. PostgreSQL Compatibility
  - VI. Fail-Safe Operations
Added sections:
  - Technology Constraints
  - Development Workflow
  - Governance
Templates reviewed:
  ✅ plan-template.md - Constitution Check section compatible
  ✅ spec-template.md - Requirements structure compatible
  ✅ tasks-template.md - Phase structure aligns with workflow
Follow-up TODOs: None
-->

# replmon Constitution

## Core Principles

### I. Component-First Architecture

React components are the atomic unit of UI. Every visual element MUST be a composable, reusable component.

- Container components handle data fetching and business logic
- Presentational components handle rendering only
- No inline styles or ad-hoc DOM manipulation
- All UI built with Ink primitives (Box, Text, etc.)

### II. Type Safety (NON-NEGOTIABLE)

TypeScript strict mode is mandatory. Type violations block merges.

- No `any` types except at FFI boundaries with explicit justification comment
- All PostgreSQL query results MUST have typed interfaces
- Zustand stores MUST be fully typed with generics
- Runtime validation MUST occur at system boundaries (config parsing, database responses)

### III. Real-Time Reactive State

Polling-based live updates are the default behavior.

- Default polling interval: 1 second
- All UI MUST derive from Zustand store—no local component state for shared data
- State changes trigger re-renders automatically via Zustand subscriptions
- Lag history MUST maintain rolling 5-minute window (300 samples at 1s intervals)

### IV. Keyboard-First UX

Full application functionality MUST be accessible via keyboard alone.

- Tab/Shift+Tab for panel navigation
- Single-key shortcuts for common actions: t (topology), s (subscriptions), l (lag), c (conflicts), o (operations), q (quit)
- Vim-style j/k navigation in lists
- Mouse support is optional enhancement, never required

### V. PostgreSQL Compatibility

Support both native logical replication (PostgreSQL 10+) and pglogical extension.

- Graceful degradation when pglogical is not installed
- Queries MUST handle PostgreSQL version differences
- Connection pooling is mandatory for multi-node setups
- All queries MUST be parameterized to prevent SQL injection

### VI. Fail-Safe Operations

Destructive operations require explicit user confirmation.

- Dangerous operations (drop slot, clear conflicts) MUST show confirmation dialog
- Read operations MUST NOT modify database state
- Connection failures MUST be isolated per-node—one unhealthy node does not crash the app
- All errors MUST be surfaced in UI, never swallowed silently

## Technology Constraints

| Category | Requirement |
|----------|-------------|
| Runtime | Node.js 18+ or Bun |
| UI Framework | Ink 5.x + React 18.x (functional components only) |
| Layout | Yoga flexbox via Ink |
| State | Zustand with subscribeWithSelector middleware |
| Database | pg + pg-pool (no ORMs) |
| Config | YAML with environment variable interpolation |
| CLI | meow for argument parsing |
| Build | Bun preferred; fallback to tsc + esbuild |

## Development Workflow

- Phase-based implementation: Foundation → UI Core → Panels → Advanced
- Each feature spec MUST be independently buildable and testable
- Integration tests MUST cover ConnectionManager and PollingService
- Component tests use ink-testing-library
- Manual QA against real PostgreSQL cluster required before release

## Governance

- This constitution supersedes ad-hoc decisions
- Amendments require updating docs/design.md and all affected specs
- Version follows semver: breaking principle changes = major bump
- All PRs MUST cite which principles apply to changes

**Version**: 1.0.0 | **Ratified**: 2025-12-23 | **Last Amended**: 2025-12-23
