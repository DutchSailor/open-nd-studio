/**
 * useAnnotationEditing - Handles sheet annotation editing (add, select, drag)
 */

import { useCallback, useState } from 'react';
import { useAppStore } from '../../state/appStore';
import type { Point } from '../../types/geometry';
import type { SheetAnnotation } from '../../types/sheet';
import { CAD_DEFAULT_FONT } from '../../constants/cadDefaults';

export function useAnnotationEditing() {
  const {
    viewport,
    editorMode,
    sheets,
    activeSheetId,
    activeTool,
    selectedAnnotationIds,
    annotationEditState,
    selectAnnotation,
    deselectAllAnnotations,
    addTextAnnotation,
    addLeaderAnnotation,
    addRevisionCloud,
    startAnnotationDrag,
    updateAnnotationDrag,
    endAnnotationDrag,
    cancelAnnotationDrag,
  } = useAppStore();

  // Local state for text input
  const [pendingTextPosition, setPendingTextPosition] = useState<Point | null>(null);
  const [pendingLeaderPoints, setPendingLeaderPoints] = useState<Point[]>([]);

  // mm to pixels conversion
  const mmToPixels = 3.78;

  /**
   * Convert screen coordinates to sheet coordinates (mm)
   */
  const screenToSheet = useCallback(
    (screenX: number, screenY: number): Point => {
      const worldX = (screenX - viewport.offsetX) / viewport.zoom;
      const worldY = (screenY - viewport.offsetY) / viewport.zoom;
      return {
        x: worldX / mmToPixels,
        y: worldY / mmToPixels,
      };
    },
    [viewport]
  );

  /**
   * Get the active sheet
   */
  const getActiveSheet = useCallback(() => {
    if (editorMode !== 'sheet' || !activeSheetId) return null;
    return sheets.find(s => s.id === activeSheetId) || null;
  }, [editorMode, activeSheetId, sheets]);

  /**
   * Get annotation bounding box in sheet coordinates
   */
  const getAnnotationBounds = useCallback((annotation: SheetAnnotation): { x: number; y: number; width: number; height: number } | null => {
    const padding = 2;

    switch (annotation.type) {
      case 'text': {
        const { position, fontSize, content } = annotation;
        const lines = content.split('\n');
        const width = Math.max(...lines.map(l => l.length)) * fontSize * 0.6;
        const height = lines.length * fontSize * 1.2;
        return {
          x: position.x - padding,
          y: position.y - padding,
          width: width + padding * 2,
          height: height + padding * 2,
        };
      }
      case 'leader': {
        const { points } = annotation;
        if (points.length === 0) return null;
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        return {
          x: Math.min(...xs) - padding,
          y: Math.min(...ys) - padding,
          width: Math.max(...xs) - Math.min(...xs) + padding * 2,
          height: Math.max(...ys) - Math.min(...ys) + padding * 2,
        };
      }
      case 'callout': {
        const { position, size } = annotation;
        return {
          x: position.x - size / 2 - padding,
          y: position.y - size / 2 - padding,
          width: size + padding * 2,
          height: size + padding * 2,
        };
      }
      case 'revision-cloud': {
        const { points } = annotation;
        if (points.length === 0) return null;
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        return {
          x: Math.min(...xs) - padding,
          y: Math.min(...ys) - padding,
          width: Math.max(...xs) - Math.min(...xs) + padding * 2,
          height: Math.max(...ys) - Math.min(...ys) + padding * 2,
        };
      }
      default:
        return null;
    }
  }, []);

  /**
   * Check if point is inside annotation bounds
   */
  const isPointInAnnotation = useCallback((sheetPos: Point, annotation: SheetAnnotation): boolean => {
    const bounds = getAnnotationBounds(annotation);
    if (!bounds) return false;

    return (
      sheetPos.x >= bounds.x &&
      sheetPos.x <= bounds.x + bounds.width &&
      sheetPos.y >= bounds.y &&
      sheetPos.y <= bounds.y + bounds.height
    );
  }, [getAnnotationBounds]);

  /**
   * Find annotation at sheet position
   */
  const findAnnotationAtPoint = useCallback((sheetPos: Point): SheetAnnotation | null => {
    const sheet = getActiveSheet();
    if (!sheet || !sheet.annotations) return null;

    // Check in reverse order (topmost annotation first)
    for (let i = sheet.annotations.length - 1; i >= 0; i--) {
      const annotation = sheet.annotations[i];
      if (annotation.visible && isPointInAnnotation(sheetPos, annotation)) {
        return annotation;
      }
    }
    return null;
  }, [getActiveSheet, isPointInAnnotation]);

  /**
   * Check if tool is a sheet annotation tool
   */
  const isAnnotationTool = useCallback((): boolean => {
    return activeTool.startsWith('sheet-');
  }, [activeTool]);

  /**
   * Handle click for annotation tools
   * Returns true if handled
   */
  const handleAnnotationClick = useCallback(
    (screenPos: Point, shiftKey: boolean = false): boolean => {
      if (editorMode !== 'sheet') return false;

      const sheetPos = screenToSheet(screenPos.x, screenPos.y);
      const sheet = getActiveSheet();
      if (!sheet) return false;

      // Handle annotation tool clicks
      switch (activeTool) {
        case 'sheet-text': {
          // Add text annotation at click position
          // In a real app, this would show a text input dialog
          const text = prompt('Enter text:');
          if (text) {
            addTextAnnotation(sheet.id, sheetPos, text, {
              fontSize: 3.5,
              fontFamily: CAD_DEFAULT_FONT,
              color: '#000000',
            });
          }
          return true;
        }

        case 'sheet-leader': {
          // Add points for leader - click to add points, double-click or right-click to finish
          if (pendingLeaderPoints.length === 0) {
            setPendingLeaderPoints([sheetPos]);
          } else {
            const newPoints = [...pendingLeaderPoints, sheetPos];
            setPendingLeaderPoints(newPoints);

            // If we have at least 2 points, allow finishing
            if (newPoints.length >= 2 && shiftKey) {
              const text = prompt('Enter leader text:');
              if (text) {
                addLeaderAnnotation(sheet.id, newPoints, text);
              }
              setPendingLeaderPoints([]);
            }
          }
          return true;
        }

        case 'sheet-revision-cloud': {
          // Similar to leader - collect points for cloud boundary
          // For simplicity, create a rectangular cloud at click
          const cloudPoints = [
            sheetPos,
            { x: sheetPos.x + 30, y: sheetPos.y },
            { x: sheetPos.x + 30, y: sheetPos.y + 20 },
            { x: sheetPos.x, y: sheetPos.y + 20 },
          ];
          const revNum = prompt('Enter revision number:', '1');
          if (revNum) {
            addRevisionCloud(sheet.id, cloudPoints, revNum);
          }
          return true;
        }

        case 'select': {
          // Check if clicking on an annotation
          const annotation = findAnnotationAtPoint(sheetPos);
          if (annotation) {
            selectAnnotation(annotation.id, shiftKey);
            return true;
          }

          // Deselect if clicking on empty space
          if (selectedAnnotationIds.length > 0) {
            deselectAllAnnotations();
          }
          return false; // Allow other handlers to process (viewport selection)
        }

        default:
          return false;
      }
    },
    [
      editorMode,
      screenToSheet,
      getActiveSheet,
      activeTool,
      pendingLeaderPoints,
      selectedAnnotationIds,
      addTextAnnotation,
      addLeaderAnnotation,
      addRevisionCloud,
      findAnnotationAtPoint,
      selectAnnotation,
      deselectAllAnnotations,
    ]
  );

  /**
   * Handle mouse down for annotation dragging
   */
  const handleAnnotationMouseDown = useCallback(
    (screenPos: Point): boolean => {
      if (editorMode !== 'sheet') return false;
      if (selectedAnnotationIds.length === 0) return false;
      if (annotationEditState.isDragging) return false;

      const sheetPos = screenToSheet(screenPos.x, screenPos.y);

      // Check if clicking on a selected annotation
      const annotation = findAnnotationAtPoint(sheetPos);
      if (annotation && selectedAnnotationIds.includes(annotation.id)) {
        startAnnotationDrag(annotation.id, sheetPos);
        return true;
      }

      return false;
    },
    [
      editorMode,
      selectedAnnotationIds,
      annotationEditState.isDragging,
      screenToSheet,
      findAnnotationAtPoint,
      startAnnotationDrag,
    ]
  );

  /**
   * Handle mouse move for annotation dragging
   */
  const handleAnnotationMouseMove = useCallback(
    (screenPos: Point): boolean => {
      if (editorMode !== 'sheet' || !annotationEditState.isDragging) return false;

      const sheetPos = screenToSheet(screenPos.x, screenPos.y);
      const sheet = getActiveSheet();
      if (!sheet) return false;

      updateAnnotationDrag(sheet.id, sheetPos);
      return true;
    },
    [editorMode, annotationEditState.isDragging, screenToSheet, getActiveSheet, updateAnnotationDrag]
  );

  /**
   * Handle mouse up for annotation dragging
   */
  const handleAnnotationMouseUp = useCallback((): boolean => {
    if (editorMode !== 'sheet' || !annotationEditState.isDragging) return false;

    const sheet = getActiveSheet();
    if (!sheet) return false;

    endAnnotationDrag(sheet.id);
    return true;
  }, [editorMode, annotationEditState.isDragging, getActiveSheet, endAnnotationDrag]);

  /**
   * Cancel current annotation operation
   */
  const cancelAnnotation = useCallback(() => {
    setPendingTextPosition(null);
    setPendingLeaderPoints([]);
    if (annotationEditState.isDragging) {
      cancelAnnotationDrag();
    }
  }, [annotationEditState.isDragging, cancelAnnotationDrag]);

  /**
   * Finish leader annotation (called on right-click or Escape)
   */
  const finishLeader = useCallback(() => {
    if (pendingLeaderPoints.length >= 2) {
      const sheet = getActiveSheet();
      if (sheet) {
        const text = prompt('Enter leader text:');
        if (text) {
          addLeaderAnnotation(sheet.id, pendingLeaderPoints, text);
        }
      }
    }
    setPendingLeaderPoints([]);
  }, [pendingLeaderPoints, getActiveSheet, addLeaderAnnotation]);

  return {
    screenToSheet,
    getActiveSheet,
    getAnnotationBounds,
    isPointInAnnotation,
    findAnnotationAtPoint,
    isAnnotationTool,
    handleAnnotationClick,
    handleAnnotationMouseDown,
    handleAnnotationMouseMove,
    handleAnnotationMouseUp,
    cancelAnnotation,
    finishLeader,
    pendingTextPosition,
    pendingLeaderPoints,
    selectedAnnotationIds,
    isDragging: annotationEditState.isDragging,
  };
}
