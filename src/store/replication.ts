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
  ConflictEvent,
  ConflictEventSource,
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
  conflictEvents: new Map(),
  conflictSources: new Map(),
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

  setConflictEvents: (nodeId: string, events: ConflictEvent[]) =>
    set(
      (state) => {
        const conflictEvents = new Map(state.conflictEvents);
        conflictEvents.set(nodeId, events);
        return { conflictEvents };
      },
      undefined,
      'replication/setConflictEvents'
    ),

  setConflictSource: (nodeId: string, source: ConflictEventSource) =>
    set(
      (state) => {
        const conflictSources = new Map(state.conflictSources);
        conflictSources.set(nodeId, source);
        return { conflictSources };
      },
      undefined,
      'replication/setConflictSource'
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

        // Process slots first (needed for lag calculation)
        for (const nodeData of result.slots) {
          if (nodeData.success && nodeData.data) {
            slots.set(nodeData.nodeId, nodeData.data);
            staleNodes.delete(nodeData.nodeId);
            lastUpdated.set(nodeData.nodeId, result.completedAt);
          }
        }

        // Build a lookup map of all slots across all nodes for lag matching
        // Key: slotName, Value: { nodeId, pendingBytes }
        // pendingBytes = current_wal - confirmed_flush_lsn (actual pending changes)
        const allSlots = new Map<string, { nodeId: string; pendingBytes: number }>();
        for (const [nodeId, nodeSlots] of slots) {
          for (const slot of nodeSlots) {
            allSlots.set(slot.slotName, {
              nodeId,
              pendingBytes: slot.pendingBytes,
            });
          }
        }

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

              // Try to find lag data from the associated slot
              // The slot may be on a different node (the provider)
              // Use pendingBytes (current - confirmed_flush_lsn) for actual replication lag
              let lagBytes = 0;
              if (sub.slotName) {
                const slotInfo = allSlots.get(sub.slotName);
                if (slotInfo) {
                  lagBytes = slotInfo.pendingBytes;
                }
              }

              const sample: LagSample = {
                timestamp: sub.timestamp,
                lagBytes,
                lagSeconds: null, // Logical replication doesn't provide time-based lag directly
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

        // Process conflicts (aggregate stats)
        for (const nodeData of result.conflicts) {
          if (nodeData.success && nodeData.data) {
            conflicts.set(nodeData.nodeId, nodeData.data);
            staleNodes.delete(nodeData.nodeId);
            lastUpdated.set(nodeData.nodeId, result.completedAt);
          }
        }

        // Process conflict events (individual records from pglogical)
        const conflictEvents = new Map(state.conflictEvents);
        const conflictSources = new Map(state.conflictSources);
        for (const nodeData of result.conflictEvents) {
          if (nodeData.success && nodeData.data) {
            // Convert ConflictEventRecord[] to ConflictEvent[]
            const events: ConflictEvent[] = nodeData.data.events.map((record) => ({
              id: record.id,
              nodeId: record.nodeId,
              recordedAt: record.recordedAt,
              subscriptionName: record.subscriptionName,
              conflictType: record.conflictType as ConflictEvent['conflictType'],
              resolution: record.resolution as ConflictEvent['resolution'],
              schemaName: record.schemaName,
              tableName: record.tableName,
              indexName: record.indexName,
              localTuple: record.localTuple,
              remoteTuple: record.remoteTuple,
              localCommitTs: record.localCommitTs,
              remoteCommitTs: record.remoteCommitTs,
              remoteLsn: record.remoteLsn,
              source: record.source,
            }));
            conflictEvents.set(nodeData.nodeId, events);
            conflictSources.set(nodeData.nodeId, nodeData.data.source);
            staleNodes.delete(nodeData.nodeId);
            lastUpdated.set(nodeData.nodeId, result.completedAt);
          }
        }

        // Process replication stats for physical replication lag
        // This updates lag for subscriptions where we have streaming replication stats
        for (const nodeData of result.stats) {
          if (nodeData.success && nodeData.data) {
            lastUpdated.set(nodeData.nodeId, result.completedAt);

            // Update lag samples with actual lag data from stats
            // pg_stat_replication shows standbys connected TO this node
            for (const stat of nodeData.data) {
              // For physical replication, the applicationName might match a slot
              // Find subscriptions across ALL nodes that reference this slot
              for (const [subNodeId, nodeSubs] of subscriptions) {
                const matchingSub = nodeSubs.find(
                  (s) => s.slotName === stat.applicationName
                );

                if (matchingSub) {
                  const key = `${subNodeId}:${matchingSub.subscriptionName}`;
                  const history = lagHistory.get(key) ?? [];
                  const lastSample = history[history.length - 1];
                  if (history.length > 0 && lastSample !== undefined) {
                    // Update with stats data (has lagSeconds for physical replication)
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
        }

        return {
          subscriptions,
          slots,
          conflicts,
          conflictEvents,
          conflictSources,
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
        conflictEvents: new Map(),
        conflictSources: new Map(),
        lagHistory: new Map(),
        staleNodes: new Set(),
        lastUpdated: new Map(),
      }),
      undefined,
      'replication/clearReplicationData'
    ),
});
