# Research: YAML Configuration System

**Feature**: 002-yaml-config
**Date**: 2025-12-23

## Research Tasks

### 1. Default Configuration Path (XDG Compliance)

**Question**: What is the correct default path for configuration files following XDG Base Directory Specification?

**Decision**: `~/.config/replmon/config.yaml`

**Rationale**:
- XDG Base Directory Specification defines `$XDG_CONFIG_HOME` (defaults to `~/.config`) for user-specific configuration
- Application should check `$XDG_CONFIG_HOME` first, fall back to `~/.config` if unset
- Windows fallback: `%APPDATA%\replmon\config.yaml` (future consideration, not in scope)

**Alternatives Considered**:
- `~/.replmon.yaml` - Simpler but violates XDG spec, pollutes home directory
- `~/.replmon/config.yaml` - Hidden directory but non-standard
- `/etc/replmon/config.yaml` - System-wide only, not user-specific

**Implementation**:
```typescript
function getDefaultConfigPath(): string {
  const xdgConfigHome = process.env['XDG_CONFIG_HOME'];
  const baseDir = xdgConfigHome || path.join(os.homedir(), '.config');
  return path.join(baseDir, 'replmon', 'config.yaml');
}
```

---

### 2. Environment Variable Interpolation

**Question**: How should environment variable interpolation work for config values?

**Decision**: Already implemented in `src/config/loader.ts` using `${VAR_NAME}` and `${VAR_NAME:-default}` syntax.

**Rationale**:
- Shell-style syntax is familiar to operators
- Default value support prevents missing variable errors in common cases
- Pattern matches Docker Compose, Kubernetes, and other DevOps tools

**Existing Implementation**: `ENV_VAR_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g`

**Extensions Needed**:
- Apply interpolation to theme and threshold string values (if any)
- Validate interpolated values post-substitution (e.g., port must be numeric)

---

### 3. Cluster-Node Reference Pattern

**Question**: How should clusters reference nodes defined at the top level?

**Decision**: Named references - nodes defined at top level, clusters reference by name.

**Rationale**:
- Enables node reuse across clusters (e.g., shared monitoring node)
- Cleaner separation of concerns (connection details vs. topology)
- Follows convention from Ansible inventory, Terraform modules
- Clarified in spec session: "Clusters reference named nodes"

**Alternatives Considered**:
- Inline node definitions - Verbose, no reuse, harder to maintain
- Node IDs - Less readable than names

**YAML Structure**:
```yaml
nodes:
  primary:
    host: db1.example.com
    database: postgres
  replica:
    host: db2.example.com
    database: postgres

clusters:
  production:
    nodes: [primary, replica]
  staging:
    nodes: [primary]  # Can reuse nodes
```

**Validation Requirements**:
- All node names in cluster must exist in top-level `nodes`
- Each cluster must have at least one node
- Clear error if referencing undefined node

---

### 4. Default Cluster Selection

**Question**: Which cluster is used when multiple are defined and `--cluster` is not specified?

**Decision**: First defined cluster, or one marked with `default: true`.

**Rationale**:
- YAML preserves insertion order, so "first defined" is deterministic
- Explicit `default: true` marker provides clear user intent
- If multiple have `default: true`, first one wins (with warning)

**Implementation Logic**:
```typescript
function selectDefaultCluster(clusters: Record<string, ClusterConfig>): string {
  // Find explicit default
  for (const [name, cluster] of Object.entries(clusters)) {
    if (cluster.default === true) return name;
  }
  // Fall back to first defined
  const names = Object.keys(clusters);
  if (names.length === 0) throw new Error('No clusters defined');
  return names[0]!;
}
```

---

### 5. Theme Configuration

**Question**: How should themes be configured and applied?

**Decision**: Built-in `dark` and `light` themes with optional custom color overrides.

**Rationale**:
- Two built-in themes cover majority of use cases
- Custom overrides allow accessibility adjustments without full theme definition
- Ink/React architecture allows theme context propagation

**Theme Structure**:
```yaml
theme: dark  # or "light"

# Optional custom overrides (merged on top of base theme)
colors:
  primary: "#00FF00"
  warning: "#FFAA00"
  critical: "#FF0000"
```

**Built-in Theme Colors** (examples):
- Dark: black background, green/blue accents, white text
- Light: white background, darker accents, black text

---

### 6. Threshold Configuration

**Question**: What thresholds should be configurable and what are the defaults?

**Decision**: Replication lag and slot retention thresholds with specific defaults.

**Rationale**:
- These are the primary health indicators for logical replication
- Defaults from spec clarification: lag 10s/60s, retention 1GB/5GB
- Warning and critical levels enable graduated alerting

**Threshold Structure**:
```yaml
thresholds:
  replication_lag:
    warning: 10      # seconds
    critical: 60     # seconds
  slot_retention:
    warning: 1073741824   # 1GB in bytes
    critical: 5368709120  # 5GB in bytes
```

**Implementation Notes**:
- Accept human-readable formats: `1GB`, `5GB`, `10s`, `60s`
- Convert to canonical units internally (bytes, seconds)
- Expose parsed numeric values to UI components

---

### 7. Config File Precedence

**Question**: What is the precedence order when config file and CLI flags are both provided?

**Decision**: CLI flags override config file values.

**Rationale**:
- Standard Unix convention (explicit flags override defaults)
- Already implemented in `src/config/parser.ts` via `mergeConfigWithCLI`
- Allows one-off overrides without editing config

**Precedence Order** (highest to lowest):
1. CLI flags
2. Environment variables (for connection, via PGPASSWORD)
3. Config file values
4. Built-in defaults

---

### 8. Error Message Format

**Question**: How should config errors be formatted for actionability (SC-004: under 100 characters)?

**Decision**: Single-line error prefix with specific field/issue.

**Rationale**:
- Under 100 chars fits terminal width
- Specific field path helps locate issue
- Follows existing `formatConfigError` pattern

**Examples**:
- `Config error: nodes.primary.host: required`
- `Config error: clusters.prod references undefined node: backup`
- `Config error: Missing env var: PG_PASSWORD`
- `Config error: thresholds.replication_lag.warning: must be positive`

---

## Summary

All research questions resolved. Key decisions:

| Topic | Decision |
|-------|----------|
| Default path | `~/.config/replmon/config.yaml` (XDG compliant) |
| Env var syntax | `${VAR}` and `${VAR:-default}` (already implemented) |
| Node references | Named references from top-level `nodes` |
| Default cluster | `default: true` marker or first defined |
| Theme | Built-in dark/light + custom color overrides |
| Thresholds | lag 10s/60s, retention 1GB/5GB defaults |
| Precedence | CLI > env > config file > defaults |
| Error format | Single-line, specific field, under 100 chars |

**No NEEDS CLARIFICATION items remain.**
