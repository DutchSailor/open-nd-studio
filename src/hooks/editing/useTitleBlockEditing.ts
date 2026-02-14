/**
 * useTitleBlockEditing - Handles inline editing of title block fields
 *
 * Provides click detection, hover highlighting, and coordinate transforms
 * for positioning the inline editor overlay.
 */

import { useCallback } from 'react';
import { useAppStore } from '../../state/appStore';
import { getTitleBlockFieldRects, type TitleBlockFieldRect } from '../../engine/renderer/sheet/titleBlockHitTest';
import { MM_TO_PIXELS } from '../../engine/renderer/types';
import { PAPER_SIZES } from '../../state/slices/types';

export function useTitleBlockEditing() {
  const {
    viewport,
    editorMode,
    sheets,
    activeSheetId,
    titleBlockEditingFieldId,
    startTitleBlockFieldEditing,
    endTitleBlockFieldEditing,
    setHoveredTitleBlockFieldId,
    updateTitleBlockField,
    customTitleBlockTemplates,
  } = useAppStore();

  /**
   * Get the active sheet
   */
  const getActiveSheet = useCallback(() => {
    if (editorMode !== 'sheet' || !activeSheetId) return null;
    return sheets.find(s => s.id === activeSheetId) || null;
  }, [editorMode, activeSheetId, sheets]);

  /**
   * Get paper dimensions in pixels for the active sheet
   */
  const getPaperDimensionsPx = useCallback(() => {
    const sheet = getActiveSheet();
    if (!sheet) return null;

    let widthMM: number, heightMM: number;
    if (sheet.paperSize === 'Custom') {
      widthMM = sheet.customWidth || 210;
      heightMM = sheet.customHeight || 297;
    } else {
      const baseDims = PAPER_SIZES[sheet.paperSize];
      if (sheet.orientation === 'landscape') {
        widthMM = baseDims.height;
        heightMM = baseDims.width;
      } else {
        widthMM = baseDims.width;
        heightMM = baseDims.height;
      }
    }

    return {
      widthPx: widthMM * MM_TO_PIXELS,
      heightPx: heightMM * MM_TO_PIXELS,
    };
  }, [getActiveSheet]);

  /**
   * Get all field rects for the active sheet's title block
   */
  const getFieldRects = useCallback((): TitleBlockFieldRect[] => {
    const sheet = getActiveSheet();
    if (!sheet || !sheet.titleBlock.visible) return [];

    const dims = getPaperDimensionsPx();
    if (!dims) return [];

    return getTitleBlockFieldRects(sheet.titleBlock, dims.widthPx, dims.heightPx, customTitleBlockTemplates);
  }, [getActiveSheet, getPaperDimensionsPx, customTitleBlockTemplates]);

  /**
   * Find the field at a given screen position
   */
  const findFieldAtScreenPos = useCallback(
    (screenX: number, screenY: number): TitleBlockFieldRect | null => {
      const rects = getFieldRects();
      if (rects.length === 0) return null;

      // Convert screen to sheet pixel space (before viewport transform)
      const worldX = (screenX - viewport.offsetX) / viewport.zoom;
      const worldY = (screenY - viewport.offsetY) / viewport.zoom;

      for (const rect of rects) {
        if (
          worldX >= rect.x &&
          worldX <= rect.x + rect.width &&
          worldY >= rect.y &&
          worldY <= rect.y + rect.height
        ) {
          return rect;
        }
      }

      return null;
    },
    [getFieldRects, viewport]
  );

  /**
   * Handle mouse move over the title block area — updates hover state
   */
  const handleTitleBlockMouseMove = useCallback(
    (screenPos: { x: number; y: number }): void => {
      if (editorMode !== 'sheet') return;
      // Don't change hover while editing
      if (titleBlockEditingFieldId) return;

      const field = findFieldAtScreenPos(screenPos.x, screenPos.y);
      setHoveredTitleBlockFieldId(field?.fieldId ?? null);
    },
    [editorMode, titleBlockEditingFieldId, findFieldAtScreenPos, setHoveredTitleBlockFieldId]
  );

  /**
   * Handle click on a title block field — starts editing if field clicked
   * Returns true if a field was clicked (to prevent event propagation)
   */
  const handleTitleBlockClick = useCallback(
    (screenPos: { x: number; y: number }): boolean => {
      if (editorMode !== 'sheet') return false;

      const field = findFieldAtScreenPos(screenPos.x, screenPos.y);
      if (field) {
        startTitleBlockFieldEditing(field.fieldId);
        return true;
      }

      return false;
    },
    [editorMode, findFieldAtScreenPos, startTitleBlockFieldEditing]
  );

  /**
   * Get the screen-space rect for the currently editing field
   * Used to position the HTML input overlay
   */
  const getEditingFieldScreenRect = useCallback((): {
    x: number;
    y: number;
    width: number;
    height: number;
    fieldRect: TitleBlockFieldRect;
  } | null => {
    if (!titleBlockEditingFieldId) return null;

    const rects = getFieldRects();
    const fieldRect = rects.find(r => r.fieldId === titleBlockEditingFieldId);
    if (!fieldRect) return null;

    // Convert from sheet pixel space to screen space
    const result = {
      x: fieldRect.x * viewport.zoom + viewport.offsetX,
      y: fieldRect.y * viewport.zoom + viewport.offsetY,
      width: fieldRect.width * viewport.zoom,
      height: fieldRect.height * viewport.zoom,
      fieldRect,
    };
    return result;
  }, [titleBlockEditingFieldId, getFieldRects, viewport]);

  /**
   * Save the current field value
   */
  const saveFieldValue = useCallback(
    (value: string): void => {
      const sheet = getActiveSheet();
      if (!sheet || !titleBlockEditingFieldId) return;
      updateTitleBlockField(sheet.id, titleBlockEditingFieldId, value);
      endTitleBlockFieldEditing();
    },
    [getActiveSheet, titleBlockEditingFieldId, updateTitleBlockField, endTitleBlockFieldEditing]
  );

  /**
   * Cancel editing
   */
  const cancelFieldEditing = useCallback((): void => {
    endTitleBlockFieldEditing();
  }, [endTitleBlockFieldEditing]);

  return {
    handleTitleBlockMouseMove,
    handleTitleBlockClick,
    getEditingFieldScreenRect,
    saveFieldValue,
    cancelFieldEditing,
    findFieldAtScreenPos,
    getFieldRects,
  };
}
