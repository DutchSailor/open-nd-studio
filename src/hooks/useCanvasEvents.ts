/**
 * useCanvasEvents - Re-export from modular hooks structure
 *
 * This file maintains backward compatibility. The actual implementation
 * has been moved to src/hooks/canvas/useCanvasEvents.ts which composes
 * specialized hooks for different concerns.
 *
 * Modular hooks structure:
 * - src/hooks/navigation/usePanZoom.ts - Pan and zoom
 * - src/hooks/selection/useBoxSelection.ts - Box selection
 * - src/hooks/snap/useSnapDetection.ts - Snap and tracking
 * - src/hooks/drawing/useShapeDrawing.ts - Shape drawing
 * - src/hooks/editing/useBoundaryEditing.ts - Boundary editing
 * - src/hooks/editing/useViewportEditing.ts - Viewport editing
 */

export { useCanvasEvents } from './canvas/useCanvasEvents';
