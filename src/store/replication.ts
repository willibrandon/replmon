/**
 * Replication Data Slice
 *
 * Manages replication data state: nodes, subscriptions, slots, conflicts,
 * lag history, and stale data tracking.
 *
 * Feature: 005-state-management
 */

import type { StateCreator } from 'zustand';
import type {
  ReplmonStore,
  ReplicationSliceState,
  ReplicationSliceActions,
  NodeInfo,
  LagSample,
  SubscriptionData,
  SlotData,
  ConflictData,
  PollingCycleResult,
} from './types.js';
import { MAX_LAG_HISTORY_SAMPLES } from './types.js';

/**
 * Replication slice type (state + actions).
 */
export type ReplicationSlice = ReplicationSliceState & ReplicationSliceActions;

/**
 * Creates the replication slice for the combined store.
 */
export const createReplicationSlice: StateCreator<
  ReplmonStore,
  [['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  ReplicationSlice
> = (set, _get) => ({
  // Initial state
  nodes: new Map(),
  subscriptions: new Map(),
  slots: new Map(),
  conflicts: new Map(),
  lagHistory: new Map(),
  staleNodes: new Set(),
  lastUpdated: new Map(),

  // Actions

  initializeNodesInfo: (nodes: NodeInfo[]) =>
    set(
      () => {
        const nodesMap = new Map<string, NodeInfo>();
        for (const node of nodes) {
          nodesMap.set(node.id, node);
        }
        return { nodes: nodesMap };
      },
      undefined,
      'replication/initializeNodesInfo'
    ),

  setSubscriptions: (nodeId: string, data: SubscriptionData[]) =>
    set(
      (state) => {
        const subscriptions = new Map(state.subscriptions);
        subscriptions.set(nodeId, data);
        return { subscriptions };
      },
      undefined,
      'replication/setSubscriptions'
    ),

  setSlots: (nodeId: string, data: SlotData[]) =>
    set(
      (state) => {
        const slots = new Map(state.slots);
        slots.set(nodeId, data);
        return { slots };
      },
      undefined,
      'replication/setSlots'
    ),

  setConflicts: (nodeId: string, data: ConflictData[]) =>
    set(
      (state) => {
        const conflicts = new Map(state.conflicts);
        conflicts.set(nodeId, data);
        return { conflicts };
      },
      undefined,
      'replication/setConflicts'
    ),

  appendLagSample: (
    nodeId: string,
    subscriptionName: string,
    sample: LagSample
  ) =>
    set(
      (state) => {
        const key = `${nodeId}:${subscriptionName}`;
        const lagHistory = new Map(state.lagHistory);
        const history = lagHistory.get(key) ?? [];

        // Append new sample with FIFO eviction
        const updated = [...history, sample];
        lagHistory.set(
          key,
          updated.length > MAX_LAG_HISTORY_SAMPLES
            ? updated.slice(-MAX_LAG_HISTORY_SAMPLES)
            : updated
        );

        return { lagHistory };
      },
      undefined,
      'replication/appendLagSample'
    ),

  markNodeStale: (nodeId: string) =>
    set(
      (state) => {
        const staleNodes = new Set(state.staleNodes);
        staleNodes.add(nodeId);
        return { staleNodes };
      },
      undefined,
      'replication/markNodeStale'
    ),

  clearNodeStale: (nodeId: string) =>
    set(
      (state) => {
        const staleNodes = new Set(state.staleNodes);
        staleNodes.delete(nodeId);
        return { staleNodes };
      },
      undefined,
      'replication/clearNodeStale'
    ),

  setLastUpdated: (nodeId: string, timestamp: Date) =>
    set(
      (state) => {
        const lastUpdated = new Map(state.lastUpdated);
        lastUpdated.set(nodeId, timestamp);
        return { lastUpdated };
      },
      undefined,
      'replication/setLastUpdated'
    ),

  setNodePglogical: (nodeId: string, hasPglogical: boolean) =>
    set(
      (state) => {
        const node = state.nodes.get(nodeId);
        if (!node) return {};

        const nodes = new Map(state.nodes);
        nodes.set(nodeId, { ...node, hasPglogical });
        return { nodes };
      },
      undefined,
      'replication/setNodePglogical'
    ),

  handlePollingData: (result: PollingCycleResult) =>
    set(
      (state) => {
        const subscriptions = new Map(state.subscriptions);
        const slots = new Map(state.slots);
        const conflicts = new Map(state.conflicts);
        const lagHistory = new Map(state.lagHistory);
        const staleNodes = new Set(state.staleNodes);
        const lastUpdated = new Map(state.lastUpdated);
        const nodes = new Map(state.nodes);

        // Process subscriptions
        for (const nodeData of result.subscriptions) {
          if (nodeData.success && nodeData.data) {
            subscriptions.set(nodeData.nodeId, nodeData.data);
            staleNodes.delete(nodeData.nodeId);
            lastUpdated.set(nodeData.nodeId, result.completedAt);

            // Append lag samples for each subscription
            for (const sub of nodeData.data) {
              const key = `${nodeData.nodeId}:${sub.subscriptionName}`;
              const history = lagHistory.get(key) ?? [];
              const sample: LagSample = {
                timestamp: sub.timestamp,
                lagBytes: 0, // Will be computed from stats if available
                lagSeconds: null,
              };
              const updated = [...history, sample];
              lagHistory.set(
                key,
                updated.length > MAX_LAG_HISTORY_SAMPLES
                  ? updated.slice(-MAX_LAG_HISTORY_SAMPLES)
                  : updated
              );
            }

            // Update pglogical detection
            const existingNode = nodes.get(nodeData.nodeId);
            if (existingNode && existingNode.hasPglogical !== nodeData.hasPglogical) {
              nodes.set(nodeData.nodeId, {
                ...existingNode,
                hasPglogical: nodeData.hasPglogical,
              });
            }
          }
        }

        // Process slots
        for (const nodeData of result.slots) {
          if (nodeData.success && nodeData.data) {
            slots.set(nodeData.nodeId, nodeData.data);
            staleNodes.delete(nodeData.nodeId);
            lastUpdated.set(nodeData.nodeId, result.completedAt);
          }
        }

        // Process conflicts
        for (const nodeData of result.conflicts) {
          if (nodeData.success && nodeData.data) {
            conflicts.set(nodeData.nodeId, nodeData.data);
            staleNodes.delete(nodeData.nodeId);
            lastUpdated.set(nodeData.nodeId, result.completedAt);
          }
        }

        // Process replication stats for lag data
        for (const nodeData of result.stats) {
          if (nodeData.success && nodeData.data) {
            lastUpdated.set(nodeData.nodeId, result.completedAt);

            // Update lag samples with actual lag data from stats
            for (const stat of nodeData.data) {
              // Try to match stats to subscriptions by application name
              const nodeSubs = subscriptions.get(nodeData.nodeId) ?? [];
              const matchingSub = nodeSubs.find(
                (s) => s.slotName === stat.applicationName
              );

              if (matchingSub) {
                const key = `${nodeData.nodeId}:${matchingSub.subscriptionName}`;
                const history = lagHistory.get(key) ?? [];
                const lastSample = history[history.length - 1];
                if (history.length > 0 && lastSample !== undefined) {
                  // Update the most recent sample with actual lag data
                  history[history.length - 1] = {
                    timestamp: lastSample.timestamp,
                    lagBytes: stat.lagBytes,
                    lagSeconds: stat.lagSeconds,
                  };
                  lagHistory.set(key, history);
                }
              }
            }
          }
        }

        return {
          subscriptions,
          slots,
          conflicts,
          lagHistory,
          staleNodes,
          lastUpdated,
          nodes,
        };
      },
      undefined,
      'replication/handlePollingData'
    ),

  clearReplicationData: () =>
    set(
      () => ({
        nodes: new Map(),
        subscriptions: new Map(),
        slots: new Map(),
        conflicts: new Map(),
        lagHistory: new Map(),
        staleNodes: new Set(),
        lastUpdated: new Map(),
      }),
      undefined,
      'replication/clearReplicationData'
    ),
});
