# Tasks: Connection Management

**Input**: Design documents from `/specs/003-connection-management/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in specification. Tests will be added in Polish phase if time permits.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Source structure: `src/services/connection-manager/`
- Type extensions: `src/types/connection.ts`
- Store extensions: `src/store/connection.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies

- [x] T001 Install pg and pg-pool dependencies: `bun add pg && bun add -D @types/pg`
- [x] T002 Create connection-manager service directory structure at src/services/connection-manager/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create types module with all entity interfaces from contracts in src/services/connection-manager/types.ts (HealthStatusEnum, SSLConfig, PoolConfig, NodeConnectionConfig, HealthStatus, PoolStats, NodeQueryResult, ManagedNode, ConnectionManagerEvents, ConnectionManagerConfig)
- [x] T004 Create typed EventEmitter wrapper for connection events in src/services/connection-manager/events.ts
- [x] T005 [P] Extend src/types/connection.ts with SSLConfig export and re-export from connection-manager types
- [x] T006 [P] Create pool-factory module with createPool function and SSL config transformation in src/services/connection-manager/pool-factory.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Connect to Multiple PostgreSQL Nodes (Priority: P1)

**Goal**: Establish and maintain connection pools to multiple PostgreSQL nodes from YAML config

**Independent Test**: Configure 2+ PostgreSQL nodes and verify successful connections to each. Query any node in the cluster.

### Implementation for User Story 1

- [x] T007 [US1] Create InternalNode type (ManagedNode + Pool instance) in src/services/connection-manager/types.ts for internal use only; ManagedNode is the public interface
- [x] T008 [US1] Implement ConnectionManager class skeleton with constructor and node Map in src/services/connection-manager/index.ts
- [x] T009 [US1] Implement addNode method: create pool via pool-factory, store in nodes Map, emit node:added event in src/services/connection-manager/index.ts
- [x] T010 [US1] Implement initialize method: call addNode for each node config in parallel, await all in src/services/connection-manager/index.ts
- [x] T011 [US1] Implement getNode, getAllNodes, hasNode methods in src/services/connection-manager/index.ts
- [x] T012 [US1] Implement single-node query method with pool.query in src/services/connection-manager/index.ts
- [x] T013 [US1] Add SSL connection support in pool-factory: transform SSLConfig to pg ssl options in src/services/connection-manager/pool-factory.ts
- [x] T014 [US1] Export ConnectionManager class and all types from src/services/connection-manager/index.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - can connect to multiple nodes and query each

---

## Phase 4: User Story 2 - Monitor Node Health Status (Priority: P1)

**Goal**: Track and report health status for each node with configurable thresholds

**Independent Test**: Start connections to healthy nodes, stop one PostgreSQL instance, verify status changes to unhealthy within 2s

### Implementation for User Story 2

- [x] T015 [US2] Create health-checker module skeleton with HealthChecker class in src/services/connection-manager/health-checker.ts
- [x] T016 [US2] Implement checkHealth method: execute SELECT 1 with timeout, track latency in src/services/connection-manager/health-checker.ts
- [x] T017 [US2] Implement health check loop with configurable interval in src/services/connection-manager/health-checker.ts
- [x] T018 [US2] Implement consecutive failure tracking and unhealthy threshold in src/services/connection-manager/health-checker.ts
- [x] T019 [US2] Implement exponential backoff for reconnection (1s, 2s, 4s, 8s, max 30s with jitter) in src/services/connection-manager/health-checker.ts
- [x] T020 [US2] Implement health state machine transitions (connecting -> healthy -> unhealthy -> reconnecting) in src/services/connection-manager/health-checker.ts
- [x] T021 [US2] Emit node:health events when status changes in src/services/connection-manager/health-checker.ts
- [x] T022 [US2] Integrate HealthChecker into ConnectionManager: start on initialize, stop on shutdown in src/services/connection-manager/index.ts
- [x] T023 [US2] Implement getHealth, getAllHealth, getHealthyNodes methods in src/services/connection-manager/index.ts
- [x] T024 [US2] Emit node:connected and node:disconnected events at appropriate state transitions in src/services/connection-manager/health-checker.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - can monitor health status of all nodes

---

## Phase 5: User Story 3 - Execute Parallel Queries Across Nodes (Priority: P2)

**Goal**: Run same query across all nodes in parallel, aggregate results including partial failures

**Independent Test**: Run query across 3 nodes, verify total time is closer to single-query time than 3x sequential

### Implementation for User Story 3

- [x] T025 [US3] Create parallel-query module skeleton in src/services/connection-manager/parallel-query.ts
- [x] T026 [US3] Implement queryWithTimeout helper: wrap pool.query with timeout using Promise.race in src/services/connection-manager/parallel-query.ts
- [x] T027 [US3] Implement executeParallel: run queries on all nodes using Promise.allSettled in src/services/connection-manager/parallel-query.ts
- [x] T028 [US3] Implement result normalization: transform PromiseSettledResult to NodeQueryResult in src/services/connection-manager/parallel-query.ts
- [x] T029 [US3] Implement queryAll method in ConnectionManager using parallel-query module in src/services/connection-manager/index.ts
- [x] T030 [US3] Implement queryHealthy method: filter to healthy nodes before parallel execution in src/services/connection-manager/index.ts

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should work - can run parallel queries with partial failure handling

---

## Phase 6: User Story 4 - Dynamically Add Nodes at Runtime (Priority: P2)

**Goal**: Add monitoring for new nodes without restart via ConnectionManager API

**Independent Test**: Start with 2 nodes, add 3rd via addNode method, verify queries include new node

### Implementation for User Story 4

- [x] T031 [US4] Enhance addNode to validate duplicate node IDs and throw clear error in src/services/connection-manager/index.ts
- [x] T032 [US4] Integrate new node into health checker immediately after pool creation in src/services/connection-manager/index.ts
- [x] T033 [US4] Implement isRunning method to check if manager is initialized in src/services/connection-manager/index.ts

**Checkpoint**: At this point, User Stories 1-4 should work - dynamic node addition fully functional

---

## Phase 7: User Story 5 - Graceful Connection Cleanup (Priority: P3)

**Goal**: Properly clean up connections on shutdown and node removal to prevent resource leaks

**Independent Test**: Start app, connect to nodes, shutdown, verify all pool connections released

### Implementation for User Story 5

- [x] T034 [US5] Implement removeNode method: stop health checking, close pool gracefully, emit node:removed in src/services/connection-manager/index.ts
- [x] T035 [US5] Implement shutdown method: stop health checker, drain in-flight queries with timeout in src/services/connection-manager/index.ts
- [x] T036 [US5] Close all pools in parallel using Promise.allSettled during shutdown in src/services/connection-manager/index.ts
- [x] T037 [US5] Set running flag to false and reject new queries after shutdown called in src/services/connection-manager/index.ts
- [x] T038 [US5] Handle shutdown timeout: force close pools if graceful drain exceeds configured timeout in src/services/connection-manager/index.ts

**Checkpoint**: At this point, all 5 User Stories should be fully functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Pool statistics, store integration, and final touches

- [ ] T039 [P] Implement getPoolStats method: expose pg-pool totalCount, idleCount, waitingCount in src/services/connection-manager/index.ts
- [ ] T040 [P] Implement getAllPoolStats method: aggregate stats from all nodes in src/services/connection-manager/index.ts
- [ ] T041 [P] Emit pool:stats events periodically (aligned with health check interval) in src/services/connection-manager/health-checker.ts
- [ ] T042 Extend src/store/connection.ts with health status Map and pool stats state
- [ ] T043 Add JSDoc documentation to all public methods in src/services/connection-manager/index.ts
- [ ] T044 Run quickstart.md validation: verify all code examples compile and patterns work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 but US2 depends on US1's connection infrastructure
  - US3, US4 can run after US2 (need health checking)
  - US5 can run after core infrastructure (US1)
- **Polish (Phase 8)**: Depends on core stories (US1-US3 minimum)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (needs ConnectionManager and nodes Map)
- **User Story 3 (P2)**: Depends on US1 (needs query method), can benefit from US2 (healthy filtering)
- **User Story 4 (P2)**: Depends on US1 and US2 (needs addNode + health checker integration)
- **User Story 5 (P3)**: Depends on US1 (needs pools to close), US2 (needs health checker to stop)

### Within Each User Story

- Types/interfaces before implementation
- Skeleton/constructor before methods
- Core methods before integration
- Events after state changes implemented

### Parallel Opportunities

- T005 and T006 can run in parallel (different files)
- T039 and T040 and T041 can run in parallel (different concerns)
- Once Foundational phase completes, work within each story proceeds sequentially

---

## Parallel Example: Phase 2 Foundational

```bash
# After T003 and T004 complete, launch in parallel:
Task: "Extend src/types/connection.ts with SSLConfig export"
Task: "Create pool-factory module with createPool function"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (basic multi-node connections)
4. Complete Phase 4: User Story 2 (health monitoring)
5. **STOP and VALIDATE**: Test connecting to real PostgreSQL nodes, verify health tracking
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Can connect to multiple nodes (MVP!)
3. Add User Story 2 -> Health monitoring works -> Demo health tracking
4. Add User Story 3 -> Parallel queries work -> Demo multi-node queries
5. Add User Story 4 -> Dynamic node addition -> Demo runtime scaling
6. Add User Story 5 -> Graceful cleanup -> Production-ready

### Suggested MVP Scope

**User Story 1 + User Story 2**: These are both P1 and together deliver the core monitoring capability. A user can connect to multiple nodes and see their health status - the fundamental value proposition.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story builds on previous but adds independently testable value
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total tasks: 44
