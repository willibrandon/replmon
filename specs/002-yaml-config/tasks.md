# Tasks: YAML Configuration System

**Input**: Design documents from `/specs/002-yaml-config/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in feature specification - omitting test tasks.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US5)
- File paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Copy contract types and establish project foundation

- [ ] T001 Copy contract types from specs/002-yaml-config/contracts/ to src/types/
- [ ] T002 [P] Create src/config/defaults.ts with default path resolution and threshold constants
- [ ] T003 [P] Create src/types/theme.ts re-exporting theme types from contracts

**Checkpoint**: Type foundation established, ready for foundational implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**Critical**: No user story work can begin until this phase is complete

- [ ] T004 Extend src/config/schemas.ts with Zod schemas for clusters, theme, and thresholds
- [ ] T005 Update src/types/yaml-config.ts to import and re-export new YAML types from contracts
- [ ] T006 Update src/types/config.ts to import and re-export Configuration, ResolvedTheme, ResolvedThresholds from contracts
- [ ] T007 Update src/types/cli.ts to add --cluster flag to CLIArguments interface

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Load Configuration from YAML File (Priority: P1)

**Goal**: Enable loading PostgreSQL connection settings from a YAML config file

**Independent Test**: Create YAML file at ~/.config/replmon/config.yaml with node definitions, run replmon, verify connections

### Implementation for User Story 1

- [ ] T008 [US1] Implement getDefaultConfigPath() in src/config/defaults.ts using XDG spec
- [ ] T009 [US1] Extend src/config/loader.ts loadConfigFile() to check default path when --config not provided
- [ ] T010 [US1] Extend src/config/loader.ts to handle graceful fallback when default config missing (not an error)
- [ ] T011 [US1] Update src/config/parser.ts parseYAMLConfig() to validate node structure with new schemas
- [ ] T012 [US1] Extend src/config/parser.ts mergeConfigWithCLI() to properly merge CLI flags over config values
- [ ] T013 [US1] Update src/cli.ts to add --config flag handling and pass path to loader
- [ ] T014 [US1] Add ConfigFileNotFoundError and ConfigFilePermissionError handling in src/config/loader.ts
- [ ] T015 [US1] Format config errors under 100 chars in src/config/validator.ts formatConfigError()

**Checkpoint**: User Story 1 complete - config files load from default or specified path, CLI overrides work

---

## Phase 4: User Story 2 - Secure Credential Management via Environment Variables (Priority: P1)

**Goal**: Enable environment variable interpolation for sensitive config values like passwords

**Independent Test**: Set PG_PASSWORD env var, use ${PG_PASSWORD} in config, verify password is substituted

### Implementation for User Story 2

- [ ] T016 [US2] Extend interpolateEnvVars() in src/config/loader.ts to support ${VAR:-default} syntax
- [ ] T017 [US2] Add EnvVarInterpolationError class to src/config/errors.ts for missing required env vars
- [ ] T018 [US2] Update src/config/loader.ts to throw EnvVarInterpolationError when required var missing
- [ ] T019 [US2] Ensure env var interpolation runs before Zod validation in src/config/parser.ts
- [ ] T020 [US2] Validate interpolated values post-substitution (e.g., port must be numeric) in src/config/validator.ts

**Checkpoint**: User Story 2 complete - env vars interpolated, missing vars error cleanly

---

## Phase 5: User Story 3 - Multi-Cluster Definitions with Switching (Priority: P2)

**Goal**: Enable defining multiple clusters and switching between them with --cluster flag

**Independent Test**: Define two clusters in config, launch with --cluster staging, verify correct nodes connect

### Implementation for User Story 3

- [ ] T021 [US3] Add cluster schema validation in src/config/schemas.ts (nodes array, default boolean)
- [ ] T022 [US3] Implement validateClusterNodeReferences() in src/config/validator.ts
- [ ] T023 [US3] Add ClusterNodeReferenceError and ClusterNotFoundError to src/config/errors.ts
- [ ] T024 [US3] Implement selectDefaultCluster() in src/config/parser.ts (default: true or first defined)
- [ ] T025 [US3] Extend src/config/parser.ts to resolve cluster from --cluster flag or default
- [ ] T026 [US3] Update src/cli.ts to add --cluster <name> flag handling
- [ ] T027 [US3] Filter nodes to only active cluster's nodes in final Configuration output
- [ ] T028 [US3] Display available cluster names in error when invalid cluster specified

**Checkpoint**: User Story 3 complete - clusters work, --cluster switches, invalid names error with list

---

## Phase 6: User Story 4 - Theme Configuration (Priority: P3)

**Goal**: Enable configuring UI color themes via config file

**Independent Test**: Set theme: light in config, verify UI uses light color scheme

### Implementation for User Story 4

- [ ] T029 [P] [US4] Create src/theme/index.ts with theme resolution and color merging logic
- [ ] T030 [US4] Add theme schema validation in src/config/schemas.ts (name: dark|light, colors object)
- [ ] T031 [US4] Implement resolveTheme() in src/theme/index.ts merging custom colors over base theme
- [ ] T032 [US4] Extend src/config/parser.ts to call resolveTheme() and include in Configuration
- [ ] T033 [US4] Validate hex color format in src/config/validator.ts for custom color overrides
- [ ] T034 [US4] Add warning log for invalid theme name fallback to default in src/theme/index.ts

**Checkpoint**: User Story 4 complete - themes load, custom colors merge, invalid names warn

---

## Phase 7: User Story 5 - Threshold and Alert Settings (Priority: P3)

**Goal**: Enable configuring replication metric thresholds for warning/critical indicators

**Independent Test**: Set lag threshold in config, verify UI shows warning at configured value

### Implementation for User Story 5

- [ ] T035 [US5] Add threshold schema validation in src/config/schemas.ts (warning/critical numeric or string)
- [ ] T036 [US5] Implement parseThresholdValue() in src/config/parser.ts for "10s", "1GB" formats
- [ ] T037 [US5] Add InvalidThresholdError to src/config/errors.ts for invalid threshold values
- [ ] T038 [US5] Implement resolveThresholds() in src/config/parser.ts applying defaults
- [ ] T039 [US5] Validate critical >= warning with warning log if inverted in src/config/validator.ts
- [ ] T040 [US5] Include resolved thresholds in final Configuration output

**Checkpoint**: User Story 5 complete - thresholds parse, defaults apply, invalid values error

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation and integration across all user stories

- [ ] T041 Run quickstart.md validation scenarios manually
- [ ] T042 Verify all error messages are under 100 characters per SC-004
- [ ] T043 Verify config parsing completes under 50ms per performance goals
- [ ] T044 Ensure graceful handling of empty config file (treat as no config)
- [ ] T045 Final code review for TypeScript strict mode compliance

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on Foundational - can parallel with US1
- **US3 (Phase 5)**: Depends on Foundational - can parallel with US1/US2
- **US4 (Phase 6)**: Depends on Foundational - can parallel with US1/US2/US3
- **US5 (Phase 7)**: Depends on Foundational - can parallel with US1/US2/US3/US4
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

| Story | Can Start After | Depends On Other Stories |
|-------|----------------|-------------------------|
| US1 | Phase 2 complete | None |
| US2 | Phase 2 complete | None (env vars independent) |
| US3 | Phase 2 complete | None (clusters use same nodes) |
| US4 | Phase 2 complete | None (theme separate domain) |
| US5 | Phase 2 complete | None (thresholds separate domain) |

### Parallel Opportunities

**Within Setup (Phase 1):**
- T002 and T003 can run in parallel

**After Foundational (Phase 2):**
- US1, US2, US3, US4, US5 can all start in parallel
- Each story touches different code paths

**Within User Story 4:**
- T029 can run in parallel with other Phase 6 tasks

---

## Parallel Example: All User Stories

```bash
# After Phase 2 completes, launch all user stories in parallel:

# Developer A: User Story 1 (config loading)
T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015

# Developer B: User Story 2 (env vars)
T016 → T017 → T018 → T019 → T020

# Developer C: User Story 3 (clusters)
T021 → T022 → T023 → T024 → T025 → T026 → T027 → T028

# Developer D: User Story 4 (themes)
T029 → T030 → T031 → T032 → T033 → T034

# Developer E: User Story 5 (thresholds)
T035 → T036 → T037 → T038 → T039 → T040
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (basic config loading)
4. Complete Phase 4: User Story 2 (secure credentials)
5. **STOP and VALIDATE**: Config files work with env var interpolation
6. This delivers core value: simplified CLI usage with secure credentials

### Incremental Delivery

1. MVP: US1 + US2 → Basic config with security
2. Add US3 → Multi-cluster support for power users
3. Add US4 + US5 → Theme and threshold customization
4. Each increment adds value independently

---

## Notes

- All tasks extend existing src/config/ infrastructure
- Contracts already defined in specs/002-yaml-config/contracts/ - copy to src/types/
- Environment variable interpolation pattern already exists in loader.ts - extend it
- No live reload - config read once at startup per spec clarification
- Error messages must be under 100 characters per SC-004
- Threshold defaults: lag 10s/60s, retention 1GB/5GB
