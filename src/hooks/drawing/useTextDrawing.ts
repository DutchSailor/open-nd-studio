/**
 * useTextDrawing - Handles text shape creation and editing
 */

import { useCallback } from 'react';
import { useAppStore, generateId } from '../../state/appStore';
import type { Point, TextShape } from '../../types/geometry';

export function useTextDrawing() {
  const {
    activeLayerId,
    activeDrawingId,
    currentStyle,
    addShape,
    defaultTextStyle,
    startTextEditing,
    shapes,
    selectShape,
  } = useAppStore();

  /**
   * Create a text shape at the specified position and enter edit mode
   */
  const createText = useCallback(
    (position: Point): string => {
      const textShape: TextShape = {
        id: generateId(),
        type: 'text',
        layerId: activeLayerId,
        drawingId: activeDrawingId,
        style: { ...currentStyle },
        visible: true,
        locked: false,
        position,
        text: '',  // Start with empty text, user will type
        fontSize: defaultTextStyle.fontSize,
        fontFamily: defaultTextStyle.fontFamily,
        rotation: 0,
        alignment: defaultTextStyle.alignment,
        verticalAlignment: 'top',
        bold: defaultTextStyle.bold,
        italic: defaultTextStyle.italic,
        underline: defaultTextStyle.underline,
        color: defaultTextStyle.color,
        lineHeight: 1.2,
      };

      addShape(textShape);

      // Immediately enter edit mode for the new text
      startTextEditing(textShape.id);

      return textShape.id;
    },
    [activeLayerId, activeDrawingId, currentStyle, defaultTextStyle, addShape, startTextEditing]
  );

  /**
   * Handle click for text tool - single click to place and start editing
   */
  const handleTextClick = useCallback(
    (worldPos: Point): boolean => {
      createText(worldPos);
      return true;
    },
    [createText]
  );

  /**
   * Handle double-click to edit existing text
   */
  const handleTextDoubleClick = useCallback(
    (shapeId: string): boolean => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape && shape.type === 'text') {
        selectShape(shapeId, false);
        startTextEditing(shapeId);
        return true;
      }
      return false;
    },
    [shapes, selectShape, startTextEditing]
  );

  return {
    handleTextClick,
    handleTextDoubleClick,
    createText,
  };
}
