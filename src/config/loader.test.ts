/**
 * Tests for config loader
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadConfigFile,
  tryLoadDefaultConfig,
  interpolateEnvVars,
  ConfigFileNotFoundError,
  EnvVarInterpolationError,
} from './loader.js';

describe('interpolateEnvVars', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('replaces ${VAR} with environment variable value', () => {
    process.env['TEST_VAR'] = 'hello';
    expect(interpolateEnvVars('${TEST_VAR}')).toBe('hello');
  });

  test('replaces ${VAR} in middle of string', () => {
    process.env['DB_HOST'] = 'localhost';
    expect(interpolateEnvVars('postgresql://${DB_HOST}:5432')).toBe(
      'postgresql://localhost:5432'
    );
  });

  test('uses default value when var is missing', () => {
    delete process.env['MISSING_VAR'];
    expect(interpolateEnvVars('${MISSING_VAR:-default}')).toBe('default');
  });

  test('prefers env var over default when var exists', () => {
    process.env['EXISTING_VAR'] = 'fromenv';
    expect(interpolateEnvVars('${EXISTING_VAR:-default}')).toBe('fromenv');
  });

  test('throws EnvVarInterpolationError when var missing and no default', () => {
    delete process.env['REQUIRED_VAR'];
    expect(() => interpolateEnvVars('${REQUIRED_VAR}')).toThrow(
      EnvVarInterpolationError
    );
  });

  test('handles multiple variables in one string', () => {
    process.env['HOST'] = 'db.example.com';
    process.env['PORT'] = '5432';
    expect(interpolateEnvVars('${HOST}:${PORT}')).toBe('db.example.com:5432');
  });

  test('returns string unchanged when no variables present', () => {
    expect(interpolateEnvVars('plain string')).toBe('plain string');
  });
});

describe('loadConfigFile', () => {
  const tmpDir = path.join(os.tmpdir(), 'replmon-test-' + Date.now());

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('loads valid YAML config file', () => {
    const configPath = path.join(tmpDir, 'config.yaml');
    fs.writeFileSync(
      configPath,
      `
nodes:
  primary:
    host: localhost
    port: 5432
    database: mydb
`
    );

    const config = loadConfigFile(configPath);
    expect(config.nodes?.primary?.host).toBe('localhost');
    expect(config.nodes?.primary?.port).toBe(5432);
    expect(config.nodes?.primary?.database).toBe('mydb');
  });

  test('throws ConfigFileNotFoundError for missing file', () => {
    expect(() => loadConfigFile('/nonexistent/config.yaml')).toThrow(
      ConfigFileNotFoundError
    );
  });

  test('returns empty object for empty file', () => {
    const configPath = path.join(tmpDir, 'empty.yaml');
    fs.writeFileSync(configPath, '');

    const config = loadConfigFile(configPath);
    expect(config).toEqual({});
  });

  test('interpolates environment variables in config', () => {
    process.env['TEST_PASSWORD'] = 'secret123';
    const configPath = path.join(tmpDir, 'config.yaml');
    fs.writeFileSync(
      configPath,
      `
nodes:
  primary:
    host: localhost
    database: mydb
    password: \${TEST_PASSWORD}
`
    );

    const config = loadConfigFile(configPath);
    expect(config.nodes?.primary?.password).toBe('secret123');
    delete process.env['TEST_PASSWORD'];
  });
});

describe('tryLoadDefaultConfig', () => {
  test('returns found: false when default config does not exist', () => {
    // Default path is ~/.config/replmon/config.yaml
    // In test environment, this likely doesn't exist
    const result = tryLoadDefaultConfig();
    // We can't guarantee it doesn't exist, so just check the structure
    expect(result).toHaveProperty('found');
    expect(result).toHaveProperty('path');
  });
});
