/**
 * useBoxSelection - Handles window/crossing box selection
 */

import { useCallback, useRef } from 'react';
import { useAppStore, type SelectionBox } from '../../state/appStore';
import type { Point } from '../../types/geometry';
import { getShapeBounds } from '../../utils/geometryUtils';
import { screenToWorld } from '../../utils/geometryUtils';

interface SelectionState {
  isSelecting: boolean;
  startPoint: Point;
  justFinishedBoxSelection: boolean;
}

export function useBoxSelection() {
  const selectionState = useRef<SelectionState>({
    isSelecting: false,
    startPoint: { x: 0, y: 0 },
    justFinishedBoxSelection: false,
  });

  const {
    viewport,
    shapes,
    activeTool,
    selectShapes,
    setSelectionBox,
    hasActiveModifyCommand,
    commandIsSelecting,
    setPendingCommandSelection,
    editorMode,
    activeDrawingId,
  } = useAppStore();

  /**
   * Start box selection
   */
  const startBoxSelection = useCallback(
    (screenPos: Point) => {
      selectionState.current = {
        isSelecting: true,
        startPoint: screenPos,
        justFinishedBoxSelection: false,
      };
    },
    []
  );

  /**
   * Check if should start box selection (clicking on empty space in select mode)
   */
  const shouldStartBoxSelection = useCallback(
    (hasShapeAtPoint: boolean): boolean => {
      if (editorMode !== 'drawing') return false;
      if (hasShapeAtPoint) return false;
      return activeTool === 'select' || (hasActiveModifyCommand && commandIsSelecting);
    },
    [editorMode, activeTool, hasActiveModifyCommand, commandIsSelecting]
  );

  /**
   * Update box selection during drag
   */
  const updateBoxSelection = useCallback(
    (screenPos: Point) => {
      if (!selectionState.current.isSelecting) return;

      const startPoint = selectionState.current.startPoint;
      // Determine mode based on direction: left-to-right = window, right-to-left = crossing
      const mode = screenPos.x >= startPoint.x ? 'window' : 'crossing';

      setSelectionBox({
        start: startPoint,
        end: screenPos,
        mode,
      });
    },
    [setSelectionBox]
  );

  /**
   * Get shapes within selection box
   */
  const getShapesInSelectionBox = useCallback(
    (box: SelectionBox): string[] => {
      const startWorld = screenToWorld(box.start.x, box.start.y, viewport);
      const endWorld = screenToWorld(box.end.x, box.end.y, viewport);

      const minX = Math.min(startWorld.x, endWorld.x);
      const maxX = Math.max(startWorld.x, endWorld.x);
      const minY = Math.min(startWorld.y, endWorld.y);
      const maxY = Math.max(startWorld.y, endWorld.y);

      const selectedIds: string[] = [];

      for (const shape of shapes) {
        if (!shape.visible || shape.locked) continue;
        if (shape.drawingId !== activeDrawingId) continue;  // Only select shapes in active drawing

        const bounds = getShapeBounds(shape);
        if (!bounds) continue;

        if (box.mode === 'window') {
          // Window selection: shape must be completely inside
          if (
            bounds.minX >= minX &&
            bounds.maxX <= maxX &&
            bounds.minY >= minY &&
            bounds.maxY <= maxY
          ) {
            selectedIds.push(shape.id);
          }
        } else {
          // Crossing selection: shape can be inside or crossing
          if (
            bounds.maxX >= minX &&
            bounds.minX <= maxX &&
            bounds.maxY >= minY &&
            bounds.minY <= maxY
          ) {
            selectedIds.push(shape.id);
          }
        }
      }

      return selectedIds;
    },
    [viewport, shapes, activeDrawingId]
  );

  /**
   * End box selection
   */
  const endBoxSelection = useCallback(
    (screenPos: Point, shiftKey: boolean): boolean => {
      if (!selectionState.current.isSelecting) return false;

      const startPoint = selectionState.current.startPoint;

      // Check if it was a drag (not just a click)
      const dx = Math.abs(screenPos.x - startPoint.x);
      const dy = Math.abs(screenPos.y - startPoint.y);

      const wasBoxSelection = dx > 5 || dy > 5;

      if (wasBoxSelection) {
        const mode = screenPos.x >= startPoint.x ? 'window' : 'crossing';
        const box: SelectionBox = {
          start: startPoint,
          end: screenPos,
          mode,
        };

        const selectedIds = getShapesInSelectionBox(box);

        // If in command selection phase, send selection to command system
        if (hasActiveModifyCommand && commandIsSelecting) {
          if (selectedIds.length > 0) {
            setPendingCommandSelection(selectedIds);
          }
        } else if (shiftKey) {
          // Add to current selection
          const currentSelection = useAppStore.getState().selectedShapeIds;
          const newSelection = [...new Set([...currentSelection, ...selectedIds])];
          selectShapes(newSelection);
        } else {
          // Replace selection
          selectShapes(selectedIds);
        }

        selectionState.current.justFinishedBoxSelection = true;
      } else {
        selectionState.current.justFinishedBoxSelection = false;
      }

      selectionState.current.isSelecting = false;
      setSelectionBox(null);

      return wasBoxSelection;
    },
    [getShapesInSelectionBox, selectShapes, setSelectionBox, hasActiveModifyCommand, commandIsSelecting, setPendingCommandSelection]
  );

  /**
   * Check if box selection is in progress
   */
  const isSelecting = useCallback(() => selectionState.current.isSelecting, []);

  /**
   * Check if just finished box selection (to prevent click handler)
   */
  const justFinishedBoxSelection = useCallback(() => {
    const result = selectionState.current.justFinishedBoxSelection;
    selectionState.current.justFinishedBoxSelection = false;
    return result;
  }, []);

  return {
    startBoxSelection,
    shouldStartBoxSelection,
    updateBoxSelection,
    endBoxSelection,
    getShapesInSelectionBox,
    isSelecting,
    justFinishedBoxSelection,
  };
}
