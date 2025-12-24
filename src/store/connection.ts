import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { HealthStatus, PoolStats } from '../services/connection-manager/types.js';

/**
 * Connection status for a single node.
 */
export type NodeConnectionStatus = 'connecting' | 'connected' | 'failed';

/**
 * Application screen state.
 */
export type AppScreen = 'connection-status' | 'dashboard';

/**
 * Zustand store state for connection management.
 */
export interface ConnectionStoreState {
  /** Current screen being displayed */
  currentScreen: AppScreen;

  /** Per-node connection status */
  nodeStatus: Map<string, NodeConnectionStatus>;

  /** Per-node connection error messages */
  connectionErrors: Map<string, string>;

  /** Whether pglogical mode is enabled */
  pglogicalMode: boolean;

  /** Per-node health status from ConnectionManager */
  healthStatus: Map<string, HealthStatus>;

  /** Per-node pool statistics from ConnectionManager */
  poolStats: Map<string, PoolStats>;
}

/**
 * Zustand store actions.
 */
export interface ConnectionStoreActions {
  /** Update status for a specific node */
  setNodeStatus: (nodeId: string, status: NodeConnectionStatus) => void;

  /** Set error message for a specific node */
  setConnectionError: (nodeId: string, error: string) => void;

  /** Clear error for a specific node */
  clearConnectionError: (nodeId: string) => void;

  /** Transition to a different screen */
  setCurrentScreen: (screen: AppScreen) => void;

  /** Set pglogical mode */
  setPglogicalMode: (enabled: boolean) => void;

  /** Reset all connection states (for retry) */
  resetConnectionStates: () => void;

  /** Initialize node statuses */
  initializeNodes: (nodeIds: string[]) => void;

  /** Update health status for a specific node */
  setHealth: (nodeId: string, status: HealthStatus) => void;

  /** Update pool stats for a specific node */
  setPoolStats: (nodeId: string, stats: PoolStats) => void;

  /** Clear health status for a specific node */
  clearHealth: (nodeId: string) => void;

  /** Clear pool stats for a specific node */
  clearPoolStats: (nodeId: string) => void;
}

export type ConnectionStore = ConnectionStoreState & ConnectionStoreActions;

/**
 * Connection store with subscribeWithSelector middleware for fine-grained subscriptions.
 */
export const useConnectionStore = create<ConnectionStore>()(
  subscribeWithSelector((set) => ({
    currentScreen: 'connection-status',
    nodeStatus: new Map(),
    connectionErrors: new Map(),
    pglogicalMode: false,
    healthStatus: new Map(),
    poolStats: new Map(),

    setNodeStatus: (nodeId, status) =>
      set((state) => {
        const nodeStatus = new Map(state.nodeStatus);
        nodeStatus.set(nodeId, status);
        return { nodeStatus };
      }),

    setConnectionError: (nodeId, error) =>
      set((state) => {
        const connectionErrors = new Map(state.connectionErrors);
        connectionErrors.set(nodeId, error);
        return { connectionErrors };
      }),

    clearConnectionError: (nodeId) =>
      set((state) => {
        const connectionErrors = new Map(state.connectionErrors);
        connectionErrors.delete(nodeId);
        return { connectionErrors };
      }),

    setCurrentScreen: (screen) => set({ currentScreen: screen }),

    setPglogicalMode: (enabled) => set({ pglogicalMode: enabled }),

    resetConnectionStates: () =>
      set((state) => {
        const nodeStatus = new Map(state.nodeStatus);
        for (const nodeId of nodeStatus.keys()) {
          nodeStatus.set(nodeId, 'connecting');
        }
        return {
          nodeStatus,
          connectionErrors: new Map(),
        };
      }),

    initializeNodes: (nodeIds) =>
      set(() => {
        const nodeStatus = new Map<string, NodeConnectionStatus>();
        for (const nodeId of nodeIds) {
          nodeStatus.set(nodeId, 'connecting');
        }
        return { nodeStatus };
      }),

    setHealth: (nodeId, status) =>
      set((state) => {
        const healthStatus = new Map(state.healthStatus);
        healthStatus.set(nodeId, status);
        return { healthStatus };
      }),

    setPoolStats: (nodeId, stats) =>
      set((state) => {
        const poolStats = new Map(state.poolStats);
        poolStats.set(nodeId, stats);
        return { poolStats };
      }),

    clearHealth: (nodeId) =>
      set((state) => {
        const healthStatus = new Map(state.healthStatus);
        healthStatus.delete(nodeId);
        return { healthStatus };
      }),

    clearPoolStats: (nodeId) =>
      set((state) => {
        const poolStats = new Map(state.poolStats);
        poolStats.delete(nodeId);
        return { poolStats };
      }),
  }))
);
