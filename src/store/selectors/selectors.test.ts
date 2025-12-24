/**
 * Tests for store selectors
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { useStore } from '../index.js';
import {
  selectNodeIds,
  selectNodeById,
  selectHealthyNodeIds,
  selectStaleNodeIds,
  selectIsNodeStale,
  selectAllSubscriptions,
  selectSubscriptionsByNode,
  selectAllSlots,
  selectAllConflicts,
  selectLagHistory,
  selectLatestLagSample,
} from './aggregations.js';
import {
  selectLaggingSubscriptions,
  selectUnhealthySubscriptions,
  selectActiveSlots,
  selectInactiveSlots,
  selectStaleSlots,
  selectLogicalSlots,
  selectPhysicalSlots,
} from './filters.js';
import {
  selectFocusedPanel,
  selectActiveModal,
  selectCurrentSelection,
  selectTotalSubscriptionCount,
  selectTotalSlotCount,
  selectTotalConflictCount,
  selectHasConflicts,
  selectMaxLagSeconds,
  selectNodeCountByStatus,
  selectSystemHealthSummary,
  selectLagTrend,
} from './computed.js';

// Reset store before each test
beforeEach(() => {
  const state = useStore.getState();
  state.clearReplicationData();
  state.resetUIState();
  state.resetConnectionStates();
});

describe('Node Selectors', () => {
  test('selectNodeIds returns all node IDs', () => {
    const { initializeNodesInfo } = useStore.getState();
    initializeNodesInfo([
      { id: 'node1', name: 'Node 1', host: 'localhost', port: 5432, database: 'test', hasPglogical: false },
      { id: 'node2', name: 'Node 2', host: 'localhost', port: 5433, database: 'test', hasPglogical: false },
    ]);

    const ids = selectNodeIds(useStore.getState());
    expect(ids).toEqual(['node1', 'node2']);
  });

  test('selectNodeById returns node info', () => {
    const { initializeNodesInfo } = useStore.getState();
    initializeNodesInfo([
      { id: 'node1', name: 'Primary', host: 'localhost', port: 5432, database: 'test', hasPglogical: true },
    ]);

    const node = selectNodeById('node1')(useStore.getState());
    expect(node?.name).toBe('Primary');
    expect(node?.hasPglogical).toBe(true);
  });

  test('selectHealthyNodeIds returns connected non-stale nodes', () => {
    const { initializeNodesInfo, initializeNodes, setNodeStatus, markNodeStale } = useStore.getState();
    initializeNodesInfo([
      { id: 'node1', name: 'Node 1', host: 'localhost', port: 5432, database: 'test', hasPglogical: false },
      { id: 'node2', name: 'Node 2', host: 'localhost', port: 5433, database: 'test', hasPglogical: false },
      { id: 'node3', name: 'Node 3', host: 'localhost', port: 5434, database: 'test', hasPglogical: false },
    ]);
    initializeNodes(['node1', 'node2', 'node3']);
    setNodeStatus('node1', 'connected');
    setNodeStatus('node2', 'connected');
    setNodeStatus('node3', 'failed');
    markNodeStale('node2');

    const healthy = selectHealthyNodeIds(useStore.getState());
    expect(healthy).toEqual(['node1']);
  });

  test('selectStaleNodeIds returns stale nodes', () => {
    const { markNodeStale } = useStore.getState();
    markNodeStale('node1');
    markNodeStale('node2');

    const stale = selectStaleNodeIds(useStore.getState());
    expect(stale).toContain('node1');
    expect(stale).toContain('node2');
  });

  test('selectIsNodeStale returns correct boolean', () => {
    const { markNodeStale } = useStore.getState();
    markNodeStale('node1');

    expect(selectIsNodeStale('node1')(useStore.getState())).toBe(true);
    expect(selectIsNodeStale('node2')(useStore.getState())).toBe(false);
  });
});

describe('Subscription Selectors', () => {
  const createSub = (nodeId: string, name: string, status: 'replicating' | 'down' = 'replicating') => ({
    nodeId,
    subscriptionName: name,
    enabled: true,
    status,
    providerNode: null,
    slotName: `${name}_slot`,
    receivedLsn: '0/1000',
    latestEndLsn: '0/1000',
    replicationSets: [],
    lastMessageTime: null,
    workerPid: 1234,
    source: 'native' as const,
    timestamp: new Date(),
  });

  test('selectAllSubscriptions aggregates across nodes', () => {
    const { setSubscriptions } = useStore.getState();
    setSubscriptions('node1', [createSub('node1', 'sub1')]);
    setSubscriptions('node2', [createSub('node2', 'sub2'), createSub('node2', 'sub3')]);

    const all = selectAllSubscriptions(useStore.getState());
    expect(all.length).toBe(3);
  });

  test('selectSubscriptionsByNode returns node subscriptions', () => {
    const { setSubscriptions } = useStore.getState();
    setSubscriptions('node1', [createSub('node1', 'sub1')]);
    setSubscriptions('node2', [createSub('node2', 'sub2')]);

    const subs = selectSubscriptionsByNode('node1')(useStore.getState());
    expect(subs.length).toBe(1);
    expect(subs[0]?.subscriptionName).toBe('sub1');
  });

  test('selectUnhealthySubscriptions returns down subscriptions', () => {
    const { setSubscriptions } = useStore.getState();
    setSubscriptions('node1', [
      createSub('node1', 'sub1', 'replicating'),
      createSub('node1', 'sub2', 'down'),
    ]);

    const unhealthy = selectUnhealthySubscriptions(useStore.getState());
    expect(unhealthy.length).toBe(1);
    expect(unhealthy[0]?.subscriptionName).toBe('sub2');
  });

  test('selectTotalSubscriptionCount returns correct count', () => {
    const { setSubscriptions } = useStore.getState();
    setSubscriptions('node1', [createSub('node1', 'sub1')]);
    setSubscriptions('node2', [createSub('node2', 'sub2'), createSub('node2', 'sub3')]);

    expect(selectTotalSubscriptionCount(useStore.getState())).toBe(3);
  });
});

describe('Slot Selectors', () => {
  const createSlot = (nodeId: string, name: string, active: boolean, type: 'logical' | 'physical' = 'logical') => ({
    nodeId,
    slotName: name,
    plugin: type === 'logical' ? 'pgoutput' : null,
    slotType: type,
    database: 'test',
    active,
    retainedBytes: 1024,
    walStatus: null,
    isStale: !active && true,
    timestamp: new Date(),
  });

  test('selectAllSlots aggregates across nodes', () => {
    const { setSlots } = useStore.getState();
    setSlots('node1', [createSlot('node1', 'slot1', true)]);
    setSlots('node2', [createSlot('node2', 'slot2', false)]);

    expect(selectAllSlots(useStore.getState()).length).toBe(2);
  });

  test('selectActiveSlots returns only active slots', () => {
    const { setSlots } = useStore.getState();
    setSlots('node1', [
      createSlot('node1', 'slot1', true),
      createSlot('node1', 'slot2', false),
    ]);

    const active = selectActiveSlots(useStore.getState());
    expect(active.length).toBe(1);
    expect(active[0]?.slotName).toBe('slot1');
  });

  test('selectInactiveSlots returns only inactive slots', () => {
    const { setSlots } = useStore.getState();
    setSlots('node1', [
      createSlot('node1', 'slot1', true),
      createSlot('node1', 'slot2', false),
    ]);

    const inactive = selectInactiveSlots(useStore.getState());
    expect(inactive.length).toBe(1);
    expect(inactive[0]?.slotName).toBe('slot2');
  });

  test('selectLogicalSlots filters by type', () => {
    const { setSlots } = useStore.getState();
    setSlots('node1', [
      createSlot('node1', 'slot1', true, 'logical'),
      createSlot('node1', 'slot2', true, 'physical'),
    ]);

    expect(selectLogicalSlots(useStore.getState()).length).toBe(1);
    expect(selectPhysicalSlots(useStore.getState()).length).toBe(1);
  });

  test('selectTotalSlotCount returns correct count', () => {
    const { setSlots } = useStore.getState();
    setSlots('node1', [createSlot('node1', 'slot1', true)]);
    setSlots('node2', [createSlot('node2', 'slot2', true)]);

    expect(selectTotalSlotCount(useStore.getState())).toBe(2);
  });
});

describe('Conflict Selectors', () => {
  const createConflict = (nodeId: string, subName: string, insertConflicts: number) => ({
    nodeId,
    subscriptionName: subName,
    applyErrorCount: 0,
    insertConflicts,
    updateOriginDiffers: 0,
    updateExists: 0,
    updateDeleted: 0,
    updateMissing: 0,
    deleteOriginDiffers: 0,
    deleteMissing: 0,
    multipleUniqueConflicts: 0,
    statsReset: null,
    source: 'pglogical_log' as const,
    timestamp: new Date(),
  });

  test('selectAllConflicts aggregates across nodes', () => {
    const { setConflicts } = useStore.getState();
    setConflicts('node1', [createConflict('node1', 'sub1', 5)]);
    setConflicts('node2', [createConflict('node2', 'sub2', 3)]);

    expect(selectAllConflicts(useStore.getState()).length).toBe(2);
  });

  test('selectTotalConflictCount sums all conflict types', () => {
    const { setConflicts } = useStore.getState();
    setConflicts('node1', [{
      nodeId: 'node1',
      subscriptionName: 'sub1',
      applyErrorCount: 1,
      insertConflicts: 2,
      updateOriginDiffers: 3,
      updateExists: 0,
      updateDeleted: 0,
      updateMissing: 0,
      deleteOriginDiffers: 0,
      deleteMissing: 0,
      multipleUniqueConflicts: 0,
      statsReset: null,
      source: 'pglogical_log' as const,
      timestamp: new Date(),
    }]);

    expect(selectTotalConflictCount(useStore.getState())).toBe(6);
  });

  test('selectHasConflicts returns true when conflicts exist', () => {
    const { setConflicts } = useStore.getState();

    expect(selectHasConflicts(useStore.getState())).toBe(false);

    setConflicts('node1', [createConflict('node1', 'sub1', 1)]);

    expect(selectHasConflicts(useStore.getState())).toBe(true);
  });
});

describe('Lag History Selectors', () => {
  test('selectLagHistory returns history for subscription', () => {
    const { appendLagSample } = useStore.getState();
    appendLagSample('node1', 'sub1', { timestamp: new Date(), lagBytes: 100, lagSeconds: 1 });
    appendLagSample('node1', 'sub1', { timestamp: new Date(), lagBytes: 200, lagSeconds: 2 });

    const history = selectLagHistory('node1', 'sub1')(useStore.getState());
    expect(history.length).toBe(2);
  });

  test('selectLatestLagSample returns most recent sample', () => {
    const { appendLagSample } = useStore.getState();
    appendLagSample('node1', 'sub1', { timestamp: new Date(), lagBytes: 100, lagSeconds: 1 });
    appendLagSample('node1', 'sub1', { timestamp: new Date(), lagBytes: 200, lagSeconds: 2 });

    const latest = selectLatestLagSample('node1', 'sub1')(useStore.getState());
    expect(latest?.lagBytes).toBe(200);
  });

  test('selectMaxLagSeconds returns max lag', () => {
    const { appendLagSample } = useStore.getState();
    appendLagSample('node1', 'sub1', { timestamp: new Date(), lagBytes: 100, lagSeconds: 5 });
    appendLagSample('node1', 'sub2', { timestamp: new Date(), lagBytes: 100, lagSeconds: 10 });

    expect(selectMaxLagSeconds(useStore.getState())).toBe(10);
  });

  test('selectLagTrend detects increasing lag', () => {
    const { appendLagSample } = useStore.getState();
    appendLagSample('node1', 'sub1', { timestamp: new Date(), lagBytes: 100, lagSeconds: 1 });
    appendLagSample('node1', 'sub1', { timestamp: new Date(), lagBytes: 200, lagSeconds: 2 });
    appendLagSample('node1', 'sub1', { timestamp: new Date(), lagBytes: 300, lagSeconds: 3 });

    expect(selectLagTrend('node1', 'sub1')(useStore.getState())).toBe('increasing');
  });

  test('selectLagTrend detects decreasing lag', () => {
    const { appendLagSample } = useStore.getState();
    appendLagSample('node1', 'sub1', { timestamp: new Date(), lagBytes: 300, lagSeconds: 3 });
    appendLagSample('node1', 'sub1', { timestamp: new Date(), lagBytes: 200, lagSeconds: 2 });
    appendLagSample('node1', 'sub1', { timestamp: new Date(), lagBytes: 100, lagSeconds: 1 });

    expect(selectLagTrend('node1', 'sub1')(useStore.getState())).toBe('decreasing');
  });

  test('selectLagTrend returns unknown with insufficient data', () => {
    const { appendLagSample } = useStore.getState();
    appendLagSample('node1', 'sub1', { timestamp: new Date(), lagBytes: 100, lagSeconds: 1 });

    expect(selectLagTrend('node1', 'sub1')(useStore.getState())).toBe('unknown');
  });
});

describe('UI Selectors', () => {
  test('selectFocusedPanel returns current panel', () => {
    const { setFocusedPanel } = useStore.getState();
    setFocusedPanel('slots');

    expect(selectFocusedPanel(useStore.getState())).toBe('slots');
  });

  test('selectActiveModal returns modal type', () => {
    const { openModal } = useStore.getState();
    openModal({ type: 'help' });

    expect(selectActiveModal(useStore.getState())).toBe('help');
  });

  test('selectCurrentSelection returns focused panel selection', () => {
    const { setFocusedPanel, setSelection } = useStore.getState();
    setFocusedPanel('topology');
    setSelection('topology', 'node1');

    expect(selectCurrentSelection(useStore.getState())).toBe('node1');
  });
});

describe('Computed Selectors', () => {
  test('selectNodeCountByStatus counts nodes by status', () => {
    const { initializeNodes, setNodeStatus } = useStore.getState();
    initializeNodes(['node1', 'node2', 'node3']);
    setNodeStatus('node1', 'connected');
    setNodeStatus('node2', 'connected');
    setNodeStatus('node3', 'failed');

    const counts = selectNodeCountByStatus(useStore.getState());
    expect(counts.connected).toBe(2);
    expect(counts.failed).toBe(1);
    expect(counts.connecting).toBe(0);
  });

  test('selectSystemHealthSummary provides full overview', () => {
    const { initializeNodesInfo, initializeNodes, setNodeStatus, setSubscriptions, setSlots, markNodeStale } = useStore.getState();
    initializeNodesInfo([
      { id: 'node1', name: 'Node 1', host: 'localhost', port: 5432, database: 'test', hasPglogical: false },
      { id: 'node2', name: 'Node 2', host: 'localhost', port: 5433, database: 'test', hasPglogical: false },
    ]);
    initializeNodes(['node1', 'node2']);
    setNodeStatus('node1', 'connected');
    setNodeStatus('node2', 'connected');
    markNodeStale('node2');
    setSubscriptions('node1', [{
      nodeId: 'node1',
      subscriptionName: 'sub1',
      enabled: true,
      status: 'replicating' as const,
      providerNode: null,
      slotName: 'sub1_slot',
      receivedLsn: '0/1000',
      latestEndLsn: '0/1000',
      replicationSets: [],
      lastMessageTime: null,
      workerPid: 1234,
      source: 'native' as const,
      timestamp: new Date(),
    }]);
    setSlots('node1', [{
      nodeId: 'node1',
      slotName: 'slot1',
      plugin: 'pgoutput',
      slotType: 'logical' as const,
      database: 'test',
      active: true,
      retainedBytes: 1024,
      walStatus: null,
      isStale: false,
      timestamp: new Date(),
    }]);

    const summary = selectSystemHealthSummary(useStore.getState());
    expect(summary.totalNodes).toBe(2);
    expect(summary.healthyNodes).toBe(1);
    expect(summary.staleNodes).toBe(1);
    expect(summary.totalSubscriptions).toBe(1);
    expect(summary.totalSlots).toBe(1);
    expect(summary.hasConflicts).toBe(false);
  });
});
