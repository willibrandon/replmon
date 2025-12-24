import type { ConnectionConfig } from './connection.js';

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
