import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Shape,
  Layer,
  Viewport,
  ToolType,
  Point,
  SnapType,
  SnapPoint,
  ShapeStyle,
  Draft,
  DraftBoundary,
  Sheet,
  SheetViewport,
  TitleBlock,
  EditorMode,
  PaperSize,
  PaperOrientation,
} from '../types/geometry';

// Preview shape while drawing (before mouse up)
export type DrawingPreview =
  | { type: 'line'; start: Point; end: Point }
  | { type: 'rectangle'; start: Point; end: Point }
  | { type: 'rotatedRectangle'; corners: [Point, Point, Point, Point] }
  | { type: 'circle'; center: Point; radius: number }
  | { type: 'polyline'; points: Point[]; currentPoint: Point }
  | null;

// Selection box for box selection (window/crossing)
export type SelectionBoxMode = 'window' | 'crossing';
export interface SelectionBox {
  start: Point;      // Start point in screen coordinates
  end: Point;        // Current end point in screen coordinates
  mode: SelectionBoxMode;  // 'window' (left-to-right) or 'crossing' (right-to-left)
}

// Boundary handle types for interactive editing (like Revit crop region handles)
export type BoundaryHandleType =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right';

// Boundary editing state
export interface BoundaryEditState {
  isEditing: boolean;              // Whether boundary editing mode is active
  isSelected: boolean;             // Whether the boundary is selected (shows handles)
  activeHandle: BoundaryHandleType | null;  // Which handle is being dragged
  dragStart: Point | null;         // Mouse position when drag started (world coords)
  originalBoundary: DraftBoundary | null;   // Boundary state before drag started
}

// Viewport handle types for interactive editing (like Revit viewport handles)
export type ViewportHandleType =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right';

// Viewport editing state (for sheet viewports)
export interface ViewportEditState {
  selectedViewportId: string | null;   // Currently selected viewport on active sheet
  activeHandle: ViewportHandleType | null;  // Which handle is being dragged
  isDragging: boolean;                 // Whether viewport is being moved/resized
  dragStart: Point | null;             // Mouse position when drag started (sheet mm coords)
  originalViewport: SheetViewport | null;   // Viewport state before drag started
}

// Generate unique IDs
let idCounter = 0;
export const generateId = (): string => {
  return `${Date.now()}-${++idCounter}`;
};

// Default style
const defaultStyle: ShapeStyle = {
  strokeColor: '#ffffff',
  strokeWidth: 1,
  lineStyle: 'solid',
};

// Default draft boundary (in draft units - typically mm or a unitless coordinate system)
const DEFAULT_DRAFT_BOUNDARY: DraftBoundary = {
  x: -500,
  y: -500,
  width: 1000,
  height: 1000,
};

// Default draft
const defaultDraftId = 'draft-1';
const defaultDraft: Draft = {
  id: defaultDraftId,
  name: 'Draft 1',
  boundary: { ...DEFAULT_DRAFT_BOUNDARY },
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
};

// Default layer
const defaultLayer: Layer = {
  id: 'layer-0',
  name: 'Layer 0',
  draftId: defaultDraftId,
  visible: true,
  locked: false,
  color: '#ffffff',
  lineStyle: 'solid',
  lineWidth: 1,
};

// Default title block fields - Revit-like comprehensive layout
const createDefaultTitleBlock = (): TitleBlock => ({
  visible: true,
  x: 10,
  y: 10,
  width: 180,
  height: 60,
  fields: [
    // Row 1: Project info
    { id: 'project', label: 'Project', value: '', x: 5, y: 5, width: 85, height: 12, fontSize: 11, fontFamily: 'Arial', align: 'left' },
    { id: 'client', label: 'Client', value: '', x: 95, y: 5, width: 80, height: 12, fontSize: 10, fontFamily: 'Arial', align: 'left' },
    // Row 2: Drawing title
    { id: 'title', label: 'Drawing Title', value: '', x: 5, y: 20, width: 120, height: 12, fontSize: 12, fontFamily: 'Arial', align: 'left' },
    { id: 'number', label: 'Drawing No.', value: '', x: 130, y: 20, width: 45, height: 12, fontSize: 10, fontFamily: 'Arial', align: 'left' },
    // Row 3: Details
    { id: 'scale', label: 'Scale', value: '1:100', x: 5, y: 35, width: 30, height: 10, fontSize: 10, fontFamily: 'Arial', align: 'left' },
    { id: 'date', label: 'Date', value: '', x: 40, y: 35, width: 35, height: 10, fontSize: 10, fontFamily: 'Arial', align: 'left' },
    { id: 'drawn', label: 'Drawn', value: '', x: 80, y: 35, width: 30, height: 10, fontSize: 10, fontFamily: 'Arial', align: 'left' },
    { id: 'checked', label: 'Checked', value: '', x: 115, y: 35, width: 30, height: 10, fontSize: 10, fontFamily: 'Arial', align: 'left' },
    { id: 'approved', label: 'Approved', value: '', x: 150, y: 35, width: 25, height: 10, fontSize: 10, fontFamily: 'Arial', align: 'left' },
    // Row 4: Sheet info and revision
    { id: 'sheet', label: 'Sheet', value: '1 of 1', x: 5, y: 48, width: 40, height: 10, fontSize: 10, fontFamily: 'Arial', align: 'left' },
    { id: 'revision', label: 'Revision', value: '', x: 50, y: 48, width: 30, height: 10, fontSize: 10, fontFamily: 'Arial', align: 'left' },
    { id: 'status', label: 'Status', value: 'DRAFT', x: 130, y: 48, width: 45, height: 10, fontSize: 10, fontFamily: 'Arial', align: 'left' },
  ],
});

// Paper size dimensions in mm (width x height for portrait)
export const PAPER_SIZES: Record<PaperSize, { width: number; height: number }> = {
  'A4': { width: 210, height: 297 },
  'A3': { width: 297, height: 420 },
  'A2': { width: 420, height: 594 },
  'A1': { width: 594, height: 841 },
  'A0': { width: 841, height: 1189 },
  'Letter': { width: 216, height: 279 },
  'Legal': { width: 216, height: 356 },
  'Tabloid': { width: 279, height: 432 },
  'Custom': { width: 210, height: 297 },
};

interface AppState {
  // Drafts & Sheets (Model Space + Paper Space)
  drafts: Draft[];
  sheets: Sheet[];
  editorMode: EditorMode;
  activeDraftId: string;
  activeSheetId: string | null;
  draftViewports: Record<string, Viewport>;  // Viewport state per draft

  // Shapes
  shapes: Shape[];
  selectedShapeIds: string[];

  // Layers
  layers: Layer[];
  activeLayerId: string;

  // Viewport (current viewport - depends on editorMode and activeDrawingId/activeSheetId)
  viewport: Viewport;

  // Tools
  activeTool: ToolType;
  circleMode: 'center-radius' | 'center-diameter' | '2point' | '3point';
  rectangleMode: 'corner' | 'center' | '3point';
  currentStyle: ShapeStyle;

  // Grid & Snap
  gridSize: number;
  gridVisible: boolean;
  snapEnabled: boolean;
  activeSnaps: SnapType[];
  snapTolerance: number;
  currentSnapPoint: SnapPoint | null;
  snapSettingsOpen: boolean;

  // Tracking (Polar/Ortho/Object tracking like AutoCAD)
  trackingEnabled: boolean;
  polarTrackingEnabled: boolean;
  orthoMode: boolean;
  objectTrackingEnabled: boolean;
  polarAngleIncrement: number; // degrees
  currentTrackingLines: Array<{
    origin: Point;
    direction: Point;
    angle: number;
    type: 'polar' | 'parallel' | 'perpendicular' | 'extension';
  }>;
  trackingPoint: Point | null;

  // UI State
  canvasSize: { width: number; height: number };
  mousePosition: Point;
  isDrawing: boolean;
  drawingPreview: DrawingPreview;

  // Drawing state (for continuous drawing like AutoCAD)
  drawingPoints: Point[];  // Points clicked so far in current drawing session

  // Selection box state
  selectionBox: SelectionBox | null;

  // Boundary editing state (Revit-like crop region editing)
  boundaryEditState: BoundaryEditState;

  // Viewport editing state (for sheet viewports - Revit-like viewport manipulation)
  viewportEditState: ViewportEditState;

  // Command line
  commandHistory: string[];
  currentCommand: string;
  pendingCommand: string | null;  // Command to be executed (set by ToolPalette, consumed by CommandLine)
  pendingCommandPoint: Point | null;  // Point to send to active command (set by Canvas, consumed by CommandLine)
  pendingCommandSelection: string[] | null;  // Shape IDs to add to command selection (set by Canvas, consumed by CommandLine)
  hasActiveModifyCommand: boolean;  // True when a modify command is active and waiting for input
  commandIsSelecting: boolean;  // True when a command is in 'selecting' phase (waiting for object selection)
  commandPreviewShapes: Shape[];  // Preview shapes for active modify commands (move/copy preview)

  // Undo/Redo history
  historyStack: Shape[][];  // Stack of shape snapshots
  historyIndex: number;     // Current position in history (-1 means at latest)
  maxHistorySize: number;   // Maximum number of history entries

  // Dialogs
  printDialogOpen: boolean;
  aboutDialogOpen: boolean;

  // File state
  currentFilePath: string | null;
  projectName: string;
  isModified: boolean;

  // Actions - Shapes
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  deleteSelectedShapes: () => void;

  // Actions - Selection
  selectShape: (id: string, addToSelection?: boolean) => void;
  selectShapes: (ids: string[]) => void;
  deselectAll: () => void;
  selectAll: () => void;

  // Actions - Drafts
  addDraft: (name?: string) => void;
  deleteDraft: (id: string) => void;
  renameDraft: (id: string, name: string) => void;
  updateDraftBoundary: (id: string, boundary: Partial<DraftBoundary>) => void;
  fitBoundaryToContent: (id: string, padding?: number) => void;
  switchToDraft: (id: string) => void;

  // Actions - Boundary Editing (Revit-like crop region manipulation)
  selectBoundary: () => void;
  deselectBoundary: () => void;
  startBoundaryDrag: (handle: BoundaryHandleType, worldPos: Point) => void;
  updateBoundaryDrag: (worldPos: Point) => void;
  endBoundaryDrag: () => void;
  cancelBoundaryDrag: () => void;

  // Actions - Sheets
  addSheet: (name?: string, paperSize?: PaperSize, orientation?: PaperOrientation) => void;
  deleteSheet: (id: string) => void;
  renameSheet: (id: string, name: string) => void;
  updateSheet: (id: string, updates: Partial<Sheet>) => void;
  switchToSheet: (id: string) => void;
  switchToDraftMode: () => void;

  // Actions - Sheet Viewports
  addSheetViewport: (sheetId: string, draftId: string, bounds: { x: number; y: number; width: number; height: number }) => void;
  updateSheetViewport: (sheetId: string, viewportId: string, updates: Partial<SheetViewport>) => void;
  deleteSheetViewport: (sheetId: string, viewportId: string) => void;

  // Actions - Viewport Editing (Revit-like viewport manipulation on sheets)
  selectViewport: (viewportId: string | null) => void;
  startViewportDrag: (handle: ViewportHandleType, sheetPos: Point) => void;
  updateViewportDrag: (sheetPos: Point) => void;
  endViewportDrag: () => void;
  cancelViewportDrag: () => void;
  centerViewportOnDraft: (viewportId: string) => void;  // Center viewport view on draft content
  fitViewportToDraft: (viewportId: string) => void;     // Fit viewport to show entire draft boundary

  // Actions - Title Block
  updateTitleBlockField: (sheetId: string, fieldId: string, value: string) => void;
  setTitleBlockVisible: (sheetId: string, visible: boolean) => void;

  // Actions - Layers
  addLayer: (name?: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  deleteLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;

  // Actions - Viewport
  setViewport: (viewport: Partial<Viewport>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  resetView: () => void;

  // Actions - Tools
  setActiveTool: (tool: ToolType) => void;
  setCircleMode: (mode: 'center-radius' | 'center-diameter' | '2point' | '3point') => void;
  setRectangleMode: (mode: 'corner' | 'center' | '3point') => void;
  setCurrentStyle: (style: Partial<ShapeStyle>) => void;

  // Actions - Grid & Snap
  setGridSize: (size: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setActiveSnaps: (snaps: SnapType[]) => void;
  toggleSnapType: (snapType: SnapType) => void;
  setSnapTolerance: (tolerance: number) => void;
  setCurrentSnapPoint: (snapPoint: SnapPoint | null) => void;
  setSnapSettingsOpen: (open: boolean) => void;

  // Actions - Tracking
  toggleTracking: () => void;
  togglePolarTracking: () => void;
  toggleOrthoMode: () => void;
  toggleObjectTracking: () => void;
  setPolarAngleIncrement: (angle: number) => void;
  setCurrentTrackingLines: (lines: Array<{
    origin: Point;
    direction: Point;
    angle: number;
    type: 'polar' | 'parallel' | 'perpendicular' | 'extension';
  }>) => void;
  setTrackingPoint: (point: Point | null) => void;

  // Actions - UI
  setCanvasSize: (size: { width: number; height: number }) => void;
  setMousePosition: (point: Point) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setDrawingPreview: (preview: DrawingPreview) => void;

  // Actions - Drawing (AutoCAD-style)
  addDrawingPoint: (point: Point) => void;
  undoDrawingPoint: () => void;
  clearDrawingPoints: () => void;
  closeDrawing: () => void;  // Connect last point to first point

  // Actions - Selection box
  setSelectionBox: (box: SelectionBox | null) => void;

  // Actions - Command line
  executeCommand: (command: string) => void;
  setCurrentCommand: (command: string) => void;
  setPendingCommand: (command: string | null) => void;
  setPendingCommandPoint: (point: Point | null) => void;
  setPendingCommandSelection: (ids: string[] | null) => void;
  setHasActiveModifyCommand: (active: boolean) => void;
  setCommandIsSelecting: (isSelecting: boolean) => void;
  setCommandPreviewShapes: (shapes: Shape[]) => void;

  // Actions - Undo/Redo
  undo: () => boolean;  // Returns true if undo was performed
  redo: () => boolean;  // Returns true if redo was performed
  pushHistory: () => void;  // Save current state to history
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions - Dialogs
  setPrintDialogOpen: (open: boolean) => void;
  setAboutDialogOpen: (open: boolean) => void;

  // Actions - File
  newProject: () => void;
  loadProject: (data: {
    shapes: Shape[];
    layers: Layer[];
    activeLayerId: string;
    viewport?: { zoom: number; offsetX: number; offsetY: number };
    settings?: { gridSize: number; gridVisible: boolean; snapEnabled: boolean };
    // V2 fields
    drafts?: Draft[];
    sheets?: Sheet[];
    activeDraftId?: string;
    activeSheetId?: string | null;
    draftViewports?: Record<string, Viewport>;
  }, filePath?: string, projectName?: string) => void;
  setFilePath: (path: string | null) => void;
  setProjectName: (name: string) => void;
  setModified: (modified: boolean) => void;
}

// Deep clone helper for shapes
const cloneShapes = (shapes: Shape[]): Shape[] => {
  return JSON.parse(JSON.stringify(shapes));
};

// Get bounding box of a shape
const getShapeBounds = (shape: Shape): { minX: number; minY: number; maxX: number; maxY: number } | null => {
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
    case 'ellipse':
      return {
        minX: shape.center.x - shape.radiusX,
        minY: shape.center.y - shape.radiusY,
        maxX: shape.center.x + shape.radiusX,
        maxY: shape.center.y + shape.radiusY,
      };
    case 'arc':
      return {
        minX: shape.center.x - shape.radius,
        minY: shape.center.y - shape.radius,
        maxX: shape.center.x + shape.radius,
        maxY: shape.center.y + shape.radius,
      };
    case 'polyline':
      if (shape.points.length === 0) return null;
      const xs = shape.points.map(p => p.x);
      const ys = shape.points.map(p => p.y);
      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      };
    case 'text':
      return {
        minX: shape.position.x,
        minY: shape.position.y - shape.fontSize,
        maxX: shape.position.x + shape.text.length * shape.fontSize * 0.6,
        maxY: shape.position.y,
      };
    case 'point':
      return {
        minX: shape.position.x,
        minY: shape.position.y,
        maxX: shape.position.x,
        maxY: shape.position.y,
      };
    default:
      return null;
  }
};

export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    // Initial state - Drafts & Sheets
    drafts: [defaultDraft],
    sheets: [],
    editorMode: 'draft' as EditorMode,
    activeDraftId: defaultDraftId,
    activeSheetId: null,
    draftViewports: { [defaultDraftId]: { offsetX: 0, offsetY: 0, zoom: 1 } },

    // Initial state - Shapes & Layers
    shapes: [],
    selectedShapeIds: [],
    layers: [defaultLayer],
    activeLayerId: defaultLayer.id,
    viewport: { offsetX: 0, offsetY: 0, zoom: 1 },
    activeTool: 'select',
    circleMode: 'center-radius',
    rectangleMode: 'corner',
    currentStyle: defaultStyle,
    gridSize: 10,
    gridVisible: true,
    snapEnabled: true,
    activeSnaps: ['grid', 'endpoint', 'midpoint', 'center', 'intersection'],
    snapTolerance: 10,
    currentSnapPoint: null,
    snapSettingsOpen: false,
    trackingEnabled: true,
    polarTrackingEnabled: true,
    orthoMode: false,
    objectTrackingEnabled: true,
    polarAngleIncrement: 45,
    currentTrackingLines: [],
    trackingPoint: null,
    canvasSize: { width: 800, height: 600 },
    mousePosition: { x: 0, y: 0 },
    isDrawing: false,
    drawingPreview: null,
    drawingPoints: [],
    selectionBox: null,
    boundaryEditState: {
      isEditing: false,
      isSelected: false,
      activeHandle: null,
      dragStart: null,
      originalBoundary: null,
    },
    viewportEditState: {
      selectedViewportId: null,
      activeHandle: null,
      isDragging: false,
      dragStart: null,
      originalViewport: null,
    },
    commandHistory: [],
    currentCommand: '',
    pendingCommand: null,
    pendingCommandPoint: null,
    pendingCommandSelection: null,
    hasActiveModifyCommand: false,
    commandIsSelecting: false,
    commandPreviewShapes: [],
    historyStack: [],
    historyIndex: -1,
    maxHistorySize: 50,
    printDialogOpen: false,
    aboutDialogOpen: false,
    currentFilePath: null,
    projectName: 'Untitled',
    isModified: false,

    // Shape actions (with history tracking)
    addShape: (shape) =>
      set((state) => {
        // Push history before change
        const snapshot = cloneShapes(state.shapes);
        if (state.historyIndex >= 0 && state.historyIndex < state.historyStack.length - 1) {
          state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
        }
        state.historyStack.push(snapshot);
        if (state.historyStack.length > state.maxHistorySize) {
          state.historyStack.shift();
        }
        state.historyIndex = state.historyStack.length - 1;

        // Make the change
        state.shapes.push(shape);
        state.isModified = true;
      }),

    updateShape: (id, updates) =>
      set((state) => {
        const index = state.shapes.findIndex((s) => s.id === id);
        if (index !== -1) {
          // Push history before change
          const snapshot = cloneShapes(state.shapes);
          if (state.historyIndex >= 0 && state.historyIndex < state.historyStack.length - 1) {
            state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
          }
          state.historyStack.push(snapshot);
          if (state.historyStack.length > state.maxHistorySize) {
            state.historyStack.shift();
          }
          state.historyIndex = state.historyStack.length - 1;

          // Make the change
          state.shapes[index] = { ...state.shapes[index], ...updates } as Shape;
          state.isModified = true;
        }
      }),

    deleteShape: (id) =>
      set((state) => {
        // Push history before change
        const snapshot = cloneShapes(state.shapes);
        if (state.historyIndex >= 0 && state.historyIndex < state.historyStack.length - 1) {
          state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
        }
        state.historyStack.push(snapshot);
        if (state.historyStack.length > state.maxHistorySize) {
          state.historyStack.shift();
        }
        state.historyIndex = state.historyStack.length - 1;

        // Make the change
        state.shapes = state.shapes.filter((s) => s.id !== id);
        state.selectedShapeIds = state.selectedShapeIds.filter((sid) => sid !== id);
        state.isModified = true;
      }),

    deleteSelectedShapes: () =>
      set((state) => {
        if (state.selectedShapeIds.length === 0) return;

        // Push history before change
        const snapshot = cloneShapes(state.shapes);
        if (state.historyIndex >= 0 && state.historyIndex < state.historyStack.length - 1) {
          state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
        }
        state.historyStack.push(snapshot);
        if (state.historyStack.length > state.maxHistorySize) {
          state.historyStack.shift();
        }
        state.historyIndex = state.historyStack.length - 1;

        // Make the change
        state.shapes = state.shapes.filter(
          (s) => !state.selectedShapeIds.includes(s.id)
        );
        state.selectedShapeIds = [];
        state.isModified = true;
      }),

    // Selection actions
    selectShape: (id, addToSelection = false) =>
      set((state) => {
        if (addToSelection) {
          if (!state.selectedShapeIds.includes(id)) {
            state.selectedShapeIds.push(id);
          }
        } else {
          state.selectedShapeIds = [id];
        }
      }),

    selectShapes: (ids) =>
      set((state) => {
        state.selectedShapeIds = ids;
      }),

    deselectAll: () =>
      set((state) => {
        state.selectedShapeIds = [];
      }),

    selectAll: () =>
      set((state) => {
        // Only select shapes in the current draft
        state.selectedShapeIds = state.shapes
          .filter((s) => {
            if (s.draftId !== state.activeDraftId) return false;
            const layer = state.layers.find((l) => l.id === s.layerId);
            return layer && layer.visible && !layer.locked && s.visible && !s.locked;
          })
          .map((s) => s.id);
      }),

    // Draft actions
    addDraft: (name) =>
      set((state) => {
        const id = generateId();
        const newDraft: Draft = {
          id,
          name: name || `Draft ${state.drafts.length + 1}`,
          boundary: { ...DEFAULT_DRAFT_BOUNDARY },
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        };
        state.drafts.push(newDraft);

        // Create a default layer for the new draft
        const newLayer: Layer = {
          id: generateId(),
          name: 'Layer 0',
          draftId: id,
          visible: true,
          locked: false,
          color: '#ffffff',
          lineStyle: 'solid',
          lineWidth: 1,
        };
        state.layers.push(newLayer);

        // Initialize viewport for this draft
        state.draftViewports[id] = { offsetX: 0, offsetY: 0, zoom: 1 };

        // Switch to the new draft
        state.activeDraftId = id;
        state.activeLayerId = newLayer.id;
        state.viewport = state.draftViewports[id];
        state.editorMode = 'draft';
        state.activeSheetId = null;
        state.selectedShapeIds = [];
        state.isModified = true;
      }),

    deleteDraft: (id) =>
      set((state) => {
        // Can't delete the last draft
        if (state.drafts.length <= 1) return;

        // Remove the draft
        state.drafts = state.drafts.filter((d) => d.id !== id);

        // Remove all shapes belonging to this draft
        state.shapes = state.shapes.filter((s) => s.draftId !== id);

        // Remove all layers belonging to this draft
        state.layers = state.layers.filter((l) => l.draftId !== id);

        // Remove viewport for this draft
        delete state.draftViewports[id];

        // Remove viewports in sheets that reference this draft
        state.sheets.forEach((sheet) => {
          sheet.viewports = sheet.viewports.filter((vp) => vp.draftId !== id);
        });

        // If the deleted draft was active, switch to another draft
        if (state.activeDraftId === id) {
          const firstDraft = state.drafts[0];
          state.activeDraftId = firstDraft.id;
          state.viewport = state.draftViewports[firstDraft.id] || { offsetX: 0, offsetY: 0, zoom: 1 };

          // Set active layer to a layer in the new draft
          const layerInDraft = state.layers.find((l) => l.draftId === firstDraft.id);
          if (layerInDraft) {
            state.activeLayerId = layerInDraft.id;
          }
        }

        state.selectedShapeIds = [];
        state.isModified = true;
      }),

    renameDraft: (id, name) =>
      set((state) => {
        const draft = state.drafts.find((d) => d.id === id);
        if (draft) {
          draft.name = name;
          draft.modifiedAt = new Date().toISOString();
          state.isModified = true;
        }
      }),

    updateDraftBoundary: (id, boundary) =>
      set((state) => {
        const draft = state.drafts.find((d) => d.id === id);
        if (draft) {
          draft.boundary = { ...draft.boundary, ...boundary };
          draft.modifiedAt = new Date().toISOString();
          state.isModified = true;
        }
      }),

    fitBoundaryToContent: (id, padding = 50) =>
      set((state) => {
        const draft = state.drafts.find((d) => d.id === id);
        if (!draft) return;

        // Get all shapes in this draft
        const draftShapes = state.shapes.filter((s) => s.draftId === id);
        if (draftShapes.length === 0) {
          // No shapes, reset to default
          draft.boundary = { ...DEFAULT_DRAFT_BOUNDARY };
          draft.modifiedAt = new Date().toISOString();
          state.isModified = true;
          return;
        }

        // Calculate bounding box of all shapes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const shape of draftShapes) {
          const bounds = getShapeBounds(shape);
          if (bounds) {
            minX = Math.min(minX, bounds.minX);
            minY = Math.min(minY, bounds.minY);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
          }
        }

        if (minX === Infinity) return;

        // Apply padding
        draft.boundary = {
          x: minX - padding,
          y: minY - padding,
          width: (maxX - minX) + padding * 2,
          height: (maxY - minY) + padding * 2,
        };
        draft.modifiedAt = new Date().toISOString();
        state.isModified = true;
      }),

    // Boundary editing actions (Revit-like crop region manipulation)
    selectBoundary: () =>
      set((state) => {
        state.boundaryEditState.isSelected = true;
        state.selectedShapeIds = []; // Deselect shapes when selecting boundary
      }),

    deselectBoundary: () =>
      set((state) => {
        state.boundaryEditState.isSelected = false;
        state.boundaryEditState.activeHandle = null;
        state.boundaryEditState.dragStart = null;
        state.boundaryEditState.originalBoundary = null;
      }),

    startBoundaryDrag: (handle, worldPos) =>
      set((state) => {
        const draft = state.drafts.find((d) => d.id === state.activeDraftId);
        if (!draft) return;

        state.boundaryEditState.activeHandle = handle;
        state.boundaryEditState.dragStart = worldPos;
        state.boundaryEditState.originalBoundary = { ...draft.boundary };
      }),

    updateBoundaryDrag: (worldPos) =>
      set((state) => {
        const { activeHandle, dragStart, originalBoundary } = state.boundaryEditState;
        if (!activeHandle || !dragStart || !originalBoundary) return;

        const draft = state.drafts.find((d) => d.id === state.activeDraftId);
        if (!draft) return;

        const dx = worldPos.x - dragStart.x;
        const dy = worldPos.y - dragStart.y;

        // Calculate new boundary based on which handle is being dragged
        let newBoundary = { ...originalBoundary };

        switch (activeHandle) {
          case 'center':
            // Move entire boundary
            newBoundary.x = originalBoundary.x + dx;
            newBoundary.y = originalBoundary.y + dy;
            break;

          case 'top-left':
            newBoundary.x = originalBoundary.x + dx;
            newBoundary.y = originalBoundary.y + dy;
            newBoundary.width = Math.max(10, originalBoundary.width - dx);
            newBoundary.height = Math.max(10, originalBoundary.height - dy);
            break;

          case 'top':
            newBoundary.y = originalBoundary.y + dy;
            newBoundary.height = Math.max(10, originalBoundary.height - dy);
            break;

          case 'top-right':
            newBoundary.y = originalBoundary.y + dy;
            newBoundary.width = Math.max(10, originalBoundary.width + dx);
            newBoundary.height = Math.max(10, originalBoundary.height - dy);
            break;

          case 'left':
            newBoundary.x = originalBoundary.x + dx;
            newBoundary.width = Math.max(10, originalBoundary.width - dx);
            break;

          case 'right':
            newBoundary.width = Math.max(10, originalBoundary.width + dx);
            break;

          case 'bottom-left':
            newBoundary.x = originalBoundary.x + dx;
            newBoundary.width = Math.max(10, originalBoundary.width - dx);
            newBoundary.height = Math.max(10, originalBoundary.height + dy);
            break;

          case 'bottom':
            newBoundary.height = Math.max(10, originalBoundary.height + dy);
            break;

          case 'bottom-right':
            newBoundary.width = Math.max(10, originalBoundary.width + dx);
            newBoundary.height = Math.max(10, originalBoundary.height + dy);
            break;
        }

        draft.boundary = newBoundary;
      }),

    endBoundaryDrag: () =>
      set((state) => {
        if (state.boundaryEditState.activeHandle) {
          const draft = state.drafts.find((d) => d.id === state.activeDraftId);
          if (draft) {
            draft.modifiedAt = new Date().toISOString();
            state.isModified = true;
          }
        }
        state.boundaryEditState.activeHandle = null;
        state.boundaryEditState.dragStart = null;
        state.boundaryEditState.originalBoundary = null;
      }),

    cancelBoundaryDrag: () =>
      set((state) => {
        const { originalBoundary } = state.boundaryEditState;
        if (originalBoundary) {
          const draft = state.drafts.find((d) => d.id === state.activeDraftId);
          if (draft) {
            draft.boundary = originalBoundary;
          }
        }
        state.boundaryEditState.activeHandle = null;
        state.boundaryEditState.dragStart = null;
        state.boundaryEditState.originalBoundary = null;
      }),

    switchToDraft: (id) =>
      set((state) => {
        const draft = state.drafts.find((d) => d.id === id);
        if (!draft) return;

        // Save current viewport to draftViewports if in draft mode
        if (state.editorMode === 'draft' && state.activeDraftId) {
          state.draftViewports[state.activeDraftId] = { ...state.viewport };
        }

        state.activeDraftId = id;
        state.editorMode = 'draft';
        state.activeSheetId = null;
        state.viewport = state.draftViewports[id] || { offsetX: 0, offsetY: 0, zoom: 1 };

        // Set active layer to a layer in this draft
        const layerInDraft = state.layers.find((l) => l.draftId === id);
        if (layerInDraft) {
          state.activeLayerId = layerInDraft.id;
        }

        state.selectedShapeIds = [];
      }),

    // Sheet actions
    addSheet: (name, paperSize = 'A4', orientation = 'landscape') =>
      set((state) => {
        const id = generateId();
        const newSheet: Sheet = {
          id,
          name: name || `Sheet ${state.sheets.length + 1}`,
          paperSize,
          orientation,
          viewports: [],
          titleBlock: createDefaultTitleBlock(),
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        };
        state.sheets.push(newSheet);
        state.isModified = true;
      }),

    deleteSheet: (id) =>
      set((state) => {
        state.sheets = state.sheets.filter((s) => s.id !== id);

        // If the deleted sheet was active, switch back to draft mode
        if (state.activeSheetId === id) {
          state.activeSheetId = null;
          state.editorMode = 'draft';
          state.viewport = state.draftViewports[state.activeDraftId] || { offsetX: 0, offsetY: 0, zoom: 1 };
        }

        state.isModified = true;
      }),

    renameSheet: (id, name) =>
      set((state) => {
        const sheet = state.sheets.find((s) => s.id === id);
        if (sheet) {
          sheet.name = name;
          sheet.modifiedAt = new Date().toISOString();
          state.isModified = true;
        }
      }),

    updateSheet: (id, updates) =>
      set((state) => {
        const sheet = state.sheets.find((s) => s.id === id);
        if (sheet) {
          Object.assign(sheet, updates);
          sheet.modifiedAt = new Date().toISOString();
          state.isModified = true;
        }
      }),

    switchToSheet: (id) =>
      set((state) => {
        const sheet = state.sheets.find((s) => s.id === id);
        if (!sheet) return;

        // Save current viewport if in draft mode
        if (state.editorMode === 'draft' && state.activeDraftId) {
          state.draftViewports[state.activeDraftId] = { ...state.viewport };
        }

        state.activeSheetId = id;
        state.editorMode = 'sheet';
        // Reset viewport for sheet mode (will be handled by sheet renderer)
        state.viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
        state.selectedShapeIds = [];
      }),

    switchToDraftMode: () =>
      set((state) => {
        state.editorMode = 'draft';
        state.activeSheetId = null;
        state.viewport = state.draftViewports[state.activeDraftId] || { offsetX: 0, offsetY: 0, zoom: 1 };
      }),

    // Sheet Viewport actions
    addSheetViewport: (sheetId, draftId, bounds) =>
      set((state) => {
        const sheet = state.sheets.find((s) => s.id === sheetId);
        if (!sheet) return;

        const newViewport: SheetViewport = {
          id: generateId(),
          draftId,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          centerX: 0,
          centerY: 0,
          scale: 0.01,  // Default 1:100
          locked: false,
          visible: true,
        };
        sheet.viewports.push(newViewport);
        sheet.modifiedAt = new Date().toISOString();
        state.isModified = true;
      }),

    updateSheetViewport: (sheetId, viewportId, updates) =>
      set((state) => {
        const sheet = state.sheets.find((s) => s.id === sheetId);
        if (!sheet) return;

        const viewport = sheet.viewports.find((vp) => vp.id === viewportId);
        if (viewport) {
          Object.assign(viewport, updates);
          sheet.modifiedAt = new Date().toISOString();
          state.isModified = true;
        }
      }),

    deleteSheetViewport: (sheetId, viewportId) =>
      set((state) => {
        const sheet = state.sheets.find((s) => s.id === sheetId);
        if (!sheet) return;

        sheet.viewports = sheet.viewports.filter((vp) => vp.id !== viewportId);
        sheet.modifiedAt = new Date().toISOString();
        state.isModified = true;

        // Clear selection if deleted viewport was selected
        if (state.viewportEditState.selectedViewportId === viewportId) {
          state.viewportEditState.selectedViewportId = null;
        }
      }),

    // Viewport Editing actions (Revit-like viewport manipulation)
    selectViewport: (viewportId) =>
      set((state) => {
        state.viewportEditState.selectedViewportId = viewportId;
        // Clear any active drag when changing selection
        state.viewportEditState.activeHandle = null;
        state.viewportEditState.isDragging = false;
        state.viewportEditState.dragStart = null;
        state.viewportEditState.originalViewport = null;
      }),

    startViewportDrag: (handle, sheetPos) =>
      set((state) => {
        const { selectedViewportId } = state.viewportEditState;
        if (!selectedViewportId || !state.activeSheetId) return;

        const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
        if (!sheet) return;

        const viewport = sheet.viewports.find((vp) => vp.id === selectedViewportId);
        if (!viewport || viewport.locked) return;

        state.viewportEditState.activeHandle = handle;
        state.viewportEditState.isDragging = true;
        state.viewportEditState.dragStart = sheetPos;
        state.viewportEditState.originalViewport = { ...viewport };
      }),

    updateViewportDrag: (sheetPos) =>
      set((state) => {
        const { selectedViewportId, activeHandle, dragStart, originalViewport, isDragging } = state.viewportEditState;
        if (!isDragging || !selectedViewportId || !activeHandle || !dragStart || !originalViewport || !state.activeSheetId) return;

        const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
        if (!sheet) return;

        const viewport = sheet.viewports.find((vp) => vp.id === selectedViewportId);
        if (!viewport) return;

        const dx = sheetPos.x - dragStart.x;
        const dy = sheetPos.y - dragStart.y;

        // Apply changes based on which handle is being dragged
        if (activeHandle === 'center') {
          // Move entire viewport
          viewport.x = originalViewport.x + dx;
          viewport.y = originalViewport.y + dy;
        } else {
          // Resize based on handle
          let newX = originalViewport.x;
          let newY = originalViewport.y;
          let newWidth = originalViewport.width;
          let newHeight = originalViewport.height;

          // Handle horizontal resizing
          if (activeHandle.includes('left')) {
            newX = originalViewport.x + dx;
            newWidth = originalViewport.width - dx;
          } else if (activeHandle.includes('right')) {
            newWidth = originalViewport.width + dx;
          }

          // Handle vertical resizing
          if (activeHandle.includes('top')) {
            newY = originalViewport.y + dy;
            newHeight = originalViewport.height - dy;
          } else if (activeHandle.includes('bottom')) {
            newHeight = originalViewport.height + dy;
          }

          // Ensure minimum size (20mm)
          const minSize = 20;
          if (newWidth >= minSize && newHeight >= minSize) {
            viewport.x = newX;
            viewport.y = newY;
            viewport.width = newWidth;
            viewport.height = newHeight;
          }
        }

        sheet.modifiedAt = new Date().toISOString();
      }),

    endViewportDrag: () =>
      set((state) => {
        if (state.viewportEditState.isDragging) {
          state.isModified = true;
        }
        state.viewportEditState.activeHandle = null;
        state.viewportEditState.isDragging = false;
        state.viewportEditState.dragStart = null;
        state.viewportEditState.originalViewport = null;
      }),

    cancelViewportDrag: () =>
      set((state) => {
        const { selectedViewportId, originalViewport } = state.viewportEditState;
        if (selectedViewportId && originalViewport && state.activeSheetId) {
          // Restore original viewport state
          const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
          if (sheet) {
            const viewport = sheet.viewports.find((vp) => vp.id === selectedViewportId);
            if (viewport) {
              viewport.x = originalViewport.x;
              viewport.y = originalViewport.y;
              viewport.width = originalViewport.width;
              viewport.height = originalViewport.height;
            }
          }
        }
        state.viewportEditState.activeHandle = null;
        state.viewportEditState.isDragging = false;
        state.viewportEditState.dragStart = null;
        state.viewportEditState.originalViewport = null;
      }),

    centerViewportOnDraft: (viewportId) =>
      set((state) => {
        if (!state.activeSheetId) return;

        const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
        if (!sheet) return;

        const viewport = sheet.viewports.find((vp) => vp.id === viewportId);
        if (!viewport) return;

        const draft = state.drafts.find((d) => d.id === viewport.draftId);
        if (!draft) return;

        // Center viewport on draft boundary center
        viewport.centerX = draft.boundary.x + draft.boundary.width / 2;
        viewport.centerY = draft.boundary.y + draft.boundary.height / 2;
        sheet.modifiedAt = new Date().toISOString();
        state.isModified = true;
      }),

    fitViewportToDraft: (viewportId) =>
      set((state) => {
        if (!state.activeSheetId) return;

        const sheet = state.sheets.find((s) => s.id === state.activeSheetId);
        if (!sheet) return;

        const viewport = sheet.viewports.find((vp) => vp.id === viewportId);
        if (!viewport) return;

        const draft = state.drafts.find((d) => d.id === viewport.draftId);
        if (!draft) return;

        // Calculate scale to fit draft boundary in viewport
        const scaleX = viewport.width / draft.boundary.width;
        const scaleY = viewport.height / draft.boundary.height;
        const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to add padding

        // Center on draft boundary
        viewport.centerX = draft.boundary.x + draft.boundary.width / 2;
        viewport.centerY = draft.boundary.y + draft.boundary.height / 2;
        viewport.scale = scale;

        sheet.modifiedAt = new Date().toISOString();
        state.isModified = true;
      }),

    // Title Block actions
    updateTitleBlockField: (sheetId, fieldId, value) =>
      set((state) => {
        const sheet = state.sheets.find((s) => s.id === sheetId);
        if (!sheet) return;

        const field = sheet.titleBlock.fields.find((f) => f.id === fieldId);
        if (field) {
          field.value = value;
          sheet.modifiedAt = new Date().toISOString();
          state.isModified = true;
        }
      }),

    setTitleBlockVisible: (sheetId, visible) =>
      set((state) => {
        const sheet = state.sheets.find((s) => s.id === sheetId);
        if (sheet) {
          sheet.titleBlock.visible = visible;
          sheet.modifiedAt = new Date().toISOString();
          state.isModified = true;
        }
      }),

    // Layer actions
    addLayer: (name) =>
      set((state) => {
        const newLayer: Layer = {
          id: generateId(),
          name: name || `Layer ${state.layers.filter(l => l.draftId === state.activeDraftId).length}`,
          draftId: state.activeDraftId,
          visible: true,
          locked: false,
          color: '#ffffff',
          lineStyle: 'solid',
          lineWidth: 1,
        };
        state.layers.push(newLayer);
        state.activeLayerId = newLayer.id;
      }),

    updateLayer: (id, updates) =>
      set((state) => {
        const index = state.layers.findIndex((l) => l.id === id);
        if (index !== -1) {
          state.layers[index] = { ...state.layers[index], ...updates };
        }
      }),

    deleteLayer: (id) =>
      set((state) => {
        // Get layers in the current draft
        const layersInDraft = state.layers.filter((l) => l.draftId === state.activeDraftId);

        // Can't delete the last layer in a draft
        if (layersInDraft.length <= 1) return;

        state.layers = state.layers.filter((l) => l.id !== id);
        if (state.activeLayerId === id) {
          // Set active layer to another layer in the same draft
          const remainingLayersInDraft = state.layers.filter((l) => l.draftId === state.activeDraftId);
          state.activeLayerId = remainingLayersInDraft[0]?.id || state.layers[0].id;
        }
        // Move shapes from deleted layer to active layer
        state.shapes.forEach((s) => {
          if (s.layerId === id) {
            s.layerId = state.activeLayerId;
          }
        });
      }),

    setActiveLayer: (id) =>
      set((state) => {
        state.activeLayerId = id;
      }),

    // Viewport actions
    setViewport: (viewport) =>
      set((state) => {
        state.viewport = { ...state.viewport, ...viewport };
      }),

    zoomIn: () =>
      set((state) => {
        state.viewport.zoom = Math.min(state.viewport.zoom * 1.2, 100);
      }),

    zoomOut: () =>
      set((state) => {
        state.viewport.zoom = Math.max(state.viewport.zoom / 1.2, 0.01);
      }),

    zoomToFit: () =>
      set((state) => {
        // TODO: Calculate bounding box of all shapes and fit viewport
        state.viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
      }),

    resetView: () =>
      set((state) => {
        state.viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
      }),

    // Tool actions
    setActiveTool: (tool) =>
      set((state) => {
        state.activeTool = tool;
        state.isDrawing = false;
        state.drawingPreview = null;
        state.drawingPoints = [];
      }),

    setCircleMode: (mode) =>
      set((state) => {
        state.circleMode = mode;
        // Reset drawing state when changing mode
        state.isDrawing = false;
        state.drawingPreview = null;
        state.drawingPoints = [];
      }),

    setRectangleMode: (mode) =>
      set((state) => {
        state.rectangleMode = mode;
        // Reset drawing state when changing mode
        state.isDrawing = false;
        state.drawingPreview = null;
        state.drawingPoints = [];
      }),

    setCurrentStyle: (style) =>
      set((state) => {
        state.currentStyle = { ...state.currentStyle, ...style };
      }),

    // Grid & Snap actions
    setGridSize: (size) =>
      set((state) => {
        state.gridSize = Math.max(1, size);
      }),

    toggleGrid: () =>
      set((state) => {
        state.gridVisible = !state.gridVisible;
      }),

    toggleSnap: () =>
      set((state) => {
        state.snapEnabled = !state.snapEnabled;
      }),

    setActiveSnaps: (snaps) =>
      set((state) => {
        state.activeSnaps = snaps;
      }),

    toggleSnapType: (snapType) =>
      set((state) => {
        const index = state.activeSnaps.indexOf(snapType);
        if (index >= 0) {
          state.activeSnaps.splice(index, 1);
        } else {
          state.activeSnaps.push(snapType);
        }
      }),

    setSnapTolerance: (tolerance) =>
      set((state) => {
        state.snapTolerance = Math.max(1, tolerance);
      }),

    setCurrentSnapPoint: (snapPoint) =>
      set((state) => {
        state.currentSnapPoint = snapPoint;
      }),

    setSnapSettingsOpen: (open) =>
      set((state) => {
        state.snapSettingsOpen = open;
      }),

    // Tracking actions
    toggleTracking: () =>
      set((state) => {
        state.trackingEnabled = !state.trackingEnabled;
      }),

    togglePolarTracking: () =>
      set((state) => {
        state.polarTrackingEnabled = !state.polarTrackingEnabled;
      }),

    toggleOrthoMode: () =>
      set((state) => {
        state.orthoMode = !state.orthoMode;
        // Ortho mode overrides polar tracking
        if (state.orthoMode) {
          state.polarTrackingEnabled = false;
        }
      }),

    toggleObjectTracking: () =>
      set((state) => {
        state.objectTrackingEnabled = !state.objectTrackingEnabled;
      }),

    setPolarAngleIncrement: (angle) =>
      set((state) => {
        state.polarAngleIncrement = angle;
      }),

    setCurrentTrackingLines: (lines) =>
      set((state) => {
        state.currentTrackingLines = lines;
      }),

    setTrackingPoint: (point) =>
      set((state) => {
        state.trackingPoint = point;
      }),

    // UI actions
    setCanvasSize: (size) =>
      set((state) => {
        state.canvasSize = size;
      }),

    setMousePosition: (point) =>
      set((state) => {
        state.mousePosition = point;
      }),

    setIsDrawing: (isDrawing) =>
      set((state) => {
        state.isDrawing = isDrawing;
      }),

    setDrawingPreview: (preview) =>
      set((state) => {
        state.drawingPreview = preview;
      }),

    // Drawing actions (AutoCAD-style)
    addDrawingPoint: (point) =>
      set((state) => {
        state.drawingPoints.push(point);
        state.isDrawing = true;
      }),

    undoDrawingPoint: () =>
      set((state) => {
        if (state.drawingPoints.length > 0) {
          state.drawingPoints.pop();
          if (state.drawingPoints.length === 0) {
            state.isDrawing = false;
            state.drawingPreview = null;
          }
        }
      }),

    clearDrawingPoints: () =>
      set((state) => {
        state.drawingPoints = [];
        state.isDrawing = false;
        state.drawingPreview = null;
      }),

    closeDrawing: () =>
      set((state) => {
        // This will be handled in the canvas events to create a closing line
        // Just mark that we want to close
        state.drawingPoints = [];
        state.isDrawing = false;
        state.drawingPreview = null;
      }),

    // Selection box actions
    setSelectionBox: (box) =>
      set((state) => {
        state.selectionBox = box;
      }),

    // Command line actions
    executeCommand: (command) =>
      set((state) => {
        state.commandHistory.push(command);
        state.currentCommand = '';
        // TODO: Parse and execute command
      }),

    setCurrentCommand: (command) =>
      set((state) => {
        state.currentCommand = command;
      }),

    setPendingCommand: (command) =>
      set((state) => {
        state.pendingCommand = command;
      }),

    setPendingCommandPoint: (point) =>
      set((state) => {
        state.pendingCommandPoint = point;
      }),

    setPendingCommandSelection: (ids) =>
      set((state) => {
        state.pendingCommandSelection = ids;
      }),

    setHasActiveModifyCommand: (active) =>
      set((state) => {
        state.hasActiveModifyCommand = active;
      }),

    setCommandIsSelecting: (isSelecting) =>
      set((state) => {
        state.commandIsSelecting = isSelecting;
      }),

    setCommandPreviewShapes: (previewShapes) =>
      set((state) => {
        state.commandPreviewShapes = previewShapes;
      }),

    // Undo/Redo actions
    pushHistory: () =>
      set((state) => {
        // Clone current shapes
        const snapshot = cloneShapes(state.shapes);

        // If we're not at the end of history, truncate future states
        if (state.historyIndex >= 0 && state.historyIndex < state.historyStack.length - 1) {
          state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
        }

        // Add new snapshot
        state.historyStack.push(snapshot);

        // Trim history if it exceeds max size
        if (state.historyStack.length > state.maxHistorySize) {
          state.historyStack.shift();
        }

        // Update index to point to latest
        state.historyIndex = state.historyStack.length - 1;
      }),

    undo: () => {
      let success = false;

      set((state) => {
        // If no history, can't undo
        if (state.historyStack.length === 0) return;

        // If this is the first undo (we're at the latest state), save current state first
        if (state.historyIndex === state.historyStack.length - 1) {
          // Save current state so we can redo back to it
          const currentSnapshot = cloneShapes(state.shapes);
          state.historyStack.push(currentSnapshot);
          // historyIndex now points to the saved "current" state
          state.historyIndex = state.historyStack.length - 1;
        }

        // Calculate new index
        const newIndex = state.historyIndex - 1;
        if (newIndex < 0) return;

        // Restore the previous state
        state.shapes = cloneShapes(state.historyStack[newIndex]);
        state.historyIndex = newIndex;
        state.selectedShapeIds = []; // Clear selection on undo
        success = true;
      });

      return success;
    },

    redo: () => {
      let success = false;

      set((state) => {
        // If no history or at the end, can't redo
        if (state.historyStack.length === 0) return;

        const newIndex = state.historyIndex + 1;
        if (newIndex >= state.historyStack.length) return;

        // Restore the next state
        state.shapes = cloneShapes(state.historyStack[newIndex]);
        state.historyIndex = newIndex;
        state.selectedShapeIds = []; // Clear selection on redo
        success = true;
      });

      return success;
    },

    canUndo: () => {
      const state = get();
      return state.historyStack.length > 0 && state.historyIndex > 0;
    },

    canRedo: () => {
      const state = get();
      return state.historyStack.length > 0 && state.historyIndex < state.historyStack.length - 1;
    },

    // Dialog actions
    setPrintDialogOpen: (open) =>
      set((state) => {
        state.printDialogOpen = open;
      }),
    setAboutDialogOpen: (open) =>
      set((state) => {
        state.aboutDialogOpen = open;
      }),

    // File actions
    newProject: () =>
      set((state) => {
        // Create new default draft
        const newDraftId = generateId();
        const newLayerId = generateId();

        state.drafts = [{
          id: newDraftId,
          name: 'Draft 1',
          boundary: { ...DEFAULT_DRAFT_BOUNDARY },
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        }];
        state.sheets = [];
        state.editorMode = 'draft';
        state.activeDraftId = newDraftId;
        state.activeSheetId = null;
        state.draftViewports = { [newDraftId]: { offsetX: 0, offsetY: 0, zoom: 1 } };

        state.shapes = [];
        state.selectedShapeIds = [];
        state.layers = [
          {
            id: newLayerId,
            name: 'Layer 0',
            draftId: newDraftId,
            visible: true,
            locked: false,
            color: '#ffffff',
            lineStyle: 'solid',
            lineWidth: 1,
          },
        ];
        state.activeLayerId = newLayerId;
        state.viewport = { zoom: 1, offsetX: 0, offsetY: 0 };
        state.historyStack = [];
        state.historyIndex = -1;
        state.currentFilePath = null;
        state.projectName = 'Untitled';
        state.isModified = false;
        state.drawingPoints = [];
        state.drawingPreview = null;
        state.commandPreviewShapes = [];
      }),

    loadProject: (data, filePath, projectName) =>
      set((state) => {
        // Handle both V1 (legacy) and V2 data formats
        const dataWithDrafts = data as {
          shapes: Shape[];
          layers: Layer[];
          activeLayerId: string;
          viewport?: { zoom: number; offsetX: number; offsetY: number };
          settings?: { gridSize: number; gridVisible: boolean; snapEnabled: boolean };
          // V2 fields
          drafts?: Draft[];
          sheets?: Sheet[];
          activeDraftId?: string;
          activeSheetId?: string | null;
          draftViewports?: Record<string, Viewport>;
        };

        if (dataWithDrafts.drafts && dataWithDrafts.drafts.length > 0) {
          // V2 format - has drafts and sheets
          // Ensure all drafts have boundaries (migration for older V2 files)
          state.drafts = dataWithDrafts.drafts.map(draft => ({
            ...draft,
            boundary: draft.boundary || { ...DEFAULT_DRAFT_BOUNDARY },
          }));
          state.sheets = dataWithDrafts.sheets || [];
          state.activeDraftId = dataWithDrafts.activeDraftId || dataWithDrafts.drafts[0].id;
          state.activeSheetId = dataWithDrafts.activeSheetId || null;
          state.draftViewports = dataWithDrafts.draftViewports || {};
          state.editorMode = dataWithDrafts.activeSheetId ? 'sheet' : 'draft';
        } else {
          // V1 format - create a default draft and assign all shapes/layers to it
          const newDraftId = generateId();
          state.drafts = [{
            id: newDraftId,
            name: 'Draft 1',
            boundary: { ...DEFAULT_DRAFT_BOUNDARY },
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
          }];
          state.sheets = [];
          state.activeDraftId = newDraftId;
          state.activeSheetId = null;
          state.draftViewports = { [newDraftId]: data.viewport || { offsetX: 0, offsetY: 0, zoom: 1 } };
          state.editorMode = 'draft';

          // Assign draftId to all shapes and layers if they don't have one
          data.shapes.forEach((shape: Shape) => {
            if (!shape.draftId) {
              (shape as Shape).draftId = newDraftId;
            }
          });
          data.layers.forEach((layer: Layer) => {
            if (!layer.draftId) {
              (layer as Layer).draftId = newDraftId;
            }
          });
        }

        state.shapes = data.shapes;
        state.layers = data.layers;
        state.activeLayerId = data.activeLayerId;
        state.selectedShapeIds = [];
        if (data.viewport) {
          state.viewport = data.viewport;
        }
        if (data.settings) {
          state.gridSize = data.settings.gridSize;
          state.gridVisible = data.settings.gridVisible;
          state.snapEnabled = data.settings.snapEnabled;
        }
        state.historyStack = [];
        state.historyIndex = -1;
        state.currentFilePath = filePath || null;
        state.projectName = projectName || 'Untitled';
        state.isModified = false;
        state.drawingPoints = [];
        state.drawingPreview = null;
        state.commandPreviewShapes = [];
      }),

    setFilePath: (path) =>
      set((state) => {
        state.currentFilePath = path;
      }),

    setProjectName: (name) =>
      set((state) => {
        state.projectName = name;
      }),

    setModified: (modified) =>
      set((state) => {
        state.isModified = modified;
      }),
  }))
);
