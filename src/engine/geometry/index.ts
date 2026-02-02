/**
 * Core Geometry Module
 * Central export point for all geometry utilities
 */

export * from './Point';
export * from './Line';
export * from './Tracking';
export * from './GeometryUtils';
export * from './DimensionUtils';
export * from './SplineUtils';
export {
  findNearestSnapPoint,
  getShapeSnapPoints,
  getIntersectionPoints,
  getSnapSymbol,
  getSnapTypeName,
} from './SnapUtils';
export * from './CoordinateParser';

// Re-export commonly used types
export type { IPoint } from './Point';
export type { ILine } from './Line';
export type { TrackingLine, TrackingResult, TrackingSettings } from './Tracking';
