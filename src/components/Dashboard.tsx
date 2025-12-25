import React from 'react';
import type { Configuration } from '../types/config.js';
import { MainLayout } from './layout/MainLayout.js';
import { Panel } from './layout/Panel.js';
import { TopologyPanel } from './panels/TopologyPanel.js';

interface DashboardProps {
  config: Configuration;
}

/**
 * Main dashboard view using the new layout system.
 * Shows topology panel with node status.
 */
export function Dashboard({ config }: DashboardProps): React.ReactElement {
  return (
    <MainLayout>
      <Panel title="Topology" panelId="topology">
        <TopologyPanel config={config} />
      </Panel>
    </MainLayout>
  );
}
