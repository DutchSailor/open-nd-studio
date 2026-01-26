import type { Shape, Viewport, LineShape, RectangleShape, CircleShape, SnapPoint, SnapType, Layer, Sheet, SheetViewport, Draft, TitleBlock, DraftBoundary } from '../../types/geometry';
import type { DrawingPreview, SelectionBox } from '../../state/appStore';
import { PAPER_SIZES } from '../../state/appStore';
import type { TrackingLine } from '../../core/geometry/Tracking';
import { getTrackingLineColor } from '../../core/geometry/Tracking';
import type { IPoint } from '../../core/geometry/Point';

// Boundary handle types for interactive editing
export type BoundaryHandleType =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right';

interface RenderOptions {
  shapes: Shape[];
  selectedShapeIds: string[];
  viewport: Viewport;
  gridVisible: boolean;
  gridSize: number;
  drawingPreview?: DrawingPreview;
  currentStyle?: { strokeColor: string; strokeWidth: number };
  selectionBox?: SelectionBox | null;
  commandPreviewShapes?: Shape[];
  currentSnapPoint?: SnapPoint | null;
  currentTrackingLines?: TrackingLine[];
  trackingPoint?: IPoint | null;
  layers?: Layer[];
  draftBoundary?: DraftBoundary | null;  // Boundary to render for current draft
  boundarySelected?: boolean;  // Whether boundary is selected (shows handles)
  boundaryDragging?: boolean;  // Whether boundary is being dragged
}

// Viewport handle type for sheet viewport manipulation
export type ViewportHandleType =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right';

interface SheetRenderOptions {
  sheet: Sheet;
  drafts: Draft[];
  shapes: Shape[];  // All shapes from all drafts
  viewport: Viewport;  // Pan/zoom for the sheet view
  selectedViewportId?: string | null;
  viewportDragging?: boolean;  // Whether viewport is being dragged
  draftViewports: Record<string, Viewport>;  // Viewport state per drawing
}

export class CADRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.ctx.scale(this.dpr, this.dpr);
  }

  render(options: RenderOptions): void {
    const { shapes, selectedShapeIds, viewport, gridVisible, gridSize, drawingPreview, currentStyle, selectionBox, commandPreviewShapes, currentSnapPoint, currentTrackingLines, trackingPoint, draftBoundary, boundarySelected, boundaryDragging } = options;
    const ctx = this.ctx;

    // Clear canvas
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    // Apply viewport transform
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Draw grid
    if (gridVisible) {
      this.drawGrid(viewport, gridSize);
    }

    // Draw draft boundary (region)
    if (draftBoundary) {
      this.drawDraftBoundary(draftBoundary, viewport, boundarySelected || false, boundaryDragging || false);
    }

    // Draw shapes
    for (const shape of shapes) {
      if (!shape.visible) continue;
      const isSelected = selectedShapeIds.includes(shape.id);
      this.drawShape(shape, isSelected);
    }

    // Draw command preview shapes (move/copy preview)
    if (commandPreviewShapes && commandPreviewShapes.length > 0) {
      this.drawCommandPreviewShapes(commandPreviewShapes);
    }

    // Draw preview shape while drawing
    if (drawingPreview) {
      this.drawPreview(drawingPreview, currentStyle);
    }

    // Draw tracking lines
    if (currentTrackingLines && currentTrackingLines.length > 0) {
      this.drawTrackingLines(currentTrackingLines, trackingPoint, viewport);
    }

    // Draw snap point indicator (skip grid snaps - they're not useful to show)
    if (currentSnapPoint && currentSnapPoint.type !== 'grid') {
      this.drawSnapIndicator(currentSnapPoint, viewport);
    }

    ctx.restore();

    // Draw selection box (in screen coordinates, after viewport transform is restored)
    if (selectionBox) {
      this.drawSelectionBox(selectionBox);
    }

    // Draw snap point label (in screen coordinates, skip grid snaps)
    if (currentSnapPoint && currentSnapPoint.type !== 'grid') {
      this.drawSnapLabel(currentSnapPoint, viewport);
    }

    // Draw tracking label (in screen coordinates)
    if (currentTrackingLines && currentTrackingLines.length > 0 && trackingPoint) {
      this.drawTrackingLabel(currentTrackingLines, trackingPoint, viewport);
    }
  }

  private drawGrid(viewport: Viewport, gridSize: number): void {
    const ctx = this.ctx;

    // Calculate visible area in world coordinates
    const left = -viewport.offsetX / viewport.zoom;
    const top = -viewport.offsetY / viewport.zoom;
    const right = left + this.width / viewport.zoom;
    const bottom = top + this.height / viewport.zoom;

    // Adjust grid size based on zoom
    let adjustedGridSize = gridSize;
    while (adjustedGridSize * viewport.zoom < 10) {
      adjustedGridSize *= 5;
    }
    while (adjustedGridSize * viewport.zoom > 100) {
      adjustedGridSize /= 5;
    }

    const majorGridSize = adjustedGridSize * 5;

    // Draw minor grid lines
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 0.5 / viewport.zoom;
    ctx.beginPath();

    const startX = Math.floor(left / adjustedGridSize) * adjustedGridSize;
    const startY = Math.floor(top / adjustedGridSize) * adjustedGridSize;

    for (let x = startX; x <= right; x += adjustedGridSize) {
      if (Math.abs(x % majorGridSize) < 0.001) continue; // Skip major lines
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }

    for (let y = startY; y <= bottom; y += adjustedGridSize) {
      if (Math.abs(y % majorGridSize) < 0.001) continue; // Skip major lines
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }

    ctx.stroke();

    // Draw major grid lines
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 1 / viewport.zoom;
    ctx.beginPath();

    const majorStartX = Math.floor(left / majorGridSize) * majorGridSize;
    const majorStartY = Math.floor(top / majorGridSize) * majorGridSize;

    for (let x = majorStartX; x <= right; x += majorGridSize) {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }

    for (let y = majorStartY; y <= bottom; y += majorGridSize) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }

    ctx.stroke();

    // Draw origin axes
    ctx.lineWidth = 2 / viewport.zoom;

    // X axis (red)
    ctx.strokeStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(left, 0);
    ctx.lineTo(right, 0);
    ctx.stroke();

    // Y axis (green)
    ctx.strokeStyle = '#44ff44';
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(0, bottom);
    ctx.stroke();
  }

  private drawDraftBoundary(boundary: DraftBoundary, viewport: Viewport, isSelected: boolean, isDragging: boolean): void {
    const ctx = this.ctx;

    ctx.save();

    // Different colors for selected vs normal state
    const baseColor = isSelected ? '#ff6b35' : '#00bcd4';  // Orange when selected, cyan otherwise
    const lineWidth = isSelected ? 3 / viewport.zoom : 2 / viewport.zoom;

    // Draw the boundary rectangle
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = lineWidth;

    if (isSelected) {
      ctx.setLineDash([]);  // Solid when selected
    } else {
      ctx.setLineDash([10 / viewport.zoom, 5 / viewport.zoom]);
    }

    ctx.beginPath();
    ctx.rect(boundary.x, boundary.y, boundary.width, boundary.height);
    ctx.stroke();

    ctx.setLineDash([]);

    if (isSelected) {
      // Draw resize handles (Revit-style blue arrow controls)
      this.drawBoundaryHandles(boundary, viewport, isDragging);
    } else {
      // Draw corner markers for normal state
      ctx.fillStyle = baseColor;
      const markerSize = 8 / viewport.zoom;

      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(boundary.x, boundary.y);
      ctx.lineTo(boundary.x + markerSize * 2, boundary.y);
      ctx.lineTo(boundary.x + markerSize * 2, boundary.y + markerSize / 2);
      ctx.lineTo(boundary.x + markerSize / 2, boundary.y + markerSize / 2);
      ctx.lineTo(boundary.x + markerSize / 2, boundary.y + markerSize * 2);
      ctx.lineTo(boundary.x, boundary.y + markerSize * 2);
      ctx.closePath();
      ctx.fill();

      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(boundary.x + boundary.width, boundary.y);
      ctx.lineTo(boundary.x + boundary.width - markerSize * 2, boundary.y);
      ctx.lineTo(boundary.x + boundary.width - markerSize * 2, boundary.y + markerSize / 2);
      ctx.lineTo(boundary.x + boundary.width - markerSize / 2, boundary.y + markerSize / 2);
      ctx.lineTo(boundary.x + boundary.width - markerSize / 2, boundary.y + markerSize * 2);
      ctx.lineTo(boundary.x + boundary.width, boundary.y + markerSize * 2);
      ctx.closePath();
      ctx.fill();

      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(boundary.x + boundary.width, boundary.y + boundary.height);
      ctx.lineTo(boundary.x + boundary.width - markerSize * 2, boundary.y + boundary.height);
      ctx.lineTo(boundary.x + boundary.width - markerSize * 2, boundary.y + boundary.height - markerSize / 2);
      ctx.lineTo(boundary.x + boundary.width - markerSize / 2, boundary.y + boundary.height - markerSize / 2);
      ctx.lineTo(boundary.x + boundary.width - markerSize / 2, boundary.y + boundary.height - markerSize * 2);
      ctx.lineTo(boundary.x + boundary.width, boundary.y + boundary.height - markerSize * 2);
      ctx.closePath();
      ctx.fill();

      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(boundary.x, boundary.y + boundary.height);
      ctx.lineTo(boundary.x + markerSize * 2, boundary.y + boundary.height);
      ctx.lineTo(boundary.x + markerSize * 2, boundary.y + boundary.height - markerSize / 2);
      ctx.lineTo(boundary.x + markerSize / 2, boundary.y + boundary.height - markerSize / 2);
      ctx.lineTo(boundary.x + markerSize / 2, boundary.y + boundary.height - markerSize * 2);
      ctx.lineTo(boundary.x, boundary.y + boundary.height - markerSize * 2);
      ctx.closePath();
      ctx.fill();
    }

    // Draw "BOUNDARY" label at top
    ctx.font = `${12 / viewport.zoom}px Arial`;
    ctx.fillStyle = baseColor;
    const labelText = isSelected ? 'BOUNDARY (Click and drag handles to resize)' : 'BOUNDARY';
    const labelWidth = ctx.measureText(labelText).width;
    ctx.fillText(labelText, boundary.x + (boundary.width - labelWidth) / 2, boundary.y - 8 / viewport.zoom);

    ctx.restore();
  }

  private drawBoundaryHandles(boundary: DraftBoundary, viewport: Viewport, _isDragging: boolean): void {
    const ctx = this.ctx;
    const handleSize = 10 / viewport.zoom;
    const halfHandle = handleSize / 2;

    // Handle positions
    const handles: { type: BoundaryHandleType; x: number; y: number }[] = [
      // Corners
      { type: 'top-left', x: boundary.x, y: boundary.y },
      { type: 'top-right', x: boundary.x + boundary.width, y: boundary.y },
      { type: 'bottom-left', x: boundary.x, y: boundary.y + boundary.height },
      { type: 'bottom-right', x: boundary.x + boundary.width, y: boundary.y + boundary.height },
      // Edge midpoints
      { type: 'top', x: boundary.x + boundary.width / 2, y: boundary.y },
      { type: 'bottom', x: boundary.x + boundary.width / 2, y: boundary.y + boundary.height },
      { type: 'left', x: boundary.x, y: boundary.y + boundary.height / 2 },
      { type: 'right', x: boundary.x + boundary.width, y: boundary.y + boundary.height / 2 },
      // Center (for moving)
      { type: 'center', x: boundary.x + boundary.width / 2, y: boundary.y + boundary.height / 2 },
    ];

    for (const handle of handles) {
      ctx.save();

      if (handle.type === 'center') {
        // Draw center handle as a circle with move arrows
        ctx.fillStyle = '#4caf50';  // Green for move handle
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 / viewport.zoom;

        ctx.beginPath();
        ctx.arc(handle.x, handle.y, handleSize * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw move arrows
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / viewport.zoom;
        const arrowSize = handleSize * 0.4;

        // Horizontal arrows
        ctx.beginPath();
        ctx.moveTo(handle.x - arrowSize, handle.y);
        ctx.lineTo(handle.x + arrowSize, handle.y);
        ctx.stroke();

        // Vertical arrows
        ctx.beginPath();
        ctx.moveTo(handle.x, handle.y - arrowSize);
        ctx.lineTo(handle.x, handle.y + arrowSize);
        ctx.stroke();
      } else {
        // Draw resize handle as filled square
        const isCorner = handle.type.includes('-');
        ctx.fillStyle = isCorner ? '#2196f3' : '#03a9f4';  // Blue for corners, lighter for edges
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 / viewport.zoom;

        ctx.fillRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize);
        ctx.strokeRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize);
      }

      ctx.restore();
    }
  }

  /**
   * Get handle positions for hit testing
   */
  getBoundaryHandlePositions(boundary: DraftBoundary): { type: BoundaryHandleType; x: number; y: number }[] {
    return [
      { type: 'top-left', x: boundary.x, y: boundary.y },
      { type: 'top-right', x: boundary.x + boundary.width, y: boundary.y },
      { type: 'bottom-left', x: boundary.x, y: boundary.y + boundary.height },
      { type: 'bottom-right', x: boundary.x + boundary.width, y: boundary.y + boundary.height },
      { type: 'top', x: boundary.x + boundary.width / 2, y: boundary.y },
      { type: 'bottom', x: boundary.x + boundary.width / 2, y: boundary.y + boundary.height },
      { type: 'left', x: boundary.x, y: boundary.y + boundary.height / 2 },
      { type: 'right', x: boundary.x + boundary.width, y: boundary.y + boundary.height / 2 },
      { type: 'center', x: boundary.x + boundary.width / 2, y: boundary.y + boundary.height / 2 },
    ];
  }

  private drawShape(shape: Shape, isSelected: boolean): void {
    const ctx = this.ctx;
    const { style } = shape;

    // Set line style
    ctx.strokeStyle = isSelected ? '#e94560' : style.strokeColor;
    ctx.lineWidth = style.strokeWidth;
    ctx.setLineDash(this.getLineDash(style.lineStyle));

    if (style.fillColor) {
      ctx.fillStyle = style.fillColor;
    }

    switch (shape.type) {
      case 'line':
        this.drawLine(shape);
        break;
      case 'rectangle':
        this.drawRectangle(shape);
        break;
      case 'circle':
        this.drawCircle(shape);
        break;
      case 'arc':
        this.drawArc(shape);
        break;
      case 'polyline':
        this.drawPolyline(shape);
        break;
      case 'ellipse':
        this.drawEllipse(shape);
        break;
      default:
        break;
    }

    // Draw selection handles
    if (isSelected) {
      this.drawSelectionHandles(shape);
    }

    // Reset line dash
    ctx.setLineDash([]);
  }

  private getLineDash(lineStyle: string): number[] {
    switch (lineStyle) {
      case 'dashed':
        return [10, 5];
      case 'dotted':
        return [2, 3];
      case 'dashdot':
        return [10, 3, 2, 3];
      default:
        return [];
    }
  }

  private drawLine(shape: LineShape): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(shape.start.x, shape.start.y);
    ctx.lineTo(shape.end.x, shape.end.y);
    ctx.stroke();
  }

  private drawPreview(preview: DrawingPreview, style?: { strokeColor: string; strokeWidth: number }): void {
    if (!preview) return;

    const ctx = this.ctx;

    // Set preview style - solid lines matching final appearance
    ctx.strokeStyle = style?.strokeColor || '#ffffff';
    ctx.lineWidth = style?.strokeWidth || 1;
    ctx.setLineDash([]); // Solid line, same as final shape

    switch (preview.type) {
      case 'line':
        ctx.beginPath();
        ctx.moveTo(preview.start.x, preview.start.y);
        ctx.lineTo(preview.end.x, preview.end.y);
        ctx.stroke();
        break;

      case 'rectangle': {
        const x = Math.min(preview.start.x, preview.end.x);
        const y = Math.min(preview.start.y, preview.end.y);
        const width = Math.abs(preview.end.x - preview.start.x);
        const height = Math.abs(preview.end.y - preview.start.y);
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.stroke();
        break;
      }

      case 'rotatedRectangle': {
        // Draw rotated rectangle using 4 corner points
        const corners = preview.corners;
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        ctx.lineTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[2].x, corners[2].y);
        ctx.lineTo(corners[3].x, corners[3].y);
        ctx.closePath();
        ctx.stroke();
        break;
      }

      case 'circle':
        ctx.beginPath();
        ctx.arc(preview.center.x, preview.center.y, preview.radius, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'polyline':
        if (preview.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(preview.points[0].x, preview.points[0].y);
          for (let i = 1; i < preview.points.length; i++) {
            ctx.lineTo(preview.points[i].x, preview.points[i].y);
          }
          // Draw to current mouse position
          ctx.lineTo(preview.currentPoint.x, preview.currentPoint.y);
          ctx.stroke();
        }
        break;
    }
  }

  private drawRectangle(shape: RectangleShape): void {
    const ctx = this.ctx;
    ctx.save();

    if (shape.rotation) {
      const centerX = shape.topLeft.x + shape.width / 2;
      const centerY = shape.topLeft.y + shape.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(shape.rotation);
      ctx.translate(-centerX, -centerY);
    }

    ctx.beginPath();
    ctx.rect(shape.topLeft.x, shape.topLeft.y, shape.width, shape.height);

    if (shape.style.fillColor) {
      ctx.fill();
    }
    ctx.stroke();

    ctx.restore();
  }

  private drawCircle(shape: CircleShape): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);

    if (shape.style.fillColor) {
      ctx.fill();
    }
    ctx.stroke();
  }

  private drawArc(shape: Shape): void {
    if (shape.type !== 'arc') return;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(
      shape.center.x,
      shape.center.y,
      shape.radius,
      shape.startAngle,
      shape.endAngle
    );
    ctx.stroke();
  }

  private drawPolyline(shape: Shape): void {
    if (shape.type !== 'polyline') return;
    const ctx = this.ctx;
    const { points, closed } = shape;

    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    if (closed) {
      ctx.closePath();
      if (shape.style.fillColor) {
        ctx.fill();
      }
    }

    ctx.stroke();
  }

  private drawEllipse(shape: Shape): void {
    if (shape.type !== 'ellipse') return;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.ellipse(
      shape.center.x,
      shape.center.y,
      shape.radiusX,
      shape.radiusY,
      shape.rotation,
      0,
      Math.PI * 2
    );

    if (shape.style.fillColor) {
      ctx.fill();
    }
    ctx.stroke();
  }

  private drawSelectionHandles(shape: Shape): void {
    const ctx = this.ctx;
    const handleSize = 6;

    ctx.fillStyle = '#e94560';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    const points = this.getShapeHandlePoints(shape);

    for (const point of points) {
      ctx.fillRect(
        point.x - handleSize / 2,
        point.y - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.strokeRect(
        point.x - handleSize / 2,
        point.y - handleSize / 2,
        handleSize,
        handleSize
      );
    }
  }

  private getShapeHandlePoints(shape: Shape): { x: number; y: number }[] {
    switch (shape.type) {
      case 'line':
        return [shape.start, shape.end];
      case 'rectangle':
        return [
          shape.topLeft,
          { x: shape.topLeft.x + shape.width, y: shape.topLeft.y },
          { x: shape.topLeft.x + shape.width, y: shape.topLeft.y + shape.height },
          { x: shape.topLeft.x, y: shape.topLeft.y + shape.height },
        ];
      case 'circle':
        return [
          shape.center,
          { x: shape.center.x + shape.radius, y: shape.center.y },
          { x: shape.center.x - shape.radius, y: shape.center.y },
          { x: shape.center.x, y: shape.center.y + shape.radius },
          { x: shape.center.x, y: shape.center.y - shape.radius },
        ];
      case 'polyline':
        return shape.points;
      default:
        return [];
    }
  }

  private drawSelectionBox(box: SelectionBox): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const x = Math.min(box.start.x, box.end.x);
    const y = Math.min(box.start.y, box.end.y);
    const width = Math.abs(box.end.x - box.start.x);
    const height = Math.abs(box.end.y - box.start.y);

    // Set colors based on selection mode
    if (box.mode === 'window') {
      // Window selection: blue, solid border
      ctx.fillStyle = 'rgba(0, 120, 215, 0.15)';
      ctx.strokeStyle = 'rgba(0, 120, 215, 0.8)';
      ctx.setLineDash([]);
    } else {
      // Crossing selection: green, dashed border
      ctx.fillStyle = 'rgba(0, 180, 0, 0.15)';
      ctx.strokeStyle = 'rgba(0, 180, 0, 0.8)';
      ctx.setLineDash([6, 3]);
    }

    ctx.lineWidth = 1;

    // Draw filled rectangle
    ctx.fillRect(x, y, width, height);

    // Draw border
    ctx.strokeRect(x, y, width, height);

    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawCommandPreviewShapes(shapes: Shape[]): void {
    const ctx = this.ctx;

    // AutoCAD-like preview style: green dashed lines
    ctx.strokeStyle = '#00ff00';
    ctx.setLineDash([8, 4]);
    ctx.lineWidth = 1;

    for (const shape of shapes) {
      switch (shape.type) {
        case 'line':
          ctx.beginPath();
          ctx.moveTo(shape.start.x, shape.start.y);
          ctx.lineTo(shape.end.x, shape.end.y);
          ctx.stroke();
          break;

        case 'rectangle':
          ctx.beginPath();
          ctx.rect(shape.topLeft.x, shape.topLeft.y, shape.width, shape.height);
          ctx.stroke();
          break;

        case 'circle':
          ctx.beginPath();
          ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case 'arc':
          ctx.beginPath();
          ctx.arc(
            shape.center.x,
            shape.center.y,
            shape.radius,
            shape.startAngle,
            shape.endAngle
          );
          ctx.stroke();
          break;

        case 'polyline':
          if (shape.points.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
              ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            if (shape.closed) {
              ctx.closePath();
            }
            ctx.stroke();
          }
          break;

        case 'ellipse':
          ctx.beginPath();
          ctx.ellipse(
            shape.center.x,
            shape.center.y,
            shape.radiusX,
            shape.radiusY,
            shape.rotation,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          break;
      }
    }

    ctx.setLineDash([]);
  }

  private drawSnapIndicator(snapPoint: SnapPoint, viewport: Viewport): void {
    const ctx = this.ctx;
    const { point, type } = snapPoint;
    const size = 8 / viewport.zoom; // Size in world coordinates

    ctx.save();
    ctx.strokeStyle = this.getSnapColor(type);
    ctx.fillStyle = this.getSnapColor(type);
    ctx.lineWidth = 1.5 / viewport.zoom;

    switch (type) {
      case 'endpoint':
        // Square marker
        ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
        break;

      case 'midpoint':
        // Triangle marker
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - size / 2);
        ctx.lineTo(point.x - size / 2, point.y + size / 2);
        ctx.lineTo(point.x + size / 2, point.y + size / 2);
        ctx.closePath();
        ctx.stroke();
        break;

      case 'center':
        // Circle marker
        ctx.beginPath();
        ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'intersection':
        // X marker
        ctx.beginPath();
        ctx.moveTo(point.x - size / 2, point.y - size / 2);
        ctx.lineTo(point.x + size / 2, point.y + size / 2);
        ctx.moveTo(point.x + size / 2, point.y - size / 2);
        ctx.lineTo(point.x - size / 2, point.y + size / 2);
        ctx.stroke();
        break;

      case 'perpendicular':
        // Perpendicular symbol (L rotated)
        ctx.beginPath();
        ctx.moveTo(point.x - size / 2, point.y);
        ctx.lineTo(point.x, point.y);
        ctx.lineTo(point.x, point.y - size / 2);
        ctx.stroke();
        // Small square in corner
        const cornerSize = size / 4;
        ctx.strokeRect(point.x - cornerSize, point.y - cornerSize, cornerSize, cornerSize);
        break;

      case 'tangent':
        // Circle with line
        ctx.beginPath();
        ctx.arc(point.x, point.y, size / 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(point.x - size / 2, point.y + size / 3);
        ctx.lineTo(point.x + size / 2, point.y + size / 3);
        ctx.stroke();
        break;

      case 'nearest':
        // Diamond marker
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - size / 2);
        ctx.lineTo(point.x + size / 2, point.y);
        ctx.lineTo(point.x, point.y + size / 2);
        ctx.lineTo(point.x - size / 2, point.y);
        ctx.closePath();
        ctx.stroke();
        break;

      case 'grid':
        // Plus marker
        ctx.beginPath();
        ctx.moveTo(point.x - size / 2, point.y);
        ctx.lineTo(point.x + size / 2, point.y);
        ctx.moveTo(point.x, point.y - size / 2);
        ctx.lineTo(point.x, point.y + size / 2);
        ctx.stroke();
        break;

      default:
        // Small filled circle as fallback
        ctx.beginPath();
        ctx.arc(point.x, point.y, size / 4, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  private drawSnapLabel(snapPoint: SnapPoint, viewport: Viewport): void {
    const ctx = this.ctx;
    const { point, type } = snapPoint;

    // Convert world point to screen coordinates
    const screenX = point.x * viewport.zoom + viewport.offsetX;
    const screenY = point.y * viewport.zoom + viewport.offsetY;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Draw label background
    const label = this.getSnapLabel(type);
    ctx.font = '11px Arial, sans-serif';
    const metrics = ctx.measureText(label);
    const padding = 4;
    const labelX = screenX + 12;
    const labelY = screenY - 12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(
      labelX - padding,
      labelY - 11,
      metrics.width + padding * 2,
      14
    );

    // Draw label text
    ctx.fillStyle = this.getSnapColor(type);
    ctx.fillText(label, labelX, labelY);

    ctx.restore();
  }

  private getSnapColor(type: SnapType): string {
    switch (type) {
      case 'endpoint':
        return '#00ff00'; // Green
      case 'midpoint':
        return '#00ffff'; // Cyan
      case 'center':
        return '#ff00ff'; // Magenta
      case 'intersection':
        return '#ffff00'; // Yellow
      case 'perpendicular':
        return '#ff8800'; // Orange
      case 'tangent':
        return '#88ff00'; // Lime
      case 'nearest':
        return '#ff88ff'; // Pink
      case 'grid':
        return '#8888ff'; // Light blue
      default:
        return '#ffffff'; // White
    }
  }

  private getSnapLabel(type: SnapType): string {
    switch (type) {
      case 'endpoint':
        return 'Endpoint';
      case 'midpoint':
        return 'Midpoint';
      case 'center':
        return 'Center';
      case 'intersection':
        return 'Intersection';
      case 'perpendicular':
        return 'Perpendicular';
      case 'tangent':
        return 'Tangent';
      case 'nearest':
        return 'Nearest';
      case 'grid':
        return 'Grid';
      default:
        return type;
    }
  }

  private drawTrackingLines(
    trackingLines: TrackingLine[],
    trackingPoint: IPoint | null | undefined,
    viewport: Viewport
  ): void {
    const ctx = this.ctx;

    // Calculate max distance for tracking line extension
    const maxDistance = Math.max(this.width, this.height) / viewport.zoom * 2;

    ctx.save();

    for (const line of trackingLines) {
      const color = getTrackingLineColor(line.type);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 / viewport.zoom;
      ctx.setLineDash([6 / viewport.zoom, 4 / viewport.zoom]);

      // Draw the tracking line extending from origin
      ctx.beginPath();
      ctx.moveTo(line.origin.x, line.origin.y);

      // Extend line in the direction
      const endX = line.origin.x + line.direction.x * maxDistance;
      const endY = line.origin.y + line.direction.y * maxDistance;
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw small circle at origin point
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(line.origin.x, line.origin.y, 3 / viewport.zoom, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw tracking point marker if we have one
    if (trackingPoint) {
      ctx.setLineDash([]);
      ctx.strokeStyle = '#00ffff';
      ctx.fillStyle = '#00ffff';
      ctx.lineWidth = 2 / viewport.zoom;

      // Draw crosshair at tracking point
      const size = 8 / viewport.zoom;
      ctx.beginPath();
      ctx.moveTo(trackingPoint.x - size, trackingPoint.y);
      ctx.lineTo(trackingPoint.x + size, trackingPoint.y);
      ctx.moveTo(trackingPoint.x, trackingPoint.y - size);
      ctx.lineTo(trackingPoint.x, trackingPoint.y + size);
      ctx.stroke();

      // Draw small circle
      ctx.beginPath();
      ctx.arc(trackingPoint.x, trackingPoint.y, 4 / viewport.zoom, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawTrackingLabel(
    trackingLines: TrackingLine[],
    trackingPoint: IPoint,
    viewport: Viewport
  ): void {
    if (trackingLines.length === 0) return;

    const ctx = this.ctx;
    const line = trackingLines[0];

    // Convert world point to screen coordinates
    const screenX = trackingPoint.x * viewport.zoom + viewport.offsetX;
    const screenY = trackingPoint.y * viewport.zoom + viewport.offsetY;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Build label text
    let label = '';
    const angleDeg = ((line.angle * 180) / Math.PI + 360) % 360;

    switch (line.type) {
      case 'polar':
        label = `Polar: ${angleDeg.toFixed(0)}°`;
        break;
      case 'parallel':
        label = 'Parallel';
        break;
      case 'perpendicular':
        label = 'Perpendicular';
        break;
      case 'extension':
        label = 'Extension';
        break;
    }

    // Draw label background
    ctx.font = '11px Arial, sans-serif';
    const metrics = ctx.measureText(label);
    const padding = 4;
    const labelX = screenX + 15;
    const labelY = screenY + 15;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(
      labelX - padding,
      labelY - 11,
      metrics.width + padding * 2,
      14
    );

    // Draw label text
    ctx.fillStyle = getTrackingLineColor(line.type);
    ctx.fillText(label, labelX, labelY);

    ctx.restore();
  }

  dispose(): void {
    // Cleanup if needed
  }

  /**
   * Render a sheet (Paper Space) with viewports showing drafts
   */
  renderSheet(options: SheetRenderOptions): void {
    const { sheet, drafts, shapes, viewport, selectedViewportId, draftViewports } = options;
    const ctx = this.ctx;

    // Clear canvas with dark background
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, 0, this.width, this.height);

    // Apply viewport transform for sheet pan/zoom
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Get paper dimensions in mm
    const paperDims = this.getPaperDimensions(sheet);
    const mmToPixels = 3.78; // Approximate conversion for display (96 DPI / 25.4)

    const paperWidth = paperDims.width * mmToPixels;
    const paperHeight = paperDims.height * mmToPixels;

    // Draw paper shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(8, 8, paperWidth, paperHeight);

    // Draw paper background (white)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, paperWidth, paperHeight);

    // Draw paper border
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1 / viewport.zoom;
    ctx.strokeRect(0, 0, paperWidth, paperHeight);

    // Draw viewports
    for (const vp of sheet.viewports) {
      if (!vp.visible) continue;
      this.drawSheetViewport(vp, drafts, shapes, draftViewports, mmToPixels, selectedViewportId === vp.id);
    }

    // Draw title block
    if (sheet.titleBlock.visible) {
      this.drawTitleBlock(sheet.titleBlock, mmToPixels, paperWidth, paperHeight);
    }

    ctx.restore();
  }

  private getPaperDimensions(sheet: Sheet): { width: number; height: number } {
    if (sheet.paperSize === 'Custom') {
      return {
        width: sheet.customWidth || 210,
        height: sheet.customHeight || 297,
      };
    }

    const baseDims = PAPER_SIZES[sheet.paperSize];
    if (sheet.orientation === 'landscape') {
      return { width: baseDims.height, height: baseDims.width };
    }
    return baseDims;
  }

  private drawSheetViewport(
    vp: SheetViewport,
    drafts: Draft[],
    shapes: Shape[],
    _draftViewports: Record<string, Viewport>,
    mmToPixels: number,
    isSelected: boolean
  ): void {
    const ctx = this.ctx;

    // Get the draft to access its boundary
    const draft = drafts.find(d => d.id === vp.draftId);

    // Convert mm to pixels
    const vpX = vp.x * mmToPixels;
    const vpY = vp.y * mmToPixels;
    const vpWidth = vp.width * mmToPixels;
    const vpHeight = vp.height * mmToPixels;

    // Draw viewport border
    ctx.save();

    // Clip to viewport bounds
    ctx.beginPath();
    ctx.rect(vpX, vpY, vpWidth, vpHeight);
    ctx.clip();

    // Draw viewport background (slightly off-white)
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(vpX, vpY, vpWidth, vpHeight);

    // Get shapes for this drawing
    const drawingShapes = shapes.filter(s => s.draftId === vp.draftId && s.visible);

    // Calculate transform for viewport
    // centerX, centerY is the center of the view in drawing coordinates
    // scale is the viewport scale (e.g., 0.01 for 1:100)
    const vpCenterX = vpX + vpWidth / 2;
    const vpCenterY = vpY + vpHeight / 2;

    ctx.translate(vpCenterX, vpCenterY);
    ctx.scale(vp.scale * mmToPixels, vp.scale * mmToPixels);
    ctx.translate(-vp.centerX, -vp.centerY);

    // If draft has a boundary, clip to it
    if (draft?.boundary) {
      ctx.beginPath();
      ctx.rect(draft.boundary.x, draft.boundary.y, draft.boundary.width, draft.boundary.height);
      ctx.clip();
    }

    // Draw shapes
    for (const shape of drawingShapes) {
      this.drawShapeSimple(shape);
    }

    // Draw boundary indicator in viewport (thin line)
    if (draft?.boundary) {
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1 / (vp.scale * mmToPixels);
      ctx.setLineDash([5 / (vp.scale * mmToPixels), 3 / (vp.scale * mmToPixels)]);
      ctx.beginPath();
      ctx.rect(draft.boundary.x, draft.boundary.y, draft.boundary.width, draft.boundary.height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // Draw viewport border (after restore to not clip it)
    ctx.strokeStyle = isSelected ? '#e94560' : '#333333';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(vpX, vpY, vpWidth, vpHeight);

    // Draw viewport label
    const drawing = drafts.find(d => d.id === vp.draftId);
    if (drawing) {
      ctx.fillStyle = '#333333';
      ctx.font = `${10}px Arial`;
      const scaleText = this.formatScale(vp.scale);
      const label = `${drawing.name} (${scaleText})`;
      ctx.fillText(label, vpX + 4, vpY - 4);
    }

    // Draw resize handles if selected
    if (isSelected && !vp.locked) {
      this.drawViewportHandles(vpX, vpY, vpWidth, vpHeight);
    }
  }

  private drawShapeSimple(shape: Shape): void {
    const ctx = this.ctx;
    const { style } = shape;

    // Use black stroke for sheet view (paper is white)
    ctx.strokeStyle = style.strokeColor === '#ffffff' ? '#000000' : style.strokeColor;
    ctx.lineWidth = style.strokeWidth;
    ctx.setLineDash(this.getLineDash(style.lineStyle));

    if (style.fillColor) {
      ctx.fillStyle = style.fillColor;
    }

    switch (shape.type) {
      case 'line':
        this.drawLine(shape);
        break;
      case 'rectangle':
        this.drawRectangle(shape);
        break;
      case 'circle':
        this.drawCircle(shape);
        break;
      case 'arc':
        this.drawArc(shape);
        break;
      case 'polyline':
        this.drawPolyline(shape);
        break;
      case 'ellipse':
        this.drawEllipse(shape);
        break;
    }

    ctx.setLineDash([]);
  }

  private formatScale(scale: number): string {
    if (scale >= 1) {
      return `${scale}:1`;
    }
    const inverse = Math.round(1 / scale);
    return `1:${inverse}`;
  }

  private drawViewportHandles(x: number, y: number, width: number, height: number): void {
    const ctx = this.ctx;
    const handleSize = 8;

    ctx.fillStyle = '#e94560';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    // Corner handles
    const positions = [
      { x: x, y: y },  // top-left
      { x: x + width, y: y },  // top-right
      { x: x + width, y: y + height },  // bottom-right
      { x: x, y: y + height },  // bottom-left
      // Edge midpoints
      { x: x + width / 2, y: y },  // top
      { x: x + width, y: y + height / 2 },  // right
      { x: x + width / 2, y: y + height },  // bottom
      { x: x, y: y + height / 2 },  // left
    ];

    for (const pos of positions) {
      ctx.fillRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
    }

    // Draw center handle (for moving) - different style
    ctx.fillStyle = '#4a90d9';
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Get viewport handle positions for hit testing
   * Returns positions in sheet coordinates (mm)
   */
  getViewportHandlePositions(vp: SheetViewport): Record<ViewportHandleType, { x: number; y: number }> {
    return {
      'top-left': { x: vp.x, y: vp.y },
      'top': { x: vp.x + vp.width / 2, y: vp.y },
      'top-right': { x: vp.x + vp.width, y: vp.y },
      'left': { x: vp.x, y: vp.y + vp.height / 2 },
      'center': { x: vp.x + vp.width / 2, y: vp.y + vp.height / 2 },
      'right': { x: vp.x + vp.width, y: vp.y + vp.height / 2 },
      'bottom-left': { x: vp.x, y: vp.y + vp.height },
      'bottom': { x: vp.x + vp.width / 2, y: vp.y + vp.height },
      'bottom-right': { x: vp.x + vp.width, y: vp.y + vp.height },
    };
  }

  /**
   * Check if a point (in sheet mm coordinates) is inside a viewport
   */
  isPointInViewport(point: { x: number; y: number }, vp: SheetViewport): boolean {
    return (
      point.x >= vp.x &&
      point.x <= vp.x + vp.width &&
      point.y >= vp.y &&
      point.y <= vp.y + vp.height
    );
  }

  /**
   * Find which handle (if any) is at the given point
   * Returns handle type or null if no handle at that position
   */
  findViewportHandleAtPoint(
    point: { x: number; y: number },
    vp: SheetViewport,
    tolerance: number = 5  // mm
  ): ViewportHandleType | null {
    const handles = this.getViewportHandlePositions(vp);

    for (const [handleType, handlePos] of Object.entries(handles)) {
      const dx = point.x - handlePos.x;
      const dy = point.y - handlePos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= tolerance) {
        return handleType as ViewportHandleType;
      }
    }

    return null;
  }

  private drawTitleBlock(titleBlock: TitleBlock, mmToPixels: number, paperWidth: number, paperHeight: number): void {
    const ctx = this.ctx;

    // Position title block at bottom-right of paper (common placement)
    const tbWidth = titleBlock.width * mmToPixels;
    const tbHeight = titleBlock.height * mmToPixels;
    const tbX = paperWidth - tbWidth - titleBlock.x * mmToPixels;
    const tbY = paperHeight - tbHeight - titleBlock.y * mmToPixels;

    // Draw title block background (light gray)
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(tbX, tbY, tbWidth, tbHeight);

    // Draw title block outer border (thicker)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(tbX, tbY, tbWidth, tbHeight);

    // Draw inner grid lines (Revit-like layout)
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    // Horizontal dividers - 4 rows
    const rowHeights = [15, 15, 15, 15]; // mm
    let currentY = tbY;
    for (let i = 0; i < rowHeights.length - 1; i++) {
      currentY += rowHeights[i] * mmToPixels;
      ctx.moveTo(tbX, currentY);
      ctx.lineTo(tbX + tbWidth, currentY);
    }

    // Vertical dividers - adaptive based on fields
    // First row split
    const col1Width = 90 * mmToPixels; // Project column
    ctx.moveTo(tbX + col1Width, tbY);
    ctx.lineTo(tbX + col1Width, tbY + 15 * mmToPixels);

    // Second row split
    const col2Width = 125 * mmToPixels; // Title column
    ctx.moveTo(tbX + col2Width, tbY + 15 * mmToPixels);
    ctx.lineTo(tbX + col2Width, tbY + 30 * mmToPixels);

    // Third row splits (5 columns for Scale/Date/Drawn/Checked/Approved)
    const smallColWidth = tbWidth / 5;
    for (let i = 1; i < 5; i++) {
      const x = tbX + smallColWidth * i;
      ctx.moveTo(x, tbY + 30 * mmToPixels);
      ctx.lineTo(x, tbY + 45 * mmToPixels);
    }

    // Fourth row splits (Sheet/Revision | Status)
    ctx.moveTo(tbX + 80 * mmToPixels, tbY + 45 * mmToPixels);
    ctx.lineTo(tbX + 80 * mmToPixels, tbY + tbHeight);
    ctx.moveTo(tbX + 125 * mmToPixels, tbY + 45 * mmToPixels);
    ctx.lineTo(tbX + 125 * mmToPixels, tbY + tbHeight);

    ctx.stroke();

    // Draw fields with labels and values
    ctx.textBaseline = 'top';

    for (const field of titleBlock.fields) {
      const fieldX = tbX + field.x * mmToPixels;
      const fieldY = tbY + field.y * mmToPixels;

      // Draw label (smaller, gray)
      ctx.fillStyle = '#666666';
      ctx.font = `${Math.max(7, (field.fontSize || 8) - 2)}px ${field.fontFamily || 'Arial'}`;
      ctx.fillText(field.label, fieldX, fieldY);

      // Draw value (larger, black, below label)
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${field.fontSize || 10}px ${field.fontFamily || 'Arial'}`;
      const value = field.value || '';
      ctx.fillText(value, fieldX, fieldY + 10);
    }

    ctx.textBaseline = 'alphabetic';
  }
}
