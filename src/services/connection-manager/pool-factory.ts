/**
 * Pool Factory
 *
 * Creates pg-pool instances from NodeConnectionConfig.
 * Handles SSL configuration transformation.
 */

import pg from 'pg';
import type { NodeConnectionConfig, SSLConfig } from './types.js';

const { Pool } = pg;

/** Default pool configuration values */
const DEFAULT_POOL_CONFIG = {
  min: 1,
  max: 10,
  idleTimeoutMs: 30000,
  connectionTimeoutMs: 5000,
};

/**
 * Transform SSLConfig to pg-compatible ssl options.
 * Handles path vs PEM content detection for certificates.
 */
function transformSSLConfig(ssl: SSLConfig | undefined): pg.PoolConfig['ssl'] {
  if (!ssl || !ssl.enabled) {
    return false;
  }

  const result: {
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  } = {
    rejectUnauthorized: ssl.rejectUnauthorized ?? true,
  };

  if (ssl.ca) {
    result.ca = ssl.ca;
  }

  if (ssl.cert) {
    result.cert = ssl.cert;
  }

  if (ssl.key) {
    result.key = ssl.key;
  }

  return result;
}

/**
 * Create a pg-pool instance from NodeConnectionConfig.
 *
 * @param config - Node connection configuration
 * @returns Configured Pool instance
 */
export function createPool(config: NodeConnectionConfig): pg.Pool {
  const poolConfig = config.pool ?? {};

  const pgConfig: pg.PoolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: transformSSLConfig(config.ssl),
    min: poolConfig.min ?? DEFAULT_POOL_CONFIG.min,
    max: poolConfig.max ?? DEFAULT_POOL_CONFIG.max,
    idleTimeoutMillis: poolConfig.idleTimeoutMs ?? DEFAULT_POOL_CONFIG.idleTimeoutMs,
    connectionTimeoutMillis: poolConfig.connectionTimeoutMs ?? DEFAULT_POOL_CONFIG.connectionTimeoutMs,
  };

  return new Pool(pgConfig);
}

export { Pool };
export type { Pool as PoolType } from 'pg';
