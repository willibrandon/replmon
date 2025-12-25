import React from 'react';
import { Box, useInput } from 'ink';
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { Modal } from './Modal.js';
import { useBreakpoint } from '../../hooks/useBreakpoint.js';
import { useConnectionStore } from '../../store/connection.js';
import { useStore } from '../../store/index.js';
import { useSubscriptions } from '../../hooks/useSubscriptions.js';
import { useTopology } from '../../hooks/useTopology.js';
import { PANEL_SHORTCUTS } from '../../store/types.js';
import type { Panel } from '../../store/types.js';
import { exitApp } from '../../index.js';

export interface MainLayoutProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function MainLayout({ header, footer, children }: MainLayoutProps): React.ReactElement {
  const breakpoint = useBreakpoint();
  const pglogicalMode = useConnectionStore((s) => s.pglogicalMode);
  const activeModal = useStore((s) => s.activeModal);
  const modalData = useStore((s) => s.modalData);
  const focusedPanel = useStore((s) => s.focusedPanel);
  const setFocusedPanel = useStore((s) => s.setFocusedPanel);
  const focusNextPanel = useStore((s) => s.focusNextPanel);
  const focusPreviousPanel = useStore((s) => s.focusPreviousPanel);
  const openModal = useStore((s) => s.openModal);
  const closeModal = useStore((s) => s.closeModal);
  const selectNext = useStore((s) => s.selectNext);
  const selectPrevious = useStore((s) => s.selectPrevious);

  // Get selected items for detail modal
  const { selectedItem: selectedSubscription } = useSubscriptions();
  const { nodes, selectedNodeId } = useTopology();
  const selectedNode = nodes.find((n) => n.nodeId === selectedNodeId);

  useInput((input, key) => {
    if (activeModal !== null) { if (key.escape) closeModal(); return; }
    if (input === 'q' || (key.ctrl && input === 'c')) { exitApp(0); return; }
    const targetPanel = PANEL_SHORTCUTS[input] as Panel | undefined;
    if (targetPanel) { setFocusedPanel(targetPanel); return; }
    if (key.tab) { key.shift ? focusPreviousPanel() : focusNextPanel(); return; }
    if (input === 'j' || key.downArrow) { selectNext(); return; }
    if (input === 'k' || key.upArrow) { selectPrevious(); return; }
    if (input === '?' || input === 'h') { openModal({ type: 'help', title: 'Help' }); return; }
    // Enter key opens detail modal for selected item
    if (key.return) {
      if (focusedPanel === 'topology' && selectedNode) {
        openModal({
          type: 'details',
          title: selectedNode.displayName,
          data: selectedNode,
        });
      } else if (focusedPanel === 'subscriptions' && selectedSubscription) {
        openModal({
          type: 'details',
          title: selectedSubscription.subscriptionName,
          data: selectedSubscription,
        });
      }
    }
  });

  const isCompact = breakpoint === 'compact';
  const isShort = breakpoint === 'short';

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {!isCompact && (header ?? <Header showPglogicalBadge={pglogicalMode} />)}
      <Box flexGrow={1} flexDirection="column">
        {activeModal !== null && modalData !== null ? <Modal config={modalData} onClose={closeModal} /> : children}
      </Box>
      {footer ?? <Footer showTimestamp={!isShort && !isCompact} />}
    </Box>
  );
}
