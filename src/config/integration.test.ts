/**
 * Integration tests validating quickstart.md scenarios
 *
 * These tests verify the complete config parsing flow including:
 * - YAML parsing
 * - Environment variable interpolation
 * - Cluster selection
 * - Theme resolution
 * - Threshold parsing
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseConfiguration, buildConfigurationFromCLI } from './parser.js';
import { loadConfigFile } from './loader.js';
import { transformToConfiguration } from './validator.js';
import type { CLIArguments } from '../types/cli.js';

describe('Quickstart Scenarios', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replmon-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeConfig(content: string): string {
    const configPath = path.join(tempDir, 'config.yaml');
    fs.writeFileSync(configPath, content);
    return configPath;
  }

  describe('Minimal Config (Quickstart §2)', () => {
    test('loads minimal config with just host and database', () => {
      const configPath = writeConfig(`
nodes:
  primary:
    host: localhost
    database: postgres
`);
      const yamlConfig = loadConfigFile(configPath);
      const config = transformToConfiguration(yamlConfig, configPath);

      expect(config.nodes['primary']).toBeDefined();
      expect(config.nodes['primary']!.host).toBe('localhost');
      expect(config.nodes['primary']!.database).toBe('postgres');
      expect(config.nodes['primary']!.port).toBe(5432); // default
      expect(config.source).toBe('file');
    });
  });

  describe('Single Node with Environment Variables', () => {
    test('interpolates ${VAR} from environment', () => {
      const originalEnv = process.env['PG_PASSWORD'];
      process.env['PG_PASSWORD'] = 'secret123';

      try {
        const configPath = writeConfig(`
nodes:
  production:
    host: db.example.com
    port: 5432
    database: myapp
    user: monitor
    password: \${PG_PASSWORD}
`);
        const yamlConfig = loadConfigFile(configPath);
        const config = transformToConfiguration(yamlConfig, configPath);

        expect(config.nodes['production']!.password).toBe('secret123');
      } finally {
        if (originalEnv !== undefined) {
          process.env['PG_PASSWORD'] = originalEnv;
        } else {
          delete process.env['PG_PASSWORD'];
        }
      }
    });

    test('uses ${VAR:-default} syntax for defaults', () => {
      const originalEnv = process.env['CUSTOM_PORT'];
      delete process.env['CUSTOM_PORT'];

      try {
        const configPath = writeConfig(`
nodes:
  primary:
    host: localhost
    database: postgres
    port: \${CUSTOM_PORT:-5433}
`);
        const yamlConfig = loadConfigFile(configPath);
        const config = transformToConfiguration(yamlConfig, configPath);

        expect(config.nodes['primary']!.port).toBe(5433);
      } finally {
        if (originalEnv !== undefined) {
          process.env['CUSTOM_PORT'] = originalEnv;
        }
      }
    });
  });

  describe('Multi-Node Setup', () => {
    test('loads multiple nodes with pglogical enabled', () => {
      const originalEnv = process.env['PG_PASSWORD'];
      process.env['PG_PASSWORD'] = 'secret';

      try {
        const configPath = writeConfig(`
nodes:
  primary:
    host: db1.example.com
    database: myapp
    user: monitor
    password: \${PG_PASSWORD}

  replica:
    host: db2.example.com
    database: myapp
    user: monitor
    password: \${PG_PASSWORD}

pglogical: true
`);
        const yamlConfig = loadConfigFile(configPath);
        const config = transformToConfiguration(yamlConfig, configPath);

        expect(Object.keys(config.nodes)).toEqual(['primary', 'replica']);
        expect(config.nodes['primary']!.host).toBe('db1.example.com');
        expect(config.nodes['replica']!.host).toBe('db2.example.com');
        expect(config.pglogical).toBe(true);
      } finally {
        if (originalEnv !== undefined) {
          process.env['PG_PASSWORD'] = originalEnv;
        } else {
          delete process.env['PG_PASSWORD'];
        }
      }
    });
  });

  describe('Multi-Cluster Setup', () => {
    test('selects default cluster when no --cluster flag', () => {
      const configPath = writeConfig(`
nodes:
  prod-primary:
    host: prod-db1.example.com
    database: myapp

  prod-replica:
    host: prod-db2.example.com
    database: myapp

  staging-primary:
    host: staging-db.example.com
    database: myapp

clusters:
  production:
    nodes: [prod-primary, prod-replica]
    default: true

  staging:
    nodes: [staging-primary]
`);
      const yamlConfig = loadConfigFile(configPath);
      const config = transformToConfiguration(yamlConfig, configPath);

      expect(config.activeCluster).toBe('production');
      expect(Object.keys(config.nodes)).toEqual(['prod-primary', 'prod-replica']);
    });

    test('selects staging cluster with --cluster flag', () => {
      const configPath = writeConfig(`
nodes:
  prod-primary:
    host: prod-db1.example.com
    database: myapp

  staging-primary:
    host: staging-db.example.com
    database: myapp

clusters:
  production:
    nodes: [prod-primary]
    default: true

  staging:
    nodes: [staging-primary]
`);
      const yamlConfig = loadConfigFile(configPath);
      const config = transformToConfiguration(yamlConfig, configPath, 'staging');

      expect(config.activeCluster).toBe('staging');
      expect(Object.keys(config.nodes)).toEqual(['staging-primary']);
    });
  });

  describe('Theme Configuration', () => {
    test('loads light theme from string', () => {
      const configPath = writeConfig(`
nodes:
  primary:
    host: localhost
    database: postgres

theme: light
`);
      const yamlConfig = loadConfigFile(configPath);
      const config = transformToConfiguration(yamlConfig, configPath);

      expect(config.theme.name).toBe('light');
    });

    test('loads custom colors with base theme', () => {
      const configPath = writeConfig(`
nodes:
  primary:
    host: localhost
    database: postgres

theme:
  name: dark
  colors:
    primary: "#00FF00"
    warning: "#FFAA00"
`);
      const yamlConfig = loadConfigFile(configPath);
      const config = transformToConfiguration(yamlConfig, configPath);

      expect(config.theme.name).toBe('custom');
      expect(config.theme.colors.primary).toBe('#00FF00');
      expect(config.theme.colors.warning).toBe('#FFAA00');
    });
  });

  describe('Threshold Configuration', () => {
    test('parses numeric thresholds', () => {
      const configPath = writeConfig(`
nodes:
  primary:
    host: localhost
    database: postgres

thresholds:
  replication_lag:
    warning: 30
    critical: 120

  conflict_rate:
    warning: 10
    critical: 50
`);
      const yamlConfig = loadConfigFile(configPath);
      const config = transformToConfiguration(yamlConfig, configPath);

      expect(config.thresholds.replicationLag).toEqual({ warning: 30, critical: 120 });
      expect(config.thresholds.conflictRate).toEqual({ warning: 10, critical: 50 });
    });

    test('parses human-readable byte thresholds', () => {
      const configPath = writeConfig(`
nodes:
  primary:
    host: localhost
    database: postgres

thresholds:
  slot_retention:
    warning: 2GB
    critical: 10GB
`);
      const yamlConfig = loadConfigFile(configPath);
      const config = transformToConfiguration(yamlConfig, configPath);

      expect(config.thresholds.slotRetention.warning).toBe(2147483648); // 2GB
      expect(config.thresholds.slotRetention.critical).toBe(10737418240); // 10GB
    });
  });

  describe('CLI Overrides', () => {
    test('CLI host overrides config file host', () => {
      const configPath = writeConfig(`
nodes:
  primary:
    host: config-host.example.com
    database: postgres
`);

      const args: CLIArguments = {
        config: configPath,
        host: 'cli-override.example.com',
        pglogical: false,
        help: false,
        version: false,
      };

      const config = parseConfiguration(args);

      expect(config.nodes['primary']!.host).toBe('cli-override.example.com');
    });

    test('builds config from CLI args when no config file', () => {
      const args: CLIArguments = {
        host: 'localhost',
        database: 'mydb',
        port: 5433,
        user: 'testuser',
        pglogical: true,
        help: false,
        version: false,
      };

      const config = buildConfigurationFromCLI(args);

      expect(config.nodes['default']!.host).toBe('localhost');
      expect(config.nodes['default']!.database).toBe('mydb');
      expect(config.nodes['default']!.port).toBe(5433);
      expect(config.nodes['default']!.user).toBe('testuser');
      expect(config.pglogical).toBe(true);
      expect(config.source).toBe('cli');
    });
  });
});

describe('Error Message Length Validation (SC-004)', () => {
  test('ConfigFileNotFoundError message under 100 chars', () => {
    const { formatConfigError } = require('./validator.js');
    const { ConfigFileNotFoundError } = require('../types/errors.js');

    const error = new ConfigFileNotFoundError('/path/to/nonexistent/config.yaml');
    const message = formatConfigError(error);

    expect(message.length).toBeLessThanOrEqual(100);
  });

  test('ConfigValidationError message under 100 chars', () => {
    const { formatConfigError } = require('./validator.js');
    const { ConfigValidationError } = require('../types/errors.js');

    const error = new ConfigValidationError([
      'nodes.primary.host: required',
      'nodes.replica.database: required',
      'clusters.prod references undefined node: missing',
    ]);
    const message = formatConfigError(error);

    expect(message.length).toBeLessThanOrEqual(100);
  });

  test('EnvVarInterpolationError message under 100 chars', () => {
    const { formatConfigError } = require('./validator.js');
    const { EnvVarInterpolationError } = require('../types/errors.js');

    const error = new EnvVarInterpolationError('PG_PASSWORD');
    const message = formatConfigError(error);

    expect(message.length).toBeLessThanOrEqual(100);
  });

  test('ClusterNotFoundError message under 100 chars', () => {
    const { formatConfigError } = require('./validator.js');
    const { ClusterNotFoundError } = require('../types/errors.js');

    const error = new ClusterNotFoundError('invalid-cluster', [
      'production',
      'staging',
      'development',
    ]);
    const message = formatConfigError(error);

    expect(message.length).toBeLessThanOrEqual(100);
  });

  test('InvalidThresholdError message under 100 chars', () => {
    const { formatConfigError } = require('./validator.js');
    const { InvalidThresholdError } = require('../types/errors.js');

    const error = new InvalidThresholdError(
      'thresholds.replication_lag.warning',
      'not-a-number'
    );
    const message = formatConfigError(error);

    expect(message.length).toBeLessThanOrEqual(100);
  });
});

describe('Empty Config File Handling (T044)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replmon-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('empty config file throws validation error (no nodes)', () => {
    const configPath = path.join(tempDir, 'empty.yaml');
    fs.writeFileSync(configPath, '');

    const yamlConfig = loadConfigFile(configPath);

    expect(() => transformToConfiguration(yamlConfig, configPath)).toThrow();
  });

  test('config with only whitespace throws validation error', () => {
    const configPath = path.join(tempDir, 'whitespace.yaml');
    fs.writeFileSync(configPath, '   \n\n   \n');

    const yamlConfig = loadConfigFile(configPath);

    expect(() => transformToConfiguration(yamlConfig, configPath)).toThrow();
  });

  test('config with only comments throws validation error', () => {
    const configPath = path.join(tempDir, 'comments.yaml');
    fs.writeFileSync(configPath, '# This is a comment\n# Another comment\n');

    const yamlConfig = loadConfigFile(configPath);

    expect(() => transformToConfiguration(yamlConfig, configPath)).toThrow();
  });
});

describe('Performance Validation (T043)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replmon-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('config parsing completes under 50ms', () => {
    const configPath = path.join(tempDir, 'config.yaml');
    fs.writeFileSync(
      configPath,
      `
nodes:
  node1:
    host: db1.example.com
    database: postgres
  node2:
    host: db2.example.com
    database: postgres
  node3:
    host: db3.example.com
    database: postgres

clusters:
  production:
    nodes: [node1, node2]
    default: true
  staging:
    nodes: [node3]

theme:
  name: dark
  colors:
    primary: "#00FF00"

thresholds:
  replication_lag:
    warning: 10s
    critical: 1m
  slot_retention:
    warning: 1GB
    critical: 5GB
  conflict_rate:
    warning: 5
    critical: 20

pglogical: true
`
    );

    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const yamlConfig = loadConfigFile(configPath);
      transformToConfiguration(yamlConfig, configPath);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    // Average should be under 50ms
    expect(avgTime).toBeLessThan(50);
  });
});
