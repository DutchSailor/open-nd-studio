import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../../state/appStore';
import { CADRenderer } from '../../engine/renderer/CADRenderer';
import { useCanvasEvents } from '../../hooks/useCanvasEvents';
import { useDrawingKeyboard } from '../../hooks/useDrawingKeyboard';
import { DynamicInput } from '../DynamicInput/DynamicInput';
import { TextEditor } from '../TextEditor/TextEditor';
import type { TextShape } from '../../types/geometry';
import { MM_TO_PIXELS } from '../../engine/renderer/types';

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
    activeDrawingId,
    editorMode,
    layers,
    // Sheet mode state
    drawings,
    sheets,
    activeSheetId,
    drawingViewports,
    // Boundary editing state
    boundaryEditState,
    // Viewport editing state
    viewportEditState,
    // Crop region editing state
    cropRegionEditState,
    // Annotation state
    selectedAnnotationIds,
    // Text editing state
    textEditingId,
    endTextEditing,
    updateShape,
    deleteShape,
    // Drawing placement state
    isPlacing,
    placingDrawingId,
    previewPosition,
    placementScale,
    updatePlacementPreview,
    confirmPlacement,
  } = useAppStore();

  // Filter shapes and layers by active drawing
  const filteredShapes = useMemo(() => {
    if (editorMode === 'drawing') {
      return shapes.filter(shape => shape.drawingId === activeDrawingId);
    }
    // In sheet mode, shapes are rendered through viewports (handled by CADRenderer)
    return shapes;
  }, [shapes, activeDrawingId, editorMode]);

  const filteredLayers = useMemo(() => {
    return layers.filter(layer => layer.drawingId === activeDrawingId);
  }, [layers, activeDrawingId]);

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

  // Get active drawing for boundary rendering
  const activeDrawing = useMemo(() => {
    return drawings.find(d => d.id === activeDrawingId) || null;
  }, [drawings, activeDrawingId]);

  // Get text shape being edited
  const editingTextShape = useMemo(() => {
    if (!textEditingId) return null;
    return shapes.find(s => s.id === textEditingId && s.type === 'text') as TextShape | undefined;
  }, [textEditingId, shapes]);

  // Handle text save
  const handleTextSave = useCallback((newText: string) => {
    if (textEditingId && newText.trim()) {
      updateShape(textEditingId, { text: newText });
    } else if (textEditingId && !newText.trim()) {
      // Delete empty text
      deleteShape(textEditingId);
    }
    endTextEditing();
  }, [textEditingId, updateShape, deleteShape, endTextEditing]);

  // Handle text cancel
  const handleTextCancel = useCallback(() => {
    if (textEditingId) {
      const shape = shapes.find(s => s.id === textEditingId);
      // Delete if text was never entered
      if (shape && shape.type === 'text' && !shape.text) {
        deleteShape(textEditingId);
      }
    }
    endTextEditing();
  }, [textEditingId, shapes, deleteShape, endTextEditing]);

  // Render loop
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (editorMode === 'sheet' && activeSheet) {
      // Render sheet (Paper Space)
      renderer.renderSheet({
        sheet: activeSheet,
        drawings,
        shapes,  // All shapes, filtering happens in renderer
        layers,  // All layers for per-viewport filtering
        viewport,
        selectedViewportId: viewportEditState.selectedViewportId,
        viewportDragging: viewportEditState.isDragging,
        drawingViewports,
        cropRegionEditing: cropRegionEditState?.isEditing || false,
        cropRegionViewportId: cropRegionEditState?.viewportId || null,
        selectedAnnotationIds,
        placementPreview: {
          isPlacing,
          placingDrawingId,
          previewPosition,
          placementScale,
        },
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
        drawingBoundary: activeDrawing?.boundary || null,
        boundarySelected: boundaryEditState.isSelected,
        boundaryDragging: boundaryEditState.activeHandle !== null,
      });
    }
  }, [editorMode, activeSheet, drawings, shapes, layers, filteredShapes, selectedShapeIds, viewport, gridVisible, gridSize, drawingPreview, currentStyle, selectionBox, commandPreviewShapes, currentSnapPoint, currentTrackingLines, trackingPoint, filteredLayers, drawingViewports, activeDrawing, boundaryEditState, viewportEditState, cropRegionEditState, selectedAnnotationIds, isPlacing, placingDrawingId, previewPosition, placementScale]);

  // Handle mouse events
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, handleClick, handleDoubleClick, handleContextMenu, isPanning } =
    useCanvasEvents(canvasRef);

  // Handle keyboard shortcuts for drawing
  useDrawingKeyboard();

  // Track mouse position and handle placement preview
  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePosition({ x, y });

      // Update placement preview if in placement mode
      if (isPlacing && editorMode === 'sheet') {
        // Convert screen coordinates to sheet coordinates (in mm)
        const sheetPos = {
          x: (x - viewport.offsetX) / viewport.zoom / MM_TO_PIXELS,
          y: (y - viewport.offsetY) / viewport.zoom / MM_TO_PIXELS,
        };
        updatePlacementPreview(sheetPos);
      }

      handleMouseMove(e);
    },
    [setMousePosition, handleMouseMove, isPlacing, editorMode, viewport, updatePlacementPreview]
  );

  // Handle click for placement confirmation
  const onCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // If in placement mode, confirm placement on click
      if (isPlacing && editorMode === 'sheet' && previewPosition) {
        e.stopPropagation();
        confirmPlacement();
        return;
      }

      // Otherwise, use normal click handler
      handleClick(e);
    },
    [isPlacing, editorMode, previewPosition, confirmPlacement, handleClick]
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
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-cad-bg"
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 ${getCursor()} ${isPlacing ? 'cursor-copy' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={onCanvasClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />

      {/* Dynamic Input Tooltip */}
      <DynamicInput />

      {/* Text Editor Overlay */}
      {editingTextShape && (
        <TextEditor
          shape={editingTextShape}
          onSave={handleTextSave}
          onCancel={handleTextCancel}
        />
      )}

      {/* Origin indicator - CAD convention: X right, Y up */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <svg width="50" height="50" className="overflow-visible">
          {/* Y axis pointing UP (green) */}
          <line x1="10" y1="40" x2="10" y2="8" stroke="#22c55e" strokeWidth="2" />
          {/* Y arrow head */}
          <polygon points="10,4 7,12 13,12" fill="#22c55e" />
          {/* Y label */}
          <text x="16" y="12" fill="#22c55e" fontSize="12" fontWeight="bold">Y</text>

          {/* X axis pointing RIGHT (red) */}
          <line x1="10" y1="40" x2="42" y2="40" stroke="#ef4444" strokeWidth="2" />
          {/* X arrow head */}
          <polygon points="46,40 38,37 38,43" fill="#ef4444" />
          {/* X label */}
          <text x="38" y="53" fill="#ef4444" fontSize="12" fontWeight="bold">X</text>
        </svg>
      </div>
    </div>
  );
}
