/**
 * Title Block Service - Business logic for title block operations
 *
 * Provides:
 * - Built-in title block templates for various paper sizes
 * - Template creation and management
 * - Auto-field value calculation
 * - Revision management
 */

import type {
  TitleBlockTemplate,
  TitleBlockLayout,
  EnhancedTitleBlock,
  RevisionTable,
  Revision,
} from '../types/sheet';

/**
 * Generate a unique ID for title block templates
 */
export function generateTemplateId(): string {
  return `tb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Standard title block templates for different paper sizes
 */
export const BUILT_IN_TEMPLATES: TitleBlockTemplate[] = [
  // A4 Template (compact)
  {
    id: 'builtin-a4-standard',
    name: 'A4 Standard',
    description: 'Compact title block for A4 sheets',
    paperSizes: ['A4'],
    layout: createA4Layout(),
    defaultFields: createA4DefaultFields(),
    isBuiltIn: true,
  },
  // A3 Template (standard)
  {
    id: 'builtin-a3-standard',
    name: 'A3 Standard',
    description: 'Standard title block for A3 sheets',
    paperSizes: ['A3', 'Tabloid'],
    layout: createA3Layout(),
    defaultFields: createA3DefaultFields(),
    isBuiltIn: true,
  },
  // A2 Template (detailed)
  {
    id: 'builtin-a2-standard',
    name: 'A2 Standard',
    description: 'Detailed title block for A2 sheets',
    paperSizes: ['A2'],
    layout: createA2Layout(),
    defaultFields: createA2DefaultFields(),
    isBuiltIn: true,
  },
  // A1/A0 Template (full)
  {
    id: 'builtin-large-standard',
    name: 'A1/A0 Standard',
    description: 'Full title block for large format sheets',
    paperSizes: ['A1', 'A0'],
    layout: createLargeLayout(),
    defaultFields: createLargeDefaultFields(),
    isBuiltIn: true,
  },
  // Simple Template (minimal)
  {
    id: 'builtin-simple',
    name: 'Simple',
    description: 'Minimal title block for all paper sizes',
    paperSizes: ['A4', 'A3', 'A2', 'A1', 'A0', 'Letter', 'Legal', 'Tabloid', 'Custom'],
    layout: createSimpleLayout(),
    defaultFields: createSimpleDefaultFields(),
    isBuiltIn: true,
  },
];

// ============================================================================
// A4 Layout (Compact: 170x45mm)
// ============================================================================

function createA4Layout(): TitleBlockLayout {
  return {
    rows: [
      // Row 1: Project | Client
      {
        height: 12,
        cells: [
          { widthPercent: 55, fieldId: 'project', alignment: 'left', fontSize: 9, isBold: false },
          { widthPercent: 45, fieldId: 'client', alignment: 'left', fontSize: 9, isBold: false },
        ],
      },
      // Row 2: Drawing Title | Number
      {
        height: 15,
        cells: [
          { widthPercent: 70, fieldId: 'title', alignment: 'left', fontSize: 11, isBold: true },
          { widthPercent: 30, fieldId: 'number', alignment: 'left', fontSize: 10, isBold: false },
        ],
      },
      // Row 3: Scale | Date | Drawn | Checked
      {
        height: 10,
        cells: [
          { widthPercent: 25, fieldId: 'scale', alignment: 'left', fontSize: 8, isBold: false },
          { widthPercent: 25, fieldId: 'date', alignment: 'left', fontSize: 8, isBold: false },
          { widthPercent: 25, fieldId: 'drawnBy', alignment: 'left', fontSize: 8, isBold: false },
          { widthPercent: 25, fieldId: 'checkedBy', alignment: 'left', fontSize: 8, isBold: false },
        ],
      },
      // Row 4: Sheet | Revision
      {
        height: 8,
        cells: [
          { widthPercent: 50, fieldId: 'sheetNo', alignment: 'left', fontSize: 9, isBold: false },
          { widthPercent: 50, fieldId: 'revision', alignment: 'left', fontSize: 9, isBold: false },
        ],
      },
    ],
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    gridColor: '#000000',
  };
}

function createA4DefaultFields(): { id: string; label: string; value: string }[] {
  return [
    { id: 'project', label: 'Project', value: '' },
    { id: 'client', label: 'Client', value: '' },
    { id: 'title', label: 'Drawing Title', value: '' },
    { id: 'number', label: 'Drawing No.', value: '' },
    { id: 'scale', label: 'Scale', value: 'As Noted' },
    { id: 'date', label: 'Date', value: '' },
    { id: 'drawnBy', label: 'Drawn', value: '' },
    { id: 'checkedBy', label: 'Checked', value: '' },
    { id: 'sheetNo', label: 'Sheet', value: '1 of 1' },
    { id: 'revision', label: 'Rev', value: '-' },
  ];
}

// ============================================================================
// A3 Layout (Standard: 180x60mm)
// ============================================================================

function createA3Layout(): TitleBlockLayout {
  return {
    rows: [
      // Row 1: Project | Client
      {
        height: 15,
        cells: [
          { widthPercent: 55, fieldId: 'project', alignment: 'left', fontSize: 10, isBold: false },
          { widthPercent: 45, fieldId: 'client', alignment: 'left', fontSize: 10, isBold: false },
        ],
      },
      // Row 2: Drawing Title | Number
      {
        height: 18,
        cells: [
          { widthPercent: 70, fieldId: 'title', alignment: 'left', fontSize: 12, isBold: true },
          { widthPercent: 30, fieldId: 'number', alignment: 'left', fontSize: 10, isBold: false },
        ],
      },
      // Row 3: Scale | Date | Drawn | Checked | Approved
      {
        height: 12,
        cells: [
          { widthPercent: 20, fieldId: 'scale', alignment: 'left', fontSize: 8, isBold: false },
          { widthPercent: 20, fieldId: 'date', alignment: 'left', fontSize: 8, isBold: false },
          { widthPercent: 20, fieldId: 'drawnBy', alignment: 'left', fontSize: 8, isBold: false },
          { widthPercent: 20, fieldId: 'checkedBy', alignment: 'left', fontSize: 8, isBold: false },
          { widthPercent: 20, fieldId: 'approvedBy', alignment: 'left', fontSize: 8, isBold: false },
        ],
      },
      // Row 4: Sheet | Revision | Status
      {
        height: 15,
        cells: [
          { widthPercent: 40, fieldId: 'sheetNo', alignment: 'left', fontSize: 10, isBold: false },
          { widthPercent: 30, fieldId: 'revision', alignment: 'left', fontSize: 10, isBold: false },
          { widthPercent: 30, fieldId: 'status', alignment: 'left', fontSize: 10, isBold: false },
        ],
      },
    ],
    borderWidth: 2,
    backgroundColor: '#ffffff',
    gridColor: '#000000',
  };
}

function createA3DefaultFields(): { id: string; label: string; value: string }[] {
  return [
    { id: 'project', label: 'Project', value: '' },
    { id: 'client', label: 'Client', value: '' },
    { id: 'title', label: 'Drawing Title', value: '' },
    { id: 'number', label: 'Drawing No.', value: '' },
    { id: 'scale', label: 'Scale', value: 'As Noted' },
    { id: 'date', label: 'Date', value: '' },
    { id: 'drawnBy', label: 'Drawn', value: '' },
    { id: 'checkedBy', label: 'Checked', value: '' },
    { id: 'approvedBy', label: 'Approved', value: '' },
    { id: 'sheetNo', label: 'Sheet', value: '1 of 1' },
    { id: 'revision', label: 'Revision', value: '-' },
    { id: 'status', label: 'Status', value: 'Draft' },
  ];
}

// ============================================================================
// A2 Layout (Detailed: 200x70mm)
// ============================================================================

function createA2Layout(): TitleBlockLayout {
  return {
    rows: [
      // Row 1: Company Logo Area | Project
      {
        height: 20,
        cells: [
          { widthPercent: 30, fieldId: 'logo', alignment: 'center', fontSize: 10, isBold: false },
          { widthPercent: 70, fieldId: 'project', alignment: 'left', fontSize: 12, isBold: true },
        ],
      },
      // Row 2: Address | Client
      {
        height: 12,
        cells: [
          { widthPercent: 30, fieldId: 'address', alignment: 'left', fontSize: 8, isBold: false },
          { widthPercent: 70, fieldId: 'client', alignment: 'left', fontSize: 10, isBold: false },
        ],
      },
      // Row 3: Drawing Title | Number
      {
        height: 18,
        cells: [
          { widthPercent: 70, fieldId: 'title', alignment: 'left', fontSize: 14, isBold: true },
          { widthPercent: 30, fieldId: 'number', alignment: 'left', fontSize: 11, isBold: false },
        ],
      },
      // Row 4: Scale | Date | Drawn | Checked | Approved
      {
        height: 12,
        cells: [
          { widthPercent: 20, fieldId: 'scale', alignment: 'left', fontSize: 9, isBold: false },
          { widthPercent: 20, fieldId: 'date', alignment: 'left', fontSize: 9, isBold: false },
          { widthPercent: 20, fieldId: 'drawnBy', alignment: 'left', fontSize: 9, isBold: false },
          { widthPercent: 20, fieldId: 'checkedBy', alignment: 'left', fontSize: 9, isBold: false },
          { widthPercent: 20, fieldId: 'approvedBy', alignment: 'left', fontSize: 9, isBold: false },
        ],
      },
      // Row 5: Sheet | Revision | Status
      {
        height: 8,
        cells: [
          { widthPercent: 40, fieldId: 'sheetNo', alignment: 'left', fontSize: 10, isBold: false },
          { widthPercent: 30, fieldId: 'revision', alignment: 'left', fontSize: 10, isBold: false },
          { widthPercent: 30, fieldId: 'status', alignment: 'left', fontSize: 10, isBold: false },
        ],
      },
    ],
    borderWidth: 2,
    backgroundColor: '#ffffff',
    gridColor: '#000000',
  };
}

function createA2DefaultFields(): { id: string; label: string; value: string }[] {
  return [
    { id: 'logo', label: 'Logo', value: '' },
    { id: 'project', label: 'Project', value: '' },
    { id: 'address', label: 'Address', value: '' },
    { id: 'client', label: 'Client', value: '' },
    { id: 'title', label: 'Drawing Title', value: '' },
    { id: 'number', label: 'Drawing No.', value: '' },
    { id: 'scale', label: 'Scale', value: 'As Noted' },
    { id: 'date', label: 'Date', value: '' },
    { id: 'drawnBy', label: 'Drawn', value: '' },
    { id: 'checkedBy', label: 'Checked', value: '' },
    { id: 'approvedBy', label: 'Approved', value: '' },
    { id: 'sheetNo', label: 'Sheet', value: '1 of 1' },
    { id: 'revision', label: 'Revision', value: '-' },
    { id: 'status', label: 'Status', value: 'Draft' },
  ];
}

// ============================================================================
// Large Format Layout (A1/A0: 220x80mm)
// ============================================================================

function createLargeLayout(): TitleBlockLayout {
  return {
    rows: [
      // Row 1: Company Logo Area | Project Name
      {
        height: 22,
        cells: [
          { widthPercent: 25, fieldId: 'logo', alignment: 'center', fontSize: 10, isBold: false },
          { widthPercent: 75, fieldId: 'project', alignment: 'left', fontSize: 14, isBold: true },
        ],
      },
      // Row 2: Company Address | Client
      {
        height: 14,
        cells: [
          { widthPercent: 25, fieldId: 'address', alignment: 'left', fontSize: 8, isBold: false },
          { widthPercent: 75, fieldId: 'client', alignment: 'left', fontSize: 11, isBold: false },
        ],
      },
      // Row 3: Drawing Title | Drawing Number
      {
        height: 20,
        cells: [
          { widthPercent: 70, fieldId: 'title', alignment: 'left', fontSize: 16, isBold: true },
          { widthPercent: 30, fieldId: 'number', alignment: 'left', fontSize: 12, isBold: false },
        ],
      },
      // Row 4: Scale | Date | Drawn | Checked | Approved
      {
        height: 14,
        cells: [
          { widthPercent: 20, fieldId: 'scale', alignment: 'left', fontSize: 10, isBold: false },
          { widthPercent: 20, fieldId: 'date', alignment: 'left', fontSize: 10, isBold: false },
          { widthPercent: 20, fieldId: 'drawnBy', alignment: 'left', fontSize: 10, isBold: false },
          { widthPercent: 20, fieldId: 'checkedBy', alignment: 'left', fontSize: 10, isBold: false },
          { widthPercent: 20, fieldId: 'approvedBy', alignment: 'left', fontSize: 10, isBold: false },
        ],
      },
      // Row 5: Sheet | Revision | Status
      {
        height: 10,
        cells: [
          { widthPercent: 35, fieldId: 'sheetNo', alignment: 'left', fontSize: 11, isBold: false },
          { widthPercent: 30, fieldId: 'revision', alignment: 'left', fontSize: 11, isBold: false },
          { widthPercent: 35, fieldId: 'status', alignment: 'left', fontSize: 11, isBold: false },
        ],
      },
    ],
    borderWidth: 2.5,
    backgroundColor: '#ffffff',
    gridColor: '#000000',
  };
}

function createLargeDefaultFields(): { id: string; label: string; value: string }[] {
  return [
    { id: 'logo', label: 'Logo', value: '' },
    { id: 'project', label: 'Project', value: '' },
    { id: 'address', label: 'Company Address', value: '' },
    { id: 'client', label: 'Client', value: '' },
    { id: 'title', label: 'Drawing Title', value: '' },
    { id: 'number', label: 'Drawing No.', value: '' },
    { id: 'scale', label: 'Scale', value: 'As Noted' },
    { id: 'date', label: 'Date', value: '' },
    { id: 'drawnBy', label: 'Drawn By', value: '' },
    { id: 'checkedBy', label: 'Checked By', value: '' },
    { id: 'approvedBy', label: 'Approved By', value: '' },
    { id: 'sheetNo', label: 'Sheet', value: '1 of 1' },
    { id: 'revision', label: 'Revision', value: '-' },
    { id: 'status', label: 'Status', value: 'Draft' },
  ];
}

// ============================================================================
// Simple Layout (Minimal: 150x35mm)
// ============================================================================

function createSimpleLayout(): TitleBlockLayout {
  return {
    rows: [
      // Row 1: Title | Number
      {
        height: 15,
        cells: [
          { widthPercent: 70, fieldId: 'title', alignment: 'left', fontSize: 11, isBold: true },
          { widthPercent: 30, fieldId: 'number', alignment: 'left', fontSize: 10, isBold: false },
        ],
      },
      // Row 2: Scale | Date | Sheet
      {
        height: 10,
        cells: [
          { widthPercent: 33, fieldId: 'scale', alignment: 'left', fontSize: 8, isBold: false },
          { widthPercent: 34, fieldId: 'date', alignment: 'left', fontSize: 8, isBold: false },
          { widthPercent: 33, fieldId: 'sheetNo', alignment: 'left', fontSize: 8, isBold: false },
        ],
      },
      // Row 3: Drawn | Revision
      {
        height: 10,
        cells: [
          { widthPercent: 50, fieldId: 'drawnBy', alignment: 'left', fontSize: 8, isBold: false },
          { widthPercent: 50, fieldId: 'revision', alignment: 'left', fontSize: 8, isBold: false },
        ],
      },
    ],
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    gridColor: '#000000',
  };
}

function createSimpleDefaultFields(): { id: string; label: string; value: string }[] {
  return [
    { id: 'title', label: 'Title', value: '' },
    { id: 'number', label: 'No.', value: '' },
    { id: 'scale', label: 'Scale', value: '1:100' },
    { id: 'date', label: 'Date', value: '' },
    { id: 'sheetNo', label: 'Sheet', value: '1' },
    { id: 'drawnBy', label: 'Drawn', value: '' },
    { id: 'revision', label: 'Rev', value: '-' },
  ];
}

// ============================================================================
// Template Helper Functions
// ============================================================================

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): TitleBlockTemplate | undefined {
  return BUILT_IN_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates compatible with a paper size
 */
export function getTemplatesForPaperSize(paperSize: string): TitleBlockTemplate[] {
  return BUILT_IN_TEMPLATES.filter(t =>
    t.paperSizes.includes(paperSize) || t.paperSizes.includes('Custom')
  );
}

/**
 * Calculate title block dimensions from layout
 */
export function calculateTitleBlockDimensions(layout: TitleBlockLayout): { width: number; height: number } {
  const height = layout.rows.reduce((sum, row) => sum + row.height, 0);

  // Width is typically fixed per template, but we can calculate a default
  // based on common title block proportions
  const width = height * 3; // 3:1 aspect ratio is common

  return { width, height };
}

/**
 * Create an enhanced title block from a template
 */
export function createTitleBlockFromTemplate(
  template: TitleBlockTemplate,
  x: number = 10,
  y: number = 10
): EnhancedTitleBlock {
  const dims = calculateTitleBlockDimensions(template.layout);

  // Convert template fields to title block fields with positions
  const fields = createFieldsFromTemplate(template, dims.width, dims.height);

  return {
    visible: true,
    templateId: template.id,
    x,
    y,
    width: dims.width,
    height: dims.height,
    fields,
    revisionTable: createDefaultRevisionTable(),
  };
}

/**
 * Create fields with positions from a template
 */
function createFieldsFromTemplate(
  template: TitleBlockTemplate,
  width: number,
  _height: number
): EnhancedTitleBlock['fields'] {
  const fields: EnhancedTitleBlock['fields'] = [];
  let currentY = 0;

  for (const row of template.layout.rows) {
    let currentX = 0;

    for (const cell of row.cells) {
      const cellWidth = (width * cell.widthPercent) / 100;
      const defaultField = template.defaultFields.find(f => f.id === cell.fieldId);

      if (defaultField) {
        fields.push({
          id: cell.fieldId,
          label: defaultField.label,
          value: defaultField.value,
          x: currentX + 2, // Small padding
          y: currentY + 2,
          width: cellWidth - 4,
          height: row.height - 4,
          fontSize: cell.fontSize,
          fontFamily: 'Arial',
          align: cell.alignment,
        });
      }

      currentX += cellWidth;
    }

    currentY += row.height;
  }

  return fields;
}

/**
 * Create a default revision table
 */
export function createDefaultRevisionTable(): RevisionTable {
  return {
    visible: false,
    maxRows: 5,
    columns: [
      { id: 'number', label: 'Rev', width: 15 },
      { id: 'date', label: 'Date', width: 25 },
      { id: 'description', label: 'Description', width: 50 },
      { id: 'drawnBy', label: 'By', width: 15 },
    ],
    revisions: [],
  };
}

/**
 * Add a revision to the table
 */
export function addRevision(
  table: RevisionTable,
  description: string,
  drawnBy: string
): RevisionTable {
  const nextNumber = getNextRevisionNumber(table.revisions);

  const newRevision: Revision = {
    number: nextNumber,
    date: new Date().toISOString().split('T')[0],
    description,
    drawnBy,
  };

  return {
    ...table,
    revisions: [...table.revisions, newRevision],
  };
}

/**
 * Get the next revision number
 */
function getNextRevisionNumber(revisions: Revision[]): string {
  if (revisions.length === 0) return 'A';

  const lastRev = revisions[revisions.length - 1].number;

  // Handle letter revisions (A, B, C, ...)
  if (/^[A-Z]$/.test(lastRev)) {
    const charCode = lastRev.charCodeAt(0);
    if (charCode < 90) { // Less than 'Z'
      return String.fromCharCode(charCode + 1);
    }
    return 'AA'; // After Z comes AA
  }

  // Handle numeric revisions (1, 2, 3, ...)
  if (/^\d+$/.test(lastRev)) {
    return (parseInt(lastRev, 10) + 1).toString();
  }

  // Handle compound revisions (AA, AB, etc.)
  return lastRev + 'A';
}

// ============================================================================
// Auto-Field Calculations
// ============================================================================

export interface AutoFieldContext {
  totalSheets: number;
  currentSheetIndex: number;
  projectName: string;
  viewportScales: number[];
}

/**
 * Calculate auto-field values
 */
export function calculateAutoFields(
  fields: EnhancedTitleBlock['fields'],
  context: AutoFieldContext
): EnhancedTitleBlock['fields'] {
  return fields.map(field => {
    switch (field.id) {
      case 'date':
        // Auto-fill current date if empty
        if (!field.value) {
          return { ...field, value: new Date().toISOString().split('T')[0] };
        }
        return field;

      case 'sheetNo':
        // Auto-fill sheet number
        return {
          ...field,
          value: `${context.currentSheetIndex + 1} of ${context.totalSheets}`,
        };

      case 'scale':
        // Auto-calculate scale from viewports
        if (context.viewportScales.length === 0) {
          return { ...field, value: '-' };
        }
        if (context.viewportScales.length === 1) {
          return { ...field, value: formatScaleForDisplay(context.viewportScales[0]) };
        }
        // Multiple scales
        const uniqueScales = [...new Set(context.viewportScales)];
        if (uniqueScales.length === 1) {
          return { ...field, value: formatScaleForDisplay(uniqueScales[0]) };
        }
        return { ...field, value: 'As Noted' };

      case 'project':
        // Auto-fill project name if provided and field is empty
        if (!field.value && context.projectName) {
          return { ...field, value: context.projectName };
        }
        return field;

      default:
        return field;
    }
  });
}

/**
 * Format a scale value for display
 */
function formatScaleForDisplay(scale: number): string {
  if (scale >= 1) {
    if (Number.isInteger(scale)) {
      return `${scale}:1`;
    }
    return `${scale.toFixed(1)}:1`;
  }
  const inverse = 1 / scale;
  if (Number.isInteger(inverse)) {
    return `1:${inverse}`;
  }
  return `1:${Math.round(inverse)}`;
}

/**
 * Update a field value in the title block
 */
export function updateFieldValue(
  titleBlock: EnhancedTitleBlock,
  fieldId: string,
  value: string
): EnhancedTitleBlock {
  return {
    ...titleBlock,
    fields: titleBlock.fields.map(field =>
      field.id === fieldId ? { ...field, value } : field
    ),
  };
}

/**
 * Update multiple field values
 */
export function updateFieldValues(
  titleBlock: EnhancedTitleBlock,
  updates: Record<string, string>
): EnhancedTitleBlock {
  return {
    ...titleBlock,
    fields: titleBlock.fields.map(field =>
      updates[field.id] !== undefined ? { ...field, value: updates[field.id] } : field
    ),
  };
}

// ============================================================================
// Logo Operations
// ============================================================================

/**
 * Set logo on title block
 */
export function setLogo(
  titleBlock: EnhancedTitleBlock,
  logoData: string,
  width: number,
  height: number
): EnhancedTitleBlock {
  // Find logo field position or use default position
  const logoField = titleBlock.fields.find(f => f.id === 'logo');

  return {
    ...titleBlock,
    logo: {
      data: logoData,
      x: logoField?.x ?? 5,
      y: logoField?.y ?? 5,
      width,
      height,
    },
  };
}

/**
 * Remove logo from title block
 */
export function removeLogo(titleBlock: EnhancedTitleBlock): EnhancedTitleBlock {
  const { logo: _, ...rest } = titleBlock;
  return rest as EnhancedTitleBlock;
}
