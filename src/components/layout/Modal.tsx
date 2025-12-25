import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import type { ModalConfig } from '../../store/types.js';

export interface ModalProps {
  config: ModalConfig;
  onClose: () => void;
  children?: React.ReactNode;
}

export function Modal({ config, onClose, children }: ModalProps): React.ReactElement {
  const colors = useTheme();
  useInput((_input, key) => { if (key.escape) onClose(); });
  const title = config.title ?? config.type.charAt(0).toUpperCase() + config.type.slice(1);

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" width="100%" height="100%">
      <Box flexDirection="column" borderStyle="double" borderColor={colors.primary} paddingX={2} paddingY={1} minWidth={40}>
        <Box marginBottom={1}><Text bold color={colors.primary}>{title}</Text><Box flexGrow={1} /><Text color={colors.muted}>[Esc]</Text></Box>
        {children ?? (config.type === 'help' ? (
          <Box flexDirection="column">
            <Text bold color={colors.primary}>Keyboard Shortcuts</Text>
            <Text><Text color={colors.secondary}>t</Text>        Topology panel</Text>
            <Text><Text color={colors.secondary}>s</Text>        Subscriptions panel</Text>
            <Text><Text color={colors.secondary}>l</Text>        Slots panel</Text>
            <Text><Text color={colors.secondary}>c</Text>        Conflicts panel</Text>
            <Text><Text color={colors.secondary}>o</Text>        Operations panel</Text>
            <Text><Text color={colors.secondary}>Tab</Text>      Next panel</Text>
            <Text><Text color={colors.secondary}>j/k</Text>      Navigate list items</Text>
            <Text><Text color={colors.secondary}>?</Text>        Show this help</Text>
            <Text><Text color={colors.secondary}>Esc</Text>      Close modal</Text>
            <Text><Text color={colors.secondary}>q</Text>        Quit application</Text>
          </Box>
        ) : <Text color={colors.muted}>{config.title ?? config.type}</Text>)}
      </Box>
    </Box>
  );
}
