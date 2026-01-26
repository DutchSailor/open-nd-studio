import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../../state/appStore';
import { CADRenderer } from '../../engine/renderer/CADRenderer';
import { useCanvasEvents } from '../../hooks/useCanvasEvents';
import { useDrawingKeyboard } from '../../hooks/useDrawingKeyboard';
import { DynamicInput } from '../DynamicInput/DynamicInput';

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CADRenderer | null>(null);

  const {
    shapes,
    selectedShapeIds,
    viewport,
    gridVisible,
    gridSize,
    setCanvasSize,
    setMousePosition,
    activeTool,
    drawingPreview,
    currentStyle,
    selectionBox,
    commandPreviewShapes,
    currentSnapPoint,
    currentTrackingLines,
    trackingPoint,
    activeDraftId,
    editorMode,
    layers,
    // Sheet mode state
    drafts,
    sheets,
    activeSheetId,
    draftViewports,
    // Boundary editing state
    boundaryEditState,
    // Viewport editing state
    viewportEditState,
  } = useAppStore();

  // Filter shapes and layers by active drawing
  const filteredShapes = useMemo(() => {
    if (editorMode === 'draft') {
      return shapes.filter(shape => shape.draftId === activeDraftId);
    }
    // In sheet mode, shapes are rendered through viewports (handled by CADRenderer)
    return shapes;
  }, [shapes, activeDraftId, editorMode]);

  const filteredLayers = useMemo(() => {
    return layers.filter(layer => layer.draftId === activeDraftId);
  }, [layers, activeDraftId]);

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    rendererRef.current = new CADRenderer(canvas);

    return () => {
      rendererRef.current?.dispose();
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        setCanvasSize({ width, height });
        rendererRef.current?.resize(width, height);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [setCanvasSize]);

  // Get active sheet for rendering
  const activeSheet = useMemo(() => {
    if (editorMode === 'sheet' && activeSheetId) {
      return sheets.find(s => s.id === activeSheetId) || null;
    }
    return null;
  }, [editorMode, activeSheetId, sheets]);

  // Get active draft for boundary rendering
  const activeDraft = useMemo(() => {
    return drafts.find(d => d.id === activeDraftId) || null;
  }, [drafts, activeDraftId]);

  // Render loop
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (editorMode === 'sheet' && activeSheet) {
      // Render sheet (Paper Space)
      renderer.renderSheet({
        sheet: activeSheet,
        drafts,
        shapes,  // All shapes, filtering happens in renderer
        viewport,
        selectedViewportId: viewportEditState.selectedViewportId,
        viewportDragging: viewportEditState.isDragging,
        draftViewports,
      });
    } else {
      // Render drawing (Model Space)
      renderer.render({
        shapes: filteredShapes,
        selectedShapeIds,
        viewport,
        gridVisible,
        gridSize,
        drawingPreview,
        currentStyle,
        selectionBox,
        commandPreviewShapes,
        currentSnapPoint,
        currentTrackingLines,
        trackingPoint,
        layers: filteredLayers,
        draftBoundary: activeDraft?.boundary || null,
        boundarySelected: boundaryEditState.isSelected,
        boundaryDragging: boundaryEditState.activeHandle !== null,
      });
    }
  }, [editorMode, activeSheet, drafts, shapes, filteredShapes, selectedShapeIds, viewport, gridVisible, gridSize, drawingPreview, currentStyle, selectionBox, commandPreviewShapes, currentSnapPoint, currentTrackingLines, trackingPoint, filteredLayers, draftViewports, activeDraft, boundaryEditState, viewportEditState]);

  // Handle mouse events
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, handleClick, handleContextMenu, isPanning } =
    useCanvasEvents(canvasRef);

  // Handle keyboard shortcuts for drawing
  useDrawingKeyboard();

  // Track mouse position
  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePosition({ x, y });
      handleMouseMove(e);
    },
    [setMousePosition, handleMouseMove]
  );

  // Cursor based on active tool and panning state
  const getCursor = () => {
    // Show grabbing cursor when actively panning
    if (isPanning) {
      return 'cursor-grabbing';
    }
    switch (activeTool) {
      case 'pan':
        return 'cursor-grab';
      case 'select':
        return 'cursor-default';
      default:
        return 'cursor-crosshair';
    }
  };

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-cad-bg">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 ${getCursor()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />

      {/* Dynamic Input Tooltip */}
      <DynamicInput />

      {/* Origin indicator */}
      <div className="absolute bottom-4 left-4 text-xs text-cad-text-dim pointer-events-none">
        <div className="flex items-center gap-1">
          <div className="w-8 h-0.5 bg-red-500" />
          <span>X</span>
        </div>
        <div className="flex items-center gap-1 -mt-2">
          <div className="w-0.5 h-8 bg-green-500" />
          <span className="-ml-2 mt-6">Y</span>
        </div>
      </div>
    </div>
  );
}
