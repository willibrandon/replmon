#!/usr/bin/env bun
import { render } from 'ink';
import meow from 'meow';
import { createElement } from 'react';
import { App } from './components/App.js';
import { parseConfiguration } from './config/parser.js';
import { InsufficientArgumentsError } from './types/errors.js';
import { formatConfigError } from './config/validator.js';
import type { Configuration } from './types/config.js';
import type { CLIArguments } from './types/cli.js';

const helpText = `
  replmon - PostgreSQL replication monitoring TUI

  Usage
    $ replmon [options]

  Options
    --config, -c     Path to YAML configuration file
    --cluster        Cluster name to use (when config has multiple clusters)
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
    $ replmon --config config.yaml --cluster production
    $ replmon --host localhost --database myapp
    $ replmon -c config.yaml --pglogical
`;

const VERSION = '0.1.0';

const cli = meow(helpText, {
  importMeta: import.meta,
  description: false,
  version: `replmon v${VERSION}`,
  flags: {
    config: {
      type: 'string',
      shortFlag: 'c',
    },
    cluster: {
      type: 'string',
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
  if (cli.flags.cluster !== undefined) {
    args.cluster = cli.flags.cluster;
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
    config = parseConfiguration(args);
  } catch (error) {
    if (error instanceof InsufficientArgumentsError) {
      console.error(`Error: ${error.message}\n`);
      console.log(cli.help);
      process.exit(1);
    }
    console.error(formatConfigError(error));
    process.exit(1);
  }

  // Check for interactive terminal
  if (!process.stdin.isTTY) {
    console.error('Error: replmon requires an interactive terminal');
    process.exit(1);
  }

  // Render the application
  inkInstance = render(createElement(App, { config }));
}

main();
