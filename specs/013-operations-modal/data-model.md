# Data Model: Operations Modal

**Feature**: 013-operations-modal
**Date**: 2025-12-25

## Entities

### Operation

Represents a DBA action that can be performed on a replication resource.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique operation identifier (e.g., `pause-subscription`, `drop-slot`) |
| name | string | Display name (e.g., "Pause Subscription") |
| description | string | Brief description of what the operation does |
| category | OperationCategory | Category for grouping: `subscription`, `slot`, `conflict`, `metrics` |
| severity | Severity | Risk level: `info`, `warning`, `danger` |
| requiresConfirmation | boolean | Whether confirmation prompt is needed |
| requiresTypeToConfirm | boolean | Whether user must type resource name to confirm |
| targetType | TargetType | What the operation targets: `subscription`, `slot`, `node`, `table` |
| availableFor | ReplicationType[] | Which replication types support this: `pglogical`, `native`, `both` |

### OperationContext

Context required to execute an operation.

| Field | Type | Description |
|-------|------|-------------|
| nodeId | string | Target node identifier |
| nodeName | string | Display name of target node |
| resourceId | string | Identifier of the resource being operated on |
| resourceName | string | Display name of the resource |
| additionalParams | Record<string, unknown> | Extra parameters (e.g., table name for resync) |

### OperationResult

Captures the outcome of an operation execution.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique result identifier (UUID) |
| operationId | string | Reference to Operation.id |
| context | OperationContext | Context that was used |
| status | ResultStatus | Outcome: `success`, `failure`, `timeout`, `cancelled` |
| message | string | Human-readable result message |
| error | string \| null | Error details if failed |
| remediationHint | string \| null | Suggested fix if failed |
| timestamp | Date | When operation completed |
| durationMs | number | How long operation took |

### ConfirmationState

State for the confirmation flow.

| Field | Type | Description |
|-------|------|-------------|
| operation | Operation | Operation being confirmed |
| context | OperationContext | Target context |
| confirmationInput | string | Current user input for type-to-confirm |
| isValid | boolean | Whether input matches required confirmation |
| warningAcknowledged | boolean | Whether user has seen the warning |

### PrometheusMetric

A single metric in Prometheus format.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Metric name (e.g., `replmon_lag_bytes`) |
| type | MetricType | Type: `gauge`, `counter` |
| help | string | HELP text for the metric |
| labels | Record<string, string> | Label key-value pairs |
| value | number | Numeric value |

### OperationsSliceState

Zustand slice state for operations.

| Field | Type | Description |
|-------|------|-------------|
| history | OperationResult[] | Session operation history (max 100) |
| currentOperation | Operation \| null | Currently executing operation |
| confirmationState | ConfirmationState \| null | Active confirmation flow |
| isExecuting | boolean | Whether an operation is in progress |

## Enumerations

### OperationCategory
```
subscription | slot | conflict | metrics
```

### Severity
```
info | warning | danger
```

### TargetType
```
subscription | slot | node | table
```

### ReplicationType
```
pglogical | native | both
```

### ResultStatus
```
success | failure | timeout | cancelled
```

### MetricType
```
gauge | counter
```

## Relationships

```
┌──────────────┐       ┌──────────────────┐
│  Operation   │◄──────│  OperationResult │
└──────────────┘       └────────┬─────────┘
       │                        │
       │                        │
       ▼                        ▼
┌──────────────────┐   ┌──────────────────┐
│ConfirmationState │   │ OperationContext │
└──────────────────┘   └──────────────────┘
```

- Each `OperationResult` references one `Operation` by id
- Each `OperationResult` contains one `OperationContext`
- `ConfirmationState` references the `Operation` being confirmed and its `OperationContext`
- `OperationsSliceState` contains an array of `OperationResult` history and current state

## State Transitions

### Operation Execution Flow

```
[idle] ─────────────────────────────────────────────────────────┐
   │                                                            │
   ▼ (select operation)                                         │
[operation_selected] ────────────────────────────────────────┐  │
   │                                                         │  │
   │ (if requiresConfirmation)          (if no confirmation) │  │
   ▼                                                         │  │
[confirming]                                                 │  │
   │                                                         │  │
   │ (type-to-confirm valid)    (cancel)                     │  │
   ▼                               │                         │  │
[confirmed] ◄──────────────────────┼─────────────────────────┘  │
   │                               │                             │
   ▼                               │                             │
[executing] ─────────────────────────────────────────────────────┤
   │                                                             │
   │ (success/failure/timeout)                                   │
   ▼                                                             │
[result_displayed] ──────────────────────────────────────────────┘
```

### Confirmation Input States

```
[empty] ──► [partial_match] ──► [valid_match]
   │              │                   │
   │              │                   ▼
   │              │            [can_execute]
   │              │
   ▼              ▼
[invalid] ◄───────┘
```

## Validation Rules

### Operation Selection
- Operation must be available for current replication type (pglogical or native)
- Target resource must exist (subscription, slot, etc.)
- Node must be connected (not stale/disconnected)

### Confirmation
- Type-to-confirm input must exactly match resource name (case-sensitive)
- Cancel resets confirmation state
- Escape at any point returns to operation list

### Execution
- Only one operation can execute at a time (isExecuting flag)
- Operation buttons disabled while executing
- Timeout is 30 seconds by default

### History
- Maximum 100 entries retained
- Oldest entries removed when limit exceeded
- Timestamp in local timezone for display
