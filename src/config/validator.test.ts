/**
 * Tests for config validator
 */
import { describe, test, expect } from 'bun:test';
import { formatConfigError, transformToConfiguration } from './validator.js';
import {
  ConfigFileNotFoundError,
  ConfigValidationError,
  EnvVarInterpolationError,
} from '../types/errors.js';

describe('formatConfigError', () => {
  test('formats ConfigFileNotFoundError', () => {
    const error = new ConfigFileNotFoundError('/path/to/config.yaml');
    const message = formatConfigError(error);
    expect(message).toStartWith('Error:');
    expect(message.length).toBeLessThanOrEqual(100);
  });

  test('formats EnvVarInterpolationError', () => {
    const error = new EnvVarInterpolationError('MY_SECRET');
    const message = formatConfigError(error);
    expect(message).toStartWith('Error:');
    expect(message).toContain('MY_SECRET');
    expect(message.length).toBeLessThanOrEqual(100);
  });

  test('formats ConfigValidationError with single issue', () => {
    const error = new ConfigValidationError(['Host is required']);
    const message = formatConfigError(error);
    expect(message).toStartWith('Error:');
    expect(message.length).toBeLessThanOrEqual(100);
  });

  test('formats ConfigValidationError with multiple issues', () => {
    const error = new ConfigValidationError([
      'Host is required',
      'Database is required',
      'Port must be a number',
    ]);
    const message = formatConfigError(error);
    expect(message).toStartWith('Error:');
    expect(message.length).toBeLessThanOrEqual(100);
  });

  test('truncates very long error messages to under 100 chars', () => {
    const longMessage = 'A'.repeat(200);
    const error = new Error(longMessage);
    const message = formatConfigError(error);
    expect(message.length).toBeLessThanOrEqual(100);
    expect(message).toContain('...');
  });

  test('formats generic Error', () => {
    const error = new Error('Something went wrong');
    const message = formatConfigError(error);
    expect(message).toBe('Error: Something went wrong');
  });

  test('formats non-Error values', () => {
    const message = formatConfigError('string error');
    expect(message).toBe('Error: string error');
  });
});

describe('transformToConfiguration', () => {
  test('transforms valid YAML config to Configuration', () => {
    const yamlConfig = {
      nodes: {
        primary: {
          host: 'localhost',
          port: 5432,
          database: 'mydb',
          user: 'postgres',
        },
      },
      pglogical: true,
    };

    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    const primary = config.nodes['primary'];

    expect(primary).toBeDefined();
    expect(primary!.host).toBe('localhost');
    expect(primary!.port).toBe(5432);
    expect(primary!.database).toBe('mydb');
    expect(config.pglogical).toBe(true);
    expect(config.source).toBe('file');
    expect(config.configPath).toBe('/path/to/config.yaml');
    expect(config.theme).toBeDefined();
    expect(config.thresholds).toBeDefined();
  });

  test('throws ConfigValidationError when no nodes defined', () => {
    const yamlConfig = {};
    expect(() =>
      transformToConfiguration(yamlConfig, '/path/to/config.yaml')
    ).toThrow(ConfigValidationError);
  });

  test('throws ConfigValidationError when node missing host', () => {
    const yamlConfig = {
      nodes: {
        primary: {
          database: 'mydb',
        },
      },
    };
    expect(() =>
      transformToConfiguration(yamlConfig, '/path/to/config.yaml')
    ).toThrow(ConfigValidationError);
  });

  test('applies default port when not specified', () => {
    const yamlConfig = {
      nodes: {
        primary: {
          host: 'localhost',
          database: 'mydb',
        },
      },
    };

    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.nodes['primary']!.port).toBe(5432);
  });

  test('applies default theme and thresholds', () => {
    const yamlConfig = {
      nodes: {
        primary: {
          host: 'localhost',
          database: 'mydb',
        },
      },
    };

    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.theme!.name).toBe('dark');
    expect(config.thresholds!.replicationLag.warning).toBe(10);
    expect(config.thresholds!.replicationLag.critical).toBe(60);
  });
});
