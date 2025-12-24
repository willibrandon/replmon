# Quickstart: State Management

**Feature**: 005-state-management
**Prerequisites**: 003-connection-management, 004-polling-service

## Overview

This feature adds comprehensive state management to replmon using Zustand. The store manages connection status, replication data (subscriptions, slots, conflicts), lag history, and UI state (panel focus, selections, modals).

## Quick Setup

### 1. Install Dev Dependencies

```bash
bun add -d @redux-devtools/extension
```

### 2. Store Structure

```
src/store/
├── index.ts           # Combined store export + useStore hook
├── connection.ts      # Existing connection slice (modified)
├── replication.ts     # New: replication data slice
├── ui.ts              # New: UI state slice
├── selectors/
│   ├── index.ts       # All selectors export
│   ├── aggregations.ts
│   ├── filters.ts
│   └── computed.ts
└── types.ts           # Store type definitions
```

## Usage Examples

### Reading State in Components

```typescript
import { useStore } from '../store';

function TopologyPanel() {
  // Single value selector
  const focusedPanel = useStore((s) => s.focusedPanel);

  // Check if this panel is focused
  const isFocused = focusedPanel === 'topology';

  // Get node IDs
  const nodeIds = useStore((s) => Array.from(s.nodes.keys()));

  return (
    <Box borderStyle={isFocused ? 'bold' : 'single'}>
      {nodeIds.map(id => <NodeRow key={id} nodeId={id} />)}
    </Box>
  );
}
```

### Updating State (Actions)

```typescript
import { useStore } from '../store';

function useKeyboardNavigation() {
  const setFocusedPanel = useStore((s) => s.setFocusedPanel);
  const focusNextPanel = useStore((s) => s.focusNextPanel);

  useInput((input, key) => {
    // Direct panel access
    if (input === 't') setFocusedPanel('topology');
    if (input === 's') setFocusedPanel('subscriptions');

    // Tab cycling
    if (key.tab && !key.shift) focusNextPanel();
  });
}
```

### Integrating with PollingService

```typescript
import { useStore } from '../store';

function usePollingIntegration(pollingService: PollingService) {
  const handlePollingData = useStore((s) => s.handlePollingData);
  const markNodeStale = useStore((s) => s.markNodeStale);

  useEffect(() => {
    // Subscribe to polling events
    pollingService.on('data', handlePollingData);

    // Handle errors - mark affected nodes stale
    pollingService.on('error', (error) => {
      error.nodeErrors.forEach(({ nodeId }) => markNodeStale(nodeId));
    });

    return () => {
      pollingService.off('data', handlePollingData);
      pollingService.off('error', /* handler */);
    };
  }, [pollingService]);
}
```

### Using Selectors

```typescript
import { useStore } from '../store';
import { selectAllSubscriptions, selectMaxLagSeconds } from '../store/selectors';

function StatusBar() {
  // Aggregation selector
  const allSubs = useStore(selectAllSubscriptions);

  // Computed selector
  const maxLag = useStore(selectMaxLagSeconds);

  return (
    <Box>
      <Text>Subscriptions: {allSubs.length}</Text>
      <Text>Max Lag: {maxLag ?? 'N/A'}s</Text>
    </Box>
  );
}
```

### Modal Management

```typescript
import { useStore } from '../store';

function OperationsButton() {
  const openModal = useStore((s) => s.openModal);

  const handleOpen = () => {
    openModal({
      type: 'operations',
      title: 'Operations',
    });
  };

  return <Button onPress={handleOpen}>Operations</Button>;
}

function Modal() {
  const activeModal = useStore((s) => s.activeModal);
  const modalData = useStore((s) => s.modalData);
  const closeModal = useStore((s) => s.closeModal);

  if (!activeModal) return null;

  return (
    <Box>
      <Text>{modalData?.title}</Text>
      <Button onPress={closeModal}>Close (Esc)</Button>
    </Box>
  );
}
```

### Lag History for Sparklines

```typescript
import { useStore } from '../store';
import { selectLagHistory } from '../store/selectors';

function SubscriptionRow({ nodeId, name }: Props) {
  // Get lag history for sparkline
  const lagHistory = useStore(
    (s) => selectLagHistory(nodeId, name)(s)
  );

  // Extract values for sparkline
  const values = lagHistory.map(s => s.lagSeconds ?? 0);

  return (
    <Box>
      <Text>{name}</Text>
      <Sparkline data={values} />
    </Box>
  );
}
```

## Key Patterns

### 1. Fine-grained Subscriptions

Use `subscribeWithSelector` for component-level reactivity:

```typescript
// Only re-render when this specific node's health changes
const health = useStore((s) => s.healthStatus.get(nodeId));
```

### 2. Stale Data Handling

Check staleness before displaying data:

```typescript
const isStale = useStore((s) => s.staleNodes.has(nodeId));
const subscriptions = useStore((s) => s.subscriptions.get(nodeId) ?? []);

return (
  <Box opacity={isStale ? 0.5 : 1}>
    {subscriptions.map(sub => <SubscriptionRow key={sub.subscriptionName} {...sub} />)}
    {isStale && <Text color="yellow">⚠ Stale data</Text>}
  </Box>
);
```

### 3. Devtools Debugging

Actions appear in Redux DevTools with clear names:

```
replication/setSubscriptions
replication/appendLagSample
ui/setFocusedPanel
ui/openModal
```

## Testing

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useStore } from '../store';

test('setFocusedPanel updates panel', () => {
  const { result } = renderHook(() => useStore());

  act(() => {
    result.current.setFocusedPanel('subscriptions');
  });

  expect(result.current.focusedPanel).toBe('subscriptions');
});
```

## Performance Notes

- Store uses `Map` for O(1) node/subscription lookups
- Lag history is FIFO-capped at 60 samples per subscription
- Selectors are stable functions (defined outside components)
- `useShallow` recommended for selectors returning new arrays/objects
