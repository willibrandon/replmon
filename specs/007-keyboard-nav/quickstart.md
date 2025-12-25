# Quickstart: Keyboard Navigation

**Feature**: 007-keyboard-nav
**Date**: 2025-12-24

## Implementation Summary

This feature adds three missing keyboard bindings to the existing navigation system:
1. Arrow keys (↑/↓) for list navigation
2. 'h' key as alternate help modal trigger

## Files to Modify

### 1. MainLayout.tsx (Primary Change)

Location: `src/components/layout/MainLayout.tsx`

**Current code (lines 32-41)**:
```typescript
useInput((input, key) => {
  if (activeModal !== null) { if (key.escape) closeModal(); return; }
  if (input === 'q' || (key.ctrl && input === 'c')) { exitApp(0); return; }
  const targetPanel = PANEL_SHORTCUTS[input] as Panel | undefined;
  if (targetPanel) { setFocusedPanel(targetPanel); return; }
  if (key.tab) { key.shift ? focusPreviousPanel() : focusNextPanel(); return; }
  if (input === 'j') { selectNext(); return; }
  if (input === 'k') { selectPrevious(); return; }
  if (input === '?') { openModal({ type: 'help', title: 'Help' }); }
});
```

**Modified code**:
```typescript
useInput((input, key) => {
  if (activeModal !== null) { if (key.escape) closeModal(); return; }
  if (input === 'q' || (key.ctrl && input === 'c')) { exitApp(0); return; }
  const targetPanel = PANEL_SHORTCUTS[input] as Panel | undefined;
  if (targetPanel) { setFocusedPanel(targetPanel); return; }
  if (key.tab) { key.shift ? focusPreviousPanel() : focusNextPanel(); return; }
  if (input === 'j' || key.downArrow) { selectNext(); return; }
  if (input === 'k' || key.upArrow) { selectPrevious(); return; }
  if (input === '?' || input === 'h') { openModal({ type: 'help', title: 'Help' }); }
});
```

### 2. Modal.tsx (Update Help Display)

Location: `src/components/layout/Modal.tsx`

**Update help text** to show all available shortcuts including arrow keys and 'h':

```typescript
<Text><Text color={colors.secondary}>↑/k</Text>      Previous item</Text>
<Text><Text color={colors.secondary}>↓/j</Text>      Next item</Text>
<Text><Text color={colors.secondary}>h/?</Text>      Show this help</Text>
```

## Testing Strategy

### Unit Tests (tests/unit/keyboard.test.ts)

Test cases needed:
1. ↑ arrow moves selection up
2. ↓ arrow moves selection down
3. 'h' key opens help modal
4. Arrow keys ignored when modal is open
5. 'h' key ignored when modal is open

### Manual Testing

1. Start application: `bun run src/index.ts --config config.yaml`
2. Navigate to a panel with items (e.g., Topology with multiple nodes)
3. Press ↓ - selection should move down
4. Press ↑ - selection should move up
5. Press h - help modal should open
6. Press ↓ while modal open - should have no effect
7. Press Esc - modal closes, previous panel focus restored

## Verification Checklist

- [ ] Arrow keys navigate list items
- [ ] 'h' opens help modal
- [ ] Arrow keys blocked when modal open
- [ ] 'h' blocked when modal open
- [ ] Help modal shows updated shortcuts (h/? and ↑/↓)
- [ ] All existing shortcuts still work (regression test)
