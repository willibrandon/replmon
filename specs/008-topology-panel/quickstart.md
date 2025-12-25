# Quickstart: Topology Panel

**Feature**: 008-topology-panel | **Date**: 2025-12-24

## Prerequisites

- Existing replmon development environment
- Node.js 18+ or Bun 1.x
- PostgreSQL test cluster with replication configured

## Implementation Order

### 1. Types (`src/types/topology.ts`)

Create new type definitions:

```typescript
// src/types/topology.ts
export type ReplicationType = 'native' | 'pglogical';
export type NodeRole = 'primary' | 'standby' | 'provider' | 'subscriber' | 'bidirectional' | 'standalone';
export type LagSeverity = 'normal' | 'warning' | 'critical' | 'unknown';
export type EdgeDirection = 'unidirectional' | 'bidirectional';

export interface TopologyEdge { /* ... */ }
export interface TopologyNodeData { /* ... */ }
export interface TopologyLayoutConfig { /* ... */ }
```

Update `src/types/index.ts` to re-export.

### 2. Selectors (`src/store/selectors/topology.ts`)

Create topology-specific selectors:

```typescript
// src/store/selectors/topology.ts
export const selectTopologyEdges: Selector<TopologyEdge[]>;
export const selectTopologyNodes: Selector<TopologyNodeData[]>;
export const selectNodeRole: (nodeId: string) => Selector<NodeRole>;
export const selectEdgeLag: (sourceId: string, targetId: string) => Selector<LagData>;
```

Add to `src/store/selectors/index.ts` exports.

### 3. Utility Functions (`src/utils/topology.ts`)

Create helper functions:

```typescript
// src/utils/topology.ts
export function getLagSeverity(lagSeconds: number | null): LagSeverity;
export function formatLag(lagSeconds: number | null): string;
export function getLagColor(severity: LagSeverity): string;
export function deriveNodeRole(nodeId: string, edges: TopologyEdge[]): NodeRole;
export function getRoleBadgeLabel(role: NodeRole): string;
```

### 4. Layout Hook (`src/hooks/useTopologyLayout.ts`)

Create responsive layout hook:

```typescript
// src/hooks/useTopologyLayout.ts
export function useTopologyLayout(nodeCount: number): TopologyLayoutConfig;
```

### 5. Topology Hook (`src/hooks/useTopology.ts`)

Create data aggregation hook:

```typescript
// src/hooks/useTopology.ts
export function useTopology(config: Configuration): UseTopologyResult;
```

### 6. Sub-Components (`src/components/topology/`)

Create in order:

1. **TopologyNode.tsx** - Individual node box with status, role, host info
2. **ConnectionLine.tsx** - Arrow with optional lag display
3. **TopologyRow.tsx** - Horizontal arrangement of nodes + connections
4. **TopologyLayout.tsx** - Multi-row layout orchestration

### 7. Panel Update (`src/components/panels/TopologyPanel.tsx`)

Enhance existing panel:

```typescript
// Replace current simple list with:
export function TopologyPanel({ config }: TopologyPanelProps): ReactElement {
  const { nodes, edges } = useTopology(config);
  const layout = useTopologyLayout(nodes.length);

  if (nodes.length === 0) return <EmptyState />;
  if (nodes.length === 1) return <SingleNodeView node={nodes[0]} />;

  return <TopologyLayout nodes={nodes} edges={edges} layout={layout} />;
}
```

### 8. Tests (`tests/components/topology/`)

Create test files:

1. `TopologyNode.test.tsx` - Node rendering, selection, stale state
2. `ConnectionLine.test.tsx` - Direction, lag display, colors
3. `TopologyPanel.test.tsx` - Integration with store

## Development Commands

```bash
# Run tests
bun test tests/components/topology/

# Type check
bun run typecheck

# Run development
bun run dev
```

## Verification Checklist

- [ ] Single node displays correctly (no connection lines)
- [ ] Two nodes with subscription show connection arrow
- [ ] Bidirectional pglogical shows double-headed arrow
- [ ] Lag colors: green (<5s), yellow (5-30s), red (>30s)
- [ ] j/k navigation selects different nodes
- [ ] Stale nodes appear dimmed with badge
- [ ] Narrow terminal wraps to vertical layout
- [ ] Selected node has visual highlight

## Example Test Data

For manual testing, configure `replmon.yaml`:

```yaml
nodes:
  primary:
    host: localhost
    port: 28818
    database: postgres
  standby:
    host: localhost
    port: 28819
    database: postgres
```

## File Checklist

New files to create:

```
src/
├── types/
│   └── topology.ts          # New
├── hooks/
│   ├── useTopology.ts       # New
│   └── useTopologyLayout.ts # New
├── utils/
│   └── topology.ts          # New
├── store/
│   └── selectors/
│       └── topology.ts      # New
└── components/
    └── topology/
        ├── TopologyNode.tsx      # New
        ├── ConnectionLine.tsx    # New
        ├── TopologyRow.tsx       # New
        ├── TopologyLayout.tsx    # New
        └── index.ts              # New (barrel export)

tests/
└── components/
    └── topology/
        ├── TopologyNode.test.tsx   # New
        ├── ConnectionLine.test.tsx # New
        └── TopologyPanel.test.tsx  # New
```

Files to modify:

```
src/
├── types/index.ts               # Add topology exports
├── store/selectors/index.ts     # Add topology selectors
└── components/panels/
    └── TopologyPanel.tsx        # Enhanced implementation
```
