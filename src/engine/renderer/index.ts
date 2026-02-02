/**
 * Renderer module exports
 *
 * This module provides a modular rendering system for the CAD application.
 * It is organized into:
 * - types: Shared types and constants
 * - core: Base rendering utilities and shape rendering
 * - layers: Individual rendering layers (grid, snap, tracking, selection)
 * - ui: UI elements like handles for interactive editing
 * - sheet: Sheet-specific renderers (viewports, title blocks)
 * - modes: High-level orchestrators for draft and sheet modes
 */

// Types and constants
export * from './types';

// Core renderers
export { BaseRenderer } from './core/BaseRenderer';
export { ShapeRenderer } from './core/ShapeRenderer';

// Layer renderers
export { GridLayer } from './layers/GridLayer';
export { SnapLayer } from './layers/SnapLayer';
export { TrackingLayer } from './layers/TrackingLayer';
export { SelectionLayer } from './layers/SelectionLayer';

// UI renderers
export { HandleRenderer } from './ui/HandleRenderer';
export type { BoundaryHandleType, ViewportHandleType } from './ui/HandleRenderer';

// Sheet renderers
export { ViewportRenderer } from './sheet/ViewportRenderer';
export { TitleBlockRenderer } from './sheet/TitleBlockRenderer';

// Mode renderers (main orchestrators)
export { DraftRenderer } from './modes/DrawingRenderer';
export type { DraftRenderOptions } from './modes/DrawingRenderer';
export { SheetRenderer } from './modes/SheetRenderer';
export type { SheetRenderOptions } from './modes/SheetRenderer';
