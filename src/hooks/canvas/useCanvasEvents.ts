/**
 * useCanvasEvents - Main orchestrator for canvas interactions
 *
 * This hook composes specialized hooks for different concerns:
 * - usePanZoom: Pan and zoom interactions
 * - useBoxSelection: Window/crossing box selection
 * - useSnapDetection: Snap point and tracking detection
 * - useShapeDrawing: Shape drawing (line, rectangle, circle, polyline)
 * - useBoundaryEditing: Drawing boundary editing
 * - useViewportEditing: Sheet viewport editing
 */

import { useCallback, useMemo } from 'react';
import { useAppStore } from '../../state/appStore';
import type { Point } from '../../types/geometry';
import { screenToWorld } from '../../engine/geometry/GeometryUtils';
import { isPointNearShape } from '../../engine/geometry/GeometryUtils';
import { QuadTree } from '../../engine/spatial/QuadTree';

import { usePanZoom } from '../navigation/usePanZoom';
import { useBoxSelection } from '../selection/useBoxSelection';
import { useSnapDetection } from '../snap/useSnapDetection';
import { useShapeDrawing } from '../drawing/useShapeDrawing';
import { useTextDrawing } from '../drawing/useTextDrawing';
import { useBoundaryEditing } from '../editing/useBoundaryEditing';
import { useViewportEditing } from '../editing/useViewportEditing';
import { useAnnotationEditing } from '../editing/useAnnotationEditing';
import { useGripEditing } from '../editing/useGripEditing';
import { useModifyTools } from '../editing/useModifyTools';

export function useCanvasEvents(canvasRef: React.RefObject<HTMLCanvasElement>) {
  // Compose specialized hooks
  const panZoom = usePanZoom(canvasRef);
  const boxSelection = useBoxSelection();
  const snapDetection = useSnapDetection();
  const shapeDrawing = useShapeDrawing();
  const textDrawing = useTextDrawing();
  const boundaryEditing = useBoundaryEditing();
  const viewportEditing = useViewportEditing();
  const annotationEditing = useAnnotationEditing();
  const gripEditing = useGripEditing();
  const modifyTools = useModifyTools();

  const {
    viewport,
    activeTool,
    setActiveTool,
    shapes,
    selectShape,
    deselectAll,
    editorMode,
    activeDrawingId,
    dimensionMode,
    setHoveredShapeId,
    pickLinesMode,
    setPrintDialogOpen,
  } = useAppStore();

  // Build spatial index for efficient shape lookup
  const quadTree = useMemo(() => {
    return QuadTree.buildFromShapes(shapes, activeDrawingId);
  }, [shapes, activeDrawingId]);

  /**
   * Find shape at point using spatial index (only shapes in active drawing)
   */
  const findShapeAtPoint = useCallback(
    (worldPoint: Point): string | null => {
      const tolerance = 5 / viewport.zoom;
      const candidates = quadTree.queryPoint(worldPoint, tolerance);
      // Iterate in reverse to match z-order (last inserted = on top)
      for (let i = candidates.length - 1; i >= 0; i--) {
        const shape = shapes.find(s => s.id === candidates[i].id);
        if (shape && isPointNearShape(worldPoint, shape)) {
          return shape.id;
        }
      }
      return null;
    },
    [quadTree, shapes, viewport.zoom]
  );

  /**
   * Handle mouse down
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const screenPos = panZoom.getMousePos(e);

      // Check pan first
      if (panZoom.handlePanMouseDown(e)) {
        return;
      }

      // Sheet mode: annotation dragging
      if (editorMode === 'sheet' && e.button === 0) {
        if (annotationEditing.handleAnnotationMouseDown(screenPos)) {
          return;
        }
      }

      // Sheet mode: viewport editing
      if (editorMode === 'sheet' && e.button === 0) {
        if (viewportEditing.handleViewportMouseDown(screenPos)) {
          return;
        }
      }

      // Drawing mode: boundary editing
      if (editorMode === 'drawing' && e.button === 0) {
        const worldPos = screenToWorld(screenPos.x, screenPos.y, viewport);
        if (boundaryEditing.handleBoundaryMouseDown(worldPos)) {
          return;
        }
      }

      // Drawing mode: grip (handle) dragging on selected shapes
      if (editorMode === 'drawing' && e.button === 0) {
        const worldPos = screenToWorld(screenPos.x, screenPos.y, viewport);
        if (gripEditing.handleGripMouseDown(worldPos)) {
          return;
        }
      }

      // Drawing mode: start box selection if clicking on empty space
      if (editorMode === 'drawing' && e.button === 0) {
        const worldPos = screenToWorld(screenPos.x, screenPos.y, viewport);
        const shapeId = findShapeAtPoint(worldPos);
        // Pass true if there IS a shape at point, false if empty
        if (boxSelection.shouldStartBoxSelection(!!shapeId)) {
          boxSelection.startBoxSelection(screenPos);
        }
      }
    },
    [panZoom, editorMode, viewport, annotationEditing, viewportEditing, boundaryEditing, gripEditing, findShapeAtPoint, boxSelection]
  );

  /**
   * Handle click
   */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Skip if was panning or just finished box selection
      if (panZoom.getIsPanning()) return;
      if (boxSelection.justFinishedBoxSelection()) return;
      if (e.button !== 0) return;

      const screenPos = panZoom.getMousePos(e);

      // Sheet mode: annotation tools or viewport selection
      if (editorMode === 'sheet') {
        // Handle annotation tool clicks first
        if (annotationEditing.handleAnnotationClick(screenPos, e.shiftKey)) {
          return;
        }

        // Then handle viewport selection
        viewportEditing.handleViewportClick(screenPos);
        return;
      }

      // Drawing mode
      const worldPos = screenToWorld(screenPos.x, screenPos.y, viewport);
      const basePoint = shapeDrawing.getLastDrawingPoint();
      const snapResult = snapDetection.snapPoint(worldPos, basePoint);
      const snappedPos = snapResult.point;

      // Tool-specific handling
      switch (activeTool) {
        case 'select': {
          // Check boundary click first
          if (boundaryEditing.handleBoundaryClick(worldPos)) {
            break;
          }

          // Check shapes
          const shapeId = findShapeAtPoint(worldPos);
          if (shapeId) {
            boundaryEditing.deselectBoundary();
            selectShape(shapeId, e.shiftKey);
          } else {
            boundaryEditing.deselectBoundary();
            deselectAll();
          }
          break;
        }

        case 'line':
        case 'rectangle':
        case 'circle':
        case 'arc':
        case 'polyline':
        case 'spline':
        case 'ellipse':
        case 'hatch':
          shapeDrawing.handleDrawingClick(snappedPos, e.shiftKey, snapResult.snapInfo);
          // Clear snap/tracking indicators after click - they'll be recalculated on next mouse move
          snapDetection.clearTracking();
          break;

        case 'dimension':
          shapeDrawing.handleDrawingClick(snappedPos, e.shiftKey, snapResult.snapInfo);
          snapDetection.clearTracking();
          break;

        case 'text':
          textDrawing.handleTextClick(snappedPos);
          snapDetection.clearTracking();
          break;

        case 'pan':
          // Pan tool doesn't use click
          break;

        case 'move':
        case 'copy':
        case 'rotate':
        case 'scale':
        case 'mirror':
        case 'array':
        case 'trim':
        case 'extend':
        case 'fillet':
        case 'chamfer':
        case 'offset':
          modifyTools.handleModifyClick(snappedPos, e.shiftKey, findShapeAtPoint);
          snapDetection.clearTracking();
          break;
      }
    },
    [
      panZoom,
      boxSelection,
      editorMode,
      viewport,
      annotationEditing,
      viewportEditing,
      shapeDrawing,
      textDrawing,
      snapDetection,
      findShapeAtPoint,
      activeTool,
      boundaryEditing,
      selectShape,
      deselectAll,
      modifyTools,
    ]
  );

  /**
   * Handle mouse move
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const screenPos = panZoom.getMousePos(e);

      // Pan handling
      if (panZoom.handlePanMouseMove(e)) {
        return;
      }

      // Sheet mode: annotation dragging
      if (annotationEditing.handleAnnotationMouseMove(screenPos)) {
        return;
      }

      // Sheet mode: viewport dragging
      if (viewportEditing.handleViewportMouseMove(screenPos)) {
        return;
      }

      // Drawing mode: boundary dragging
      if (editorMode === 'drawing') {
        const worldPos = screenToWorld(screenPos.x, screenPos.y, viewport);
        if (boundaryEditing.handleBoundaryMouseMove(worldPos)) {
          return;
        }
      }

      // Drawing mode: grip dragging
      if (editorMode === 'drawing') {
        const worldPos = screenToWorld(screenPos.x, screenPos.y, viewport);
        if (gripEditing.handleGripMouseMove(worldPos)) {
          return;
        }

        // Update cursor for axis arrow hover
        const canvas = canvasRef.current;
        if (canvas && activeTool === 'select') {
          const axis = gripEditing.getHoveredAxis(worldPos);
          if (axis === 'x') {
            canvas.style.cursor = 'ew-resize';
          } else if (axis === 'y') {
            canvas.style.cursor = 'ns-resize';
          } else {
            canvas.style.cursor = '';
          }
        }
      }

      // Box selection
      if (boxSelection.isSelecting()) {
        boxSelection.updateBoxSelection(screenPos);
        return;
      }

      // Modify tools - update preview
      const isModifyToolActive = ['move', 'copy', 'rotate', 'scale', 'mirror', 'array', 'trim', 'extend', 'fillet', 'chamfer', 'offset'].includes(activeTool);
      if (isModifyToolActive && editorMode === 'drawing') {
        const worldPos = screenToWorld(screenPos.x, screenPos.y, viewport);
        const basePoint = shapeDrawing.getLastDrawingPoint();
        const snapResult = snapDetection.snapPoint(worldPos, basePoint);
        modifyTools.updateModifyPreview(snapResult.point);

        // Hover highlight for trim/extend/fillet/offset
        if (['trim', 'extend', 'fillet', 'chamfer', 'offset'].includes(activeTool)) {
          const hoveredShape = findShapeAtPoint(worldPos);
          setHoveredShapeId(hoveredShape);
        } else {
          setHoveredShapeId(null);
        }
        return;
      }

      // Drawing tools - always detect snaps when hovering (even before first click)
      const isDrawingTool = ['line', 'rectangle', 'circle', 'arc', 'polyline', 'spline', 'ellipse', 'hatch', 'dimension'].includes(activeTool);

      if (isDrawingTool && editorMode === 'drawing') {
        const worldPos = screenToWorld(screenPos.x, screenPos.y, viewport);
        const basePoint = shapeDrawing.getLastDrawingPoint();
        const snapResult = snapDetection.snapPoint(worldPos, basePoint);

        // Update drawing preview if actively drawing
        if (shapeDrawing.isDrawing()) {
          shapeDrawing.updateDrawingPreview(snapResult.point, e.shiftKey);
        }

        // Hover highlight for dimension tools that require clicking on geometry
        if (activeTool === 'dimension') {
          const needsHover =
            (dimensionMode === 'radius' || dimensionMode === 'diameter' || dimensionMode === 'angular' || dimensionMode === 'arc-length');
          if (needsHover) {
            const hoveredShape = findShapeAtPoint(worldPos);
            setHoveredShapeId(hoveredShape);
          } else {
            setHoveredShapeId(null);
          }
        } else if (pickLinesMode && (activeTool === 'line' || activeTool === 'circle' || activeTool === 'arc')) {
          // Pick-lines mode: highlight shape under cursor
          const hoveredShape = findShapeAtPoint(worldPos);
          setHoveredShapeId(hoveredShape);
        } else {
          setHoveredShapeId(null);
        }
      } else {
        setHoveredShapeId(null);
      }
    },
    [panZoom, annotationEditing, viewportEditing, editorMode, viewport, boundaryEditing, gripEditing, boxSelection, shapeDrawing, snapDetection, activeTool, dimensionMode, pickLinesMode, findShapeAtPoint, setHoveredShapeId, canvasRef, modifyTools]
  );

  /**
   * Handle mouse up
   */
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      panZoom.handlePanMouseUp();

      // Sheet mode: annotation drag end
      if (annotationEditing.handleAnnotationMouseUp()) {
        return;
      }

      // Sheet mode: viewport drag end
      if (viewportEditing.handleViewportMouseUp()) {
        return;
      }

      // Draft mode: boundary drag end
      if (boundaryEditing.handleBoundaryMouseUp()) {
        return;
      }

      // Drawing mode: grip drag end
      if (gripEditing.handleGripMouseUp()) {
        return;
      }

      // Box selection end
      if (boxSelection.isSelecting()) {
        const screenPos = panZoom.getMousePos(e);
        boxSelection.endBoxSelection(screenPos, e.shiftKey);
      }
    },
    [panZoom, annotationEditing, viewportEditing, boundaryEditing, gripEditing, boxSelection]
  );

  /**
   * Handle context menu (right-click) - finish drawing or deselect tool
   */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      // In sheet mode, finish leader if active, then show context menu
      if (editorMode === 'sheet') {
        annotationEditing.finishLeader();

        const menu = document.createElement('div');
        menu.className = 'fixed z-[9999] bg-cad-surface border border-cad-border shadow-lg text-xs';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        const onOutsideClick = (ev: MouseEvent) => { if (!menu.contains(ev.target as Node)) cleanup(); };
        const escHandler = (ev: KeyboardEvent) => { if (ev.key === 'Escape') cleanup(); };
        function cleanup() { menu.remove(); document.removeEventListener('mousedown', onOutsideClick); document.removeEventListener('keydown', escHandler); }

        const items = [
          { label: 'Print', action: () => setPrintDialogOpen(true) },
          { label: 'Print Preview', action: () => setPrintDialogOpen(true) },
        ];

        items.forEach(item => {
          const el = document.createElement('div');
          el.className = 'px-4 py-1.5 hover:bg-cad-hover cursor-pointer text-cad-text';
          el.textContent = item.label;
          el.onclick = () => { cleanup(); item.action(); };
          menu.appendChild(el);
        });

        document.body.appendChild(menu);
        setTimeout(() => {
          document.addEventListener('mousedown', onOutsideClick);
          document.addEventListener('keydown', escHandler);
        }, 0);

        return;
      }

      // In drawing mode
      // If actively drawing, finish the drawing
      if (shapeDrawing.isDrawing()) {
        shapeDrawing.finishDrawing();
        // Clear snap/tracking indicators
        snapDetection.clearTracking();
        return;
      }

      // Modify tools: right-click finishes / cancels
      const modifyToolsList = ['move', 'copy', 'rotate', 'scale', 'mirror', 'array', 'trim', 'extend', 'fillet', 'chamfer', 'offset'];
      if (modifyToolsList.includes(activeTool)) {
        modifyTools.finishModify();
        setActiveTool('select');
        snapDetection.clearTracking();
        return;
      }

      // If a drawing tool is selected but not actively drawing, deselect it
      const drawingTools = ['line', 'rectangle', 'circle', 'arc', 'polyline', 'spline', 'ellipse', 'hatch', 'text'];
      if (drawingTools.includes(activeTool)) {
        setActiveTool('select');
        // Clear any lingering snap/tracking indicators
        snapDetection.clearTracking();
      }
    },
    [editorMode, annotationEditing, shapeDrawing, activeTool, setActiveTool, snapDetection, modifyTools, setPrintDialogOpen]
  );

  /**
   * Handle double-click (edit text)
   */
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      if (editorMode !== 'drawing') return;

      const screenPos = panZoom.getMousePos(e);
      const worldPos = screenToWorld(screenPos.x, screenPos.y, viewport);

      // Find shape at point
      const shapeId = findShapeAtPoint(worldPos);
      if (shapeId) {
        // Check if it's a text shape
        const shape = shapes.find(s => s.id === shapeId);
        if (shape && shape.type === 'text') {
          textDrawing.handleTextDoubleClick(shapeId);
        }
      }
    },
    [editorMode, panZoom, viewport, findShapeAtPoint, shapes, textDrawing]
  );

  /**
   * Handle wheel (zoom)
   */
  const handleWheel = panZoom.handleWheel;

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleClick,
    handleDoubleClick,
    handleContextMenu,
    isPanning: panZoom.isPanning,
  };
}
