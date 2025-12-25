# Quickstart: Replication Slots Panel

**Feature**: 010-slots-panel
**Date**: 2025-12-24

## Overview

This feature adds a SlotsPanel component to display replication slots with:
- Active/inactive status indicators (StatusDot)
- WAL retention progress bars with severity coloring
- WAL status badges (reserved/extended/unreserved/lost)
- Summary header with totals
- Keyboard navigation (j/k) and detail modal (Enter)

## File Structure

```
src/
├── components/
│   ├── atoms/
│   │   └── ProgressBar.tsx       # MODIFY: Add color prop
│   ├── panels/
│   │   ├── SlotsPanel.tsx        # NEW
│   │   ├── SlotsPanel.test.tsx   # NEW
│   │   └── index.ts              # MODIFY: Export SlotsPanel
│   └── layout/
│       └── Modal.tsx             # MODIFY: Add SlotDetailContent
└── hooks/
    ├── useSlots.ts               # NEW
    └── useSlots.test.ts          # NEW
```

## Implementation Sequence

### Phase 1: Core Hook

1. **Create `useSlots.ts`**
   - Import store selectors (slots, nodes, staleNodes, selections)
   - Import thresholds from config
   - Implement severity calculation functions
   - Return UseSlotsResult with enriched items

### Phase 2: Extend ProgressBar

2. **Modify `ProgressBar.tsx`**
   - Add optional `color?: string` prop
   - Use `color ?? colors.primary` for filled portion
   - No changes to existing behavior when color not provided

### Phase 3: Panel Component

3. **Create `SlotsPanel.tsx`**
   - Import useSlots hook, atoms, theme
   - Implement EmptyState subcomponent
   - Implement SlotRow subcomponent with progress bar
   - Implement summary header with badges
   - Export SlotsPanel and SlotsPanelProps

4. **Update `panels/index.ts`**
   - Add export for SlotsPanel

### Phase 4: Modal Integration

5. **Modify `Modal.tsx`**
   - Add SlotDetailContent component
   - Add type guard for slot data in renderContent
   - Display all slot fields in modal

### Phase 5: Testing

6. **Create `useSlots.test.ts`**
   - Test empty state
   - Test severity calculations
   - Test sorting
   - Test stale handling

7. **Create `SlotsPanel.test.tsx`**
   - Test empty state rendering
   - Test slot row rendering
   - Test selection highlighting
   - Test summary badges

## Key Patterns to Follow

### From SubscriptionsPanel

```typescript
// Hook pattern
export function useSlots(): UseSlotsResult {
  const slots = useStore((s) => s.slots);
  const nodes = useStore((s) => s.nodes);
  const staleNodes = useStore((s) => s.staleNodes);
  const selections = useStore((s) => s.selections);

  return useMemo(() => {
    const items: SlotListItem[] = [];
    const selectedId = selections.get('slots') ?? null;
    // ... aggregate and enrich
    return { items, selectedItem, count, ... };
  }, [slots, nodes, staleNodes, selections]);
}
```

### Severity Color Mapping

```typescript
function getSeverityColor(severity: 'healthy' | 'warning' | 'critical'): string {
  const colors = useTheme();
  switch (severity) {
    case 'healthy': return colors.success;
    case 'warning': return colors.warning;
    case 'critical': return colors.critical;
  }
}
```

### Row Layout

```tsx
<Box paddingX={1}>
  <Box width={2}>{/* Selection indicator */}</Box>
  <Box width={3}>{/* StatusDot */}</Box>
  <Box width={18}>{/* Slot name */}</Box>
  <Box width={16}>{/* Node name */}</Box>
  <Box width={10}>{/* Type badge */}</Box>
  <Box width={20}>{/* ProgressBar */}</Box>
  <Box width={10}>{/* Retention */}</Box>
  <Box width={12}>{/* WAL status */}</Box>
</Box>
```

## Testing Commands

```bash
# Run all tests
bun test

# Run specific tests
bun test src/hooks/useSlots.test.ts
bun test src/components/panels/SlotsPanel.test.ts

# Type check
bun run typecheck
```

## Success Criteria Verification

| Criteria | How to Verify |
|----------|---------------|
| SC-001: 2s identification | Visual test with critical slots |
| SC-002: 24 test cases pass | `bun test` all green |
| SC-003: Responsive layout | Manual test at different widths |
| SC-004: 100ms navigation | Subjective feel test |
| SC-005: Threshold colors | Unit test severity mapping |

## Dependencies

This feature depends on:
- PollingService populating slots in store (Feature 004)
- Zustand store with slots Map (Feature 005)
- Panel navigation system (Feature 007)
- Existing atoms: StatusDot, Badge, ProgressBar
