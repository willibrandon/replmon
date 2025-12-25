# Quickstart: Subscriptions Panel

**Feature**: 009-subscriptions-panel
**Date**: 2025-12-24

## Overview

The Subscriptions Panel displays all PostgreSQL logical replication subscriptions across connected nodes. It shows status indicators, lag metrics, LSN positions, and supports keyboard navigation with a detail modal.

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/panels/SubscriptionsPanel.tsx` | Main panel component |
| `src/hooks/useSubscriptions.ts` | Data aggregation hook |
| `src/components/panels/SubscriptionsPanel.test.tsx` | Component tests |

## Implementation Order

### Step 1: Create useSubscriptions Hook

**File**: `src/hooks/useSubscriptions.ts`

```typescript
// Key responsibilities:
// 1. Aggregate subscriptions from store
// 2. Enrich with node names and lag data
// 3. Map status to StatusDot variants
// 4. Track selection state
// 5. Memoize to prevent re-renders
```

Use `useMemo` to derive `SubscriptionListItem[]` from store state. Follow the pattern in `useTopology.ts`.

### Step 2: Create Formatting Utilities

**Location**: Inside `SubscriptionsPanel.tsx` (private)

```typescript
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
```

### Step 3: Create SubscriptionsPanel Component

**File**: `src/components/panels/SubscriptionsPanel.tsx`

Structure:
```
┌─────────────────────────────────────────────────────────────┐
│ 5 subscriptions, 2 pglogical  [pglogical] [1 stale]         │  ← Header with badges
├─────────────────────────────────────────────────────────────┤
│ ● my_subscription          node1     128 KB    5s  0/3001  │  ← SubscriptionRow
│ ◐ sync_users               node2       2 MB   45s  0/2500  │     (selected = highlight)
│ ○ disabled_sub             node1         -      -       -  │
└─────────────────────────────────────────────────────────────┘
```

Component tree:
```
SubscriptionsPanel
├── Header (count + badges)
├── EmptyState (when count === 0)
└── List
    └── SubscriptionRow (for each item)
        ├── StatusDot (status indicator)
        ├── Name + Source Badge
        ├── Node Name
        ├── Lag Bytes
        ├── Lag Time
        └── LSN
```

### Step 4: Implement Detail Modal Content

When Enter is pressed on a selected subscription, the MainLayout calls `openModal({ type: 'details', ... })`. The Modal component needs to render subscription details when `type === 'details'` and data contains a subscription.

**Modal content fields**:
- Subscription name (title)
- Status with indicator
- Source (native/pglogical)
- Node name and host:port
- Enabled state
- Provider info (pglogical only)
- Replication sets (pglogical only)
- Slot name
- Worker PID
- LSN positions (received, latest end)
- Last message time

### Step 5: Wire Up to MainLayout

The SubscriptionsPanel should already be rendered when `focusedPanel === 'subscriptions'`. Verify in MainLayout that:
1. Panel receives `config` prop
2. Enter key handler opens details modal with selected subscription

## Key Patterns

### Status Mapping

```typescript
function getStatusVariant(status: SubscriptionStatus, enabled: boolean): StatusDotVariant {
  if (!enabled) return 'muted';
  switch (status) {
    case 'replicating': return 'success';
    case 'catchup': return 'warning';
    case 'initializing': return 'connecting';
    case 'down': return 'critical';
    default: return 'muted';
  }
}
```

### Lag Severity (use existing utility)

```typescript
import { getLagSeverity } from '../utils/topology.js';

// In component:
const severity = getLagSeverity(latestLag?.lagSeconds ?? null);
const lagColor = severity === 'critical' ? colors.critical
               : severity === 'warning' ? colors.warning
               : colors.success;
```

### Selection Highlight

```typescript
const isSelected = useStore((s) => s.selections.get('subscriptions') === item.id);

<Box backgroundColor={isSelected ? colors.selection : undefined}>
  ...row content...
</Box>
```

## Testing Strategy

1. **Empty state**: Render with empty subscriptions Map
2. **List rendering**: Render with multiple subscriptions, verify all appear
3. **Status indicators**: Verify correct variant for each status
4. **Lag coloring**: Verify warning/critical colors at thresholds
5. **Selection highlight**: Verify selected item has different background
6. **Stale appearance**: Verify dimmed display for stale nodes

## Acceptance Verification

Run through each acceptance scenario from spec.md:

| Story | Scenario | Verification |
|-------|----------|--------------|
| 1.1 | 5 subs across 3 nodes | All appear in scrollable list |
| 1.2 | Status "replicating" | Green filled dot (●) |
| 1.3 | Status "catchup" | Yellow half dot (◐) |
| 1.4 | Status "down" | Red filled dot (●) |
| 1.5 | Disabled subscription | Gray empty dot (○) |
| 2.1 | Lag bytes displayed | Human-readable format |
| 2.3 | Lag > 5s | Warning color |
| 2.4 | Lag > 30s | Critical color |
| 4.1 | Press j | Selection moves down |
| 4.2 | Press k | Selection moves up |
| 5.1 | Press Enter | Modal opens with title |

## Dependencies

- Existing: `StatusDot`, `Badge`, `Modal`, `useTheme`, `useStore`
- New: `useSubscriptions` hook (created in this feature)
- Store: No modifications needed
- Selectors: Use existing from `src/store/selectors/`
