/**
 * SelectionLayer - Renders selection box
 */

import type { SelectionBox } from '../types';
import { BaseRenderer } from '../core/BaseRenderer';
import { COLORS } from '../types';

export class SelectionLayer extends BaseRenderer {
  /**
   * Draw selection box in screen coordinates
   */
  drawSelectionBox(box: SelectionBox): void {
    const ctx = this.ctx;

    ctx.save();
    this.resetTransform();

    const x = Math.min(box.start.x, box.end.x);
    const y = Math.min(box.start.y, box.end.y);
    const width = Math.abs(box.end.x - box.start.x);
    const height = Math.abs(box.end.y - box.start.y);

    // Set colors based on selection mode
    if (box.mode === 'window') {
      // Window selection: blue, solid border
      ctx.fillStyle = COLORS.windowSelection;
      ctx.strokeStyle = COLORS.windowSelectionBorder;
      ctx.setLineDash([]);
    } else {
      // Crossing selection: green, dashed border
      ctx.fillStyle = COLORS.crossingSelection;
      ctx.strokeStyle = COLORS.crossingSelectionBorder;
      ctx.setLineDash([6, 3]);
    }

    ctx.lineWidth = 1;

    // Draw filled rectangle
    ctx.fillRect(x, y, width, height);

    // Draw border
    ctx.strokeRect(x, y, width, height);

    ctx.setLineDash([]);
    ctx.restore();
  }
}
