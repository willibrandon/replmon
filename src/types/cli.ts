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
