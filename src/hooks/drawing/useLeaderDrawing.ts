/**
 * useLeaderDrawing - Handles leader text drawing (2-click workflow)
 *
 * Workflow:
 * 1. Click 1: Place arrow tip
 * 2. Click 2: Place text position (end of leader line) → creates shape, opens text editor
 */

import { useCallback } from 'react';
import { useAppStore, generateId } from '../../state/appStore';
import type { Point, TextShape } from '../../types/geometry';
import { CAD_DEFAULT_LINE_HEIGHT } from '../../constants/cadDefaults';

export function useLeaderDrawing() {
  const {
    activeTool,
    activeLayerId,
    activeDrawingId,
    currentStyle,
    addShape,
    defaultTextStyle,
    defaultLeaderConfig,
    startTextEditing,
    drawingPoints,
    addDrawingPoint,
    clearDrawingPoints,
    setDrawingPreview,
    activeTextStyleId,
    textStyles,
  } = useAppStore();

  const isLeaderActive = activeTool === 'leader';
  const isDrawing = isLeaderActive && drawingPoints.length > 0;

  /**
   * Handle click for leader drawing.
   * Click 1 = arrow tip, Click 2 = text position → create shape immediately.
   */
  const handleLeaderClick = useCallback(
    (snappedPos: Point) => {
      if (drawingPoints.length === 0) {
        // First click: arrow tip
        addDrawingPoint(snappedPos);
        return;
      }

      // Second click: text position — create the leader text shape
      const arrowTip = drawingPoints[0];
      const textPosition = snappedPos;

      // leaderPoints: from text toward arrow tip. Single entry = the arrow tip.
      const leaderPoints = [arrowTip];

      // Resolve active text style
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
        position: textPosition,
        text: '',
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
        leaderPoints,
        leaderConfig: { ...defaultLeaderConfig },
      };

      addShape(textShape);
      startTextEditing(textShape.id);

      clearDrawingPoints();
      setDrawingPreview(null);
    },
    [
      drawingPoints, activeLayerId, activeDrawingId, currentStyle,
      defaultTextStyle, defaultLeaderConfig, addShape, startTextEditing,
      clearDrawingPoints, setDrawingPreview, addDrawingPoint,
      activeTextStyleId, textStyles,
    ]
  );

  /**
   * Update leader preview during mouse move
   */
  const updateLeaderPreview = useCallback(
    (snappedPos: Point) => {
      if (drawingPoints.length === 0) return;

      setDrawingPreview({
        type: 'leader',
        points: [...drawingPoints],
        currentPoint: snappedPos,
      });
    },
    [drawingPoints, setDrawingPreview]
  );

  /**
   * Cancel leader drawing
   */
  const cancelLeader = useCallback(() => {
    clearDrawingPoints();
    setDrawingPreview(null);
  }, [clearDrawingPoints, setDrawingPreview]);

  /**
   * Get the base point for snap tracking (arrow tip)
   */
  const getLeaderBasePoint = useCallback((): Point | null => {
    if (drawingPoints.length === 0) return null;
    return drawingPoints[0];
  }, [drawingPoints]);

  return {
    handleLeaderClick,
    updateLeaderPreview,
    cancelLeader,
    getLeaderBasePoint,
    isLeaderActive,
    isLeaderDrawing: isDrawing,
  };
}
