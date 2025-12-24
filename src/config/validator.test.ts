/**
 * Tests for config validator
 */
import { describe, test, expect } from 'bun:test';
import {
  formatConfigError,
  transformToConfiguration,
  validateClusterNodeReferences,
  selectDefaultCluster,
  resolveCluster,
  transformClusters,
  filterNodesToCluster,
  validateHexColor,
  validateThemeColors,
} from './validator.js';
import {
  ConfigFileNotFoundError,
  ConfigValidationError,
  EnvVarInterpolationError,
  ClusterNodeReferenceError,
  ClusterNotFoundError,
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

  test('transforms config with clusters and filters to active cluster', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'db1.example.com', database: 'postgres' },
        replica: { host: 'db2.example.com', database: 'postgres' },
        staging: { host: 'staging.example.com', database: 'postgres' },
      },
      clusters: {
        production: { nodes: ['primary', 'replica'], default: true },
        dev: { nodes: ['staging'] },
      },
    };

    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');

    // Should have all clusters defined
    expect(config.clusters).toBeDefined();
    expect(Object.keys(config.clusters!)).toEqual(['production', 'dev']);

    // Should have activeCluster set to production (marked as default)
    expect(config.activeCluster).toBe('production');

    // Should only have nodes from the active cluster
    expect(Object.keys(config.nodes)).toEqual(['primary', 'replica']);
    expect(config.nodes['staging']).toBeUndefined();
  });

  test('selects first cluster when no default is marked', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'db1.example.com', database: 'postgres' },
        staging: { host: 'staging.example.com', database: 'postgres' },
      },
      clusters: {
        production: { nodes: ['primary'] },
        dev: { nodes: ['staging'] },
      },
    };

    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');

    // Should select first cluster (production)
    expect(config.activeCluster).toBe('production');
    expect(Object.keys(config.nodes)).toEqual(['primary']);
  });

  test('uses --cluster flag to select specific cluster', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'db1.example.com', database: 'postgres' },
        staging: { host: 'staging.example.com', database: 'postgres' },
      },
      clusters: {
        production: { nodes: ['primary'], default: true },
        dev: { nodes: ['staging'] },
      },
    };

    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml', 'dev');

    // Should use requested cluster instead of default
    expect(config.activeCluster).toBe('dev');
    expect(Object.keys(config.nodes)).toEqual(['staging']);
  });

  test('throws ClusterNotFoundError for invalid cluster name', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'db1.example.com', database: 'postgres' },
      },
      clusters: {
        production: { nodes: ['primary'] },
      },
    };

    expect(() =>
      transformToConfiguration(yamlConfig, '/path/to/config.yaml', 'nonexistent')
    ).toThrow(ClusterNotFoundError);
  });

  test('throws ClusterNodeReferenceError for undefined node reference', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'db1.example.com', database: 'postgres' },
      },
      clusters: {
        production: { nodes: ['primary', 'missing_node'] },
      },
    };

    expect(() =>
      transformToConfiguration(yamlConfig, '/path/to/config.yaml')
    ).toThrow(ClusterNodeReferenceError);
  });
});

describe('validateClusterNodeReferences', () => {
  test('passes when all node references exist', () => {
    const clusters = {
      production: { nodes: ['primary', 'replica'] },
      dev: { nodes: ['staging'] },
    };
    const nodeNames = ['primary', 'replica', 'staging'];

    expect(() => validateClusterNodeReferences(clusters, nodeNames)).not.toThrow();
  });

  test('throws ClusterNodeReferenceError for missing node', () => {
    const clusters = {
      production: { nodes: ['primary', 'missing'] },
    };
    const nodeNames = ['primary', 'replica'];

    expect(() => validateClusterNodeReferences(clusters, nodeNames)).toThrow(
      ClusterNodeReferenceError
    );
  });

  test('includes cluster name and missing nodes in error', () => {
    const clusters = {
      production: { nodes: ['missing1', 'missing2'] },
    };
    const nodeNames = ['primary'];

    try {
      validateClusterNodeReferences(clusters, nodeNames);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(ClusterNodeReferenceError);
      const clusterError = error as ClusterNodeReferenceError;
      expect(clusterError.clusterName).toBe('production');
      expect(clusterError.missingNodes).toEqual(['missing1', 'missing2']);
    }
  });
});

describe('selectDefaultCluster', () => {
  test('returns cluster marked as default', () => {
    const clusters = {
      production: { nodes: ['primary'] },
      staging: { nodes: ['staging'], default: true },
    };

    expect(selectDefaultCluster(clusters)).toBe('staging');
  });

  test('returns first cluster when no default is marked', () => {
    const clusters = {
      production: { nodes: ['primary'] },
      staging: { nodes: ['staging'] },
    };

    expect(selectDefaultCluster(clusters)).toBe('production');
  });

  test('throws when no clusters are defined', () => {
    const clusters = {};

    expect(() => selectDefaultCluster(clusters)).toThrow(ConfigValidationError);
  });
});

describe('resolveCluster', () => {
  test('returns requested cluster when valid', () => {
    const clusters = {
      production: { nodes: ['primary'] },
      staging: { nodes: ['staging'] },
    };

    expect(resolveCluster(clusters, 'staging')).toBe('staging');
  });

  test('throws ClusterNotFoundError for invalid cluster', () => {
    const clusters = {
      production: { nodes: ['primary'] },
    };

    expect(() => resolveCluster(clusters, 'nonexistent')).toThrow(ClusterNotFoundError);
  });

  test('error includes available cluster names', () => {
    const clusters = {
      production: { nodes: ['primary'] },
      staging: { nodes: ['staging'] },
    };

    try {
      resolveCluster(clusters, 'invalid');
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ClusterNotFoundError);
      const clusterError = error as ClusterNotFoundError;
      expect(clusterError.requestedCluster).toBe('invalid');
      expect(clusterError.availableClusters).toEqual(['production', 'staging']);
    }
  });

  test('returns default cluster when no cluster requested', () => {
    const clusters = {
      production: { nodes: ['primary'] },
      staging: { nodes: ['staging'], default: true },
    };

    expect(resolveCluster(clusters)).toBe('staging');
  });
});

describe('transformClusters', () => {
  test('transforms YAML clusters to resolved format', () => {
    const yamlClusters = {
      production: { nodes: ['primary', 'replica'], default: true },
      dev: { nodes: ['staging'] },
    };

    const resolved = transformClusters(yamlClusters);

    expect(resolved['production']).toEqual({
      nodes: ['primary', 'replica'],
      default: true,
    });
    expect(resolved['dev']).toEqual({
      nodes: ['staging'],
      default: false,
    });
  });

  test('defaults missing default field to false', () => {
    const yamlClusters = {
      production: { nodes: ['primary'] },
    };

    const resolved = transformClusters(yamlClusters);

    expect(resolved['production']!.default).toBe(false);
  });
});

describe('filterNodesToCluster', () => {
  test('filters nodes to only cluster members', () => {
    const nodes = {
      primary: { host: 'db1', port: 5432, database: 'db', user: 'u' },
      replica: { host: 'db2', port: 5432, database: 'db', user: 'u' },
      staging: { host: 'db3', port: 5432, database: 'db', user: 'u' },
    };
    const clusterNodes = ['primary', 'replica'];

    const filtered = filterNodesToCluster(nodes, clusterNodes);

    expect(Object.keys(filtered)).toEqual(['primary', 'replica']);
    expect(filtered['staging']).toBeUndefined();
  });

  test('ignores cluster nodes that do not exist in nodes map', () => {
    const nodes = {
      primary: { host: 'db1', port: 5432, database: 'db', user: 'u' },
    };
    const clusterNodes = ['primary', 'nonexistent'];

    const filtered = filterNodesToCluster(nodes, clusterNodes);

    expect(Object.keys(filtered)).toEqual(['primary']);
  });
});

describe('formatConfigError with cluster errors', () => {
  test('formats ClusterNodeReferenceError', () => {
    const error = new ClusterNodeReferenceError('production', ['missing1', 'missing2']);
    const message = formatConfigError(error);
    expect(message).toStartWith('Error:');
    expect(message).toContain('production');
    expect(message.length).toBeLessThanOrEqual(100);
  });

  test('formats ClusterNotFoundError with available clusters', () => {
    const error = new ClusterNotFoundError('invalid', ['production', 'staging']);
    const message = formatConfigError(error);
    expect(message).toStartWith('Error:');
    expect(message).toContain('invalid');
    expect(message.length).toBeLessThanOrEqual(100);
  });
});

describe('validateHexColor', () => {
  test('validates 6-digit hex color', () => {
    const result = validateHexColor('#FF0000', 'primary');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('validates 3-digit hex color', () => {
    const result = validateHexColor('#F00', 'primary');
    expect(result.valid).toBe(true);
  });

  test('validates lowercase hex color', () => {
    const result = validateHexColor('#ff0000', 'primary');
    expect(result.valid).toBe(true);
  });

  test('rejects color without hash', () => {
    const result = validateHexColor('FF0000', 'primary');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('primary');
    expect(result.error).toContain('#RGB or #RRGGBB');
  });

  test('rejects invalid hex characters', () => {
    const result = validateHexColor('#GGHHII', 'primary');
    expect(result.valid).toBe(false);
  });

  test('rejects wrong length hex', () => {
    const result = validateHexColor('#FF00', 'primary');
    expect(result.valid).toBe(false);
  });
});

describe('validateThemeColors', () => {
  test('returns empty array for valid colors', () => {
    const errors = validateThemeColors({
      primary: '#FF0000',
      secondary: '#00FF00',
    });
    expect(errors).toEqual([]);
  });

  test('returns empty array for empty object', () => {
    const errors = validateThemeColors({});
    expect(errors).toEqual([]);
  });

  test('returns error for invalid color', () => {
    const errors = validateThemeColors({ primary: 'red' });
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('primary');
  });

  test('returns multiple errors for multiple invalid colors', () => {
    const errors = validateThemeColors({
      primary: 'red',
      secondary: 'blue',
      warning: '#FFF', // valid
    });
    expect(errors.length).toBe(2);
    expect(errors.some((e) => e.includes('primary'))).toBe(true);
    expect(errors.some((e) => e.includes('secondary'))).toBe(true);
  });

  test('validates all color fields', () => {
    const validColors = {
      background: '#000000',
      foreground: '#FFFFFF',
      primary: '#0000FF',
      secondary: '#FF00FF',
      success: '#00FF00',
      warning: '#FFFF00',
      critical: '#FF0000',
      muted: '#808080',
    };
    const errors = validateThemeColors(validColors);
    expect(errors).toEqual([]);
  });
});

describe('transformToConfiguration with theme', () => {
  test('resolves dark theme from string', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      theme: 'dark',
    };
    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.theme.name).toBe('dark');
  });

  test('resolves light theme from string', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      theme: 'light',
    };
    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.theme.name).toBe('light');
  });

  test('resolves theme from object config', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      theme: { name: 'light' },
    };
    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.theme.name).toBe('light');
  });

  test('resolves custom theme with color overrides', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      theme: {
        name: 'dark',
        colors: { primary: '#FF0000' },
      },
    };
    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.theme.name).toBe('custom');
    expect(config.theme.colors.primary).toBe('#FF0000');
  });

  test('falls back to dark theme for invalid name with warning', () => {
    const warnings: string[] = [];
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      theme: 'invalid',
    };
    const config = transformToConfiguration(
      yamlConfig,
      '/path/to/config.yaml',
      undefined,
      (msg) => warnings.push(msg)
    );
    expect(config.theme.name).toBe('dark');
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('invalid');
  });

  test('throws ConfigValidationError for invalid hex color', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      theme: {
        name: 'dark',
        colors: { primary: 'not-a-color' },
      },
    };
    expect(() =>
      transformToConfiguration(yamlConfig, '/path/to/config.yaml')
    ).toThrow(ConfigValidationError);
  });

  test('uses default theme when no theme specified', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
    };
    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.theme.name).toBe('dark');
  });
});

describe('transformToConfiguration with thresholds', () => {
  test('uses default thresholds when no thresholds specified', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
    };
    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.thresholds.replicationLag).toEqual({ warning: 10, critical: 60 });
    expect(config.thresholds.slotRetention).toEqual({
      warning: 1073741824,
      critical: 5368709120,
    });
    expect(config.thresholds.conflictRate).toEqual({ warning: 5, critical: 20 });
  });

  test('parses replication_lag threshold from string format', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      thresholds: {
        replication_lag: { warning: '5s', critical: '30s' },
      },
    };
    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.thresholds.replicationLag).toEqual({ warning: 5, critical: 30 });
  });

  test('parses replication_lag threshold from minutes', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      thresholds: {
        replication_lag: { warning: '1m', critical: '5m' },
      },
    };
    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.thresholds.replicationLag).toEqual({ warning: 60, critical: 300 });
  });

  test('parses slot_retention threshold from byte format', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      thresholds: {
        slot_retention: { warning: '500MB', critical: '2GB' },
      },
    };
    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.thresholds.slotRetention.warning).toBe(524288000);
    expect(config.thresholds.slotRetention.critical).toBe(2147483648);
  });

  test('parses conflict_rate threshold from number', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      thresholds: {
        conflict_rate: { warning: 10, critical: 50 },
      },
    };
    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.thresholds.conflictRate).toEqual({ warning: 10, critical: 50 });
  });

  test('parses all thresholds together', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      thresholds: {
        replication_lag: { warning: '15s', critical: '2m' },
        slot_retention: { warning: '2GB', critical: '10GB' },
        conflict_rate: { warning: 3, critical: 15 },
      },
    };
    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.thresholds.replicationLag).toEqual({ warning: 15, critical: 120 });
    expect(config.thresholds.slotRetention.warning).toBe(2147483648);
    expect(config.thresholds.slotRetention.critical).toBe(10737418240);
    expect(config.thresholds.conflictRate).toEqual({ warning: 3, critical: 15 });
  });

  test('applies defaults for missing threshold values', () => {
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      thresholds: {
        replication_lag: { warning: '5s' }, // only warning
        slot_retention: { critical: '10GB' }, // only critical
      },
    };
    const config = transformToConfiguration(yamlConfig, '/path/to/config.yaml');
    expect(config.thresholds.replicationLag.warning).toBe(5);
    expect(config.thresholds.replicationLag.critical).toBe(60); // default
    expect(config.thresholds.slotRetention.warning).toBe(1073741824); // default
    expect(config.thresholds.slotRetention.critical).toBe(10737418240);
  });

  test('warns when critical < warning (inverted thresholds)', () => {
    const warnings: string[] = [];
    const yamlConfig = {
      nodes: {
        primary: { host: 'localhost', database: 'mydb' },
      },
      thresholds: {
        replication_lag: { warning: 60, critical: 10 },
      },
    };
    const config = transformToConfiguration(
      yamlConfig,
      '/path/to/config.yaml',
      undefined,
      (msg) => warnings.push(msg)
    );
    // Still parses the values
    expect(config.thresholds.replicationLag).toEqual({ warning: 60, critical: 10 });
    // But issues a warning
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('inverted');
    expect(warnings[0]).toContain('replication_lag');
  });
});
