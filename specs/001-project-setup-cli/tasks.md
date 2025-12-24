# Tasks: Project Setup & CLI

**Input**: Design documents from `/specs/001-project-setup-cli/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No tests requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and TypeScript configuration

- [X] T001 Initialize Bun project with package.json at repository root
- [X] T002 Configure TypeScript strict mode in tsconfig.json
- [X] T003 [P] Create project directory structure per plan.md in src/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, schemas, and state management that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create Configuration interface in src/types/config.ts
- [X] T005 [P] Create CLIArguments interface in src/types/cli.ts
- [X] T006 [P] Create ConnectionConfig interface in src/types/connection.ts
- [X] T007 [P] Create YAMLConfigFile and YAMLNodeConfig interfaces in src/types/yaml-config.ts
- [X] T008 [P] Create ConnectionStoreState, ConnectionStoreActions types in src/store/connection.ts
- [X] T009 Create Zod validation schemas for ConnectionConfig and Configuration in src/config/schemas.ts
- [X] T010 Implement Zustand connection store with subscribeWithSelector in src/store/connection.ts
- [X] T011 Create base App component shell in src/components/App.tsx
- [X] T012 Create StatusBar component in src/components/StatusBar.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Launch with Configuration File (Priority: P1) MVP

**Goal**: User can run `replmon --config path/to/config.yaml` and the application loads all connection configurations from the YAML file.

**Independent Test**: Create a sample config file with one or more PostgreSQL connection entries, run `replmon --config path/to/config.yaml`, and verify the application starts and attempts to connect.

**Scope Note**: This feature implements config loading and UI scaffolding only. Actual PostgreSQL connection attempts (and the "connecting" → "connected" state transition) are deferred to the next feature (connection management). The ConnectionStatus screen will display a static "ready to connect" state for now.

### Implementation for User Story 1

- [X] T013 [US1] Implement YAML file loader with fs.readFileSync in src/config/loader.ts
- [X] T014 [US1] Implement environment variable interpolation (${VAR_NAME} syntax) in src/config/loader.ts
- [X] T015 [US1] Implement config validation using Zod schemas in src/config/validator.ts
- [X] T016 [US1] Implement error formatting for file not found, YAML parse errors, validation errors in src/config/validator.ts
- [X] T017 [US1] Create CLI entry point with meow setup (--config flag) in src/index.tsx
- [X] T018 [US1] Implement ConnectionStatus component showing per-node status in src/components/ConnectionStatus.tsx
- [X] T019 [US1] Implement Dashboard component with Topology panel placeholder in src/components/Dashboard.tsx
- [X] T020 [US1] Integrate config loading into App component with screen transitions in src/components/App.tsx
- [X] T021 [US1] Add keyboard handlers (r=retry, q=quit) on ConnectionStatus screen in src/components/ConnectionStatus.tsx
- [X] T022 [US1] Implement graceful exit with process.exit(0) on 'q' and process.exit(1) on errors in src/index.tsx

**Checkpoint**: User Story 1 complete - can load config file and display connection status screen with retry/quit

---

## Phase 4: User Story 2 - Launch with Inline Connection Flags (Priority: P2)

**Goal**: User can run `replmon --host localhost --port 5432 --database mydb --user postgres` without creating a configuration file.

**Independent Test**: Run `replmon --host localhost --port 5432 --database mydb --user postgres` and verify the application starts with those connection parameters.

### Implementation for User Story 2

- [X] T023 [US2] Add inline connection flags to meow CLI setup (--host, --port, --database, --user, --password) in src/index.tsx
- [X] T024 [US2] Implement CLI args to Configuration conversion in src/config/parser.ts
- [X] T025 [US2] Implement config merging (CLI flags override config file values) in src/config/parser.ts
- [X] T026 [US2] Implement validation for minimum required args (--host and --database when no config) in src/config/parser.ts
- [X] T027 [US2] Add default port (5432) and default user (current OS user) handling in src/config/parser.ts
- [X] T028 [US2] Display usage help with required options when insufficient arguments provided in src/index.tsx

**Checkpoint**: User Story 2 complete - can use inline flags or mix with config file

---

## Phase 5: User Story 3 - Enable pglogical Mode (Priority: P2)

**Goal**: User can run `replmon --config ./config.yaml --pglogical` to enable pglogical-specific monitoring features.

**Independent Test**: Run `replmon --config ./config.yaml --pglogical` and verify the application initializes with pglogical mode enabled (store state reflects pglogical: true).

### Implementation for User Story 3

- [ ] T029 [US3] Add --pglogical boolean flag to meow CLI setup in src/index.tsx
- [ ] T030 [US3] Pass pglogical mode to Zustand store on app initialization in src/components/App.tsx
- [ ] T031 [US3] Update StatusBar to display pglogical mode indicator in src/components/StatusBar.tsx
- [ ] T032 [US3] Add pglogical mode indicator to Dashboard view in src/components/Dashboard.tsx

**Checkpoint**: User Story 3 complete - pglogical mode flag accepted and reflected in UI

---

## Phase 6: User Story 4 - Display Help and Version (Priority: P3)

**Goal**: User can run `replmon --help` or `replmon --version` to see CLI documentation or version.

**Independent Test**: Run `replmon --help` and verify formatted help text is displayed; run `replmon --version` and verify version number is displayed.

### Implementation for User Story 4

- [ ] T033 [US4] Configure meow help text per cli-interface.md contract in src/index.tsx
- [ ] T034 [US4] Configure meow version from package.json in src/index.tsx
- [ ] T035 [US4] Ensure clean exit (code 0) after displaying help or version in src/index.tsx

**Checkpoint**: User Story 4 complete - help and version display correctly

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, edge cases, and validation

- [ ] T036 [P] Add PGPASSWORD environment variable fallback for password in src/config/parser.ts
- [ ] T037 [P] Handle config file paths with spaces and special characters in src/config/loader.ts
- [ ] T038 Add 2-second startup time validation (performance check) in src/index.tsx
- [ ] T039 Run quickstart.md validation checklist manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1): Can proceed first
  - US2 (P2): Can proceed after US1 or in parallel
  - US3 (P2): Can proceed after US1 or in parallel
  - US4 (P3): Can proceed after US1 or in parallel
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - CORE MVP
- **User Story 2 (P2)**: Extends US1 CLI setup, but independently testable
- **User Story 3 (P2)**: Extends US1 configuration, but independently testable
- **User Story 4 (P3)**: Uses meow from US1, but independently testable

### Within Each User Story

- Configuration/parser tasks before component tasks
- Store updates before UI that consumes them
- Entry point integration last

### Parallel Opportunities

- T004-T008: All type definitions can run in parallel
- T036-T037: Polish tasks can run in parallel
- User Stories 2, 3, 4 can run in parallel after User Story 1 establishes the CLI structure

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all type definitions together:
Task: "Create Configuration and ConnectionConfig interfaces in src/types/config.ts"
Task: "Create CLIArguments interface in src/types/cli.ts"
Task: "Create ConnectionConfig interface in src/types/connection.ts"
Task: "Create YAMLConfigFile and YAMLNodeConfig interfaces in src/types/yaml-config.ts"
Task: "Create ConnectionStoreState, ConnectionStoreActions types in src/store/connection.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (config file loading)
4. **STOP and VALIDATE**: Test with sample config file per quickstart.md
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently -> MVP!
3. Add User Story 2 -> Test independently -> Inline flags work
4. Add User Story 3 -> Test independently -> pglogical mode works
5. Add User Story 4 -> Test independently -> Help/version work
6. Polish phase -> Full feature complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution principle VII: No TODOs, placeholders, or partial implementations
