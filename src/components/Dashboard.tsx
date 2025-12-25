import React from 'react';
import { Box } from 'ink';
import type { Configuration } from '../types/config.js';
import { MainLayout } from './layout/MainLayout.js';
import { Panel } from './layout/Panel.js';
import { TopologyPanel } from './panels/TopologyPanel.js';
import { SubscriptionsPanel } from './panels/SubscriptionsPanel.js';

interface DashboardProps {
  config: Configuration;
}

/**
 * Main dashboard view using the new layout system.
 * Shows topology and subscriptions panels.
 */
export function Dashboard({ config }: DashboardProps): React.ReactElement {
  return (
    <MainLayout>
      <Box flexDirection="column" flexGrow={1}>
        <Panel title="Topology" panelId="topology">
          <TopologyPanel config={config} />
        </Panel>
        <Panel title="Subscriptions" panelId="subscriptions">
          <SubscriptionsPanel config={config} />
        </Panel>
      </Box>
    </MainLayout>
  );
}
