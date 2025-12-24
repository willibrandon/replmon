# Quickstart: Polling Service

**Feature**: 004-polling-service
**Date**: 2025-12-23

## Overview

PollingService provides periodic collection of PostgreSQL replication monitoring data:
- Replication statistics (lag, sync state)
- Replication slots (retention, activity)
- Subscriptions (native and pglogical)
- Conflicts (PG16+ native, limited pglogical)

## Basic Usage

```typescript
import { ConnectionManager } from './services/connection-manager/index.js';
import { PollingService } from './services/polling/index.js';

// 1. Create ConnectionManager and initialize nodes
const cm = new ConnectionManager();
await cm.initialize([
  { id: 'primary', config: { host: 'pg1', port: 5432, database: 'mydb', user: 'monitor' } },
  { id: 'replica', config: { host: 'pg2', port: 5432, database: 'mydb', user: 'monitor' } },
]);

// 2. Create PollingService with default 1s interval
const poller = new PollingService(cm);

// 3. Subscribe to events
poller.on('data', (result) => {
  console.log(`Cycle ${result.cycleId} completed in ${result.durationMs}ms`);

  for (const nodeStats of result.stats) {
    if (nodeStats.success) {
      for (const stat of nodeStats.data!) {
        console.log(`${stat.applicationName}: ${stat.lagBytes} bytes behind`);
      }
    }
  }
});

poller.on('error', (err) => {
  console.error('Polling failed:', err.message);
});

// 4. Start polling (immediate first poll, then every 1s)
poller.start();

// 5. Stop when done
process.on('SIGINT', () => {
  poller.stop();
  cm.shutdown();
});
```

## Event Subscriptions

```typescript
// Subscribe to specific data categories
poller.on('stats', (statsData) => {
  // Replication stats from all nodes
});

poller.on('slots', (slotsData) => {
  // Slot data from all nodes
});

poller.on('subscriptions', (subsData) => {
  // Subscription data from all nodes
});

poller.on('conflicts', (conflictsData) => {
  // Conflict data (PG16+ only for native)
});

// Lifecycle events
poller.on('started', ({ timestamp }) => {
  console.log('Polling started at', timestamp);
});

poller.on('stopped', ({ timestamp }) => {
  console.log('Polling stopped at', timestamp);
});

poller.on('cycle:skip', ({ reason }) => {
  console.log('Cycle skipped:', reason);
});
```

## Configuration

```typescript
// Custom interval (minimum 250ms)
const poller = new PollingService(cm, { intervalMs: 2000 });

// Change interval at runtime
poller.setInterval(5000); // Takes effect next cycle

// Check current config
console.log(poller.getConfig()); // { intervalMs: 5000 }
```

## Handling Partial Failures

```typescript
poller.on('data', (result) => {
  for (const nodeResult of result.stats) {
    if (nodeResult.success) {
      // Process data
      console.log(`${nodeResult.nodeName}: ${nodeResult.data!.length} standbys`);
    } else {
      // Handle failure for this node
      console.error(`${nodeResult.nodeName} failed:`, nodeResult.error!.message);
    }
  }
});
```

## pglogical Detection

```typescript
poller.on('data', (result) => {
  for (const nodeResult of result.subscriptions) {
    if (nodeResult.hasPglogical) {
      // Node uses pglogical subscriptions
      for (const sub of nodeResult.data!) {
        if (sub.source === 'pglogical') {
          console.log(`pglogical sub: ${sub.subscriptionName} -> ${sub.providerNode}`);
        }
      }
    }
  }
});
```

## Integration with Zustand (Future)

```typescript
// Example store integration (handled by separate integration code)
import { useStore } from './store/index.js';

poller.on('data', (result) => {
  useStore.getState().updateReplicationData(result);
});
```

## Key Behaviors

1. **Immediate first poll**: `start()` executes a poll immediately, then schedules at interval
2. **No overlapping cycles**: If a cycle takes longer than interval, next is skipped
3. **Graceful stop**: `stop()` during active cycle discards results (no events emitted)
4. **Partial results**: Node failures don't block other nodes' results
5. **Per-node pglogical detection**: Cached for session lifetime

## File Structure

```
src/services/polling/
├── index.ts                 # PollingService class
├── types.ts                 # Event types, data types
├── queries/
│   ├── index.ts             # Query aggregator
│   ├── stats.ts             # pg_stat_replication queries
│   ├── subscriptions.ts     # Native + pglogical subs
│   ├── slots.ts             # pg_replication_slots queries
│   └── conflicts.ts         # pg_stat_subscription_stats (PG16+)
└── pglogical-detector.ts    # Per-node pglogical check
```
