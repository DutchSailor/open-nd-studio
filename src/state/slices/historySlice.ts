/**
 * History Slice - Manages undo/redo functionality
 */

import type { Shape } from './types';
import { cloneShapes } from './types';

// ============================================================================
// State Interface
// ============================================================================

export interface HistoryState {
  historyStack: Shape[][];  // Stack of shape snapshots
  historyIndex: number;     // Current position in history (-1 means at latest)
  maxHistorySize: number;   // Maximum number of history entries
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface HistoryActions {
  undo: () => boolean;  // Returns true if undo was performed
  redo: () => boolean;  // Returns true if redo was performed
  pushHistory: () => void;  // Save current state to history
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export type HistorySlice = HistoryState & HistoryActions;

// ============================================================================
// Initial State
// ============================================================================

export const initialHistoryState: HistoryState = {
  historyStack: [],
  historyIndex: -1,
  maxHistorySize: 50,
};

// ============================================================================
// Slice Creator
// ============================================================================

// Type for the full store that this slice needs access to
interface StoreWithShapes {
  shapes: Shape[];
  selectedShapeIds: string[];
}

type FullStore = HistoryState & StoreWithShapes;

export const createHistorySlice = (
  set: (fn: (state: FullStore) => void) => void,
  get: () => FullStore
): HistoryActions => ({
  pushHistory: () =>
    set((state) => {
      // Clone current shapes
      const snapshot = cloneShapes(state.shapes);

      // If we're not at the end of history, truncate future states
      if (state.historyIndex >= 0 && state.historyIndex < state.historyStack.length - 1) {
        state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
      }

      // Add new snapshot
      state.historyStack.push(snapshot);

      // Trim history if it exceeds max size
      if (state.historyStack.length > state.maxHistorySize) {
        state.historyStack.shift();
      }

      // Update index to point to latest
      state.historyIndex = state.historyStack.length - 1;
    }),

  undo: () => {
    let success = false;

    set((state) => {
      // If no history, can't undo
      if (state.historyStack.length === 0) return;

      // If this is the first undo (we're at the latest state), save current state first
      if (state.historyIndex === state.historyStack.length - 1) {
        // Save current state so we can redo back to it
        const currentSnapshot = cloneShapes(state.shapes);
        state.historyStack.push(currentSnapshot);
        // historyIndex now points to the saved "current" state
        state.historyIndex = state.historyStack.length - 1;
      }

      // Calculate new index
      const newIndex = state.historyIndex - 1;
      if (newIndex < 0) return;

      // Restore the previous state
      state.shapes = cloneShapes(state.historyStack[newIndex]);
      state.historyIndex = newIndex;
      state.selectedShapeIds = []; // Clear selection on undo
      success = true;
    });

    return success;
  },

  redo: () => {
    let success = false;

    set((state) => {
      // If no history or at the end, can't redo
      if (state.historyStack.length === 0) return;

      const newIndex = state.historyIndex + 1;
      if (newIndex >= state.historyStack.length) return;

      // Restore the next state
      state.shapes = cloneShapes(state.historyStack[newIndex]);
      state.historyIndex = newIndex;
      state.selectedShapeIds = []; // Clear selection on redo
      success = true;
    });

    return success;
  },

  canUndo: () => {
    const state = get();
    return state.historyStack.length > 0 && state.historyIndex > 0;
  },

  canRedo: () => {
    const state = get();
    return state.historyStack.length > 0 && state.historyIndex < state.historyStack.length - 1;
  },
});
