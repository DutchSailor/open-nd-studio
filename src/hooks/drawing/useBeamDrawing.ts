/**
 * useBeamDrawing - Handles beam drawing (click start, click end)
 */

import { useCallback } from 'react';
import { useAppStore, generateId } from '../../state/appStore';
import type { Point, BeamShape, BeamMaterial, BeamJustification } from '../../types/geometry';
import { snapToAngle } from '../../engine/geometry/GeometryUtils';

export function useBeamDrawing() {
  const {
    activeLayerId,
    activeDrawingId,
    currentStyle,
    addShape,
    drawingPoints,
    addDrawingPoint,
    clearDrawingPoints,
    setDrawingPreview,
    pendingBeam,
    clearPendingBeam,
  } = useAppStore();

  /**
   * Create a beam shape
   */
  const createBeam = useCallback(
    (
      start: Point,
      end: Point,
      profileType: string,
      profileParameters: Record<string, number | string | boolean>,
      flangeWidth: number,
      options?: {
        presetId?: string;
        presetName?: string;
        material?: BeamMaterial;
        justification?: BeamJustification;
        showCenterline?: boolean;
        showLabel?: boolean;
        labelText?: string;
      }
    ) => {
      const beamShape: BeamShape = {
        id: generateId(),
        type: 'beam',
        layerId: activeLayerId,
        drawingId: activeDrawingId,
        style: { ...currentStyle },
        visible: true,
        locked: false,
        start,
        end,
        profileType,
        profileParameters,
        presetId: options?.presetId,
        presetName: options?.presetName,
        flangeWidth,
        justification: options?.justification || 'center',
        material: options?.material || 'steel',
        showCenterline: options?.showCenterline ?? true,
        showLabel: options?.showLabel ?? true,
        labelText: options?.labelText,
        rotation: 0,
      };
      addShape(beamShape);
      return beamShape.id;
    },
    [activeLayerId, activeDrawingId, currentStyle, addShape]
  );

  /**
   * Handle click for beam drawing
   * @param snappedPos - The snapped position
   * @param shiftKey - Whether shift key is pressed
   * @param sourceAngle - Angle of the snapped source shape (for perpendicular tracking)
   */
  const handleBeamClick = useCallback(
    (snappedPos: Point, shiftKey: boolean, sourceAngle?: number) => {
      if (!pendingBeam) return false;

      if (drawingPoints.length === 0) {
        // First click: set start point, store source angle for tracking
        addDrawingPoint(snappedPos, sourceAngle);
        return true;
      } else {
        // Second click: set end point and create beam
        const startPoint = drawingPoints[0];
        let finalPos = shiftKey ? snapToAngle(startPoint, snappedPos) : snappedPos;

        const dx = Math.abs(finalPos.x - startPoint.x);
        const dy = Math.abs(finalPos.y - startPoint.y);

        // Only create if there's a meaningful distance
        if (dx > 1 || dy > 1) {
          createBeam(
            startPoint,
            finalPos,
            pendingBeam.profileType,
            pendingBeam.parameters,
            pendingBeam.flangeWidth,
            {
              presetId: pendingBeam.presetId,
              presetName: pendingBeam.presetName,
              material: pendingBeam.material,
              justification: pendingBeam.justification,
              showCenterline: pendingBeam.showCenterline,
              showLabel: pendingBeam.showLabel,
            }
          );
        }

        clearDrawingPoints();
        setDrawingPreview(null);
        // Keep pendingBeam active so user can draw multiple beams consecutively
        return true;
      }
    },
    [pendingBeam, drawingPoints, addDrawingPoint, clearDrawingPoints, setDrawingPreview, createBeam]
  );

  /**
   * Update beam preview
   */
  const updateBeamPreview = useCallback(
    (snappedPos: Point, shiftKey: boolean) => {
      if (!pendingBeam || drawingPoints.length === 0) return;

      const startPoint = drawingPoints[0];
      const previewPos = shiftKey ? snapToAngle(startPoint, snappedPos) : snappedPos;

      setDrawingPreview({
        type: 'beam',
        start: startPoint,
        end: previewPos,
        flangeWidth: pendingBeam.flangeWidth,
        showCenterline: pendingBeam.showCenterline,
      });
    },
    [pendingBeam, drawingPoints, setDrawingPreview]
  );

  /**
   * Cancel beam drawing
   */
  const cancelBeamDrawing = useCallback(() => {
    clearDrawingPoints();
    setDrawingPreview(null);
    clearPendingBeam();
  }, [clearDrawingPoints, setDrawingPreview, clearPendingBeam]);

  /**
   * Get status message for beam drawing
   */
  const getBeamDrawingStatus = useCallback((): string => {
    if (!pendingBeam) return '';
    if (drawingPoints.length === 0) return 'Click to set beam start point';
    return 'Click to set beam end point (Shift for angle snap)';
  }, [pendingBeam, drawingPoints]);

  /**
   * Get the base point for tracking (first click point)
   */
  const getBeamBasePoint = useCallback((): Point | null => {
    if (!pendingBeam || drawingPoints.length === 0) return null;
    return drawingPoints[0];
  }, [pendingBeam, drawingPoints]);

  return {
    handleBeamClick,
    updateBeamPreview,
    cancelBeamDrawing,
    getBeamDrawingStatus,
    getBeamBasePoint,
    createBeam,
    isBeamDrawingActive: !!pendingBeam,
    hasFirstPoint: drawingPoints.length > 0,
  };
}
