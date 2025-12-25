import { useState, useEffect, useCallback, useRef } from 'react';

export interface TerminalSize {
  columns: number;
  rows: number;
}

export function useTerminalSize(): TerminalSize {
  const [size, setSize] = useState<TerminalSize>({
    columns: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  });
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleResize = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSize({ columns: process.stdout.columns ?? 80, rows: process.stdout.rows ?? 24 });
    }, 100);
  }, []);

  useEffect(() => {
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleResize]);

  return size;
}
