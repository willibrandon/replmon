# Implementation Plan: UI Framework & Layout

**Branch**: `006-ui-framework` | **Date**: 2025-12-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-ui-framework/spec.md`

## Summary

Build a responsive UI framework for replmon using Ink/Yoga flexbox with:
- MainLayout component organizing Header, panel grid, and Footer
- Panel, Modal, SplitView layout primitives with focus state integration
- StatusDot, Badge, ProgressBar, Spinner atom components
- Theme system with ThemeProvider, useTheme hook, and dark/light themes
- Responsive breakpoints (standard ≥100x30, narrow <100 cols, short <30 rows)
- Terminal size detection with debounced resize handling

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**: React 18.3.x, Ink 5.0.x, Zustand 5.0.x (existing stack)
**Storage**: N/A (UI-only feature, uses existing Zustand store)
**Testing**: Bun test + ink-testing-library (existing test framework)
**Target Platform**: Node.js 18+ / Bun 1.x terminal
**Project Type**: Single TUI application
**Performance Goals**: <100ms layout transition on resize, no perceptible flicker
**Constraints**: Must work in terminals ≥40x10, debounce resize ≤100ms
**Scale/Scope**: 10 new components (4 atoms, 5 layout, 1 provider), 3 hooks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component-First Architecture | ✅ PASS | All UI built as composable React/Ink components; atoms for primitives, layout for containers |
| II. Type Safety (NON-NEGOTIABLE) | ✅ PASS | Full TypeScript strict mode; Panel, ModalType, ThemeColors interfaces already defined |
| III. Real-Time Reactive State | ✅ PASS | UI derives from Zustand store (focusedPanel, activeModal); no local state for shared data |
| IV. Keyboard-First UX | ✅ PASS | Full keyboard navigation preserved; t/s/l/c/o/Tab shortcuts integrated with new layout |
| V. PostgreSQL Compatibility | ✅ PASS | N/A for UI feature (no database interaction) |
| VI. Fail-Safe Operations | ✅ PASS | N/A for UI feature (read-only display components) |
| VII. Complete Implementation | ✅ PASS | All components fully implemented; no TODOs/stubs; existing StatusBar merged into Footer |

**Gate Status**: ✅ PASS - All applicable principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/006-ui-framework/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (component interfaces)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── atoms/                    # NEW: Small, reusable UI primitives
│   │   ├── StatusDot.tsx         # Colored status indicator (●/◐/○)
│   │   ├── Badge.tsx             # Styled label component
│   │   ├── ProgressBar.tsx       # Visual progress indicator
│   │   ├── Spinner.tsx           # Animated loading indicator
│   │   └── index.ts              # Barrel export
│   ├── layout/                   # NEW: Layout container components
│   │   ├── MainLayout.tsx        # Root layout with Header/Footer
│   │   ├── Panel.tsx             # Bordered panel with focus state
│   │   ├── Modal.tsx             # Centered overlay dialog
│   │   ├── SplitView.tsx         # Dual-pane split layout
│   │   ├── Header.tsx            # Application header bar
│   │   ├── Footer.tsx            # Status bar with shortcuts
│   │   └── index.ts              # Barrel export
│   ├── panels/                   # NEW: Domain-specific panel content
│   │   ├── TopologyPanel.tsx     # Extracted from Dashboard.tsx
│   │   └── index.ts              # Barrel export
│   ├── App.tsx                   # MODIFY: Wrap with ThemeProvider
│   ├── Dashboard.tsx             # MODIFY: Use MainLayout instead of Box
│   ├── ConnectionStatus.tsx      # KEEP: No changes required
│   └── StatusBar.tsx             # DELETE: Merge into Footer
├── hooks/
│   ├── useTheme.ts               # NEW: Theme context consumer hook
│   ├── useTerminalSize.ts        # NEW: Terminal dimensions with resize
│   └── useBreakpoint.ts          # NEW: Responsive breakpoint detection
├── theme/                        # NEW: Theme system
│   ├── ThemeProvider.tsx         # React context provider
│   ├── ThemeContext.ts           # Context definition
│   └── index.ts                  # Barrel export
├── store/                        # KEEP: Existing Zustand store
│   ├── ui.ts                     # Existing UI slice (focusedPanel, activeModal)
│   └── types.ts                  # Existing types (Panel, ModalType, ModalConfig)
└── config/
    └── defaults.ts               # KEEP: Existing ThemeColors, ResolvedTheme
```

**Structure Decision**: Single TUI application. New components organized into `atoms/`, `layout/`, `panels/` directories under `src/components/`. Theme system in dedicated `src/theme/` directory. Responsive hooks in `src/hooks/`.

## Complexity Tracking

No constitution violations. All principles satisfied without justification needed.
