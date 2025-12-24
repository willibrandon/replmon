# Data Model: YAML Configuration System

**Feature**: 002-yaml-config
**Date**: 2025-12-23

## Entities

### 1. YAMLConfigFile (Extended)

The root YAML configuration structure. Extends existing type with clusters, theme, and thresholds.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nodes | `Record<string, YAMLNodeConfig>` | No | Named node connection configurations |
| clusters | `Record<string, YAMLClusterConfig>` | No | Named cluster definitions |
| theme | `string \| YAMLThemeConfig` | No | Theme name or custom configuration |
| thresholds | `YAMLThresholdConfig` | No | Alert threshold settings |
| pglogical | `boolean` | No | Enable pglogical mode |

**Validation Rules**:
- If `clusters` is defined, `nodes` must also be defined
- All node references in clusters must exist in `nodes`
- At most one cluster can have `default: true`

---

### 2. YAMLNodeConfig (Existing)

PostgreSQL connection configuration for a single node.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| host | `string` | Yes | — | PostgreSQL host address (supports env interpolation) |
| port | `number \| string` | No | `5432` | Port (string for env interpolation) |
| database | `string` | Yes | — | Database name (supports env interpolation) |
| user | `string` | No | OS user | Database user (supports env interpolation) |
| password | `string` | No | — | Password (supports env interpolation) |

**Validation Rules**:
- `host` is required
- `database` is required
- `port` must be 1-65535 after interpolation

---

### 3. YAMLClusterConfig (New)

A named grouping of nodes representing a replication topology.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| nodes | `string[]` | Yes | — | List of node names (references) |
| default | `boolean` | No | `false` | Mark as default cluster |

**Validation Rules**:
- `nodes` must have at least one entry
- Each node name must exist in top-level `nodes`
- If multiple clusters have `default: true`, first wins with warning

---

### 4. YAMLThemeConfig (New)

Theme configuration with optional custom colors.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | `string` | No | `dark` | Base theme name (`dark` or `light`) |
| colors | `Record<string, string>` | No | — | Custom color overrides (hex codes) |

**Allowed Color Keys**:
- `background`: Main background color
- `foreground`: Primary text color
- `primary`: Accent color for highlights
- `secondary`: Secondary accent color
- `success`: Healthy/OK state color
- `warning`: Warning state color
- `critical`: Critical/error state color
- `muted`: Dimmed/inactive text color

**Validation Rules**:
- `name` must be `dark` or `light`
- Color values must be valid hex codes (`#RGB` or `#RRGGBB`)

---

### 5. YAMLThresholdConfig (New)

Metric thresholds for replication monitoring.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| replication_lag | `ThresholdLevels` | No | `{warning: 10, critical: 60}` | Lag thresholds in seconds |
| slot_retention | `ThresholdLevels` | No | `{warning: 1GB, critical: 5GB}` | Slot retention thresholds |
| conflict_rate | `ThresholdLevels` | No | `{warning: 5, critical: 20}` | Conflict rate thresholds (per minute) |

---

### 6. ThresholdLevels (New)

Warning and critical levels for a single metric.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| warning | `number \| string` | No | — | Warning threshold (accepts `10s`, `1GB`) |
| critical | `number \| string` | No | — | Critical threshold (accepts `60s`, `5GB`) |

**Validation Rules**:
- Values must be positive
- String formats accepted: `<n>s` for seconds, `<n>MB`/`<n>GB` for bytes
- `critical` should typically be greater than `warning` (warning logged if not)

---

### 7. Configuration (Extended)

Runtime configuration after loading, parsing, and validation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nodes | `Record<string, ConnectionConfig>` | Yes | Resolved node configurations |
| activeCluster | `string` | No | Currently selected cluster name |
| clusters | `Record<string, ClusterConfig>` | No | Resolved cluster definitions |
| theme | `ResolvedTheme` | Yes | Merged theme with defaults |
| thresholds | `ResolvedThresholds` | Yes | Parsed threshold values |
| pglogical | `boolean` | Yes | pglogical mode flag |
| source | `'file' \| 'cli' \| 'merged'` | Yes | Configuration source |
| configPath | `string` | No | Path to loaded config file |

---

### 8. ResolvedTheme (New)

Fully resolved theme configuration with all colors defined.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | `'dark' \| 'light' \| 'custom'` | Yes | Theme identifier |
| colors | `ThemeColors` | Yes | Complete color palette |

---

### 9. ThemeColors (New)

Complete color palette for UI rendering.

| Field | Type | Description |
|-------|------|-------------|
| background | `string` | Main background (hex) |
| foreground | `string` | Primary text (hex) |
| primary | `string` | Accent highlight (hex) |
| secondary | `string` | Secondary accent (hex) |
| success | `string` | OK state (hex) |
| warning | `string` | Warning state (hex) |
| critical | `string` | Critical state (hex) |
| muted | `string` | Dimmed text (hex) |

---

### 10. ResolvedThresholds (New)

Parsed threshold values in canonical units.

| Field | Type | Description |
|-------|------|-------------|
| replicationLag | `{warning: number, critical: number}` | Seconds |
| slotRetention | `{warning: number, critical: number}` | Bytes |
| conflictRate | `{warning: number, critical: number}` | Conflicts per minute |

---

### 11. CLIArguments (Extended)

Parsed command-line arguments.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| config | `string` | No | Path to config file |
| cluster | `string` | No | **NEW**: Cluster name to use |
| host | `string` | No | PostgreSQL host |
| port | `number` | No | PostgreSQL port |
| database | `string` | No | Database name |
| user | `string` | No | Database user |
| password | `string` | No | Database password |
| pglogical | `boolean` | No | Enable pglogical mode |
| help | `boolean` | No | Show help |
| version | `boolean` | No | Show version |

---

## State Transitions

### Configuration Loading Flow

```
Start
  │
  ├─▶ Check --config flag
  │     │
  │     ├─ Provided ──▶ Load specified file
  │     │                    │
  │     │                    ├─ Success ──▶ Parse & Validate
  │     │                    └─ Error ────▶ Exit with error
  │     │
  │     └─ Not provided ──▶ Check default path (~/.config/replmon/config.yaml)
  │                              │
  │                              ├─ Exists ──▶ Load & Parse
  │                              └─ Missing ──▶ Use CLI args only
  │
  ├─▶ Validate YAML structure
  │     │
  │     ├─ Valid ──▶ Interpolate env vars
  │     └─ Invalid ──▶ Exit with error
  │
  ├─▶ Validate node references in clusters
  │     │
  │     ├─ Valid ──▶ Select cluster (--cluster or default)
  │     └─ Invalid ──▶ Exit with error
  │
  ├─▶ Merge CLI overrides
  │     │
  │     └─▶ Apply defaults for missing values
  │
  └─▶ Return Configuration
```

### Cluster Selection Flow

```
clusters defined?
  │
  ├─ No ──▶ Use nodes directly (backward compatible)
  │
  └─ Yes ──▶ --cluster flag provided?
                │
                ├─ Yes ──▶ Cluster exists?
                │              │
                │              ├─ Yes ──▶ Use specified cluster
                │              └─ No ───▶ List available, exit
                │
                └─ No ──▶ Find default cluster
                            │
                            ├─ default: true found ──▶ Use it
                            └─ None marked ─────────▶ Use first defined
```

---

## Entity Relationships

```
YAMLConfigFile
    │
    ├──── nodes ──────────▶ Record<name, YAMLNodeConfig>
    │                              │
    │                              └── (referenced by clusters)
    │
    ├──── clusters ───────▶ Record<name, YAMLClusterConfig>
    │                              │
    │                              └── nodes: string[] (references ↑)
    │
    ├──── theme ──────────▶ string | YAMLThemeConfig
    │
    └──── thresholds ─────▶ YAMLThresholdConfig
                                   │
                                   ├── replication_lag ──▶ ThresholdLevels
                                   ├── slot_retention ───▶ ThresholdLevels
                                   └── conflict_rate ────▶ ThresholdLevels
```

---

## Defaults

| Entity | Field | Default Value |
|--------|-------|---------------|
| YAMLNodeConfig | port | `5432` |
| YAMLNodeConfig | user | Current OS username |
| YAMLThresholdConfig | replication_lag.warning | `10` (seconds) |
| YAMLThresholdConfig | replication_lag.critical | `60` (seconds) |
| YAMLThresholdConfig | slot_retention.warning | `1073741824` (1GB) |
| YAMLThresholdConfig | slot_retention.critical | `5368709120` (5GB) |
| YAMLThresholdConfig | conflict_rate.warning | `5` (conflicts/minute) |
| YAMLThresholdConfig | conflict_rate.critical | `20` (conflicts/minute) |
| Theme | name | `dark` |
| Configuration | pglogical | `false` |
