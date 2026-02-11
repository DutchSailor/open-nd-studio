/**
 * CAD Defaults - Single source of truth for text and dimension styling constants
 *
 * All sizes are in paper mm (e.g., 2.5 = 2.5mm on paper at any scale).
 * The rendering pipeline divides by drawingScale to convert to drawing units.
 */

import type { DimensionStyle } from '../types/dimension';

/** ISO 3098 compliant open-source font */
export const CAD_DEFAULT_FONT = 'Osifont';

/** ISO 3098 recommended line height ratio */
export const CAD_DEFAULT_LINE_HEIGHT = 1.4;

/** Standard annotation text height in paper mm */
export const CAD_DEFAULT_TEXT_HEIGHT_MM = 2.5;

/** Default dimension style - values in paper mm */
export const DEFAULT_DIMENSION_STYLE: DimensionStyle = {
  arrowType: 'tick',
  arrowSize: 2.5,
  extensionLineGap: 1.5,
  extensionLineOvershoot: 2.5,
  textHeight: 2.5,
  textPlacement: 'centered',
  lineColor: '#00ffff',
  textColor: '#00ffff',
  precision: 0,
};
