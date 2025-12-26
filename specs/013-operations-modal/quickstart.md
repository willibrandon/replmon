# Quickstart: Operations Modal

**Feature**: 013-operations-modal
**Date**: 2025-12-25

## Overview

The Operations Modal provides a keyboard-driven interface for DBA operations on PostgreSQL replication resources. Access it by pressing `o` from any panel.

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Operations Modal                         │
├─────────────────────────────────────────────────────────────────┤
│  [Operations]  [History]                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ›  Pause Subscription          [warning]                        │
│     Resume Subscription         [info]                           │
│     Resync Table                [danger]                         │
│     ─────────────────────────────                               │
│     Create Replication Slot     [info]                           │
│     Drop Replication Slot       [danger]                         │
│     ─────────────────────────────                               │
│     Clear Conflict Log          [danger]                         │
│     Export Prometheus Metrics   [info]                           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Target: my_subscription @ subscriber_node                       │
│  [j/k] Navigate  [Enter] Select  [Tab] Switch tab  [Esc] Close  │
└─────────────────────────────────────────────────────────────────┘
```

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `o` | Open Operations Modal from any panel |
| `j` / `↓` | Move selection down |
| `k` / `↑` | Move selection up |
| `Enter` | Select operation / Confirm |
| `Tab` | Switch between Operations and History tabs |
| `Esc` | Cancel / Close modal |

## Operation Types

### Subscription Operations (from Subscriptions panel)

**Pause Subscription**
- Severity: Warning
- Effect: Disables subscription, stops receiving changes
- Confirmation: Simple yes/no

**Resume Subscription**
- Severity: Info
- Effect: Re-enables subscription
- Confirmation: Simple yes/no

**Resync Table**
- Severity: Danger
- Effect: TRUNCATES table and re-copies from provider
- Confirmation: Type table name to confirm

### Slot Operations (from Slots panel)

**Create Slot**
- Severity: Info
- Effect: Creates new replication slot
- Input: Slot name, type (logical/physical)
- Confirmation: Simple yes/no

**Drop Slot**
- Severity: Danger
- Effect: Removes slot (may break replication)
- Confirmation: Type slot name to confirm

### Conflict Operations (from Conflicts panel)

**Clear Conflict Log**
- Severity: Danger
- Effect: Truncates pglogical.conflict_history
- Confirmation: Type "CLEAR" to confirm
- Note: Only available with pglogical (not log-based conflicts)

### Metrics Operations (from any panel)

**Export Prometheus Metrics**
- Severity: Info
- Effect: Shows metrics in scrollable modal
- No confirmation required

## Confirmation Flow

### Type-to-Confirm (Danger operations)

```
┌─────────────────────────────────────────────────────────────────┐
│                     ⚠️  Drop Replication Slot                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You are about to DROP the replication slot:                     │
│                                                                  │
│     my_slot @ primary_node                                       │
│                                                                  │
│  This action is IRREVERSIBLE and may break active replication.  │
│                                                                  │
│  Type the slot name to confirm:                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ my_slo█                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [Type exact name to confirm]  [Esc] Cancel                      │
└─────────────────────────────────────────────────────────────────┘
```

### Simple Confirmation (Warning operations)

```
┌─────────────────────────────────────────────────────────────────┐
│                     ⚠️  Pause Subscription                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Pause subscription "my_subscription" on subscriber_node?        │
│                                                                  │
│  This will stop receiving changes from the provider until        │
│  you resume the subscription.                                    │
│                                                                  │
│          [Enter] Confirm                [Esc] Cancel             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Result Display

### Success

```
┌─────────────────────────────────────────────────────────────────┐
│                      ✓  Operation Complete                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Subscription "my_subscription" paused successfully.             │
│                                                                  │
│  Duration: 142ms                                                 │
│                                                                  │
│                        [Enter] Dismiss                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Failure

```
┌─────────────────────────────────────────────────────────────────┐
│                      ✗  Operation Failed                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Failed to drop slot "my_slot"                                   │
│                                                                  │
│  Error: replication slot "my_slot" is active                     │
│                                                                  │
│  Suggestion: Terminate active connections using this slot        │
│  before dropping it.                                             │
│                                                                  │
│                        [Enter] Dismiss                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## History Tab

```
┌─────────────────────────────────────────────────────────────────┐
│                         Operations Modal                         │
├─────────────────────────────────────────────────────────────────┤
│  [Operations]  [History]                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  14:32:15  ✓  Pause Subscription      my_sub @ subscriber        │
│  14:30:42  ✓  Export Metrics          primary                    │
│  14:28:03  ✗  Drop Slot               old_slot @ primary         │
│  14:25:18  ✓  Clear Conflicts         subscriber                 │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [j/k] Navigate  [Enter] View details  [Tab] Switch tab          │
└─────────────────────────────────────────────────────────────────┘
```

## Prometheus Metrics Export

```
┌─────────────────────────────────────────────────────────────────┐
│                      Prometheus Metrics                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  # HELP replmon_lag_bytes Replication lag in bytes               │
│  # TYPE replmon_lag_bytes gauge                                  │
│  replmon_lag_bytes{node="primary",subscription="my_sub"} 1024    │
│                                                                  │
│  # HELP replmon_subscription_status Subscription status          │
│  # TYPE replmon_subscription_status gauge                        │
│  replmon_subscription_status{node="sub",subscription="my_sub"} 1 │
│                                                                  │
│  # HELP replmon_conflict_total Total conflicts by type           │
│  # TYPE replmon_conflict_total counter                           │
│  replmon_conflict_total{node="sub",type="insert_exists"} 5       │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [j/k] Scroll  [Esc] Close  Tip: Copy text to use with Prometheus│
└─────────────────────────────────────────────────────────────────┘
```

## Context Sensitivity

Operations available depend on the currently focused panel:

| Panel | Available Operations |
|-------|---------------------|
| Subscriptions | Pause, Resume, Resync Table |
| Slots | Create Slot, Drop Slot |
| Conflicts | Clear Conflict Log |
| Topology | (all operations) |
| Any | Export Prometheus Metrics |

## Error States

### Disconnected Node

```
┌─────────────────────────────────────────────────────────────────┐
│                      ⚠️  Node Unavailable                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Cannot perform operations on "subscriber_node"                  │
│                                                                  │
│  The node is currently disconnected. Operations will be          │
│  available once the connection is restored.                      │
│                                                                  │
│                        [Enter] Dismiss                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Operation Not Available

```
┌─────────────────────────────────────────────────────────────────┐
│                      ⚠️  Operation Unavailable                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  "Resync Table" is not available for native PostgreSQL           │
│  logical replication.                                            │
│                                                                  │
│  This operation requires pglogical extension.                    │
│                                                                  │
│                        [Enter] Dismiss                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Checklist

- [ ] OperationsModal container component
- [ ] OperationsList presentational component
- [ ] OperationConfirm component (simple + type-to-confirm)
- [ ] OperationHistory component
- [ ] OperationResult display component
- [ ] PrometheusExport scrollable view
- [ ] TableSelector for resync operation
- [ ] useOperations hook
- [ ] Operations Zustand slice
- [ ] Subscription operations service
- [ ] Slot operations service
- [ ] Conflict operations service
- [ ] Prometheus metrics collector
- [ ] Integration with MainLayout keyboard handler
- [ ] Store type updates
