# replmon

Terminal UI for monitoring PostgreSQL logical replication with first-class pglogical support.

## Why replmon?

- **Fragmented Monitoring**: No more querying `pg_stat_replication`, `pg_stat_subscription`, and `pglogical.show_subscription_status()` separately
- **Real-time Visibility**: Live streaming updates instead of point-in-time snapshots
- **Conflict Awareness**: pglogical conflicts surfaced proactively, not buried in logs
- **Multi-node Clarity**: Visualize bidirectional replication topologies
- **Operational Speed**: Common DBA tasks without remembering SQL incantations

## Features

- Live subscription and replication slot monitoring
- Subscriptions panel with status indicators, lag metrics, and detail drill-down
- Slots panel with WAL retention progress bars, severity coloring, and WAL status badges (PG13+)
- ASCII topology visualization with node status and connection lines
- Detail modals for nodes, subscriptions, and slots (Enter to view)
- Auto-discovery of pglogical bidirectional replication relationships
- Sparkline lag charts (5-minute rolling window)
- pglogical conflict detection and display
- Operations: pause/resume subscriptions, resync tables, manage slots
- Multi-cluster configuration with easy switching
- Keyboard-driven interface (mouse optional)
- Multi-node connection pooling with health monitoring
- Parallel query execution across nodes
- Dynamic node addition/removal at runtime
- Graceful shutdown with connection draining
- Event-based polling with configurable intervals (250ms-∞)
- Per-node pglogical detection with caching
- Partial results on node failure (graceful degradation)
- Typed event subscriptions for stats, slots, subscriptions, and conflicts
- Zustand state management with devtools support
- Per-node subscription, slot, and conflict tracking
- FIFO lag history (60 samples) for sparkline visualization
- Stale data indicators when nodes disconnect
- Modal focus preservation and restoration
- Responsive layout with breakpoints (standard, narrow, short, compact)
- Atomic component system (StatusDot, Badge, ProgressBar, Spinner)
- Theme-aware UI with dark/light/custom color schemes
- Panel focus indicators with keyboard navigation
- Fullscreen mode with alternate screen buffer (like vim/less)

## Installation

```bash
# npm
npm install -g replmon

# or run directly
npx replmon --config ./replmon.yaml
```

## Usage

```bash
# Uses default config (~/.config/replmon/config.yaml)
replmon

# Explicit config file
replmon --config /path/to/config.yaml

# Switch cluster
replmon --cluster staging

# Inline connection (no config file needed)
replmon --host pg.example.com --database myapp

# Override config values with CLI flags
replmon --config prod.yaml --port 5433 --pglogical
```

## Configuration

Default config location: `~/.config/replmon/config.yaml`

```yaml
# Define PostgreSQL nodes
nodes:
  primary:
    host: pg-primary.example.com
    port: 5432
    database: myapp
    user: monitor
    password: ${PG_PASSWORD}  # Environment variable interpolation

  replica:
    host: pg-replica.example.com
    database: myapp
    password: ${PG_PASSWORD}

# Group nodes into clusters (optional)
clusters:
  production:
    nodes: [primary, replica]
    default: true

# Theme: dark, light, or custom colors
theme: dark

# Alert thresholds (human-readable formats)
thresholds:
  replication_lag:
    warning: 10s
    critical: 1m
  slot_retention:
    warning: 1GB
    critical: 5GB

pglogical: true
```

Environment variable syntax:
- `${VAR}` — Use value (error if not set)
- `${VAR:-default}` — Use value or fallback to default

See `configs/example.yaml` for all options.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `t` | Topology panel |
| `s` | Subscriptions panel |
| `l` | Slots panel |
| `c` | Conflicts panel |
| `o` | Operations panel |
| `Tab` | Next panel |
| `j/k` | Navigate lists |
| `Enter` | View details for selected item |
| `?` | Help modal |
| `Esc` | Close modal |
| `q` | Quit |

## Tech Stack

TypeScript, React, Ink, fullscreen-ink, Zustand, pg-pool — same architecture as Claude Code.

## License

MIT
