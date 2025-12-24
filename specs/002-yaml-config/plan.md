# Implementation Plan: YAML Configuration System

**Branch**: `002-yaml-config` | **Date**: 2025-12-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-yaml-config/spec.md`

## Summary

Add comprehensive YAML configuration file support with multi-cluster definitions, environment variable interpolation for credentials, theme configuration, and replication threshold settings. The system will extend the existing `src/config/` infrastructure to support clusters (named node groups), default path loading (`~/.config/replmon/config.yaml`), and new configuration domains (theme, thresholds).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Runtime**: Bun 1.x (Node.js 18+ fallback)
**Primary Dependencies**: yaml 2.6.x, zod 3.24.x, meow 13.x, React 18.x, Ink 5.x, zustand 5.x
**Storage**: YAML files (no database)
**Testing**: Bun test (with ink-testing-library for components)
**Target Platform**: macOS/Linux terminals
**Project Type**: Single TUI application
**Performance Goals**: Config parsing < 50ms, startup with config < 200ms
**Constraints**: XDG-compliant paths, single startup config load (no live reload)
**Scale/Scope**: Configuration for 1-50 nodes across 1-10 clusters

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First Architecture | PASS | No UI changes in this feature; config loading is service layer |
| II. Type Safety (NON-NEGOTIABLE) | PASS | All config types defined with Zod schemas, strict TypeScript |
| III. Real-Time Reactive State | N/A | Config is read-once at startup per spec clarification |
| IV. Keyboard-First UX | N/A | No UI interaction in this feature |
| V. PostgreSQL Compatibility | PASS | Config defines nodes; connection semantics unchanged |
| VI. Fail-Safe Operations | PASS | Config errors displayed clearly, graceful fallback for missing default config |
| VII. Complete Implementation | WILL COMPLY | All requirements will be fully implemented, no stubs/TODOs |

**Gate Status**: PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/002-yaml-config/
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
├── config/
│   ├── loader.ts        # EXTEND: Add default path discovery, cluster loading
│   ├── parser.ts        # EXTEND: Add cluster selection, threshold/theme parsing
│   ├── schemas.ts       # EXTEND: Add cluster, theme, threshold schemas
│   ├── validator.ts     # EXTEND: Add cluster validation, node references
│   └── defaults.ts      # NEW: Default path resolution, default thresholds
├── types/
│   ├── yaml-config.ts   # EXTEND: Add clusters, theme, thresholds
│   ├── config.ts        # EXTEND: Add activeCluster, theme, thresholds
│   ├── cli.ts           # EXTEND: Add --cluster flag
│   └── theme.ts         # NEW: Theme type definitions
└── theme/
    └── index.ts         # NEW: Theme loading and application
```

**Structure Decision**: Single project structure maintained. Extensions to existing `src/config/` and `src/types/` directories. New `src/theme/` directory for theme-related code.

## Complexity Tracking

> **No Constitution violations requiring justification**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
