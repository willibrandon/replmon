# Quickstart: Lag Visualization

**Feature**: 011-lag-visualization
**Date**: 2025-12-25

## Overview

This feature adds sparkline charts to the subscription detail modal, visualizing replication lag trends over a rolling 5-minute window.

## What You're Building

1. **Sparkline Component** (`src/components/charts/Sparkline.tsx`)
   - Renders Unicode block characters (▁▂▃▄▅▆▇█)
   - Linear scaling with dynamic max
   - Time axis labels (-5m to now)
   - Y-axis max indicator

2. **Store Update** (`src/store/types.ts`)
   - Change `MAX_LAG_HISTORY_SAMPLES` from 60 to 300

3. **Modal Integration** (`src/components/layout/Modal.tsx`)
   - Add Sparkline to SubscriptionDetailContent

4. **Hook Update** (`src/hooks/useSubscriptions.ts`)
   - Include full lag history in SubscriptionListItem

## File Tree

```
src/
├── components/
│   └── charts/
│       └── Sparkline.tsx       # NEW
├── hooks/
│   └── useSubscriptions.ts     # MODIFY
├── store/
│   └── types.ts                # MODIFY
└── components/
    └── layout/
        └── Modal.tsx           # MODIFY
```

## Implementation Order

1. **Update constant** - Change MAX_LAG_HISTORY_SAMPLES to 300
2. **Create Sparkline** - Build the chart component
3. **Update hook** - Add lagHistory to subscription items
4. **Integrate modal** - Add Sparkline to detail view

## Key APIs

### Sparkline Component

```tsx
<Sparkline
  samples={item.lagHistory}
  width={40}
  preferSeconds={true}
  isStale={item.isStale}
/>
```

### Block Character Mapping

```typescript
const BLOCK_CHARS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
// 9 levels: 0/8 (empty) through 8/8 (full)
```

## Visual Output Example

```
Lag Trend (max: 5.2s)
▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄
-5m                                    now
```

## Testing Strategy

1. **Empty state**: No samples → "No lag data available"
2. **Partial data**: <300 samples → Shorter time axis
3. **Full data**: 300 samples → Full 5-minute window
4. **Zero lag**: All zeros → Flat line at bottom
5. **Spike**: One extreme value → Spike at top, others compressed
6. **Stale**: Disconnected node → Badge + preserved data

## Dependencies

- Ink 5.x `<Text>` and `<Box>` components
- `useTheme()` hook for colors
- Existing `LagSample` type
- Existing `SubscriptionListItem` type
