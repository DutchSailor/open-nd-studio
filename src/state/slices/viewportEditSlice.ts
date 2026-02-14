/**
 * Viewport Edit Slice - Manages sheet viewport editing state
 * (viewport manipulation on sheets)
 *
 * Includes:
 * - Viewport selection and manipulation
 * - Crop region editing
 * - Layer override management
 */

import type {
  ViewportEditState,
  ViewportHandleType,
  Point,
  Sheet,
  CropRegionEditState,
  CropRegionHandleType,
  CropRegion,
  LayerOverrideEditState,
  ViewportLayerOverride,
} from './types';
import { PAPER_SIZES } from './types';

// ============================================================================
// State Interface
// ============================================================================

export interface ViewportEditState_Full {
  viewportEditState: ViewportEditState;
  cropRegionEditState: CropRegionEditState;
  layerOverrideEditState: LayerOverrideEditState;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface ViewportEditActions {
  // Viewport selection and manipulation
  selectViewport: (viewportId: string | null) => void;
  startViewportDrag: (handle: ViewportHandleType, sheetPos: Point) => void;
  updateViewportDrag: (sheetPos: Point) => void;
  endViewportDrag: () => void;
  cancelViewportDrag: () => void;
  // Keyboard-initiated viewport move (G key)
  startViewportMove: (basePoint: Point) => void;
  updateViewportMove: (sheetPos: Point) => void;
  commitViewportMove: () => void;
  cancelViewportMove: () => void;

  // Crop region actions
  enableCropRegion: (viewportId: string) => void;
  disableCropRegion: (viewportId: string) => void;
  toggleCropRegion: (viewportId: string) => void;
  startCropRegionEdit: (viewportId: string) => void;
  endCropRegionEdit: () => void;
  startCropRegionDrag: (handle: CropRegionHandleType, draftPos: Point) => void;
  updateCropRegionDrag: (draftPos: Point) => void;
  endCropRegionDrag: () => void;
  cancelCropRegionDrag: () => void;
  resetCropRegion: (viewportId: string) => void;
  setCropRegion: (viewportId: string, cropRegion: CropRegion) => void;

  // Layer override actions
  startLayerOverrideEdit: (viewportId: string) => void;
  endLayerOverrideEdit: () => void;
  setLayerOverride: (viewportId: string, layerId: string, override: Partial<ViewportLayerOverride>) => void;
  removeLayerOverride: (viewportId: string, layerId: string) => void;
  clearLayerOverrides: (viewportId: string) => void;
}

export type ViewportEditSlice = ViewportEditState_Full & ViewportEditActions;

// ============================================================================
// Initial State
// ============================================================================

export const initialViewportEditState: ViewportEditState_Full = {
  viewportEditState: {
    selectedViewportId: null,
    activeHandle: null,
    isDragging: false,
    dragStart: null,
    originalViewport: null,
    isMoving: false,
    moveBasePoint: null,
    moveSnappedPos: null,
  },
  cropRegionEditState: {
    isEditing: false,
    viewportId: null,
    activeHandle: null,
    isDragging: false,
    dragStart: null,
    originalCropRegion: null,
  },
  layerOverrideEditState: {
    isEditing: false,
    viewportId: null,
  },
};

// ============================================================================
// Slice Creator
// ============================================================================

// Type for the full store that this slice needs access to
interface FullStore extends ViewportEditState_Full {
  sheets: Sheet[];
  activeSheetId: string | null;
  isModified: boolean;
  drafts: { id: string; boundary: { x: number; y: number; width: number; height: number } }[];
}

// Helper to get viewport from state
const getViewport = (state: FullStore, viewportId: string) => {
  if (!state.activeSheetId) return null;
  const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
  if (!sheet) return null;
  return sheet.viewports.find((vp) => vp.id === viewportId) || null;
};

// Helper to create default crop region from draft boundary
const createDefaultCropRegion = (state: FullStore, draftId: string): CropRegion => {
  const draft = state.drafts.find((d) => d.id === draftId);
  const boundary = draft?.boundary || { x: -500, y: -500, width: 1000, height: 1000 };
  return {
    type: 'rectangular',
    points: [
      { x: boundary.x, y: boundary.y },
      { x: boundary.x + boundary.width, y: boundary.y + boundary.height },
    ],
    enabled: true,
  };
};

/**
 * Snap a viewport position to alignment guides (sheet borders + other viewports).
 * Returns the snapped { x, y }.
 */
function snapViewportPosition(
  newX: number, newY: number,
  vpWidth: number, vpHeight: number,
  sheet: Sheet,
  excludeViewportId: string
): { x: number; y: number } {
  const snapThreshold = 2; // mm
  const others = sheet.viewports.filter(v => v.visible && v.id !== excludeViewportId);

  const frameMargin = 10; // mm
  let paperW: number, paperH: number;
  if (sheet.paperSize === 'Custom') {
    paperW = (sheet as any).customWidth || 210;
    paperH = (sheet as any).customHeight || 297;
  } else {
    const baseDims = PAPER_SIZES[sheet.paperSize];
    if (sheet.orientation === 'landscape') {
      paperW = baseDims.height;
      paperH = baseDims.width;
    } else {
      paperW = baseDims.width;
      paperH = baseDims.height;
    }
  }

  const borderXPositions = [0, frameMargin, paperW - frameMargin, paperW];
  const borderYPositions = [0, frameMargin, paperH - frameMargin, paperH];

  let snappedX = false;
  let snappedY = false;

  const dXOffsets = [0, vpWidth, vpWidth / 2];
  const dYOffsets = [0, vpHeight, vpHeight / 2];

  // Snap to sheet borders first
  for (const offset of dXOffsets) {
    if (snappedX) break;
    for (const bx of borderXPositions) {
      if (Math.abs((newX + offset) - bx) <= snapThreshold) {
        newX = bx - offset;
        snappedX = true;
        break;
      }
    }
  }
  for (const offset of dYOffsets) {
    if (snappedY) break;
    for (const by of borderYPositions) {
      if (Math.abs((newY + offset) - by) <= snapThreshold) {
        newY = by - offset;
        snappedY = true;
        break;
      }
    }
  }

  // Snap to other viewports
  for (const other of others) {
    if (snappedX && snappedY) break;
    const oLeft = other.x;
    const oRight = other.x + other.width;
    const oCenterX = other.x + other.width / 2;
    const oTop = other.y;
    const oBottom = other.y + other.height;
    const oCenterY = other.y + other.height / 2;

    if (!snappedX) {
      const xTargets = [oLeft, oRight, oCenterX];
      const xEdges = [
        { offset: 0, targets: xTargets },
        { offset: vpWidth, targets: xTargets },
        { offset: vpWidth / 2, targets: [oCenterX] },
      ];
      for (const { offset, targets } of xEdges) {
        for (const target of targets) {
          if (Math.abs((newX + offset) - target) <= snapThreshold) {
            newX = target - offset;
            snappedX = true;
            break;
          }
        }
        if (snappedX) break;
      }
    }

    if (!snappedY) {
      const yTargets = [oTop, oBottom, oCenterY];
      const yEdges = [
        { offset: 0, targets: yTargets },
        { offset: vpHeight, targets: yTargets },
        { offset: vpHeight / 2, targets: [oCenterY] },
      ];
      for (const { offset, targets } of yEdges) {
        for (const target of targets) {
          if (Math.abs((newY + offset) - target) <= snapThreshold) {
            newY = target - offset;
            snappedY = true;
            break;
          }
        }
        if (snappedY) break;
      }
    }
  }

  return { x: newX, y: newY };
}

export const createViewportEditSlice = (
  set: (fn: (state: FullStore) => void) => void,
  _get: () => FullStore
): ViewportEditActions => ({
  // ============================================================================
  // Viewport Selection and Manipulation
  // ============================================================================

  selectViewport: (viewportId) =>
    set((state) => {
      state.viewportEditState.selectedViewportId = viewportId;
      // Clear any active drag when changing selection
      state.viewportEditState.activeHandle = null;
      state.viewportEditState.isDragging = false;
      state.viewportEditState.dragStart = null;
      state.viewportEditState.originalViewport = null;
      // Also exit crop region edit mode
      state.cropRegionEditState.isEditing = false;
      state.cropRegionEditState.viewportId = null;
    }),

  startViewportDrag: (handle, sheetPos) =>
    set((state) => {
      const { selectedViewportId } = state.viewportEditState;
      if (!selectedViewportId || !state.activeSheetId) return;

      const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
      if (!sheet) return;

      const viewport = sheet.viewports.find((vp) => vp.id === selectedViewportId);
      if (!viewport || viewport.locked) return;

      state.viewportEditState.activeHandle = handle;
      state.viewportEditState.isDragging = true;
      state.viewportEditState.dragStart = sheetPos;
      state.viewportEditState.originalViewport = { ...viewport };
    }),

  updateViewportDrag: (sheetPos) =>
    set((state) => {
      const { selectedViewportId, activeHandle, dragStart, originalViewport, isDragging } = state.viewportEditState;
      if (!isDragging || !selectedViewportId || !activeHandle || !dragStart || !originalViewport || !state.activeSheetId) return;

      const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
      if (!sheet) return;

      const viewport = sheet.viewports.find((vp) => vp.id === selectedViewportId);
      if (!viewport) return;

      const dx = sheetPos.x - dragStart.x;
      const dy = sheetPos.y - dragStart.y;

      // Only allow moving (center handle) - size is derived from boundary × scale
      if (activeHandle === 'center') {
        const snapped = snapViewportPosition(
          originalViewport.x + dx, originalViewport.y + dy,
          originalViewport.width, originalViewport.height,
          sheet, selectedViewportId
        );
        viewport.x = snapped.x;
        viewport.y = snapped.y;
      }

      sheet.modifiedAt = new Date().toISOString();
    }),

  endViewportDrag: () =>
    set((state) => {
      if (state.viewportEditState.isDragging) {
        state.isModified = true;
      }
      state.viewportEditState.activeHandle = null;
      state.viewportEditState.isDragging = false;
      state.viewportEditState.dragStart = null;
      state.viewportEditState.originalViewport = null;
    }),

  cancelViewportDrag: () =>
    set((state) => {
      const { selectedViewportId, originalViewport } = state.viewportEditState;
      if (selectedViewportId && originalViewport && state.activeSheetId) {
        // Restore original viewport state
        const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
        if (sheet) {
          const viewport = sheet.viewports.find((vp) => vp.id === selectedViewportId);
          if (viewport) {
            viewport.x = originalViewport.x;
            viewport.y = originalViewport.y;
            viewport.width = originalViewport.width;
            viewport.height = originalViewport.height;
          }
        }
      }
      state.viewportEditState.activeHandle = null;
      state.viewportEditState.isDragging = false;
      state.viewportEditState.dragStart = null;
      state.viewportEditState.originalViewport = null;
    }),

  // Keyboard-initiated viewport move (G key)
  startViewportMove: (basePoint) =>
    set((state) => {
      const { selectedViewportId } = state.viewportEditState;
      if (!selectedViewportId || !state.activeSheetId) return;
      const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
      if (!sheet) return;
      const viewport = sheet.viewports.find((vp) => vp.id === selectedViewportId);
      if (!viewport || viewport.locked) return;
      state.viewportEditState.isMoving = true;
      state.viewportEditState.moveBasePoint = basePoint;
      state.viewportEditState.moveSnappedPos = null;
    }),

  updateViewportMove: (sheetPos) =>
    set((state) => {
      const { selectedViewportId, moveBasePoint, isMoving } = state.viewportEditState;
      if (!isMoving || !selectedViewportId || !moveBasePoint || !state.activeSheetId) return;
      const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
      if (!sheet) return;
      const viewport = sheet.viewports.find((vp) => vp.id === selectedViewportId);
      if (!viewport) return;
      const dx = sheetPos.x - moveBasePoint.x;
      const dy = sheetPos.y - moveBasePoint.y;
      const snapped = snapViewportPosition(
        viewport.x + dx, viewport.y + dy,
        viewport.width, viewport.height,
        sheet, selectedViewportId
      );
      state.viewportEditState.moveSnappedPos = snapped;
    }),

  commitViewportMove: () =>
    set((state) => {
      const { selectedViewportId, moveSnappedPos } = state.viewportEditState;
      if (!selectedViewportId || !moveSnappedPos || !state.activeSheetId) return;
      const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
      if (!sheet) return;
      const viewport = sheet.viewports.find((vp) => vp.id === selectedViewportId);
      if (!viewport || viewport.locked) return;
      viewport.x = moveSnappedPos.x;
      viewport.y = moveSnappedPos.y;
      sheet.modifiedAt = new Date().toISOString();
      state.viewportEditState.isMoving = false;
      state.viewportEditState.moveBasePoint = null;
      state.viewportEditState.moveSnappedPos = null;
      state.isModified = true;
    }),

  cancelViewportMove: () =>
    set((state) => {
      state.viewportEditState.isMoving = false;
      state.viewportEditState.moveBasePoint = null;
      state.viewportEditState.moveSnappedPos = null;
    }),

  // ============================================================================
  // Crop Region Actions
  // ============================================================================

  enableCropRegion: (viewportId) =>
    set((state) => {
      const viewport = getViewport(state, viewportId);
      if (!viewport) return;

      if (!viewport.cropRegion) {
        // Create default crop region based on draft boundary
        viewport.cropRegion = createDefaultCropRegion(state, viewport.drawingId);
      } else {
        viewport.cropRegion.enabled = true;
      }
      state.isModified = true;
    }),

  disableCropRegion: (viewportId) =>
    set((state) => {
      const viewport = getViewport(state, viewportId);
      if (!viewport || !viewport.cropRegion) return;

      viewport.cropRegion.enabled = false;
      state.isModified = true;
    }),

  toggleCropRegion: (viewportId) =>
    set((state) => {
      const viewport = getViewport(state, viewportId);
      if (!viewport) return;

      if (!viewport.cropRegion) {
        viewport.cropRegion = createDefaultCropRegion(state, viewport.drawingId);
      } else {
        viewport.cropRegion.enabled = !viewport.cropRegion.enabled;
      }
      state.isModified = true;
    }),

  startCropRegionEdit: (viewportId) =>
    set((state) => {
      const viewport = getViewport(state, viewportId);
      if (!viewport) return;

      // Ensure crop region exists
      if (!viewport.cropRegion) {
        viewport.cropRegion = createDefaultCropRegion(state, viewport.drawingId);
      }

      state.cropRegionEditState.isEditing = true;
      state.cropRegionEditState.viewportId = viewportId;
      state.viewportEditState.selectedViewportId = viewportId;
    }),

  endCropRegionEdit: () =>
    set((state) => {
      state.cropRegionEditState.isEditing = false;
      state.cropRegionEditState.viewportId = null;
      state.cropRegionEditState.activeHandle = null;
      state.cropRegionEditState.isDragging = false;
      state.cropRegionEditState.dragStart = null;
      state.cropRegionEditState.originalCropRegion = null;
    }),

  startCropRegionDrag: (handle, draftPos) =>
    set((state) => {
      const { viewportId } = state.cropRegionEditState;
      if (!viewportId) return;

      const viewport = getViewport(state, viewportId);
      if (!viewport || !viewport.cropRegion || viewport.locked) return;

      state.cropRegionEditState.activeHandle = handle;
      state.cropRegionEditState.isDragging = true;
      state.cropRegionEditState.dragStart = draftPos;
      state.cropRegionEditState.originalCropRegion = JSON.parse(JSON.stringify(viewport.cropRegion));
    }),

  updateCropRegionDrag: (draftPos) =>
    set((state) => {
      const { viewportId, activeHandle, dragStart, originalCropRegion, isDragging } = state.cropRegionEditState;
      if (!isDragging || !viewportId || !activeHandle || !dragStart || !originalCropRegion) return;

      const viewport = getViewport(state, viewportId);
      if (!viewport || !viewport.cropRegion) return;

      const dx = draftPos.x - dragStart.x;
      const dy = draftPos.y - dragStart.y;

      // For rectangular crop region, points[0] is top-left, points[1] is bottom-right
      const [origTopLeft, origBottomRight] = originalCropRegion.points;
      let newTopLeft = { ...origTopLeft };
      let newBottomRight = { ...origBottomRight };

      // Handle horizontal resizing
      if (activeHandle.includes('left')) {
        newTopLeft.x = origTopLeft.x + dx;
      } else if (activeHandle.includes('right')) {
        newBottomRight.x = origBottomRight.x + dx;
      }

      // Handle vertical resizing
      if (activeHandle.includes('top')) {
        newTopLeft.y = origTopLeft.y + dy;
      } else if (activeHandle.includes('bottom')) {
        newBottomRight.y = origBottomRight.y + dy;
      }

      // Ensure minimum size
      const minSize = 10;
      if (newBottomRight.x - newTopLeft.x >= minSize && newBottomRight.y - newTopLeft.y >= minSize) {
        viewport.cropRegion.points = [newTopLeft, newBottomRight];
      }
    }),

  endCropRegionDrag: () =>
    set((state) => {
      if (state.cropRegionEditState.isDragging) {
        state.isModified = true;
      }
      state.cropRegionEditState.activeHandle = null;
      state.cropRegionEditState.isDragging = false;
      state.cropRegionEditState.dragStart = null;
      state.cropRegionEditState.originalCropRegion = null;
    }),

  cancelCropRegionDrag: () =>
    set((state) => {
      const { viewportId, originalCropRegion } = state.cropRegionEditState;
      if (viewportId && originalCropRegion) {
        const viewport = getViewport(state, viewportId);
        if (viewport && viewport.cropRegion) {
          viewport.cropRegion = originalCropRegion;
        }
      }
      state.cropRegionEditState.activeHandle = null;
      state.cropRegionEditState.isDragging = false;
      state.cropRegionEditState.dragStart = null;
      state.cropRegionEditState.originalCropRegion = null;
    }),

  resetCropRegion: (viewportId) =>
    set((state) => {
      const viewport = getViewport(state, viewportId);
      if (!viewport) return;

      viewport.cropRegion = createDefaultCropRegion(state, viewport.drawingId);
      state.isModified = true;
    }),

  setCropRegion: (viewportId, cropRegion) =>
    set((state) => {
      const viewport = getViewport(state, viewportId);
      if (!viewport) return;

      viewport.cropRegion = cropRegion;
      state.isModified = true;
    }),

  // ============================================================================
  // Layer Override Actions
  // ============================================================================

  startLayerOverrideEdit: (viewportId) =>
    set((state) => {
      state.layerOverrideEditState.isEditing = true;
      state.layerOverrideEditState.viewportId = viewportId;
    }),

  endLayerOverrideEdit: () =>
    set((state) => {
      state.layerOverrideEditState.isEditing = false;
      state.layerOverrideEditState.viewportId = null;
    }),

  setLayerOverride: (viewportId, layerId, override) =>
    set((state) => {
      const viewport = getViewport(state, viewportId);
      if (!viewport) return;

      if (!viewport.layerOverrides) {
        viewport.layerOverrides = [];
      }

      const existingIndex = viewport.layerOverrides.findIndex((o) => o.layerId === layerId);
      if (existingIndex >= 0) {
        // Update existing override
        viewport.layerOverrides[existingIndex] = {
          ...viewport.layerOverrides[existingIndex],
          ...override,
        };
      } else {
        // Add new override
        viewport.layerOverrides.push({
          layerId,
          ...override,
        });
      }
      state.isModified = true;
    }),

  removeLayerOverride: (viewportId, layerId) =>
    set((state) => {
      const viewport = getViewport(state, viewportId);
      if (!viewport || !viewport.layerOverrides) return;

      viewport.layerOverrides = viewport.layerOverrides.filter((o) => o.layerId !== layerId);
      state.isModified = true;
    }),

  clearLayerOverrides: (viewportId) =>
    set((state) => {
      const viewport = getViewport(state, viewportId);
      if (!viewport) return;

      viewport.layerOverrides = [];
      state.isModified = true;
    }),
});
