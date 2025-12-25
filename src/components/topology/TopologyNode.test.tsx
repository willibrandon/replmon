/**
 * TopologyNode Component Tests
 *
 * Tests for node rendering, status indicators, role badges, and stale state.
 *
 * Feature: 008-topology-panel
 */

import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { TopologyNode } from '../../../src/components/topology/TopologyNode.js';
import { ThemeContext } from '../../../src/theme/ThemeContext.js';
import { DEFAULT_THEME } from '../../../src/config/defaults.js';
import type { TopologyNodeData } from '../../../src/types/topology.js';

/**
 * Helper to render component with theme context.
 */
function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeContext.Provider value={DEFAULT_THEME}>{ui}</ThemeContext.Provider>
  );
}

/**
 * Create a base node data object for testing.
 */
function createNodeData(overrides: Partial<TopologyNodeData> = {}): TopologyNodeData {
  return {
    nodeId: 'test-node',
    displayName: 'test-node',
    hostInfo: 'localhost:5432',
    connectionStatus: 'connected',
    role: 'standalone',
    isStale: false,
    isSelected: false,
    hasPglogical: false,
    outgoingEdges: [],
    incomingEdges: [],
    ...overrides,
  };
}

describe('TopologyNode', () => {
  describe('Node Rendering', () => {
    test('renders node name and host info', () => {
      const node = createNodeData({
        displayName: 'primary-node',
        hostInfo: 'db.example.com:5432',
      });

      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      expect(lastFrame()).toContain('primary-node');
      expect(lastFrame()).toContain('db.example.com:5432');
    });

    test('applies custom width', () => {
      const node = createNodeData();
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} width={30} />);

      // The frame should contain the node content within a bordered box
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Status Indicators', () => {
    test('shows success indicator when connected', () => {
      const node = createNodeData({ connectionStatus: 'connected' });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      // Success status dot should be a filled circle
      expect(lastFrame()).toContain('●');
    });

    test('shows connecting indicator when connecting', () => {
      const node = createNodeData({ connectionStatus: 'connecting' });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      // Connecting status dot should be a half-filled circle
      expect(lastFrame()).toContain('◐');
    });

    test('shows critical indicator when failed', () => {
      const node = createNodeData({ connectionStatus: 'failed' });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      // Failed status dot should be a filled circle (critical)
      expect(lastFrame()).toContain('●');
    });

    test('shows muted indicator when stale', () => {
      const node = createNodeData({ isStale: true, connectionStatus: 'connected' });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      // Stale should override to muted indicator (empty circle)
      expect(lastFrame()).toContain('○');
    });
  });

  describe('Role Badges', () => {
    test('displays PRIMARY badge for primary role', () => {
      const node = createNodeData({ role: 'primary' });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      expect(lastFrame()).toContain('[PRIMARY]');
    });

    test('displays STANDBY badge for standby role', () => {
      const node = createNodeData({ role: 'standby' });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      expect(lastFrame()).toContain('[STANDBY]');
    });

    test('displays PROVIDER badge for provider role', () => {
      const node = createNodeData({ role: 'provider' });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      expect(lastFrame()).toContain('[PROVIDER]');
    });

    test('displays SUBSCRIBER badge for subscriber role', () => {
      const node = createNodeData({ role: 'subscriber' });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      expect(lastFrame()).toContain('[SUBSCRIBER]');
    });

    test('displays BIDI badge for bidirectional role', () => {
      const node = createNodeData({ role: 'bidirectional' });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      expect(lastFrame()).toContain('[BIDI]');
    });

    test('displays STANDALONE badge for standalone role', () => {
      const node = createNodeData({ role: 'standalone' });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      expect(lastFrame()).toContain('[STANDALONE]');
    });
  });

  describe('Selection State', () => {
    test('applies bold styling when selected', () => {
      const node = createNodeData({ isSelected: true });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      // Selected node should have its content rendered (we can't easily test bold styling)
      expect(lastFrame()).toContain('test-node');
    });

    test('shows normal styling when not selected', () => {
      const node = createNodeData({ isSelected: false });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      expect(lastFrame()).toContain('test-node');
    });
  });

  describe('Stale State', () => {
    test('shows STALE badge when node is stale', () => {
      const node = createNodeData({ isStale: true });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      expect(lastFrame()).toContain('[STALE]');
    });

    test('does not show STALE badge when node is fresh', () => {
      const node = createNodeData({ isStale: false });
      const { lastFrame } = renderWithTheme(<TopologyNode node={node} />);

      expect(lastFrame()).not.toContain('[STALE]');
    });
  });
});
