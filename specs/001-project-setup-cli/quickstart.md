# Quickstart: Project Setup & CLI

**Feature**: 001-project-setup-cli
**Date**: 2025-12-23

This guide walks through testing the replmon CLI after implementation.

## Prerequisites

- Bun 1.x installed (or Node.js 18+)
- PostgreSQL 10+ instance accessible
- (Optional) pglogical extension installed for pglogical mode

## Installation

```bash
# Clone and install dependencies
cd replmon
bun install

# Verify installation
bun run src/index.tsx --version
```

## Quick Test Commands

### 1. Display Help

```bash
bun run src/index.tsx --help
```

**Expected Output**:
```
replmon - PostgreSQL replication monitoring TUI

Usage
  $ replmon [options]

Options
  --config, -c     Path to YAML configuration file
  --host           PostgreSQL host (required if no config)
  ...
```

### 2. Display Version

```bash
bun run src/index.tsx --version
```

**Expected Output**:
```
replmon v0.1.0
```

### 3. Error on Missing Arguments

```bash
bun run src/index.tsx
```

**Expected Output**:
```
Error: Either --config or (--host and --database) required
```

**Exit Code**: 1

### 4. Connect with Inline Flags

```bash
# Replace with your PostgreSQL credentials
bun run src/index.tsx --host localhost --database postgres --user postgres
```

**Expected Behavior**:
1. Connection status screen appears
2. Shows "Connecting to localhost..."
3. On success, transitions to dashboard with Topology panel
4. Press `q` to quit

### 5. Connect with Config File

Create `test-config.yaml`:
```yaml
nodes:
  local:
    host: localhost
    port: 5432
    database: postgres
    user: postgres

pglogical: false
```

Run:
```bash
bun run src/index.tsx --config test-config.yaml
```

**Expected Behavior**: Same as inline flags test.

### 6. Test Environment Variable Interpolation

Create `env-config.yaml`:
```yaml
nodes:
  main:
    host: ${TEST_PG_HOST:-localhost}
    database: ${TEST_PG_DB:-postgres}
    user: ${TEST_PG_USER:-postgres}
```

Run:
```bash
export TEST_PG_HOST=localhost
export TEST_PG_DB=postgres
bun run src/index.tsx --config env-config.yaml
```

**Expected Behavior**: Connects using interpolated values.

### 7. Test CLI Override of Config

```bash
bun run src/index.tsx --config test-config.yaml --host 127.0.0.1
```

**Expected Behavior**: Uses `127.0.0.1` instead of config file's `localhost`.

### 8. Test pglogical Mode

```bash
bun run src/index.tsx --config test-config.yaml --pglogical
```

**Expected Behavior**:
- If pglogical extension exists: Shows extended monitoring
- If no pglogical: Shows warning, degrades to native replication monitoring

### 9. Test Connection Failure

```bash
bun run src/index.tsx --host nonexistent.local --database test
```

**Expected Behavior**:
1. Connection status screen shows "Failed" status
2. Error message displayed (e.g., "Connection refused" or "Host not found")
3. Shows `[r] retry  [q] quit` options
4. Press `r` to retry, `q` to exit

### 10. Test Keyboard Navigation on Connection Screen

While on connection status screen:
- Press `r`: Retry connection
- Press `q`: Quit application (exit code 0)

## Validation Checklist

| Test | Expected | Pass? |
|------|----------|-------|
| `--help` shows usage | Help text displayed | [ ] |
| `--version` shows version | Version displayed | [ ] |
| No args shows error | Error + exit code 1 | [ ] |
| Inline flags connect | Connection screen → dashboard | [ ] |
| Config file connects | Connection screen → dashboard | [ ] |
| Env var interpolation | Values resolved from env | [ ] |
| CLI overrides config | CLI value takes precedence | [ ] |
| pglogical flag accepted | Mode enabled or graceful degradation | [ ] |
| Failed connection shows error | Error displayed, retry available | [ ] |
| `q` exits cleanly | Exit code 0 | [ ] |
| `r` retries connection | Connection attempt restarts | [ ] |

## Troubleshooting

### "Config file not found"

Ensure the path is correct and file exists:
```bash
ls -la path/to/config.yaml
```

### "Environment variable not found"

Check that required variables are exported:
```bash
echo $VAR_NAME
export VAR_NAME=value
```

### Connection refused

1. Verify PostgreSQL is running: `pg_isready -h localhost`
2. Check port: `pg_isready -h localhost -p 5432`
3. Verify credentials with psql: `psql -h localhost -U postgres -d postgres`

### TUI not rendering correctly

1. Ensure terminal supports 256 colors
2. Try a different terminal (iTerm2, Alacritty, etc.)
3. Check terminal dimensions (minimum 80x24 recommended)
