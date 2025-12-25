/**
 * Tests for the combined Zustand store
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { useStore } from './index.js';
import type { NodeInfo, LagSample, ModalConfig } from './types.js';

// Reset store before each test
beforeEach(() => {
  const state = useStore.getState();
  state.clearReplicationData();
  state.resetUIState();
  state.resetConnectionStates();
});

describe('Connection Slice', () => {
  test('initializes nodes with connecting status', () => {
    const { initializeNodes } = useStore.getState();

    initializeNodes(['node1', 'node2']);

    const state = useStore.getState();
    expect(state.nodeStatus.get('node1')).toBe('connecting');
    expect(state.nodeStatus.get('node2')).toBe('connecting');
  });

  test('setNodeStatus updates node status', () => {
    const { initializeNodes, setNodeStatus } = useStore.getState();

    initializeNodes(['node1']);
    setNodeStatus('node1', 'connected');

    expect(useStore.getState().nodeStatus.get('node1')).toBe('connected');
  });

  test('setConnectionError stores error message', () => {
    const { setConnectionError } = useStore.getState();

    setConnectionError('node1', 'Connection refused');

    expect(useStore.getState().connectionErrors.get('node1')).toBe('Connection refused');
  });

  test('clearConnectionError removes error', () => {
    const { setConnectionError, clearConnectionError } = useStore.getState();

    setConnectionError('node1', 'Error');
    clearConnectionError('node1');

    expect(useStore.getState().connectionErrors.has('node1')).toBe(false);
  });

  test('setCurrentScreen changes screen', () => {
    const { setCurrentScreen } = useStore.getState();

    setCurrentScreen('dashboard');

    expect(useStore.getState().currentScreen).toBe('dashboard');
  });

  test('setPglogicalMode updates mode', () => {
    const { setPglogicalMode } = useStore.getState();

    setPglogicalMode(true);

    expect(useStore.getState().pglogicalMode).toBe(true);
  });
});

describe('Replication Slice', () => {
  test('initializeNodesInfo populates nodes map', () => {
    const { initializeNodesInfo } = useStore.getState();
    const nodes: NodeInfo[] = [
      { id: 'node1', name: 'Primary', host: 'localhost', port: 5432, database: 'test', hasPglogical: false },
      { id: 'node2', name: 'Standby', host: 'localhost', port: 5433, database: 'test', hasPglogical: true },
    ];

    initializeNodesInfo(nodes);

    const state = useStore.getState();
    expect(state.nodes.size).toBe(2);
    expect(state.nodes.get('node1')?.name).toBe('Primary');
    expect(state.nodes.get('node2')?.hasPglogical).toBe(true);
  });

  test('setSubscriptions updates subscriptions for node', () => {
    const { setSubscriptions } = useStore.getState();
    const subs = [
      {
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
      },
    ];

    setSubscriptions('node1', subs);

    const state = useStore.getState();
    expect(state.subscriptions.get('node1')?.length).toBe(1);
    expect(state.subscriptions.get('node1')?.[0]?.subscriptionName).toBe('sub1');
  });

  test('setSlots updates slots for node', () => {
    const { setSlots } = useStore.getState();
    const slots = [
      {
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
      },
    ];

    setSlots('node1', slots);

    const state = useStore.getState();
    expect(state.slots.get('node1')?.length).toBe(1);
    expect(state.slots.get('node1')?.[0]?.slotName).toBe('slot1');
  });

  test('setConflicts updates conflicts for node', () => {
    const { setConflicts } = useStore.getState();
    const conflicts = [
      {
        nodeId: 'node1',
        subscriptionName: 'sub1',
        applyErrorCount: 5,
        insertConflicts: 2,
        updateOriginDiffers: 1,
        updateExists: 0,
        updateDeleted: 0,
        updateMissing: 1,
        deleteOriginDiffers: 0,
        deleteMissing: 1,
        multipleUniqueConflicts: 0,
        statsReset: null,
        source: 'pglogical_log' as const,
        timestamp: new Date(),
      },
    ];

    setConflicts('node1', conflicts);

    const state = useStore.getState();
    expect(state.conflicts.get('node1')?.length).toBe(1);
    expect(state.conflicts.get('node1')?.[0]?.applyErrorCount).toBe(5);
  });

  test('appendLagSample adds sample to history', () => {
    const { appendLagSample } = useStore.getState();
    const sample: LagSample = {
      timestamp: new Date(),
      lagBytes: 1024,
      lagSeconds: 5,
    };

    appendLagSample('node1', 'sub1', sample);

    const state = useStore.getState();
    const history = state.lagHistory.get('node1:sub1');
    expect(history?.length).toBe(1);
    expect(history?.[0]?.lagBytes).toBe(1024);
  });

  test('appendLagSample enforces FIFO at 60 samples', () => {
    const { appendLagSample } = useStore.getState();

    // Add 65 samples
    for (let i = 0; i < 65; i++) {
      appendLagSample('node1', 'sub1', {
        timestamp: new Date(),
        lagBytes: i,
        lagSeconds: i,
      });
    }

    const state = useStore.getState();
    const history = state.lagHistory.get('node1:sub1');
    expect(history?.length).toBe(60);
    // First sample should be i=5 (oldest retained)
    expect(history?.[0]?.lagBytes).toBe(5);
    // Last sample should be i=64
    expect(history?.[59]?.lagBytes).toBe(64);
  });

  test('markNodeStale adds node to stale set', () => {
    const { markNodeStale } = useStore.getState();

    markNodeStale('node1');

    expect(useStore.getState().staleNodes.has('node1')).toBe(true);
  });

  test('clearNodeStale removes node from stale set', () => {
    const { markNodeStale, clearNodeStale } = useStore.getState();

    markNodeStale('node1');
    clearNodeStale('node1');

    expect(useStore.getState().staleNodes.has('node1')).toBe(false);
  });

  test('setLastUpdated tracks polling timestamp', () => {
    const { setLastUpdated } = useStore.getState();
    const timestamp = new Date();

    setLastUpdated('node1', timestamp);

    expect(useStore.getState().lastUpdated.get('node1')).toEqual(timestamp);
  });

  test('setNodePglogical updates node pglogical flag', () => {
    const { initializeNodesInfo, setNodePglogical } = useStore.getState();
    initializeNodesInfo([
      { id: 'node1', name: 'Test', host: 'localhost', port: 5432, database: 'test', hasPglogical: false },
    ]);

    setNodePglogical('node1', true);

    expect(useStore.getState().nodes.get('node1')?.hasPglogical).toBe(true);
  });

  test('clearReplicationData resets all replication state', () => {
    const { initializeNodesInfo, markNodeStale, clearReplicationData } = useStore.getState();
    initializeNodesInfo([
      { id: 'node1', name: 'Test', host: 'localhost', port: 5432, database: 'test', hasPglogical: false },
    ]);
    markNodeStale('node1');

    clearReplicationData();

    const state = useStore.getState();
    expect(state.nodes.size).toBe(0);
    expect(state.subscriptions.size).toBe(0);
    expect(state.staleNodes.size).toBe(0);
  });
});

describe('UI Slice', () => {
  test('initial focusedPanel is topology', () => {
    expect(useStore.getState().focusedPanel).toBe('topology');
  });

  test('setFocusedPanel changes panel', () => {
    const { setFocusedPanel } = useStore.getState();

    setFocusedPanel('subscriptions');

    expect(useStore.getState().focusedPanel).toBe('subscriptions');
  });

  test('setFocusedPanel ignores invalid panel', () => {
    const { setFocusedPanel } = useStore.getState();

    // @ts-expect-error - testing invalid input
    setFocusedPanel('invalid');

    expect(useStore.getState().focusedPanel).toBe('topology');
  });

  test('focusNextPanel cycles through panels', () => {
    const { focusNextPanel } = useStore.getState();

    focusNextPanel(); // topology -> subscriptions
    expect(useStore.getState().focusedPanel).toBe('subscriptions');

    focusNextPanel(); // subscriptions -> slots
    expect(useStore.getState().focusedPanel).toBe('slots');

    focusNextPanel(); // slots -> conflicts
    expect(useStore.getState().focusedPanel).toBe('conflicts');

    focusNextPanel(); // conflicts -> operations
    expect(useStore.getState().focusedPanel).toBe('operations');

    focusNextPanel(); // operations -> topology (wrap)
    expect(useStore.getState().focusedPanel).toBe('topology');
  });

  test('focusPreviousPanel cycles backwards', () => {
    const { focusPreviousPanel } = useStore.getState();

    focusPreviousPanel(); // topology -> operations (wrap)
    expect(useStore.getState().focusedPanel).toBe('operations');

    focusPreviousPanel(); // operations -> conflicts
    expect(useStore.getState().focusedPanel).toBe('conflicts');
  });

  test('openModal sets modal state and preserves focus', () => {
    const { setFocusedPanel, openModal } = useStore.getState();
    setFocusedPanel('slots');

    const config: ModalConfig = { type: 'help', title: 'Help' };
    openModal(config);

    const state = useStore.getState();
    expect(state.activeModal).toBe('help');
    expect(state.modalData?.title).toBe('Help');
    expect(state.previousFocusedPanel).toBe('slots');
  });

  test('closeModal restores previous focus', () => {
    const { setFocusedPanel, openModal, closeModal } = useStore.getState();
    setFocusedPanel('conflicts');
    openModal({ type: 'operations' });

    closeModal();

    const state = useStore.getState();
    expect(state.activeModal).toBe(null);
    expect(state.modalData).toBe(null);
    expect(state.focusedPanel).toBe('conflicts');
    expect(state.previousFocusedPanel).toBe(null);
  });

  test('setSelection updates panel selection', () => {
    const { setSelection } = useStore.getState();

    setSelection('topology', 'node1');
    setSelection('subscriptions', 'node1:sub1');

    const state = useStore.getState();
    expect(state.selections.get('topology')).toBe('node1');
    expect(state.selections.get('subscriptions')).toBe('node1:sub1');
  });

  test('selectNext moves selection down', () => {
    const { initializeNodesInfo, setFocusedPanel, selectNext } = useStore.getState();
    initializeNodesInfo([
      { id: 'node1', name: 'Node 1', host: 'localhost', port: 5432, database: 'test', hasPglogical: false },
      { id: 'node2', name: 'Node 2', host: 'localhost', port: 5433, database: 'test', hasPglogical: false },
    ]);
    setFocusedPanel('topology');

    selectNext(); // null -> node1
    expect(useStore.getState().selections.get('topology')).toBe('node1');

    selectNext(); // node1 -> node2
    expect(useStore.getState().selections.get('topology')).toBe('node2');

    selectNext(); // node2 -> node2 (stay at end)
    expect(useStore.getState().selections.get('topology')).toBe('node2');
  });

  test('selectPrevious moves selection up', () => {
    const { initializeNodesInfo, setFocusedPanel, setSelection, selectPrevious } = useStore.getState();
    initializeNodesInfo([
      { id: 'node1', name: 'Node 1', host: 'localhost', port: 5432, database: 'test', hasPglogical: false },
      { id: 'node2', name: 'Node 2', host: 'localhost', port: 5433, database: 'test', hasPglogical: false },
    ]);
    setFocusedPanel('topology');
    setSelection('topology', 'node2');

    selectPrevious(); // node2 -> node1
    expect(useStore.getState().selections.get('topology')).toBe('node1');

    selectPrevious(); // node1 -> node1 (stay at start)
    expect(useStore.getState().selections.get('topology')).toBe('node1');
  });

  test('resetUIState clears all UI state', () => {
    const { setFocusedPanel, openModal, setSelection, resetUIState } = useStore.getState();
    setFocusedPanel('slots');
    openModal({ type: 'help' });
    setSelection('topology', 'node1');

    resetUIState();

    const state = useStore.getState();
    expect(state.focusedPanel).toBe('topology');
    expect(state.activeModal).toBe(null);
    expect(state.selections.get('topology')).toBe(null);
  });
});
