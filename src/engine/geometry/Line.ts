/**
 * Line geometry utilities
 * Supports line-line intersection, perpendicular/parallel calculations, etc.
 */

import { IPoint, PointUtils } from './Point';

export interface ILine {
  start: IPoint;
  end: IPoint;
}

export const LineUtils = {
  /**
   * Get the direction vector of a line (normalized)
   */
  direction(line: ILine): IPoint {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 1, y: 0 };
    return { x: dx / len, y: dy / len };
  },

  /**
   * Get the perpendicular direction (rotated 90 degrees counter-clockwise)
   */
  perpendicularDirection(line: ILine): IPoint {
    const dir = this.direction(line);
    return { x: -dir.y, y: dir.x };
  },

  /**
   * Get the length of a line
   */
  length(line: ILine): number {
    return PointUtils.distance(line.start, line.end);
  },

  /**
   * Get the midpoint of a line
   */
  midpoint(line: ILine): IPoint {
    return PointUtils.midpoint(line.start, line.end);
  },

  /**
   * Get the angle of a line in radians (-PI to PI)
   */
  angle(line: ILine): number {
    return Math.atan2(line.end.y - line.start.y, line.end.x - line.start.x);
  },

  /**
   * Check if two lines are parallel
   */
  areParallel(line1: ILine, line2: ILine, tolerance: number = 1e-10): boolean {
    const dir1 = this.direction(line1);
    const dir2 = this.direction(line2);
    const cross = PointUtils.cross(dir1, dir2);
    return Math.abs(cross) < tolerance;
  },

  /**
   * Check if two lines are perpendicular
   */
  arePerpendicular(line1: ILine, line2: ILine, tolerance: number = 1e-10): boolean {
    const dir1 = this.direction(line1);
    const dir2 = this.direction(line2);
    const dot = PointUtils.dot(dir1, dir2);
    return Math.abs(dot) < tolerance;
  },

  /**
   * Get the closest point on a line segment to a given point
   */
  closestPointOnSegment(line: ILine, point: IPoint): IPoint {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return { ...line.start };

    let t = ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    return {
      x: line.start.x + t * dx,
      y: line.start.y + t * dy,
    };
  },

  /**
   * Get the closest point on an infinite line to a given point
   */
  closestPointOnLine(line: ILine, point: IPoint): IPoint {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return { ...line.start };

    const t = ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / lengthSq;

    return {
      x: line.start.x + t * dx,
      y: line.start.y + t * dy,
    };
  },

  /**
   * Get the distance from a point to a line segment
   */
  distanceToSegment(line: ILine, point: IPoint): number {
    const closest = this.closestPointOnSegment(line, point);
    return PointUtils.distance(point, closest);
  },

  /**
   * Get the distance from a point to an infinite line
   */
  distanceToLine(line: ILine, point: IPoint): number {
    const closest = this.closestPointOnLine(line, point);
    return PointUtils.distance(point, closest);
  },

  /**
   * Find intersection point of two line segments
   * Returns null if lines don't intersect within segments
   */
  segmentIntersection(line1: ILine, line2: ILine): IPoint | null {
    const p1 = line1.start;
    const p2 = line1.end;
    const p3 = line2.start;
    const p4 = line2.end;

    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (Math.abs(denom) < 1e-10) return null; // Parallel lines

    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

    // Check if intersection is within both line segments
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return null;

    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y),
    };
  },

  /**
   * Find intersection point of two infinite lines
   * Returns null if lines are parallel
   */
  lineIntersection(line1: ILine, line2: ILine): IPoint | null {
    const p1 = line1.start;
    const p2 = line1.end;
    const p3 = line2.start;
    const p4 = line2.end;

    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (Math.abs(denom) < 1e-10) return null; // Parallel lines

    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;

    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y),
    };
  },

  /**
   * Create a line parallel to the given line at a specified distance
   */
  parallel(line: ILine, distance: number): ILine {
    const perpDir = this.perpendicularDirection(line);
    const offset = PointUtils.multiply(perpDir, distance);
    return {
      start: PointUtils.add(line.start, offset),
      end: PointUtils.add(line.end, offset),
    };
  },

  /**
   * Create a perpendicular line through a point on the original line
   */
  perpendicularThrough(line: ILine, throughPoint: IPoint, length: number = 100): ILine {
    const perpDir = this.perpendicularDirection(line);
    const halfLen = length / 2;
    return {
      start: {
        x: throughPoint.x - perpDir.x * halfLen,
        y: throughPoint.y - perpDir.y * halfLen,
      },
      end: {
        x: throughPoint.x + perpDir.x * halfLen,
        y: throughPoint.y + perpDir.y * halfLen,
      },
    };
  },

  /**
   * Get the perpendicular point from cursor to line (foot of perpendicular)
   */
  perpendicularFoot(line: ILine, point: IPoint): IPoint {
    return this.closestPointOnLine(line, point);
  },

  /**
   * Extend a line from its start point in the direction of the line
   */
  extend(line: ILine, distance: number, fromStart: boolean = false): ILine {
    const dir = this.direction(line);
    if (fromStart) {
      return {
        start: {
          x: line.start.x - dir.x * distance,
          y: line.start.y - dir.y * distance,
        },
        end: line.end,
      };
    } else {
      return {
        start: line.start,
        end: {
          x: line.end.x + dir.x * distance,
          y: line.end.y + dir.y * distance,
        },
      };
    }
  },

  /**
   * Get a point on the line at parameter t (0 = start, 1 = end)
   */
  pointAt(line: ILine, t: number): IPoint {
    return PointUtils.lerp(line.start, line.end, t);
  },

  /**
   * Get parameter t for closest point on line to given point
   */
  parameterAt(line: ILine, point: IPoint): number {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return 0;

    return ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / lengthSq;
  },

  /**
   * Check if a point is on the line segment
   */
  containsPoint(line: ILine, point: IPoint, tolerance: number = 1e-6): boolean {
    const dist = this.distanceToSegment(line, point);
    return dist < tolerance;
  },

  /**
   * Get angle between two lines in radians (0 to PI)
   */
  angleBetween(line1: ILine, line2: ILine): number {
    const dir1 = this.direction(line1);
    const dir2 = this.direction(line2);
    const dot = PointUtils.dot(dir1, dir2);
    return Math.acos(Math.max(-1, Math.min(1, dot)));
  },

  /**
   * Snap angle to nearest multiple of snapAngle (in degrees)
   */
  snapAngle(line: ILine, basePoint: IPoint, snapAngleDegrees: number = 45): ILine {
    const angle = this.angle(line);
    const snapAngleRad = (snapAngleDegrees * Math.PI) / 180;
    const snappedAngle = Math.round(angle / snapAngleRad) * snapAngleRad;
    const length = this.length(line);

    return {
      start: basePoint,
      end: PointUtils.fromPolar(length, snappedAngle, basePoint),
    };
  },
};
