# Research: State Management

**Feature**: 005-state-management
**Date**: 2025-12-23
**Purpose**: Resolve technical unknowns and document best practices for Zustand store implementation

## Research Topics

### 1. Zustand Slices Pattern with TypeScript

**Decision**: Use separate slice files with a combined store approach, following existing `connection.ts` pattern.

**Rationale**:
- The existing codebase already uses a single-file store pattern with `subscribeWithSelector` middleware
- Zustand's official documentation recommends applying middlewares only in the combined store, not individual slices
- TypeScript type inference works best when slices are combined at creation time

**Alternatives Considered**:
- `zustand-slices` library: More opinionated but adds dependency. Rejected - prefer minimal dependencies.
- Single monolithic store: Would grow too large with all state. Rejected - violates separation of concerns.

**Implementation Pattern**:
```typescript
// Each slice is a function that receives set and get
type ReplicationSlice = { ... }
const createReplicationSlice: StateCreator<CombinedStore, [], [], ReplicationSlice> = (set, get) => ({ ... })

// Combined store applies middlewares once
const useStore = create<CombinedStore>()(
  devtools(
    subscribeWithSelector((...a) => ({
      ...createConnectionSlice(...a),
      ...createReplicationSlice(...a),
      ...createUISlice(...a),
    })),
    { name: 'replmon-store', enabled: process.env.NODE_ENV !== 'production' }
  )
)
```

**Sources**:
- [Zustand Slices Pattern](https://zustand.docs.pmnd.rs/guides/slices-pattern)
- [GitHub Discussion #2070](https://github.com/pmndrs/zustand/discussions/2070)

---

### 2. Devtools Middleware Setup

**Decision**: Add devtools middleware wrapping subscribeWithSelector, disabled in production.

**Rationale**:
- FR-021 requires devtools integration for development debugging
- Devtools should wrap other middlewares to capture all state mutations
- Must be disabled in production for performance and security

**Configuration**:
```typescript
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import type {} from '@redux-devtools/extension' // Required for TypeScript typing

const useStore = create<Store>()(
  devtools(
    subscribeWithSelector((set) => ({ ... })),
    {
      name: 'replmon-store',
      enabled: process.env.NODE_ENV !== 'production',
      // Action naming for debugging clarity
    }
  )
)
```

**Action Naming**: Use the third parameter of `set()` for action names:
```typescript
set(
  (state) => ({ ...newState }),
  undefined,
  'replication/updateStats' // Shows in devtools
)
```

**Sources**:
- [Zustand Devtools Middleware](https://zustand.docs.pmnd.rs/middlewares/devtools)
- [GitHub Discussion #976](https://github.com/pmndrs/zustand/discussions/976)

---

### 3. Memoized Selectors Performance

**Decision**: Use basic selectors for most cases; apply `useShallow` for selectors returning new object references.

**Rationale**:
- Zustand v4+ with `useSyncExternalStore` eliminates need for explicit memoization in most cases
- Only heavy computations or reference-creating selectors benefit from memoization
- Over-memoization adds complexity without measurable benefit

**Selector Strategy**:

1. **Simple property selectors** (no memoization needed):
   ```typescript
   const focusedPanel = useStore((s) => s.focusedPanel)
   ```

2. **Aggregation selectors** (use `useShallow` or external memoization):
   ```typescript
   // Creates new array each time - needs shallow comparison
   const allSubscriptions = useStore(
     useShallow((s) => Array.from(s.subscriptions.values()).flat())
   )
   ```

3. **Computed selectors** (define outside component for stability):
   ```typescript
   const selectMaxLag = (state: Store) => {
     let max = 0;
     for (const subs of state.subscriptions.values()) {
       for (const sub of subs) {
         max = Math.max(max, sub.lagSeconds ?? 0);
       }
     }
     return max;
   };
   // Usage: const maxLag = useStore(selectMaxLag)
   ```

**Sources**:
- [Zustand useShallow](https://zustand.docs.pmnd.rs/hooks/use-shallow)
- [GitHub Discussion #658](https://github.com/pmndrs/zustand/discussions/658)

---

### 4. Map vs Object for Per-Node Data

**Decision**: Continue using `Map<string, T>` for per-node data (existing pattern).

**Rationale**:
- Existing `connection.ts` uses Maps for `nodeStatus`, `healthStatus`, `poolStats`
- Maps provide better iteration performance for dynamic keys
- Direct key access via `.get()` is explicit about potential undefined

**Update Pattern** (immutable):
```typescript
set((state) => {
  const subscriptions = new Map(state.subscriptions)
  subscriptions.set(nodeId, newData)
  return { subscriptions }
})
```

**Alternatives Considered**:
- Plain objects with spread: Requires type assertion for dynamic keys. Rejected.
- Immer middleware: Adds complexity for mutable-style updates. Rejected - Maps already simple to update.

---

### 5. Lag History Time-Series Storage

**Decision**: Store lag history as `Map<subscriptionKey, LagSample[]>` with FIFO eviction.

**Rationale**:
- Each subscription needs independent history for sparkline display
- Default 60 samples at 1s intervals = 1 minute of history
- FIFO ensures bounded memory growth

**Data Structure**:
```typescript
interface LagSample {
  timestamp: Date;
  lagBytes: number;
  lagSeconds: number | null;
}

// Key: `${nodeId}:${subscriptionName}`
type LagHistory = Map<string, LagSample[]>;
```

**Update Logic**:
```typescript
const MAX_LAG_SAMPLES = 60; // Configurable per spec

function appendLagSample(history: LagSample[], sample: LagSample): LagSample[] {
  const updated = [...history, sample];
  return updated.length > MAX_LAG_SAMPLES
    ? updated.slice(-MAX_LAG_SAMPLES)
    : updated;
}
```

---

### 6. Stale Data Handling

**Decision**: Track `staleNodes: Set<string>` in store; mark on disconnect, clear on reconnect with fresh data.

**Rationale**:
- Per clarification session: retain data with stale marker, replace on reconnect
- Components can check staleness and apply visual indicators
- Simple boolean per-node is sufficient (no need for timestamps)

**Implementation**:
```typescript
// State
staleNodes: Set<string>

// On node disconnect
markNodeStale: (nodeId: string) => void

// On successful polling data received
clearNodeStale: (nodeId: string) => void

// Selector for UI
const isStale = useStore((s) => s.staleNodes.has(nodeId))
```

---

### 7. Modal Focus Restoration

**Decision**: Store `previousFocusedPanel` when modal opens; restore on close.

**Rationale**:
- FR-010 requires preserving and restoring focus state
- Simple single-value storage sufficient (modals don't stack)

**Implementation**:
```typescript
interface UIState {
  focusedPanel: Panel;
  previousFocusedPanel: Panel | null;
  activeModal: ModalType | null;
}

openModal: (modal: ModalType) => set((state) => ({
  activeModal: modal,
  previousFocusedPanel: state.focusedPanel,
}))

closeModal: () => set((state) => ({
  activeModal: null,
  focusedPanel: state.previousFocusedPanel ?? state.focusedPanel,
  previousFocusedPanel: null,
}))
```

---

## Technology Decisions Summary

| Decision | Choice | Key Reason |
|----------|--------|------------|
| Store architecture | Slices combined into single store | Follows existing pattern, middleware compatibility |
| Devtools | Enabled in dev only | FR-021 requirement, security in prod |
| Selector memoization | useShallow for aggregations | Zustand v4+ handles most cases |
| Per-node storage | Map<string, T> | Existing pattern, good iteration |
| Lag history | Map with FIFO arrays | Bounded memory, per-subscription tracking |
| Stale tracking | Set<string> | Simple boolean per-node |
| Focus restoration | Single previousFocusedPanel | Modals don't stack |

## Dependencies

- `zustand` 5.x (already installed)
- `@redux-devtools/extension` types (dev dependency for TypeScript)

## No NEEDS CLARIFICATION Items

All technical decisions resolved through research. Ready for Phase 1 design.
