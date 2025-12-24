# Quickstart: YAML Configuration System

**Feature**: 002-yaml-config
**Date**: 2025-12-23

## Overview

This feature adds comprehensive YAML configuration file support to replmon, enabling:
- Multi-node and multi-cluster topology definitions
- Environment variable interpolation for secure credential management
- Theme configuration (dark/light with custom overrides)
- Threshold configuration for replication health alerts

## Prerequisites

- Bun 1.x or Node.js 18+
- replmon base installation

## Quick Setup

### 1. Create Config Directory

```bash
mkdir -p ~/.config/replmon
```

### 2. Create Minimal Config

Create `~/.config/replmon/config.yaml`:

```yaml
nodes:
  primary:
    host: localhost
    database: postgres
```

### 3. Run replmon

```bash
replmon
# Uses config from default location automatically
```

## Configuration Examples

### Single Node with Environment Variables

```yaml
nodes:
  production:
    host: db.example.com
    port: 5432
    database: myapp
    user: monitor
    password: ${PG_PASSWORD}  # Read from environment
```

Run with:
```bash
export PG_PASSWORD=secret123
replmon
```

### Multi-Node Setup

```yaml
nodes:
  primary:
    host: db1.example.com
    database: myapp
    user: monitor
    password: ${PG_PASSWORD}

  replica:
    host: db2.example.com
    database: myapp
    user: monitor
    password: ${PG_PASSWORD}

pglogical: true  # Enable pglogical-specific monitoring
```

### Multi-Cluster Setup

```yaml
nodes:
  prod-primary:
    host: prod-db1.example.com
    database: myapp
    password: ${PROD_PG_PASSWORD}

  prod-replica:
    host: prod-db2.example.com
    database: myapp
    password: ${PROD_PG_PASSWORD}

  staging-primary:
    host: staging-db.example.com
    database: myapp
    password: ${STAGING_PG_PASSWORD}

clusters:
  production:
    nodes: [prod-primary, prod-replica]
    default: true

  staging:
    nodes: [staging-primary]
```

Switch clusters:
```bash
replmon --cluster staging
```

### Theme Configuration

```yaml
theme: light  # or "dark" (default)

# Or with custom colors:
theme:
  name: dark
  colors:
    primary: "#00FF00"
    warning: "#FFAA00"
```

### Threshold Configuration

```yaml
thresholds:
  replication_lag:
    warning: 30   # seconds
    critical: 120

  slot_retention:
    warning: 2GB
    critical: 10GB
```

## Default Values

| Setting | Default |
|---------|---------|
| Config path | `~/.config/replmon/config.yaml` |
| Port | `5432` |
| User | Current OS username |
| Theme | `dark` |
| Lag warning | 10 seconds |
| Lag critical | 60 seconds |
| Retention warning | 1GB |
| Retention critical | 5GB |

## CLI Overrides

CLI flags take precedence over config file:

```bash
# Override host from config
replmon --host override.example.com

# Use different config file
replmon --config /path/to/other.yaml

# Combine config file with inline overrides
replmon --config prod.yaml --port 5433
```

## Environment Variable Syntax

| Syntax | Behavior |
|--------|----------|
| `${VAR}` | Use VAR value; error if not set |
| `${VAR:-default}` | Use VAR value; use "default" if not set |

## Error Messages

Config errors are concise and actionable:

```
Config error: nodes.primary.host: required
Config error: clusters.prod references undefined node: backup
Config error: Missing env var: PG_PASSWORD
Config error: thresholds.replication_lag.warning: must be positive
```

## Verification

Test your config without connecting:

```bash
# Validate config syntax (future feature)
replmon --validate

# Currently: run with debug output
DEBUG=replmon:config replmon
```
