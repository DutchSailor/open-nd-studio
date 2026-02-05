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
  zoomToSelection: () => void;
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

import type { Shape } from '../../types/geometry';
import { getShapeBounds } from './types';

// Type for the full store that this slice needs access to
interface StoreWithModel {
  shapes: Shape[];
  selectedShapeIds: string[];
}

type FullStore = ViewState & StoreWithModel;

export const createViewSlice = (
  set: (fn: (state: FullStore) => void) => void,
  get: () => FullStore
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

  zoomToFit: () => {
    const store = get();
    const allShapes = store.shapes;

    // If no shapes, reset to default view
    if (allShapes.length === 0) {
      set((state) => {
        state.viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
      });
      return;
    }

    // Calculate bounding box of all shapes
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const shape of allShapes) {
      const bounds = getShapeBounds(shape);
      if (bounds) {
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
      }
    }

    if (minX === Infinity) {
      set((state) => {
        state.viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
      });
      return;
    }

    // Add padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    set((state) => {
      // Calculate zoom to fit bounds in canvas
      const zoomX = state.canvasSize.width / boundsWidth;
      const zoomY = state.canvasSize.height / boundsHeight;
      const zoom = Math.min(zoomX, zoomY, 10); // Cap at 10x zoom

      // Calculate offset to center all shapes
      state.viewport = {
        zoom,
        offsetX: state.canvasSize.width / 2 - centerX * zoom,
        offsetY: state.canvasSize.height / 2 - centerY * zoom,
      };
    });
  },

  zoomToSelection: () => {
    const store = get();
    if (store.selectedShapeIds.length === 0) return;

    // Get bounding box of selected shapes
    const selectedShapes = store.shapes.filter(s => store.selectedShapeIds.includes(s.id));
    if (selectedShapes.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const shape of selectedShapes) {
      const bounds = getShapeBounds(shape);
      if (bounds) {
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
      }
    }

    if (minX === Infinity) return;

    // Add padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    set((state) => {
      // Calculate zoom to fit bounds in canvas
      const zoomX = state.canvasSize.width / boundsWidth;
      const zoomY = state.canvasSize.height / boundsHeight;
      const zoom = Math.min(zoomX, zoomY, 10); // Cap at 10x zoom

      // Calculate offset to center the selection
      state.viewport = {
        zoom,
        offsetX: state.canvasSize.width / 2 - centerX * zoom,
        offsetY: state.canvasSize.height / 2 - centerY * zoom,
      };
    });
  },

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
