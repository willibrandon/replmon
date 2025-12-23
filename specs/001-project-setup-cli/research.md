# Research: Project Setup & CLI

**Feature**: 001-project-setup-cli
**Date**: 2025-12-23
**Status**: Complete

## Overview

Research findings for initializing replmon with Bun/TypeScript, React/Ink TUI, and meow CLI parsing.

---

## 1. CLI Argument Parsing with meow v13

**Decision**: Use meow v13 for CLI argument parsing

**Rationale**:
- Excellent TypeScript support with full type inference
- Built-in help and version handling
- Short/long flag aliases via `shortFlag` property
- Automatic type validation for string/number/boolean flags
- ESM-native with `importMeta` support for Bun compatibility

**Alternatives Considered**:
- commander.js: More features but heavier, overkill for this use case
- yargs: Good but meow is simpler and matches project minimalism
- Manual process.argv: Error-prone, no type validation

**Implementation Pattern**:
```typescript
import meow from 'meow';

const cli = meow(`
  Usage
    $ replmon [options]

  Options
    --config, -c     Path to YAML config file
    --host           PostgreSQL host (required if no config)
    --port           PostgreSQL port (default: 5432)
    --database, -d   PostgreSQL database (required if no config)
    --user, -u       PostgreSQL user
    --password       PostgreSQL password
    --pglogical      Enable pglogical mode
    --help           Show help
    --version        Show version
`, {
  importMeta: import.meta,
  flags: {
    config: { type: 'string', shortFlag: 'c' },
    host: { type: 'string' },
    port: { type: 'number', default: 5432 },
    database: { type: 'string', shortFlag: 'd' },
    user: { type: 'string', shortFlag: 'u' },
    password: { type: 'string' },
    pglogical: { type: 'boolean', default: false },
  },
});
```

---

## 2. Ink 5.x + React 18 Terminal UI

**Decision**: Use Ink 5.x with React 18 functional components

**Rationale**:
- Native React component model for terminal UIs
- Yoga flexbox layout via Ink primitives (Box, Text)
- useInput hook for keyboard handling
- Same paradigm as web React reduces learning curve
- Strong TypeScript support

**Alternatives Considered**:
- blessed/neo-blessed: Older, imperative API, less maintainable
- terminal-kit: Lower-level, more complex
- Custom ANSI: Not practical for complex UIs

**Key Patterns**:

1. **Entry Point Structure**:
```typescript
import { render } from 'ink';
import { App } from './components/App';

const { waitUntilExit } = render(<App config={config} />);
await waitUntilExit();
```

2. **Keyboard Input Handling**:
```typescript
import { useInput } from 'ink';

useInput((input, key) => {
  if (key.escape) handleExit();
  if (input === 'q') handleExit();
  if (input === 'r') handleRetry();
});
```

3. **Screen Transitions**:
- Use Zustand state for current screen
- Conditional rendering based on `currentScreen` state
- Start on connection-status, transition to dashboard when connected

4. **Exit Handling**:
```typescript
// Graceful cleanup before exit
const handleExit = async () => {
  await connectionManager.close();
  process.exit(0);
};
```

---

## 3. YAML Configuration with Environment Variable Interpolation

**Decision**: Use `yaml` package (eemeli/yaml) with custom env interpolation

**Rationale**:
- Modern, actively maintained, excellent TypeScript support
- Better error messages with line/column information than js-yaml
- Native ESM support for Bun compatibility
- Custom interpolation needed for `${VAR_NAME}` syntax

**Alternatives Considered**:
- js-yaml: Older, slightly slower, less detailed errors
- dotenv + JSON: Less readable for connection configurations
- TOML: Less common, steeper learning curve for users

**Implementation Pattern**:

1. **Environment Variable Interpolation**:
```typescript
function interpolateEnv(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const val = process.env[varName];
    if (val === undefined) {
      throw new Error(`Environment variable not found: ${varName}`);
    }
    return val;
  });
}
```

2. **Type-Safe Validation with Zod**:
```typescript
import { z } from 'zod';

const ConnectionSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(5432),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().optional(),
});

const ConfigSchema = z.object({
  nodes: z.record(z.string(), ConnectionSchema),
  pglogical: z.boolean().optional().default(false),
});
```

3. **Config/CLI Merge Precedence**: CLI flags > environment variables > config file > defaults

---

## 4. Zustand State Management

**Decision**: Use Zustand with subscribeWithSelector middleware

**Rationale**:
- Minimal boilerplate compared to Redux
- Fine-grained subscriptions prevent unnecessary re-renders
- Works seamlessly with React/Ink
- TypeScript-first design

**Alternatives Considered**:
- Redux Toolkit: Overkill for this application size
- React Context: No fine-grained subscriptions, causes full re-renders
- MobX: More complex reactivity model

**Implementation Pattern**:

1. **Store Setup**:
```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface ConnectionState {
  currentScreen: 'connection-status' | 'dashboard';
  nodeStatus: Map<string, 'connecting' | 'connected' | 'failed'>;
  connectionErrors: Map<string, string>;

  setNodeStatus: (nodeId: string, status: 'connecting' | 'connected' | 'failed') => void;
  setCurrentScreen: (screen: 'connection-status' | 'dashboard') => void;
}

export const useStore = create<ConnectionState>()(
  subscribeWithSelector((set) => ({
    currentScreen: 'connection-status',
    nodeStatus: new Map(),
    connectionErrors: new Map(),

    setNodeStatus: (nodeId, status) => set((state) => {
      const nodeStatus = new Map(state.nodeStatus);
      nodeStatus.set(nodeId, status);
      return { nodeStatus };
    }),

    setCurrentScreen: (screen) => set({ currentScreen: screen }),
  }))
);
```

2. **Component Subscription**:
```typescript
// Fine-grained selector
const nodeStatus = useStore((s) => s.nodeStatus);
const currentScreen = useStore((s) => s.currentScreen);
```

---

## 5. Project Initialization

**Decision**: Bun as primary runtime with Node.js 18+ fallback

**Rationale**:
- Bun provides faster startup and execution
- Native TypeScript support without build step
- Built-in test runner
- Node.js compatibility ensures wider deployment options

**Package Structure**:
```json
{
  "name": "replmon",
  "type": "module",
  "main": "src/index.tsx",
  "bin": {
    "replmon": "src/index.tsx"
  },
  "scripts": {
    "start": "bun run src/index.tsx",
    "dev": "bun --watch src/index.tsx",
    "test": "bun test",
    "build": "bun build src/index.tsx --outdir dist --target node"
  },
  "dependencies": {
    "ink": "^5.0.0",
    "meow": "^13.0.0",
    "react": "^18.0.0",
    "yaml": "^2.0.0",
    "zod": "^3.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0",
    "ink-testing-library": "^4.0.0"
  }
}
```

---

## Summary

| Area | Decision | Key Dependency |
|------|----------|----------------|
| CLI Parsing | meow v13 with TypeScript | meow |
| Terminal UI | Ink 5.x + React 18 | ink, react |
| Config Loading | yaml + Zod validation | yaml, zod |
| State Management | Zustand with subscribeWithSelector | zustand |
| Runtime | Bun primary, Node.js fallback | bun |

All research items resolved. No NEEDS CLARIFICATION remaining.
