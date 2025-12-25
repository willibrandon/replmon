# Data Model: Lag Visualization

**Feature**: 011-lag-visualization
**Date**: 2025-12-25

## Entities

### Existing Entities (No Changes)

#### LagSample

Timestamped measurement of replication lag for a subscription.

```typescript
interface LagSample {
  timestamp: Date;      // When measurement was taken
  lagBytes: number;     // WAL lag in bytes
  lagSeconds: number | null; // Lag duration in seconds (null if unavailable)
}
```

**Source**: `src/store/types.ts:104-111`
**Storage**: In-memory Map `lagHistory: Map<string, LagSample[]>` keyed by `${nodeId}:${subscriptionName}`

### Modified Entities

#### MAX_LAG_HISTORY_SAMPLES Constant

**Current**: 60 samples (1 minute at 1s interval)
**New**: 300 samples (5 minutes at 1s interval)

```typescript
// Before
export const MAX_LAG_HISTORY_SAMPLES = 60;

// After
export const MAX_LAG_HISTORY_SAMPLES = 300;
```

**Source**: `src/store/types.ts:424`
**Impact**: Increases memory per subscription from ~3KB to ~15KB (60→300 objects)

### New Entities

#### SparklineProps

Props interface for the Sparkline component.

```typescript
interface SparklineProps {
  /** Lag samples to visualize (time-ordered, oldest first) */
  samples: LagSample[];

  /** Chart width in characters (default: 40) */
  width?: number;

  /** Whether to prefer lagSeconds over lagBytes (default: true) */
  preferSeconds?: boolean;

  /** Whether the data source is stale (default: false) */
  isStale?: boolean;
}
```

**Validation Rules**:
- `samples` must be ordered by timestamp ascending
- `width` must be between 10 and 100 (clamped)
- Empty `samples` array renders empty state

#### SparklineState (Internal)

Internal derived state for rendering.

```typescript
interface SparklineState {
  /** Normalized values (0-1) for each display column */
  bars: number[];

  /** Maximum value in the visible window */
  maxValue: number;

  /** Whether data uses seconds (true) or bytes (false) */
  usesSeconds: boolean;

  /** Number of samples in the data */
  sampleCount: number;
}
```

## State Transitions

### Sparkline Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  PollingService │────►│   Zustand Store │────►│   Modal.tsx     │
│  appendLagSample│     │   lagHistory    │     │ Sparkline props │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   1s intervals           300 samples max        Render sparkline
   per subscription       FIFO eviction          with current data
```

### Empty to Populated Transition

| State | Trigger | Result |
|-------|---------|--------|
| Empty (no samples) | Initial render | Show "No lag data available" |
| Empty → Partial | First sample arrives | Show sparkline with 1+ samples |
| Partial → Full | 300 samples reached | Sparkline at full width |
| Full | New sample | FIFO eviction, oldest removed |
| Any → Stale | Node disconnect | Preserve data, show stale badge |
| Stale → Active | Node reconnect | Resume updates, remove badge |

## Data Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        Zustand Store                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  nodes: Map<string, NodeInfo>                                  │
│    ├── nodeId ──────────────────────────────────────────┐      │
│                                                          │      │
│  subscriptions: Map<string, SubscriptionData[]>          │      │
│    ├── nodeId ─┬──────────────────────────────────────┐ │      │
│                │                                       │ │      │
│  lagHistory: Map<string, LagSample[]>                  │ │      │
│    └── "${nodeId}:${subscriptionName}" ◄───────────────┴─┘      │
│                                                                 │
│  staleNodes: Set<string>                                       │
│    └── nodeId (for staleness indicator)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Memory Budget

| Component | Per-subscription | With 50 subscriptions |
|-----------|-----------------|----------------------|
| LagSample (current, 60) | ~3KB | ~150KB |
| LagSample (new, 300) | ~15KB | ~750KB |
| Delta | +12KB | +600KB |

**Conclusion**: Acceptable memory increase for 5-minute visualization.
