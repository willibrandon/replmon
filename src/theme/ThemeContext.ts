import { createContext } from 'react';
import type { ResolvedTheme } from '../config/defaults.js';

export const ThemeContext = createContext<ResolvedTheme | null>(null);
ThemeContext.displayName = 'ThemeContext';
