/**
 * Annotation Slice - Manages sheet annotation state and actions
 *
 * Handles:
 * - Adding/updating/deleting annotations
 * - Annotation selection
 * - Annotation editing state (dragging, text editing)
 */

import type { Point, Sheet } from './types';
import type {
  SheetAnnotation,
  SheetTextAnnotation,
  SheetDimensionAnnotation,
  SheetLeaderAnnotation,
  SheetCalloutAnnotation,
  SheetSectionMarker,
  SheetRevisionCloud,
} from '../../types/sheet';
import { generateId } from './types';
import { CAD_DEFAULT_FONT } from '../../constants/cadDefaults';

// Re-export annotation types for convenience
export type {
  SheetAnnotation,
  SheetTextAnnotation,
  SheetDimensionAnnotation,
  SheetLeaderAnnotation,
  SheetCalloutAnnotation,
  SheetSectionMarker,
  SheetRevisionCloud,
};

// ============================================================================
// State Interface
// ============================================================================

/** Handle types for annotation resizing/manipulation */
export type AnnotationHandleType =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right'
  | 'rotate';

/** Editing state for an annotation */
export interface AnnotationEditState {
  /** Whether annotation editing is active */
  isEditing: boolean;
  /** ID of the annotation being edited (for inline text editing) */
  editingAnnotationId: string | null;
  /** Whether currently dragging an annotation */
  isDragging: boolean;
  /** ID of annotation being dragged */
  draggingAnnotationId: string | null;
  /** Handle being dragged (for resizing) */
  activeHandle: AnnotationHandleType | null;
  /** Position when drag started (sheet mm coords) */
  dragStart: Point | null;
  /** Original annotation state before drag started */
  originalAnnotation: SheetAnnotation | null;
}

export interface AnnotationState {
  /** Currently selected annotation IDs on the active sheet */
  selectedAnnotationIds: string[];
  /** Annotation editing state */
  annotationEditState: AnnotationEditState;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface AnnotationActions {
  // Selection
  selectAnnotation: (annotationId: string, addToSelection?: boolean) => void;
  selectAnnotations: (annotationIds: string[]) => void;
  deselectAllAnnotations: () => void;

  // CRUD
  addAnnotation: (sheetId: string, annotation: SheetAnnotation) => void;
  updateAnnotation: (sheetId: string, annotationId: string, updates: Partial<SheetAnnotation>) => void;
  deleteAnnotation: (sheetId: string, annotationId: string) => void;
  deleteSelectedAnnotations: (sheetId: string) => void;

  // Convenience creators
  addTextAnnotation: (sheetId: string, position: Point, content: string, options?: Partial<SheetTextAnnotation>) => string;
  addLeaderAnnotation: (sheetId: string, points: Point[], text: string, options?: Partial<SheetLeaderAnnotation>) => string;
  addRevisionCloud: (sheetId: string, points: Point[], revisionNumber: string, options?: Partial<SheetRevisionCloud>) => string;

  // Editing state
  startAnnotationDrag: (annotationId: string, startPoint: Point) => void;
  updateAnnotationDrag: (sheetId: string, currentPoint: Point) => void;
  endAnnotationDrag: (sheetId: string) => void;
  cancelAnnotationDrag: () => void;
  startTextEdit: (annotationId: string) => void;
  endTextEdit: () => void;

  // Bulk operations
  moveAnnotations: (sheetId: string, annotationIds: string[], delta: Point) => void;
  duplicateAnnotations: (sheetId: string, annotationIds: string[]) => string[];
}

export type AnnotationSlice = AnnotationState & AnnotationActions;

// ============================================================================
// Initial State
// ============================================================================

export const initialAnnotationEditState: AnnotationEditState = {
  isEditing: false,
  editingAnnotationId: null,
  isDragging: false,
  draggingAnnotationId: null,
  activeHandle: null,
  dragStart: null,
  originalAnnotation: null,
};

export const initialAnnotationState: AnnotationState = {
  selectedAnnotationIds: [],
  annotationEditState: initialAnnotationEditState,
};

// ============================================================================
// Slice Creator
// ============================================================================

// Type for the full store that this slice needs access to
interface StoreWithSheets {
  sheets: Sheet[];
  activeSheetId: string | null;
  isModified: boolean;
}

type FullStore = AnnotationState & StoreWithSheets;

export const createAnnotationSlice = (
  set: (fn: (state: FullStore) => void) => void,
  get: () => FullStore
): AnnotationActions => ({
  // ============================================================================
  // Selection
  // ============================================================================

  selectAnnotation: (annotationId, addToSelection = false) =>
    set((state) => {
      if (addToSelection) {
        if (!state.selectedAnnotationIds.includes(annotationId)) {
          state.selectedAnnotationIds.push(annotationId);
        }
      } else {
        state.selectedAnnotationIds = [annotationId];
      }
    }),

  selectAnnotations: (annotationIds) =>
    set((state) => {
      state.selectedAnnotationIds = annotationIds;
    }),

  deselectAllAnnotations: () =>
    set((state) => {
      state.selectedAnnotationIds = [];
    }),

  // ============================================================================
  // CRUD
  // ============================================================================

  addAnnotation: (sheetId, annotation) =>
    set((state) => {
      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (sheet) {
        sheet.annotations.push(annotation);
        sheet.modifiedAt = new Date().toISOString();
        state.isModified = true;
      }
    }),

  updateAnnotation: (sheetId, annotationId, updates) =>
    set((state) => {
      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (sheet) {
        const index = sheet.annotations.findIndex((a) => a.id === annotationId);
        if (index !== -1) {
          // Merge updates, preserving the type discriminator
          sheet.annotations[index] = { ...sheet.annotations[index], ...updates } as SheetAnnotation;
          sheet.modifiedAt = new Date().toISOString();
          state.isModified = true;
        }
      }
    }),

  deleteAnnotation: (sheetId, annotationId) =>
    set((state) => {
      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (sheet) {
        sheet.annotations = sheet.annotations.filter((a) => a.id !== annotationId);
        // Remove from selection if selected
        state.selectedAnnotationIds = state.selectedAnnotationIds.filter((id) => id !== annotationId);
        sheet.modifiedAt = new Date().toISOString();
        state.isModified = true;
      }
    }),

  deleteSelectedAnnotations: (sheetId) =>
    set((state) => {
      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (sheet && state.selectedAnnotationIds.length > 0) {
        sheet.annotations = sheet.annotations.filter(
          (a) => !state.selectedAnnotationIds.includes(a.id)
        );
        sheet.modifiedAt = new Date().toISOString();
        state.selectedAnnotationIds = [];
        state.isModified = true;
      }
    }),

  // ============================================================================
  // Convenience Creators
  // ============================================================================

  addTextAnnotation: (sheetId, position, content, options = {}) => {
    const id = generateId();
    const annotation: SheetTextAnnotation = {
      id,
      type: 'text',
      position,
      content,
      fontSize: options.fontSize ?? 3.5,
      fontFamily: options.fontFamily ?? CAD_DEFAULT_FONT,
      rotation: options.rotation ?? 0,
      alignment: options.alignment ?? 'left',
      color: options.color ?? '#000000',
      visible: options.visible ?? true,
      locked: options.locked ?? false,
      bold: options.bold,
      italic: options.italic,
    };

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (sheet) {
        sheet.annotations.push(annotation);
        sheet.modifiedAt = new Date().toISOString();
        state.isModified = true;
      }
    });

    return id;
  },

  addLeaderAnnotation: (sheetId, points, text, options = {}) => {
    const id = generateId();
    // Position is the last point (where text is placed)
    const position = points.length > 0 ? points[points.length - 1] : { x: 0, y: 0 };

    const annotation: SheetLeaderAnnotation = {
      id,
      type: 'leader',
      position,
      points,
      text,
      arrowType: options.arrowType ?? 'filled',
      textAlignment: options.textAlignment ?? 'left',
      lineColor: options.lineColor ?? '#000000',
      textColor: options.textColor ?? '#000000',
      fontSize: options.fontSize ?? 3,
      visible: options.visible ?? true,
      locked: options.locked ?? false,
    };

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (sheet) {
        sheet.annotations.push(annotation);
        sheet.modifiedAt = new Date().toISOString();
        state.isModified = true;
      }
    });

    return id;
  },

  addRevisionCloud: (sheetId, points, revisionNumber, options = {}) => {
    const id = generateId();
    // Position is the centroid of points
    const position = points.length > 0
      ? {
          x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
          y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
        }
      : { x: 0, y: 0 };

    const annotation: SheetRevisionCloud = {
      id,
      type: 'revision-cloud',
      position,
      points,
      revisionNumber,
      arcBulge: options.arcBulge ?? 0.3,
      lineColor: options.lineColor ?? '#ff0000',
      visible: options.visible ?? true,
      locked: options.locked ?? false,
    };

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (sheet) {
        sheet.annotations.push(annotation);
        sheet.modifiedAt = new Date().toISOString();
        state.isModified = true;
      }
    });

    return id;
  },

  // ============================================================================
  // Editing State
  // ============================================================================

  startAnnotationDrag: (annotationId, startPoint) =>
    set((state) => {
      // Find the annotation in the active sheet
      const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
      if (!sheet) return;

      const annotation = sheet.annotations.find((a) => a.id === annotationId);
      if (!annotation) return;

      state.annotationEditState = {
        isEditing: true,
        editingAnnotationId: null,
        isDragging: true,
        draggingAnnotationId: annotationId,
        activeHandle: null,
        dragStart: startPoint,
        originalAnnotation: JSON.parse(JSON.stringify(annotation)),
      };
    }),

  updateAnnotationDrag: (sheetId, currentPoint) =>
    set((state) => {
      const { isDragging, draggingAnnotationId, dragStart, originalAnnotation } = state.annotationEditState;
      if (!isDragging || !draggingAnnotationId || !dragStart || !originalAnnotation) return;

      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (!sheet) return;

      const index = sheet.annotations.findIndex((a) => a.id === draggingAnnotationId);
      if (index === -1) return;

      // Calculate delta
      const dx = currentPoint.x - dragStart.x;
      const dy = currentPoint.y - dragStart.y;

      // Update position
      const newPosition = {
        x: originalAnnotation.position.x + dx,
        y: originalAnnotation.position.y + dy,
      };

      sheet.annotations[index] = {
        ...sheet.annotations[index],
        position: newPosition,
      } as SheetAnnotation;

      // For annotations with multiple points (leader, revision cloud), also move all points
      if ('points' in originalAnnotation && 'points' in sheet.annotations[index]) {
        const originalPoints = (originalAnnotation as SheetLeaderAnnotation | SheetRevisionCloud).points;
        (sheet.annotations[index] as SheetLeaderAnnotation | SheetRevisionCloud).points = originalPoints.map((p) => ({
          x: p.x + dx,
          y: p.y + dy,
        }));
      }
    }),

  endAnnotationDrag: (sheetId) =>
    set((state) => {
      if (state.annotationEditState.isDragging) {
        const sheet = state.sheets.find((s) => s.id === sheetId);
        if (sheet) {
          sheet.modifiedAt = new Date().toISOString();
          state.isModified = true;
        }
      }

      state.annotationEditState = {
        ...initialAnnotationEditState,
      };
    }),

  cancelAnnotationDrag: () =>
    set((state) => {
      const { isDragging, draggingAnnotationId, originalAnnotation } = state.annotationEditState;
      if (!isDragging || !draggingAnnotationId || !originalAnnotation) {
        state.annotationEditState = { ...initialAnnotationEditState };
        return;
      }

      // Restore original annotation
      const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
      if (sheet) {
        const index = sheet.annotations.findIndex((a) => a.id === draggingAnnotationId);
        if (index !== -1) {
          sheet.annotations[index] = originalAnnotation;
        }
      }

      state.annotationEditState = { ...initialAnnotationEditState };
    }),

  startTextEdit: (annotationId) =>
    set((state) => {
      state.annotationEditState = {
        ...initialAnnotationEditState,
        isEditing: true,
        editingAnnotationId: annotationId,
      };
    }),

  endTextEdit: () =>
    set((state) => {
      state.annotationEditState = { ...initialAnnotationEditState };
    }),

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  moveAnnotations: (sheetId, annotationIds, delta) =>
    set((state) => {
      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (!sheet) return;

      for (const annotation of sheet.annotations) {
        if (annotationIds.includes(annotation.id)) {
          annotation.position = {
            x: annotation.position.x + delta.x,
            y: annotation.position.y + delta.y,
          };

          // Also move points for multi-point annotations
          if ('points' in annotation) {
            (annotation as SheetLeaderAnnotation | SheetRevisionCloud).points =
              (annotation as SheetLeaderAnnotation | SheetRevisionCloud).points.map((p) => ({
                x: p.x + delta.x,
                y: p.y + delta.y,
              }));
          }
        }
      }

      sheet.modifiedAt = new Date().toISOString();
      state.isModified = true;
    }),

  duplicateAnnotations: (sheetId, annotationIds) => {
    const newIds: string[] = [];
    const state = get();
    const sheet = state.sheets.find((s) => s.id === sheetId);
    if (!sheet) return newIds;

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (!sheet) return;

      for (const id of annotationIds) {
        const original = sheet.annotations.find((a) => a.id === id);
        if (original) {
          const newId = generateId();
          newIds.push(newId);

          // Clone and offset the annotation
          const clone = JSON.parse(JSON.stringify(original)) as SheetAnnotation;
          clone.id = newId;
          clone.position = {
            x: clone.position.x + 10,
            y: clone.position.y + 10,
          };

          // Also offset points for multi-point annotations
          if ('points' in clone) {
            (clone as SheetLeaderAnnotation | SheetRevisionCloud).points =
              (clone as SheetLeaderAnnotation | SheetRevisionCloud).points.map((p) => ({
                x: p.x + 10,
                y: p.y + 10,
              }));
          }

          sheet.annotations.push(clone);
        }
      }

      sheet.modifiedAt = new Date().toISOString();
      state.isModified = true;
    });

    return newIds;
  },
});
