/**
 * Spline Utilities - Catmull-Rom interpolating spline math
 *
 * Converts Catmull-Rom control points to cubic Bezier segments.
 * The curve passes through every control point with C1 continuity.
 */

import type { Point } from '../../types/geometry';

export interface BezierSegment {
  cp1: Point;
  cp2: Point;
  end: Point;
}

/**
 * Convert an array of Catmull-Rom control points into cubic Bezier segments.
 * Each segment starts at points[i] and ends at points[i+1].
 * Endpoints are clamped (P[-1] = P[0], P[n] = P[n-1]).
 */
export function catmullRomToBezier(points: Point[]): BezierSegment[] {
  if (points.length < 2) return [];

  const segments: BezierSegment[] = [];
  const n = points.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, n - 1)];

    const cp1: Point = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
    };
    const cp2: Point = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
    };

    segments.push({ cp1, cp2, end: p2 });
  }

  return segments;
}

/**
 * Draw a Catmull-Rom spline onto a canvas context.
 */
export function drawSplinePath(ctx: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length < 2) return;

  const segments = catmullRomToBezier(points);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (const seg of segments) {
    ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.end.x, seg.end.y);
  }
}

/**
 * Convert Catmull-Rom control points to an SVG path string.
 */
export function splineToSvgPath(points: Point[]): string {
  if (points.length < 2) return '';

  const segments = catmullRomToBezier(points);
  let d = `M ${points[0].x},${points[0].y}`;

  for (const seg of segments) {
    d += ` C ${seg.cp1.x},${seg.cp1.y} ${seg.cp2.x},${seg.cp2.y} ${seg.end.x},${seg.end.y}`;
  }

  return d;
}

/**
 * Check if a point is near a Catmull-Rom spline (for hit testing).
 * Subdivides each Bezier segment into line sub-segments and tests proximity.
 */
export function isPointNearSpline(
  point: Point,
  splinePoints: Point[],
  tolerance: number
): boolean {
  if (splinePoints.length < 2) return false;

  const segments = catmullRomToBezier(splinePoints);
  let segStart = splinePoints[0];

  for (const seg of segments) {
    let lastPt = segStart;
    const steps = 10;
    for (let t = 1; t <= steps; t++) {
      const u = t / steps;
      const mu = 1 - u;
      const current = {
        x: mu * mu * mu * segStart.x + 3 * mu * mu * u * seg.cp1.x + 3 * mu * u * u * seg.cp2.x + u * u * u * seg.end.x,
        y: mu * mu * mu * segStart.y + 3 * mu * mu * u * seg.cp1.y + 3 * mu * u * u * seg.cp2.y + u * u * u * seg.end.y,
      };

      if (isPointNearLineSegment(point, lastPt, current, tolerance)) {
        return true;
      }
      lastPt = current;
    }
    segStart = seg.end;
  }

  return false;
}

function isPointNearLineSegment(
  point: Point,
  start: Point,
  end: Point,
  tolerance: number
): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2) <= tolerance;
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
  const projX = start.x + t * dx;
  const projY = start.y + t * dy;
  return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2) <= tolerance;
}
