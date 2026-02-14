/**
 * SVG Pattern Service - Import SVG files as hatch patterns
 *
 * Supports:
 * 1. SVG files containing <pattern> elements in <defs>
 * 2. Standalone SVG files used as repeating tiles
 * 3. Converting SVG patterns to canvas-renderable format
 */

import type { CustomHatchPattern, SvgHatchPattern } from '../../types/hatch';

/** Result of parsing an SVG file for patterns */
export interface SvgParseResult {
  patterns: SvgHatchPattern[];
  errors: string[];
  warnings: string[];
}

/** Parsed pattern element data */
export interface ParsedSvgPattern {
  id: string;
  name: string;
  width: number;
  height: number;
  svgContent: string;
  viewBox?: string;
  tileRotation?: number;
}

/** Result of parsing SVG patterns (raw parsed data before ID generation) */
export interface SvgPatternsParseResult {
  parsed: ParsedSvgPattern[];
  errors: string[];
  warnings: string[];
}

/**
 * Collect all <pattern> elements from both <defs> and directly under <svg>
 */
function collectPatternElements(doc: Document): SVGPatternElement[] {
  const defsPatterns = doc.querySelectorAll('defs pattern');
  const rootPatterns = doc.querySelectorAll('svg > pattern');

  // Merge, deduplicate by id
  const seen = new Set<string>();
  const result: SVGPatternElement[] = [];

  const addPattern = (el: Element) => {
    const id = el.getAttribute('id') || '';
    if (!seen.has(id)) {
      seen.add(id);
      result.push(el as SVGPatternElement);
    }
  };

  defsPatterns.forEach(addPattern);
  rootPatterns.forEach(addPattern);

  return result;
}

/**
 * Parse an SVG file and return raw parsed pattern data (before ID generation)
 */
export function parseSVGPatterns(content: string): SvgPatternsParseResult {
  const parsed: ParsedSvgPattern[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'image/svg+xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      errors.push(`SVG parsing error: ${parseError.textContent?.slice(0, 100) || 'Invalid SVG'}`);
      return { parsed, errors, warnings };
    }

    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      errors.push('No SVG element found in file');
      return { parsed, errors, warnings };
    }

    const patternElements = collectPatternElements(doc);

    patternElements.forEach((patternEl, index) => {
      const p = parsePatternElement(patternEl, index);
      if (p) {
        parsed.push(p);
      } else {
        warnings.push(`Could not parse pattern element at index ${index}`);
      }
    });
  } catch (err) {
    errors.push(`Failed to parse SVG: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return { parsed, errors, warnings };
}

/**
 * Parse an SVG file and extract patterns
 */
export function parseSVGFile(content: string, filename?: string): SvgParseResult {
  const patterns: SvgHatchPattern[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'image/svg+xml');

    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      errors.push(`SVG parsing error: ${parseError.textContent?.slice(0, 100) || 'Invalid SVG'}`);
      return { patterns, errors, warnings };
    }

    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      errors.push('No SVG element found in file');
      return { patterns, errors, warnings };
    }

    // Look for pattern elements in <defs> and directly under <svg>
    const patternElements = collectPatternElements(doc);

    if (patternElements.length > 0) {
      patternElements.forEach((patternEl, index) => {
        const parsed = parsePatternElement(patternEl, index);
        if (parsed) {
          patterns.push(createSvgPattern(parsed));
        } else {
          warnings.push(`Could not parse pattern element at index ${index}`);
        }
      });
    } else {
      // No pattern elements - treat entire SVG as a tile
      const tilePattern = parseSvgAsTile(svgElement, filename);
      if (tilePattern) {
        patterns.push(tilePattern);
      } else {
        errors.push('Could not extract pattern from SVG');
      }
    }

  } catch (err) {
    errors.push(`Failed to parse SVG: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return { patterns, errors, warnings };
}

/**
 * Parse patternTransform attribute (e.g. "rotate(45 0 0) scale(0.75 0.75)")
 */
function parsePatternTransform(attr: string | null): { rotation: number; scaleX: number; scaleY: number } {
  const result = { rotation: 0, scaleX: 1, scaleY: 1 };
  if (!attr) return result;

  const rotateMatch = attr.match(/rotate\(\s*([-\d.]+)/);
  if (rotateMatch) {
    result.rotation = parseFloat(rotateMatch[1]);
  }

  const scaleMatch = attr.match(/scale\(\s*([-\d.]+)(?:\s+([-\d.]+))?\s*\)/);
  if (scaleMatch) {
    result.scaleX = parseFloat(scaleMatch[1]);
    result.scaleY = scaleMatch[2] ? parseFloat(scaleMatch[2]) : result.scaleX;
  }

  return result;
}

/**
 * Parse a <pattern> element
 */
function parsePatternElement(patternEl: SVGPatternElement, index: number): ParsedSvgPattern | null {
  const id = patternEl.getAttribute('id') || `pattern-${index}`;

  // Get dimensions
  let width = parseFloat(patternEl.getAttribute('width') || '0');
  let height = parseFloat(patternEl.getAttribute('height') || '0');

  // Handle percentage widths (relative to viewBox or parent)
  if (patternEl.getAttribute('width')?.endsWith('%')) {
    width = 10; // Default fallback
  }
  if (patternEl.getAttribute('height')?.endsWith('%')) {
    height = 10;
  }

  if (width <= 0 || height <= 0) {
    return null;
  }

  // Parse patternTransform for rotation and scale
  const transform = parsePatternTransform(patternEl.getAttribute('patternTransform'));
  width *= transform.scaleX;
  height *= transform.scaleY;

  // Get the inner content as SVG
  const innerContent = patternEl.innerHTML;
  if (!innerContent.trim()) {
    return null;
  }

  // Create a standalone SVG for the pattern content
  const viewBox = patternEl.getAttribute('viewBox') || `0 0 ${width} ${height}`;
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">${innerContent}</svg>`;

  return {
    id,
    name: id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    width,
    height,
    svgContent,
    viewBox,
    tileRotation: transform.rotation !== 0 ? transform.rotation : undefined,
  };
}

/**
 * Parse entire SVG as a repeating tile
 */
function parseSvgAsTile(svgElement: SVGSVGElement, filename?: string): SvgHatchPattern | null {
  // Get dimensions from viewBox or width/height attributes
  let width = 0;
  let height = 0;

  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(parseFloat);
    if (parts.length >= 4) {
      width = parts[2];
      height = parts[3];
    }
  }

  // Fall back to width/height attributes
  if (width <= 0) {
    const widthAttr = svgElement.getAttribute('width');
    width = widthAttr ? parseFloat(widthAttr) : 0;
  }
  if (height <= 0) {
    const heightAttr = svgElement.getAttribute('height');
    height = heightAttr ? parseFloat(heightAttr) : 0;
  }

  // Default dimensions if not specified
  if (width <= 0) width = 100;
  if (height <= 0) height = 100;

  // Serialize the SVG
  const serializer = new XMLSerializer();
  let svgContent = serializer.serializeToString(svgElement);

  // Ensure xmlns is present
  if (!svgContent.includes('xmlns=')) {
    svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Generate name from filename
  const name = filename
    ? filename.replace(/\.svg$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Imported SVG Pattern';

  return createSvgPattern({
    id: generatePatternId(name),
    name,
    width,
    height,
    svgContent,
  });
}

/**
 * Create an SvgHatchPattern from parsed data
 */
export function createSvgPattern(parsed: ParsedSvgPattern): SvgHatchPattern {
  return {
    id: generatePatternId(parsed.name),
    name: parsed.name,
    description: `SVG pattern tile (${parsed.width.toFixed(1)}x${parsed.height.toFixed(1)})`,
    scaleType: 'drafting',
    source: 'imported',
    sourceFormat: 'svg',
    lineFamilies: [], // SVG patterns don't use line families
    svgTile: parsed.svgContent,
    tileWidth: parsed.width,
    tileHeight: parsed.height,
    tileRotation: parsed.tileRotation,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  };
}

/**
 * Generate a unique pattern ID
 */
function generatePatternId(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
  const timestamp = Date.now().toString(36);
  return `svg-${base}-${timestamp}`;
}

/**
 * Convert SVG string to an Image element (for canvas rendering)
 */
export function svgToImage(svgContent: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };
    img.src = url;
  });
}

/**
 * Create a canvas pattern from SVG content
 * Returns a CanvasPattern that can be used with ctx.fillStyle
 */
export async function createCanvasPatternFromSVG(
  ctx: CanvasRenderingContext2D,
  svgContent: string,
  width: number,
  height: number,
  scale: number = 1
): Promise<CanvasPattern | null> {
  try {
    // Create off-screen canvas for the tile
    const tileCanvas = document.createElement('canvas');
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    tileCanvas.width = scaledWidth;
    tileCanvas.height = scaledHeight;

    const tileCtx = tileCanvas.getContext('2d');
    if (!tileCtx) return null;

    // Load and draw SVG
    const img = await svgToImage(svgContent);
    tileCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

    // Create repeating pattern
    const pattern = ctx.createPattern(tileCanvas, 'repeat');
    return pattern;
  } catch (err) {
    console.error('Failed to create canvas pattern from SVG:', err);
    return null;
  }
}

/**
 * Synchronously create a canvas pattern from a pre-loaded image
 */
export function createCanvasPatternFromImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  scale: number = 1
): CanvasPattern | null {
  try {
    const tileCanvas = document.createElement('canvas');
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    tileCanvas.width = scaledWidth;
    tileCanvas.height = scaledHeight;

    const tileCtx = tileCanvas.getContext('2d');
    if (!tileCtx) return null;

    tileCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

    return ctx.createPattern(tileCanvas, 'repeat');
  } catch {
    return null;
  }
}

/**
 * Open file picker for SVG files
 */
export function openSVGFilePicker(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg,image/svg+xml';
    input.onchange = () => {
      const file = input.files?.[0] || null;
      resolve(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * Read an SVG file as text
 */
export async function readSVGFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Export an SVG pattern to downloadable SVG file
 */
export function downloadSVGPattern(pattern: SvgHatchPattern, filename?: string): void {
  const blob = new Blob([pattern.svgTile], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${pattern.name.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate SVG content for a line-based pattern (for export)
 */
export function generateSVGFromLinePattern(pattern: CustomHatchPattern, tileSize: number = 100): string {
  const lines: string[] = [];

  for (const family of pattern.lineFamilies) {
    const angleRad = (family.angle * Math.PI) / 180;
    const spacing = family.deltaY || 10;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    // Calculate how many lines we need to cover the tile
    const diagonal = Math.sqrt(2) * tileSize;
    const numLines = Math.ceil(diagonal / spacing) + 2;

    for (let i = -numLines; i <= numLines; i++) {
      const offset = i * spacing;
      const cx = tileSize / 2;
      const cy = tileSize / 2;

      // Perpendicular offset
      const ox = cx + offset * (-sin);
      const oy = cy + offset * cos;

      // Line endpoints
      const x1 = ox - diagonal * cos;
      const y1 = oy - diagonal * sin;
      const x2 = ox + diagonal * cos;
      const y2 = oy + diagonal * sin;

      // Dash pattern
      let strokeDasharray = '';
      if (family.dashPattern && family.dashPattern.length > 0) {
        strokeDasharray = ` stroke-dasharray="${family.dashPattern.map(d => Math.abs(d)).join(' ')}"`;
      }

      lines.push(`  <line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="currentColor" stroke-width="${family.strokeWidth || 1}"${strokeDasharray}/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tileSize} ${tileSize}" width="${tileSize}" height="${tileSize}">
  <defs>
    <clipPath id="tile-clip">
      <rect x="0" y="0" width="${tileSize}" height="${tileSize}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#tile-clip)">
${lines.join('\n')}
  </g>
</svg>`;
}
