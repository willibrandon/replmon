/**
 * Theme Resolution Module
 *
 * Handles theme loading, resolution, and color merging.
 * Supports built-in dark/light themes with custom color overrides.
 *
 * Feature: 002-yaml-config
 */

import type { YAMLThemeConfig, YAMLColorOverrides } from '../types/yaml-config.js';
import type { ResolvedTheme, ThemeColors } from '../config/defaults.js';
import { DARK_THEME_COLORS, LIGHT_THEME_COLORS, DEFAULT_THEME } from '../config/defaults.js';

// =============================================================================
// Theme Names
// =============================================================================

/** Valid built-in theme names */
export const VALID_THEME_NAMES = ['dark', 'light'] as const;
export type ValidThemeName = (typeof VALID_THEME_NAMES)[number];

/**
 * Check if a string is a valid built-in theme name.
 */
export function isValidThemeName(name: string): name is ValidThemeName {
  return VALID_THEME_NAMES.includes(name as ValidThemeName);
}

// =============================================================================
// Base Theme Lookup
// =============================================================================

/**
 * Get the base color palette for a theme name.
 *
 * @param name - Theme name ("dark" or "light")
 * @returns Complete color palette for the theme
 */
export function getBaseThemeColors(name: ValidThemeName): ThemeColors {
  switch (name) {
    case 'dark':
      return DARK_THEME_COLORS;
    case 'light':
      return LIGHT_THEME_COLORS;
  }
}

// =============================================================================
// Color Merging
// =============================================================================

/**
 * Merge custom color overrides onto a base theme palette.
 * Only provided colors are overridden; others keep base theme values.
 *
 * @param baseColors - Complete base theme color palette
 * @param overrides - Optional partial color overrides
 * @returns Complete color palette with overrides applied
 */
export function mergeColors(
  baseColors: ThemeColors,
  overrides?: Partial<YAMLColorOverrides>
): ThemeColors {
  if (!overrides) {
    return { ...baseColors };
  }

  return {
    background: overrides.background ?? baseColors.background,
    foreground: overrides.foreground ?? baseColors.foreground,
    primary: overrides.primary ?? baseColors.primary,
    secondary: overrides.secondary ?? baseColors.secondary,
    success: overrides.success ?? baseColors.success,
    warning: overrides.warning ?? baseColors.warning,
    critical: overrides.critical ?? baseColors.critical,
    muted: overrides.muted ?? baseColors.muted,
  };
}

// =============================================================================
// Theme Resolution
// =============================================================================

/**
 * Warning callback type for logging theme resolution issues.
 */
export type ThemeWarningCallback = (message: string) => void;

/**
 * Resolve a YAML theme configuration into a complete ResolvedTheme.
 *
 * Handles three input formats:
 * 1. undefined - returns default dark theme
 * 2. string (theme name) - returns named theme or default with warning
 * 3. YAMLThemeConfig object - merges custom colors over base theme
 *
 * @param themeConfig - Raw theme configuration from YAML (string or object)
 * @param onWarning - Optional callback for warning messages (invalid theme name)
 * @returns Fully resolved theme with complete color palette
 */
export function resolveTheme(
  themeConfig: string | YAMLThemeConfig | undefined,
  onWarning?: ThemeWarningCallback
): ResolvedTheme {
  // Case 1: No theme specified - return default
  if (themeConfig === undefined) {
    return { ...DEFAULT_THEME };
  }

  // Case 2: Theme name as string
  if (typeof themeConfig === 'string') {
    if (isValidThemeName(themeConfig)) {
      return {
        name: themeConfig,
        colors: getBaseThemeColors(themeConfig),
      };
    }

    // Invalid theme name - warn and fall back to default
    if (onWarning) {
      onWarning(`Invalid theme name "${themeConfig}", falling back to "dark"`);
    }
    return { ...DEFAULT_THEME };
  }

  // Case 3: Theme configuration object
  const baseName: ValidThemeName = isValidThemeName(themeConfig.name ?? '')
    ? (themeConfig.name as ValidThemeName)
    : 'dark';

  // Warn if name was provided but invalid
  if (themeConfig.name !== undefined && !isValidThemeName(themeConfig.name)) {
    if (onWarning) {
      onWarning(`Invalid theme name "${themeConfig.name}", falling back to "dark"`);
    }
  }

  const baseColors = getBaseThemeColors(baseName);
  const mergedColors = mergeColors(baseColors, themeConfig.colors);

  // Determine the final theme name
  // If custom colors are provided, it's a "custom" theme
  const hasCustomColors = themeConfig.colors && Object.keys(themeConfig.colors).length > 0;
  const finalName: 'dark' | 'light' | 'custom' = hasCustomColors ? 'custom' : baseName;

  return {
    name: finalName,
    colors: mergedColors,
  };
}

// =============================================================================
// Exports
// =============================================================================

// Re-export theme types for convenience
export type { ResolvedTheme, ThemeColors } from '../config/defaults.js';

// Theme context and provider (Feature: 006-ui-framework)
export { ThemeContext } from './ThemeContext.js';
export { ThemeProvider } from './ThemeProvider.js';
export type { ThemeProviderProps } from './ThemeProvider.js';
