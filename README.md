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
- ASCII topology visualization with latency display
- Sparkline lag charts (5-minute rolling window)
- pglogical conflict detection and display
- Operations: pause/resume subscriptions, resync tables, manage slots
- Multi-cluster configuration with easy switching
- Keyboard-driven interface (mouse optional)

## Installation

```bash
# npm
npm install -g replmon

# or run directly
npx replmon --config ./replmon.yaml
```

## Usage

```bash
# With config file
replmon --config ~/.config/replmon/config.yaml

# Inline connection
replmon --host pg.example.com --port 5432 --database myapp --user replmon

# Multiple nodes with pglogical
replmon \
  --node us-east:pg-us.example.com:5432/myapp \
  --node eu-west:pg-eu.example.com:5432/myapp \
  --pglogical
```

## Configuration

```yaml
clusters:
  production:
    nodes:
      - name: us-east
        host: pg-us-east.example.com
        port: 5432
        database: app_db
        user: replmon
        role: provider
      - name: eu-west
        host: pg-eu-west.example.com
        port: 5432
        database: app_db
        user: replmon
        role: subscriber
    pglogical: true
    pollInterval: 1000

settings:
  theme: default
  lagWarningThreshold: 5000
  lagCriticalThreshold: 30000
```

Passwords via environment variables: `REPLMON_<NODE_NAME>_PASSWORD`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `t` | Topology panel |
| `s` | Subscriptions panel |
| `l` | Lag chart |
| `c` | Conflicts panel |
| `o` | Operations modal |
| `Tab` | Next panel |
| `j/k` | Navigate lists |
| `q` | Quit |

## Tech Stack

TypeScript, React, Ink, Zustand, pg-pool — same architecture as Claude Code.

## License

MIT
