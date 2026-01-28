/**
 * ShapeRenderer - Renders individual shapes
 */

import type { Shape, DrawingPreview, CurrentStyle } from '../types';
import { BaseRenderer } from './BaseRenderer';
import { COLORS } from '../types';

export class ShapeRenderer extends BaseRenderer {
  /**
   * Draw a shape with selection state
   */
  drawShape(shape: Shape, isSelected: boolean): void {
    const ctx = this.ctx;
    const { style } = shape;

    // Set line style
    ctx.strokeStyle = isSelected ? COLORS.selection : style.strokeColor;
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
      case 'text':
        this.drawText(shape, isSelected);
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

  /**
   * Draw a shape without selection highlighting (for sheet viewports)
   */
  drawShapeSimple(shape: Shape, invertColors: boolean = false): void {
    const ctx = this.ctx;
    const { style } = shape;

    // Use black stroke for sheet view (paper is white) if color is white
    let strokeColor = style.strokeColor;
    if (invertColors && style.strokeColor === '#ffffff') {
      strokeColor = '#000000';
    }

    ctx.strokeStyle = strokeColor;
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
      case 'text':
        this.drawText(shape, false, invertColors);
        break;
    }

    ctx.setLineDash([]);
  }

  /**
   * Draw drawing preview
   */
  drawPreview(preview: DrawingPreview, style?: CurrentStyle): void {
    if (!preview) return;

    const ctx = this.ctx;

    // Set preview style - solid lines matching final appearance
    ctx.strokeStyle = style?.strokeColor || '#ffffff';
    ctx.lineWidth = style?.strokeWidth || 1;
    ctx.setLineDash([]);

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

      case 'arc':
        ctx.beginPath();
        ctx.arc(preview.center.x, preview.center.y, preview.radius, preview.startAngle, preview.endAngle);
        ctx.stroke();
        break;

      case 'polyline':
        if (preview.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(preview.points[0].x, preview.points[0].y);
          for (let i = 1; i < preview.points.length; i++) {
            ctx.lineTo(preview.points[i].x, preview.points[i].y);
          }
          ctx.lineTo(preview.currentPoint.x, preview.currentPoint.y);
          ctx.stroke();
        }
        break;

      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(preview.center.x, preview.center.y, preview.radiusX, preview.radiusY, preview.rotation, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'text': {
        // Draw text cursor indicator
        const cursorHeight = style?.strokeWidth ? style.strokeWidth * 10 : 14;
        ctx.beginPath();
        ctx.moveTo(preview.position.x, preview.position.y);
        ctx.lineTo(preview.position.x, preview.position.y + cursorHeight);
        ctx.stroke();
        // Draw small horizontal lines at top and bottom
        ctx.beginPath();
        ctx.moveTo(preview.position.x - 3, preview.position.y);
        ctx.lineTo(preview.position.x + 3, preview.position.y);
        ctx.moveTo(preview.position.x - 3, preview.position.y + cursorHeight);
        ctx.lineTo(preview.position.x + 3, preview.position.y + cursorHeight);
        ctx.stroke();
        break;
      }
    }
  }

  /**
   * Draw command preview shapes (move/copy preview)
   */
  drawCommandPreviewShapes(shapes: Shape[]): void {
    const ctx = this.ctx;

    // AutoCAD-like preview style: green dashed lines
    ctx.strokeStyle = COLORS.commandPreview;
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
          ctx.arc(shape.center.x, shape.center.y, shape.radius, shape.startAngle, shape.endAngle);
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
          ctx.ellipse(shape.center.x, shape.center.y, shape.radiusX, shape.radiusY, shape.rotation, 0, Math.PI * 2);
          ctx.stroke();
          break;
      }
    }

    ctx.setLineDash([]);
  }

  // Private shape drawing methods
  private drawLine(shape: Shape): void {
    if (shape.type !== 'line') return;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(shape.start.x, shape.start.y);
    ctx.lineTo(shape.end.x, shape.end.y);
    ctx.stroke();
  }

  private drawRectangle(shape: Shape): void {
    if (shape.type !== 'rectangle') return;
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

  private drawCircle(shape: Shape): void {
    if (shape.type !== 'circle') return;
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
    ctx.arc(shape.center.x, shape.center.y, shape.radius, shape.startAngle, shape.endAngle);
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
    ctx.ellipse(shape.center.x, shape.center.y, shape.radiusX, shape.radiusY, shape.rotation, 0, Math.PI * 2);

    if (shape.style.fillColor) {
      ctx.fill();
    }
    ctx.stroke();
  }

  private drawText(shape: Shape, isSelected: boolean, invertColors: boolean = false): void {
    if (shape.type !== 'text') return;
    const ctx = this.ctx;

    const {
      position,
      text,
      fontSize,
      fontFamily,
      rotation,
      alignment,
      verticalAlignment,
      bold,
      italic,
      underline,
      color,
      lineHeight = 1.2,
    } = shape;

    ctx.save();

    // Apply rotation around position
    if (rotation !== 0) {
      ctx.translate(position.x, position.y);
      ctx.rotate(rotation);
      ctx.translate(-position.x, -position.y);
    }

    // Build font string
    const fontStyle = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}`;
    ctx.font = `${fontStyle}${fontSize}px ${fontFamily}`;

    // Set text color - invert white to black for sheet mode
    let textColor = color || shape.style.strokeColor;
    if (invertColors && textColor === '#ffffff') {
      textColor = '#000000';
    }
    ctx.fillStyle = textColor;

    // Set alignment
    ctx.textAlign = alignment;
    ctx.textBaseline = verticalAlignment === 'middle' ? 'middle' :
                       verticalAlignment === 'bottom' ? 'bottom' : 'top';

    // Handle multi-line text
    const lines = text.split('\n');
    const actualLineHeight = fontSize * lineHeight;

    // Draw text lines
    for (let i = 0; i < lines.length; i++) {
      const y = position.y + i * actualLineHeight;
      ctx.fillText(lines[i], position.x, y);

      // Draw underline if enabled
      if (underline && lines[i].length > 0) {
        const metrics = ctx.measureText(lines[i]);
        let startX = position.x;
        if (alignment === 'center') startX -= metrics.width / 2;
        else if (alignment === 'right') startX -= metrics.width;

        ctx.strokeStyle = textColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, y + fontSize + 2);
        ctx.lineTo(startX + metrics.width, y + fontSize + 2);
        ctx.stroke();
      }
    }

    ctx.restore();

    // Draw selection box if selected
    if (isSelected) {
      this.drawTextSelectionBox(shape);
    }
  }

  private drawTextSelectionBox(shape: Shape): void {
    if (shape.type !== 'text') return;
    const ctx = this.ctx;

    const { position, text, fontSize, fontFamily, alignment, bold, italic, lineHeight = 1.2 } = shape;

    // Temporarily set font to measure text
    const fontStyle = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}`;
    ctx.font = `${fontStyle}${fontSize}px ${fontFamily}`;

    const lines = text.split('\n');
    const actualLineHeight = fontSize * lineHeight;
    const height = lines.length * actualLineHeight;

    // Find the widest line
    let maxWidth = 0;
    for (const line of lines) {
      const metrics = ctx.measureText(line);
      if (metrics.width > maxWidth) maxWidth = metrics.width;
    }

    // Calculate bounding box based on alignment
    let minX = position.x;
    if (alignment === 'center') minX -= maxWidth / 2;
    else if (alignment === 'right') minX -= maxWidth;

    // Draw selection rectangle
    ctx.strokeStyle = COLORS.selection;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(minX - 2, position.y - 2, maxWidth + 4, height + 4);
    ctx.setLineDash([]);
  }

  private drawSelectionHandles(shape: Shape): void {
    const ctx = this.ctx;
    const handleSize = 6;

    ctx.fillStyle = COLORS.selectionHandle;
    ctx.strokeStyle = COLORS.selectionHandleStroke;
    ctx.lineWidth = 1;

    const points = this.getShapeHandlePoints(shape);

    for (const point of points) {
      ctx.fillRect(point.x - handleSize / 2, point.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(point.x - handleSize / 2, point.y - handleSize / 2, handleSize, handleSize);
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
      case 'arc':
        // Arc handles: center, start point, end point
        return [
          shape.center,
          { x: shape.center.x + shape.radius * Math.cos(shape.startAngle), y: shape.center.y + shape.radius * Math.sin(shape.startAngle) },
          { x: shape.center.x + shape.radius * Math.cos(shape.endAngle), y: shape.center.y + shape.radius * Math.sin(shape.endAngle) },
        ];
      case 'polyline':
        return shape.points;
      case 'text':
        // Text uses selection box instead of handles
        return [shape.position];
      default:
        return [];
    }
  }
}
