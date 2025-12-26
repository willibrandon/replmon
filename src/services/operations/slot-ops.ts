/**
 * Slot Operations Service
 *
 * Implements create and drop operations for replication slots.
 * Works with both pglogical and native PostgreSQL replication.
 *
 * Feature: 013-operations-modal
 */

import type {
  SlotOperationParams,
  CreateSlotParams,
  QueryFn,
  OperationContext,
  OperationResult,
} from '../../types/operations.js';
import { createSuccessResult, createFailureResult } from './utils.js';

// =============================================================================
// Create Slot
// =============================================================================

/**
 * Create a new replication slot.
 *
 * For logical slots: Uses pg_create_logical_replication_slot()
 * For physical slots: Uses pg_create_physical_replication_slot()
 */
export async function createSlot(
  params: CreateSlotParams,
  queryFn: QueryFn
): Promise<OperationResult> {
  const { nodeId, slotName, slotType, outputPlugin = 'pgoutput' } = params;
  const startTime = Date.now();

  const context: OperationContext = {
    nodeId,
    nodeName: nodeId,
    resourceId: slotName,
    resourceName: slotName,
    additionalParams: { slotType, outputPlugin },
  };

  try {
    if (slotType === 'logical') {
      await queryFn(
        nodeId,
        `SELECT pg_create_logical_replication_slot($1, $2)`,
        [slotName, outputPlugin]
      );
    } else {
      await queryFn(
        nodeId,
        `SELECT pg_create_physical_replication_slot($1)`,
        [slotName]
      );
    }

    return createSuccessResult(
      'create-slot',
      context,
      `${slotType.charAt(0).toUpperCase() + slotType.slice(1)} slot "${slotName}" created successfully`,
      Date.now() - startTime
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return createFailureResult(
      'create-slot',
      context,
      errorMessage,
      Date.now() - startTime
    );
  }
}

// =============================================================================
// Drop Slot
// =============================================================================

/**
 * Drop a replication slot.
 *
 * First checks if the slot is active, then drops it.
 */
export async function dropSlot(
  params: SlotOperationParams,
  queryFn: QueryFn
): Promise<OperationResult> {
  const { nodeId, slotName } = params;
  const startTime = Date.now();

  const context: OperationContext = {
    nodeId,
    nodeName: nodeId,
    resourceId: slotName,
    resourceName: slotName,
  };

  try {
    // Check if slot is active
    const activeCheck = await queryFn<{ active: boolean }>(
      nodeId,
      `SELECT active FROM pg_replication_slots WHERE slot_name = $1`,
      [slotName]
    );

    if (activeCheck.length > 0 && activeCheck[0]?.active) {
      return createFailureResult(
        'drop-slot',
        context,
        `Replication slot "${slotName}" is active`,
        Date.now() - startTime
      );
    }

    // Drop the slot
    await queryFn(
      nodeId,
      `SELECT pg_drop_replication_slot($1)`,
      [slotName]
    );

    return createSuccessResult(
      'drop-slot',
      context,
      `Replication slot "${slotName}" dropped successfully`,
      Date.now() - startTime
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return createFailureResult(
      'drop-slot',
      context,
      errorMessage,
      Date.now() - startTime
    );
  }
}

// =============================================================================
// Check Slot Active Status
// =============================================================================

/**
 * Check if a slot is currently active (has an active connection).
 */
export async function isSlotActive(
  nodeId: string,
  slotName: string,
  queryFn: QueryFn
): Promise<boolean> {
  try {
    const result = await queryFn<{ active: boolean }>(
      nodeId,
      `SELECT active FROM pg_replication_slots WHERE slot_name = $1`,
      [slotName]
    );
    return result[0]?.active ?? false;
  } catch {
    return false;
  }
}
