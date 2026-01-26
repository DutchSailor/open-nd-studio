// Core geometry types for the CAD engine

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'dashdot';

export interface ShapeStyle {
  strokeColor: string;
  strokeWidth: number;
  lineStyle: LineStyle;
  fillColor?: string;
}

// Base shape interface
export interface BaseShape {
  id: string;
  type: ShapeType;
  layerId: string;
  draftId: string;  // Which draft this shape belongs to
  style: ShapeStyle;
  visible: boolean;
  locked: boolean;
}

export type ShapeType = 'line' | 'rectangle' | 'circle' | 'arc' | 'polyline' | 'ellipse' | 'text' | 'point';

// Specific shape types
export interface LineShape extends BaseShape {
  type: 'line';
  start: Point;
  end: Point;
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  topLeft: Point;
  width: number;
  height: number;
  rotation: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  center: Point;
  radius: number;
}

export interface ArcShape extends BaseShape {
  type: 'arc';
  center: Point;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  center: Point;
  radiusX: number;
  radiusY: number;
  rotation: number;
}

export interface PolylineShape extends BaseShape {
  type: 'polyline';
  points: Point[];
  closed: boolean;
}

export interface TextShape extends BaseShape {
  type: 'text';
  position: Point;
  text: string;
  fontSize: number;
  fontFamily: string;
  rotation: number;
}

export interface PointShape extends BaseShape {
  type: 'point';
  position: Point;
}

// Union type for all shapes
export type Shape =
  | LineShape
  | RectangleShape
  | CircleShape
  | ArcShape
  | EllipseShape
  | PolylineShape
  | TextShape
  | PointShape;

// Layer type
export interface Layer {
  id: string;
  name: string;
  draftId: string;  // Which draft this layer belongs to
  visible: boolean;
  locked: boolean;
  color: string;
  lineStyle: LineStyle;
  lineWidth: number;
}

// Viewport/Camera
export interface Viewport {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

// Snap types
export type SnapType =
  | 'grid'
  | 'endpoint'
  | 'midpoint'
  | 'center'
  | 'intersection'
  | 'perpendicular'
  | 'tangent'
  | 'nearest';

export interface SnapPoint {
  point: Point;
  type: SnapType;
  sourceShapeId?: string;
}

// Tool types
export type ToolType =
  | 'select'
  | 'pan'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'arc'
  | 'polyline'
  | 'ellipse'
  | 'text'
  | 'move'
  | 'copy'
  | 'rotate'
  | 'scale'
  | 'mirror'
  | 'trim'
  | 'extend'
  | 'fillet'
  | 'offset';

// Circle drawing modes (like AutoCAD)
export type CircleMode =
  | 'center-radius'    // Default: click center, then radius point
  | 'center-diameter'  // Click center, then diameter point
  | '2point'           // Two points define diameter endpoints
  | '3point';          // Three points on circumference

// Rectangle drawing modes (like AutoCAD)
export type RectangleMode =
  | 'corner'           // Default: click two opposite corners
  | 'center'           // Click center, then corner
  | '3point';          // Three points: corner, width direction, height

// ============================================================================
// Drafts & Sheets System (Model Space + Paper Space)
// ============================================================================

// Draft boundary - defines the visible region when placed on sheets
export interface DraftBoundary {
  x: number;      // Left edge in draft coordinates
  y: number;      // Top edge in draft coordinates
  width: number;  // Width in draft units
  height: number; // Height in draft units
}

// Draft - working canvas (like Revit Drafting View)
export interface Draft {
  id: string;
  name: string;
  boundary: DraftBoundary;  // Defines the region/extent visible on sheets
  createdAt: string;
  modifiedAt: string;
}

// Paper sizes for sheets
export type PaperSize = 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'Letter' | 'Legal' | 'Tabloid' | 'Custom';

// Paper orientation
export type PaperOrientation = 'portrait' | 'landscape';

// Sheet - printable layout (like AutoCAD Paper Space)
export interface Sheet {
  id: string;
  name: string;
  paperSize: PaperSize;
  orientation: PaperOrientation;
  customWidth?: number;   // mm, only used when paperSize is 'Custom'
  customHeight?: number;  // mm, only used when paperSize is 'Custom'
  viewports: SheetViewport[];
  titleBlock: TitleBlock;
  createdAt: string;
  modifiedAt: string;
}

// Viewport on sheet showing a draft
export interface SheetViewport {
  id: string;
  draftId: string;            // Which draft to show
  x: number;                  // Position on sheet (mm)
  y: number;
  width: number;              // Size on sheet (mm)
  height: number;
  centerX: number;            // View center in draft coordinates
  centerY: number;
  scale: number;              // e.g., 0.01 for 1:100, 0.02 for 1:50
  locked: boolean;            // Prevent accidental pan/zoom
  visible: boolean;           // Toggle viewport visibility
}

// Title block with editable fields
export interface TitleBlock {
  visible: boolean;
  x: number;                  // Position on sheet (mm)
  y: number;
  width: number;              // Size (mm)
  height: number;
  fields: TitleBlockField[];
}

// Individual field in title block
export interface TitleBlockField {
  id: string;
  label: string;              // Field name (e.g., "Project", "Date", "Scale")
  value: string;              // Field value
  x: number;                  // Position within title block (mm)
  y: number;
  width: number;
  height: number;
  fontSize: number;           // Points
  fontFamily: string;
  align: 'left' | 'center' | 'right';
}

// Editor mode - are we in model space or paper space?
export type EditorMode = 'draft' | 'sheet';
