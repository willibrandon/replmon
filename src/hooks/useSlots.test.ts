/**
 * Tests for the useSlots hook
 *
 * Feature: 010-slots-panel
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { useStore } from '../store/index.js';
import {
  getRetentionSeverity,
  getWalStatusSeverity,
  getRetentionPercent,
  formatBytes,
} from './useSlots.js';
import {
  DEFAULT_RETENTION_WARNING_BYTES,
  DEFAULT_RETENTION_CRITICAL_BYTES,
} from '../config/defaults.js';
import type { NodeInfo, SlotData } from '../store/types.js';

/**
 * Helper to compute useSlots result directly from store state.
 * This avoids React hook rendering issues in test environment.
 */
function computeSlots() {
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

// Reset store before each test
beforeEach(() => {
  const state = useStore.getState();
  state.clearReplicationData();
  state.resetUIState();
  state.resetConnectionStates();
});

// =============================================================================
// Severity Function Tests
// =============================================================================

describe('getRetentionSeverity', () => {
  test('returns healthy for zero bytes', () => {
    expect(getRetentionSeverity(0)).toBe('healthy');
  });

  test('returns healthy for below warning threshold', () => {
    expect(getRetentionSeverity(DEFAULT_RETENTION_WARNING_BYTES - 1)).toBe('healthy');
  });

  test('returns warning at warning threshold', () => {
    expect(getRetentionSeverity(DEFAULT_RETENTION_WARNING_BYTES)).toBe('warning');
  });

  test('returns warning between warning and critical thresholds', () => {
    const midPoint = (DEFAULT_RETENTION_WARNING_BYTES + DEFAULT_RETENTION_CRITICAL_BYTES) / 2;
    expect(getRetentionSeverity(midPoint)).toBe('warning');
  });

  test('returns critical at critical threshold', () => {
    expect(getRetentionSeverity(DEFAULT_RETENTION_CRITICAL_BYTES)).toBe('critical');
  });

  test('returns critical above critical threshold', () => {
    expect(getRetentionSeverity(DEFAULT_RETENTION_CRITICAL_BYTES + 1)).toBe('critical');
  });

  test('supports custom thresholds', () => {
    expect(getRetentionSeverity(500, 100, 1000)).toBe('warning');
    expect(getRetentionSeverity(1000, 100, 1000)).toBe('critical');
  });
});

describe('getWalStatusSeverity', () => {
  test('returns null for null walStatus', () => {
    expect(getWalStatusSeverity(null)).toBe(null);
  });

  test('returns healthy for reserved', () => {
    expect(getWalStatusSeverity('reserved')).toBe('healthy');
  });

  test('returns warning for extended', () => {
    expect(getWalStatusSeverity('extended')).toBe('warning');
  });

  test('returns critical for unreserved', () => {
    expect(getWalStatusSeverity('unreserved')).toBe('critical');
  });

  test('returns critical for lost', () => {
    expect(getWalStatusSeverity('lost')).toBe('critical');
  });
});

describe('getRetentionPercent', () => {
  test('returns 0 for 0 bytes', () => {
    expect(getRetentionPercent(0)).toBe(0);
  });

  test('returns 50 for half of critical threshold', () => {
    expect(getRetentionPercent(DEFAULT_RETENTION_CRITICAL_BYTES / 2)).toBe(50);
  });

  test('returns 100 at critical threshold', () => {
    expect(getRetentionPercent(DEFAULT_RETENTION_CRITICAL_BYTES)).toBe(100);
  });

  test('caps at 100 for values above critical threshold', () => {
    expect(getRetentionPercent(DEFAULT_RETENTION_CRITICAL_BYTES * 2)).toBe(100);
  });

  test('handles negative values as 0', () => {
    expect(getRetentionPercent(-1000)).toBe(0);
  });

  test('supports custom critical threshold', () => {
    expect(getRetentionPercent(500, 1000)).toBe(50);
  });
});

describe('formatBytes', () => {
  test('formats bytes (< 1KB)', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  test('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 100)).toBe('100.0 KB');
  });

  test('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
    expect(formatBytes(1024 * 1024 * 500)).toBe('500.0 MB');
  });

  test('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    expect(formatBytes(1024 * 1024 * 1024 * 1.5)).toBe('1.5 GB');
    expect(formatBytes(1024 * 1024 * 1024 * 10)).toBe('10.0 GB');
  });

  test('handles negative values as 0', () => {
    expect(formatBytes(-1000)).toBe('0 B');
  });
});

// =============================================================================
// useSlots Hook Tests
// =============================================================================

describe('useSlots hook', () => {
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
    pendingBytes: 512,
    walStatus: 'reserved',
    isStale: false,
    timestamp: new Date(),
    ...overrides,
  });

  describe('empty state', () => {
    test('returns empty items when no slots exist', () => {
      const result = computeSlots();

      expect(result.items).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.selectedItem).toBe(null);
    });

    test('returns zero counts when no slots exist', () => {
      const result = computeSlots();

      expect(result.activeCount).toBe(0);
      expect(result.inactiveCount).toBe(0);
      expect(result.criticalCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.staleCount).toBe(0);
      expect(result.totalRetainedBytes).toBe(0);
    });

    test('formats zero total retention', () => {
      const result = computeSlots();

      expect(result.formattedTotalRetention).toBe('0 B');
    });
  });

  describe('slot aggregation', () => {
    test('aggregates slots from multiple nodes', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [createSlot({ nodeId: 'node1', slotName: 'slot1' })]);
      setSlots('node2', [createSlot({ nodeId: 'node2', slotName: 'slot2' })]);

      const result = computeSlots();

      expect(result.items.length).toBe(2);
      expect(result.count).toBe(2);
    });

    test('filters out orphaned slots (nodeId not in nodes Map)', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo([testNodes[0]!]); // Only node1
      setSlots('node1', [createSlot({ nodeId: 'node1', slotName: 'slot1' })]);
      setSlots('node2', [createSlot({ nodeId: 'node2', slotName: 'slot2' })]); // Orphaned

      const result = computeSlots();

      expect(result.items.length).toBe(1);
      expect(result.items[0]?.slotName).toBe('slot1');
    });

    test('enriches slots with node name', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [createSlot({ nodeId: 'node1', slotName: 'slot1' })]);

      const result = computeSlots();

      expect(result.items[0]?.nodeName).toBe('Primary');
    });

    test('generates unique id from nodeId:slotName', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [createSlot({ nodeId: 'node1', slotName: 'slot1' })]);

      const result = computeSlots();

      expect(result.items[0]?.id).toBe('node1:slot1');
    });
  });

  describe('sorting', () => {
    test('sorts by nodeName then slotName alphabetically', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node2', [
        createSlot({ nodeId: 'node2', slotName: 'zeta_slot' }),
        createSlot({ nodeId: 'node2', slotName: 'alpha_slot' }),
      ]);
      setSlots('node1', [
        createSlot({ nodeId: 'node1', slotName: 'gamma_slot' }),
      ]);

      const result = computeSlots();

      // Primary (node1) comes before Standby (node2)
      expect(result.items[0]?.nodeName).toBe('Primary');
      expect(result.items[0]?.slotName).toBe('gamma_slot');

      // Within Standby: alpha before zeta
      expect(result.items[1]?.nodeName).toBe('Standby');
      expect(result.items[1]?.slotName).toBe('alpha_slot');

      expect(result.items[2]?.nodeName).toBe('Standby');
      expect(result.items[2]?.slotName).toBe('zeta_slot');
    });
  });

  describe('stale handling', () => {
    test('marks slots from stale nodes as stale', () => {
      const { initializeNodesInfo, setSlots, markNodeStale } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [createSlot({ nodeId: 'node1', slotName: 'slot1' })]);
      markNodeStale('node1');

      const result = computeSlots();

      expect(result.items[0]?.isStale).toBe(true);
      expect(result.staleCount).toBe(1);
    });

    test('counts stale slots correctly', () => {
      const { initializeNodesInfo, setSlots, markNodeStale } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [createSlot({ nodeId: 'node1', slotName: 'slot1' })]);
      setSlots('node2', [
        createSlot({ nodeId: 'node2', slotName: 'slot2' }),
        createSlot({ nodeId: 'node2', slotName: 'slot3' }),
      ]);
      markNodeStale('node2');

      const result = computeSlots();

      expect(result.staleCount).toBe(2);
    });
  });

  describe('severity calculation', () => {
    test('calculates retention severity for each slot', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [
        createSlot({ slotName: 'healthy', retainedBytes: 100 }),
        createSlot({ slotName: 'warning', retainedBytes: DEFAULT_RETENTION_WARNING_BYTES }),
        createSlot({ slotName: 'critical', retainedBytes: DEFAULT_RETENTION_CRITICAL_BYTES }),
      ]);

      const result = computeSlots();

      const healthy = result.items.find((i) => i.slotName === 'healthy');
      const warning = result.items.find((i) => i.slotName === 'warning');
      const critical = result.items.find((i) => i.slotName === 'critical');

      expect(healthy?.retentionSeverity).toBe('healthy');
      expect(warning?.retentionSeverity).toBe('warning');
      expect(critical?.retentionSeverity).toBe('critical');
    });

    test('calculates WAL status severity', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [
        createSlot({ slotName: 'reserved', walStatus: 'reserved' }),
        createSlot({ slotName: 'extended', walStatus: 'extended' }),
        createSlot({ slotName: 'lost', walStatus: 'lost' }),
        createSlot({ slotName: 'none', walStatus: null }),
      ]);

      const result = computeSlots();

      const reserved = result.items.find((i) => i.slotName === 'reserved');
      const extended = result.items.find((i) => i.slotName === 'extended');
      const lost = result.items.find((i) => i.slotName === 'lost');
      const none = result.items.find((i) => i.slotName === 'none');

      expect(reserved?.walStatusSeverity).toBe('healthy');
      expect(extended?.walStatusSeverity).toBe('warning');
      expect(lost?.walStatusSeverity).toBe('critical');
      expect(none?.walStatusSeverity).toBe(null);
    });

    test('counts critical and warning slots', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [
        createSlot({ slotName: 'h1', retainedBytes: 100 }),
        createSlot({ slotName: 'w1', retainedBytes: DEFAULT_RETENTION_WARNING_BYTES }),
        createSlot({ slotName: 'w2', retainedBytes: DEFAULT_RETENTION_WARNING_BYTES + 1000 }),
        createSlot({ slotName: 'c1', retainedBytes: DEFAULT_RETENTION_CRITICAL_BYTES }),
      ]);

      const result = computeSlots();

      expect(result.warningCount).toBe(2);
      expect(result.criticalCount).toBe(1);
    });
  });

  describe('retention percent', () => {
    test('calculates retention percent relative to critical threshold', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [
        createSlot({ slotName: 'half', retainedBytes: DEFAULT_RETENTION_CRITICAL_BYTES / 2 }),
      ]);

      const result = computeSlots();

      expect(result.items[0]?.retentionPercent).toBe(50);
    });

    test('caps retention percent at 100', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [
        createSlot({ slotName: 'over', retainedBytes: DEFAULT_RETENTION_CRITICAL_BYTES * 2 }),
      ]);

      const result = computeSlots();

      expect(result.items[0]?.retentionPercent).toBe(100);
    });
  });

  describe('active/inactive counts', () => {
    test('counts active and inactive slots', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [
        createSlot({ slotName: 'active1', active: true }),
        createSlot({ slotName: 'active2', active: true }),
        createSlot({ slotName: 'inactive1', active: false }),
      ]);

      const result = computeSlots();

      expect(result.activeCount).toBe(2);
      expect(result.inactiveCount).toBe(1);
    });
  });

  describe('total retention', () => {
    test('sums total retained bytes', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [
        createSlot({ slotName: 'slot1', retainedBytes: 1000 }),
        createSlot({ slotName: 'slot2', retainedBytes: 2000 }),
      ]);
      setSlots('node2', [
        createSlot({ nodeId: 'node2', slotName: 'slot3', retainedBytes: 3000 }),
      ]);

      const result = computeSlots();

      expect(result.totalRetainedBytes).toBe(6000);
    });

    test('formats total retention', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [
        createSlot({ slotName: 'slot1', retainedBytes: 1024 * 1024 * 1024 }), // 1GB
        createSlot({ slotName: 'slot2', retainedBytes: 1024 * 1024 * 512 }), // 512MB
      ]);

      const result = computeSlots();

      expect(result.formattedTotalRetention).toBe('1.5 GB');
    });

    test('handles negative retained bytes by treating as zero', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [
        createSlot({ slotName: 'slot1', retainedBytes: -1000 }),
        createSlot({ slotName: 'slot2', retainedBytes: 2000 }),
      ]);

      const result = computeSlots();

      expect(result.totalRetainedBytes).toBe(2000);
    });
  });

  describe('selection', () => {
    test('marks selected slot', () => {
      const { initializeNodesInfo, setSlots, setSelection } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [
        createSlot({ slotName: 'slot1' }),
        createSlot({ slotName: 'slot2' }),
      ]);
      setSelection('slots', 'node1:slot2');

      const result = computeSlots();

      const slot1 = result.items.find((i) => i.slotName === 'slot1');
      const slot2 = result.items.find((i) => i.slotName === 'slot2');

      expect(slot1?.isSelected).toBe(false);
      expect(slot2?.isSelected).toBe(true);
    });

    test('returns selectedItem when a slot is selected', () => {
      const { initializeNodesInfo, setSlots, setSelection } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [
        createSlot({ slotName: 'slot1' }),
      ]);
      setSelection('slots', 'node1:slot1');

      const result = computeSlots();

      expect(result.selectedItem?.slotName).toBe('slot1');
    });

    test('returns null selectedItem when nothing selected', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [createSlot({ slotName: 'slot1' })]);

      const result = computeSlots();

      expect(result.selectedItem).toBe(null);
    });
  });

  describe('formatted retention', () => {
    test('includes formatted retention in each slot item', () => {
      const { initializeNodesInfo, setSlots } = useStore.getState();
      initializeNodesInfo(testNodes);
      setSlots('node1', [
        createSlot({ slotName: 'slot1', retainedBytes: 1024 * 1024 }), // 1MB
      ]);

      const result = computeSlots();

      expect(result.items[0]?.formattedRetention).toBe('1.0 MB');
    });
  });
});
