# Feature Specification: Project Setup & CLI

**Feature Branch**: `001-project-setup-cli`
**Created**: 2025-12-23
**Status**: Draft
**Input**: User description: "Initialize replmon with Bun, TypeScript, React, and Ink. Create CLI entry point using meow with config file path, inline connection flags, and pglogical mode toggle."

## Clarifications

### Session 2025-12-23

- Q: What are the minimum required connection parameters for inline flags? → A: `--host` and `--database` required; user defaults to current system user
- Q: What exit code conventions should be used? → A: Simple convention: 0=success, 1=any error
- Q: What should the initial TUI state be on launch? → A: Show connection status screen first (connecting/connected per node), then transition to dashboard
- Q: What should the default dashboard layout be? → A: Topology panel focused (shows node relationships), with status bar at bottom
- Q: What happens if all nodes fail to connect? → A: Stay on connection status screen, show failures, allow manual retry or quit (q to exit)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Launch with Configuration File (Priority: P1)

A user wants to monitor multiple PostgreSQL nodes and has created a YAML configuration file with all their connection details. They run replmon with just a path to this config file and the application starts monitoring all configured nodes.

**Why this priority**: Configuration files are essential for production use cases where users need to monitor multiple databases with complex connection settings. This is the primary way most users will run the application.

**Independent Test**: Can be fully tested by creating a sample config file with one or more PostgreSQL connection entries, running `replmon --config path/to/config.yaml`, and verifying the application starts and attempts to connect.

**Acceptance Scenarios**:

1. **Given** a valid YAML config file exists with PostgreSQL connection details, **When** the user runs `replmon --config ./config.yaml`, **Then** the application starts and loads all connection configurations
2. **Given** the specified config file does not exist, **When** the user runs `replmon --config ./missing.yaml`, **Then** the application displays a clear error message indicating the file was not found and exits with a non-zero code
3. **Given** the config file contains invalid YAML syntax, **When** the user runs `replmon --config ./invalid.yaml`, **Then** the application displays a parse error with line number and exits gracefully

---

### User Story 2 - Launch with Inline Connection Flags (Priority: P2)

A user wants to quickly connect to a single PostgreSQL database for ad-hoc monitoring without creating a configuration file. They provide connection details directly via command-line flags.

**Why this priority**: Quick ad-hoc connections are valuable for debugging and testing, but most production users will prefer config files. This provides flexibility for casual use.

**Independent Test**: Can be fully tested by running `replmon --host localhost --port 5432 --database mydb --user postgres` and verifying the application starts with those connection parameters.

**Acceptance Scenarios**:

1. **Given** valid connection flags are provided, **When** the user runs `replmon --host localhost --port 5432 --database mydb --user postgres`, **Then** the application starts and attempts to connect with those parameters
2. **Given** required connection flags are missing (no config file and no host), **When** the user runs `replmon` with insufficient arguments, **Then** the application displays usage help and lists required options
3. **Given** both config file and inline flags are provided, **When** the user runs `replmon --config ./config.yaml --host localhost`, **Then** the inline flags override the corresponding config file values

---

### User Story 3 - Enable pglogical Mode (Priority: P2)

A user is monitoring a PostgreSQL cluster using pglogical for bidirectional replication. They need to enable pglogical-specific monitoring features to see pglogical subscriptions, node status, and conflict information.

**Why this priority**: pglogical mode is a key differentiator of replmon and required for users with pglogical setups. Equal priority to inline flags as it's a mode toggle.

**Independent Test**: Can be fully tested by running `replmon --config ./config.yaml --pglogical` and verifying the application initializes with pglogical-specific monitoring capabilities enabled.

**Acceptance Scenarios**:

1. **Given** a config file with valid connections, **When** the user runs `replmon --config ./config.yaml --pglogical`, **Then** the application starts in pglogical mode with extended monitoring features
2. **Given** pglogical mode is enabled but the database lacks pglogical extension, **When** the application attempts to query pglogical tables, **Then** it gracefully degrades to native replication monitoring and displays a warning

---

### User Story 4 - Display Help and Version (Priority: P3)

A user wants to understand what command-line options are available or check which version of replmon they have installed.

**Why this priority**: Standard CLI expectations but not core functionality. Users can discover options through documentation or trial-and-error if needed.

**Independent Test**: Can be fully tested by running `replmon --help` or `replmon --version` and verifying appropriate output is displayed.

**Acceptance Scenarios**:

1. **Given** the user wants to see available options, **When** they run `replmon --help`, **Then** the application displays formatted help text with all available flags and their descriptions
2. **Given** the user wants to check the version, **When** they run `replmon --version`, **Then** the application displays the version number and exits

---

### Edge Cases

- What happens when the config file path contains spaces or special characters?
  - The application must handle quoted paths correctly
- How does the system handle environment variables in the config file?
  - YAML config supports `${ENV_VAR}` interpolation syntax for sensitive values like passwords
- What happens when a password flag is provided without a value?
  - The application prompts interactively for the password (stdin) or reads from `PGPASSWORD` environment variable
- How does the system handle connection timeouts during startup?
  - Display connection status screen showing per-node state; transition to dashboard once at least one node connects; if all nodes fail, remain on status screen with retry (r) and quit (q) options

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a `--config` flag followed by a file path to load YAML configuration
- **FR-002**: System MUST accept inline connection flags: `--host`, `--port`, `--database`, `--user`, `--password`
- **FR-003**: System MUST accept a `--pglogical` flag to enable pglogical-specific monitoring mode
- **FR-004**: System MUST display help text when `--help` or `-h` flag is provided
- **FR-005**: System MUST display version information when `--version` or `-v` flag is provided
- **FR-006**: System MUST support environment variable interpolation in YAML config using `${VAR_NAME}` syntax
- **FR-007**: System MUST validate that either a config file or minimum inline connection flags (`--host` and `--database`) are provided; `--user` defaults to current system user, `--port` defaults to 5432
- **FR-008**: System MUST exit with code 0 on success and code 1 on any error (configuration, connection, or runtime)
- **FR-009**: System MUST allow inline flags to override corresponding config file values when both are provided
- **FR-010**: System MUST initialize a React/Ink-based TUI after successful configuration loading
- **FR-011**: System MUST support both short and long flag variants where appropriate (e.g., `-h`/`--help`, `-v`/`--version`, `-c`/`--config`)
- **FR-012**: System MUST display a connection status screen on startup showing per-node connection state (connecting/connected/failed), then transition to the main dashboard once at least one node connects
- **FR-013**: System MUST display the Topology panel as the default focused view on the main dashboard, with a status bar at the bottom showing connection health
- **FR-014**: System MUST remain on the connection status screen if all nodes fail to connect, displaying failure reasons and allowing manual retry (r) or quit (q)

### Key Entities

- **Configuration**: Represents the full application settings including connection details, monitoring preferences, and mode flags. Can be sourced from file, CLI flags, or environment variables with defined precedence.
- **Connection**: Represents a PostgreSQL database connection with host, port, database name, user, and password attributes. Multiple connections can be defined for multi-node monitoring.
- **CLI Arguments**: The parsed command-line input including flags, their values, and positional arguments.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can start the application with a config file in under 2 seconds (excluding network connection time)
- **SC-002**: Users can successfully connect to a PostgreSQL database using only command-line flags without requiring a config file
- **SC-003**: Help output displays all available options with descriptions in a readable format
- **SC-004**: Configuration errors display actionable error messages that help users fix the issue
- **SC-005**: The application gracefully handles missing pglogical extension when pglogical mode is requested
- **SC-006**: Environment variable interpolation in config files works for any standard environment variable

## Assumptions

- Bun is the preferred runtime, but the application should also work with Node.js 18+ as a fallback
- The YAML configuration format will follow standard conventions with `nodes` as the top-level key for connection definitions
- Password handling follows PostgreSQL conventions (PGPASSWORD env var, .pgpass file support can be added later)
- The default port for PostgreSQL connections is 5432 if not specified
- The default database is the same as the username if not specified (PostgreSQL convention)
