# Tasks: Topology Panel

**Input**: Design documents from `/specs/008-topology-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included based on quickstart.md recommendations.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Types & Infrastructure)

**Purpose**: Create type definitions and foundational utilities

- [ ] T001 [P] Create topology types (TopologyEdge, NodeRole, LagSeverity, TopologyNodeData, TopologyLayoutConfig) in src/types/topology.ts
- [ ] T002 [P] Create topology utility functions (getLagSeverity, formatLag, getLagColor, deriveNodeRole, getRoleBadgeLabel) in src/utils/topology.ts
- [ ] T003 Update src/types/index.ts to re-export topology types

---

## Phase 2: Foundational (Selectors & Hooks)

**Purpose**: Core data derivation that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Create selectTopologyEdges selector (derive edges from subscriptions and replication stats) in src/store/selectors/topology.ts
- [ ] T005 [P] Create selectTopologyNodes selector (aggregate node data with roles, edges, status) in src/store/selectors/topology.ts
- [ ] T006 [P] Create parameterized selectors (selectNodeRole, selectEdgeLag, selectNodeEdges) in src/store/selectors/topology.ts
- [ ] T007 [P] Create derived selectors (selectActiveEdgeCount, selectHasCriticalLag, selectNodesByRole) in src/store/selectors/topology.ts
- [ ] T008 Update src/store/selectors/index.ts to export topology selectors
- [ ] T009 [P] Create useTopologyLayout hook (responsive layout config based on terminal size) in src/hooks/useTopologyLayout.ts
- [ ] T010 [P] Create useTopology hook (data aggregation using topology selectors) in src/hooks/useTopology.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Cluster Topology at a Glance (Priority: P1) 🎯 MVP

**Goal**: Display all configured nodes as visual boxes with name, role, status indicator, and host info

**Independent Test**: Launch replmon with multi-node config, verify all nodes appear with correct names, roles, and status

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create TopologyNode component (node box with status dot, name, role badge, host info) in src/components/topology/TopologyNode.tsx
- [ ] T012 [P] [US1] Create barrel export in src/components/topology/index.ts
- [ ] T013 [US1] Create single-node view rendering in TopologyPanel (empty state, single node case) in src/components/panels/TopologyPanel.tsx
- [ ] T014 [US1] Integrate TopologyNode with store (read node status, selection state, stale state) in src/components/topology/TopologyNode.tsx
- [ ] T015 [US1] Add stale node visual treatment (dimmed appearance, stale badge) in src/components/topology/TopologyNode.tsx

### Tests for User Story 1

- [ ] T016 [P] [US1] Create TopologyNode.test.tsx with tests for node rendering, status indicators, role badges in tests/components/topology/TopologyNode.test.tsx

**Checkpoint**: Single and standalone nodes display correctly with status, role, and stale indicators

---

## Phase 4: User Story 2 - Understand Replication Relationships (Priority: P2)

**Goal**: Display connection lines between nodes showing replication flow direction (unidirectional/bidirectional)

**Independent Test**: Configure bidirectional pglogical replication, verify connection lines appear with correct directional arrows

### Implementation for User Story 2

- [ ] T017 [P] [US2] Create ConnectionLine component (arrow with direction indicator, replication type styling: native=solid, pglogical=dashed or labeled) in src/components/topology/ConnectionLine.tsx
- [ ] T018 [P] [US2] Create TopologyRow component (horizontal arrangement of nodes with connection lines) in src/components/topology/TopologyRow.tsx
- [ ] T019 [US2] Create TopologyLayout component (multi-row layout orchestration, responsive sizing) in src/components/topology/TopologyLayout.tsx
- [ ] T020 [US2] Update barrel export with ConnectionLine, TopologyRow, TopologyLayout in src/components/topology/index.ts
- [ ] T021 [US2] Enhance TopologyPanel to use TopologyLayout for multi-node display in src/components/panels/TopologyPanel.tsx
- [ ] T022 [US2] Implement bidirectional arrow rendering (double-headed ↔ for pglogical bidirectional) in src/components/topology/ConnectionLine.tsx

### Tests for User Story 2

- [ ] T023 [P] [US2] Create ConnectionLine.test.tsx with tests for direction arrows, bidirectional display in tests/components/topology/ConnectionLine.test.tsx

**Checkpoint**: Nodes connected by replication show directional arrows, bidirectional relationships clearly distinguished

---

## Phase 5: User Story 3 - Monitor Replication Latency (Priority: P3)

**Goal**: Display lag values on connection lines with color-coded severity (green/yellow/red)

**Independent Test**: Active replication with measurable lag shows lag values that update with polling data

### Implementation for User Story 3

- [ ] T024 [US3] Add lag display to ConnectionLine (formatted lag value, severity color) in src/components/topology/ConnectionLine.tsx
- [ ] T025 [US3] Implement lag severity color coding (green <5s, yellow 5-30s, red >30s, gray unknown) in src/components/topology/ConnectionLine.tsx
- [ ] T026 [US3] Add showLag prop to ConnectionLine for toggling lag visibility in src/components/topology/ConnectionLine.tsx

### Tests for User Story 3

- [ ] T027 [P] [US3] Add lag display tests to ConnectionLine.test.tsx (lag formatting, color thresholds) in tests/components/topology/ConnectionLine.test.tsx

**Checkpoint**: Lag values visible on connection lines with appropriate severity colors

---

## Phase 6: User Story 4 - Select Nodes for Detail View (Priority: P4)

**Goal**: Keyboard navigation (j/k) to select nodes, visual highlight on selected node

**Independent Test**: Use j/k keys to move selection between nodes, verify highlight updates correctly

### Implementation for User Story 4

- [ ] T028 [US4] Add selection highlight styling to TopologyNode (bold, border color change) in src/components/topology/TopologyNode.tsx
- [ ] T029 [US4] Ensure TopologyPanel provides selectable items list for j/k navigation in src/components/panels/TopologyPanel.tsx
- [ ] T030 [US4] Verify wrap-around or stop behavior at list boundaries in src/components/panels/TopologyPanel.tsx

### Tests for User Story 4

- [ ] T031 [P] [US4] Create TopologyPanel.test.tsx with tests for keyboard navigation, selection state in tests/components/topology/TopologyPanel.test.tsx

**Checkpoint**: Keyboard navigation works, selected node clearly highlighted

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, responsive layout, final integration

- [ ] T032 [P] Implement responsive layout (narrow terminal wraps to vertical, compact node widths) in src/components/topology/TopologyLayout.tsx
- [ ] T033 [P] Handle edge case: many nodes (5+) with row wrapping in src/components/topology/TopologyLayout.tsx
- [ ] T034 Run type check (bun run typecheck) to verify no type errors
- [ ] T035 Run quickstart.md verification checklist manually with test configuration
- [ ] T036 Update CLAUDE.md if new patterns established

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in priority order (P1 → P2 → P3 → P4)
  - Some parallelism possible within each story
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 (needs TopologyNode component) - Adds connection lines
- **User Story 3 (P3)**: Depends on US2 (needs ConnectionLine component) - Adds lag display
- **User Story 4 (P4)**: Depends on US1 (needs TopologyNode) - Adds selection highlight

### Within Each User Story

- Component before integration
- Core implementation before styling enhancements
- Implementation before tests (tests validate existing behavior)

### Parallel Opportunities

- T001, T002: Type definitions and utilities can run in parallel
- T004, T005, T006, T007, T009, T010: Selectors and hooks can run in parallel (different files)
- T011, T012: TopologyNode and barrel export can run in parallel
- T016, T023, T027, T031: Test files can run in parallel with each other

---

## Parallel Example: Foundational Phase

```bash
# Launch all selectors and hooks together:
Task: "Create selectTopologyEdges selector in src/store/selectors/topology.ts"
Task: "Create selectTopologyNodes selector in src/store/selectors/topology.ts"
Task: "Create useTopologyLayout hook in src/hooks/useTopologyLayout.ts"
Task: "Create useTopology hook in src/hooks/useTopology.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types + utilities)
2. Complete Phase 2: Foundational (selectors + hooks)
3. Complete Phase 3: User Story 1 (node boxes with status)
4. **STOP and VALIDATE**: Launch replmon, verify nodes display correctly
5. Demo/validate MVP

### Incremental Delivery

1. Complete Setup + Foundational → Core infrastructure ready
2. Add User Story 1 → Nodes visible with status → Demo
3. Add User Story 2 → Connection lines visible → Demo
4. Add User Story 3 → Lag values with colors → Demo
5. Add User Story 4 → Keyboard selection → Demo
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability
- All components use existing atoms (StatusDot, Badge) from src/components/atoms/
- Theme colors accessed via useTheme() hook
- Store access via useStore() with topology selectors
- Existing j/k navigation handled by MainLayout - TopologyPanel just provides selectable items
- Commit after each task or logical group
