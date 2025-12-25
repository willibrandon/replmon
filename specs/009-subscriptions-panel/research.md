# Research: Subscriptions Panel

**Feature**: 009-subscriptions-panel
**Date**: 2025-12-24
**Status**: Complete

## Research Tasks

### Task 1: Existing Selector Infrastructure

**Question**: What subscription-related selectors already exist?

**Findings**:
- `selectAllSubscriptions` - Aggregates all subscriptions across nodes
- `selectSubscriptionsByNode(nodeId)` - Subscriptions for a specific node
- `selectSubscriptionByName(nodeId, name)` - Single subscription lookup
- `selectLatestLagSample(nodeId, subscriptionName)` - Latest lag for a subscription
- `selectLagHistory(nodeId, subscriptionName)` - Full lag history
- `selectSelectableItems` - Already handles 'subscriptions' panel with key format `${nodeId}:${subscriptionName}`
- `selectLagTrend(nodeId, subscriptionName)` - Returns 'increasing' | 'decreasing' | 'stable' | 'unknown'

**Decision**: No new selectors needed. Existing selectors provide all required data. The `useSubscriptions` hook will compose these selectors with additional derived data (status variant mapping, node display info).

**Rationale**: Following DRY principle and established patterns. Selectors are already tested and integrated with the store.

### Task 2: Status-to-Variant Mapping

**Question**: How to map SubscriptionStatus to StatusDot variant?

**Findings**:
- `SubscriptionStatus` enum: `'initializing' | 'replicating' | 'down' | 'catchup' | 'unknown'`
- `StatusDotVariant` type: `'success' | 'warning' | 'critical' | 'muted' | 'connecting'`
- Symbols: success/critical = '●', muted = '○', warning/connecting = '◐'

**Decision**: Map as follows:
| SubscriptionStatus | StatusDotVariant | Symbol | Color |
|-------------------|------------------|--------|-------|
| `replicating` | `success` | ● | green |
| `catchup` | `warning` | ◐ | yellow |
| `initializing` | `connecting` | ◐ | yellow |
| `down` | `critical` | ● | red |
| `unknown` | `muted` | ○ | gray |
| disabled (`enabled=false`) | `muted` | ○ | gray |

**Rationale**: Aligns with spec requirements and TopologyPanel precedent. The 'connecting' variant uses same visual (◐) as 'warning' which is appropriate for 'initializing' state.

### Task 3: Lag Severity Color Coding

**Question**: How to apply lag severity thresholds from spec?

**Findings**:
- Spec defines: normal (<5s), warning (5-30s), critical (>30s)
- Existing `getLagSeverity(lagSeconds)` utility returns `'normal' | 'warning' | 'critical' | 'unknown'`
- Theme colors available: `colors.success`, `colors.warning`, `colors.critical`, `colors.muted`

**Decision**: Reuse existing `getLagSeverity` utility from `src/utils/topology.ts`. Map severity to theme colors in component.

**Rationale**: DRY - utility already implements the exact thresholds defined in spec.

### Task 4: Panel Component Pattern

**Question**: What's the established pattern for panel components?

**Findings** (from TopologyPanel):
1. Props interface receives `config: Configuration`
2. Uses custom hook (`useTopology`) for derived data
3. Renders summary header with badges
4. Handles empty state gracefully
5. Uses `useStore` for accessing store state
6. Uses `useTheme` for colors

**Decision**: Follow exact same pattern:
```tsx
interface SubscriptionsPanelProps {
  config: Configuration;
}

function SubscriptionsPanel({ config }: SubscriptionsPanelProps)
```

**Rationale**: Consistency with existing codebase. Makes panel interchangeable in layout.

### Task 5: Keyboard Navigation Pattern

**Question**: How is keyboard navigation implemented for panels?

**Findings**:
- `selectSelectableItems` selector already handles 'subscriptions' panel
- Selection key format: `${nodeId}:${subscriptionName}`
- Store actions: `selectNext()`, `selectPrevious()`, `setSelection(panel, itemId)`
- Input handling via Ink's `useInput` hook in parent layout

**Decision**:
1. Panel renders items with selection highlight based on `selections.get('subscriptions')`
2. Keyboard handling (j/k) is already implemented at `MainLayout` level
3. Panel reads selection state and renders highlight accordingly

**Rationale**: Keyboard handling is centralized. Panel only needs to render selection state.

### Task 6: Modal Pattern

**Question**: How to implement the subscription detail modal?

**Findings**:
- Existing Modal component at `src/components/layout/Modal.tsx`
- Modal receives `config: ModalConfig` with `type`, `title`, `data`
- `openModal(config)` action opens modal
- `closeModal()` action closes and restores focus
- Escape key handling built into Modal component

**Decision**:
1. On Enter press (at MainLayout level), call `openModal({ type: 'details', title: subscriptionName, data: subscription })`
2. Create SubscriptionDetailModal content as child of Modal
3. Modal displays all SubscriptionData fields

**Rationale**: Reuses existing modal infrastructure. 'details' modal type already exists in `ModalType`.

### Task 7: Data Formatting Patterns

**Question**: How to format lag bytes and LSN values?

**Findings**:
- No existing formatters found for bytes (KB, MB, GB) or durations
- LSN format is already strings from PostgreSQL (e.g., "0/3000158")
- Existing patterns show simple template literals for display

**Decision**: Create utility functions in component file:
```typescript
function formatBytes(bytes: number): string
function formatDuration(seconds: number | null): string
```

**Rationale**: Simple utilities. If needed elsewhere later, can be extracted to `src/utils/format.ts`.

### Task 8: Stale Subscription Display

**Question**: How to visually indicate stale subscriptions?

**Findings**:
- TopologyPanel uses `isStale` flag from node data
- Stale nodes have muted appearance via `dimColor` Ink prop
- `staleNodes: Set<string>` in store tracks stale node IDs

**Decision**:
1. Check if subscription's nodeId is in staleNodes set
2. Apply `dimColor` to entire row for stale subscriptions
3. Show stale indicator badge

**Rationale**: Consistent with TopologyPanel behavior.

### Task 9: Source Badge Display

**Question**: How to distinguish native vs pglogical subscriptions?

**Findings**:
- `SubscriptionData.source` is `'native' | 'pglogical'`
- Existing Badge component with variants: 'primary', 'secondary', 'success', 'warning', 'critical', 'muted'

**Decision**: Show small badge next to subscription name:
- Native: `<Badge label="native" variant="muted" />`
- pglogical: `<Badge label="pglogical" variant="secondary" />`

**Rationale**: Follows spec FR-018. Uses existing Badge component.

### Task 10: Empty State Pattern

**Question**: How to handle empty state?

**Findings**:
- TopologyPanel has dedicated `EmptyState` component
- Uses `<Text color={colors.muted}>` with descriptive message

**Decision**: Create similar empty state:
```tsx
<Box flexDirection="column" alignItems="center">
  <Text color={colors.muted}>No subscriptions found</Text>
  <Text color={colors.muted} dimColor>
    Configure logical replication to see subscriptions
  </Text>
</Box>
```

**Rationale**: Consistent with existing empty state patterns.

## Summary

All research tasks resolved. Key decisions:

1. **No new selectors needed** - existing infrastructure sufficient
2. **Status mapping** defined for SubscriptionStatus → StatusDotVariant
3. **Lag severity** reuses existing `getLagSeverity` utility
4. **Component pattern** follows TopologyPanel exactly
5. **Keyboard nav** handled by parent layout; panel renders selection state
6. **Modal** uses existing Modal component with 'details' type
7. **Formatting** - add simple utility functions in component
8. **Stale display** - use `dimColor` prop, consistent with topology
9. **Source badge** - use existing Badge component
10. **Empty state** - follow TopologyPanel pattern

Proceed to Phase 1: Design.
