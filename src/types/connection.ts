import type { LogFileConfig } from './conflicts.js';

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

  /** Log file configuration for conflict parsing fallback */
  logConfig?: LogFileConfig;
}

// Re-export LogFileConfig for convenience
export type { LogFileConfig };

// Re-export SSL types from connection-manager for convenience
export type {
  SSLConfig,
  PoolConfig,
  NodeConnectionConfig,
} from '../services/connection-manager/types.js';
