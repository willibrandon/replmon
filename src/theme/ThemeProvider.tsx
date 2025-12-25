import React from 'react';
import type { ResolvedTheme } from '../config/defaults.js';
import { ThemeContext } from './ThemeContext.js';

export interface ThemeProviderProps {
  theme: ResolvedTheme;
  children: React.ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps): React.ReactElement {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
