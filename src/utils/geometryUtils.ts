/**
 * Geometry Utilities - Helper functions for geometric calculations
 */

import type { Point, Shape, RectangleShape, TextShape, ArcShape, EllipseShape } from '../types/geometry';

/**
 * Shape bounding box
 */
export interface ShapeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Check if a point is near a shape (for hit testing)
 */
export function isPointNearShape(point: Point, shape: Shape, tolerance: number = 5): boolean {
  switch (shape.type) {
    case 'line':
      return isPointNearLine(point, shape.start, shape.end, tolerance);
    case 'rectangle':
      return isPointNearRectangleEdges(point, shape, tolerance);
    case 'circle':
      return isPointNearCircle(point, shape.center, shape.radius, tolerance);
    case 'arc':
      return isPointNearArc(point, shape, tolerance);
    case 'polyline':
      return isPointNearPolyline(point, shape.points, tolerance);
    case 'ellipse':
      return isPointNearEllipse(point, shape, tolerance);
    case 'text':
      return isPointNearText(point, shape, tolerance);
    default:
      return false;
  }
}

/**
 * Check if a point is near an arc
 */
export function isPointNearArc(
  point: Point,
  arc: ArcShape,
  tolerance: number
): boolean {
  const { center, radius, startAngle, endAngle } = arc;

  // Calculate distance from point to center
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Check if point is near the arc radius
  if (Math.abs(distance - radius) > tolerance) {
    return false;
  }

  // Check if point is within the arc's angle range
  let angle = Math.atan2(dy, dx);

  // Normalize angles to [0, 2*PI)
  const normalizeAngle = (a: number): number => {
    let normalized = a % (Math.PI * 2);
    if (normalized < 0) normalized += Math.PI * 2;
    return normalized;
  };

  const nAngle = normalizeAngle(angle);
  const nStart = normalizeAngle(startAngle);
  const nEnd = normalizeAngle(endAngle);

  // Check if angle is within the arc range
  if (nStart <= nEnd) {
    // Normal case: arc doesn't cross 0
    return nAngle >= nStart - 0.1 && nAngle <= nEnd + 0.1;
  } else {
    // Arc crosses 0 (e.g., from 350° to 10°)
    return nAngle >= nStart - 0.1 || nAngle <= nEnd + 0.1;
  }
}

/**
 * Check if a point is near an ellipse (on its perimeter)
 */
export function isPointNearEllipse(
  point: Point,
  ellipse: EllipseShape,
  tolerance: number
): boolean {
  const { center, radiusX, radiusY, rotation } = ellipse;

  // Transform point to ellipse's local coordinate system (unrotated)
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  // Rotated point in local coordinates
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  // For a point on an ellipse: (x/a)² + (y/b)² = 1
  // Calculate the "ellipse distance" - how far from the ellipse curve
  const ellipseValue = (localX / radiusX) ** 2 + (localY / radiusY) ** 2;

  // For points near the ellipse, this value should be close to 1
  // We need to convert this to an approximate distance in pixels
  // Use the average radius for tolerance scaling
  const avgRadius = (radiusX + radiusY) / 2;
  const normalizedTolerance = tolerance / avgRadius;

  // Check if the point is near the ellipse curve (not inside or far outside)
  return Math.abs(Math.sqrt(ellipseValue) - 1) <= normalizedTolerance;
}

/**
 * Check if a point is near a text shape (within bounding box)
 */
export function isPointNearText(point: Point, shape: TextShape, tolerance: number = 5): boolean {
  const bounds = getTextBounds(shape);
  if (!bounds) return false;

  return (
    point.x >= bounds.minX - tolerance &&
    point.x <= bounds.maxX + tolerance &&
    point.y >= bounds.minY - tolerance &&
    point.y <= bounds.maxY + tolerance
  );
}

/**
 * Get approximate bounding box of a text shape
 */
export function getTextBounds(shape: TextShape): ShapeBounds | null {
  const { position, text, fontSize, alignment, lineHeight = 1.2 } = shape;

  if (!text) return null;

  const lines = text.split('\n');
  const maxLineLength = Math.max(...lines.map(l => l.length));
  // Approximate width based on character count (rough estimate)
  const approxWidth = Math.max(maxLineLength * fontSize * 0.6, fontSize * 2);
  const height = lines.length * fontSize * lineHeight;

  let minX = position.x;
  if (alignment === 'center') minX -= approxWidth / 2;
  else if (alignment === 'right') minX -= approxWidth;

  return {
    minX,
    minY: position.y,
    maxX: minX + approxWidth,
    maxY: position.y + height,
  };
}

/**
 * Check if a point is near a line segment
 */
export function isPointNearLine(
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

/**
 * Check if a point is inside a rectangle (used for box selection)
 */
export function isPointInRectangle(point: Point, rect: RectangleShape): boolean {
  return (
    point.x >= rect.topLeft.x &&
    point.x <= rect.topLeft.x + rect.width &&
    point.y >= rect.topLeft.y &&
    point.y <= rect.topLeft.y + rect.height
  );
}

/**
 * Check if a point is near any edge of a rectangle (edges only, not inside)
 */
export function isPointNearRectangleEdges(
  point: Point,
  rect: RectangleShape,
  tolerance: number
): boolean {
  // Get rectangle corners
  const { topLeft, width, height, rotation } = rect;

  // Calculate center of rectangle
  const centerX = topLeft.x + width / 2;
  const centerY = topLeft.y + height / 2;

  // If rectangle is rotated, rotate the point in opposite direction around center
  let testPoint = point;
  if (rotation && rotation !== 0) {
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    testPoint = {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos,
    };
  }

  // Now test against axis-aligned rectangle
  const left = topLeft.x;
  const right = topLeft.x + width;
  const top = topLeft.y;
  const bottom = topLeft.y + height;

  // Check each edge
  // Top edge
  if (isPointNearLine(testPoint, { x: left, y: top }, { x: right, y: top }, tolerance)) {
    return true;
  }
  // Right edge
  if (isPointNearLine(testPoint, { x: right, y: top }, { x: right, y: bottom }, tolerance)) {
    return true;
  }
  // Bottom edge
  if (isPointNearLine(testPoint, { x: right, y: bottom }, { x: left, y: bottom }, tolerance)) {
    return true;
  }
  // Left edge
  if (isPointNearLine(testPoint, { x: left, y: bottom }, { x: left, y: top }, tolerance)) {
    return true;
  }

  return false;
}

/**
 * Check if a point is near a circle's circumference (edge only, not inside)
 */
export function isPointNearCircle(
  point: Point,
  center: Point,
  radius: number,
  tolerance: number
): boolean {
  const distance = Math.sqrt((point.x - center.x) ** 2 + (point.y - center.y) ** 2);
  // Only check if point is near the circumference, not inside
  return Math.abs(distance - radius) <= tolerance;
}

/**
 * Check if a point is near any segment of a polyline
 */
export function isPointNearPolyline(
  point: Point,
  points: Point[],
  tolerance: number
): boolean {
  if (points.length < 2) return false;

  for (let i = 0; i < points.length - 1; i++) {
    if (isPointNearLine(point, points[i], points[i + 1], tolerance)) {
      return true;
    }
  }
  return false;
}

/**
 * Get bounding box of a shape
 */
export function getShapeBounds(shape: Shape): ShapeBounds | null {
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

/**
 * Calculate circle center and radius from 3 points on circumference
 */
export function calculateCircleFrom3Points(
  p1: Point,
  p2: Point,
  p3: Point
): { center: Point; radius: number } | null {
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

/**
 * Snap point to 45-degree angle increments relative to base point
 */
export function snapToAngle(basePoint: Point, targetPoint: Point): Point {
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
}

/**
 * Calculate distance between two points
 */
export function pointDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: { offsetX: number; offsetY: number; zoom: number }
): Point {
  return {
    x: (screenX - viewport.offsetX) / viewport.zoom,
    y: (screenY - viewport.offsetY) / viewport.zoom,
  };
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: { offsetX: number; offsetY: number; zoom: number }
): Point {
  return {
    x: worldX * viewport.zoom + viewport.offsetX,
    y: worldY * viewport.zoom + viewport.offsetY,
  };
}
