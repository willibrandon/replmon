/**
 * Threshold Resolution Module
 *
 * Parses and resolves threshold configuration from YAML.
 * Handles human-readable formats like "10s", "1GB".
 *
 * Feature: 002-yaml-config
 */

import type { YAMLThresholdConfig, YAMLThresholdLevels } from '../types/yaml-config.js';
import type { ResolvedThresholds, ThresholdLevels } from './defaults.js';
import {
  DEFAULT_THRESHOLDS,
  DEFAULT_LAG_WARNING_SECONDS,
  DEFAULT_LAG_CRITICAL_SECONDS,
  DEFAULT_RETENTION_WARNING_BYTES,
  DEFAULT_RETENTION_CRITICAL_BYTES,
  DEFAULT_CONFLICT_RATE_WARNING,
  DEFAULT_CONFLICT_RATE_CRITICAL,
} from './defaults.js';
import { InvalidThresholdError } from '../types/errors.js';

// =============================================================================
// Threshold Value Parsing
// =============================================================================

/**
 * Threshold type determines how string values are parsed.
 */
export type ThresholdType = 'time' | 'bytes' | 'count';

/**
 * Parse a time duration string into seconds.
 * Accepts: "10s", "5m", "1h", or raw number.
 *
 * @param value - Time value as string or number
 * @param field - Field name for error messages
 * @returns Parsed value in seconds
 * @throws InvalidThresholdError if format is invalid
 */
export function parseTimeDuration(value: string | number, field: string): number {
  if (typeof value === 'number') {
    if (value < 0) {
      throw new InvalidThresholdError(field, String(value));
    }
    return value;
  }

  const trimmed = value.trim().toLowerCase();

  // Pure numeric string
  const numericOnly = parseFloat(trimmed);
  if (!isNaN(numericOnly) && /^\d+(\.\d+)?$/.test(trimmed)) {
    if (numericOnly < 0) {
      throw new InvalidThresholdError(field, value);
    }
    return numericOnly;
  }

  // Time format: Xs, Xm, Xh
  const timeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(s|m|h)$/);
  if (timeMatch) {
    const num = parseFloat(timeMatch[1]!);
    const unit = timeMatch[2]!;
    let seconds: number;
    switch (unit) {
      case 's':
        seconds = num;
        break;
      case 'm':
        seconds = num * 60;
        break;
      case 'h':
        seconds = num * 3600;
        break;
      default:
        throw new InvalidThresholdError(field, value);
    }
    if (seconds < 0) {
      throw new InvalidThresholdError(field, value);
    }
    return seconds;
  }

  throw new InvalidThresholdError(field, value);
}

/**
 * Parse a byte size string into bytes.
 * Accepts: "1KB", "10MB", "5GB", or raw number.
 *
 * @param value - Byte value as string or number
 * @param field - Field name for error messages
 * @returns Parsed value in bytes
 * @throws InvalidThresholdError if format is invalid
 */
export function parseByteSize(value: string | number, field: string): number {
  if (typeof value === 'number') {
    if (value < 0) {
      throw new InvalidThresholdError(field, String(value));
    }
    return value;
  }

  const trimmed = value.trim().toUpperCase();

  // Pure numeric string
  const numericOnly = parseFloat(trimmed);
  if (!isNaN(numericOnly) && /^\d+(\.\d+)?$/.test(trimmed)) {
    if (numericOnly < 0) {
      throw new InvalidThresholdError(field, value);
    }
    return numericOnly;
  }

  // Byte format: XKB, XMB, XGB, XTB (or without B: XK, XM, XG, XT)
  const byteMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(K|KB|M|MB|G|GB|T|TB)$/);
  if (byteMatch) {
    const num = parseFloat(byteMatch[1]!);
    const unit = byteMatch[2]!.replace('B', '');
    let bytes: number;
    switch (unit) {
      case 'K':
        bytes = num * 1024;
        break;
      case 'M':
        bytes = num * 1024 * 1024;
        break;
      case 'G':
        bytes = num * 1024 * 1024 * 1024;
        break;
      case 'T':
        bytes = num * 1024 * 1024 * 1024 * 1024;
        break;
      default:
        throw new InvalidThresholdError(field, value);
    }
    if (bytes < 0) {
      throw new InvalidThresholdError(field, value);
    }
    return bytes;
  }

  throw new InvalidThresholdError(field, value);
}

/**
 * Parse a count value (plain number or numeric string).
 *
 * @param value - Count value as string or number
 * @param field - Field name for error messages
 * @returns Parsed numeric value
 * @throws InvalidThresholdError if format is invalid
 */
export function parseCountValue(value: string | number, field: string): number {
  if (typeof value === 'number') {
    if (value < 0) {
      throw new InvalidThresholdError(field, String(value));
    }
    return value;
  }

  const trimmed = value.trim();
  const num = parseFloat(trimmed);

  if (isNaN(num) || !/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new InvalidThresholdError(field, value);
  }

  if (num < 0) {
    throw new InvalidThresholdError(field, value);
  }

  return num;
}

/**
 * Parse a threshold value based on its type.
 *
 * @param value - Raw value from YAML (string or number)
 * @param type - Type of threshold (time, bytes, or count)
 * @param field - Field name for error messages
 * @returns Parsed numeric value
 * @throws InvalidThresholdError if format is invalid
 */
export function parseThresholdValue(
  value: string | number,
  type: ThresholdType,
  field: string
): number {
  switch (type) {
    case 'time':
      return parseTimeDuration(value, field);
    case 'bytes':
      return parseByteSize(value, field);
    case 'count':
      return parseCountValue(value, field);
  }
}

// =============================================================================
// Warning Callback
// =============================================================================

/**
 * Callback for threshold resolution warnings.
 */
export type ThresholdWarningCallback = (message: string) => void;

// =============================================================================
// Threshold Level Resolution
// =============================================================================

/**
 * Resolve a single threshold levels object (warning/critical).
 * Parses string values and applies defaults.
 *
 * @param levels - Raw YAML threshold levels
 * @param type - Type of threshold for parsing
 * @param fieldPrefix - Prefix for error messages (e.g., "replication_lag")
 * @param defaultWarning - Default warning value
 * @param defaultCritical - Default critical value
 * @param onWarning - Optional callback for warnings (e.g., inverted thresholds)
 * @returns Resolved threshold levels
 */
export function resolveThresholdLevels(
  levels: YAMLThresholdLevels | undefined,
  type: ThresholdType,
  fieldPrefix: string,
  defaultWarning: number,
  defaultCritical: number,
  onWarning?: ThresholdWarningCallback
): ThresholdLevels {
  const warning =
    levels?.warning !== undefined
      ? parseThresholdValue(levels.warning, type, `${fieldPrefix}.warning`)
      : defaultWarning;

  const critical =
    levels?.critical !== undefined
      ? parseThresholdValue(levels.critical, type, `${fieldPrefix}.critical`)
      : defaultCritical;

  // Validate that critical >= warning (warn if inverted)
  if (critical < warning && onWarning) {
    onWarning(
      `${fieldPrefix}: critical (${critical}) < warning (${warning}), thresholds may be inverted`
    );
  }

  return { warning, critical };
}

// =============================================================================
// Threshold Resolution
// =============================================================================

/**
 * Resolve complete threshold configuration from YAML.
 * Parses all threshold types and applies defaults.
 *
 * @param thresholds - Raw YAML threshold config
 * @param onWarning - Optional callback for warnings
 * @returns Fully resolved thresholds
 */
export function resolveThresholds(
  thresholds: YAMLThresholdConfig | undefined,
  onWarning?: ThresholdWarningCallback
): ResolvedThresholds {
  if (thresholds === undefined) {
    return { ...DEFAULT_THRESHOLDS };
  }

  const replicationLag = resolveThresholdLevels(
    thresholds.replication_lag,
    'time',
    'replication_lag',
    DEFAULT_LAG_WARNING_SECONDS,
    DEFAULT_LAG_CRITICAL_SECONDS,
    onWarning
  );

  const slotRetention = resolveThresholdLevels(
    thresholds.slot_retention,
    'bytes',
    'slot_retention',
    DEFAULT_RETENTION_WARNING_BYTES,
    DEFAULT_RETENTION_CRITICAL_BYTES,
    onWarning
  );

  const conflictRate = resolveThresholdLevels(
    thresholds.conflict_rate,
    'count',
    'conflict_rate',
    DEFAULT_CONFLICT_RATE_WARNING,
    DEFAULT_CONFLICT_RATE_CRITICAL,
    onWarning
  );

  return {
    replicationLag,
    slotRetention,
    conflictRate,
  };
}
