/**
 * Combined Zustand Store
 *
 * Merges connection, replication, and UI slices with devtools middleware.
 *
 * Feature: 005-state-management
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {} from '@redux-devtools/extension'; // Required for TypeScript typing

import type {
  ReplmonStore,
  NodeConnectionStatus,
  AppScreen,
  HealthStatus,
  PoolStats,
} from './types.js';
import { createReplicationSlice } from './replication.js';
import { createUISlice } from './ui.js';
import { createOperationsSlice } from './operations.js';

// Re-export types for convenience
export * from './types.js';

/**
 * Combined store with all slices and middleware.
 *
 * Middleware order:
 * 1. devtools (outer) - captures all state mutations for debugging
 * 2. subscribeWithSelector (inner) - enables fine-grained subscriptions
 */
export const useStore = create<ReplmonStore>()(
  devtools(
    subscribeWithSelector((set, get, api) => ({
      // === Connection Slice State ===
      currentScreen: 'connection-status' as AppScreen,
      nodeStatus: new Map<string, NodeConnectionStatus>(),
      connectionErrors: new Map<string, string>(),
      pglogicalMode: false,
      healthStatus: new Map<string, HealthStatus>(),
      poolStats: new Map<string, PoolStats>(),

      // === Connection Slice Actions ===
      setNodeStatus: (nodeId: string, status: NodeConnectionStatus) =>
        set(
          (state) => {
            const nodeStatus = new Map(state.nodeStatus);
            nodeStatus.set(nodeId, status);
            return { nodeStatus };
          },
          undefined,
          'connection/setNodeStatus'
        ),

      setConnectionError: (nodeId: string, error: string) =>
        set(
          (state) => {
            const connectionErrors = new Map(state.connectionErrors);
            connectionErrors.set(nodeId, error);
            return { connectionErrors };
          },
          undefined,
          'connection/setConnectionError'
        ),

      clearConnectionError: (nodeId: string) =>
        set(
          (state) => {
            const connectionErrors = new Map(state.connectionErrors);
            connectionErrors.delete(nodeId);
            return { connectionErrors };
          },
          undefined,
          'connection/clearConnectionError'
        ),

      setCurrentScreen: (screen: AppScreen) =>
        set({ currentScreen: screen }, undefined, 'connection/setCurrentScreen'),

      setPglogicalMode: (enabled: boolean) =>
        set({ pglogicalMode: enabled }, undefined, 'connection/setPglogicalMode'),

      resetConnectionStates: () =>
        set(
          (state) => {
            const nodeStatus = new Map(state.nodeStatus);
            for (const nodeId of nodeStatus.keys()) {
              nodeStatus.set(nodeId, 'connecting');
            }
            return {
              nodeStatus,
              connectionErrors: new Map(),
            };
          },
          undefined,
          'connection/resetConnectionStates'
        ),

      initializeNodes: (nodeIds: string[]) =>
        set(
          () => {
            const nodeStatus = new Map<string, NodeConnectionStatus>();
            for (const nodeId of nodeIds) {
              nodeStatus.set(nodeId, 'connecting');
            }
            return { nodeStatus };
          },
          undefined,
          'connection/initializeNodes'
        ),

      setHealth: (nodeId: string, status: HealthStatus) =>
        set(
          (state) => {
            const healthStatus = new Map(state.healthStatus);
            healthStatus.set(nodeId, status);
            return { healthStatus };
          },
          undefined,
          'connection/setHealth'
        ),

      setPoolStats: (nodeId: string, stats: PoolStats) =>
        set(
          (state) => {
            const poolStats = new Map(state.poolStats);
            poolStats.set(nodeId, stats);
            return { poolStats };
          },
          undefined,
          'connection/setPoolStats'
        ),

      clearHealth: (nodeId: string) =>
        set(
          (state) => {
            const healthStatus = new Map(state.healthStatus);
            healthStatus.delete(nodeId);
            return { healthStatus };
          },
          undefined,
          'connection/clearHealth'
        ),

      clearPoolStats: (nodeId: string) =>
        set(
          (state) => {
            const poolStats = new Map(state.poolStats);
            poolStats.delete(nodeId);
            return { poolStats };
          },
          undefined,
          'connection/clearPoolStats'
        ),

      // === Replication Slice ===
      ...createReplicationSlice(set, get, api),

      // === UI Slice ===
      ...createUISlice(set, get, api),

      // === Operations Slice ===
      ...createOperationsSlice(set, get, api),
    })),
    {
      name: 'replmon-store',
      enabled: process.env.NODE_ENV !== 'production',
    }
  )
);

// Legacy export for backward compatibility with existing code
export { useStore as useConnectionStore };
