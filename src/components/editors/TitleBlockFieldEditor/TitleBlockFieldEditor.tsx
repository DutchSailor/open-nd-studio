/**
 * TitleBlockFieldEditor - Inline input overlay for editing title block fields
 *
 * Follows the TextEditor pattern: absolutely positioned HTML input over the canvas,
 * pre-filled with the current field value.
 *
 * Enter → save, Escape → cancel, blur → save
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import type { TitleBlockFieldRect } from '../../../engine/renderer/sheet/titleBlockHitTest';

interface TitleBlockFieldEditorProps {
  /** Screen-space X position */
  x: number;
  /** Screen-space Y position */
  y: number;
  /** Screen-space width */
  width: number;
  /** Screen-space height */
  height: number;
  /** The field rect with metadata */
  fieldRect: TitleBlockFieldRect;
  /** Current viewport zoom for font scaling */
  zoom: number;
  /** Save the new value */
  onSave: (value: string) => void;
  /** Cancel editing */
  onCancel: () => void;
}

export function TitleBlockFieldEditor({
  x,
  y,
  width,
  height,
  fieldRect,
  zoom,
  onSave,
  onCancel,
}: TitleBlockFieldEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(fieldRect.value);

  // Focus and select on mount
  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  // Dismiss on wheel zoom
  useEffect(() => {
    const handleWheel = () => {
      onSave(value);
    };
    window.addEventListener('wheel', handleWheel, { once: true, passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();

      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSave(value);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        onSave(value);
      }
    },
    [value, onSave, onCancel]
  );

  const handleBlur = useCallback(() => {
    onSave(value);
  }, [value, onSave]);

  // Scale font size with zoom
  const fontSize = Math.max(8, fieldRect.fontSize * zoom);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        style={{
          width: '100%',
          height: '100%',
          font: `${fieldRect.isBold ? 'bold ' : ''}${fontSize}px ${fieldRect.fontFamily}`,
          color: '#000000',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '2px solid #0066ff',
          outline: 'none',
          padding: '2px 4px',
          textAlign: fieldRect.align,
          boxSizing: 'border-box',
          boxShadow: '0 2px 8px rgba(0, 102, 255, 0.3)',
        }}
      />
    </div>
  );
}
