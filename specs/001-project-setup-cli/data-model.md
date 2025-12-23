# Data Model: Project Setup & CLI

**Feature**: 001-project-setup-cli
**Date**: 2025-12-23

## Entities

### 1. Configuration

Represents the full application settings parsed from config file and CLI arguments.

```typescript
// src/types/config.ts

/**
 * Complete application configuration after merging
 * config file, CLI flags, and environment variables.
 */
export interface Configuration {
  /** Named database connections */
  nodes: Record<string, ConnectionConfig>;

  /** Enable pglogical-specific monitoring */
  pglogical: boolean;

  /** Source of configuration (for debugging) */
  source: 'file' | 'cli' | 'merged';

  /** Path to config file if loaded from file */
  configPath?: string;
}
```

**Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| nodes | `Record<string, ConnectionConfig>` | Yes | - | Named database connections |
| pglogical | `boolean` | No | `false` | Enable pglogical mode |
| source | `'file' \| 'cli' \| 'merged'` | Yes | - | Configuration source |
| configPath | `string` | No | - | Path to config file |

**Validation Rules**:
- At least one node must be defined
- All nodes must have valid host and database
- pglogical is optional, defaults to false

---

### 2. ConnectionConfig

Represents a single PostgreSQL database connection configuration.

```typescript
// src/types/connection.ts

/**
 * PostgreSQL connection configuration for a single node.
 */
export interface ConnectionConfig {
  /** PostgreSQL host address */
  host: string;

  /** PostgreSQL port */
  port: number;

  /** Database name */
  database: string;

  /** Database user */
  user: string;

  /** Database password (optional, can use PGPASSWORD env) */
  password?: string;

  /** Node display name (derived from config key if not set) */
  name?: string;
}
```

**Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| host | `string` | Yes | - | PostgreSQL host address |
| port | `number` | No | `5432` | PostgreSQL port |
| database | `string` | Yes | - | Database name |
| user | `string` | No | Current system user | Database user |
| password | `string` | No | - | Database password |
| name | `string` | No | Config key | Display name |

**Validation Rules**:
- host: non-empty string
- port: integer between 1 and 65535
- database: non-empty string
- user: non-empty string (defaults to current OS user)
- password: optional (supports PGPASSWORD env var)

---

### 3. CLIArguments

Represents parsed command-line arguments from meow.

```typescript
// src/types/cli.ts

/**
 * Parsed CLI arguments from meow.
 */
export interface CLIArguments {
  /** Path to YAML configuration file */
  config?: string;

  /** PostgreSQL host (inline connection) */
  host?: string;

  /** PostgreSQL port (inline connection) */
  port?: number;

  /** PostgreSQL database (inline connection) */
  database?: string;

  /** PostgreSQL user (inline connection) */
  user?: string;

  /** PostgreSQL password (inline connection) */
  password?: string;

  /** Enable pglogical mode */
  pglogical?: boolean;

  /** Show help text */
  help?: boolean;

  /** Show version */
  version?: boolean;
}
```

**Fields**:

| Field | Type | Short Flag | Default | Description |
|-------|------|------------|---------|-------------|
| config | `string` | `-c` | - | Path to config file |
| host | `string` | - | - | PostgreSQL host |
| port | `number` | - | `5432` | PostgreSQL port |
| database | `string` | `-d` | - | PostgreSQL database |
| user | `string` | `-u` | Current user | PostgreSQL user |
| password | `string` | - | - | PostgreSQL password |
| pglogical | `boolean` | - | `false` | Enable pglogical |
| help | `boolean` | `-h` | - | Show help |
| version | `boolean` | `-v` | - | Show version |

---

### 4. ConnectionState

Represents runtime connection state for a node (Zustand store).

```typescript
// src/store/connection.ts

/**
 * Connection status for a single node.
 */
export type NodeConnectionStatus = 'connecting' | 'connected' | 'failed';

/**
 * Application screen state.
 */
export type AppScreen = 'connection-status' | 'dashboard';

/**
 * Zustand store state for connection management.
 */
export interface ConnectionStoreState {
  /** Current screen being displayed */
  currentScreen: AppScreen;

  /** Per-node connection status */
  nodeStatus: Map<string, NodeConnectionStatus>;

  /** Per-node connection error messages */
  connectionErrors: Map<string, string>;

  /** Whether pglogical mode is enabled */
  pglogicalMode: boolean;
}

/**
 * Zustand store actions.
 */
export interface ConnectionStoreActions {
  /** Update status for a specific node */
  setNodeStatus: (nodeId: string, status: NodeConnectionStatus) => void;

  /** Set error message for a specific node */
  setConnectionError: (nodeId: string, error: string) => void;

  /** Clear error for a specific node */
  clearConnectionError: (nodeId: string) => void;

  /** Transition to a different screen */
  setCurrentScreen: (screen: AppScreen) => void;

  /** Set pglogical mode */
  setPglogicalMode: (enabled: boolean) => void;

  /** Reset all connection states (for retry) */
  resetConnectionStates: () => void;
}

export type ConnectionStore = ConnectionStoreState & ConnectionStoreActions;
```

---

### 5. YAMLConfig

Represents the raw YAML configuration file structure (before validation).

```typescript
// src/types/yaml-config.ts

/**
 * Raw YAML configuration file structure.
 * This is the shape of the parsed YAML before Zod validation.
 */
export interface YAMLConfigFile {
  /** Named node configurations */
  nodes?: Record<string, YAMLNodeConfig>;

  /** Enable pglogical mode */
  pglogical?: boolean;
}

/**
 * Raw node configuration from YAML.
 * Supports environment variable interpolation via ${VAR_NAME} syntax.
 */
export interface YAMLNodeConfig {
  host?: string;
  port?: number | string;  // May be string before interpolation
  database?: string;
  user?: string;
  password?: string;
}
```

---

## State Transitions

### Connection Status Flow

```
[Initial State]
    │
    ▼
┌─────────────────┐
│ connection-     │ ◄─── App starts
│ status          │
│                 │
│ All nodes:      │
│ "connecting"    │
└────────┬────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────┐                ┌─────────────────┐
│ At least 1      │                │ All nodes       │
│ connected       │                │ failed          │
└────────┬────────┘                └────────┬────────┘
         │                                  │
         ▼                                  │
┌─────────────────┐                         │
│ dashboard       │                         │
│                 │                         │
│ Show Topology   │                         │
│ panel focused   │                         │
└─────────────────┘                         │
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │ Stay on         │
                                   │ connection-     │
                                   │ status          │
                                   │                 │
                                   │ [r] retry       │
                                   │ [q] quit        │
                                   └─────────────────┘
```

---

## Zod Schemas

```typescript
// src/config/schemas.ts

import { z } from 'zod';
import os from 'os';

export const ConnectionConfigSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535).default(5432),
  database: z.string().min(1, 'Database is required'),
  user: z.string().min(1).default(os.userInfo().username),
  password: z.string().optional(),
  name: z.string().optional(),
});

export const ConfigurationSchema = z.object({
  nodes: z.record(z.string(), ConnectionConfigSchema).refine(
    (nodes) => Object.keys(nodes).length > 0,
    { message: 'At least one node must be configured' }
  ),
  pglogical: z.boolean().default(false),
  source: z.enum(['file', 'cli', 'merged']),
  configPath: z.string().optional(),
});

export type ValidatedConnectionConfig = z.infer<typeof ConnectionConfigSchema>;
export type ValidatedConfiguration = z.infer<typeof ConfigurationSchema>;
```

---

## Relationships

```
CLIArguments ─────────┐
                      │
                      ▼
YAMLConfigFile ──► ConfigLoader ──► Configuration
                      │
                      │ validates with
                      ▼
                 Zod Schemas
                      │
                      │ populates
                      ▼
              ConnectionStore
                      │
                      │ drives
                      ▼
              UI Components
```

1. **CLIArguments** and **YAMLConfigFile** are parsed independently
2. **ConfigLoader** merges them with CLI precedence
3. **Zod Schemas** validate the merged configuration
4. **Configuration** is the validated, runtime-ready object
5. **ConnectionStore** holds runtime state derived from Configuration
6. **UI Components** subscribe to ConnectionStore for reactive updates
