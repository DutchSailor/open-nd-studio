import { useCallback, useRef, useState } from 'react';
import { useAppStore, generateId, type SelectionBox } from '../state/appStore';
import type { Point, LineShape, RectangleShape, CircleShape, PolylineShape, Shape } from '../types/geometry';
import { findNearestSnapPoint } from '../utils/snapUtils';
import { applyTracking, type TrackingSettings } from '../core/geometry/Tracking';

interface PanState {
  isPanning: boolean;
  startPoint: Point;
  button: number;
}

interface SelectionState {
  isSelecting: boolean;
  startPoint: Point;
  justFinishedBoxSelection: boolean;
}

export function useCanvasEvents(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const panState = useRef<PanState>({
    isPanning: false,
    startPoint: { x: 0, y: 0 },
    button: 0,
  });

  const selectionState = useRef<SelectionState>({
    isSelecting: false,
    startPoint: { x: 0, y: 0 },
    justFinishedBoxSelection: false,
  });

  // Track panning state for cursor changes
  const [isPanning, setIsPanning] = useState(false);

  const {
    viewport,
    setViewport,
    activeTool,
    addShape,
    currentStyle,
    activeLayerId,
    shapes,
    selectShape,
    selectShapes,
    deselectAll,
    snapEnabled,
    gridSize,
    activeSnaps,
    snapTolerance,
    setCurrentSnapPoint,
    setDrawingPreview,
    drawingPoints,
    addDrawingPoint,
    clearDrawingPoints,
    setSelectionBox,
    hasActiveModifyCommand,
    commandIsSelecting,
    setPendingCommandPoint,
    setPendingCommandSelection,
    // Tracking state
    trackingEnabled,
    polarTrackingEnabled,
    orthoMode,
    objectTrackingEnabled,
    polarAngleIncrement,
    setCurrentTrackingLines,
    setTrackingPoint,
    // Circle mode
    circleMode,
    // Rectangle mode
    rectangleMode,
  } = useAppStore();

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      return {
        x: (screenX - viewport.offsetX) / viewport.zoom,
        y: (screenY - viewport.offsetY) / viewport.zoom,
      };
    },
    [viewport]
  );

  // Find and snap to the nearest snap point (geometry or grid), with tracking support
  const snapPoint = useCallback(
    (point: Point, basePoint?: Point): Point => {
      let resultPoint = point;
      let usedTracking = false;

      // Apply tracking if enabled and we have a base point (drawing mode)
      if (trackingEnabled && basePoint) {
        const trackingSettings: TrackingSettings = {
          enabled: true,
          polarEnabled: polarTrackingEnabled || orthoMode,
          orthoEnabled: orthoMode,
          objectTrackingEnabled: objectTrackingEnabled,
          polarAngleIncrement: orthoMode ? 90 : polarAngleIncrement,
          trackingTolerance: snapTolerance,
        };

        // Convert shapes to format expected by tracking
        const trackableShapes = shapes
          .filter((s) => s.type === 'line')
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
        } else {
          setCurrentTrackingLines([]);
          setTrackingPoint(null);
        }
      } else {
        setCurrentTrackingLines([]);
        setTrackingPoint(null);
      }

      // Apply object snap (can override tracking if closer)
      if (snapEnabled) {
        const worldTolerance = snapTolerance / viewport.zoom;

        const nearestSnap = findNearestSnapPoint(
          usedTracking ? resultPoint : point,
          shapes,
          activeSnaps,
          worldTolerance,
          gridSize
        );

        if (nearestSnap) {
          // Object snap takes priority over tracking
          setCurrentSnapPoint(nearestSnap);
          return nearestSnap.point;
        }
      }

      setCurrentSnapPoint(null);
      return resultPoint;
    },
    [
      snapEnabled,
      shapes,
      activeSnaps,
      snapTolerance,
      gridSize,
      viewport.zoom,
      setCurrentSnapPoint,
      trackingEnabled,
      polarTrackingEnabled,
      orthoMode,
      objectTrackingEnabled,
      polarAngleIncrement,
      setCurrentTrackingLines,
      setTrackingPoint,
    ]
  );

  // Snap point to 45-degree angle increments relative to base point
  const snapToAngle = useCallback(
    (basePoint: Point, targetPoint: Point): Point => {
      const dx = targetPoint.x - basePoint.x;
      const dy = targetPoint.y - basePoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) return targetPoint;

      // Calculate angle in radians
      const angle = Math.atan2(dy, dx);

      // Convert to degrees and snap to nearest 45
      const degrees = angle * (180 / Math.PI);
      const snappedDegrees = Math.round(degrees / 45) * 45;

      // Convert back to radians
      const snappedAngle = snappedDegrees * (Math.PI / 180);

      // Calculate new point at snapped angle with same distance
      return {
        x: basePoint.x + distance * Math.cos(snappedAngle),
        y: basePoint.y + distance * Math.sin(snappedAngle),
      };
    },
    []
  );

  // Get mouse position from event
  const getMousePos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [canvasRef]
  );

  // Find shape at point
  const findShapeAtPoint = useCallback(
    (worldPoint: Point): string | null => {
      // Search in reverse order (top shapes first)
      for (let i = shapes.length - 1; i >= 0; i--) {
        const shape = shapes[i];
        if (!shape.visible) continue;

        if (isPointNearShape(worldPoint, shape)) {
          return shape.id;
        }
      }
      return null;
    },
    [shapes]
  );

  // Create a line shape
  const createLine = useCallback(
    (start: Point, end: Point) => {
      const lineShape: LineShape = {
        id: generateId(),
        type: 'line',
        layerId: activeLayerId,
        style: { ...currentStyle },
        visible: true,
        locked: false,
        start,
        end,
      };
      addShape(lineShape);
    },
    [activeLayerId, currentStyle, addShape]
  );

  // Create a rectangle shape
  const createRectangle = useCallback(
    (start: Point, end: Point) => {
      const width = end.x - start.x;
      const height = end.y - start.y;
      const rectShape: RectangleShape = {
        id: generateId(),
        type: 'rectangle',
        layerId: activeLayerId,
        style: { ...currentStyle },
        visible: true,
        locked: false,
        topLeft: {
          x: width > 0 ? start.x : end.x,
          y: height > 0 ? start.y : end.y,
        },
        width: Math.abs(width),
        height: Math.abs(height),
        rotation: 0,
      };
      addShape(rectShape);
    },
    [activeLayerId, currentStyle, addShape]
  );

  // Create a circle shape
  const createCircle = useCallback(
    (center: Point, radiusPoint: Point) => {
      const dx = radiusPoint.x - center.x;
      const dy = radiusPoint.y - center.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      const circleShape: CircleShape = {
        id: generateId(),
        type: 'circle',
        layerId: activeLayerId,
        style: { ...currentStyle },
        visible: true,
        locked: false,
        center,
        radius,
      };
      addShape(circleShape);
    },
    [activeLayerId, currentStyle, addShape]
  );

  // Create a polyline shape
  const createPolyline = useCallback(
    (points: Point[], closed: boolean = false) => {
      if (points.length < 2) return;
      const polylineShape: PolylineShape = {
        id: generateId(),
        type: 'polyline',
        layerId: activeLayerId,
        style: { ...currentStyle },
        visible: true,
        locked: false,
        points: [...points],
        closed,
      };
      addShape(polylineShape);
    },
    [activeLayerId, currentStyle, addShape]
  );

  // Handle mouse down (for panning and box selection)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const screenPos = getMousePos(e);

      // Middle mouse button or pan tool - start panning
      if (e.button === 1 || (e.button === 0 && activeTool === 'pan')) {
        panState.current = {
          isPanning: true,
          startPoint: screenPos,
          button: e.button,
        };
        setIsPanning(true);
        return;
      }

      // Left click in select mode or during command selection phase - check if clicking on empty space to start box selection
      if (e.button === 0 && (activeTool === 'select' || (hasActiveModifyCommand && commandIsSelecting))) {
        const worldPos = screenToWorld(screenPos.x, screenPos.y);
        const shapeId = findShapeAtPoint(worldPos);

        if (!shapeId) {
          // Clicking on empty space - start box selection
          selectionState.current = {
            isSelecting: true,
            startPoint: screenPos,
            justFinishedBoxSelection: false,
          };
          // Don't deselect yet - will deselect if it's just a click (not a drag)
        }
      }
    },
    [getMousePos, activeTool, screenToWorld, findShapeAtPoint, hasActiveModifyCommand, commandIsSelecting]
  );

  // Handle click (for drawing - AutoCAD style)
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Ignore if it was a pan operation
      if (panState.current.isPanning) return;

      // Ignore if we just finished a box selection
      if (selectionState.current.justFinishedBoxSelection) {
        selectionState.current.justFinishedBoxSelection = false;
        return;
      }

      // Only handle left click
      if (e.button !== 0) return;

      const screenPos = getMousePos(e);
      const worldPos = screenToWorld(screenPos.x, screenPos.y);
      // Pass base point for tracking when in drawing mode
      const basePoint = drawingPoints.length > 0 ? drawingPoints[drawingPoints.length - 1] : undefined;
      const snappedPos = snapPoint(worldPos, basePoint);

      // If there's an active modify command in selection phase, try to select shapes
      if (hasActiveModifyCommand && commandIsSelecting) {
        const shapeId = findShapeAtPoint(worldPos);
        if (shapeId) {
          setPendingCommandSelection([shapeId]);
        }
        return;
      }

      // If there's an active modify command (not in selection phase), send point to command system
      if (hasActiveModifyCommand) {
        setPendingCommandPoint(snappedPos);
        return;
      }

      switch (activeTool) {
        case 'select': {
          const shapeId = findShapeAtPoint(worldPos);
          if (shapeId) {
            selectShape(shapeId, e.shiftKey);
          } else {
            deselectAll();
          }
          break;
        }

        case 'line': {
          if (drawingPoints.length === 0) {
            // First click - set start point
            addDrawingPoint(snappedPos);
          } else {
            // Subsequent clicks - create line from last point to this point
            const lastPoint = drawingPoints[drawingPoints.length - 1];
            // Apply angle snap if Shift is held
            const finalPos = e.shiftKey ? snapToAngle(lastPoint, snappedPos) : snappedPos;
            const dx = Math.abs(finalPos.x - lastPoint.x);
            const dy = Math.abs(finalPos.y - lastPoint.y);

            // Only create if there's actual distance
            if (dx > 1 || dy > 1) {
              createLine(lastPoint, finalPos);
              // Continue drawing from this point
              addDrawingPoint(finalPos);
            }
          }
          break;
        }

        case 'rectangle': {
          switch (rectangleMode) {
            case 'corner': {
              // Corner to corner mode (default)
              if (drawingPoints.length === 0) {
                // First click - set first corner
                addDrawingPoint(snappedPos);
              } else {
                // Second click - create rectangle and finish
                const startPoint = drawingPoints[0];
                const dx = Math.abs(snappedPos.x - startPoint.x);
                const dy = Math.abs(snappedPos.y - startPoint.y);

                if (dx > 1 || dy > 1) {
                  createRectangle(startPoint, snappedPos);
                }
                clearDrawingPoints();
                setDrawingPreview(null);
              }
              break;
            }

            case 'center': {
              // Center mode: click center, then corner
              if (drawingPoints.length === 0) {
                // First click - set center
                addDrawingPoint(snappedPos);
              } else {
                // Second click - corner point, calculate rectangle from center
                const center = drawingPoints[0];
                const dx = Math.abs(snappedPos.x - center.x);
                const dy = Math.abs(snappedPos.y - center.y);

                if (dx > 1 || dy > 1) {
                  // Calculate top-left from center and half-dimensions
                  const topLeft = {
                    x: center.x - dx,
                    y: center.y - dy,
                  };
                  const rectShape: RectangleShape = {
                    id: generateId(),
                    type: 'rectangle',
                    layerId: activeLayerId,
                    style: { ...currentStyle },
                    visible: true,
                    locked: false,
                    topLeft,
                    width: dx * 2,
                    height: dy * 2,
                    rotation: 0,
                  };
                  addShape(rectShape);
                }
                clearDrawingPoints();
                setDrawingPreview(null);
              }
              break;
            }

            case '3point': {
              // 3-point mode: corner, width direction, height
              if (drawingPoints.length === 0) {
                // First click - set first corner
                addDrawingPoint(snappedPos);
              } else if (drawingPoints.length === 1) {
                // Second click - set width direction and length
                const dx = snappedPos.x - drawingPoints[0].x;
                const dy = snappedPos.y - drawingPoints[0].y;
                const length = Math.sqrt(dx * dx + dy * dy);

                if (length > 1) {
                  addDrawingPoint(snappedPos);
                }
              } else {
                // Third click - set height, create rotated rectangle
                const p1 = drawingPoints[0]; // First corner
                const p2 = drawingPoints[1]; // Defines width direction

                // Calculate width vector and angle
                const widthDx = p2.x - p1.x;
                const widthDy = p2.y - p1.y;
                const width = Math.sqrt(widthDx * widthDx + widthDy * widthDy);
                const angle = Math.atan2(widthDy, widthDx);

                // Calculate height by projecting cursor onto perpendicular
                const perpAngle = angle + Math.PI / 2;
                const toCursor = { x: snappedPos.x - p1.x, y: snappedPos.y - p1.y };
                const height = toCursor.x * Math.cos(perpAngle) + toCursor.y * Math.sin(perpAngle);

                if (width > 1 && Math.abs(height) > 1) {
                  // Determine top-left based on height direction
                  let topLeft: Point;
                  if (height >= 0) {
                    topLeft = { ...p1 };
                  } else {
                    // Height is negative, shift top-left
                    topLeft = {
                      x: p1.x + Math.abs(height) * Math.cos(perpAngle + Math.PI),
                      y: p1.y + Math.abs(height) * Math.sin(perpAngle + Math.PI),
                    };
                  }

                  const rectShape: RectangleShape = {
                    id: generateId(),
                    type: 'rectangle',
                    layerId: activeLayerId,
                    style: { ...currentStyle },
                    visible: true,
                    locked: false,
                    topLeft,
                    width,
                    height: Math.abs(height),
                    rotation: angle,
                  };
                  addShape(rectShape);
                }
                clearDrawingPoints();
                setDrawingPreview(null);
              }
              break;
            }
          }
          break;
        }

        case 'circle': {
          switch (circleMode) {
            case 'center-radius':
            case 'center-diameter': {
              if (drawingPoints.length === 0) {
                // First click - set center
                addDrawingPoint(snappedPos);
              } else {
                // Second click - set radius/diameter point and create circle
                const center = drawingPoints[0];
                const dx = snappedPos.x - center.x;
                const dy = snappedPos.y - center.y;
                let radius = Math.sqrt(dx * dx + dy * dy);

                // For diameter mode, the distance is the diameter
                if (circleMode === 'center-diameter') {
                  radius = radius / 2;
                }

                if (radius > 1) {
                  const circleShape: CircleShape = {
                    id: generateId(),
                    type: 'circle',
                    layerId: activeLayerId,
                    style: { ...currentStyle },
                    visible: true,
                    locked: false,
                    center,
                    radius,
                  };
                  addShape(circleShape);
                }
                clearDrawingPoints();
                setDrawingPreview(null);
              }
              break;
            }

            case '2point': {
              if (drawingPoints.length === 0) {
                // First click - first point of diameter
                addDrawingPoint(snappedPos);
              } else {
                // Second click - second point of diameter, create circle
                const p1 = drawingPoints[0];
                const p2 = snappedPos;
                const center = {
                  x: (p1.x + p2.x) / 2,
                  y: (p1.y + p2.y) / 2,
                };
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const radius = Math.sqrt(dx * dx + dy * dy) / 2;

                if (radius > 1) {
                  const circleShape: CircleShape = {
                    id: generateId(),
                    type: 'circle',
                    layerId: activeLayerId,
                    style: { ...currentStyle },
                    visible: true,
                    locked: false,
                    center,
                    radius,
                  };
                  addShape(circleShape);
                }
                clearDrawingPoints();
                setDrawingPreview(null);
              }
              break;
            }

            case '3point': {
              if (drawingPoints.length < 2) {
                // First or second click - add point
                addDrawingPoint(snappedPos);
              } else {
                // Third click - create circle through 3 points
                const p1 = drawingPoints[0];
                const p2 = drawingPoints[1];
                const p3 = snappedPos;

                // Calculate circumcenter of triangle formed by 3 points
                const circle = calculateCircleFrom3Points(p1, p2, p3);

                if (circle && circle.radius > 1) {
                  const circleShape: CircleShape = {
                    id: generateId(),
                    type: 'circle',
                    layerId: activeLayerId,
                    style: { ...currentStyle },
                    visible: true,
                    locked: false,
                    center: circle.center,
                    radius: circle.radius,
                  };
                  addShape(circleShape);
                }
                clearDrawingPoints();
                setDrawingPreview(null);
              }
              break;
            }
          }
          break;
        }

        case 'polyline': {
          // Add point to polyline - continues until user presses Enter/Escape or right-clicks
          // Apply angle snap if Shift is held and there's a previous point
          if (e.shiftKey && drawingPoints.length > 0) {
            const lastPoint = drawingPoints[drawingPoints.length - 1];
            const finalPos = snapToAngle(lastPoint, snappedPos);
            addDrawingPoint(finalPos);
          } else {
            addDrawingPoint(snappedPos);
          }
          break;
        }

        case 'pan':
          // Pan tool doesn't use click for drawing
          break;

        default:
          break;
      }
    },
    [
      getMousePos,
      screenToWorld,
      snapPoint,
      snapToAngle,
      activeTool,
      circleMode,
      rectangleMode,
      findShapeAtPoint,
      selectShape,
      deselectAll,
      drawingPoints,
      addDrawingPoint,
      clearDrawingPoints,
      createLine,
      createRectangle,
      createCircle,
      createPolyline,
      setDrawingPreview,
      hasActiveModifyCommand,
      commandIsSelecting,
      setPendingCommandPoint,
      setPendingCommandSelection,
      activeLayerId,
      currentStyle,
      addShape,
    ]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const screenPos = getMousePos(e);
      const worldPos = screenToWorld(screenPos.x, screenPos.y);
      // Pass base point for tracking when in drawing mode
      const basePoint = drawingPoints.length > 0 ? drawingPoints[drawingPoints.length - 1] : undefined;
      const snappedPos = snapPoint(worldPos, basePoint);

      // Handle panning
      if (panState.current.isPanning) {
        const delta = {
          x: screenPos.x - panState.current.startPoint.x,
          y: screenPos.y - panState.current.startPoint.y,
        };
        panState.current.startPoint = screenPos;

        setViewport({
          offsetX: viewport.offsetX + delta.x,
          offsetY: viewport.offsetY + delta.y,
        });
        return;
      }

      // Handle box selection
      if (selectionState.current.isSelecting) {
        const startPoint = selectionState.current.startPoint;
        // Determine mode based on direction: left-to-right = window, right-to-left = crossing
        const mode = screenPos.x >= startPoint.x ? 'window' : 'crossing';

        setSelectionBox({
          start: startPoint,
          end: screenPos,
          mode,
        });
        return;
      }

      // Update drawing preview (rubber band) when in drawing mode
      if (drawingPoints.length > 0) {
        const lastPoint = drawingPoints[drawingPoints.length - 1];

        switch (activeTool) {
          case 'line': {
            // Apply angle snap if Shift is held
            const previewPos = e.shiftKey ? snapToAngle(lastPoint, snappedPos) : snappedPos;
            setDrawingPreview({
              type: 'line',
              start: lastPoint,
              end: previewPos,
            });
            break;
          }

          case 'rectangle': {
            switch (rectangleMode) {
              case 'corner': {
                // Corner to corner preview
                setDrawingPreview({
                  type: 'rectangle',
                  start: drawingPoints[0],
                  end: snappedPos,
                });
                break;
              }

              case 'center': {
                // Center mode: calculate corners from center
                const center = drawingPoints[0];
                const dx = Math.abs(snappedPos.x - center.x);
                const dy = Math.abs(snappedPos.y - center.y);
                setDrawingPreview({
                  type: 'rectangle',
                  start: { x: center.x - dx, y: center.y - dy },
                  end: { x: center.x + dx, y: center.y + dy },
                });
                break;
              }

              case '3point': {
                if (drawingPoints.length === 1) {
                  // Show line from first corner defining width direction
                  setDrawingPreview({
                    type: 'line',
                    start: drawingPoints[0],
                    end: snappedPos,
                  });
                } else if (drawingPoints.length === 2) {
                  // Show rotated rectangle preview
                  const p1 = drawingPoints[0];
                  const p2 = drawingPoints[1];

                  // Calculate angle from width direction
                  const widthDx = p2.x - p1.x;
                  const widthDy = p2.y - p1.y;
                  const angle = Math.atan2(widthDy, widthDx);

                  // Calculate height by projecting cursor onto perpendicular
                  const perpAngle = angle + Math.PI / 2;
                  const toCursor = { x: snappedPos.x - p1.x, y: snappedPos.y - p1.y };
                  const height = toCursor.x * Math.cos(perpAngle) + toCursor.y * Math.sin(perpAngle);

                  // Calculate 4 corners of the rotated rectangle
                  const heightUnit = { x: Math.cos(perpAngle), y: Math.sin(perpAngle) };

                  const corner1 = p1;
                  const corner2 = p2;
                  const corner3 = {
                    x: p2.x + height * heightUnit.x,
                    y: p2.y + height * heightUnit.y,
                  };
                  const corner4 = {
                    x: p1.x + height * heightUnit.x,
                    y: p1.y + height * heightUnit.y,
                  };

                  setDrawingPreview({
                    type: 'rotatedRectangle',
                    corners: [corner1, corner2, corner3, corner4],
                  });
                }
                break;
              }
            }
            break;
          }

          case 'circle': {
            switch (circleMode) {
              case 'center-radius': {
                const dx = snappedPos.x - drawingPoints[0].x;
                const dy = snappedPos.y - drawingPoints[0].y;
                const radius = Math.sqrt(dx * dx + dy * dy);
                setDrawingPreview({
                  type: 'circle',
                  center: drawingPoints[0],
                  radius,
                });
                break;
              }

              case 'center-diameter': {
                const dx = snappedPos.x - drawingPoints[0].x;
                const dy = snappedPos.y - drawingPoints[0].y;
                const radius = Math.sqrt(dx * dx + dy * dy) / 2;
                setDrawingPreview({
                  type: 'circle',
                  center: drawingPoints[0],
                  radius,
                });
                break;
              }

              case '2point': {
                const p1 = drawingPoints[0];
                const p2 = snappedPos;
                const center = {
                  x: (p1.x + p2.x) / 2,
                  y: (p1.y + p2.y) / 2,
                };
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const radius = Math.sqrt(dx * dx + dy * dy) / 2;
                setDrawingPreview({
                  type: 'circle',
                  center,
                  radius,
                });
                break;
              }

              case '3point': {
                if (drawingPoints.length === 1) {
                  // Show line from first point to cursor
                  setDrawingPreview({
                    type: 'line',
                    start: drawingPoints[0],
                    end: snappedPos,
                  });
                } else if (drawingPoints.length === 2) {
                  // Show circle through 3 points
                  const circle = calculateCircleFrom3Points(
                    drawingPoints[0],
                    drawingPoints[1],
                    snappedPos
                  );
                  if (circle) {
                    setDrawingPreview({
                      type: 'circle',
                      center: circle.center,
                      radius: circle.radius,
                    });
                  }
                }
                break;
              }
            }
            break;
          }

          case 'polyline': {
            // Apply angle snap if Shift is held
            const previewPos = e.shiftKey ? snapToAngle(lastPoint, snappedPos) : snappedPos;
            setDrawingPreview({
              type: 'polyline',
              points: drawingPoints,
              currentPoint: previewPos,
            });
            break;
          }
        }
      }
    },
    [
      getMousePos,
      screenToWorld,
      snapPoint,
      snapToAngle,
      activeTool,
      circleMode,
      rectangleMode,
      setViewport,
      viewport,
      setDrawingPreview,
      drawingPoints,
      setSelectionBox,
    ]
  );

  // Get shapes within selection box
  const getShapesInSelectionBox = useCallback(
    (box: SelectionBox): string[] => {
      const startWorld = screenToWorld(box.start.x, box.start.y);
      const endWorld = screenToWorld(box.end.x, box.end.y);

      const minX = Math.min(startWorld.x, endWorld.x);
      const maxX = Math.max(startWorld.x, endWorld.x);
      const minY = Math.min(startWorld.y, endWorld.y);
      const maxY = Math.max(startWorld.y, endWorld.y);

      const selectedIds: string[] = [];

      for (const shape of shapes) {
        if (!shape.visible || shape.locked) continue;

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
    [screenToWorld, shapes]
  );

  // Handle mouse up (for ending pan and box selection)
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // End panning
      panState.current.isPanning = false;
      setIsPanning(false);

      // End box selection
      if (selectionState.current.isSelecting) {
        const screenPos = getMousePos(e);
        const startPoint = selectionState.current.startPoint;

        // Check if it was a drag (not just a click)
        const dx = Math.abs(screenPos.x - startPoint.x);
        const dy = Math.abs(screenPos.y - startPoint.y);

        if (dx > 5 || dy > 5) {
          // It was a drag - perform box selection
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
          } else if (e.shiftKey) {
            // Add to current selection
            const currentSelection = useAppStore.getState().selectedShapeIds;
            const newSelection = [...new Set([...currentSelection, ...selectedIds])];
            selectShapes(newSelection);
          } else {
            // Replace selection
            selectShapes(selectedIds);
          }

          // Mark that we just finished a box selection (to prevent handleClick from deselecting)
          selectionState.current.justFinishedBoxSelection = true;
        } else {
          // It was just a click on empty space - will be handled by handleClick
          selectionState.current.justFinishedBoxSelection = false;
        }

        selectionState.current.isSelecting = false;
        setSelectionBox(null);
      }
    },
    [getMousePos, getShapesInSelectionBox, selectShapes, deselectAll, setSelectionBox, hasActiveModifyCommand, commandIsSelecting, setPendingCommandSelection]
  );

  // Handle right-click (context menu) - finish drawing
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault(); // Prevent browser context menu

      // If drawing, finish the current drawing operation
      if (drawingPoints.length > 0) {
        // For polyline, create the shape with collected points
        if (activeTool === 'polyline' && drawingPoints.length >= 2) {
          createPolyline(drawingPoints, false);
        }
        clearDrawingPoints();
        setDrawingPreview(null);
      }
    },
    [drawingPoints, clearDrawingPoints, setDrawingPreview, activeTool, createPolyline]
  );

  // Handle mouse wheel (zoom)
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const screenPos = getMousePos(e);

      // Zoom factor
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.01), 100);

      // Zoom towards cursor position
      const worldX = (screenPos.x - viewport.offsetX) / viewport.zoom;
      const worldY = (screenPos.y - viewport.offsetY) / viewport.zoom;

      const newOffsetX = screenPos.x - worldX * newZoom;
      const newOffsetY = screenPos.y - worldY * newZoom;

      setViewport({
        zoom: newZoom,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      });
    },
    [getMousePos, viewport, setViewport]
  );

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleClick,
    handleContextMenu,
    isPanning,
  };
}

// Helper function to check if a point is near a shape
function isPointNearShape(point: Point, shape: any, tolerance: number = 5): boolean {
  switch (shape.type) {
    case 'line':
      return isPointNearLine(point, shape.start, shape.end, tolerance);
    case 'rectangle':
      return isPointInRectangle(point, shape);
    case 'circle':
      return isPointNearCircle(point, shape.center, shape.radius, tolerance);
    default:
      return false;
  }
}

function isPointNearLine(
  point: Point,
  start: Point,
  end: Point,
  tolerance: number
): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2) <= tolerance;
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length)
    )
  );

  const projX = start.x + t * dx;
  const projY = start.y + t * dy;
  const distance = Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);

  return distance <= tolerance;
}

function isPointInRectangle(point: Point, rect: RectangleShape): boolean {
  return (
    point.x >= rect.topLeft.x &&
    point.x <= rect.topLeft.x + rect.width &&
    point.y >= rect.topLeft.y &&
    point.y <= rect.topLeft.y + rect.height
  );
}

function isPointNearCircle(
  point: Point,
  center: Point,
  radius: number,
  tolerance: number
): boolean {
  const distance = Math.sqrt((point.x - center.x) ** 2 + (point.y - center.y) ** 2);
  return Math.abs(distance - radius) <= tolerance || distance <= radius;
}

// Get bounding box of a shape
// Calculate circle center and radius from 3 points on circumference
function calculateCircleFrom3Points(
  p1: Point,
  p2: Point,
  p3: Point
): { center: Point; radius: number } | null {
  // Using circumcenter formula
  const ax = p1.x, ay = p1.y;
  const bx = p2.x, by = p2.y;
  const cx = p3.x, cy = p3.y;

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

  // Points are collinear, no circle possible
  if (Math.abs(d) < 0.0001) {
    return null;
  }

  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

  const center = { x: ux, y: uy };
  const radius = Math.sqrt((ax - ux) ** 2 + (ay - uy) ** 2);

  return { center, radius };
}

interface ShapeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function getShapeBounds(shape: Shape): ShapeBounds | null {
  switch (shape.type) {
    case 'line':
      return {
        minX: Math.min(shape.start.x, shape.end.x),
        minY: Math.min(shape.start.y, shape.end.y),
        maxX: Math.max(shape.start.x, shape.end.x),
        maxY: Math.max(shape.start.y, shape.end.y),
      };
    case 'rectangle':
      return {
        minX: shape.topLeft.x,
        minY: shape.topLeft.y,
        maxX: shape.topLeft.x + shape.width,
        maxY: shape.topLeft.y + shape.height,
      };
    case 'circle':
      return {
        minX: shape.center.x - shape.radius,
        minY: shape.center.y - shape.radius,
        maxX: shape.center.x + shape.radius,
        maxY: shape.center.y + shape.radius,
      };
    case 'arc':
      // For arc, use center +/- radius as approximation
      return {
        minX: shape.center.x - shape.radius,
        minY: shape.center.y - shape.radius,
        maxX: shape.center.x + shape.radius,
        maxY: shape.center.y + shape.radius,
      };
    case 'ellipse':
      return {
        minX: shape.center.x - shape.radiusX,
        minY: shape.center.y - shape.radiusY,
        maxX: shape.center.x + shape.radiusX,
        maxY: shape.center.y + shape.radiusY,
      };
    case 'polyline':
      if (shape.points.length === 0) return null;
      const xs = shape.points.map((p) => p.x);
      const ys = shape.points.map((p) => p.y);
      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      };
    default:
      return null;
  }
}
