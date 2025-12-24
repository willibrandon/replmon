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
