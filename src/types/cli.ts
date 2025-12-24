/**
 * CLI Argument Type Definitions
 *
 * TypeScript interfaces for parsed command-line arguments.
 *
 * Feature: 002-yaml-config
 */

/**
 * Parsed CLI arguments from meow.
 * Extended with --cluster flag for multi-cluster support.
 */
export interface CLIArguments {
  /** Path to YAML configuration file */
  config?: string;

  /** Cluster name to use (when config has multiple clusters) */
  cluster?: string;

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
