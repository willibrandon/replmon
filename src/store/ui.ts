/**
 * UI State Slice
 *
 * Manages UI state: focused panel, selections, modal state, and focus restoration.
 *
 * Feature: 005-state-management
 */

import type { StateCreator } from 'zustand';
import type {
  ReplmonStore,
  UISliceState,
  UISliceActions,
  Panel,
  ModalConfig,
} from './types.js';
import { PANEL_ORDER, DEFAULT_PANEL } from './types.js';

/**
 * UI slice type (state + actions).
 */
export type UISlice = UISliceState & UISliceActions;

/**
 * Creates the UI slice for the combined store.
 */
export const createUISlice: StateCreator<
  ReplmonStore,
  [['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  UISlice
> = (set, get) => ({
  // Initial state
  focusedPanel: DEFAULT_PANEL,
  previousFocusedPanel: null,
  activeModal: null,
  modalData: null,
  selections: new Map([
    ['topology', null],
    ['subscriptions', null],
    ['slots', null],
    ['conflicts', null],
    ['operations', null],
  ]),

  // Actions

  setFocusedPanel: (panel: Panel) => {
    // Validate panel is in the allowed list
    if (!PANEL_ORDER.includes(panel)) {
      return;
    }

    set(
      () => ({ focusedPanel: panel }),
      undefined,
      'ui/setFocusedPanel'
    );
  },

  focusNextPanel: () =>
    set(
      (state) => {
        const currentIndex = PANEL_ORDER.indexOf(state.focusedPanel);
        const nextIndex = (currentIndex + 1) % PANEL_ORDER.length;
        const nextPanel = PANEL_ORDER[nextIndex];
        return { focusedPanel: nextPanel ?? state.focusedPanel };
      },
      undefined,
      'ui/focusNextPanel'
    ),

  focusPreviousPanel: () =>
    set(
      (state) => {
        const currentIndex = PANEL_ORDER.indexOf(state.focusedPanel);
        const prevIndex =
          (currentIndex - 1 + PANEL_ORDER.length) % PANEL_ORDER.length;
        const prevPanel = PANEL_ORDER[prevIndex];
        return { focusedPanel: prevPanel ?? state.focusedPanel };
      },
      undefined,
      'ui/focusPreviousPanel'
    ),

  openModal: (config: ModalConfig) =>
    set(
      (state) => ({
        activeModal: config.type,
        modalData: config,
        previousFocusedPanel: state.focusedPanel,
      }),
      undefined,
      'ui/openModal'
    ),

  closeModal: () =>
    set(
      (state) => ({
        activeModal: null,
        modalData: null,
        focusedPanel: state.previousFocusedPanel ?? state.focusedPanel,
        previousFocusedPanel: null,
      }),
      undefined,
      'ui/closeModal'
    ),

  setSelection: (panel: Panel, itemId: string | null) =>
    set(
      (state) => {
        const selections = new Map(state.selections);
        selections.set(panel, itemId);
        return { selections };
      },
      undefined,
      'ui/setSelection'
    ),

  selectPrevious: () => {
    const state = get();
    const currentPanel = state.focusedPanel;
    const currentSelection = state.selections.get(currentPanel) ?? null;

    // Get list of selectable items for current panel
    const items = getSelectableItemsForPanel(state, currentPanel);
    if (items.length === 0) return;

    let newSelection: string | null;
    if (currentSelection === null) {
      // Select the last item if nothing selected
      newSelection = items[items.length - 1] ?? null;
    } else {
      const currentIndex = items.indexOf(currentSelection);
      if (currentIndex <= 0) {
        // Already at the top, stay there
        newSelection = items[0] ?? null;
      } else {
        newSelection = items[currentIndex - 1] ?? null;
      }
    }

    set(
      (state) => {
        const selections = new Map(state.selections);
        selections.set(currentPanel, newSelection);
        return { selections };
      },
      undefined,
      'ui/selectPrevious'
    );
  },

  selectNext: () => {
    const state = get();
    const currentPanel = state.focusedPanel;
    const currentSelection = state.selections.get(currentPanel) ?? null;

    // Get list of selectable items for current panel
    const items = getSelectableItemsForPanel(state, currentPanel);
    if (items.length === 0) return;

    let newSelection: string | null;
    if (currentSelection === null) {
      // Select the first item if nothing selected
      newSelection = items[0] ?? null;
    } else {
      const currentIndex = items.indexOf(currentSelection);
      if (currentIndex >= items.length - 1) {
        // Already at the bottom, stay there
        newSelection = items[items.length - 1] ?? null;
      } else {
        newSelection = items[currentIndex + 1] ?? null;
      }
    }

    set(
      (state) => {
        const selections = new Map(state.selections);
        selections.set(currentPanel, newSelection);
        return { selections };
      },
      undefined,
      'ui/selectNext'
    );
  },

  resetUIState: () =>
    set(
      () => ({
        focusedPanel: DEFAULT_PANEL,
        previousFocusedPanel: null,
        activeModal: null,
        modalData: null,
        selections: new Map([
          ['topology', null],
          ['subscriptions', null],
          ['slots', null],
          ['conflicts', null],
          ['operations', null],
        ]),
      }),
      undefined,
      'ui/resetUIState'
    ),
});

/**
 * Helper to get selectable items for a given panel.
 * Uses state data to determine what's selectable.
 */
function getSelectableItemsForPanel(state: ReplmonStore, panel: Panel): string[] {
  switch (panel) {
    case 'topology':
      return Array.from(state.nodes.keys());

    case 'subscriptions': {
      const allSubs: string[] = [];
      for (const subs of state.subscriptions.values()) {
        for (const sub of subs) {
          allSubs.push(`${sub.nodeId}:${sub.subscriptionName}`);
        }
      }
      return allSubs;
    }

    case 'slots': {
      const allSlots: string[] = [];
      for (const slots of state.slots.values()) {
        for (const slot of slots) {
          allSlots.push(`${slot.nodeId}:${slot.slotName}`);
        }
      }
      return allSlots;
    }

    case 'conflicts': {
      const allConflicts: string[] = [];
      for (const events of state.conflictEvents.values()) {
        for (const event of events) {
          allConflicts.push(event.id);
        }
      }
      return allConflicts;
    }

    case 'operations':
      // Operations panel doesn't have selectable items in the same way
      return [];

    default:
      return [];
  }
}
