# Configuration File Format Contract

**Feature**: 001-project-setup-cli
**Date**: 2025-12-23

## File Format

YAML 1.2 compliant configuration file.

## Schema

```yaml
# Required: At least one node must be defined
nodes:
  <node-name>:
    host: <string>       # Required: PostgreSQL host
    port: <number>       # Optional: Default 5432
    database: <string>   # Required: Database name
    user: <string>       # Optional: Default current OS user
    password: <string>   # Optional: Supports ${ENV_VAR} syntax

# Optional: Enable pglogical mode
pglogical: <boolean>     # Default: false
```

## Example Configurations

### Single Node

```yaml
nodes:
  primary:
    host: localhost
    port: 5432
    database: myapp
    user: replication_user
    password: ${PGPASSWORD}
```

### Multi-Node (Bidirectional Replication)

```yaml
nodes:
  us-east:
    host: pg-us-east.example.com
    database: production
    user: monitor
    password: ${PG_US_EAST_PASSWORD}

  eu-west:
    host: pg-eu-west.example.com
    database: production
    user: monitor
    password: ${PG_EU_WEST_PASSWORD}

  ap-south:
    host: pg-ap-south.example.com
    database: production
    user: monitor
    password: ${PG_AP_SOUTH_PASSWORD}

pglogical: true
```

### Using Environment Variables

```yaml
nodes:
  main:
    host: ${DB_HOST}
    port: ${DB_PORT:-5432}
    database: ${DB_NAME}
    user: ${DB_USER:-postgres}
    # Password from PGPASSWORD env var (not in config)
```

### Development Configuration

```yaml
nodes:
  local:
    host: localhost
    database: dev_db
    user: developer
    # No password - using local trust auth
```

## Environment Variable Interpolation

### Syntax

```
${VAR_NAME}          # Required variable (error if not set)
${VAR_NAME:-default} # Variable with default value (future enhancement)
```

### Supported Fields

All string fields support environment variable interpolation:
- `host`
- `database`
- `user`
- `password`

Numeric fields (like `port`) do NOT support interpolation - use integer values.

### Resolution Order

1. Check if value contains `${...}` pattern
2. Extract variable name
3. Look up in `process.env`
4. If not found and no default, throw error
5. Replace pattern with resolved value

## Validation Rules

### Required Fields

| Field | Requirement |
|-------|-------------|
| `nodes` | Must have at least one node defined |
| `nodes.<name>.host` | Non-empty string |
| `nodes.<name>.database` | Non-empty string |

### Optional Fields with Defaults

| Field | Default |
|-------|---------|
| `nodes.<name>.port` | 5432 |
| `nodes.<name>.user` | Current OS username |
| `nodes.<name>.password` | None (uses PGPASSWORD or .pgpass) |
| `pglogical` | false |

### Type Constraints

| Field | Type | Constraint |
|-------|------|------------|
| `port` | integer | 1-65535 |
| `pglogical` | boolean | true/false |
| All others | string | Non-empty where required |

## Error Handling

### File Not Found

```
Error: Config file not found: /path/to/config.yaml
```

### YAML Parse Error

```
Error: Invalid YAML syntax in config: Line 3: expected ':' after key
```

### Missing Required Field

```
Error: Config validation failed: nodes.primary.host: Host is required
```

### Missing Environment Variable

```
Error: Config interpolation failed: Environment variable not found: DB_PASSWORD
```

### Empty Nodes

```
Error: Config validation failed: At least one node must be configured
```

## File Locations

### Recommended Paths

```bash
~/.replmon/config.yaml    # User-specific default
./replmon.yaml            # Project-specific
/etc/replmon/config.yaml  # System-wide (Linux)
```

### Path Resolution

Paths are resolved relative to:
1. Absolute paths: Used as-is
2. Relative paths: Relative to current working directory

```bash
# Absolute path
replmon --config /etc/replmon/config.yaml

# Relative path (from current directory)
replmon --config ./config/replmon.yaml
replmon --config config.yaml
```

## Security Considerations

1. **Never commit passwords** - Always use `${ENV_VAR}` for passwords
2. **File permissions** - Config files should be readable only by owner (chmod 600)
3. **Password precedence** - PGPASSWORD env var works as fallback
4. **.pgpass support** - PostgreSQL's native password file is supported by the pg library
