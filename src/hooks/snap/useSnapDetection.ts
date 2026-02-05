/**
 * useSnapDetection - Handles snap point detection and tracking
 */

import { useCallback } from 'react';
import { useAppStore } from '../../state/appStore';
import type { Point, SnapPoint } from '../../types/geometry';
import { findNearestSnapPoint } from '../../engine/geometry/SnapUtils';
import { applyTracking, type TrackingSettings } from '../../engine/geometry/Tracking';

export interface SnapResult {
  point: Point;
  snapInfo?: SnapPoint;
}

export function useSnapDetection() {
  const {
    viewport,
    shapes,
    activeDrawingId,
    snapEnabled,
    gridSize,
    gridVisible,
    activeSnaps,
    snapTolerance,
    setCurrentSnapPoint,
    // Tracking state
    trackingEnabled,
    polarTrackingEnabled,
    orthoMode,
    objectTrackingEnabled,
    polarAngleIncrement,
    setCurrentTrackingLines,
    setTrackingPoint,
    setDirectDistanceAngle,
    // Drawing points for in-progress polyline snapping
    drawingPoints,
  } = useAppStore();

  // Filter shapes to only include visible shapes in the current drawing
  const drawingShapes = shapes.filter(
    (s) => s.drawingId === activeDrawingId && s.visible
  );

  /**
   * Find and snap to the nearest snap point (geometry or grid), with tracking support
   * Returns both the snapped point and the snap info (for dimension associativity)
   * @param point - Current cursor position in world coordinates
   * @param basePoint - Base point for tracking (e.g., first click point when drawing)
   * @param sourceSnapAngle - Angle of the source shape from first snap (for perpendicular tracking)
   */
  const snapPoint = useCallback(
    (point: Point, basePoint?: Point, sourceSnapAngle?: number): SnapResult => {
      let resultPoint = point;
      let usedTracking = false;

      // Apply tracking if enabled and we have a base point (drawing mode)
      if (trackingEnabled && basePoint) {
        const trackingSettings: TrackingSettings = {
          enabled: true,
          polarEnabled: polarTrackingEnabled || orthoMode,
          orthoEnabled: orthoMode,
          objectTrackingEnabled: objectTrackingEnabled,
          parallelTrackingEnabled: activeSnaps.includes('parallel'), // Respect snap setting
          perpendicularTrackingEnabled: activeSnaps.includes('perpendicular'), // Respect snap setting
          polarAngleIncrement: orthoMode ? 90 : polarAngleIncrement,
          trackingTolerance: snapTolerance,
          sourceSnapAngle: sourceSnapAngle, // Pass source angle for perpendicular/parallel tracking
        };

        // Convert shapes to format expected by tracking (lines and beams in current drawing)
        const trackableShapes = drawingShapes
          .filter((s) => s.type === 'line' || s.type === 'beam')
          .map((s) => ({
            id: s.id,
            type: s.type,
            start: (s as any).start,
            end: (s as any).end,
          }));

        const trackingResult = applyTracking(
          point,
          basePoint,
          trackableShapes,
          trackingSettings
        );

        if (trackingResult) {
          resultPoint = trackingResult.point;
          setCurrentTrackingLines(trackingResult.trackingLines);
          setTrackingPoint(trackingResult.point);
          usedTracking = true;

          // Store the tracking angle for direct distance entry
          if (trackingResult.trackingLines.length > 0) {
            setDirectDistanceAngle(trackingResult.trackingLines[0].angle);
          } else {
            // Calculate angle from base point to tracking point
            const dx = trackingResult.point.x - basePoint.x;
            const dy = trackingResult.point.y - basePoint.y;
            setDirectDistanceAngle(Math.atan2(dy, dx));
          }
        } else {
          setCurrentTrackingLines([]);
          setTrackingPoint(null);
          setDirectDistanceAngle(null);
        }
      } else {
        setCurrentTrackingLines([]);
        setTrackingPoint(null);
        setDirectDistanceAngle(null);
      }

      // Apply object snap (can override tracking if closer)
      if (snapEnabled) {
        const worldTolerance = snapTolerance / viewport.zoom;

        // Calculate adjusted grid size to match visual grid (same logic as GridLayer)
        let adjustedGridSize = gridSize;
        while (adjustedGridSize * viewport.zoom < 10) {
          adjustedGridSize *= 5;
        }
        while (adjustedGridSize * viewport.zoom > 100) {
          adjustedGridSize /= 5;
        }

        // Only include grid snap if grid is visible
        const effectiveSnaps = gridVisible
          ? activeSnaps
          : activeSnaps.filter(s => s !== 'grid');

        const nearestSnap = findNearestSnapPoint(
          usedTracking ? resultPoint : point,
          drawingShapes,
          effectiveSnaps,
          worldTolerance,
          adjustedGridSize,
          basePoint
        );

        // Also check in-progress drawing points for polyline/spline snapping
        let nearestDrawingPointSnap: SnapPoint | null = null;
        const cursorPoint = usedTracking ? resultPoint : point;

        if (drawingPoints.length > 1) {
          let minDist = Infinity;

          // Check endpoints (all points except the last one - that's where we're drawing from)
          if (activeSnaps.includes('endpoint')) {
            for (let i = 0; i < drawingPoints.length - 1; i++) {
              const dp = drawingPoints[i];
              const dist = Math.sqrt(
                (dp.x - cursorPoint.x) ** 2 + (dp.y - cursorPoint.y) ** 2
              );
              if (dist <= worldTolerance && dist < minDist) {
                minDist = dist;
                nearestDrawingPointSnap = {
                  point: dp,
                  type: 'endpoint',
                  sourceShapeId: 'in-progress-drawing',
                };
              }
            }
          }

          // Check midpoints of segments (all segments except the one being drawn)
          if (activeSnaps.includes('midpoint')) {
            for (let i = 0; i < drawingPoints.length - 2; i++) {
              const p1 = drawingPoints[i];
              const p2 = drawingPoints[i + 1];
              const midpoint = {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2,
              };
              const dist = Math.sqrt(
                (midpoint.x - cursorPoint.x) ** 2 + (midpoint.y - cursorPoint.y) ** 2
              );
              if (dist <= worldTolerance && dist < minDist) {
                minDist = dist;
                nearestDrawingPointSnap = {
                  point: midpoint,
                  type: 'midpoint',
                  sourceShapeId: 'in-progress-drawing',
                };
              }
            }
          }
        }

        // Return the closest snap point (either from existing shapes or drawing points)
        if (nearestSnap && nearestDrawingPointSnap) {
          const cursorPoint = usedTracking ? resultPoint : point;
          const distToShape = Math.sqrt(
            (nearestSnap.point.x - cursorPoint.x) ** 2 +
            (nearestSnap.point.y - cursorPoint.y) ** 2
          );
          const distToDrawing = Math.sqrt(
            (nearestDrawingPointSnap.point.x - cursorPoint.x) ** 2 +
            (nearestDrawingPointSnap.point.y - cursorPoint.y) ** 2
          );
          const bestSnap = distToDrawing < distToShape ? nearestDrawingPointSnap : nearestSnap;
          setCurrentSnapPoint(bestSnap);
          return { point: bestSnap.point, snapInfo: bestSnap };
        } else if (nearestSnap) {
          setCurrentSnapPoint(nearestSnap);
          return { point: nearestSnap.point, snapInfo: nearestSnap };
        } else if (nearestDrawingPointSnap) {
          setCurrentSnapPoint(nearestDrawingPointSnap);
          return { point: nearestDrawingPointSnap.point, snapInfo: nearestDrawingPointSnap };
        }
      }

      setCurrentSnapPoint(null);
      return { point: resultPoint };
    },
    [
      snapEnabled,
      drawingShapes,
      activeSnaps,
      snapTolerance,
      gridSize,
      gridVisible,
      viewport.zoom,
      setCurrentSnapPoint,
      trackingEnabled,
      polarTrackingEnabled,
      orthoMode,
      objectTrackingEnabled,
      polarAngleIncrement,
      setCurrentTrackingLines,
      setTrackingPoint,
      setDirectDistanceAngle,
      drawingPoints,
    ]
  );

  /**
   * Clear tracking state
   */
  const clearTracking = useCallback(() => {
    setCurrentTrackingLines([]);
    setTrackingPoint(null);
    setCurrentSnapPoint(null);
    setDirectDistanceAngle(null);
  }, [setCurrentTrackingLines, setTrackingPoint, setCurrentSnapPoint, setDirectDistanceAngle]);

  return {
    snapPoint,
    clearTracking,
  };
}
