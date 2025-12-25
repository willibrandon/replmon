import { useMemo } from 'react';
import { useTerminalSize } from './useTerminalSize.js';

export type Breakpoint = 'standard' | 'narrow' | 'short' | 'compact';

export function useBreakpoint(): Breakpoint {
  const { columns, rows } = useTerminalSize();
  return useMemo(() => {
    if (columns < 100 && rows < 30) return 'compact';
    if (columns < 100) return 'narrow';
    if (rows < 30) return 'short';
    return 'standard';
  }, [columns, rows]);
}
