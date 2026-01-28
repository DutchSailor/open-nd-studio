/**
 * View Slice - Manages viewport, zoom, pan, and canvas state
 */

import type { Viewport, Point } from './types';

// ============================================================================
// State Interface
// ============================================================================

export interface ViewState {
  viewport: Viewport;
  canvasSize: { width: number; height: number };
  mousePosition: Point;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface ViewActions {
  setViewport: (viewport: Partial<Viewport>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  resetView: () => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  setMousePosition: (point: Point) => void;
}

export type ViewSlice = ViewState & ViewActions;

// ============================================================================
// Initial State
// ============================================================================

export const initialViewState: ViewState = {
  viewport: { offsetX: 0, offsetY: 0, zoom: 1 },
  canvasSize: { width: 800, height: 600 },
  mousePosition: { x: 0, y: 0 },
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createViewSlice = (
  set: (fn: (state: ViewState) => void) => void,
  _get: () => ViewState
): ViewActions => ({
  setViewport: (viewport) =>
    set((state) => {
      state.viewport = { ...state.viewport, ...viewport };
    }),

  zoomIn: () =>
    set((state) => {
      state.viewport.zoom = Math.min(state.viewport.zoom * 1.2, 100);
    }),

  zoomOut: () =>
    set((state) => {
      state.viewport.zoom = Math.max(state.viewport.zoom / 1.2, 0.01);
    }),

  zoomToFit: () =>
    set((state) => {
      // TODO: Calculate bounding box of all shapes and fit viewport
      state.viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
    }),

  resetView: () =>
    set((state) => {
      state.viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
    }),

  setCanvasSize: (size) =>
    set((state) => {
      state.canvasSize = size;
    }),

  setMousePosition: (point) =>
    set((state) => {
      state.mousePosition = point;
    }),
});
