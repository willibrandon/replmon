# Research: Keyboard Navigation

**Feature**: 007-keyboard-nav
**Date**: 2025-12-24

## Research Tasks

### 1. Ink useInput API for Arrow Keys

**Question**: How does Ink's useInput hook handle arrow keys?

**Finding**: Ink's `useInput` hook provides arrow key detection via the `key` object:
- `key.upArrow` - Up arrow pressed
- `key.downArrow` - Down arrow pressed
- `key.leftArrow` - Left arrow pressed
- `key.rightArrow` - Right arrow pressed

**Evidence**: From MainLayout.tsx:32-41, the existing pattern uses `useInput((input, key) => {...})` where:
- `input` is the character pressed (e.g., 'q', 't', 'j')
- `key` is an object with boolean properties for special keys (tab, escape, shift, upArrow, etc.)

**Decision**: Use `key.upArrow` and `key.downArrow` to trigger `selectPrevious()` and `selectNext()` respectively.

### 2. Existing State Actions for List Navigation

**Question**: What Zustand actions already exist for list navigation?

**Finding**: The UI slice (`src/store/ui.ts`) already implements:
- `selectNext()` - Moves selection down in current panel's list (lines 154-186)
- `selectPrevious()` - Moves selection up in current panel's list (lines 120-152)
- Both respect list boundaries (no wrap, stay at first/last item)
- Both select first/last item if nothing was selected

**Decision**: Reuse existing `selectNext()` and `selectPrevious()` actions for arrow keys.

### 3. Modal State Blocking Pattern

**Question**: How does the current implementation block shortcuts when modal is open?

**Finding**: MainLayout.tsx:33 shows the pattern:
```typescript
if (activeModal !== null) { if (key.escape) closeModal(); return; }
```
When a modal is open, only Escape is processed; all other input is ignored via early return.

**Decision**: The 'h' key for help must be added AFTER this modal check, along with existing shortcuts that should only work when no modal is open.

### 4. Help Modal Trigger Pattern

**Question**: How is the help modal currently opened?

**Finding**: MainLayout.tsx:40 shows:
```typescript
if (input === '?') { openModal({ type: 'help', title: 'Help' }); }
```

**Decision**: Add `input === 'h'` as an alternate trigger with identical behavior.

## Implementation Decisions

| Item | Decision | Rationale |
|------|----------|-----------|
| Arrow key bindings | `key.upArrow → selectPrevious()`, `key.downArrow → selectNext()` | Matches existing j/k behavior |
| 'h' key behavior | Opens help modal same as '?' | User expectation for help shortcut |
| Handler placement | Add arrow/h handlers after modal check, before panel shortcuts | Consistent with existing pattern |
| Testing approach | ink-testing-library with Zustand store mocks | Consistent with 005-state-management tests |

## Unknowns Resolved

All technical unknowns have been resolved through codebase analysis. No external research required.

## References

- `src/components/layout/MainLayout.tsx` - Central input handling
- `src/store/ui.ts` - selectNext/selectPrevious implementation
- `src/store/types.ts` - Panel type and PANEL_SHORTCUTS constant
- Ink documentation: useInput hook API
