# Data Model: Topology Panel

**Feature**: 008-topology-panel | **Date**: 2025-12-24

## Overview

This document defines the data entities, relationships, and state management for the Topology Panel feature. The topology panel is a read-only visualization that derives all data from existing store state.

---

## Entity Definitions

### TopologyEdge

Represents a replication relationship between two nodes.

```typescript
/**
 * A directed edge representing replication flow between nodes.
 * Derived from SubscriptionData and ReplicationStats.
 */
interface TopologyEdge {
  /** Unique identifier: `${sourceNodeId}→${targetNodeId}` */
  id: string;

  /** Node providing data (primary/provider) */
  sourceNodeId: string;

  /** Node receiving data (standby/subscriber) */
  targetNodeId: string;

  /** Direction of replication */
  direction: 'unidirectional' | 'bidirectional';

  /** Type of replication */
  replicationType: 'native' | 'pglogical';

  /** Current lag in seconds (null if unavailable) */
  lagSeconds: number | null;

  /** Current lag in bytes */
  lagBytes: number;

  /** Associated subscription name (pglogical only) */
  subscriptionName: string | null;

  /** Subscription status for this edge */
  status: SubscriptionStatus | 'streaming';
}
```

**Derivation Rules**:
- pglogical edges: Created when `SubscriptionData.providerNode` is non-null and matches a configured node
- Native edges: Created when `ReplicationStats.applicationName` matches a configured node ID
- Bidirectional: When edges exist in both directions between same node pair

---

### NodeRole

Role classification for topology display.

```typescript
/**
 * Role of a node in the replication topology.
 * Derived from edge analysis.
 */
type NodeRole =
  | 'primary'       // Native replication: has standbys connected
  | 'standby'       // Native replication: connected to a primary
  | 'provider'      // pglogical: other nodes subscribe to this node
  | 'subscriber'    // pglogical: subscribes to other providers
  | 'bidirectional' // pglogical: both provider and subscriber
  | 'standalone';   // No replication relationships detected
```

**Detection Logic**:
| Condition | Role |
|-----------|------|
| Has pglogical edges in both directions | `bidirectional` |
| Is source in pglogical edges only | `provider` |
| Is target in pglogical edges only | `subscriber` |
| Is source in native edges | `primary` |
| Is target in native edges | `standby` |
| No edges | `standalone` |

---

### TopologyNodeData

Aggregated node data for rendering.

```typescript
/**
 * Complete node data for topology visualization.
 * Aggregates node info, status, role, and connections.
 */
interface TopologyNodeData {
  /** Node identifier from config */
  nodeId: string;

  /** Display name (same as nodeId) */
  displayName: string;

  /** Host and port for display */
  hostInfo: string;

  /** Connection status */
  connectionStatus: 'connecting' | 'connected' | 'failed' | undefined;

  /** Derived role in topology */
  role: NodeRole;

  /** Whether node data is stale */
  isStale: boolean;

  /** Whether this node is currently selected */
  isSelected: boolean;

  /** Whether node has pglogical installed */
  hasPglogical: boolean;

  /** Outgoing edges (this node is source) */
  outgoingEdges: TopologyEdge[];

  /** Incoming edges (this node is target) */
  incomingEdges: TopologyEdge[];
}
```

---

### LagSeverity

Severity classification for lag display.

```typescript
/**
 * Lag severity for color coding.
 */
type LagSeverity = 'normal' | 'warning' | 'critical' | 'unknown';

/**
 * Determine lag severity based on thresholds.
 */
function getLagSeverity(lagSeconds: number | null): LagSeverity {
  if (lagSeconds === null) return 'unknown';
  if (lagSeconds < 5) return 'normal';
  if (lagSeconds <= 30) return 'warning';
  return 'critical';
}
```

---

### TopologyLayoutConfig

Configuration for topology layout rendering.

```typescript
/**
 * Layout configuration based on terminal size and node count.
 */
interface TopologyLayoutConfig {
  /** Width of each node box in characters */
  nodeWidth: number;

  /** Number of nodes per horizontal row */
  nodesPerRow: number;

  /** Whether to use vertical stacked layout */
  isVertical: boolean;

  /** Width of connection lines between nodes */
  connectionWidth: number;

  /** Current terminal breakpoint */
  breakpoint: 'standard' | 'narrow' | 'short' | 'compact';
}
```

---

## State Derivation

### Source Data (Existing Store)

The topology panel reads from existing store state without modifications:

```typescript
// From ReplicationSliceState
nodes: Map<string, NodeInfo>
subscriptions: Map<string, SubscriptionData[]>
lagHistory: Map<string, LagSample[]>
staleNodes: Set<string>

// From ConnectionSliceState
nodeStatus: Map<string, NodeConnectionStatus>
pglogicalMode: boolean

// From UISliceState
selections: Map<Panel, string | null>  // For 'topology' panel
focusedPanel: Panel
```

### Derived Data (New Selectors)

New selectors compute topology-specific aggregations:

```typescript
// store/selectors/topology.ts

/**
 * Select all topology edges from subscription and stats data.
 * Memoized to prevent recomputation on unrelated state changes.
 */
export const selectTopologyEdges: Selector<TopologyEdge[]>;

/**
 * Select aggregated node data for topology rendering.
 * Includes role, edges, and display state.
 */
export const selectTopologyNodes: Selector<TopologyNodeData[]>;

/**
 * Select role for a specific node.
 */
export const selectNodeRole: (nodeId: string) => Selector<NodeRole>;

/**
 * Select lag data for a specific edge.
 */
export const selectEdgeLag: (sourceId: string, targetId: string) => Selector<{
  lagSeconds: number | null;
  lagBytes: number;
  severity: LagSeverity;
}>;
```

---

## Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Store (Source of Truth)                       │
├──────────────────┬──────────────────┬───────────────────────────────┤
│  ConnectionSlice │ ReplicationSlice │         UISlice               │
│  ─────────────── │ ──────────────── │ ───────────────────────────── │
│  nodeStatus      │ nodes            │ selections                    │
│  pglogicalMode   │ subscriptions    │ focusedPanel                  │
│                  │ lagHistory       │                               │
│                  │ staleNodes       │                               │
└────────┬─────────┴────────┬─────────┴───────────────┬───────────────┘
         │                  │                         │
         ▼                  ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Topology Selectors (Derived)                      │
├─────────────────────────────────────────────────────────────────────┤
│  selectTopologyEdges ──► TopologyEdge[]                             │
│  selectTopologyNodes ──► TopologyNodeData[]                         │
│  selectNodeRole(id) ──► NodeRole                                    │
│  selectEdgeLag(src,tgt) ──► { lagSeconds, lagBytes, severity }      │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TopologyPanel Components                          │
├─────────────────────────────────────────────────────────────────────┤
│  TopologyPanel                                                       │
│    └── TopologyLayout                                               │
│          ├── TopologyRow                                            │
│          │     ├── TopologyNode (reads TopologyNodeData)            │
│          │     └── ConnectionLine (reads TopologyEdge)              │
│          └── (additional rows...)                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

### Edge Validation

| Rule | Validation |
|------|------------|
| Source node exists | `sourceNodeId` must be in `store.nodes` |
| Target node exists | `targetNodeId` must be in `store.nodes` |
| No self-edges | `sourceNodeId !== targetNodeId` |
| Unique edges | One edge per direction per node pair |

### Node Role Validation

| Rule | Validation |
|------|------------|
| Role matches edges | Role must be consistent with edge directions |
| Bidirectional requires pglogical | Can only be `bidirectional` if `hasPglogical` |

---

## State Transitions

### Edge Creation

Edges are created/updated when:
1. `handlePollingData` updates `subscriptions` with new subscription data
2. Polling returns replication stats with connected standbys
3. A subscription's `providerNode` matches a configured node

### Edge Removal

Edges are removed when:
1. Subscription is deleted or disabled
2. Standby disconnects (no longer in `pg_stat_replication`)
3. Node is removed from configuration

### Stale Marking

Nodes are marked stale when:
1. Connection fails and `markNodeStale(nodeId)` is called
2. Node retains last-known data with visual stale indicator
3. Cleared when connection re-establishes via `clearNodeStale(nodeId)`

---

## Performance Considerations

### Selector Memoization

```typescript
// Use createSelector for expensive derivations
import { createSelector } from 'reselect';

const selectTopologyEdges = createSelector(
  [(state) => state.subscriptions, (state) => state.replicationStats],
  (subscriptions, stats) => {
    // Only recomputes when subscriptions or stats change
    return deriveEdges(subscriptions, stats);
  }
);
```

### Render Optimization

- TopologyNode uses `React.memo` to prevent re-render when props unchanged
- ConnectionLine uses `React.memo` with custom comparison for lag thresholds
- TopologyLayout only re-renders when node count or layout config changes

---

## Type File Location

New types will be added to: `src/types/topology.ts`

```typescript
// src/types/topology.ts
export type { TopologyEdge, NodeRole, TopologyNodeData, LagSeverity, TopologyLayoutConfig };
```

Re-exported from `src/types/index.ts` for clean imports.
