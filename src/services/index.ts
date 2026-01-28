/**
 * Services Module - Business logic layer
 *
 * This module provides reusable business logic functions
 * that are independent of the UI and state management.
 *
 * Services:
 * - shapeService: Shape creation, transformation, validation
 * - drawingService: Drawing management and queries
 * - sheetService: Sheet and viewport operations
 * - selectionService: Selection and filtering logic
 * - historyService: Undo/redo state management
 */

// Shape operations
export {
  generateShapeId,
  DEFAULT_STYLE,
  createLineShape,
  createRectangleShape,
  createCircleShape,
  createArcShape,
  createEllipseShape,
  createPolylineShape,
  createPointShape,
  cloneShape,
  cloneShapes,
  translateShape,
  rotateShape,
  scaleShape,
  mirrorShape,
  getShapeCenter,
  getShapesBounds,
  validateShape,
  isShapeInBounds,
  doesShapeIntersectBounds,
  getShapeBounds,
} from './shapeService';

export type { ShapeBounds } from './shapeService';

// Drawing operations (with legacy Draft aliases)
export {
  generateDrawingId,
  generateDraftId,
  DEFAULT_BOUNDARY,
  createDrawing,
  createDraft,
  updateDrawingBoundary,
  updateDraftBoundary,
  getDrawingShapes,
  getDraftShapes,
  getVisibleDrawingShapes,
  getVisibleDraftShapes,
  getDrawingLayerShapes,
  getDraftLayerShapes,
  calculateDrawingBounds,
  calculateDraftBounds,
  fitBoundaryToShapes,
  isPointInDrawingBoundary,
  isPointInDraftBoundary,
  isShapeInDrawingBoundary,
  isShapeInDraftBoundary,
  getDrawingStats,
  getDraftStats,
  copyShapesToDrawing,
  copyShapesToDraft,
  validateDrawing,
  validateDraft,
  getDrawingCenter,
  getDraftCenter,
  calculateZoomToFit,
} from './drawingService';

// Sheet operations
export {
  PAPER_SIZES,
  MM_TO_PIXELS,
  SCALE_PRESETS,
  generateSheetId,
  generateViewportId,
  createDefaultTitleBlock,
  createSheet,
  getPaperDimensions,
  createViewport,
  updateViewport,
  calculateViewportCenter,
  calculateViewportScale,
  formatScale,
  parseScale,
  sheetToScreen,
  screenToSheet,
  worldToViewport,
  viewportToWorld,
  isPointInViewport,
  updateTitleBlockField,
  updateTitleBlockFields,
  getPrintableArea,
  validateSheet,
  validateViewport,
} from './sheetService';

// Selection operations
export {
  findShapeAtPoint,
  findShapesAtPoint,
  selectShapesByBox,
  filterByLayer,
  filterByLayers,
  filterByType,
  filterByTypes,
  filterByDrawing,
  filterByDraft,
  filterVisible,
  filterUnlocked,
  filterSelectable,
  filterByVisibleLayers,
  filterByUnlockedLayers,
  addToSelection,
  removeFromSelection,
  toggleInSelection,
  getShapesByIds,
  invertSelection,
  selectAll,
  isSelected,
  getSelectionStats,
} from './selectionService';

export type { SelectionMode, SelectionBox } from './selectionService';

// History operations
export {
  DEFAULT_HISTORY_CONFIG,
  createHistoryState,
  createSnapshot,
  pushSnapshot,
  canUndo,
  canRedo,
  getUndoSnapshot,
  getRedoSnapshot,
  performUndo,
  performRedo,
  clearHistory,
  getUndoDescriptions,
  getRedoDescriptions,
  getHistoryStats,
  undoToSnapshot,
  hasChangedSinceLastSnapshot,
  beginBatch,
  endBatch,
} from './historyService';

export type { HistorySnapshot, HistoryConfig, HistoryState } from './historyService';

// Title block operations
export {
  BUILT_IN_TEMPLATES,
  generateTemplateId,
  getTemplateById,
  getTemplatesForPaperSize,
  calculateTitleBlockDimensions,
  createTitleBlockFromTemplate,
  createDefaultRevisionTable,
  addRevision,
  calculateAutoFields,
  updateFieldValue,
  updateFieldValues,
  setLogo,
  removeLogo,
} from './titleBlockService';

export type { AutoFieldContext } from './titleBlockService';

// Sheet template operations
export {
  BUILT_IN_SHEET_TEMPLATES,
  DISCIPLINE_PREFIXES,
  DEFAULT_NUMBERING_SCHEME,
  generateSheetTemplateId,
  getSheetTemplateById,
  getSheetTemplatesForPaperSize,
  getTemplatesGroupedByPaperSize,
  createViewportsFromTemplate,
  generateSheetNumber,
  parseSheetNumber,
  renumberSheets,
  getNextSheetNumber,
  createTemplateFromSheet,
} from './sheetTemplateService';

export type { SheetNumberingScheme } from './sheetTemplateService';
