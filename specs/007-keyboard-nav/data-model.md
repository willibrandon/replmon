# Data Model: Keyboard Navigation

**Feature**: 007-keyboard-nav
**Date**: 2025-12-24

## Overview

This feature is UI-only and uses the existing data model from 005-state-management. No new entities or state shapes are introduced.

## Existing Entities (No Changes)

### Focus State

Managed by UISliceState in `src/store/types.ts`:

```typescript
interface UISliceState {
  focusedPanel: Panel;                    // Currently focused panel
  previousFocusedPanel: Panel | null;     // Saved for modal restoration
  activeModal: ModalType | null;          // Currently open modal
  modalData: ModalConfig | null;          // Modal configuration
  selections: Map<Panel, string | null>;  // Selected item per panel
}
```

### Panel Type

```typescript
type Panel = 'topology' | 'subscriptions' | 'slots' | 'conflicts' | 'operations';
```

### Modal Type

```typescript
type ModalType = 'help' | 'operations' | 'confirmation' | 'details';
```

## Existing Actions (No Changes)

These actions are already implemented and will be reused:

| Action | Trigger | Behavior |
|--------|---------|----------|
| `setFocusedPanel(panel)` | t/s/l/c/o keys | Direct panel access |
| `focusNextPanel()` | Tab | Cycle forward through panels |
| `focusPreviousPanel()` | Shift+Tab | Cycle backward through panels |
| `selectNext()` | j, ↓ (to add) | Move selection down in list |
| `selectPrevious()` | k, ↑ (to add) | Move selection up in list |
| `openModal(config)` | ?, h (to add) | Open modal, save focus |
| `closeModal()` | Escape | Close modal, restore focus |

## Key Mappings

### Current Implementation

| Key | Action | Scope |
|-----|--------|-------|
| t | Focus Topology | No modal |
| s | Focus Subscriptions | No modal |
| l | Focus Slots | No modal |
| c | Focus Conflicts | No modal |
| o | Focus Operations | No modal |
| Tab | Next panel | No modal |
| Shift+Tab | Previous panel | No modal |
| j | Selection down | No modal |
| k | Selection up | No modal |
| ? | Open help | No modal |
| q | Quit | No modal |
| Esc | Close modal | Modal open |

### To Add

| Key | Action | Scope |
|-----|--------|-------|
| ↓ | Selection down | No modal |
| ↑ | Selection up | No modal |
| h | Open help | No modal |

## State Transitions

```
                    ┌──────────────┐
                    │  No Modal    │
                    │  (normal)    │
                    └──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   t/s/l/c/o           Tab/S-Tab          j/k/↑/↓
   Direct focus        Cycle panel       List nav
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                      h or ?
                           │
                           ▼
                    ┌──────────────┐
                    │  Modal Open  │
                    │  (help)      │
                    └──────────────┘
                           │
                         Esc
                           │
                           ▼
                    ┌──────────────┐
                    │  No Modal    │
                    │  (restored)  │
                    └──────────────┘
```

## Contracts

No external APIs or contracts. This feature operates entirely within the React component tree using existing Zustand store patterns.
