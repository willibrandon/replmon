# Feature Specification: YAML Configuration System

**Feature Branch**: `002-yaml-config`
**Created**: 2025-12-23
**Status**: Draft
**Input**: User description: "YAML config file support with clusters, nodes, and settings. Environment variable interpolation for passwords. Multi-cluster definitions with switching support. Theme and threshold settings."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load Configuration from YAML File (Priority: P1)

As a database administrator, I want to define my PostgreSQL replication topology in a YAML configuration file so that I can manage connection settings, cluster definitions, and application preferences without passing numerous command-line flags.

**Why this priority**: This is the foundational capability. Without the ability to load and parse configuration files, none of the other features (clusters, themes, thresholds) can work. A usable config file system provides immediate value by simplifying command-line usage.

**Independent Test**: Can be fully tested by creating a YAML file with node definitions and verifying the application connects to those nodes. Delivers immediate value by eliminating repetitive CLI flags.

**Acceptance Scenarios**:

1. **Given** a valid YAML config file at `~/.config/replmon/config.yaml`, **When** the user runs `replmon`, **Then** the application loads connection settings from that file automatically.
2. **Given** a YAML file specified via `--config /path/to/config.yaml`, **When** the user runs `replmon`, **Then** the application uses the specified config file instead of the default location.
3. **Given** both a config file and CLI flags, **When** the user runs `replmon --host override.example.com`, **Then** CLI flags take precedence over config file values.
4. **Given** an invalid YAML file (syntax errors), **When** the user runs `replmon`, **Then** the application displays a clear error message indicating the problem and exits gracefully.

---

### User Story 2 - Secure Credential Management via Environment Variables (Priority: P1)

As a security-conscious operator, I want to reference environment variables in my config file so that I can avoid storing sensitive credentials (passwords, connection strings) in plain text files.

**Why this priority**: Security is critical for database tools. Users must be able to store configs in version control without exposing credentials. This is a P1 because it unblocks secure deployment workflows.

**Independent Test**: Can be tested by setting environment variables and verifying they are correctly substituted into connection parameters. Delivers value by enabling secure config storage.

**Acceptance Scenarios**:

1. **Given** a config with `password: ${PG_PASSWORD}` and the environment variable `PG_PASSWORD=secret123`, **When** the user runs `replmon`, **Then** the application uses `secret123` as the password.
2. **Given** a config with `password: ${PG_PASSWORD:-defaultpass}` and no `PG_PASSWORD` environment variable set, **When** the user runs `replmon`, **Then** the application uses `defaultpass` as the password.
3. **Given** a config with `password: ${PG_PASSWORD}` and no `PG_PASSWORD` set (and no default), **When** the user runs `replmon`, **Then** the application displays an error indicating the missing environment variable and exits.

---

### User Story 3 - Multi-Cluster Definitions with Switching (Priority: P2)

As a DBA managing multiple PostgreSQL environments (dev, staging, production), I want to define multiple clusters in a single config file so that I can quickly switch between environments without maintaining separate config files.

**Why this priority**: While useful for power users with multiple environments, single-cluster usage already provides full functionality. Multi-cluster is an enhancement that reduces friction for users managing multiple environments.

**Independent Test**: Can be tested by defining two clusters in config, launching with `--cluster staging`, and verifying connections go to staging nodes. Delivers value by simplifying multi-environment workflows.

**Acceptance Scenarios**:

1. **Given** a config file with `clusters: { production: {...}, staging: {...} }`, **When** the user runs `replmon --cluster production`, **Then** the application connects to the production cluster nodes.
2. **Given** multiple clusters defined, **When** the user runs `replmon` without specifying a cluster, **Then** the application uses the first defined cluster (or one marked as default).
3. **Given** an invalid cluster name specified, **When** the user runs `replmon --cluster nonexistent`, **Then** the application displays available cluster names and exits with an error.

---

### User Story 4 - Theme Configuration (Priority: P3)

As a user with specific terminal preferences, I want to configure the application's color theme so that I can match my terminal setup or accommodate visual accessibility needs.

**Why this priority**: The application works fine with default colors. Theme customization is a quality-of-life improvement that doesn't affect core functionality.

**Independent Test**: Can be tested by setting a theme in config and verifying UI colors change accordingly. Delivers value by improving visual experience and accessibility.

**Acceptance Scenarios**:

1. **Given** a config with `theme: dark`, **When** the user runs `replmon`, **Then** the UI uses the dark color scheme.
2. **Given** a config with custom color overrides for specific UI elements, **When** the user runs `replmon`, **Then** the specified colors are applied to those elements.
3. **Given** an invalid theme name, **When** the user runs `replmon`, **Then** the application warns about the invalid theme and falls back to the default.

---

### User Story 5 - Threshold and Alert Settings (Priority: P3)

As an operator monitoring replication health, I want to configure thresholds for metrics (lag, slot retention, conflict rates) so that the UI highlights problems according to my environment's specific requirements.

**Why this priority**: The application can function with sensible default thresholds. Custom thresholds are an advanced feature for users who need to tune alerting to their specific SLAs.

**Independent Test**: Can be tested by setting a lag threshold in config and verifying the UI changes warning/critical indicators at those values. Delivers value by enabling environment-specific alerting.

**Acceptance Scenarios**:

1. **Given** a config with `thresholds: { replication_lag: { warning: 30, critical: 60 } }`, **When** lag reaches 35 seconds, **Then** the UI shows a warning indicator.
2. **Given** a config with `thresholds: { slot_retention: { warning: "100MB" } }`, **When** a slot retains 150MB, **Then** the UI shows a warning for that slot.
3. **Given** no threshold settings in config, **When** the user runs `replmon`, **Then** default thresholds are used (lag: 10s warn/60s critical, retention: 1GB warn/5GB critical).

---

### Edge Cases

- What happens when the config file is not readable (permissions issue)? The application displays a clear error about file permissions.
- What happens when environment variable interpolation creates an invalid value (e.g., non-numeric port)? The application validates the final config and reports which field has an invalid value.
- What happens when a cluster references a node that doesn't exist? The application validates cluster-node references and reports missing nodes.
- What happens when the config file is empty? The application treats it as no configuration and proceeds with defaults or CLI flags.
- What happens when nested environment variables are used (e.g., `${${PREFIX}_PASSWORD}`)? This is not supported; the application uses literal matching only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST load configuration from a YAML file at the default location (`~/.config/replmon/config.yaml`) if no `--config` flag is provided
- **FR-002**: System MUST allow specifying an alternate config file path via `--config <path>` CLI flag
- **FR-003**: System MUST interpolate environment variables in config values using `${VAR_NAME}` syntax
- **FR-004**: System MUST support default values for environment variables using `${VAR_NAME:-default}` syntax
- **FR-005**: System MUST exit with a clear error if a required environment variable is missing (no default provided)
- **FR-006**: System MUST merge CLI flags on top of config file values, with CLI taking precedence
- **FR-007**: System MUST validate the config file structure and report meaningful errors for invalid configurations
- **FR-008**: System MUST support defining multiple named clusters, each containing its own set of nodes
- **FR-009**: System MUST allow selecting a cluster via `--cluster <name>` CLI flag
- **FR-010**: System MUST use a default cluster when multiple are defined and none is specified
- **FR-011**: System MUST support theme selection via a `theme` configuration key
- **FR-012**: System MUST support threshold configuration for replication metrics (lag, slot retention)
- **FR-013**: System MUST provide default thresholds when not explicitly configured: replication lag warning at 10 seconds / critical at 60 seconds; slot retention warning at 1GB / critical at 5GB; conflict rate warning at 5 / critical at 20 conflicts per minute
- **FR-014**: System MUST support node definitions with host, port, database, user, and password fields
- **FR-015**: System MUST gracefully handle missing config file at default location (not an error, just no config)

### Key Entities

- **Config File**: A YAML document containing all application settings. Located at a default path or specified via CLI. Contains clusters, theme, and threshold settings.
- **Cluster**: A named grouping of database nodes representing a single replication topology. Has a unique name and references one or more nodes by name (nodes are defined separately at the top level and referenced within clusters, enabling node reuse across clusters).
- **Node**: A PostgreSQL database connection target. Has host, port, database, user, and password. May use environment variable interpolation for sensitive values.
- **Theme**: A named color scheme applied to the TUI. Built-in themes (dark, light) plus optional custom color overrides.
- **Thresholds**: Numeric limits that define when metrics transition between normal, warning, and critical states. Default values: replication lag warning at 10 seconds / critical at 60 seconds; slot retention warning at 1GB / critical at 5GB. Applied to replication lag, slot retention, and conflict rates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can set up a complete multi-node monitoring configuration in under 5 minutes using the config file
- **SC-002**: 100% of sensitive credentials can be externalized via environment variables (no plaintext passwords required in config)
- **SC-003**: Users can switch between clusters (e.g., dev to production) with a single flag change
- **SC-004**: Invalid configurations produce actionable error messages that identify the specific problem in under 100 characters
- **SC-005**: The application starts successfully with no config file present (using CLI flags or defaults)
- **SC-006**: Users report the config file format is intuitive and requires no documentation lookup after first use

## Clarifications

### Session 2025-12-23

- Q: How are nodes referenced within clusters? → A: Clusters reference named nodes (nodes defined separately at top level, clusters reference by name)
- Q: Should the application detect and respond to config file changes at runtime? → A: No live reload; config is read once at startup, restart required for changes
- Q: What are the default threshold values? → A: Document specific defaults: replication lag warning 10s / critical 60s, slot retention warning 1GB / critical 5GB

## Assumptions

- The YAML configuration format follows standard YAML 1.2 syntax
- Default config file location follows XDG Base Directory Specification on Linux/macOS (`~/.config/replmon/config.yaml`)
- Theme names are limited to a predefined set (dark, light) with optional custom color overrides rather than fully custom themes
- Threshold values use common units (seconds for lag, bytes/MB for retention)
- A cluster marked with `default: true` or the first cluster defined serves as the default when `--cluster` is not specified
- Node connection defaults (port 5432, database postgres) follow PostgreSQL conventions
- Configuration is loaded once at application startup; changes require restart (no live reload)
