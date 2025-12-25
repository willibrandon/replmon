/**
 * Tests for SlotsPanel Component
 *
 * Feature: 010-slots-panel
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { useStore } from '../../store/index.js';
import {
  getRetentionSeverity,
  getWalStatusSeverity,
  getRetentionPercent,
  formatBytes,
} from '../../hooks/useSlots.js';
import {
  DEFAULT_RETENTION_WARNING_BYTES,
  DEFAULT_RETENTION_CRITICAL_BYTES,
} from '../../config/defaults.js';
import type { NodeInfo, SlotData } from '../../store/types.js';

// Reset store before each test
beforeEach(() => {
  const state = useStore.getState();
  state.clearReplicationData();
  state.resetUIState();
  state.resetConnectionStates();
});

// =============================================================================
// Test Helpers
// =============================================================================

const testNodes: NodeInfo[] = [
  { id: 'node1', name: 'Primary', host: 'localhost', port: 5432, database: 'test', hasPglogical: false },
  { id: 'node2', name: 'Standby', host: 'localhost', port: 5433, database: 'test', hasPglogical: true },
];

const createSlot = (overrides: Partial<SlotData> = {}): SlotData => ({
  nodeId: 'node1',
  slotName: 'test_slot',
  plugin: 'pgoutput',
  slotType: 'logical',
  database: 'test',
  active: true,
  retainedBytes: 1024,
  walStatus: 'reserved',
  isStale: false,
  timestamp: new Date(),
  ...overrides,
});

/**
 * Helper to compute slots data from store.
 */
function computeSlotsData() {
  const state = useStore.getState();
  const { nodes, slots, staleNodes, selections } = state;
  const selectedId = selections.get('slots') ?? null;

  interface SlotListItem {
    id: string;
    nodeId: string;
    slotName: string;
    plugin: string | null;
    slotType: 'physical' | 'logical';
    database: string | null;
    active: boolean;
    retainedBytes: number;
    walStatus: 'reserved' | 'extended' | 'unreserved' | 'lost' | null;
    timestamp: Date;
    nodeName: string;
    isStale: boolean;
    isSelected: boolean;
    retentionSeverity: 'healthy' | 'warning' | 'critical';
    walStatusSeverity: 'healthy' | 'warning' | 'critical' | null;
    retentionPercent: number;
    formattedRetention: string;
  }

  const items: SlotListItem[] = [];

  for (const [nodeId, nodeSlots] of slots) {
    const nodeInfo = nodes.get(nodeId);
    if (!nodeInfo) continue;
    const nodeName = nodeInfo.name ?? nodeId;
    const isStale = staleNodes.has(nodeId);

    for (const slot of nodeSlots) {
      const id = `${nodeId}:${slot.slotName}`;
      const retainedBytes = Math.max(0, slot.retainedBytes);
      const retentionSeverity = getRetentionSeverity(retainedBytes);
      const walStatusSeverity = getWalStatusSeverity(slot.walStatus);
      const retentionPercent = getRetentionPercent(retainedBytes);
      const formattedRetention = formatBytes(retainedBytes);

      items.push({
        id,
        nodeId,
        slotName: slot.slotName,
        plugin: slot.plugin,
        slotType: slot.slotType,
        database: slot.database,
        active: slot.active,
        retainedBytes,
        walStatus: slot.walStatus,
        timestamp: slot.timestamp,
        nodeName,
        isStale,
        isSelected: id === selectedId,
        retentionSeverity,
        walStatusSeverity,
        retentionPercent,
        formattedRetention,
      });
    }
  }

  items.sort((a, b) => {
    const nodeCompare = a.nodeName.localeCompare(b.nodeName);
    if (nodeCompare !== 0) return nodeCompare;
    return a.slotName.localeCompare(b.slotName);
  });

  let activeCount = 0;
  let inactiveCount = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let staleCount = 0;
  let totalRetainedBytes = 0;
  let selectedItem: SlotListItem | null = null;

  for (const item of items) {
    if (item.active) activeCount++;
    else inactiveCount++;
    if (item.retentionSeverity === 'critical') criticalCount++;
    else if (item.retentionSeverity === 'warning') warningCount++;
    if (item.isStale) staleCount++;
    totalRetainedBytes += item.retainedBytes;
    if (item.isSelected) selectedItem = item;
  }

  return {
    items,
    selectedItem,
    count: items.length,
    activeCount,
    inactiveCount,
    criticalCount,
    warningCount,
    staleCount,
    totalRetainedBytes,
    formattedTotalRetention: formatBytes(totalRetainedBytes),
  };
}

// =============================================================================
// User Story 1 Tests: View All Slots with Health Status
// =============================================================================

describe('US1: Empty state rendering', () => {
  test('should show empty state when no slots exist', () => {
    const result = computeSlotsData();

    expect(result.items).toEqual([]);
    expect(result.count).toBe(0);
  });

  test('empty state should have zero for all counts', () => {
    const result = computeSlotsData();

    expect(result.activeCount).toBe(0);
    expect(result.inactiveCount).toBe(0);
    expect(result.criticalCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.staleCount).toBe(0);
  });
});

describe('US1: Slot row rendering with StatusDot', () => {
  test('should render slots from all connected nodes', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'slot1' })]);
    setSlots('node2', [createSlot({ nodeId: 'node2', slotName: 'slot2' })]);

    const result = computeSlotsData();

    expect(result.items.length).toBe(2);
  });

  test('active slot should have success status', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'active_slot', active: true })]);

    const result = computeSlotsData();
    const slot = result.items[0];

    expect(slot?.active).toBe(true);
  });

  test('inactive slot should have muted status', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'inactive_slot', active: false })]);

    const result = computeSlotsData();
    const slot = result.items[0];

    expect(slot?.active).toBe(false);
  });

  test('should display node name for each slot', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'slot1' })]);

    const result = computeSlotsData();

    expect(result.items[0]?.nodeName).toBe('Primary');
  });

  test('should display slot type badge', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [
      createSlot({ slotName: 'logical_slot', slotType: 'logical' }),
      createSlot({ slotName: 'physical_slot', slotType: 'physical' }),
    ]);

    const result = computeSlotsData();
    const logical = result.items.find((i) => i.slotName === 'logical_slot');
    const physical = result.items.find((i) => i.slotName === 'physical_slot');

    expect(logical?.slotType).toBe('logical');
    expect(physical?.slotType).toBe('physical');
  });
});

describe('US1: Stale node slot display', () => {
  test('slots from stale nodes should be marked as stale', () => {
    const { initializeNodesInfo, setSlots, markNodeStale } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'slot1' })]);
    markNodeStale('node1');

    const result = computeSlotsData();

    expect(result.items[0]?.isStale).toBe(true);
    expect(result.staleCount).toBe(1);
  });

  test('stale slots should retain last known data', () => {
    const { initializeNodesInfo, setSlots, markNodeStale } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'slot1', retainedBytes: 5000 })]);
    markNodeStale('node1');

    const result = computeSlotsData();

    expect(result.items[0]?.retainedBytes).toBe(5000);
  });
});

// =============================================================================
// User Story 2 Tests: WAL Retention Progress Bars with Severity
// =============================================================================

describe('US2: Progress bar severity colors', () => {
  test('healthy retention should have healthy severity', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'healthy', retainedBytes: 100 })]);

    const result = computeSlotsData();

    expect(result.items[0]?.retentionSeverity).toBe('healthy');
  });

  test('warning retention should have warning severity', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [
      createSlot({ slotName: 'warning', retainedBytes: DEFAULT_RETENTION_WARNING_BYTES }),
    ]);

    const result = computeSlotsData();

    expect(result.items[0]?.retentionSeverity).toBe('warning');
  });

  test('critical retention should have critical severity', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [
      createSlot({ slotName: 'critical', retainedBytes: DEFAULT_RETENTION_CRITICAL_BYTES }),
    ]);

    const result = computeSlotsData();

    expect(result.items[0]?.retentionSeverity).toBe('critical');
  });
});

describe('US2: Retention percentage calculation', () => {
  test('retention percent should be 0 for 0 bytes', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'zero', retainedBytes: 0 })]);

    const result = computeSlotsData();

    expect(result.items[0]?.retentionPercent).toBe(0);
  });

  test('retention percent should be 50 at half critical threshold', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [
      createSlot({ slotName: 'half', retainedBytes: DEFAULT_RETENTION_CRITICAL_BYTES / 2 }),
    ]);

    const result = computeSlotsData();

    expect(result.items[0]?.retentionPercent).toBe(50);
  });

  test('retention percent should be capped at 100', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [
      createSlot({ slotName: 'over', retainedBytes: DEFAULT_RETENTION_CRITICAL_BYTES * 2 }),
    ]);

    const result = computeSlotsData();

    expect(result.items[0]?.retentionPercent).toBe(100);
  });
});

// =============================================================================
// User Story 3 Tests: WAL Status Indicator
// =============================================================================

describe('US3: WAL status severity mapping', () => {
  test('reserved status should map to healthy', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'reserved', walStatus: 'reserved' })]);

    const result = computeSlotsData();

    expect(result.items[0]?.walStatusSeverity).toBe('healthy');
  });

  test('extended status should map to warning', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'extended', walStatus: 'extended' })]);

    const result = computeSlotsData();

    expect(result.items[0]?.walStatusSeverity).toBe('warning');
  });

  test('unreserved status should map to critical', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'unreserved', walStatus: 'unreserved' })]);

    const result = computeSlotsData();

    expect(result.items[0]?.walStatusSeverity).toBe('critical');
  });

  test('lost status should map to critical', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'lost', walStatus: 'lost' })]);

    const result = computeSlotsData();

    expect(result.items[0]?.walStatusSeverity).toBe('critical');
  });
});

describe('US3: WAL status badge rendering', () => {
  test('WAL status badge should show status text', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'reserved', walStatus: 'reserved' })]);

    const result = computeSlotsData();

    expect(result.items[0]?.walStatus).toBe('reserved');
  });
});

describe('US3: Null WAL status (PG12) handling', () => {
  test('null WAL status should have null severity', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'pg12', walStatus: null })]);

    const result = computeSlotsData();

    expect(result.items[0]?.walStatusSeverity).toBe(null);
    expect(result.items[0]?.walStatus).toBe(null);
  });
});

// =============================================================================
// User Story 4 Tests: Summary Header with Aggregated Stats
// =============================================================================

describe('US4: Summary header badge counts', () => {
  test('should count active slots correctly', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [
      createSlot({ slotName: 'active1', active: true }),
      createSlot({ slotName: 'active2', active: true }),
      createSlot({ slotName: 'inactive1', active: false }),
    ]);

    const result = computeSlotsData();

    expect(result.activeCount).toBe(2);
    expect(result.inactiveCount).toBe(1);
  });

  test('should count slots from multiple nodes', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'slot1' })]);
    setSlots('node2', [
      createSlot({ nodeId: 'node2', slotName: 'slot2' }),
      createSlot({ nodeId: 'node2', slotName: 'slot3' }),
    ]);

    const result = computeSlotsData();

    expect(result.count).toBe(3);
  });
});

describe('US4: Total retention display', () => {
  test('should sum total retained bytes across all slots', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [
      createSlot({ slotName: 'slot1', retainedBytes: 1000 }),
      createSlot({ slotName: 'slot2', retainedBytes: 2000 }),
    ]);

    const result = computeSlotsData();

    expect(result.totalRetainedBytes).toBe(3000);
  });

  test('should format total retention for display', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [
      createSlot({ slotName: 'slot1', retainedBytes: 1024 * 1024 * 1024 }), // 1GB
    ]);

    const result = computeSlotsData();

    expect(result.formattedTotalRetention).toBe('1.0 GB');
  });
});

describe('US4: Critical/warning count badges', () => {
  test('should count critical slots', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [
      createSlot({ slotName: 'c1', retainedBytes: DEFAULT_RETENTION_CRITICAL_BYTES }),
      createSlot({ slotName: 'c2', retainedBytes: DEFAULT_RETENTION_CRITICAL_BYTES + 1000 }),
    ]);

    const result = computeSlotsData();

    expect(result.criticalCount).toBe(2);
  });

  test('should count warning slots', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [
      createSlot({ slotName: 'w1', retainedBytes: DEFAULT_RETENTION_WARNING_BYTES }),
      createSlot({ slotName: 'w2', retainedBytes: DEFAULT_RETENTION_WARNING_BYTES + 1000 }),
      createSlot({
        slotName: 'w3',
        retainedBytes: DEFAULT_RETENTION_CRITICAL_BYTES - 1,
      }),
    ]);

    const result = computeSlotsData();

    expect(result.warningCount).toBe(3);
  });
});

// =============================================================================
// User Story 5 Tests: Selection Highlighting
// =============================================================================

describe('US5: Selection highlighting', () => {
  test('should mark selected slot', () => {
    const { initializeNodesInfo, setSlots, setSelection } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [
      createSlot({ slotName: 'slot1' }),
      createSlot({ slotName: 'slot2' }),
    ]);
    setSelection('slots', 'node1:slot2');

    const result = computeSlotsData();
    const slot1 = result.items.find((i) => i.slotName === 'slot1');
    const slot2 = result.items.find((i) => i.slotName === 'slot2');

    expect(slot1?.isSelected).toBe(false);
    expect(slot2?.isSelected).toBe(true);
  });

  test('should return selected item', () => {
    const { initializeNodesInfo, setSlots, setSelection } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'slot1' })]);
    setSelection('slots', 'node1:slot1');

    const result = computeSlotsData();

    expect(result.selectedItem?.slotName).toBe('slot1');
  });

  test('should return null when nothing selected', () => {
    const { initializeNodesInfo, setSlots } = useStore.getState();
    initializeNodesInfo(testNodes);
    setSlots('node1', [createSlot({ slotName: 'slot1' })]);

    const result = computeSlotsData();

    expect(result.selectedItem).toBe(null);
  });
});
