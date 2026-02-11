/**
 * Style Command Handlers
 *
 * Style operations: get, set, getDefaults.
 */

import type { CommandDefinition, CommandResponse } from '../types';
import type { ShapeStyle, LineStyle, TextStyle } from '../../../types/geometry';
import { generateId } from '../../../state/appStore';

export const styleCommands: CommandDefinition[] = [
  // Get current style
  {
    command: 'style',
    action: 'get',
    description: 'Get current drawing style',
    modifiesState: false,
    params: [],
    handler: (_, context): CommandResponse => {
      const state = context.getState();

      return {
        success: true,
        data: {
          style: { ...state.currentStyle },
        },
      };
    },
  },

  // Set current style
  {
    command: 'style',
    action: 'set',
    description: 'Set current drawing style',
    modifiesState: false,
    params: [
      { name: 'strokeColor', type: 'string', description: 'Color (hex)' },
      { name: 'strokeWidth', type: 'number', min: 0.1, description: 'Lineweight' },
      { name: 'lineStyle', type: 'string', enum: ['solid', 'dashed', 'dotted', 'dashdot'], description: 'Line style' },
      { name: 'fillColor', type: 'string', description: 'Fill color (hex or undefined for no fill)' },
    ],
    handler: (params, context): CommandResponse => {
      const state = context.getState();

      const updates: Partial<ShapeStyle> = {};
      if (params.strokeColor !== undefined) updates.strokeColor = params.strokeColor as string;
      if (params.strokeWidth !== undefined) updates.strokeWidth = params.strokeWidth as number;
      if (params.lineStyle !== undefined) updates.lineStyle = params.lineStyle as LineStyle;
      if (params.fillColor !== undefined) updates.fillColor = params.fillColor as string;

      state.setCurrentStyle({ ...state.currentStyle, ...updates });

      return {
        success: true,
        data: {
          style: { ...context.getState().currentStyle },
        },
      };
    },
  },

  // Get text defaults
  {
    command: 'style',
    action: 'getDefaults',
    description: 'Get default text style',
    modifiesState: false,
    params: [],
    handler: (_, context): CommandResponse => {
      const state = context.getState();

      return {
        success: true,
        data: {
          textStyle: { ...state.defaultTextStyle },
          shapeStyle: { ...state.currentStyle },
        },
      };
    },
  },

  // Set text defaults
  {
    command: 'style',
    action: 'setTextDefaults',
    description: 'Set default text style',
    modifiesState: false,
    params: [
      { name: 'fontSize', type: 'number', min: 1, description: 'Default font size' },
      { name: 'fontFamily', type: 'string', description: 'Default font family' },
      { name: 'color', type: 'string', description: 'Default text color' },
      { name: 'bold', type: 'boolean', description: 'Default bold state' },
      { name: 'italic', type: 'boolean', description: 'Default italic state' },
    ],
    handler: (params, context): CommandResponse => {
      const state = context.getState();

      const updates: Record<string, unknown> = {};
      if (params.fontSize !== undefined) updates.fontSize = params.fontSize;
      if (params.fontFamily !== undefined) updates.fontFamily = params.fontFamily;
      if (params.color !== undefined) updates.color = params.color;
      if (params.bold !== undefined) updates.bold = params.bold;
      if (params.italic !== undefined) updates.italic = params.italic;

      state.updateDefaultTextStyle(updates);

      return {
        success: true,
        data: {
          textStyle: { ...context.getState().defaultTextStyle },
        },
      };
    },
  },

  // ======================================================================
  // Text Style Management Commands
  // ======================================================================

  // List all text styles
  {
    command: 'style',
    action: 'listTextStyles',
    description: 'List all text styles',
    modifiesState: false,
    params: [],
    handler: (_, context): CommandResponse => {
      const state = context.getState();
      return {
        success: true,
        data: {
          styles: state.textStyles.map(s => ({ ...s })),
          activeTextStyleId: state.activeTextStyleId,
        },
      };
    },
  },

  // Get a text style by ID
  {
    command: 'style',
    action: 'getTextStyle',
    description: 'Get a text style by ID',
    modifiesState: false,
    params: [
      { name: 'id', type: 'string', required: true, description: 'Text style ID' },
    ],
    handler: (params, context): CommandResponse => {
      const state = context.getState();
      const style = state.textStyles.find(s => s.id === params.id);
      if (!style) {
        return { success: false, error: `Text style '${params.id}' not found` };
      }
      return { success: true, data: { style: { ...style } } };
    },
  },

  // Create a new text style
  {
    command: 'style',
    action: 'createTextStyle',
    description: 'Create a new text style',
    modifiesState: true,
    params: [
      { name: 'name', type: 'string', required: true, description: 'Style name' },
      { name: 'fontFamily', type: 'string', description: 'Font family' },
      { name: 'fontSize', type: 'number', min: 0.1, description: 'Font size' },
      { name: 'bold', type: 'boolean', description: 'Bold' },
      { name: 'italic', type: 'boolean', description: 'Italic' },
      { name: 'underline', type: 'boolean', description: 'Underline' },
      { name: 'color', type: 'string', description: 'Text color (hex)' },
      { name: 'alignment', type: 'string', enum: ['left', 'center', 'right'], description: 'Alignment' },
      { name: 'isModelText', type: 'boolean', description: 'Model text flag' },
    ],
    handler: (params, context): CommandResponse => {
      const state = context.getState();
      const id = generateId();
      const styleData: TextStyle = {
        id,
        name: params.name as string,
        fontFamily: (params.fontFamily as string) || 'Osifont',
        fontSize: (params.fontSize as number) || 2.5,
        bold: (params.bold as boolean) ?? false,
        italic: (params.italic as boolean) ?? false,
        underline: (params.underline as boolean) ?? false,
        color: (params.color as string) || '#ffffff',
        alignment: (params.alignment as 'left' | 'center' | 'right') || 'left',
        verticalAlignment: 'top',
        lineHeight: 1.4,
        isModelText: (params.isModelText as boolean) ?? false,
        backgroundMask: false,
        backgroundColor: '#1a1a2e',
        backgroundPadding: 0.5,
      };
      state.addTextStyle(styleData);
      return {
        success: true,
        data: { id, style: { ...styleData } },
      };
    },
  },

  // Update a text style
  {
    command: 'style',
    action: 'updateTextStyle',
    description: 'Update a text style',
    modifiesState: true,
    params: [
      { name: 'id', type: 'string', required: true, description: 'Text style ID' },
      { name: 'name', type: 'string', description: 'Style name' },
      { name: 'fontFamily', type: 'string', description: 'Font family' },
      { name: 'fontSize', type: 'number', min: 0.1, description: 'Font size' },
      { name: 'bold', type: 'boolean', description: 'Bold' },
      { name: 'italic', type: 'boolean', description: 'Italic' },
      { name: 'underline', type: 'boolean', description: 'Underline' },
      { name: 'color', type: 'string', description: 'Text color (hex)' },
      { name: 'alignment', type: 'string', enum: ['left', 'center', 'right'], description: 'Alignment' },
      { name: 'isModelText', type: 'boolean', description: 'Model text flag' },
    ],
    handler: (params, context): CommandResponse => {
      const state = context.getState();
      const id = params.id as string;
      const style = state.textStyles.find(s => s.id === id);
      if (!style) {
        return { success: false, error: `Text style '${id}' not found` };
      }
      if (style.isBuiltIn) {
        return { success: false, error: 'Cannot modify built-in text styles' };
      }

      const updates: Partial<TextStyle> = {};
      if (params.name !== undefined) updates.name = params.name as string;
      if (params.fontFamily !== undefined) updates.fontFamily = params.fontFamily as string;
      if (params.fontSize !== undefined) updates.fontSize = params.fontSize as number;
      if (params.bold !== undefined) updates.bold = params.bold as boolean;
      if (params.italic !== undefined) updates.italic = params.italic as boolean;
      if (params.underline !== undefined) updates.underline = params.underline as boolean;
      if (params.color !== undefined) updates.color = params.color as string;
      if (params.alignment !== undefined) updates.alignment = params.alignment as 'left' | 'center' | 'right';
      if (params.isModelText !== undefined) updates.isModelText = params.isModelText as boolean;

      state.updateTextStyle(id, updates);

      const updated = context.getState().textStyles.find(s => s.id === id);
      return { success: true, data: { style: updated ? { ...updated } : null } };
    },
  },

  // Delete a text style
  {
    command: 'style',
    action: 'deleteTextStyle',
    description: 'Delete a custom text style',
    modifiesState: true,
    params: [
      { name: 'id', type: 'string', required: true, description: 'Text style ID' },
    ],
    handler: (params, context): CommandResponse => {
      const state = context.getState();
      const id = params.id as string;
      const style = state.textStyles.find(s => s.id === id);
      if (!style) {
        return { success: false, error: `Text style '${id}' not found` };
      }
      if (style.isBuiltIn) {
        return { success: false, error: 'Cannot delete built-in text styles' };
      }
      state.deleteTextStyle(id);
      return { success: true, data: { deletedId: id } };
    },
  },

  // Set active text style
  {
    command: 'style',
    action: 'setActiveTextStyle',
    description: 'Set the active text style for new text',
    modifiesState: false,
    params: [
      { name: 'id', type: 'string', description: 'Text style ID (null to clear)' },
    ],
    handler: (params, context): CommandResponse => {
      const state = context.getState();
      const id = (params.id as string) || null;
      if (id) {
        const style = state.textStyles.find(s => s.id === id);
        if (!style) {
          return { success: false, error: `Text style '${id}' not found` };
        }
      }
      state.setActiveTextStyle(id);
      return {
        success: true,
        data: { activeTextStyleId: id },
      };
    },
  },
];
