# CLI Interface Contract

**Feature**: 001-project-setup-cli
**Date**: 2025-12-23

## Command Signature

```
replmon [options]
```

## Options

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--config` | `-c` | string | No* | - | Path to YAML configuration file |
| `--host` | - | string | No* | - | PostgreSQL host address |
| `--port` | - | number | No | 5432 | PostgreSQL port |
| `--database` | `-d` | string | No* | - | PostgreSQL database name |
| `--user` | `-u` | string | No | Current user | PostgreSQL user |
| `--password` | - | string | No | - | PostgreSQL password |
| `--pglogical` | - | boolean | No | false | Enable pglogical mode |
| `--help` | `-h` | boolean | No | - | Show help text |
| `--version` | `-v` | boolean | No | - | Show version |

*Either `--config` OR (`--host` AND `--database`) is required.

## Usage Examples

### Using Configuration File

```bash
# Standard usage with config file
replmon --config ~/.replmon/config.yaml

# Short form
replmon -c config.yaml

# With pglogical mode enabled
replmon --config production.yaml --pglogical
```

### Using Inline Flags

```bash
# Minimum required flags
replmon --host localhost --database mydb

# Full connection specification
replmon --host pg.example.com --port 5432 --database replication_db --user monitor --password secret

# With pglogical mode
replmon --host localhost --database mydb --pglogical
```

### Mixed Mode (Config + Overrides)

```bash
# Override config file host
replmon --config config.yaml --host production.internal

# Override config file with pglogical
replmon -c config.yaml --pglogical
```

### Information Commands

```bash
# Show help
replmon --help
replmon -h

# Show version
replmon --version
replmon -v
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (clean exit via 'q' or application completed) |
| 1 | Error (configuration, connection, or runtime error) |

## Error Messages

### Configuration Errors

```
Error: Either --config or (--host and --database) required
Usage: replmon [options]
...

Error: Config file not found: /path/to/missing.yaml

Error: Invalid YAML syntax in config: Line 5: expected indented block

Error: Config validation failed: nodes.primary.host: Host is required
```

### Connection Errors

```
Error: Connection refused: localhost:5432
Error: Authentication failed for user 'postgres'
Error: Database 'nonexistent' does not exist
```

## Help Output Format

```
replmon - PostgreSQL replication monitoring TUI

Usage
  $ replmon [options]

Options
  --config, -c     Path to YAML configuration file
  --host           PostgreSQL host (required if no config)
  --port           PostgreSQL port (default: 5432)
  --database, -d   PostgreSQL database (required if no config)
  --user, -u       PostgreSQL user (default: current user)
  --password       PostgreSQL password
  --pglogical      Enable pglogical bidirectional replication mode
  --help, -h       Show this help
  --version, -v    Show version

Examples
  $ replmon --config ~/.replmon/config.yaml
  $ replmon --host localhost --database myapp
  $ replmon -c config.yaml --pglogical
```

## Version Output Format

```
replmon v0.1.0
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PGPASSWORD` | PostgreSQL password (used if --password not provided) |
| `PGUSER` | PostgreSQL user (fallback if --user not provided and no OS user) |
| `PGHOST` | PostgreSQL host (not used directly, config/flags take precedence) |
| `PGPORT` | PostgreSQL port (not used directly, config/flags take precedence) |
| `PGDATABASE` | PostgreSQL database (not used directly, config/flags take precedence) |

Note: Unlike standard PostgreSQL tools, replmon requires explicit configuration. Environment variables are only used for password via `PGPASSWORD` or through `${VAR}` interpolation in config files.
