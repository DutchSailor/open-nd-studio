import { jsPDF } from 'jspdf';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import type { Shape, Sheet } from '../../types/geometry';
import type { PrintSettings } from '../../state/slices/uiSlice';
import { renderShapesToCanvas } from './printRenderer';

const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  'A4': { width: 210, height: 297 },
  'A3': { width: 297, height: 420 },
  'A2': { width: 420, height: 594 },
  'A1': { width: 594, height: 841 },
  'A0': { width: 841, height: 1189 },
  'Letter': { width: 216, height: 279 },
  'Legal': { width: 216, height: 356 },
  'Tabloid': { width: 279, height: 432 },
};

const QUALITY_DPI: Record<string, number> = {
  draft: 72,
  normal: 150,
  high: 300,
  presentation: 600,
};

function calculateExtents(shapes: Shape[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (shapes.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const shape of shapes) {
    if (!shape.visible) continue;
    switch (shape.type) {
      case 'line':
        minX = Math.min(minX, shape.start.x, shape.end.x);
        minY = Math.min(minY, shape.start.y, shape.end.y);
        maxX = Math.max(maxX, shape.start.x, shape.end.x);
        maxY = Math.max(maxY, shape.start.y, shape.end.y);
        break;
      case 'rectangle':
        minX = Math.min(minX, shape.topLeft.x, shape.topLeft.x + shape.width);
        minY = Math.min(minY, shape.topLeft.y, shape.topLeft.y + shape.height);
        maxX = Math.max(maxX, shape.topLeft.x, shape.topLeft.x + shape.width);
        maxY = Math.max(maxY, shape.topLeft.y, shape.topLeft.y + shape.height);
        break;
      case 'circle':
        minX = Math.min(minX, shape.center.x - shape.radius);
        minY = Math.min(minY, shape.center.y - shape.radius);
        maxX = Math.max(maxX, shape.center.x + shape.radius);
        maxY = Math.max(maxY, shape.center.y + shape.radius);
        break;
      case 'arc':
        minX = Math.min(minX, shape.center.x - shape.radius);
        minY = Math.min(minY, shape.center.y - shape.radius);
        maxX = Math.max(maxX, shape.center.x + shape.radius);
        maxY = Math.max(maxY, shape.center.y + shape.radius);
        break;
      case 'ellipse':
        minX = Math.min(minX, shape.center.x - shape.radiusX);
        minY = Math.min(minY, shape.center.y - shape.radiusY);
        maxX = Math.max(maxX, shape.center.x + shape.radiusX);
        maxY = Math.max(maxY, shape.center.y + shape.radiusY);
        break;
      case 'polyline':
      case 'spline':
        for (const p of shape.points) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        break;
      case 'text':
        minX = Math.min(minX, shape.position.x);
        minY = Math.min(minY, shape.position.y);
        maxX = Math.max(maxX, shape.position.x + 100);
        maxY = Math.max(maxY, shape.position.y + shape.fontSize);
        break;
      case 'hatch':
        for (const p of shape.points) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        break;
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

const PLOT_SCALES: Record<string, number> = {
  'Fit': 0,
  '1:1': 1, '1:2': 0.5, '1:5': 0.2, '1:10': 0.1, '1:20': 0.05,
  '1:50': 0.02, '1:100': 0.01, '2:1': 2, '5:1': 5, '10:1': 10,
};

function renderPage(
  shapes: Shape[],
  settings: PrintSettings,
  paperWidthMM: number,
  paperHeightMM: number,
): HTMLCanvasElement | null {
  const bounds = calculateExtents(shapes);
  if (!bounds) return null;

  const dpi = QUALITY_DPI[settings.rasterQuality] || 150;
  const mmToPx = dpi / 25.4;

  const margins = settings.margins;
  const printableWidthMM = paperWidthMM - margins.left - margins.right;
  const printableHeightMM = paperHeightMM - margins.top - margins.bottom;
  const printableWidthPx = printableWidthMM * mmToPx;
  const printableHeightPx = printableHeightMM * mmToPx;

  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;

  let plotScale: number;
  if (settings.scale === 'Fit') {
    const scaleX = printableWidthPx / contentWidth;
    const scaleY = printableHeightPx / contentHeight;
    plotScale = Math.min(scaleX, scaleY);
  } else if (settings.customScale) {
    plotScale = settings.customScale * mmToPx;
  } else {
    plotScale = (PLOT_SCALES[settings.scale] || 1) * mmToPx;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(paperWidthMM * mmToPx);
  canvas.height = Math.round(paperHeightMM * mmToPx);
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let offsetX: number, offsetY: number;
  const marginLeftPx = margins.left * mmToPx;
  const marginTopPx = margins.top * mmToPx;

  if (settings.centerPlot) {
    offsetX = marginLeftPx + (printableWidthPx - contentWidth * plotScale) / 2 - bounds.minX * plotScale;
    offsetY = marginTopPx + (printableHeightPx - contentHeight * plotScale) / 2 - bounds.minY * plotScale;
  } else {
    offsetX = marginLeftPx + settings.offsetX * mmToPx - bounds.minX * plotScale;
    offsetY = marginTopPx + settings.offsetY * mmToPx - bounds.minY * plotScale;
  }

  renderShapesToCanvas(ctx, shapes, {
    scale: plotScale,
    offsetX,
    offsetY,
    appearance: settings.appearance,
    plotLineweights: settings.plotLineweights,
  });

  return canvas;
}

export async function exportToPDF(options: {
  shapes: Shape[];
  sheets?: Sheet[];
  allShapes?: Shape[];
  settings: PrintSettings;
  projectName: string;
}): Promise<void> {
  const { shapes, sheets, allShapes, settings, projectName } = options;

  const paper = PAPER_SIZES[settings.paperSize];
  if (!paper) throw new Error(`Unknown paper size: ${settings.paperSize}`);

  const isLandscape = settings.orientation === 'landscape';
  const paperWidthMM = isLandscape ? paper.height : paper.width;
  const paperHeightMM = isLandscape ? paper.width : paper.height;

  const orientation = isLandscape ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [paperWidthMM, paperHeightMM],
  });

  if (settings.printRange === 'selectedSheets' && sheets && allShapes) {
    const selectedSheets = sheets.filter(s => settings.selectedSheetIds.includes(s.id));
    let firstPage = true;

    for (const sheet of selectedSheets) {
      if (!firstPage) {
        doc.addPage([paperWidthMM, paperHeightMM], orientation);
      }
      firstPage = false;

      const sheetShapes = allShapes.filter(s => {
        for (const vp of sheet.viewports) {
          if (s.drawingId === vp.drawingId) return true;
        }
        return false;
      });

      const canvas = renderPage(sheetShapes, settings, paperWidthMM, paperHeightMM);
      if (canvas) {
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 0, 0, paperWidthMM, paperHeightMM);
      }
    }
  } else {
    const canvas = renderPage(shapes, settings, paperWidthMM, paperHeightMM);
    if (canvas) {
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 0, 0, paperWidthMM, paperHeightMM);
    }
  }

  const pdfOutput = doc.output('arraybuffer');

  const filePath = await save({
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    title: 'Export PDF',
    defaultPath: `${projectName}.pdf`,
  });

  if (!filePath) return;

  await writeFile(filePath, new Uint8Array(pdfOutput));
}
