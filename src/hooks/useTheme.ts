import { useContext } from 'react';
import type { ThemeColors } from '../config/defaults.js';
import { ThemeContext } from '../theme/ThemeContext.js';

export function useTheme(): ThemeColors {
  const theme = useContext(ThemeContext);
  if (theme === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme.colors;
}
