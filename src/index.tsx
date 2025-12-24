#!/usr/bin/env bun
import { render } from 'ink';
import meow from 'meow';
import { createElement } from 'react';
import { App } from './components/App.js';
import { loadConfigFile } from './config/loader.js';
import { transformToConfiguration, formatConfigError } from './config/validator.js';
import type { Configuration } from './types/config.js';
import type { CLIArguments } from './types/cli.js';
import os from 'os';

const helpText = `
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
`;

const cli = meow(helpText, {
  importMeta: import.meta,
  flags: {
    config: {
      type: 'string',
      shortFlag: 'c',
    },
    host: {
      type: 'string',
    },
    port: {
      type: 'number',
    },
    database: {
      type: 'string',
      shortFlag: 'd',
    },
    user: {
      type: 'string',
      shortFlag: 'u',
    },
    password: {
      type: 'string',
    },
    pglogical: {
      type: 'boolean',
      default: false,
    },
  },
});

/**
 * Parse CLI flags into typed arguments.
 */
function parseCliFlags(): CLIArguments {
  const args: CLIArguments = {};

  if (cli.flags.config !== undefined) {
    args.config = cli.flags.config;
  }
  if (cli.flags.host !== undefined) {
    args.host = cli.flags.host;
  }
  if (cli.flags.port !== undefined) {
    args.port = cli.flags.port;
  }
  if (cli.flags.database !== undefined) {
    args.database = cli.flags.database;
  }
  if (cli.flags.user !== undefined) {
    args.user = cli.flags.user;
  }
  if (cli.flags.password !== undefined) {
    args.password = cli.flags.password;
  }
  if (cli.flags.pglogical !== undefined) {
    args.pglogical = cli.flags.pglogical;
  }

  return args;
}

/**
 * Build configuration from CLI arguments (inline flags only, no config file).
 */
function buildConfigFromCLI(args: CLIArguments): Configuration {
  const currentUser = os.userInfo().username;

  const nodeConfig: Configuration['nodes'][string] = {
    host: args.host!,
    port: args.port ?? 5432,
    database: args.database!,
    user: args.user ?? currentUser,
    name: 'default',
  };

  // Only add password if defined (exactOptionalPropertyTypes)
  if (args.password !== undefined) {
    nodeConfig.password = args.password;
  }

  return {
    nodes: {
      default: nodeConfig,
    },
    pglogical: args.pglogical ?? false,
    source: 'cli',
  };
}

/**
 * Load configuration from file, CLI args, or merged.
 */
function loadConfiguration(args: CLIArguments): Configuration {
  // Case 1: Config file provided
  if (args.config) {
    const yamlConfig = loadConfigFile(args.config);
    const config = transformToConfiguration(yamlConfig, args.config);

    // Apply CLI overrides for pglogical flag
    if (args.pglogical) {
      config.pglogical = true;
    }

    return config;
  }

  // Case 2: Inline flags only (requires host and database)
  if (args.host && args.database) {
    return buildConfigFromCLI(args);
  }

  // Case 3: Neither config nor sufficient inline args
  throw new Error('Either --config or (--host and --database) required');
}

/**
 * Exit handler for cleanup.
 */
let inkInstance: ReturnType<typeof render> | null = null;

export function exitApp(code: number): void {
  if (inkInstance) {
    inkInstance.unmount();
  }
  process.exit(code);
}

/**
 * Main entry point.
 */
function main(): void {
  const args = parseCliFlags();

  let config: Configuration;
  try {
    config = loadConfiguration(args);
  } catch (error) {
    console.error(formatConfigError(error));
    process.exit(1);
  }

  // Render the application
  inkInstance = render(createElement(App, { config }));
}

main();
