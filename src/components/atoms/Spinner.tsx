import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';

export interface SpinnerProps {
  label?: string;
}

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function Spinner({ label }: SpinnerProps): React.ReactElement {
  const colors = useTheme();
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrameIndex((prev) => (prev + 1) % FRAMES.length), 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box>
      <Text color={colors.primary}>{FRAMES[frameIndex]}</Text>
      {label && <Text color={colors.foreground}> {label}</Text>}
    </Box>
  );
}
