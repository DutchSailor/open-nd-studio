/**
 * Rendering Types - Types for canvas rendering system
 *
 * These types support the modular renderer architecture including:
 * - Render options and configuration
 * - Viewport transformations
 * - Layer rendering options
 * - Drawing context wrappers
 */

import type { Point, Viewport, Shape, Layer, SnapPoint, SnapType, EditorMode } from './geometry';

// ============================================================================
// Render Context
// ============================================================================

/**
 * Extended 2D rendering context with additional state
 */
export interface RenderContext {
  /** Native canvas 2D context */
  ctx: CanvasRenderingContext2D;
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Device pixel ratio for HiDPI displays */
  dpr: number;
  /** Current viewport transformation */
  viewport: Viewport;
}

// ============================================================================
// Viewport Transform
// ============================================================================

/**
 * Complete viewport transformation state
 */
export interface ViewportTransform {
  /** Horizontal offset in pixels */
  offsetX: number;
  /** Vertical offset in pixels */
  offsetY: number;
  /** Zoom level (1.0 = 100%) */
  zoom: number;
  /** Minimum allowed zoom */
  minZoom: number;
  /** Maximum allowed zoom */
  maxZoom: number;
}

/**
 * Viewport bounds in world coordinates
 */
export interface ViewportBounds {
  /** Left edge in world coordinates */
  left: number;
  /** Top edge in world coordinates */
  top: number;
  /** Right edge in world coordinates */
  right: number;
  /** Bottom edge in world coordinates */
  bottom: number;
  /** Width in world units */
  width: number;
  /** Height in world units */
  height: number;
}

// ============================================================================
// Render Options
// ============================================================================

/**
 * Options for shape rendering
 */
export interface ShapeRenderOptions {
  /** Whether to show shape outlines */
  showOutlines: boolean;
  /** Whether to show shape fills */
  showFills: boolean;
  /** Whether to show shape handles when selected */
  showHandles: boolean;
  /** Highlight color for selected shapes */
  selectionColor: string;
  /** Highlight color for hovered shapes */
  hoverColor: string;
}

/**
 * Options for grid rendering
 */
export interface GridRenderOptions {
  /** Whether grid is visible */
  visible: boolean;
  /** Grid spacing in world units */
  spacing: number;
  /** Number of subdivisions between major grid lines */
  subdivisions: number;
  /** Major grid line color */
  majorColor: string;
  /** Minor grid line color */
  minorColor: string;
  /** Major grid line width */
  majorLineWidth: number;
  /** Minor grid line width */
  minorLineWidth: number;
}

/**
 * Options for snap point rendering
 */
export interface SnapRenderOptions {
  /** Whether to show snap indicators */
  visible: boolean;
  /** Size of snap indicator in pixels */
  indicatorSize: number;
  /** Snap indicator color */
  color: string;
  /** Snap indicator line width */
  lineWidth: number;
}

/**
 * Options for selection rendering
 */
export interface SelectionRenderOptions {
  /** Selection box stroke color */
  strokeColor: string;
  /** Selection box fill color (with alpha) */
  fillColor: string;
  /** Window selection fill color */
  windowFillColor: string;
  /** Crossing selection fill color */
  crossingFillColor: string;
  /** Selection box line width */
  lineWidth: number;
}

/**
 * Options for tracking line rendering (rubber band)
 */
export interface TrackingRenderOptions {
  /** Tracking line color */
  color: string;
  /** Tracking line width */
  lineWidth: number;
  /** Line dash pattern */
  dashPattern: number[];
}

/**
 * Complete render options for the CAD renderer
 */
export interface RenderOptions {
  /** Current editor mode */
  mode: EditorMode;
  /** Shapes to render */
  shapes: Shape[];
  /** Layers for visibility/style */
  layers: Layer[];
  /** Selected shape IDs */
  selectedIds: string[];
  /** Hovered shape ID */
  hoveredId: string | null;
  /** Current snap point */
  snapPoint: SnapPoint | null;
  /** Active snap types */
  activeSnapTypes: SnapType[];
  /** Grid options */
  grid: GridRenderOptions;
  /** Shape rendering options */
  shapeOptions: ShapeRenderOptions;
  /** Snap rendering options */
  snapOptions: SnapRenderOptions;
  /** Selection rendering options */
  selectionOptions: SelectionRenderOptions;
  /** Tracking line options */
  trackingOptions: TrackingRenderOptions;
}

// ============================================================================
// Layer Render Options
// ============================================================================

/**
 * Options for rendering a specific layer
 */
export interface LayerRenderOptions {
  /** Layer ID */
  layerId: string;
  /** Override visibility */
  visible?: boolean;
  /** Override color */
  colorOverride?: string;
  /** Override line width */
  lineWidthOverride?: number;
  /** Opacity (0-1) */
  opacity?: number;
}

// ============================================================================
// Drawing State
// ============================================================================

/**
 * State for in-progress drawing operations
 */
export interface DrawingState {
  /** Whether currently drawing */
  isDrawing: boolean;
  /** Points collected so far */
  points: Point[];
  /** Current mouse position */
  currentPoint: Point | null;
  /** Preview shape (not yet committed) */
  previewShape: Shape | null;
}

/**
 * State for selection box
 */
export interface SelectionBoxState {
  /** Whether selection box is active */
  active: boolean;
  /** Starting point of selection */
  start: Point;
  /** Current end point of selection */
  end: Point;
  /** Selection mode (window = fully inside, crossing = intersecting) */
  mode: 'window' | 'crossing';
}

// ============================================================================
// Render Metrics
// ============================================================================

/**
 * Performance metrics for rendering
 */
export interface RenderMetrics {
  /** Time to render frame in ms */
  frameTime: number;
  /** Number of shapes rendered */
  shapesRendered: number;
  /** Number of shapes culled (outside viewport) */
  shapesCulled: number;
  /** Frames per second */
  fps: number;
  /** Last render timestamp */
  lastRenderTime: number;
}

// ============================================================================
// Sheet Render Options
// ============================================================================

/**
 * Options for rendering sheets
 */
export interface SheetRenderOptions {
  /** Show paper shadow */
  showShadow: boolean;
  /** Show printable margins */
  showMargins: boolean;
  /** Paper background color */
  paperColor: string;
  /** Margin line color */
  marginColor: string;
  /** Shadow color */
  shadowColor: string;
  /** Shadow offset in pixels */
  shadowOffset: number;
}

/**
 * Options for rendering viewports on sheets
 */
export interface ViewportRenderOptions {
  /** Show viewport border */
  showBorder: boolean;
  /** Border color */
  borderColor: string;
  /** Selected viewport border color */
  selectedBorderColor: string;
  /** Border line width */
  borderWidth: number;
  /** Show viewport label */
  showLabel: boolean;
  /** Label font size */
  labelFontSize: number;
}

/**
 * Options for rendering title blocks
 */
export interface TitleBlockRenderOptions {
  /** Show title block grid */
  showGrid: boolean;
  /** Grid line color */
  gridColor: string;
  /** Text color */
  textColor: string;
  /** Background color */
  backgroundColor: string;
  /** Border color */
  borderColor: string;
}

// ============================================================================
// Draft Render Options
// ============================================================================

/**
 * Options for rendering drafts
 */
export interface DraftRenderOptions {
  /** Show draft boundary */
  showBoundary: boolean;
  /** Boundary line color */
  boundaryColor: string;
  /** Boundary line style */
  boundaryStyle: 'solid' | 'dashed';
  /** Boundary line width */
  boundaryWidth: number;
  /** Show boundary handles for editing */
  showBoundaryHandles: boolean;
  /** Handle size in pixels */
  handleSize: number;
}

// ============================================================================
// Handle Rendering
// ============================================================================

/**
 * Handle types for interactive editing
 */
export type HandleType =
  | 'corner-nw'
  | 'corner-ne'
  | 'corner-se'
  | 'corner-sw'
  | 'edge-n'
  | 'edge-e'
  | 'edge-s'
  | 'edge-w'
  | 'center'
  | 'rotation';

/**
 * Handle definition for rendering
 */
export interface Handle {
  /** Handle type */
  type: HandleType;
  /** Position in world coordinates */
  position: Point;
  /** Handle size in pixels */
  size: number;
  /** Cursor style when hovering */
  cursor: string;
}

/**
 * Options for handle rendering
 */
export interface HandleRenderOptions {
  /** Handle fill color */
  fillColor: string;
  /** Handle stroke color */
  strokeColor: string;
  /** Handle stroke width */
  strokeWidth: number;
  /** Active/hovered handle fill color */
  activeFillColor: string;
  /** Handle size in pixels */
  size: number;
}

// ============================================================================
// Color Definitions
// ============================================================================

/**
 * Theme colors for rendering
 */
export interface RenderTheme {
  /** Canvas background color */
  canvasBackground: string;
  /** Paper background color */
  paperBackground: string;
  /** Grid major line color */
  gridMajor: string;
  /** Grid minor line color */
  gridMinor: string;
  /** Selection color */
  selection: string;
  /** Hover highlight color */
  hover: string;
  /** Snap indicator color */
  snap: string;
  /** Tracking line color */
  tracking: string;
  /** Text color */
  text: string;
  /** Error/warning color */
  error: string;
  /** Success color */
  success: string;
}

/**
 * Default dark theme
 */
export const DARK_THEME: RenderTheme = {
  canvasBackground: '#1a1a2e',
  paperBackground: '#ffffff',
  gridMajor: 'rgba(255, 255, 255, 0.2)',
  gridMinor: 'rgba(255, 255, 255, 0.05)',
  selection: '#00ff00',
  hover: '#ffff00',
  snap: '#ff00ff',
  tracking: '#00ffff',
  text: '#ffffff',
  error: '#ff4444',
  success: '#44ff44',
};

/**
 * Default light theme
 */
export const LIGHT_THEME: RenderTheme = {
  canvasBackground: '#f0f0f0',
  paperBackground: '#ffffff',
  gridMajor: 'rgba(0, 0, 0, 0.2)',
  gridMinor: 'rgba(0, 0, 0, 0.05)',
  selection: '#0066ff',
  hover: '#ff9900',
  snap: '#9900ff',
  tracking: '#009999',
  text: '#000000',
  error: '#cc0000',
  success: '#00cc00',
};
