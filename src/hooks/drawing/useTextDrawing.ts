/**
 * useTextDrawing - Handles text shape creation and editing
 */

import { useCallback } from 'react';
import { useAppStore, generateId } from '../../state/appStore';
import type { Point, TextShape } from '../../types/geometry';
import { CAD_DEFAULT_LINE_HEIGHT } from '../../constants/cadDefaults';

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
    activeTextStyleId,
    textStyles,
  } = useAppStore();

  /**
   * Create a text shape at the specified position and enter edit mode
   */
  const createText = useCallback(
    (position: Point): string => {
      // Resolve active text style if set
      const activeStyle = activeTextStyleId
        ? textStyles.find(s => s.id === activeTextStyleId)
        : null;

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
        fontSize: activeStyle?.fontSize ?? defaultTextStyle.fontSize,
        fontFamily: activeStyle?.fontFamily ?? defaultTextStyle.fontFamily,
        rotation: 0,
        alignment: activeStyle?.alignment ?? defaultTextStyle.alignment,
        verticalAlignment: activeStyle?.verticalAlignment ?? 'top',
        bold: activeStyle?.bold ?? defaultTextStyle.bold,
        italic: activeStyle?.italic ?? defaultTextStyle.italic,
        underline: activeStyle?.underline ?? defaultTextStyle.underline,
        color: activeStyle?.color ?? defaultTextStyle.color,
        lineHeight: activeStyle?.lineHeight ?? CAD_DEFAULT_LINE_HEIGHT,
        strikethrough: activeStyle?.strikethrough,
        textCase: activeStyle?.textCase,
        letterSpacing: activeStyle?.letterSpacing,
        widthFactor: activeStyle?.widthFactor,
        obliqueAngle: activeStyle?.obliqueAngle,
        paragraphSpacing: activeStyle?.paragraphSpacing,
        isModelText: activeStyle?.isModelText,
        backgroundMask: activeStyle?.backgroundMask,
        backgroundColor: activeStyle?.backgroundColor,
        backgroundPadding: activeStyle?.backgroundPadding,
        textStyleId: activeTextStyleId ?? undefined,
      };

      addShape(textShape);

      // Immediately enter edit mode for the new text
      startTextEditing(textShape.id);

      return textShape.id;
    },
    [activeLayerId, activeDrawingId, currentStyle, defaultTextStyle, addShape, startTextEditing, activeTextStyleId, textStyles]
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
