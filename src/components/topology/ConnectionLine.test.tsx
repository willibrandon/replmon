/**
 * ConnectionLine Component Tests
 *
 * Tests for direction arrows, bidirectional display, and lag visualization.
 *
 * Feature: 008-topology-panel
 */

import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { ConnectionLine } from '../../../src/components/topology/ConnectionLine.js';
import { ThemeContext } from '../../../src/theme/ThemeContext.js';
import { DEFAULT_THEME } from '../../../src/config/defaults.js';
import type { TopologyEdge } from '../../../src/types/topology.js';

/**
 * Helper to render component with theme context.
 */
function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeContext.Provider value={DEFAULT_THEME}>{ui}</ThemeContext.Provider>
  );
}

/**
 * Create a base edge data object for testing.
 */
function createEdge(overrides: Partial<TopologyEdge> = {}): TopologyEdge {
  return {
    id: 'source→target',
    sourceNodeId: 'source',
    targetNodeId: 'target',
    direction: 'unidirectional',
    replicationType: 'native',
    lagSeconds: null,
    lagBytes: 0,
    subscriptionName: null,
    status: 'replicating',
    ...overrides,
  };
}

describe('ConnectionLine', () => {
  describe('Direction Arrows', () => {
    test('shows right arrow for unidirectional horizontal', () => {
      const edge = createEdge({ direction: 'unidirectional' });
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} orientation="horizontal" />
      );

      expect(lastFrame()).toContain('→');
    });

    test('shows bidirectional arrow for bidirectional horizontal', () => {
      const edge = createEdge({ direction: 'bidirectional' });
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} orientation="horizontal" />
      );

      expect(lastFrame()).toContain('↔');
    });

    test('shows down arrow for unidirectional vertical', () => {
      const edge = createEdge({ direction: 'unidirectional' });
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} orientation="vertical" />
      );

      expect(lastFrame()).toContain('↓');
    });
  });

  describe('Replication Type Indicator', () => {
    test('shows pgl label for pglogical replication', () => {
      const edge = createEdge({ replicationType: 'pglogical' });
      const { lastFrame } = renderWithTheme(<ConnectionLine edge={edge} />);

      expect(lastFrame()).toContain('pgl');
    });

    test('does not show label for native replication', () => {
      const edge = createEdge({ replicationType: 'native' });
      const { lastFrame } = renderWithTheme(<ConnectionLine edge={edge} />);

      expect(lastFrame()).not.toContain('pgl');
    });
  });

  describe('Lag Display', () => {
    test('shows lag value when showLag is true and lag exists', () => {
      const edge = createEdge({ lagSeconds: 2.5 });
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} showLag={true} />
      );

      expect(lastFrame()).toContain('2.5s');
    });

    test('hides lag value when showLag is false', () => {
      const edge = createEdge({ lagSeconds: 2.5 });
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} showLag={false} />
      );

      expect(lastFrame()).not.toContain('2.5s');
    });

    test('does not show lag when lagSeconds is null', () => {
      const edge = createEdge({ lagSeconds: null });
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} showLag={true} />
      );

      // Should not contain a formatted lag value
      const frame = lastFrame() ?? '';
      expect(frame).not.toMatch(/\d+\.\d+s/);
    });

    test('formats millisecond lag correctly', () => {
      const edge = createEdge({ lagSeconds: 0.5 });
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} showLag={true} />
      );

      expect(lastFrame()).toContain('500ms');
    });

    test('formats minute lag correctly', () => {
      const edge = createEdge({ lagSeconds: 125 });
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} showLag={true} />
      );

      expect(lastFrame()).toContain('2m 5s');
    });
  });

  describe('Width Configuration', () => {
    test('respects custom width', () => {
      const edge = createEdge();
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} width={20} />
      );

      // Should render without error
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Lag Severity Color Thresholds', () => {
    // Note: We can't easily test colors in terminal output, but we verify the lag
    // values are formatted correctly at different thresholds

    test('formats normal lag (<5s)', () => {
      const edge = createEdge({ lagSeconds: 2.0 });
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} showLag={true} />
      );

      expect(lastFrame()).toContain('2.0s');
    });

    test('formats warning lag (5-30s)', () => {
      const edge = createEdge({ lagSeconds: 15.0 });
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} showLag={true} />
      );

      expect(lastFrame()).toContain('15.0s');
    });

    test('formats critical lag (>30s)', () => {
      const edge = createEdge({ lagSeconds: 45.0 });
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} showLag={true} />
      );

      expect(lastFrame()).toContain('45.0s');
    });

    test('formats very high lag in minutes', () => {
      const edge = createEdge({ lagSeconds: 180.5 });
      const { lastFrame } = renderWithTheme(
        <ConnectionLine edge={edge} showLag={true} />
      );

      expect(lastFrame()).toContain('3m 1s');
    });
  });
});
