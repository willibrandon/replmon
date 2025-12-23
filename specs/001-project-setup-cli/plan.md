# Implementation Plan: Project Setup & CLI

**Branch**: `001-project-setup-cli` | **Date**: 2025-12-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-project-setup-cli/spec.md`

## Summary

Initialize replmon as a Bun/TypeScript project with React/Ink TUI framework. Create CLI entry point using meow for argument parsing with support for YAML config files, inline PostgreSQL connection flags, and pglogical mode toggle. On startup, display a connection status screen before transitioning to the main dashboard.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) on Bun 1.x (Node.js 18+ fallback)
**Primary Dependencies**: React 18.x, Ink 5.x, meow 13.x, js-yaml, Zustand
**Storage**: YAML configuration files (no database for this feature)
**Testing**: bun test (Bun's built-in test runner), ink-testing-library for components
**Target Platform**: macOS, Linux terminal (xterm-256color compatible)
**Project Type**: Single project (TUI application)
**Performance Goals**: Application startup under 2 seconds (excluding network connection time)
**Constraints**: Must support both Bun and Node.js 18+ runtimes
**Scale/Scope**: Single TUI application, ~10 source files for this feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Check

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Component-First | All UI via Ink components | ✅ Pass | ConnectionStatus, Dashboard, StatusBar components planned |
| II. Type Safety | TypeScript strict mode, typed interfaces | ✅ Pass | Config, Connection, CLIArgs interfaces defined |
| III. Reactive State | Zustand store for shared state | ✅ Pass | Connection state in store, UI subscribes |
| IV. Keyboard-First | Full keyboard navigation | ✅ Pass | r=retry, q=quit on connection screen |
| V. PostgreSQL Compat | Graceful pglogical degradation | ✅ Pass | FR-003 pglogical flag, graceful fallback in spec |
| VI. Fail-Safe | Errors surfaced, per-node isolation | ✅ Pass | Per-node connection state, error display |
| VII. Complete Implementation | No TODOs, full error handling | ✅ Pass | All edge cases in spec addressed |

**Gate Result**: PASS - Proceed to Phase 0

### Post-Phase 1 Check (Design Validation)

| Principle | Design Artifact | Status | Verification |
|-----------|-----------------|--------|--------------|
| I. Component-First | data-model.md | ✅ Pass | App, ConnectionStatus, Dashboard, StatusBar components defined |
| II. Type Safety | data-model.md | ✅ Pass | Full TypeScript interfaces with Zod validation schemas |
| III. Reactive State | data-model.md | ✅ Pass | ConnectionStore with subscribeWithSelector, typed actions |
| IV. Keyboard-First | contracts/cli-interface.md | ✅ Pass | r=retry, q=quit documented in CLI contract |
| V. PostgreSQL Compat | contracts/config-file-format.md | ✅ Pass | Multi-node config, pglogical flag supported |
| VI. Fail-Safe | data-model.md | ✅ Pass | Per-node status tracking, error isolation in store |
| VII. Complete Implementation | All artifacts | ✅ Pass | No placeholders, all validation rules specified |

**Post-Design Gate Result**: PASS - Ready for `/speckit.tasks`

## Project Structure

### Documentation (this feature)

```text
specs/001-project-setup-cli/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── index.tsx            # CLI entry point with meow
├── types/
│   ├── config.ts        # Configuration interfaces
│   └── connection.ts    # Connection interfaces
├── config/
│   ├── loader.ts        # YAML config file loader
│   ├── parser.ts        # CLI args + config merging
│   └── validator.ts     # Configuration validation
├── components/
│   ├── App.tsx          # Root application component
│   ├── ConnectionStatus.tsx  # Connection status screen
│   ├── Dashboard.tsx    # Main dashboard layout
│   └── StatusBar.tsx    # Bottom status bar
└── store/
    └── connection.ts    # Zustand connection store
```

**Structure Decision**: Single project structure following the CLAUDE.md architecture. Components organized by purpose (atoms/layout/panels pattern will be introduced in later features as more UI is added).

## Complexity Tracking

> No violations to justify - design follows constitution principles.
