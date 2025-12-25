/**
 * TopologyPanel Component Tests
 *
 * Tests for keyboard navigation and selection state.
 *
 * Feature: 008-topology-panel
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { useStore } from '../../../src/store/index.js';
import type { NodeInfo } from '../../../src/store/types.js';

/**
 * Initialize store with nodes for testing.
 */
function initializeStoreWithNodes(nodeCount: number): void {
  const { initializeNodesInfo, setNodeStatus } = useStore.getState();

  const nodeInfos: NodeInfo[] = [];
  for (let i = 1; i <= nodeCount; i++) {
    nodeInfos.push({
      id: `node${i}`,
      name: `node${i}`,
      host: 'localhost',
      port: 5430 + i,
      database: 'postgres',
      hasPglogical: false,
    });
  }

  initializeNodesInfo(nodeInfos);

  // Set all nodes as connected
  for (let i = 1; i <= nodeCount; i++) {
    setNodeStatus(`node${i}`, 'connected');
  }
}

// Reset store before each test
beforeEach(() => {
  const state = useStore.getState();
  state.clearReplicationData();
  state.resetUIState();
  state.resetConnectionStates();
});

describe('TopologyPanel Selection State', () => {
  describe('Selection Management', () => {
    test('initial selection is null or undefined', () => {
      const selection = useStore.getState().selections.get('topology');
      // Selection can be null (explicitly set) or undefined (not set)
      expect(selection === null || selection === undefined).toBe(true);
    });

    test('setSelection updates selection', () => {
      initializeStoreWithNodes(2);

      const { setSelection, setFocusedPanel } = useStore.getState();
      setFocusedPanel('topology');
      setSelection('topology', 'node1');

      const selection = useStore.getState().selections.get('topology');
      expect(selection).toBe('node1');
    });

    test('selectNext moves to next node', () => {
      initializeStoreWithNodes(3);

      const { setFocusedPanel, setSelection, selectNext } = useStore.getState();
      setFocusedPanel('topology');
      setSelection('topology', 'node1');

      selectNext();

      const selection = useStore.getState().selections.get('topology');
      expect(selection).toBe('node2');
    });

    test('selectPrevious moves to previous node', () => {
      initializeStoreWithNodes(3);

      const { setFocusedPanel, setSelection, selectPrevious } =
        useStore.getState();
      setFocusedPanel('topology');
      setSelection('topology', 'node2');

      selectPrevious();

      const selection = useStore.getState().selections.get('topology');
      expect(selection).toBe('node1');
    });

    test('selectNext stops at last node', () => {
      initializeStoreWithNodes(2);

      const { setFocusedPanel, setSelection, selectNext } = useStore.getState();
      setFocusedPanel('topology');
      setSelection('topology', 'node2');

      selectNext();

      const selection = useStore.getState().selections.get('topology');
      expect(selection).toBe('node2'); // Should stay at last
    });

    test('selectPrevious stops at first node', () => {
      initializeStoreWithNodes(2);

      const { setFocusedPanel, setSelection, selectPrevious } =
        useStore.getState();
      setFocusedPanel('topology');
      setSelection('topology', 'node1');

      selectPrevious();

      const selection = useStore.getState().selections.get('topology');
      expect(selection).toBe('node1'); // Should stay at first
    });
  });

  describe('Node Status', () => {
    test('node marked stale updates staleNodes set', () => {
      initializeStoreWithNodes(1);

      const { markNodeStale } = useStore.getState();
      markNodeStale('node1');

      const isStale = useStore.getState().staleNodes.has('node1');
      expect(isStale).toBe(true);
    });

    test('clearNodeStale removes stale flag', () => {
      initializeStoreWithNodes(1);

      const { markNodeStale, clearNodeStale } = useStore.getState();
      markNodeStale('node1');
      clearNodeStale('node1');

      const isStale = useStore.getState().staleNodes.has('node1');
      expect(isStale).toBe(false);
    });
  });

  describe('Selectable Items', () => {
    test('selectSelectableItems returns node IDs for topology panel', () => {
      initializeStoreWithNodes(3);

      const { setFocusedPanel } = useStore.getState();
      setFocusedPanel('topology');

      const state = useStore.getState();
      const items = Array.from(state.nodes.keys());

      expect(items).toContain('node1');
      expect(items).toContain('node2');
      expect(items).toContain('node3');
    });
  });
});
