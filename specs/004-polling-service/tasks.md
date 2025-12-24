# Tasks: Polling Service

**Input**: Design documents from `/specs/004-polling-service/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/polling-service.ts, quickstart.md

**Tests**: Not explicitly requested in spec. Test tasks omitted per template instructions.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and directory structure

- [X] T001 Create polling service directory structure at `src/services/polling/`
- [X] T002 [P] Create types module with all data types, enums, and event definitions in `src/services/polling/types.ts`
- [X] T003 [P] Create re-export module in `src/types/polling.ts` for convenience imports

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement pglogical detection logic with caching in `src/services/polling/pglogical-detector.ts`
- [X] T005 [P] Implement stats query module with lag calculation in `src/services/polling/queries/stats.ts`
- [X] T006 [P] Implement slots query module with WAL retention calculation in `src/services/polling/queries/slots.ts`
- [X] T007 [P] Implement subscriptions query module (native + pglogical) in `src/services/polling/queries/subscriptions.ts`
- [X] T008 [P] Implement conflicts query module (PG16+ native, unavailable fallback) in `src/services/polling/queries/conflicts.ts`
- [X] T009 Create query aggregator that executes all query modules in `src/services/polling/queries/index.ts`

**Checkpoint**: Foundation ready - query modules and pglogical detection complete

---

## Phase 3: User Story 1 - Real-Time Monitoring Data Collection (Priority: P1) MVP

**Goal**: Enable automatic collection and emission of replication metrics at configured intervals

**Independent Test**: Start service with mock ConnectionManager, verify events emitted at intervals with all four data categories

### Implementation for User Story 1

- [X] T010 [US1] Create PollingService class skeleton with constructor accepting ConnectionManager in `src/services/polling/index.ts`
- [X] T011 [US1] Implement TypedEventEmitter pattern for PollingEvents in `src/services/polling/index.ts`
- [X] T012 [US1] Implement private `poll()` method executing parallel queries via ConnectionManager in `src/services/polling/index.ts`
- [X] T013 [US1] Implement `start()` with immediate first poll, then interval scheduling in `src/services/polling/index.ts`
- [X] T014 [US1] Implement `stop()` with in-flight result discard (FR-012) in `src/services/polling/index.ts`
- [X] T015 [US1] Implement `isRunning()` state getter in `src/services/polling/index.ts`
- [X] T016 [US1] Wire query modules to poll cycle and emit `data` event with PollingCycleResult in `src/services/polling/index.ts`
- [X] T017 [US1] Emit lifecycle events (`started`, `stopped`, `cycle:start`, `cycle:complete`) in `src/services/polling/index.ts`

**Checkpoint**: PollingService emits complete `data` events at configured intervals

---

## Phase 4: User Story 2 - Configurable Polling Interval (Priority: P1)

**Goal**: Allow users to configure polling frequency via constructor and runtime API

**Independent Test**: Create service with custom interval, verify emission timing matches configuration

### Implementation for User Story 2

- [X] T018 [US2] Implement PollingConfig validation (minimum 250ms enforcement) in `src/services/polling/index.ts`
- [X] T019 [US2] Implement `getConfig()` returning resolved configuration in `src/services/polling/index.ts`
- [X] T020 [US2] Implement `setInterval()` for runtime interval changes in `src/services/polling/index.ts`
- [X] T021 [US2] Implement default 1000ms interval when no config provided in `src/services/polling/index.ts`

**Checkpoint**: Interval configuration works at construction and runtime

---

## Phase 5: User Story 3 - Start and Stop Control (Priority: P2)

**Goal**: Enable pause/resume of polling for resource management

**Independent Test**: Start, stop, restart service and verify event emission starts/stops accordingly

### Implementation for User Story 3

- [X] T022 [US3] Implement no-op behavior for `start()` when already running in `src/services/polling/index.ts`
- [X] T023 [US3] Implement no-op behavior for `stop()` when already stopped in `src/services/polling/index.ts`
- [X] T024 [US3] Implement overlap prevention with `cycle:skip` event (FR-007) in `src/services/polling/index.ts`
- [X] T025 [US3] Verify timer cleanup on stop to prevent memory leaks in `src/services/polling/index.ts`

**Checkpoint**: Lifecycle control is idempotent and handles edge cases

---

## Phase 6: User Story 4 - Graceful Error Handling (Priority: P2)

**Goal**: Continue operation when individual nodes fail, emit partial results

**Independent Test**: Simulate node failure, verify other nodes' data still emitted with error info

### Implementation for User Story 4

- [ ] T026 [US4] Implement per-node error capture in poll cycle in `src/services/polling/index.ts`
- [ ] T027 [US4] Implement NodeData wrapper with success/error fields in poll result aggregation in `src/services/polling/index.ts`
- [ ] T028 [US4] Implement partial result emission (FR-008) when some nodes fail in `src/services/polling/index.ts`
- [ ] T029 [US4] Implement `error` event emission when all nodes fail in `src/services/polling/index.ts`
- [ ] T030 [US4] Implement graceful degradation when ConnectionManager not ready (FR-015) in `src/services/polling/index.ts`

**Checkpoint**: Service resilient to node failures, emits partial results

---

## Phase 7: User Story 5 - Multiple Data Type Subscriptions (Priority: P3)

**Goal**: Enable UI components to subscribe to specific event types

**Independent Test**: Subscribe to individual event types, verify only relevant events received

### Implementation for User Story 5

- [ ] T031 [US5] Emit `stats` event with NodeData<ReplicationStats[]>[] after each cycle in `src/services/polling/index.ts`
- [ ] T032 [US5] Emit `slots` event with NodeData<SlotData[]>[] after each cycle in `src/services/polling/index.ts`
- [ ] T033 [US5] Emit `subscriptions` event with NodeData<SubscriptionData[]>[] after each cycle in `src/services/polling/index.ts`
- [ ] T034 [US5] Emit `conflicts` event with NodeData<ConflictData[]>[] after each cycle in `src/services/polling/index.ts`
- [ ] T035 [US5] Implement `on()`, `off()`, `once()` typed event methods in `src/services/polling/index.ts`

**Checkpoint**: Components can subscribe to specific data categories

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [ ] T036 [P] Verify all exports from `src/services/polling/index.ts` match IPollingService contract
- [ ] T037 [P] Verify TypeScript strict mode passes with no `any` types
- [ ] T038 Run quickstart.md code examples to validate API
- [ ] T039 Update plan.md with "Implementation Complete" status

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Core service - no dependencies on other stories
- **User Story 2 (P1)**: Configuration - can be implemented in parallel with US1 but integrates with it
- **User Story 3 (P2)**: Lifecycle - depends on US1 core service being complete
- **User Story 4 (P2)**: Error handling - depends on US1 poll cycle being complete
- **User Story 5 (P3)**: Event subscriptions - depends on US1 event emission being complete

### Within Each User Story

- Core implementation before edge cases
- Story complete before moving to next priority
- No test tasks (tests not requested in spec)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational query modules (T005-T008) can run in parallel
- All Polish tasks marked [P] can run in parallel
- User Stories 1 and 2 can be worked on in parallel (different concerns)

---

## Parallel Example: Foundational Query Modules

```bash
# Launch all query modules together:
Task: "Implement stats query module with lag calculation in src/services/polling/queries/stats.ts"
Task: "Implement slots query module with WAL retention calculation in src/services/polling/queries/slots.ts"
Task: "Implement subscriptions query module (native + pglogical) in src/services/polling/queries/subscriptions.ts"
Task: "Implement conflicts query module (PG16+ native, unavailable fallback) in src/services/polling/queries/conflicts.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (query modules, pglogical detection)
3. Complete Phase 3: User Story 1 (core polling)
4. Complete Phase 4: User Story 2 (configuration)
5. **STOP and VALIDATE**: Test basic polling with configurable intervals
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 → Core polling works (MVP!)
3. Add User Story 3 → Lifecycle control
4. Add User Story 4 → Error resilience
5. Add User Story 5 → Fine-grained subscriptions

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable
- Commit after each task or logical group
- Files follow structure from plan.md: `src/services/polling/`
- Query SQL from research.md (lag calculation, slot retention, pglogical detection)
- TypeScript interfaces from contracts/polling-service.ts
