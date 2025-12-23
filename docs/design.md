# replmon: PostgreSQL Logical Replication Monitor TUI

## Complete Technical Design Proposal

**Version:** 1.0  
**Stack:** TypeScript + React + Ink + Yoga  
**Inspired by:** Claude Code's architecture

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Technology Stack](#4-technology-stack)
5. [Architecture](#5-architecture)
6. [Component Design](#6-component-design)
7. [Data Layer](#7-data-layer)
8. [State Management](#8-state-management)
9. [User Interface Design](#9-user-interface-design)
10. [Key Features](#10-key-features)
11. [Project Structure](#11-project-structure)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Distribution Strategy](#13-distribution-strategy)

---

## 1. Executive Summary

**replmon** is a terminal user interface (TUI) application for monitoring and managing PostgreSQL logical replication, with first-class support for pglogical bidirectional replication setups. Built using the same technology stack as Claude Code (TypeScript, React, Ink, Yoga), it brings a modern, declarative UI paradigm to database operations tooling.

### Why This Stack?

| Factor | Benefit |
|--------|---------|
| **TypeScript** | Type safety, excellent IDE support, catches errors at compile time |
| **React + Ink** | Declarative UI, component reusability, familiar patterns for web developers |
| **Yoga Layout** | Flexbox-based responsive layouts that adapt to any terminal size |
| **Bun** | Fast builds, native TypeScript execution, excellent npm compatibility |
| **AI-Friendly** | Claude and other LLMs are highly capable with this stack ("on distribution") |

---

## 2. Problem Statement

### Current Pain Points

1. **Fragmented Monitoring**: DBAs must query multiple system views (`pg_stat_replication`, `pg_stat_subscription`, `pglogical.show_subscription_status()`) manually

2. **No Real-time Visibility**: Existing tools provide point-in-time snapshots, not live streaming updates

3. **Conflict Blindness**: pglogical conflicts are logged but not surfaced proactively; operators discover issues after data divergence

4. **Multi-node Complexity**: Bidirectional replication topologies are hard to visualize and reason about

5. **Operational Friction**: Common tasks (pause subscription, resync table, check slot health) require remembering SQL incantations

### Target Users

- Database administrators managing PostgreSQL logical replication
- DevOps engineers monitoring pglogical/BDR clusters
- Developers working with event-driven architectures using logical decoding
- On-call engineers responding to replication lag alerts

---

## 3. Solution Overview

### Core Value Proposition

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              replmon v1.0                                   │
│         Real-time PostgreSQL Logical Replication Monitoring                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ Cluster Topology ───────────────────────────────────────────────────┐   │
│  │                                                                       │   │
│  │       ┌──────────┐    2ms     ┌──────────┐    45ms    ┌──────────┐   │   │
│  │       │ us-east  │◄──────────►│ eu-west  │◄──────────►│ ap-south │   │   │
│  │       │ PRIMARY  │            │ PROVIDER │            │  STANDBY │   │   │
│  │       │ ● online │            │ ● online │            │ ● online │   │   │
│  │       └──────────┘            └──────────┘            └──────────┘   │   │
│  │                                                                       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ Subscriptions ──────────────────┐  ┌─ Replication Slots ─────────────┐  │
│  │                                   │  │                                 │  │
│  │  sub_us_to_eu    ● replicating   │  │  slot_us_east   ████████░░  78% │  │
│  │  sub_eu_to_us    ● replicating   │  │  slot_eu_west   ██████████ 100% │  │
│  │  sub_eu_to_ap    ○ catchup       │  │  slot_ap_south  ██████░░░░  62% │  │
│  │  sub_ap_to_eu    ● replicating   │  │                                 │  │
│  │                                   │  │  WAL Retention: 2.4 GB          │  │
│  └───────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  ┌─ Lag Timeline (5 min) ───────────────────────────────────────────────┐   │
│  │  100ms ┤                                                              │   │
│  │   50ms ┤      ╱╲        ╱╲                                           │   │
│  │    0ms ┼─────╱──╲──────╱──╲──────────────────────────────────────────│   │
│  │        └─────────────────────────────────────────────────────────────│   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ Recent Conflicts ───────────────────────────────────────────────────┐   │
│  │  🔴 12:34:56  UPDATE/UPDATE  orders.items     → last_update_wins     │   │
│  │  🟡 12:33:21  INSERT/INSERT  users.profiles   → keep_local           │   │
│  │  🟢 12:30:00  No conflicts in last 5 minutes                         │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [t]opology  [s]ubscriptions  [l]ag  [c]onflicts  [o]perations  [q]uit     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Differentiators

1. **Live Streaming**: WebSocket-like polling with configurable intervals (default 1s)
2. **Topology Visualization**: ASCII-art node graphs showing replication relationships
3. **Conflict Alerting**: Parse pglogical conflict logs and surface them prominently
4. **Operational Commands**: Built-in actions for common DBA tasks
5. **Multi-cluster Support**: Switch between different replication clusters easily

---

## 4. Technology Stack

### Core Dependencies

```json
{
  "dependencies": {
    "ink": "^5.0.1",
    "ink-spinner": "^5.0.0",
    "ink-text-input": "^6.0.0",
    "ink-select-input": "^6.0.0",
    "ink-table": "^4.0.0",
    "react": "^18.3.1",
    "pg": "^8.13.0",
    "pg-pool": "^3.7.0",
    "date-fns": "^4.1.0",
    "chalk": "^5.3.0",
    "conf": "^13.0.1",
    "meow": "^13.2.0",
    "figures": "^6.1.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pg": "^8.11.0",
    "@types/react": "^18.3.0",
    "typescript": "^5.6.0",
    "bun": "^1.1.0",
    "ink-testing-library": "^4.0.0",
    "@inkjs/ui": "^2.0.0"
  }
}
```

### Why Each Choice?

| Package | Purpose | Rationale |
|---------|---------|-----------|
| `ink` | React renderer for CLI | Proven in production (Gatsby, Yarn, Claude Code) |
| `pg` / `pg-pool` | PostgreSQL client | De facto standard, connection pooling built-in |
| `zustand` | State management | Lightweight, hooks-based, perfect for TUI scale |
| `conf` | Config persistence | Simple JSON config storage, XDG-compliant |
| `meow` | CLI argument parsing | Clean API, TypeScript support |
| `@inkjs/ui` | Pre-built components | Spinners, selects, inputs out of the box |
| `bun` | Runtime & bundler | 3x faster than Node for builds, native TS |

---

## 5. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              replmon Architecture                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         UI Layer (Ink/React)                         │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │ Topology │ │  Slots   │ │   Lag    │ │Conflicts │ │Operations│   │    │
│  │  │  Panel   │ │  Panel   │ │  Chart   │ │  Panel   │ │  Modal   │   │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │    │
│  │       │            │            │            │            │          │    │
│  │       └────────────┴─────┬──────┴────────────┴────────────┘          │    │
│  │                          │                                           │    │
│  └──────────────────────────┼───────────────────────────────────────────┘    │
│                             │                                                │
│  ┌──────────────────────────┼───────────────────────────────────────────┐    │
│  │                    State Layer (Zustand)                              │    │
│  │  ┌────────────┐   ┌─────┴──────┐   ┌────────────┐   ┌────────────┐   │    │
│  │  │ Connection │   │ Replication│   │  Conflict  │   │    UI      │   │    │
│  │  │   Store    │   │   Store    │   │   Store    │   │   Store    │   │    │
│  │  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └────────────┘   │    │
│  │        │                │                │                           │    │
│  └────────┼────────────────┼────────────────┼───────────────────────────┘    │
│           │                │                │                                │
│  ┌────────┼────────────────┼────────────────┼───────────────────────────┐    │
│  │        │          Data Layer             │                            │    │
│  │  ┌─────┴──────┐   ┌─────┴──────┐   ┌─────┴──────┐                    │    │
│  │  │ PostgreSQL │   │  Polling   │   │   Query    │                    │    │
│  │  │   Client   │   │  Service   │   │  Builder   │                    │    │
│  │  └─────┬──────┘   └────────────┘   └────────────┘                    │    │
│  │        │                                                              │    │
│  └────────┼──────────────────────────────────────────────────────────────┘    │
│           │                                                                   │
│           ▼                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│  │   PostgreSQL    │  │   PostgreSQL    │  │   PostgreSQL    │               │
│  │   Node (us)     │  │   Node (eu)     │  │   Node (ap)     │               │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            Data Flow Diagram                              │
└──────────────────────────────────────────────────────────────────────────┘

  1. Initialization
  ┌─────────┐      ┌──────────┐      ┌───────────┐      ┌──────────────┐
  │  CLI    │─────►│  Config  │─────►│ Connection │─────►│  Pool Setup  │
  │  Args   │      │  Load    │      │  Validate  │      │  Per Node    │
  └─────────┘      └──────────┘      └───────────┘      └──────────────┘

  2. Polling Loop (every 1s default)
  ┌──────────────┐     ┌───────────────┐     ┌───────────────┐
  │   Interval   │────►│ Query All     │────►│ Merge Results │
  │   Trigger    │     │ Nodes Parallel│     │ Into Store    │
  └──────────────┘     └───────────────┘     └───────────────┘
                                                     │
                                                     ▼
  3. React Render Cycle                    ┌───────────────┐
  ┌──────────────┐     ┌──────────────┐    │ Zustand Store │
  │ useStore()   │◄────│  Subscriber  │◄───│   Update      │
  │ in Component │     │  Notifies    │    └───────────────┘
  └──────────────┘     └──────────────┘
         │
         ▼
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │  Component   │────►│ Ink Renders  │────►│  Terminal    │
  │  Re-render   │     │  to String   │     │  Output      │
  └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 6. Component Design

### Component Hierarchy

```
<App>
├── <ThemeProvider>
│   ├── <Header>
│   │   ├── <ClusterSelector />
│   │   ├── <StatusIndicator />
│   │   └── <Clock />
│   │
│   ├── <MainLayout>
│   │   ├── <TopologyPanel>
│   │   │   ├── <NodeGraph />
│   │   │   └── <ConnectionLines />
│   │   │
│   │   ├── <SplitView>
│   │   │   ├── <SubscriptionsPanel>
│   │   │   │   ├── <SubscriptionList />
│   │   │   │   └── <SubscriptionDetail />
│   │   │   │
│   │   │   └── <SlotsPanel>
│   │   │       ├── <SlotList />
│   │   │       └── <WalRetention />
│   │   │
│   │   ├── <LagChart>
│   │   │   ├── <Sparkline />
│   │   │   └── <LagStats />
│   │   │
│   │   └── <ConflictsPanel>
│   │       ├── <ConflictList />
│   │       └── <ConflictDetail />
│   │
│   ├── <Footer>
│   │   └── <KeybindingHints />
│   │
│   └── <Modals>
│       ├── <OperationsModal />
│       ├── <ConnectionModal />
│       ├── <HelpModal />
│       └── <ConfirmationModal />
│
└── <ErrorBoundary />
```

### Core Component Interfaces

```typescript
// src/types/components.ts

export interface NodeData {
  id: string;
  name: string;
  host: string;
  port: number;
  role: 'provider' | 'subscriber' | 'bidirectional';
  status: 'online' | 'offline' | 'lagging' | 'catchup';
  lagMs: number | null;
}

export interface SubscriptionData {
  name: string;
  nodeId: string;
  status: 'replicating' | 'catchup' | 'down' | 'disabled';
  receivedLsn: string;
  replayedLsn: string;
  lagBytes: number;
  lagTime: string | null;
  provider: string;
}

export interface SlotData {
  name: string;
  nodeId: string;
  type: 'logical' | 'physical';
  active: boolean;
  retainedWalBytes: number;
  confirmedFlushLsn: string;
  walStatus: 'healthy' | 'warning' | 'critical';
}

export interface ConflictData {
  timestamp: Date;
  nodeId: string;
  type: 'update_update' | 'insert_insert' | 'update_delete' | 'delete_update';
  table: string;
  resolution: string;
  details: Record<string, unknown>;
}

export interface LagSample {
  timestamp: Date;
  nodeId: string;
  lagMs: number;
}
```

### Example Component Implementation

```tsx
// src/components/panels/SubscriptionsPanel.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { StatusDot } from '../atoms/StatusDot';
import { Panel } from '../layout/Panel';

interface SubscriptionsPanelProps {
  focused?: boolean;
  onSelect?: (subscription: string) => void;
}

export const SubscriptionsPanel: React.FC<SubscriptionsPanelProps> = ({
  focused = false,
  onSelect,
}) => {
  const { subscriptions, loading, error } = useSubscriptions();

  const statusColor = (status: string) => {
    switch (status) {
      case 'replicating': return 'green';
      case 'catchup': return 'yellow';
      case 'down': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Panel 
      title="Subscriptions" 
      focused={focused}
      borderColor={focused ? 'blue' : 'gray'}
    >
      {loading && <Text color="gray">Loading...</Text>}
      {error && <Text color="red">Error: {error.message}</Text>}
      
      {subscriptions.map((sub, index) => (
        <Box key={sub.name} flexDirection="row" gap={1}>
          <StatusDot status={sub.status} />
          <Text 
            color={focused && index === 0 ? 'blue' : undefined}
            bold={focused && index === 0}
          >
            {sub.name.padEnd(20)}
          </Text>
          <Text color={statusColor(sub.status)}>
            {sub.status}
          </Text>
          {sub.lagTime && (
            <Text color="yellow"> ({sub.lagTime})</Text>
          )}
        </Box>
      ))}
    </Panel>
  );
};
```

---

## 7. Data Layer

### PostgreSQL Query Service

```typescript
// src/services/queries.ts

export const QUERIES = {
  // Native PostgreSQL logical replication (v10+)
  STAT_REPLICATION: `
    SELECT 
      pid,
      usename,
      application_name,
      client_addr,
      state,
      sent_lsn,
      write_lsn,
      flush_lsn,
      replay_lsn,
      write_lag,
      flush_lag,
      replay_lag,
      sync_state,
      reply_time
    FROM pg_stat_replication
    ORDER BY application_name
  `,

  STAT_SUBSCRIPTION: `
    SELECT 
      subid,
      subname,
      pid,
      received_lsn,
      last_msg_send_time,
      last_msg_receipt_time,
      latest_end_lsn,
      latest_end_time
    FROM pg_stat_subscription
    WHERE subname IS NOT NULL
  `,

  REPLICATION_SLOTS: `
    SELECT 
      slot_name,
      plugin,
      slot_type,
      active,
      active_pid,
      xmin,
      catalog_xmin,
      restart_lsn,
      confirmed_flush_lsn,
      wal_status,
      pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as retained_wal
    FROM pg_replication_slots
    ORDER BY slot_name
  `,

  // pglogical-specific queries
  PGLOGICAL_SUBSCRIPTIONS: `
    SELECT 
      sub.sub_name,
      sub.sub_enabled,
      sub.sub_slot_name,
      stat.subscription_name,
      stat.status,
      stat.received_lsn,
      stat.replay_lag,
      stat.last_received_change,
      stat.pending_changes
    FROM pglogical.subscription sub
    LEFT JOIN pglogical.show_subscription_status() stat 
      ON sub.sub_name = stat.subscription_name
  `,

  PGLOGICAL_NODES: `
    SELECT 
      node_id,
      node_name,
      if_dsn
    FROM pglogical.node
    JOIN pglogical.node_interface ON node_id = if_nodeid
  `,

  PGLOGICAL_REPLICATION_SETS: `
    SELECT 
      set_id,
      set_name,
      set_nodeid,
      set_replicate_insert,
      set_replicate_update,
      set_replicate_delete,
      set_replicate_truncate
    FROM pglogical.replication_set
  `,

  // Conflict detection (requires custom logging setup)
  RECENT_CONFLICTS: `
    SELECT 
      conflict_time,
      conflict_type,
      conflict_resolution,
      local_origin,
      local_tuple,
      remote_origin,
      remote_tuple,
      table_schema,
      table_name
    FROM pglogical.conflict_log
    WHERE conflict_time > NOW() - INTERVAL '1 hour'
    ORDER BY conflict_time DESC
    LIMIT 50
  `,

  // WAL status and disk usage
  WAL_STATUS: `
    SELECT 
      pg_current_wal_lsn() as current_lsn,
      pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0') as total_wal_bytes,
      pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), 
        (SELECT MIN(restart_lsn) FROM pg_replication_slots WHERE restart_lsn IS NOT NULL)
      )) as retained_wal_size,
      (SELECT count(*) FROM pg_ls_waldir()) as wal_files_count
  `,

  // Calculate byte lag from LSN
  CALCULATE_LAG: `
    SELECT pg_wal_lsn_diff($1::pg_lsn, $2::pg_lsn) as lag_bytes
  `,
};
```

### Connection Pool Manager

```typescript
// src/services/ConnectionManager.ts

import { Pool, PoolConfig, QueryResult } from 'pg';
import { NodeConfig } from '../types';

export class ConnectionManager {
  private pools: Map<string, Pool> = new Map();
  private healthStatus: Map<string, boolean> = new Map();

  async addNode(nodeId: string, config: NodeConfig): Promise<void> {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      max: 3, // Small pool per node
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    const pool = new Pool(poolConfig);
    
    // Test connection
    try {
      await pool.query('SELECT 1');
      this.healthStatus.set(nodeId, true);
    } catch (error) {
      this.healthStatus.set(nodeId, false);
      throw new Error(`Failed to connect to ${nodeId}: ${error}`);
    }

    this.pools.set(nodeId, pool);
  }

  async query<T>(nodeId: string, sql: string, params?: unknown[]): Promise<T[]> {
    const pool = this.pools.get(nodeId);
    if (!pool) {
      throw new Error(`No connection pool for node: ${nodeId}`);
    }

    try {
      const result = await pool.query(sql, params);
      this.healthStatus.set(nodeId, true);
      return result.rows as T[];
    } catch (error) {
      this.healthStatus.set(nodeId, false);
      throw error;
    }
  }

  async queryAll<T>(sql: string, params?: unknown[]): Promise<Map<string, T[]>> {
    const results = new Map<string, T[]>();
    
    await Promise.all(
      Array.from(this.pools.keys()).map(async (nodeId) => {
        try {
          const rows = await this.query<T>(nodeId, sql, params);
          results.set(nodeId, rows);
        } catch (error) {
          results.set(nodeId, []);
          console.error(`Query failed on ${nodeId}:`, error);
        }
      })
    );

    return results;
  }

  isHealthy(nodeId: string): boolean {
    return this.healthStatus.get(nodeId) ?? false;
  }

  async close(): Promise<void> {
    await Promise.all(
      Array.from(this.pools.values()).map((pool) => pool.end())
    );
    this.pools.clear();
    this.healthStatus.clear();
  }
}
```

### Polling Service

```typescript
// src/services/PollingService.ts

import { EventEmitter } from 'events';
import { ConnectionManager } from './ConnectionManager';
import { QUERIES } from './queries';
import { 
  ReplicationData, 
  SubscriptionData, 
  SlotData, 
  ConflictData 
} from '../types';

interface PollResult {
  timestamp: Date;
  replication: Map<string, ReplicationData[]>;
  subscriptions: Map<string, SubscriptionData[]>;
  slots: Map<string, SlotData[]>;
  conflicts: Map<string, ConflictData[]>;
}

export class PollingService extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null;
  private connectionManager: ConnectionManager;
  private pollIntervalMs: number;
  private isPglogical: boolean;

  constructor(
    connectionManager: ConnectionManager,
    options: { pollIntervalMs?: number; isPglogical?: boolean } = {}
  ) {
    super();
    this.connectionManager = connectionManager;
    this.pollIntervalMs = options.pollIntervalMs ?? 1000;
    this.isPglogical = options.isPglogical ?? false;
  }

  start(): void {
    if (this.intervalId) return;

    // Initial poll
    this.poll();

    // Start interval
    this.intervalId = setInterval(() => {
      this.poll();
    }, this.pollIntervalMs);

    this.emit('started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.emit('stopped');
    }
  }

  private async poll(): Promise<void> {
    const timestamp = new Date();

    try {
      const [replication, subscriptions, slots, conflicts] = await Promise.all([
        this.connectionManager.queryAll<ReplicationData>(QUERIES.STAT_REPLICATION),
        this.isPglogical
          ? this.connectionManager.queryAll<SubscriptionData>(QUERIES.PGLOGICAL_SUBSCRIPTIONS)
          : this.connectionManager.queryAll<SubscriptionData>(QUERIES.STAT_SUBSCRIPTION),
        this.connectionManager.queryAll<SlotData>(QUERIES.REPLICATION_SLOTS),
        this.isPglogical
          ? this.connectionManager.queryAll<ConflictData>(QUERIES.RECENT_CONFLICTS)
          : new Map<string, ConflictData[]>(),
      ]);

      const result: PollResult = {
        timestamp,
        replication,
        subscriptions,
        slots,
        conflicts,
      };

      this.emit('data', result);
    } catch (error) {
      this.emit('error', error);
    }
  }

  setPollInterval(ms: number): void {
    this.pollIntervalMs = ms;
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }
}
```

---

## 8. State Management

### Zustand Store Design

```typescript
// src/store/index.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  NodeData, 
  SubscriptionData, 
  SlotData, 
  ConflictData, 
  LagSample 
} from '../types';

interface ReplicationState {
  // Connection state
  nodes: Map<string, NodeData>;
  activeCluster: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectionError: Error | null;

  // Replication data
  subscriptions: SubscriptionData[];
  slots: SlotData[];
  conflicts: ConflictData[];
  lagHistory: LagSample[];
  lastUpdated: Date | null;

  // UI state
  focusedPanel: 'topology' | 'subscriptions' | 'slots' | 'conflicts' | 'operations';
  selectedSubscription: string | null;
  selectedSlot: string | null;
  modalOpen: string | null;
  theme: 'default' | 'minimal' | 'colorful';

  // Actions
  setNodes: (nodes: Map<string, NodeData>) => void;
  updateNode: (nodeId: string, data: Partial<NodeData>) => void;
  setSubscriptions: (subscriptions: SubscriptionData[]) => void;
  setSlots: (slots: SlotData[]) => void;
  addConflict: (conflict: ConflictData) => void;
  clearConflicts: () => void;
  addLagSample: (sample: LagSample) => void;
  setFocusedPanel: (panel: ReplicationState['focusedPanel']) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  reset: () => void;
}

const MAX_LAG_SAMPLES = 300; // 5 minutes at 1s intervals

export const useStore = create<ReplicationState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    nodes: new Map(),
    activeCluster: null,
    connectionStatus: 'disconnected',
    connectionError: null,
    subscriptions: [],
    slots: [],
    conflicts: [],
    lagHistory: [],
    lastUpdated: null,
    focusedPanel: 'topology',
    selectedSubscription: null,
    selectedSlot: null,
    modalOpen: null,
    theme: 'default',

    // Actions
    setNodes: (nodes) => set({ nodes }),
    
    updateNode: (nodeId, data) => set((state) => {
      const nodes = new Map(state.nodes);
      const existing = nodes.get(nodeId);
      if (existing) {
        nodes.set(nodeId, { ...existing, ...data });
      }
      return { nodes };
    }),

    setSubscriptions: (subscriptions) => set({ 
      subscriptions, 
      lastUpdated: new Date() 
    }),

    setSlots: (slots) => set({ slots }),

    addConflict: (conflict) => set((state) => ({
      conflicts: [conflict, ...state.conflicts].slice(0, 100),
    })),

    clearConflicts: () => set({ conflicts: [] }),

    addLagSample: (sample) => set((state) => ({
      lagHistory: [...state.lagHistory, sample].slice(-MAX_LAG_SAMPLES),
    })),

    setFocusedPanel: (panel) => set({ focusedPanel: panel }),

    openModal: (modal) => set({ modalOpen: modal }),

    closeModal: () => set({ modalOpen: null }),

    reset: () => set({
      nodes: new Map(),
      subscriptions: [],
      slots: [],
      conflicts: [],
      lagHistory: [],
      lastUpdated: null,
      connectionStatus: 'disconnected',
    }),
  }))
);

// Derived selectors
export const useNodes = () => useStore((state) => Array.from(state.nodes.values()));
export const useSubscriptions = () => useStore((state) => state.subscriptions);
export const useSlots = () => useStore((state) => state.slots);
export const useConflicts = () => useStore((state) => state.conflicts);
export const useLagHistory = () => useStore((state) => state.lagHistory);
export const useConnectionStatus = () => useStore((state) => state.connectionStatus);
```

### Custom Hooks

```typescript
// src/hooks/useKeyboardNavigation.ts

import { useInput } from 'ink';
import { useStore } from '../store';

const PANELS = ['topology', 'subscriptions', 'slots', 'conflicts', 'operations'] as const;

export const useKeyboardNavigation = () => {
  const { focusedPanel, setFocusedPanel, openModal, modalOpen } = useStore();

  useInput((input, key) => {
    // Don't handle input if modal is open
    if (modalOpen) return;

    // Panel navigation
    if (key.tab) {
      const currentIndex = PANELS.indexOf(focusedPanel);
      const nextIndex = key.shift 
        ? (currentIndex - 1 + PANELS.length) % PANELS.length
        : (currentIndex + 1) % PANELS.length;
      setFocusedPanel(PANELS[nextIndex]);
      return;
    }

    // Shortcut keys
    switch (input.toLowerCase()) {
      case 't':
        setFocusedPanel('topology');
        break;
      case 's':
        setFocusedPanel('subscriptions');
        break;
      case 'l':
        setFocusedPanel('slots');
        break;
      case 'c':
        setFocusedPanel('conflicts');
        break;
      case 'o':
        openModal('operations');
        break;
      case 'h':
      case '?':
        openModal('help');
        break;
      case 'q':
        process.exit(0);
    }
  });
};

// src/hooks/usePolling.ts

import { useEffect, useRef } from 'react';
import { PollingService } from '../services/PollingService';
import { useStore } from '../store';

export const usePolling = (connectionManager: ConnectionManager, enabled: boolean = true) => {
  const pollingService = useRef<PollingService | null>(null);
  const { setSubscriptions, setSlots, addConflict, addLagSample } = useStore();

  useEffect(() => {
    if (!enabled || !connectionManager) return;

    pollingService.current = new PollingService(connectionManager, {
      pollIntervalMs: 1000,
      isPglogical: true,
    });

    pollingService.current.on('data', (result) => {
      // Process and update store
      const allSubscriptions: SubscriptionData[] = [];
      result.subscriptions.forEach((subs) => allSubscriptions.push(...subs));
      setSubscriptions(allSubscriptions);

      const allSlots: SlotData[] = [];
      result.slots.forEach((slots) => allSlots.push(...slots));
      setSlots(allSlots);

      // Process conflicts
      result.conflicts.forEach((conflicts, nodeId) => {
        conflicts.forEach((conflict) => {
          addConflict({ ...conflict, nodeId });
        });
      });

      // Calculate and record lag samples
      result.replication.forEach((reps, nodeId) => {
        reps.forEach((rep) => {
          if (rep.replay_lag) {
            const lagMs = parseInterval(rep.replay_lag);
            addLagSample({ timestamp: result.timestamp, nodeId, lagMs });
          }
        });
      });
    });

    pollingService.current.start();

    return () => {
      pollingService.current?.stop();
    };
  }, [connectionManager, enabled]);

  return pollingService.current;
};

function parseInterval(interval: string): number {
  // Parse PostgreSQL interval to milliseconds
  const match = interval.match(/(\d+):(\d+):(\d+\.?\d*)/);
  if (!match) return 0;
  const [, hours, minutes, seconds] = match;
  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseFloat(seconds) * 1000
  );
}
```

---

## 9. User Interface Design

### Layout System

Using Yoga (via Ink), we implement responsive flexbox layouts:

```tsx
// src/components/layout/MainLayout.tsx

import React from 'react';
import { Box } from 'ink';
import { useTerminalSize } from '../../hooks/useTerminalSize';

interface MainLayoutProps {
  header: React.ReactNode;
  left: React.ReactNode;
  right: React.ReactNode;
  bottom: React.ReactNode;
  footer: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  header,
  left,
  right,
  bottom,
  footer,
}) => {
  const { columns, rows } = useTerminalSize();
  
  // Responsive breakpoints
  const isNarrow = columns < 100;
  const isShort = rows < 30;

  return (
    <Box flexDirection="column" height={rows}>
      {/* Header - fixed height */}
      <Box height={3} flexShrink={0}>
        {header}
      </Box>

      {/* Main content area */}
      <Box flexGrow={1} flexDirection="column">
        {/* Top section - topology or split view */}
        <Box 
          flexDirection={isNarrow ? 'column' : 'row'} 
          height={isShort ? '40%' : '50%'}
        >
          <Box width={isNarrow ? '100%' : '50%'} flexShrink={0}>
            {left}
          </Box>
          <Box width={isNarrow ? '100%' : '50%'} flexShrink={0}>
            {right}
          </Box>
        </Box>

        {/* Bottom section - lag chart and conflicts */}
        <Box height={isShort ? '60%' : '50%'}>
          {bottom}
        </Box>
      </Box>

      {/* Footer - keybinding hints */}
      <Box height={1} flexShrink={0}>
        {footer}
      </Box>
    </Box>
  );
};
```

### Theming System

```typescript
// src/theme/index.ts

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    muted: string;
    border: string;
    focusBorder: string;
    text: string;
    textMuted: string;
  };
  borders: {
    panel: 'single' | 'double' | 'round' | 'bold';
  };
  spacing: {
    panelPadding: number;
    itemGap: number;
  };
}

export const defaultTheme: Theme = {
  colors: {
    primary: '#7C3AED',    // Purple
    secondary: '#06B6D4',  // Cyan
    success: '#10B981',    // Green
    warning: '#F59E0B',    // Amber
    error: '#EF4444',      // Red
    muted: '#6B7280',      // Gray
    border: '#374151',     // Gray-700
    focusBorder: '#7C3AED',
    text: '#F9FAFB',       // Gray-50
    textMuted: '#9CA3AF',  // Gray-400
  },
  borders: {
    panel: 'round',
  },
  spacing: {
    panelPadding: 1,
    itemGap: 1,
  },
};

export const minimalTheme: Theme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: 'white',
    border: 'gray',
    focusBorder: 'white',
  },
  borders: {
    panel: 'single',
  },
};

// Theme context
import React, { createContext, useContext } from 'react';

const ThemeContext = createContext<Theme>(defaultTheme);

export const ThemeProvider: React.FC<{ theme?: Theme; children: React.ReactNode }> = ({
  theme = defaultTheme,
  children,
}) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);

export const useTheme = () => useContext(ThemeContext);
```

### Sparkline Chart Component

```tsx
// src/components/charts/Sparkline.tsx

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../theme';

interface SparklineProps {
  data: number[];
  width: number;
  height: number;
  min?: number;
  max?: number;
  showAxis?: boolean;
  color?: string;
}

const BRAILLE_CHARS = [
  '⠀', '⢀', '⢠', '⢰', '⢸',
  '⡀', '⣀', '⣠', '⣰', '⣸',
  '⡄', '⣄', '⣤', '⣴', '⣼',
  '⡆', '⣆', '⣦', '⣶', '⣾',
  '⡇', '⣇', '⣧', '⣷', '⣿',
];

// Alternative: simple block chars for wider compatibility
const BLOCK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width,
  height,
  min: minOverride,
  max: maxOverride,
  showAxis = true,
  color,
}) => {
  const theme = useTheme();
  const chartColor = color ?? theme.colors.primary;

  const { normalizedData, min, max } = useMemo(() => {
    if (data.length === 0) return { normalizedData: [], min: 0, max: 0 };

    const min = minOverride ?? Math.min(...data);
    const max = maxOverride ?? Math.max(...data);
    const range = max - min || 1;

    // Resample data to fit width
    const step = data.length / width;
    const resampled: number[] = [];
    for (let i = 0; i < width; i++) {
      const startIdx = Math.floor(i * step);
      const endIdx = Math.floor((i + 1) * step);
      const slice = data.slice(startIdx, endIdx);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      resampled.push(avg);
    }

    // Normalize to 0-7 for block chars
    const normalized = resampled.map((v) => 
      Math.round(((v - min) / range) * 7)
    );

    return { normalizedData: normalized, min, max };
  }, [data, width, minOverride, maxOverride]);

  const chartLine = normalizedData
    .map((level) => BLOCK_CHARS[Math.min(level, 7)])
    .join('');

  return (
    <Box flexDirection="column">
      {showAxis && (
        <Box justifyContent="space-between" width={width + 6}>
          <Text color={theme.colors.textMuted}>{formatMs(max)}</Text>
        </Box>
      )}
      <Box>
        <Text color={chartColor}>{chartLine}</Text>
      </Box>
      {showAxis && (
        <Box justifyContent="space-between" width={width + 6}>
          <Text color={theme.colors.textMuted}>{formatMs(min)}</Text>
        </Box>
      )}
    </Box>
  );
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
```

### ASCII Topology Graph

```tsx
// src/components/topology/TopologyGraph.tsx

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useNodes } from '../../store';
import { NodeData } from '../../types';
import { useTheme } from '../../theme';

interface TopologyGraphProps {
  width: number;
  height: number;
}

export const TopologyGraph: React.FC<TopologyGraphProps> = ({ width, height }) => {
  const nodes = useNodes();
  const theme = useTheme();

  const graph = useMemo(() => {
    if (nodes.length === 0) {
      return ['No nodes configured'];
    }

    // Simple horizontal layout for now
    const nodeWidth = 14;
    const connectionWidth = 8;
    const lines: string[] = [];

    // Top border of nodes
    let line1 = '';
    let line2 = '';
    let line3 = '';
    let line4 = '';
    let line5 = '';

    nodes.forEach((node, idx) => {
      const isLast = idx === nodes.length - 1;
      const statusChar = node.status === 'online' ? '●' : '○';
      const statusColor = getStatusColor(node.status, theme);

      // Node box
      line1 += '┌' + '─'.repeat(nodeWidth - 2) + '┐';
      line2 += '│' + centerText(node.name, nodeWidth - 2) + '│';
      line3 += '│' + centerText(node.role.toUpperCase(), nodeWidth - 2) + '│';
      line4 += '│' + centerText(`${statusChar} ${node.status}`, nodeWidth - 2) + '│';
      line5 += '└' + '─'.repeat(nodeWidth - 2) + '┘';

      // Connection to next node
      if (!isLast) {
        const lagText = node.lagMs !== null ? `${node.lagMs}ms` : '?';
        line1 += ' '.repeat(connectionWidth);
        line2 += '◄' + '─'.repeat(connectionWidth - 2) + '►';
        line3 += centerText(lagText, connectionWidth);
        line4 += ' '.repeat(connectionWidth);
        line5 += ' '.repeat(connectionWidth);
      }
    });

    return [line1, line2, line3, line4, line5];
  }, [nodes, theme]);

  return (
    <Box flexDirection="column" paddingX={1}>
      {graph.map((line, idx) => (
        <Text key={idx}>{line}</Text>
      ))}
    </Box>
  );
};

function centerText(text: string, width: number): string {
  const padding = width - text.length;
  if (padding <= 0) return text.slice(0, width);
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return ' '.repeat(left) + text + ' '.repeat(right);
}

function getStatusColor(status: NodeData['status'], theme: Theme): string {
  switch (status) {
    case 'online': return theme.colors.success;
    case 'lagging': return theme.colors.warning;
    case 'catchup': return theme.colors.warning;
    case 'offline': return theme.colors.error;
    default: return theme.colors.muted;
  }
}
```

---

## 10. Key Features

### Feature Matrix

| Feature | Phase 1 | Phase 2 | Phase 3 |
|---------|:-------:|:-------:|:-------:|
| Multi-node connection | ✓ | | |
| Real-time polling | ✓ | | |
| Subscription status | ✓ | | |
| Replication slot monitoring | ✓ | | |
| Lag visualization (sparkline) | ✓ | | |
| WAL retention tracking | ✓ | | |
| pglogical support | | ✓ | |
| Conflict detection | | ✓ | |
| Conflict resolution UI | | ✓ | |
| Replication set management | | ✓ | |
| Pause/resume subscriptions | | | ✓ |
| Resync table wizard | | | ✓ |
| Create/drop slots | | | ✓ |
| Prometheus metrics export | | | ✓ |
| SSH tunnel support | | | ✓ |

### Operations Modal

```tsx
// src/components/modals/OperationsModal.tsx

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { useStore } from '../../store';
import { Modal } from '../layout/Modal';
import { ConfirmationPrompt } from '../atoms/ConfirmationPrompt';

interface Operation {
  label: string;
  value: string;
  dangerous?: boolean;
  requiresSelection?: 'subscription' | 'slot';
}

const OPERATIONS: Operation[] = [
  { label: '⏸  Pause subscription', value: 'pause_subscription', requiresSelection: 'subscription' },
  { label: '▶  Resume subscription', value: 'resume_subscription', requiresSelection: 'subscription' },
  { label: '🔄 Resync table', value: 'resync_table', requiresSelection: 'subscription' },
  { label: '🗑  Drop replication slot', value: 'drop_slot', dangerous: true, requiresSelection: 'slot' },
  { label: '➕ Create replication slot', value: 'create_slot' },
  { label: '🧹 Clear conflict log', value: 'clear_conflicts', dangerous: true },
  { label: '📊 Export metrics (Prometheus)', value: 'export_metrics' },
];

export const OperationsModal: React.FC = () => {
  const { closeModal, selectedSubscription, selectedSlot } = useStore();
  const [confirmOperation, setConfirmOperation] = useState<Operation | null>(null);
  const [executing, setExecuting] = useState(false);

  const handleSelect = async (item: { value: string }) => {
    const operation = OPERATIONS.find((op) => op.value === item.value);
    if (!operation) return;

    if (operation.dangerous) {
      setConfirmOperation(operation);
      return;
    }

    await executeOperation(operation);
  };

  const executeOperation = async (operation: Operation) => {
    setExecuting(true);
    try {
      // Implementation depends on operation type
      switch (operation.value) {
        case 'pause_subscription':
          // await pauseSubscription(selectedSubscription);
          break;
        case 'resume_subscription':
          // await resumeSubscription(selectedSubscription);
          break;
        // ... other operations
      }
    } finally {
      setExecuting(false);
      closeModal();
    }
  };

  if (confirmOperation) {
    return (
      <Modal title="⚠️  Confirm Dangerous Operation" onClose={() => setConfirmOperation(null)}>
        <ConfirmationPrompt
          message={`Are you sure you want to ${confirmOperation.label.toLowerCase()}?`}
          onConfirm={() => executeOperation(confirmOperation)}
          onCancel={() => setConfirmOperation(null)}
        />
      </Modal>
    );
  }

  return (
    <Modal title="Operations" onClose={closeModal}>
      <Box flexDirection="column" gap={1}>
        <Text color="gray">Select an operation to perform:</Text>
        <SelectInput
          items={OPERATIONS.map((op) => ({
            label: op.label,
            value: op.value,
          }))}
          onSelect={handleSelect}
        />
        {executing && <Text color="yellow">Executing...</Text>}
      </Box>
    </Modal>
  );
};
```

---

## 11. Project Structure

```
replmon/
├── package.json
├── tsconfig.json
├── bun.lockb
├── README.md
├── LICENSE
│
├── src/
│   ├── index.tsx                 # Entry point
│   ├── cli.ts                    # CLI argument parsing (meow)
│   ├── app.tsx                   # Root React component
│   │
│   ├── components/
│   │   ├── atoms/                # Smallest UI units
│   │   │   ├── StatusDot.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── KeyHint.tsx
│   │   │
│   │   ├── layout/               # Layout components
│   │   │   ├── Panel.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── SplitView.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── MainLayout.tsx
│   │   │
│   │   ├── panels/               # Main content panels
│   │   │   ├── TopologyPanel.tsx
│   │   │   ├── SubscriptionsPanel.tsx
│   │   │   ├── SlotsPanel.tsx
│   │   │   ├── ConflictsPanel.tsx
│   │   │   └── LagPanel.tsx
│   │   │
│   │   ├── charts/               # Data visualization
│   │   │   ├── Sparkline.tsx
│   │   │   ├── BarChart.tsx
│   │   │   └── TopologyGraph.tsx
│   │   │
│   │   └── modals/               # Modal dialogs
│   │       ├── OperationsModal.tsx
│   │       ├── ConnectionModal.tsx
│   │       ├── HelpModal.tsx
│   │       └── ConfirmationModal.tsx
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── usePolling.ts
│   │   ├── useKeyboardNavigation.ts
│   │   ├── useTerminalSize.ts
│   │   ├── useSubscriptions.ts
│   │   ├── useSlots.ts
│   │   └── useConflicts.ts
│   │
│   ├── services/                 # Business logic
│   │   ├── ConnectionManager.ts
│   │   ├── PollingService.ts
│   │   ├── queries.ts
│   │   ├── ConfigService.ts
│   │   └── OperationsService.ts
│   │
│   ├── store/                    # State management
│   │   ├── index.ts
│   │   ├── selectors.ts
│   │   └── actions.ts
│   │
│   ├── theme/                    # Theming
│   │   ├── index.ts
│   │   ├── defaultTheme.ts
│   │   └── minimalTheme.ts
│   │
│   ├── types/                    # TypeScript types
│   │   ├── index.ts
│   │   ├── components.ts
│   │   ├── database.ts
│   │   └── config.ts
│   │
│   └── utils/                    # Utility functions
│       ├── format.ts
│       ├── lsn.ts
│       └── interval.ts
│
├── config/
│   └── example.yaml              # Example configuration
│
└── test/
    ├── components/
    ├── services/
    └── fixtures/
```

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)

**Week 1: Project Setup**
- [ ] Initialize project with Bun
- [ ] Set up TypeScript configuration
- [ ] Install core dependencies (ink, react, pg)
- [ ] Create basic CLI entry point
- [ ] Implement config file loading

**Week 2: Core Infrastructure**
- [ ] Implement ConnectionManager with pooling
- [ ] Build PollingService with EventEmitter
- [ ] Create Zustand store skeleton
- [ ] Write core SQL queries
- [ ] Add basic error handling

**Week 3: Basic UI**
- [ ] Implement MainLayout component
- [ ] Create Panel and Modal primitives
- [ ] Build Header and Footer
- [ ] Add keyboard navigation
- [ ] Implement basic theming

### Phase 2: Core Features (Weeks 4-6)

**Week 4: Monitoring Panels**
- [ ] SubscriptionsPanel with live data
- [ ] SlotsPanel with WAL retention
- [ ] Basic TopologyGraph (static)
- [ ] Status indicators and badges

**Week 5: Visualization**
- [ ] Sparkline chart component
- [ ] Lag timeline panel
- [ ] Progress bars for slots
- [ ] Color-coded status system

**Week 6: pglogical Integration**
- [ ] pglogical-specific queries
- [ ] ConflictsPanel implementation
- [ ] Replication set display
- [ ] Node management UI

### Phase 3: Operations & Polish (Weeks 7-9)

**Week 7: Operations**
- [ ] OperationsModal implementation
- [ ] Pause/resume subscription
- [ ] Resync table wizard
- [ ] Slot management

**Week 8: Advanced Features**
- [ ] SSH tunnel support
- [ ] Prometheus metrics endpoint
- [ ] Configuration wizard
- [ ] Multi-cluster switching

**Week 9: Testing & Documentation**
- [ ] Unit tests with ink-testing-library
- [ ] Integration tests with test containers
- [ ] README and usage documentation
- [ ] Example configurations

---

## 13. Distribution Strategy

### npm Package

```json
{
  "name": "replmon",
  "version": "1.0.0",
  "description": "TUI for PostgreSQL logical replication monitoring",
  "bin": {
    "replmon": "./dist/cli.js"
  },
  "files": [
    "dist"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "postgresql",
    "replication",
    "pglogical",
    "tui",
    "terminal",
    "monitoring",
    "database"
  ]
}
```

### Installation Methods

```bash
# npm (recommended)
npm install -g replmon

# npx (no install)
npx replmon --config ./replmon.yaml

# Homebrew (future)
brew install replmon

# From source
git clone https://github.com/yourname/replmon
cd replmon
bun install
bun run build
npm link
```

### Configuration File

```yaml
# ~/.config/replmon/config.yaml

clusters:
  production:
    nodes:
      - name: us-east
        host: pg-us-east.example.com
        port: 5432
        database: app_db
        user: replmon
        # password from env: REPLMON_US_EAST_PASSWORD
        role: provider
        
      - name: eu-west
        host: pg-eu-west.example.com
        port: 5432
        database: app_db
        user: replmon
        role: subscriber

    pglogical: true
    pollInterval: 1000  # ms

  staging:
    nodes:
      - name: staging-primary
        host: localhost
        port: 5432
        database: staging_db
        user: postgres
        password: ${PGPASSWORD}
        role: provider

settings:
  theme: default  # default | minimal | colorful
  refreshRate: 1000
  lagWarningThreshold: 5000  # ms
  lagCriticalThreshold: 30000  # ms
  conflictRetention: 100  # number of conflicts to keep
```

---

## Appendix A: Key Commands Reference

| Key | Action |
|-----|--------|
| `Tab` | Next panel |
| `Shift+Tab` | Previous panel |
| `t` | Focus topology |
| `s` | Focus subscriptions |
| `l` | Focus lag chart |
| `c` | Focus conflicts |
| `o` | Open operations |
| `h` / `?` | Help |
| `q` | Quit |
| `↑` / `↓` | Navigate lists |
| `Enter` | Select / Expand |
| `Esc` | Close modal / Cancel |
| `r` | Force refresh |
| `1-9` | Switch cluster |

---

## Appendix B: Example Session

```bash
$ replmon --config ./production.yaml

# Or with inline connection
$ replmon \
  --host pg-primary.example.com \
  --port 5432 \
  --database myapp \
  --user replmon \
  --pglogical

# Connect to multiple nodes
$ replmon \
  --node us-east:pg-us.example.com:5432/myapp \
  --node eu-west:pg-eu.example.com:5432/myapp \
  --pglogical
```

---

*This design document serves as the blueprint for building replmon. The architecture draws inspiration from Claude Code's proven technology choices while focusing specifically on the PostgreSQL logical replication monitoring use case.*
