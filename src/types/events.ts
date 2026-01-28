/**
 * Event Types - Types for canvas and interaction events
 *
 * These types support the event handling system including:
 * - Canvas mouse and keyboard events
 * - Drawing events and states
 * - Selection events
 * - Viewport manipulation events
 */

import type { Point, ToolType, SnapPoint, Shape, EditorMode } from './geometry';
import type { HandleType } from './rendering';

// ============================================================================
// Mouse Events
// ============================================================================

/**
 * Mouse button identifiers
 */
export type MouseButton = 'left' | 'middle' | 'right';

/**
 * Modifier key state
 */
export interface ModifierKeys {
  /** Shift key is pressed */
  shift: boolean;
  /** Ctrl key is pressed */
  ctrl: boolean;
  /** Alt key is pressed */
  alt: boolean;
  /** Meta/Command key is pressed */
  meta: boolean;
}

/**
 * Enhanced canvas mouse event
 */
export interface CanvasMouseEvent {
  /** Screen position (pixels) */
  screenPoint: Point;
  /** World position (CAD units) */
  worldPoint: Point;
  /** Snapped world position if snap is active */
  snappedPoint: Point | null;
  /** Active snap point info */
  snapPoint: SnapPoint | null;
  /** Mouse button that triggered the event */
  button: MouseButton;
  /** Modifier key state */
  modifiers: ModifierKeys;
  /** Original DOM event */
  originalEvent: MouseEvent;
  /** Timestamp */
  timestamp: number;
}

/**
 * Canvas wheel event for zooming
 */
export interface CanvasWheelEvent {
  /** Screen position (pixels) */
  screenPoint: Point;
  /** World position (CAD units) */
  worldPoint: Point;
  /** Wheel delta (positive = zoom in, negative = zoom out) */
  delta: number;
  /** Modifier key state */
  modifiers: ModifierKeys;
  /** Original DOM event */
  originalEvent: WheelEvent;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Keyboard Events
// ============================================================================

/**
 * Enhanced canvas keyboard event
 */
export interface CanvasKeyEvent {
  /** Key that was pressed */
  key: string;
  /** Key code */
  code: string;
  /** Modifier key state */
  modifiers: ModifierKeys;
  /** Original DOM event */
  originalEvent: KeyboardEvent;
  /** Timestamp */
  timestamp: number;
}

/**
 * Common keyboard shortcuts
 */
export type KeyboardShortcut =
  | 'escape'       // Cancel current operation
  | 'enter'        // Confirm/complete operation
  | 'delete'       // Delete selected
  | 'backspace'    // Delete selected or undo last point
  | 'undo'         // Ctrl+Z
  | 'redo'         // Ctrl+Y or Ctrl+Shift+Z
  | 'selectAll'    // Ctrl+A
  | 'copy'         // Ctrl+C
  | 'cut'          // Ctrl+X
  | 'paste'        // Ctrl+V
  | 'duplicate'    // Ctrl+D
  | 'zoomIn'       // +/=
  | 'zoomOut'      // -
  | 'zoomFit'      // F
  | 'zoomExtents'  // E
  | 'toggleGrid'   // G
  | 'toggleSnap'   // S
  | 'toggleOrtho'; // O

// ============================================================================
// Drawing Events
// ============================================================================

/**
 * Drawing event type
 */
export type DrawingEventType =
  | 'start'      // Drawing started (first point)
  | 'continue'   // Additional point added
  | 'preview'    // Mouse moved, update preview
  | 'complete'   // Drawing completed
  | 'cancel';    // Drawing cancelled

/**
 * Drawing event data
 */
export interface DrawingEvent {
  /** Event type */
  type: DrawingEventType;
  /** Current tool */
  tool: ToolType;
  /** All points collected so far */
  points: Point[];
  /** Current preview point (mouse position) */
  previewPoint: Point | null;
  /** Resulting shape (only for 'complete' events) */
  shape: Shape | null;
  /** Timestamp */
  timestamp: number;
}

/**
 * Drawing state machine states
 */
export type DrawingState =
  | 'idle'           // Not drawing
  | 'awaiting-first' // Waiting for first point
  | 'awaiting-next'  // Waiting for additional points
  | 'dragging'       // Mouse down, dragging
  | 'previewing';    // Showing preview

// ============================================================================
// Selection Events
// ============================================================================

/**
 * Selection event type
 */
export type SelectionEventType =
  | 'select'       // Shapes selected
  | 'deselect'     // Shapes deselected
  | 'clear'        // Selection cleared
  | 'toggle'       // Selection toggled
  | 'add'          // Shapes added to selection
  | 'remove';      // Shapes removed from selection

/**
 * Selection method
 */
export type SelectionMethod =
  | 'click'        // Single click selection
  | 'box-window'   // Window selection (fully contained)
  | 'box-crossing' // Crossing selection (intersecting)
  | 'all'          // Select all
  | 'programmatic'; // Selected via code

/**
 * Selection event data
 */
export interface SelectionEvent {
  /** Event type */
  type: SelectionEventType;
  /** Selection method used */
  method: SelectionMethod;
  /** IDs of affected shapes */
  shapeIds: string[];
  /** IDs of all currently selected shapes */
  selectedIds: string[];
  /** Whether shift key was held (add to selection) */
  additive: boolean;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Viewport Events
// ============================================================================

/**
 * Viewport event type
 */
export type ViewportEventType =
  | 'pan'          // Viewport panned
  | 'zoom'         // Viewport zoomed
  | 'fit'          // Fit to content
  | 'reset';       // Reset to default view

/**
 * Viewport event data
 */
export interface ViewportEvent {
  /** Event type */
  type: ViewportEventType;
  /** Previous offset */
  previousOffset: Point;
  /** New offset */
  newOffset: Point;
  /** Previous zoom level */
  previousZoom: number;
  /** New zoom level */
  newZoom: number;
  /** Zoom center point (for zoom events) */
  zoomCenter?: Point;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Edit Events
// ============================================================================

/**
 * Edit event type
 */
export type EditEventType =
  | 'move'         // Shapes moved
  | 'rotate'       // Shapes rotated
  | 'scale'        // Shapes scaled
  | 'mirror'       // Shapes mirrored
  | 'delete'       // Shapes deleted
  | 'property'     // Property changed
  | 'style';       // Style changed

/**
 * Edit event data
 */
export interface EditEvent {
  /** Event type */
  type: EditEventType;
  /** IDs of affected shapes */
  shapeIds: string[];
  /** Previous state (for undo) */
  previousState: Shape[];
  /** New state */
  newState: Shape[];
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Handle Events
// ============================================================================

/**
 * Handle interaction event type
 */
export type HandleEventType =
  | 'hover'        // Mouse entered handle
  | 'leave'        // Mouse left handle
  | 'drag-start'   // Started dragging handle
  | 'drag'         // Dragging handle
  | 'drag-end';    // Finished dragging handle

/**
 * Handle event data
 */
export interface HandleEvent {
  /** Event type */
  type: HandleEventType;
  /** Handle type */
  handleType: HandleType;
  /** Target ID (shape, boundary, viewport) */
  targetId: string;
  /** Target type */
  targetType: 'shape' | 'boundary' | 'viewport';
  /** Start position (for drag events) */
  startPoint?: Point;
  /** Current position (for drag events) */
  currentPoint?: Point;
  /** Delta from start (for drag events) */
  delta?: Point;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Mode Events
// ============================================================================

/**
 * Editor mode change event
 */
export interface ModeChangeEvent {
  /** Previous mode */
  previousMode: EditorMode;
  /** New mode */
  newMode: EditorMode;
  /** Draft ID (when entering draft mode) */
  draftId?: string;
  /** Sheet ID (when entering sheet mode) */
  sheetId?: string;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Tool Events
// ============================================================================

/**
 * Tool change event
 */
export interface ToolChangeEvent {
  /** Previous tool */
  previousTool: ToolType;
  /** New tool */
  newTool: ToolType;
  /** Tool options */
  options?: Record<string, unknown>;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Event Handler Types
// ============================================================================

/**
 * Canvas event handler function types
 */
export type CanvasMouseHandler = (event: CanvasMouseEvent) => void;
export type CanvasWheelHandler = (event: CanvasWheelEvent) => void;
export type CanvasKeyHandler = (event: CanvasKeyEvent) => void;
export type DrawingHandler = (event: DrawingEvent) => void;
export type SelectionHandler = (event: SelectionEvent) => void;
export type ViewportHandler = (event: ViewportEvent) => void;
export type EditHandler = (event: EditEvent) => void;
export type HandleHandler = (event: HandleEvent) => void;
export type ModeChangeHandler = (event: ModeChangeEvent) => void;
export type ToolChangeHandler = (event: ToolChangeEvent) => void;

// ============================================================================
// Event Emitter Interface
// ============================================================================

/**
 * Event map for typed event emitter
 */
export interface CanvasEventMap {
  'mouse:down': CanvasMouseEvent;
  'mouse:up': CanvasMouseEvent;
  'mouse:move': CanvasMouseEvent;
  'mouse:click': CanvasMouseEvent;
  'mouse:dblclick': CanvasMouseEvent;
  'mouse:contextmenu': CanvasMouseEvent;
  'wheel': CanvasWheelEvent;
  'key:down': CanvasKeyEvent;
  'key:up': CanvasKeyEvent;
  'drawing': DrawingEvent;
  'selection': SelectionEvent;
  'viewport': ViewportEvent;
  'edit': EditEvent;
  'handle': HandleEvent;
  'mode:change': ModeChangeEvent;
  'tool:change': ToolChangeEvent;
}

/**
 * Typed event listener
 */
export type EventListener<K extends keyof CanvasEventMap> = (event: CanvasEventMap[K]) => void;

// ============================================================================
// Gesture Types
// ============================================================================

/**
 * Touch gesture types
 */
export type GestureType =
  | 'tap'          // Single tap
  | 'double-tap'   // Double tap
  | 'long-press'   // Long press
  | 'pan'          // Single finger pan
  | 'pinch'        // Two finger pinch (zoom)
  | 'rotate';      // Two finger rotate

/**
 * Gesture event data
 */
export interface GestureEvent {
  /** Gesture type */
  type: GestureType;
  /** Center point of gesture */
  center: Point;
  /** Scale factor (for pinch) */
  scale?: number;
  /** Rotation angle in radians (for rotate) */
  rotation?: number;
  /** Velocity (for pan) */
  velocity?: Point;
  /** Timestamp */
  timestamp: number;
}
