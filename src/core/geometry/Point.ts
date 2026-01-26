/**
 * Core Point class with utility methods
 * Foundation for all geometric calculations
 */

export interface IPoint {
  x: number;
  y: number;
}

export class Point implements IPoint {
  constructor(public x: number = 0, public y: number = 0) {}

  static from(p: IPoint): Point {
    return new Point(p.x, p.y);
  }

  static origin(): Point {
    return new Point(0, 0);
  }

  clone(): Point {
    return new Point(this.x, this.y);
  }

  equals(other: IPoint, tolerance: number = 1e-10): boolean {
    return Math.abs(this.x - other.x) < tolerance && Math.abs(this.y - other.y) < tolerance;
  }

  add(other: IPoint): Point {
    return new Point(this.x + other.x, this.y + other.y);
  }

  subtract(other: IPoint): Point {
    return new Point(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Point {
    return new Point(this.x * scalar, this.y * scalar);
  }

  divide(scalar: number): Point {
    if (scalar === 0) throw new Error('Division by zero');
    return new Point(this.x / scalar, this.y / scalar);
  }

  distanceTo(other: IPoint): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceToSquared(other: IPoint): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return dx * dx + dy * dy;
  }

  angleTo(other: IPoint): number {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }

  rotate(angle: number, center: IPoint = { x: 0, y: 0 }): Point {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = this.x - center.x;
    const dy = this.y - center.y;
    return new Point(
      center.x + dx * cos - dy * sin,
      center.y + dx * sin + dy * cos
    );
  }

  lerp(other: IPoint, t: number): Point {
    return new Point(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t
    );
  }

  normalize(): Point {
    const len = Math.sqrt(this.x * this.x + this.y * this.y);
    if (len === 0) return new Point(0, 0);
    return new Point(this.x / len, this.y / len);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  dot(other: IPoint): number {
    return this.x * other.x + this.y * other.y;
  }

  cross(other: IPoint): number {
    return this.x * other.y - this.y * other.x;
  }

  perpendicular(): Point {
    return new Point(-this.y, this.x);
  }

  project(onto: IPoint): Point {
    const ontoLen = Math.sqrt(onto.x * onto.x + onto.y * onto.y);
    if (ontoLen === 0) return new Point(0, 0);
    const scale = this.dot(onto) / (ontoLen * ontoLen);
    return new Point(onto.x * scale, onto.y * scale);
  }

  toObject(): IPoint {
    return { x: this.x, y: this.y };
  }

  toString(): string {
    return `(${this.x.toFixed(4)}, ${this.y.toFixed(4)})`;
  }
}

// Utility functions for working with plain IPoint objects
export const PointUtils = {
  distance(p1: IPoint, p2: IPoint): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  distanceSquared(p1: IPoint, p2: IPoint): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return dx * dx + dy * dy;
  },

  angle(p1: IPoint, p2: IPoint): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  },

  midpoint(p1: IPoint, p2: IPoint): IPoint {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  },

  add(p1: IPoint, p2: IPoint): IPoint {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
  },

  subtract(p1: IPoint, p2: IPoint): IPoint {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
  },

  multiply(p: IPoint, scalar: number): IPoint {
    return { x: p.x * scalar, y: p.y * scalar };
  },

  normalize(p: IPoint): IPoint {
    const len = Math.sqrt(p.x * p.x + p.y * p.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: p.x / len, y: p.y / len };
  },

  dot(p1: IPoint, p2: IPoint): number {
    return p1.x * p2.x + p1.y * p2.y;
  },

  cross(p1: IPoint, p2: IPoint): number {
    return p1.x * p2.y - p1.y * p2.x;
  },

  perpendicular(p: IPoint): IPoint {
    return { x: -p.y, y: p.x };
  },

  rotate(p: IPoint, angle: number, center: IPoint = { x: 0, y: 0 }): IPoint {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  },

  lerp(p1: IPoint, p2: IPoint, t: number): IPoint {
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    };
  },

  equals(p1: IPoint, p2: IPoint, tolerance: number = 1e-10): boolean {
    return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
  },

  fromPolar(distance: number, angle: number, origin: IPoint = { x: 0, y: 0 }): IPoint {
    return {
      x: origin.x + distance * Math.cos(angle),
      y: origin.y + distance * Math.sin(angle),
    };
  },
};
