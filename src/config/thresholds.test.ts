/**
 * Tests for threshold resolution module
 */
import { describe, test, expect } from 'bun:test';
import {
  parseTimeDuration,
  parseByteSize,
  parseCountValue,
  parseThresholdValue,
  resolveThresholdLevels,
  resolveThresholds,
} from './thresholds.js';
import { InvalidThresholdError } from '../types/errors.js';
import {
  DEFAULT_THRESHOLDS,
  DEFAULT_LAG_WARNING_SECONDS,
  DEFAULT_LAG_CRITICAL_SECONDS,
  DEFAULT_RETENTION_WARNING_BYTES,
  DEFAULT_RETENTION_CRITICAL_BYTES,
  DEFAULT_CONFLICT_RATE_WARNING,
  DEFAULT_CONFLICT_RATE_CRITICAL,
} from './defaults.js';

describe('parseTimeDuration', () => {
  describe('numeric input', () => {
    test('accepts positive number', () => {
      expect(parseTimeDuration(30, 'test')).toBe(30);
    });

    test('accepts zero', () => {
      expect(parseTimeDuration(0, 'test')).toBe(0);
    });

    test('accepts decimal number', () => {
      expect(parseTimeDuration(1.5, 'test')).toBe(1.5);
    });

    test('throws for negative number', () => {
      expect(() => parseTimeDuration(-5, 'test')).toThrow(InvalidThresholdError);
    });
  });

  describe('string input - pure numeric', () => {
    test('accepts numeric string', () => {
      expect(parseTimeDuration('30', 'test')).toBe(30);
    });

    test('accepts decimal string', () => {
      expect(parseTimeDuration('1.5', 'test')).toBe(1.5);
    });

    test('accepts numeric string with whitespace', () => {
      expect(parseTimeDuration('  30  ', 'test')).toBe(30);
    });
  });

  describe('string input - seconds', () => {
    test('parses "10s" as seconds', () => {
      expect(parseTimeDuration('10s', 'test')).toBe(10);
    });

    test('parses "30S" as seconds (case insensitive)', () => {
      expect(parseTimeDuration('30S', 'test')).toBe(30);
    });

    test('parses decimal seconds', () => {
      expect(parseTimeDuration('1.5s', 'test')).toBe(1.5);
    });
  });

  describe('string input - minutes', () => {
    test('parses "1m" as 60 seconds', () => {
      expect(parseTimeDuration('1m', 'test')).toBe(60);
    });

    test('parses "5m" as 300 seconds', () => {
      expect(parseTimeDuration('5m', 'test')).toBe(300);
    });

    test('parses "0.5m" as 30 seconds', () => {
      expect(parseTimeDuration('0.5m', 'test')).toBe(30);
    });
  });

  describe('string input - hours', () => {
    test('parses "1h" as 3600 seconds', () => {
      expect(parseTimeDuration('1h', 'test')).toBe(3600);
    });

    test('parses "2h" as 7200 seconds', () => {
      expect(parseTimeDuration('2h', 'test')).toBe(7200);
    });

    test('parses "0.5h" as 1800 seconds', () => {
      expect(parseTimeDuration('0.5h', 'test')).toBe(1800);
    });
  });

  describe('invalid input', () => {
    test('throws for invalid unit', () => {
      expect(() => parseTimeDuration('10d', 'test')).toThrow(InvalidThresholdError);
    });

    test('throws for non-numeric string', () => {
      expect(() => parseTimeDuration('abc', 'test')).toThrow(InvalidThresholdError);
    });

    test('throws for empty string', () => {
      expect(() => parseTimeDuration('', 'test')).toThrow(InvalidThresholdError);
    });
  });
});

describe('parseByteSize', () => {
  describe('numeric input', () => {
    test('accepts positive number', () => {
      expect(parseByteSize(1024, 'test')).toBe(1024);
    });

    test('accepts zero', () => {
      expect(parseByteSize(0, 'test')).toBe(0);
    });

    test('throws for negative number', () => {
      expect(() => parseByteSize(-100, 'test')).toThrow(InvalidThresholdError);
    });
  });

  describe('string input - pure numeric', () => {
    test('accepts numeric string', () => {
      expect(parseByteSize('1024', 'test')).toBe(1024);
    });
  });

  describe('string input - KB/K', () => {
    test('parses "1KB" as 1024 bytes', () => {
      expect(parseByteSize('1KB', 'test')).toBe(1024);
    });

    test('parses "1K" as 1024 bytes', () => {
      expect(parseByteSize('1K', 'test')).toBe(1024);
    });

    test('parses "10kb" (lowercase) as 10240 bytes', () => {
      expect(parseByteSize('10kb', 'test')).toBe(10240);
    });
  });

  describe('string input - MB/M', () => {
    test('parses "1MB" as 1048576 bytes', () => {
      expect(parseByteSize('1MB', 'test')).toBe(1048576);
    });

    test('parses "1M" as 1048576 bytes', () => {
      expect(parseByteSize('1M', 'test')).toBe(1048576);
    });

    test('parses "10MB" as 10485760 bytes', () => {
      expect(parseByteSize('10MB', 'test')).toBe(10485760);
    });
  });

  describe('string input - GB/G', () => {
    test('parses "1GB" as 1073741824 bytes', () => {
      expect(parseByteSize('1GB', 'test')).toBe(1073741824);
    });

    test('parses "1G" as 1073741824 bytes', () => {
      expect(parseByteSize('1G', 'test')).toBe(1073741824);
    });

    test('parses "5GB" as 5368709120 bytes', () => {
      expect(parseByteSize('5GB', 'test')).toBe(5368709120);
    });
  });

  describe('string input - TB/T', () => {
    test('parses "1TB" as 1099511627776 bytes', () => {
      expect(parseByteSize('1TB', 'test')).toBe(1099511627776);
    });

    test('parses "1T" as 1099511627776 bytes', () => {
      expect(parseByteSize('1T', 'test')).toBe(1099511627776);
    });
  });

  describe('invalid input', () => {
    test('throws for invalid unit', () => {
      expect(() => parseByteSize('1PB', 'test')).toThrow(InvalidThresholdError);
    });

    test('throws for non-numeric string', () => {
      expect(() => parseByteSize('abc', 'test')).toThrow(InvalidThresholdError);
    });
  });
});

describe('parseCountValue', () => {
  test('accepts positive number', () => {
    expect(parseCountValue(5, 'test')).toBe(5);
  });

  test('accepts zero', () => {
    expect(parseCountValue(0, 'test')).toBe(0);
  });

  test('accepts numeric string', () => {
    expect(parseCountValue('10', 'test')).toBe(10);
  });

  test('accepts decimal', () => {
    expect(parseCountValue(5.5, 'test')).toBe(5.5);
  });

  test('throws for negative number', () => {
    expect(() => parseCountValue(-1, 'test')).toThrow(InvalidThresholdError);
  });

  test('throws for non-numeric string', () => {
    expect(() => parseCountValue('five', 'test')).toThrow(InvalidThresholdError);
  });
});

describe('parseThresholdValue', () => {
  test('delegates time type to parseTimeDuration', () => {
    expect(parseThresholdValue('10s', 'time', 'test')).toBe(10);
  });

  test('delegates bytes type to parseByteSize', () => {
    expect(parseThresholdValue('1GB', 'bytes', 'test')).toBe(1073741824);
  });

  test('delegates count type to parseCountValue', () => {
    expect(parseThresholdValue(5, 'count', 'test')).toBe(5);
  });
});

describe('resolveThresholdLevels', () => {
  test('returns defaults when levels is undefined', () => {
    const result = resolveThresholdLevels(
      undefined,
      'time',
      'test',
      10,
      60
    );
    expect(result).toEqual({ warning: 10, critical: 60 });
  });

  test('parses warning value', () => {
    const result = resolveThresholdLevels(
      { warning: '5s' },
      'time',
      'test',
      10,
      60
    );
    expect(result.warning).toBe(5);
    expect(result.critical).toBe(60); // default
  });

  test('parses critical value', () => {
    const result = resolveThresholdLevels(
      { critical: '120s' },
      'time',
      'test',
      10,
      60
    );
    expect(result.warning).toBe(10); // default
    expect(result.critical).toBe(120);
  });

  test('parses both values', () => {
    const result = resolveThresholdLevels(
      { warning: '5s', critical: '30s' },
      'time',
      'test',
      10,
      60
    );
    expect(result).toEqual({ warning: 5, critical: 30 });
  });

  test('calls onWarning when critical < warning', () => {
    const warnings: string[] = [];
    const result = resolveThresholdLevels(
      { warning: 100, critical: 50 },
      'time',
      'test',
      10,
      60,
      (msg) => warnings.push(msg)
    );
    expect(result).toEqual({ warning: 100, critical: 50 });
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('inverted');
  });

  test('does not warn when critical >= warning', () => {
    const warnings: string[] = [];
    resolveThresholdLevels(
      { warning: 10, critical: 60 },
      'time',
      'test',
      10,
      60,
      (msg) => warnings.push(msg)
    );
    expect(warnings.length).toBe(0);
  });

  test('parses byte values', () => {
    const result = resolveThresholdLevels(
      { warning: '500MB', critical: '2GB' },
      'bytes',
      'test',
      1073741824,
      5368709120
    );
    expect(result.warning).toBe(524288000); // 500MB
    expect(result.critical).toBe(2147483648); // 2GB
  });
});

describe('resolveThresholds', () => {
  test('returns defaults when thresholds is undefined', () => {
    const result = resolveThresholds(undefined);
    expect(result).toEqual(DEFAULT_THRESHOLDS);
  });

  test('returns defaults when thresholds is empty object', () => {
    const result = resolveThresholds({});
    expect(result.replicationLag.warning).toBe(DEFAULT_LAG_WARNING_SECONDS);
    expect(result.replicationLag.critical).toBe(DEFAULT_LAG_CRITICAL_SECONDS);
    expect(result.slotRetention.warning).toBe(DEFAULT_RETENTION_WARNING_BYTES);
    expect(result.slotRetention.critical).toBe(DEFAULT_RETENTION_CRITICAL_BYTES);
    expect(result.conflictRate.warning).toBe(DEFAULT_CONFLICT_RATE_WARNING);
    expect(result.conflictRate.critical).toBe(DEFAULT_CONFLICT_RATE_CRITICAL);
  });

  test('resolves replication_lag with time parsing', () => {
    const result = resolveThresholds({
      replication_lag: { warning: '5s', critical: '30s' },
    });
    expect(result.replicationLag).toEqual({ warning: 5, critical: 30 });
    // Other thresholds use defaults
    expect(result.slotRetention.warning).toBe(DEFAULT_RETENTION_WARNING_BYTES);
    expect(result.conflictRate.warning).toBe(DEFAULT_CONFLICT_RATE_WARNING);
  });

  test('resolves slot_retention with byte parsing', () => {
    const result = resolveThresholds({
      slot_retention: { warning: '500MB', critical: '2GB' },
    });
    expect(result.slotRetention).toEqual({ warning: 524288000, critical: 2147483648 });
  });

  test('resolves conflict_rate with count parsing', () => {
    const result = resolveThresholds({
      conflict_rate: { warning: 10, critical: 50 },
    });
    expect(result.conflictRate).toEqual({ warning: 10, critical: 50 });
  });

  test('resolves all thresholds together', () => {
    const result = resolveThresholds({
      replication_lag: { warning: '15s', critical: '2m' },
      slot_retention: { warning: '2GB', critical: '10GB' },
      conflict_rate: { warning: 3, critical: 15 },
    });
    expect(result.replicationLag).toEqual({ warning: 15, critical: 120 });
    expect(result.slotRetention).toEqual({ warning: 2147483648, critical: 10737418240 });
    expect(result.conflictRate).toEqual({ warning: 3, critical: 15 });
  });

  test('calls onWarning for inverted thresholds in any metric', () => {
    const warnings: string[] = [];
    resolveThresholds(
      {
        replication_lag: { warning: 60, critical: 10 },
        slot_retention: { warning: '5GB', critical: '1GB' },
      },
      (msg) => warnings.push(msg)
    );
    expect(warnings.length).toBe(2);
    expect(warnings[0]).toContain('replication_lag');
    expect(warnings[1]).toContain('slot_retention');
  });

  test('preserves partial overrides per metric', () => {
    const result = resolveThresholds({
      replication_lag: { warning: '5s' }, // only warning
      slot_retention: { critical: '10GB' }, // only critical
    });
    expect(result.replicationLag.warning).toBe(5);
    expect(result.replicationLag.critical).toBe(DEFAULT_LAG_CRITICAL_SECONDS);
    expect(result.slotRetention.warning).toBe(DEFAULT_RETENTION_WARNING_BYTES);
    expect(result.slotRetention.critical).toBe(10737418240);
  });
});
