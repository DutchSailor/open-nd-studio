/**
 * Sheet Template Service - Business logic for sheet template operations
 *
 * Provides:
 * - Built-in sheet templates for common layouts
 * - Template creation and management
 * - Sheet creation from templates
 * - Automatic sheet numbering
 */

import type {
  SheetTemplate,
  ViewportPlaceholder,
} from '../types/sheet';
import type { Sheet, SheetViewport } from '../types/geometry';
import { generateViewportId } from './sheetService';

/**
 * Generate a unique ID for sheet templates
 */
export function generateSheetTemplateId(): string {
  return `st_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Built-in sheet templates
 */
export const BUILT_IN_SHEET_TEMPLATES: SheetTemplate[] = [
  // ============================================================================
  // A4 Templates
  // ============================================================================
  {
    id: 'builtin-a4-single',
    name: 'A4 Single View',
    description: 'Single viewport centered on A4 landscape',
    paperSize: 'A4',
    orientation: 'landscape',
    titleBlockTemplateId: 'builtin-a4-standard',
    viewportPlaceholders: [
      {
        id: 'main',
        name: 'Main View',
        x: 15,
        y: 15,
        width: 230,
        height: 130,
        defaultScale: 0.01, // 1:100
        suggestedDrawingType: 'Floor Plan',
      },
    ],
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'builtin-a4-two-horizontal',
    name: 'A4 Two Views (Side by Side)',
    description: 'Two viewports side by side on A4 landscape',
    paperSize: 'A4',
    orientation: 'landscape',
    titleBlockTemplateId: 'builtin-a4-standard',
    viewportPlaceholders: [
      {
        id: 'left',
        name: 'Left View',
        x: 15,
        y: 15,
        width: 110,
        height: 130,
        defaultScale: 0.02, // 1:50
        suggestedDrawingType: 'Plan',
      },
      {
        id: 'right',
        name: 'Right View',
        x: 135,
        y: 15,
        width: 110,
        height: 130,
        defaultScale: 0.02,
        suggestedDrawingType: 'Section',
      },
    ],
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
  },

  // ============================================================================
  // A3 Templates
  // ============================================================================
  {
    id: 'builtin-a3-single',
    name: 'A3 Single View',
    description: 'Single large viewport on A3 landscape',
    paperSize: 'A3',
    orientation: 'landscape',
    titleBlockTemplateId: 'builtin-a3-standard',
    viewportPlaceholders: [
      {
        id: 'main',
        name: 'Main View',
        x: 15,
        y: 15,
        width: 350,
        height: 210,
        defaultScale: 0.01,
        suggestedDrawingType: 'Floor Plan',
      },
    ],
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'builtin-a3-two-horizontal',
    name: 'A3 Two Views (Side by Side)',
    description: 'Two viewports side by side on A3 landscape',
    paperSize: 'A3',
    orientation: 'landscape',
    titleBlockTemplateId: 'builtin-a3-standard',
    viewportPlaceholders: [
      {
        id: 'left',
        name: 'Left View',
        x: 15,
        y: 15,
        width: 170,
        height: 210,
        defaultScale: 0.01,
        suggestedDrawingType: 'Plan',
      },
      {
        id: 'right',
        name: 'Right View',
        x: 195,
        y: 15,
        width: 170,
        height: 210,
        defaultScale: 0.01,
        suggestedDrawingType: 'Section',
      },
    ],
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'builtin-a3-main-detail',
    name: 'A3 Main + Details',
    description: 'Large main view with two detail views on A3',
    paperSize: 'A3',
    orientation: 'landscape',
    titleBlockTemplateId: 'builtin-a3-standard',
    viewportPlaceholders: [
      {
        id: 'main',
        name: 'Main View',
        x: 15,
        y: 15,
        width: 250,
        height: 210,
        defaultScale: 0.01,
        suggestedDrawingType: 'Floor Plan',
      },
      {
        id: 'detail1',
        name: 'Detail 1',
        x: 275,
        y: 15,
        width: 90,
        height: 100,
        defaultScale: 0.05, // 1:20
        suggestedDrawingType: 'Detail',
      },
      {
        id: 'detail2',
        name: 'Detail 2',
        x: 275,
        y: 125,
        width: 90,
        height: 100,
        defaultScale: 0.05,
        suggestedDrawingType: 'Detail',
      },
    ],
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'builtin-a3-four-views',
    name: 'A3 Four Views (2x2)',
    description: 'Four equal viewports in 2x2 grid on A3',
    paperSize: 'A3',
    orientation: 'landscape',
    titleBlockTemplateId: 'builtin-a3-standard',
    viewportPlaceholders: [
      {
        id: 'top-left',
        name: 'Top Left',
        x: 15,
        y: 15,
        width: 170,
        height: 100,
        defaultScale: 0.02,
      },
      {
        id: 'top-right',
        name: 'Top Right',
        x: 195,
        y: 15,
        width: 170,
        height: 100,
        defaultScale: 0.02,
      },
      {
        id: 'bottom-left',
        name: 'Bottom Left',
        x: 15,
        y: 125,
        width: 170,
        height: 100,
        defaultScale: 0.02,
      },
      {
        id: 'bottom-right',
        name: 'Bottom Right',
        x: 195,
        y: 125,
        width: 170,
        height: 100,
        defaultScale: 0.02,
      },
    ],
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
  },

  // ============================================================================
  // A2 Templates
  // ============================================================================
  {
    id: 'builtin-a2-single',
    name: 'A2 Single View',
    description: 'Single large viewport on A2 landscape',
    paperSize: 'A2',
    orientation: 'landscape',
    titleBlockTemplateId: 'builtin-a2-standard',
    viewportPlaceholders: [
      {
        id: 'main',
        name: 'Main View',
        x: 20,
        y: 20,
        width: 520,
        height: 340,
        defaultScale: 0.01,
        suggestedDrawingType: 'Floor Plan',
      },
    ],
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'builtin-a2-plan-sections',
    name: 'A2 Plan + Sections',
    description: 'Main plan with two section views on A2',
    paperSize: 'A2',
    orientation: 'landscape',
    titleBlockTemplateId: 'builtin-a2-standard',
    viewportPlaceholders: [
      {
        id: 'plan',
        name: 'Floor Plan',
        x: 20,
        y: 20,
        width: 360,
        height: 340,
        defaultScale: 0.01,
        suggestedDrawingType: 'Floor Plan',
      },
      {
        id: 'section-a',
        name: 'Section A-A',
        x: 395,
        y: 20,
        width: 145,
        height: 165,
        defaultScale: 0.02,
        suggestedDrawingType: 'Section',
      },
      {
        id: 'section-b',
        name: 'Section B-B',
        x: 395,
        y: 195,
        width: 145,
        height: 165,
        defaultScale: 0.02,
        suggestedDrawingType: 'Section',
      },
    ],
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
  },

  // ============================================================================
  // A1 Templates
  // ============================================================================
  {
    id: 'builtin-a1-single',
    name: 'A1 Single View',
    description: 'Single large viewport on A1 landscape',
    paperSize: 'A1',
    orientation: 'landscape',
    titleBlockTemplateId: 'builtin-large-standard',
    viewportPlaceholders: [
      {
        id: 'main',
        name: 'Main View',
        x: 25,
        y: 25,
        width: 760,
        height: 510,
        defaultScale: 0.01,
        suggestedDrawingType: 'Floor Plan',
      },
    ],
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'builtin-a1-multi-view',
    name: 'A1 Multi-View Layout',
    description: 'Main plan with sections and details on A1',
    paperSize: 'A1',
    orientation: 'landscape',
    titleBlockTemplateId: 'builtin-large-standard',
    viewportPlaceholders: [
      {
        id: 'plan',
        name: 'Floor Plan',
        x: 25,
        y: 25,
        width: 500,
        height: 400,
        defaultScale: 0.01,
        suggestedDrawingType: 'Floor Plan',
      },
      {
        id: 'section-1',
        name: 'Section 1',
        x: 540,
        y: 25,
        width: 245,
        height: 190,
        defaultScale: 0.02,
        suggestedDrawingType: 'Section',
      },
      {
        id: 'section-2',
        name: 'Section 2',
        x: 540,
        y: 225,
        width: 245,
        height: 190,
        defaultScale: 0.02,
        suggestedDrawingType: 'Section',
      },
      {
        id: 'detail-1',
        name: 'Detail 1',
        x: 25,
        y: 440,
        width: 150,
        height: 95,
        defaultScale: 0.05,
        suggestedDrawingType: 'Detail',
      },
      {
        id: 'detail-2',
        name: 'Detail 2',
        x: 185,
        y: 440,
        width: 150,
        height: 95,
        defaultScale: 0.05,
        suggestedDrawingType: 'Detail',
      },
      {
        id: 'detail-3',
        name: 'Detail 3',
        x: 345,
        y: 440,
        width: 150,
        height: 95,
        defaultScale: 0.05,
        suggestedDrawingType: 'Detail',
      },
    ],
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
  },

  // ============================================================================
  // Empty/Blank Templates
  // ============================================================================
  {
    id: 'builtin-blank-a4',
    name: 'Blank A4',
    description: 'Empty A4 sheet with title block only',
    paperSize: 'A4',
    orientation: 'landscape',
    titleBlockTemplateId: 'builtin-a4-standard',
    viewportPlaceholders: [],
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'builtin-blank-a3',
    name: 'Blank A3',
    description: 'Empty A3 sheet with title block only',
    paperSize: 'A3',
    orientation: 'landscape',
    titleBlockTemplateId: 'builtin-a3-standard',
    viewportPlaceholders: [],
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
  },
];

// ============================================================================
// Template Helper Functions
// ============================================================================

/**
 * Get a sheet template by ID
 */
export function getSheetTemplateById(id: string): SheetTemplate | undefined {
  return BUILT_IN_SHEET_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates compatible with a paper size
 */
export function getSheetTemplatesForPaperSize(paperSize: string): SheetTemplate[] {
  return BUILT_IN_SHEET_TEMPLATES.filter(t => t.paperSize === paperSize);
}

/**
 * Get all templates grouped by paper size
 */
export function getTemplatesGroupedByPaperSize(): Record<string, SheetTemplate[]> {
  const groups: Record<string, SheetTemplate[]> = {};

  for (const template of BUILT_IN_SHEET_TEMPLATES) {
    if (!groups[template.paperSize]) {
      groups[template.paperSize] = [];
    }
    groups[template.paperSize].push(template);
  }

  return groups;
}

/**
 * Create viewports from template placeholders
 */
export function createViewportsFromTemplate(
  template: SheetTemplate,
  drawingAssignments: Record<string, string> // placeholderId -> drawingId
): SheetViewport[] {
  const viewports: SheetViewport[] = [];

  for (const placeholder of template.viewportPlaceholders) {
    const drawingId = drawingAssignments[placeholder.id];
    if (!drawingId) continue; // Skip placeholders without assigned drafts

    viewports.push({
      id: generateViewportId(),
      drawingId,
      x: placeholder.x,
      y: placeholder.y,
      width: placeholder.width,
      height: placeholder.height,
      scale: placeholder.defaultScale,
      centerX: 0,
      centerY: 0,
      locked: false,
      visible: true,
    });
  }

  return viewports;
}

// ============================================================================
// Sheet Numbering
// ============================================================================

/**
 * Sheet numbering scheme configuration
 */
export interface SheetNumberingScheme {
  prefix: string;      // e.g., "A" for architectural
  separator: string;   // e.g., "-" or "."
  startNumber: number;
  digits: number;      // Pad with zeros (3 = "001")
}

/**
 * Discipline prefixes for sheet numbering
 */
export const DISCIPLINE_PREFIXES: Record<string, { prefix: string; name: string }> = {
  general: { prefix: 'G', name: 'General' },
  architectural: { prefix: 'A', name: 'Architectural' },
  structural: { prefix: 'S', name: 'Structural' },
  mechanical: { prefix: 'M', name: 'Mechanical' },
  electrical: { prefix: 'E', name: 'Electrical' },
  plumbing: { prefix: 'P', name: 'Plumbing' },
  fire: { prefix: 'FP', name: 'Fire Protection' },
  civil: { prefix: 'C', name: 'Civil' },
  landscape: { prefix: 'L', name: 'Landscape' },
};

/**
 * Default numbering scheme
 */
export const DEFAULT_NUMBERING_SCHEME: SheetNumberingScheme = {
  prefix: 'A',
  separator: '-',
  startNumber: 101,
  digits: 3,
};

/**
 * Generate a sheet number based on scheme
 */
export function generateSheetNumber(
  scheme: SheetNumberingScheme,
  sequence: number
): string {
  const number = scheme.startNumber + sequence;
  const paddedNumber = number.toString().padStart(scheme.digits, '0');
  return `${scheme.prefix}${scheme.separator}${paddedNumber}`;
}

/**
 * Parse a sheet number to extract components
 */
export function parseSheetNumber(sheetNumber: string): {
  prefix: string;
  separator: string;
  number: number;
} | null {
  // Try common patterns: A-101, A.101, A101
  const match = sheetNumber.match(/^([A-Z]+)([-.]?)(\d+)$/i);
  if (!match) return null;

  return {
    prefix: match[1].toUpperCase(),
    separator: match[2] || '-',
    number: parseInt(match[3], 10),
  };
}

/**
 * Renumber sheets based on a scheme
 */
export function renumberSheets(
  sheets: Sheet[],
  scheme: SheetNumberingScheme
): { sheetId: string; newNumber: string }[] {
  return sheets.map((sheet, index) => ({
    sheetId: sheet.id,
    newNumber: generateSheetNumber(scheme, index),
  }));
}

/**
 * Get next available sheet number
 */
export function getNextSheetNumber(
  existingSheets: Sheet[],
  scheme: SheetNumberingScheme
): string {
  // Find the highest number with matching prefix
  let maxNumber = scheme.startNumber - 1;

  for (const sheet of existingSheets) {
    // Check if sheet has a number field in title block
    const numberField = sheet.titleBlock.fields.find(f => f.id === 'number' || f.id === 'sheetNo');
    if (!numberField?.value) continue;

    const parsed = parseSheetNumber(numberField.value);
    if (parsed && parsed.prefix === scheme.prefix) {
      maxNumber = Math.max(maxNumber, parsed.number);
    }
  }

  return generateSheetNumber(scheme, maxNumber - scheme.startNumber + 1);
}

/**
 * Save sheet as template
 */
export function createTemplateFromSheet(
  sheet: Sheet,
  name: string,
  description: string
): SheetTemplate {
  // Convert viewports to placeholders
  const placeholders: ViewportPlaceholder[] = sheet.viewports.map((vp, index) => ({
    id: `placeholder-${index + 1}`,
    name: `View ${index + 1}`,
    x: vp.x,
    y: vp.y,
    width: vp.width,
    height: vp.height,
    defaultScale: vp.scale,
  }));

  return {
    id: generateSheetTemplateId(),
    name,
    description,
    paperSize: sheet.paperSize,
    orientation: sheet.orientation,
    titleBlockTemplateId: '', // Would need to extract from sheet
    viewportPlaceholders: placeholders,
    isBuiltIn: false,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  };
}
