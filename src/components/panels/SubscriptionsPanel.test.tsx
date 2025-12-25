/**
 * SubscriptionsPanel Component Tests
 *
 * Tests for subscription display, status indicators, lag metrics, and selection.
 *
 * Feature: 009-subscriptions-panel
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { useStore } from '../../store/index.js';
import { useConnectionStore } from '../../store/connection.js';
import type { NodeInfo, SubscriptionData, LagSample } from '../../store/types.js';
import { getStatusVariant } from '../../hooks/useSubscriptions.js';
import { formatBytes, formatDuration } from './SubscriptionsPanel.js';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a test subscription data object.
 */
function createSubscription(
  nodeId: string,
  name: string,
  overrides: Partial<SubscriptionData> = {}
): SubscriptionData {
  return {
    nodeId,
    subscriptionName: name,
    enabled: true,
    status: 'replicating',
    providerNode: null,
    providerHost: null,
    providerPort: null,
    slotName: `${name}_slot`,
    receivedLsn: '0/3000158',
    latestEndLsn: '0/3000160',
    replicationSets: [],
    lastMessageTime: new Date(),
    workerPid: 12345,
    source: 'native',
    timestamp: new Date(),
    ...overrides,
  };
}

/**
 * Create a test lag sample.
 */
function createLagSample(
  lagBytes: number,
  lagSeconds: number | null
): LagSample {
  return {
    timestamp: new Date(),
    lagBytes,
    lagSeconds,
  };
}

/**
 * Initialize store with nodes and subscriptions for testing.
 */
function initializeStoreWithSubscriptions(
  subscriptions: { nodeId: string; name: string; overrides?: Partial<SubscriptionData> }[]
): void {
  const { initializeNodesInfo, setSubscriptions } = useStore.getState();

  // Get unique node IDs
  const nodeIds = [...new Set(subscriptions.map((s) => s.nodeId))];

  // Create node infos
  const nodeInfos: NodeInfo[] = nodeIds.map((id, i) => ({
    id,
    name: id,
    host: 'localhost',
    port: 5430 + i,
    database: 'postgres',
    hasPglogical: false,
  }));
  initializeNodesInfo(nodeInfos);

  // Group subscriptions by node
  const subsByNode = new Map<string, SubscriptionData[]>();
  for (const sub of subscriptions) {
    const subs = subsByNode.get(sub.nodeId) ?? [];
    subs.push(createSubscription(sub.nodeId, sub.name, sub.overrides));
    subsByNode.set(sub.nodeId, subs);
  }

  // Set subscriptions for each node
  for (const [nodeId, subs] of subsByNode) {
    setSubscriptions(nodeId, subs);
  }
}

// Reset store before each test
beforeEach(() => {
  const state = useStore.getState();
  state.clearReplicationData();
  state.resetUIState();
  state.resetConnectionStates();
  useConnectionStore.getState().setPglogicalMode(false);
});

// =============================================================================
// User Story 1: Monitor All Subscriptions at a Glance
// =============================================================================

describe('User Story 1: Monitor All Subscriptions', () => {
  describe('T009: Empty state', () => {
    test('empty subscriptions Map results in empty items array', () => {
      const state = useStore.getState();
      // No subscriptions initialized - map should be empty
      expect(state.subscriptions.size).toBe(0);
    });
  });

  describe('T010: List renders multiple subscriptions', () => {
    test('multiple subscriptions from different nodes are aggregated', () => {
      initializeStoreWithSubscriptions([
        { nodeId: 'node1', name: 'sub1' },
        { nodeId: 'node1', name: 'sub2' },
        { nodeId: 'node2', name: 'sub3' },
      ]);

      const state = useStore.getState();

      // Verify subscriptions are stored per node
      const node1Subs = state.subscriptions.get('node1');
      const node2Subs = state.subscriptions.get('node2');

      expect(node1Subs).toHaveLength(2);
      expect(node2Subs).toHaveLength(1);
      expect(node1Subs?.[0]?.subscriptionName).toBe('sub1');
      expect(node1Subs?.[1]?.subscriptionName).toBe('sub2');
      expect(node2Subs?.[0]?.subscriptionName).toBe('sub3');
    });

    test('subscription includes node name for context', () => {
      initializeStoreWithSubscriptions([
        { nodeId: 'node1', name: 'my_subscription' },
      ]);

      const state = useStore.getState();
      const nodeInfo = state.nodes.get('node1');

      expect(nodeInfo?.name).toBe('node1');
    });
  });

  describe('T011: Status indicator variants', () => {
    test('replicating status maps to success variant', () => {
      const variant = getStatusVariant('replicating', true);
      expect(variant).toBe('success');
    });

    test('catchup status maps to warning variant', () => {
      const variant = getStatusVariant('catchup', true);
      expect(variant).toBe('warning');
    });

    test('initializing status maps to connecting variant', () => {
      const variant = getStatusVariant('initializing', true);
      expect(variant).toBe('connecting');
    });

    test('down status maps to critical variant', () => {
      const variant = getStatusVariant('down', true);
      expect(variant).toBe('critical');
    });

    test('unknown status maps to muted variant', () => {
      const variant = getStatusVariant('unknown', true);
      expect(variant).toBe('muted');
    });

    test('disabled subscription maps to muted variant regardless of status', () => {
      const variant = getStatusVariant('replicating', false);
      expect(variant).toBe('muted');
    });
  });

  describe('T017: Stale subscription handling', () => {
    test('stale node marks subscriptions as stale', () => {
      initializeStoreWithSubscriptions([
        { nodeId: 'node1', name: 'sub1' },
      ]);

      const { markNodeStale } = useStore.getState();
      markNodeStale('node1');

      const state = useStore.getState();
      expect(state.staleNodes.has('node1')).toBe(true);
    });
  });
});

// =============================================================================
// User Story 2: View Subscription Lag Metrics
// =============================================================================

describe('User Story 2: Lag Metrics', () => {
  describe('T018: Lag bytes formatting', () => {
    test('formats bytes correctly', () => {
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
      expect(formatBytes(2621440)).toBe('2.5 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
  });

  describe('T019: Lag time formatting', () => {
    test('formats seconds correctly', () => {
      expect(formatDuration(null)).toBe('-');
      expect(formatDuration(5)).toBe('5s');
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(59)).toBe('59s');
    });

    test('formats minutes correctly', () => {
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(150)).toBe('2m 30s');
    });

    test('formats hours correctly', () => {
      expect(formatDuration(3600)).toBe('1h 0m');
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(7200)).toBe('2h 0m');
    });
  });

  describe('T022-T023: Lag sample and severity', () => {
    test('lag sample is stored in lagHistory', () => {
      initializeStoreWithSubscriptions([
        { nodeId: 'node1', name: 'sub1' },
      ]);

      const { appendLagSample } = useStore.getState();
      appendLagSample('node1', 'sub1', createLagSample(1024, 5));

      const state = useStore.getState();
      const history = state.lagHistory.get('node1:sub1');

      expect(history).toHaveLength(1);
      expect(history?.[0]?.lagBytes).toBe(1024);
      expect(history?.[0]?.lagSeconds).toBe(5);
    });
  });
});

// =============================================================================
// User Story 3: View LSN Positions
// =============================================================================

describe('User Story 3: LSN Positions', () => {
  describe('T028-T029: LSN display', () => {
    test('subscription stores received LSN', () => {
      initializeStoreWithSubscriptions([
        { nodeId: 'node1', name: 'sub1', overrides: { receivedLsn: '0/3000158' } },
      ]);

      const state = useStore.getState();
      const subs = state.subscriptions.get('node1');

      expect(subs?.[0]?.receivedLsn).toBe('0/3000158');
    });

    test('null LSN is stored when unavailable', () => {
      initializeStoreWithSubscriptions([
        { nodeId: 'node1', name: 'sub1', overrides: { receivedLsn: null } },
      ]);

      const state = useStore.getState();
      const subs = state.subscriptions.get('node1');

      expect(subs?.[0]?.receivedLsn).toBeNull();
    });
  });
});

// =============================================================================
// User Story 4: Select Subscription for Details
// =============================================================================

describe('User Story 4: Subscription Selection', () => {
  describe('T032-T033: Selection state', () => {
    test('initial selection is null or undefined', () => {
      const selection = useStore.getState().selections.get('subscriptions');
      expect(selection === null || selection === undefined).toBe(true);
    });

    test('setSelection updates selection for subscriptions panel', () => {
      initializeStoreWithSubscriptions([
        { nodeId: 'node1', name: 'sub1' },
        { nodeId: 'node1', name: 'sub2' },
      ]);

      const { setSelection, setFocusedPanel } = useStore.getState();
      setFocusedPanel('subscriptions');
      setSelection('subscriptions', 'node1:sub1');

      const selection = useStore.getState().selections.get('subscriptions');
      expect(selection).toBe('node1:sub1');
    });

    test('selectNext moves to next subscription', () => {
      initializeStoreWithSubscriptions([
        { nodeId: 'node1', name: 'sub1' },
        { nodeId: 'node1', name: 'sub2' },
        { nodeId: 'node2', name: 'sub3' },
      ]);

      const { setFocusedPanel, setSelection, selectNext } = useStore.getState();
      setFocusedPanel('subscriptions');
      setSelection('subscriptions', 'node1:sub1');

      selectNext();

      const selection = useStore.getState().selections.get('subscriptions');
      expect(selection).toBe('node1:sub2');
    });

    test('selectPrevious moves to previous subscription', () => {
      initializeStoreWithSubscriptions([
        { nodeId: 'node1', name: 'sub1' },
        { nodeId: 'node1', name: 'sub2' },
      ]);

      const { setFocusedPanel, setSelection, selectPrevious } = useStore.getState();
      setFocusedPanel('subscriptions');
      setSelection('subscriptions', 'node1:sub2');

      selectPrevious();

      const selection = useStore.getState().selections.get('subscriptions');
      expect(selection).toBe('node1:sub1');
    });
  });
});

// =============================================================================
// User Story 5: View Subscription Detail Modal
// =============================================================================

describe('User Story 5: Subscription Detail Modal', () => {
  describe('T038-T040: Modal content', () => {
    test('subscription data includes all detail fields', () => {
      initializeStoreWithSubscriptions([
        {
          nodeId: 'node1',
          name: 'test_sub',
          overrides: {
            source: 'pglogical',
            providerNode: 'provider1',
            providerHost: 'host1.example.com',
            providerPort: 5432,
            slotName: 'test_slot',
            workerPid: 12345,
            replicationSets: ['default', 'ddl_sql'],
            receivedLsn: '0/3000158',
            latestEndLsn: '0/3000160',
          },
        },
      ]);

      const state = useStore.getState();
      const sub = state.subscriptions.get('node1')?.[0];

      expect(sub?.subscriptionName).toBe('test_sub');
      expect(sub?.source).toBe('pglogical');
      expect(sub?.providerNode).toBe('provider1');
      expect(sub?.providerHost).toBe('host1.example.com');
      expect(sub?.providerPort).toBe(5432);
      expect(sub?.slotName).toBe('test_slot');
      expect(sub?.workerPid).toBe(12345);
      expect(sub?.replicationSets).toEqual(['default', 'ddl_sql']);
      expect(sub?.receivedLsn).toBe('0/3000158');
      expect(sub?.latestEndLsn).toBe('0/3000160');
    });

    test('modal can be opened with subscription data', () => {
      const { openModal } = useStore.getState();

      openModal({
        type: 'details',
        title: 'test_sub',
        data: { subscriptionName: 'test_sub' },
      });

      const state = useStore.getState();
      expect(state.activeModal).toBe('details');
      expect(state.modalData?.title).toBe('test_sub');
    });

    test('modal closes on closeModal', () => {
      const { openModal, closeModal } = useStore.getState();

      openModal({
        type: 'details',
        title: 'test_sub',
      });
      closeModal();

      const state = useStore.getState();
      expect(state.activeModal).toBeNull();
    });
  });
});
