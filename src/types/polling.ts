/**
 * Polling Service Type Re-exports
 *
 * Convenience re-exports for polling service types.
 * Import from here for consistent access to polling types.
 *
 * Feature: 004-polling-service
 */

export type {
  // Configuration
  PollingConfig,
  ResolvedPollingConfig,
  // Enums
  ReplicationState,
  SyncState,
  SlotType,
  WalStatus,
  SubscriptionStatus,
  SubscriptionSource,
  ConflictSource,
  // Data types
  ReplicationStats,
  SlotData,
  SubscriptionData,
  ConflictData,
  NodeData,
  PollingCycleResult,
  PollingError,
  // Events
  PollingEvents,
  // Query module interface
  QueryFn,
  QueryModule,
  // pglogical detection
  PglogicalDetectionResult,
} from '../services/polling/types.js';
