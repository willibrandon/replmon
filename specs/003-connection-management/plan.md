# Implementation Plan: Connection Management

**Branch**: `003-connection-management` | **Date**: 2025-12-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-connection-management/spec.md`

## Summary

Implement a ConnectionManager class that manages pg-pool connections to multiple PostgreSQL nodes. The system provides health tracking with exponential backoff retry, parallel query execution across nodes with partial failure handling, dynamic node addition/removal at runtime, and graceful shutdown with in-flight query draining.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**: pg (^8.x), pg-pool (^3.x), existing Zustand store, existing YAML config system (002-yaml-config)
**Storage**: PostgreSQL 10+ (external nodes being monitored)
**Testing**: Bun test (unit), ink-testing-library (components)
**Target Platform**: Node.js 18+ / Bun 1.x (cross-platform CLI)
**Project Type**: single (TUI application)
**Performance Goals**:
- Parallel queries across 10 nodes < 2x single node time (SC-003)
- Health detection within 2s of node failure (SC-002)
- Startup connection < 5s for all nodes (SC-001)
**Constraints**:
- Max 20+ nodes without degradation (SC-007)
- Graceful shutdown < 10s (SC-005)
- Zero connection leaks (SC-006)
**Scale/Scope**: 1-20+ PostgreSQL nodes per cluster

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First Architecture | PASS | ConnectionManager is a service, not UI; will emit events for components to consume |
| II. Type Safety (NON-NEGOTIABLE) | PASS | All entities will be fully typed; pg query results will have typed interfaces |
| III. Real-Time Reactive State | PASS | Health status and pool stats will update Zustand store for UI subscription |
| IV. Keyboard-First UX | N/A | Service layer, no direct UI |
| V. PostgreSQL Compatibility | PASS | Using pg + pg-pool as required; parameterized queries |
| VI. Fail-Safe Operations | PASS | Connection failures isolated per-node; errors surfaced via events |
| VII. Complete Implementation (NON-NEGOTIABLE) | PASS | No stubs; full implementation required |

**Gate Result**: PASS - All applicable principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/003-connection-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (TypeScript interfaces)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── services/
│   └── connection-manager/
│       ├── index.ts              # ConnectionManager class
│       ├── types.ts              # Node, HealthStatus, QueryResult types
│       ├── health-checker.ts     # Health check loop with retry logic
│       ├── parallel-query.ts     # Parallel query executor
│       └── pool-factory.ts       # pg-pool creation with config
├── types/
│   └── connection.ts             # Extended with SSL options (existing file)
└── store/
    └── connection.ts             # Extended for health/pool stats (existing file)

tests/
└── services/
    └── connection-manager/
        ├── connection-manager.test.ts
        ├── health-checker.test.ts
        └── parallel-query.test.ts
```

**Structure Decision**: Single project structure. ConnectionManager is a new service module under `src/services/`. Extends existing types and store. Tests co-located with services in `tests/services/` mirror.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
