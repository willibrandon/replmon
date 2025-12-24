# Quickstart: UI Framework & Layout

**Feature**: 006-ui-framework
**Date**: 2025-12-24

## Prerequisites

- Bun 1.x or Node.js 18+ installed
- replmon repository cloned and dependencies installed
- Existing features 001-005 implemented (config, connection, polling, state)

## Quick Verification

After implementation, verify the UI framework works:

```bash
# Run the application
bun run start --config examples/config.yaml

# Expected: See MainLayout with Header, 5 panels, Footer
# Expected: Panel navigation works (t/s/l/c/o keys)
# Expected: Help modal opens with ?
```

## Implementation Order

### Phase 1: Theme System (Foundation)

1. Create `src/theme/ThemeContext.ts`
2. Create `src/theme/ThemeProvider.tsx`
3. Create `src/hooks/useTheme.ts`
4. Create `src/theme/index.ts` (barrel export)
5. Wire ThemeProvider in `src/components/App.tsx`

**Verify**: Components can call `useTheme()` and get colors.

### Phase 2: Responsive Hooks

1. Create `src/hooks/useTerminalSize.ts`
2. Create `src/hooks/useBreakpoint.ts`

**Verify**: `useBreakpoint()` returns correct value for terminal size.

### Phase 3: Atom Components

1. Create `src/components/atoms/StatusDot.tsx`
2. Create `src/components/atoms/Badge.tsx`
3. Create `src/components/atoms/ProgressBar.tsx`
4. Create `src/components/atoms/Spinner.tsx`
5. Create `src/components/atoms/index.ts`

**Verify**: Atoms render with correct theme colors.

### Phase 4: Layout Components

1. Create `src/components/layout/Panel.tsx`
2. Create `src/components/layout/Header.tsx`
3. Create `src/components/layout/Footer.tsx`
4. Create `src/components/layout/Modal.tsx`
5. Create `src/components/layout/SplitView.tsx`
6. Create `src/components/layout/MainLayout.tsx`
7. Create `src/components/layout/index.ts`

**Verify**: MainLayout renders with Header/Footer structure.

### Phase 5: Dashboard Integration

1. Extract `TopologyNode` from Dashboard to `src/components/panels/TopologyPanel.tsx`
2. Modify `src/components/Dashboard.tsx` to use MainLayout
3. Merge StatusBar logic into Footer
4. Delete `src/components/StatusBar.tsx`

**Verify**: Dashboard displays correctly with new layout.

### Phase 6: Keyboard & Modal Integration

1. Move keyboard handling from Dashboard to MainLayout
2. Implement modal rendering in MainLayout
3. Add focus trapping for modals
4. Test all keyboard shortcuts

**Verify**: All keyboard navigation works, modals open/close correctly.

## Component Usage Examples

### Using Theme Colors

```tsx
import { useTheme } from '../hooks/useTheme.js';

function MyComponent() {
  const colors = useTheme();
  return <Text color={colors.primary}>Themed text</Text>;
}
```

### Using Atoms

```tsx
import { StatusDot, Badge, ProgressBar } from '../components/atoms/index.js';

function StatusDisplay() {
  return (
    <Box>
      <StatusDot variant="success" label="Connected" />
      <Badge label="pglogical" variant="primary" />
      <ProgressBar percent={75} width={20} />
    </Box>
  );
}
```

### Using Panel

```tsx
import { Panel } from '../components/layout/index.js';

function MyPanel() {
  return (
    <Panel panelId="topology" title="Topology" badges={['3 nodes']}>
      <Text>Panel content here</Text>
    </Panel>
  );
}
```

### Using MainLayout

```tsx
import { MainLayout, Header, Footer, Panel } from '../components/layout/index.js';

function Dashboard() {
  return (
    <MainLayout>
      <Panel panelId="topology" title="Topology">
        <TopologyContent />
      </Panel>
      <Panel panelId="subscriptions" title="Subscriptions">
        <SubscriptionsContent />
      </Panel>
      {/* ... other panels */}
    </MainLayout>
  );
}
```

## File Checklist

After implementation, these files should exist:

```
src/
├── theme/
│   ├── ThemeContext.ts         ✓
│   ├── ThemeProvider.tsx       ✓
│   └── index.ts                ✓
├── hooks/
│   ├── useTheme.ts             ✓
│   ├── useTerminalSize.ts      ✓
│   └── useBreakpoint.ts        ✓
├── components/
│   ├── atoms/
│   │   ├── StatusDot.tsx       ✓
│   │   ├── Badge.tsx           ✓
│   │   ├── ProgressBar.tsx     ✓
│   │   ├── Spinner.tsx         ✓
│   │   └── index.ts            ✓
│   ├── layout/
│   │   ├── Panel.tsx           ✓
│   │   ├── Header.tsx          ✓
│   │   ├── Footer.tsx          ✓
│   │   ├── Modal.tsx           ✓
│   │   ├── SplitView.tsx       ✓
│   │   ├── MainLayout.tsx      ✓
│   │   └── index.ts            ✓
│   ├── panels/
│   │   ├── TopologyPanel.tsx   ✓
│   │   └── index.ts            ✓
│   ├── App.tsx                 ✓ (modified)
│   ├── Dashboard.tsx           ✓ (modified)
│   └── StatusBar.tsx           ✗ (deleted)
```

## Testing

```bash
# Run all tests
bun test

# Run UI-specific tests
bun test src/theme
bun test src/components/atoms
bun test src/components/layout
```

## Troubleshooting

### "useTheme must be used within ThemeProvider"

Ensure App.tsx wraps the application with ThemeProvider:

```tsx
<ThemeProvider theme={config.theme}>
  {/* rest of app */}
</ThemeProvider>
```

### Panel focus not updating

Check that:
1. MainLayout has `useInput` handler calling store actions
2. Panel component reads `focusedPanel` from store
3. `panelId` prop matches store Panel type exactly

### Modal not appearing

Check that:
1. `activeModal` state is being set in store
2. MainLayout renders Modal conditionally based on `activeModal !== null`
3. Modal content component exists for the modal type

### Layout not responsive

Check that:
1. `useTerminalSize` is subscribed to resize events
2. `useBreakpoint` correctly derives breakpoint
3. MainLayout uses breakpoint to select layout variant
