/**
 * Tests for theme resolution module
 */
import { describe, test, expect } from 'bun:test';
import {
  isValidThemeName,
  getBaseThemeColors,
  mergeColors,
  resolveTheme,
  VALID_THEME_NAMES,
} from './index.js';
import { DARK_THEME_COLORS, LIGHT_THEME_COLORS } from '../config/defaults.js';

describe('isValidThemeName', () => {
  test('returns true for "dark"', () => {
    expect(isValidThemeName('dark')).toBe(true);
  });

  test('returns true for "light"', () => {
    expect(isValidThemeName('light')).toBe(true);
  });

  test('returns false for invalid theme name', () => {
    expect(isValidThemeName('custom')).toBe(false);
    expect(isValidThemeName('midnight')).toBe(false);
    expect(isValidThemeName('')).toBe(false);
  });

  test('VALID_THEME_NAMES contains expected values', () => {
    expect(VALID_THEME_NAMES).toContain('dark');
    expect(VALID_THEME_NAMES).toContain('light');
    expect(VALID_THEME_NAMES.length).toBe(2);
  });
});

describe('getBaseThemeColors', () => {
  test('returns dark theme colors for "dark"', () => {
    const colors = getBaseThemeColors('dark');
    expect(colors).toEqual(DARK_THEME_COLORS);
  });

  test('returns light theme colors for "light"', () => {
    const colors = getBaseThemeColors('light');
    expect(colors).toEqual(LIGHT_THEME_COLORS);
  });
});

describe('mergeColors', () => {
  test('returns copy of base colors when no overrides', () => {
    const merged = mergeColors(DARK_THEME_COLORS);
    expect(merged).toEqual(DARK_THEME_COLORS);
    // Verify it's a copy, not the same reference
    expect(merged).not.toBe(DARK_THEME_COLORS);
  });

  test('returns copy of base colors when overrides is undefined', () => {
    const merged = mergeColors(DARK_THEME_COLORS, undefined);
    expect(merged).toEqual(DARK_THEME_COLORS);
  });

  test('returns copy of base colors when overrides is empty', () => {
    const merged = mergeColors(DARK_THEME_COLORS, {});
    expect(merged).toEqual(DARK_THEME_COLORS);
  });

  test('merges single color override', () => {
    const merged = mergeColors(DARK_THEME_COLORS, { primary: '#FF0000' });
    expect(merged.primary).toBe('#FF0000');
    expect(merged.background).toBe(DARK_THEME_COLORS.background);
    expect(merged.foreground).toBe(DARK_THEME_COLORS.foreground);
  });

  test('merges multiple color overrides', () => {
    const overrides = {
      primary: '#FF0000',
      secondary: '#00FF00',
      warning: '#0000FF',
    };
    const merged = mergeColors(DARK_THEME_COLORS, overrides);
    expect(merged.primary).toBe('#FF0000');
    expect(merged.secondary).toBe('#00FF00');
    expect(merged.warning).toBe('#0000FF');
    expect(merged.background).toBe(DARK_THEME_COLORS.background);
  });

  test('merges all color overrides', () => {
    const fullOverrides = {
      background: '#111111',
      foreground: '#EEEEEE',
      primary: '#AA0000',
      secondary: '#00AA00',
      success: '#00FF00',
      warning: '#FFFF00',
      critical: '#FF0000',
      muted: '#888888',
    };
    const merged = mergeColors(DARK_THEME_COLORS, fullOverrides);
    expect(merged).toEqual(fullOverrides);
  });
});

describe('resolveTheme', () => {
  describe('undefined input', () => {
    test('returns default dark theme', () => {
      const theme = resolveTheme(undefined);
      expect(theme.name).toBe('dark');
      expect(theme.colors).toEqual(DARK_THEME_COLORS);
    });
  });

  describe('string input (theme name)', () => {
    test('returns dark theme for "dark"', () => {
      const theme = resolveTheme('dark');
      expect(theme.name).toBe('dark');
      expect(theme.colors).toEqual(DARK_THEME_COLORS);
    });

    test('returns light theme for "light"', () => {
      const theme = resolveTheme('light');
      expect(theme.name).toBe('light');
      expect(theme.colors).toEqual(LIGHT_THEME_COLORS);
    });

    test('falls back to dark theme for invalid name', () => {
      const theme = resolveTheme('invalid');
      expect(theme.name).toBe('dark');
      expect(theme.colors).toEqual(DARK_THEME_COLORS);
    });

    test('calls onWarning callback for invalid theme name', () => {
      const warnings: string[] = [];
      const theme = resolveTheme('midnight', (msg) => warnings.push(msg));
      expect(theme.name).toBe('dark');
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain('midnight');
      expect(warnings[0]).toContain('falling back');
    });
  });

  describe('object input (YAMLThemeConfig)', () => {
    test('returns dark theme for empty object', () => {
      const theme = resolveTheme({});
      expect(theme.name).toBe('dark');
      expect(theme.colors).toEqual(DARK_THEME_COLORS);
    });

    test('returns dark theme for { name: "dark" }', () => {
      const theme = resolveTheme({ name: 'dark' });
      expect(theme.name).toBe('dark');
      expect(theme.colors).toEqual(DARK_THEME_COLORS);
    });

    test('returns light theme for { name: "light" }', () => {
      const theme = resolveTheme({ name: 'light' });
      expect(theme.name).toBe('light');
      expect(theme.colors).toEqual(LIGHT_THEME_COLORS);
    });

    test('falls back to dark for invalid name in object', () => {
      const warnings: string[] = [];
      const theme = resolveTheme({ name: 'invalid' }, (msg) => warnings.push(msg));
      expect(theme.name).toBe('dark');
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain('invalid');
    });

    test('merges custom colors over base theme', () => {
      const theme = resolveTheme({
        name: 'dark',
        colors: { primary: '#FF0000' },
      });
      expect(theme.name).toBe('custom');
      expect(theme.colors.primary).toBe('#FF0000');
      expect(theme.colors.background).toBe(DARK_THEME_COLORS.background);
    });

    test('merges custom colors over light theme', () => {
      const theme = resolveTheme({
        name: 'light',
        colors: { warning: '#FFA500' },
      });
      expect(theme.name).toBe('custom');
      expect(theme.colors.warning).toBe('#FFA500');
      expect(theme.colors.background).toBe(LIGHT_THEME_COLORS.background);
    });

    test('sets name to "custom" when colors are provided', () => {
      const theme = resolveTheme({
        colors: { background: '#112233' },
      });
      expect(theme.name).toBe('custom');
    });

    test('uses base theme name when no custom colors', () => {
      const theme = resolveTheme({ name: 'light', colors: {} });
      expect(theme.name).toBe('light');
    });
  });
});
