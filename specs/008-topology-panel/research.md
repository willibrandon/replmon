# Research: Topology Panel

**Feature**: 008-topology-panel | **Date**: 2025-12-24

## Research Summary

This document resolves all technical unknowns from the Technical Context and documents design decisions for the Topology Panel implementation.

---

## 1. Relationship Derivation from Store Data

### Decision: Derive edges from subscriptions + replication stats

### Rationale

The existing store contains all data needed to derive replication relationships:

1. **pglogical relationships**: `SubscriptionData.providerNode` explicitly names the upstream node
2. **Native streaming replication**: `pg_stat_replication` on primary shows connected standbys via `application_name`
3. **Bidirectional detection**: If node A has subscription from B AND node B has subscription from A, relationship is bidirectional

### Data Sources

| Relationship Type | Store Path | Key Fields |
|-------------------|------------|------------|
| pglogical provider→subscriber | `subscriptions.get(nodeId)[]` | `providerNode`, `source='pglogical'` |
| pglogical bidirectional | Cross-check subscriptions on both nodes | `providerNode` present on both sides |
| Native streaming | Derived from replication stats | Primary queries `pg_stat_replication` |
| Lag data | `lagHistory.get('nodeId:subName')` | `lagSeconds`, `lagBytes` |

### Implementation Strategy

```typescript
// Derive edges from subscriptions
interface TopologyEdge {
  sourceNodeId: string;      // Provider/primary node
  targetNodeId: string;      // Subscriber/standby node
  direction: 'unidirectional' | 'bidirectional';
  replicationType: 'native' | 'pglogical';
  lagSeconds: number | null;
  lagBytes: number;
  subscriptionName: string | null;
}

// For each subscription:
// - If providerNode is non-null: edge from providerNode → subscription.nodeId
// - If providerNode matches a configured nodeId: we have a complete edge
// - If providerNode doesn't match: show as external provider (dimmed)
```

### Alternatives Considered

- **Query pg_stat_replication directly in topology**: Rejected - duplicates existing polling infrastructure
- **Store edges as first-class entities**: Rejected - adds complexity; edges are derived data not source of truth

---

## 2. ASCII Box Drawing Approach

### Decision: Use Ink's built-in borderStyle + Unicode line characters

### Rationale

1. Ink `<Box borderStyle="single">` provides consistent box rendering across terminals
2. Unicode box-drawing characters (`─ │ → ← ↔`) have wide terminal support
3. Connection lines rendered as Text components between node boxes

### Character Set

| Purpose | Character | Unicode |
|---------|-----------|---------|
| Horizontal line | `─` | U+2500 |
| Vertical line | `│` | U+2502 |
| Right arrow | `→` | U+2192 |
| Left arrow | `←` | U+2190 |
| Bidirectional | `↔` | U+2194 |

### Box Rendering

```tsx
<Box borderStyle="single" borderColor={colors.primary} width={24}>
  <StatusDot variant={statusVariant} />
  <Text bold>{nodeId}</Text>
</Box>
```

### Connection Rendering

```tsx
// Horizontal layout: Node1 ──→ Node2
<Box flexDirection="row">
  <NodeBox nodeId="primary" />
  <Box flex={1} justifyContent="center">
    <Text color={colors.secondary}>──────→──────</Text>
  </Box>
  <NodeBox nodeId="standby" />
</Box>

// With lag value
<Box flexDirection="row">
  <NodeBox nodeId="primary" />
  <Box flex={1} flexDirection="column" alignItems="center">
    <Text color={colors.secondary}>──────→──────</Text>
    <Text color={lagColor}>{formatLag(lagSeconds)}</Text>
  </Box>
  <NodeBox nodeId="standby" />
</Box>
```

### Alternatives Considered

- **Custom borderStyle object**: More flexible but unnecessary complexity for standard boxes
- **ASCII-only fallback**: Deferred - modern terminals universally support Unicode
- **Canvas-based rendering**: Not supported in Ink's text-based model

---

## 3. Layout Strategy for Multiple Nodes

### Decision: Horizontal layout with auto-wrapping for narrow terminals

### Rationale

1. Horizontal layout maximizes use of terminal width (typically 120-200 cols)
2. Single-row showing 2-4 nodes covers most replication topologies
3. Wrap to vertical layout when terminal < 100 columns
4. Already have `useBreakpoint()` hook for responsive design

### Layout Modes

| Terminal Width | Layout | Nodes Per Row |
|----------------|--------|---------------|
| ≥100 cols | Horizontal | 2-4 |
| 80-99 cols | Horizontal compact | 2 |
| <80 cols | Vertical | 1 |

### Implementation

```tsx
function useTopologyLayout(nodeCount: number) {
  const { columns } = useTerminalSize();
  const breakpoint = useBreakpoint();

  const nodeWidth = breakpoint === 'narrow' ? 20 : 24;
  const nodesPerRow = Math.max(1, Math.floor(columns / (nodeWidth + 15))); // 15 for connection line

  return { nodeWidth, nodesPerRow, isVertical: nodesPerRow === 1 };
}
```

### Alternatives Considered

- **Graph auto-layout algorithm**: Overkill for typical 2-5 node topologies
- **Force-directed layout**: Not practical in text-based terminal
- **Always vertical list**: Wastes horizontal space in wide terminals

---

## 4. Node Role Detection

### Decision: Derive role from subscription and replication data

### Rationale

Nodes don't have explicit "role" field in config. Role is determined by:
1. **Primary**: Has entries in `pg_stat_replication` (standbys connected)
2. **Standby**: Has subscriptions but no outbound replication
3. **Provider**: Referenced in other nodes' subscriptions (pglogical)
4. **Subscriber**: Has subscriptions from providers (pglogical)
5. **Bidirectional**: Both provider and subscriber in pglogical setup

### Role Enum

```typescript
type NodeRole =
  | 'primary'     // Native replication: has standbys
  | 'standby'     // Native replication: connected to primary
  | 'provider'    // pglogical: other nodes subscribe to it
  | 'subscriber'  // pglogical: subscribes to other nodes
  | 'bidirectional' // pglogical: both provider and subscriber
  | 'standalone'; // No replication relationships detected
```

### Detection Logic

```typescript
function deriveNodeRole(nodeId: string, edges: TopologyEdge[]): NodeRole {
  const isSource = edges.some(e => e.sourceNodeId === nodeId);
  const isTarget = edges.some(e => e.targetNodeId === nodeId);
  const hasPglogical = edges.some(e =>
    (e.sourceNodeId === nodeId || e.targetNodeId === nodeId) &&
    e.replicationType === 'pglogical'
  );

  if (hasPglogical) {
    if (isSource && isTarget) return 'bidirectional';
    if (isSource) return 'provider';
    if (isTarget) return 'subscriber';
  }

  if (isSource) return 'primary';
  if (isTarget) return 'standby';
  return 'standalone';
}
```

---

## 5. Lag Threshold Color Coding

### Decision: Use spec-defined thresholds with theme colors

### Thresholds (from spec clarification)

| State | Lag Range | Color |
|-------|-----------|-------|
| Normal | <5 seconds | `colors.success` (green) |
| Warning | 5-30 seconds | `colors.warning` (yellow) |
| Critical | >30 seconds | `colors.critical` (red) |
| Unknown | null/unavailable | `colors.muted` (gray) |

### Implementation

```typescript
function getLagColor(lagSeconds: number | null, colors: ThemeColors): string {
  if (lagSeconds === null) return colors.muted;
  if (lagSeconds < 5) return colors.success;
  if (lagSeconds <= 30) return colors.warning;
  return colors.critical;
}

function formatLag(lagSeconds: number | null): string {
  if (lagSeconds === null) return '?';
  if (lagSeconds < 1) return `${Math.round(lagSeconds * 1000)}ms`;
  if (lagSeconds < 60) return `${lagSeconds.toFixed(1)}s`;
  return `${Math.floor(lagSeconds / 60)}m ${Math.round(lagSeconds % 60)}s`;
}
```

---

## 6. Keyboard Navigation Within Topology

### Decision: Reuse existing j/k navigation for node selection

### Rationale

1. MainLayout already handles j/k input and dispatches to `selectNext/selectPrevious`
2. Topology panel's selectable items are node IDs (already implemented)
3. Arrow keys (left/right) could navigate horizontally in future enhancement

### Current Behavior (no changes needed)

- `j` / `↓`: Select next node in list order
- `k` / `↑`: Select previous node in list order
- Selection stored in `store.selections.get('topology')`
- Selected node receives visual highlight (bold, primary color)

### Future Enhancement (not in scope)

- Arrow left/right for horizontal navigation in multi-row layout
- Enter to expand node details in modal

---

## 7. Stale Node Display

### Decision: Dimmed opacity + badge indicator

### Rationale

Per spec FR-013: "System MUST indicate stale nodes with a muted visual appearance"

### Implementation

```tsx
function TopologyNode({ nodeId }: { nodeId: string }) {
  const isStale = useStore(selectIsNodeStale(nodeId));
  const colors = useTheme();

  return (
    <Box
      borderStyle="single"
      borderColor={isStale ? colors.muted : colors.primary}
    >
      <StatusDot variant={isStale ? 'muted' : statusVariant} />
      <Text color={isStale ? colors.muted : colors.foreground}>{nodeId}</Text>
      {isStale && <Badge label="stale" variant="muted" />}
    </Box>
  );
}
```

---

## 8. Native Replication Relationship Detection

### Decision: Query replication stats on primary to identify standbys

### Challenge

Native PostgreSQL streaming replication doesn't have explicit subscription records on standbys. The primary knows about connected standbys via `pg_stat_replication`, but standbys don't have a "provider" field.

### Strategy

1. For each node, check if `pg_stat_replication` has entries → it's a primary
2. The `application_name` in replication stats often matches standby node ID
3. If `application_name` matches a configured node ID → create edge
4. Fall back to showing primary with "N standbys connected" if names don't match config

### Data Flow

```typescript
// In selector: selectTopologyEdges
for (const [nodeId, stats] of replicationStats) {
  for (const stat of stats) {
    // Check if application_name matches a configured node
    const standbyNodeId = findNodeByAppName(stat.applicationName);
    if (standbyNodeId) {
      edges.push({
        sourceNodeId: nodeId,
        targetNodeId: standbyNodeId,
        direction: 'unidirectional',
        replicationType: 'native',
        lagSeconds: stat.lagSeconds,
        lagBytes: stat.lagBytes,
        subscriptionName: null,
      });
    }
  }
}
```

---

## 9. Component Hierarchy

### Decision: Composition with dedicated topology sub-components

### Structure

```
TopologyPanel (container)
├── TopologyLayout (layout calculation + rendering)
│   ├── TopologyRow (horizontal arrangement)
│   │   ├── TopologyNode (box with status/role)
│   │   └── ConnectionLine (arrow with lag)
│   └── (repeat for additional rows)
└── (empty state / single node handling)
```

### Responsibilities

| Component | Responsibility |
|-----------|----------------|
| TopologyPanel | Props handling, empty state, single node case |
| TopologyLayout | Multi-node layout, row arrangement, responsive sizing |
| TopologyRow | Single row of nodes with connections |
| TopologyNode | Individual node box rendering |
| ConnectionLine | Line with arrows and lag display |

---

## 10. Selector Design

### Decision: New topology-specific selectors in `store/selectors/topology.ts`

### Selectors

```typescript
// Get all topology edges derived from subscriptions
export const selectTopologyEdges: Selector<TopologyEdge[]>;

// Get node role based on edge analysis
export const selectNodeRole: (nodeId: string) => Selector<NodeRole>;

// Get latest lag for a specific edge
export const selectEdgeLag: (source: string, target: string) => Selector<{
  lagSeconds: number | null;
  lagBytes: number;
}>;

// Get all nodes with their derived topology data
export const selectTopologyNodes: Selector<TopologyNodeData[]>;
```

### Memoization

Use existing selector pattern with stable references:

```typescript
// Memoize edge derivation to prevent re-computation on unrelated state changes
const selectTopologyEdges = createSelector(
  [selectAllSubscriptions, selectReplicationStats],
  (subscriptions, stats) => deriveEdges(subscriptions, stats)
);
```

---

## Summary of Decisions

| Unknown | Decision | Key Rationale |
|---------|----------|---------------|
| Edge derivation | From subscriptions + stats | Uses existing store data |
| ASCII rendering | Ink borderStyle + Unicode | Wide terminal support |
| Layout | Horizontal with responsive wrap | Matches typical topologies |
| Node roles | Derived from edge analysis | No config changes needed |
| Lag colors | 5s warning / 30s critical | Per spec clarification |
| Navigation | Reuse existing j/k | Consistency with other panels |
| Stale display | Dimmed + badge | Per spec FR-013 |
| Native detection | Match app_name to nodeId | Best effort matching |
| Components | Composition hierarchy | Single responsibility |
| Selectors | New topology.ts module | Encapsulated logic |
