/**
 * TextEditor - Inline text editing overlay component
 *
 * Provides an overlay textarea for editing text shapes directly on the canvas.
 * Matches the text shape's font styling and position.
 * Supports symbol insertion and DXF-style codes (%%d, %%c, %%p).
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../../state/appStore';
import { worldToScreen } from '../../../engine/geometry/GeometryUtils';
import type { TextShape } from '../../../types/geometry';
import { SymbolPalette, processTextCodes } from '../SymbolPalette/SymbolPalette';

interface TextEditorProps {
  shape: TextShape;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export function TextEditor({ shape, onSave, onCancel }: TextEditorProps) {
  const { viewport } = useAppStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(shape.text);
  const [showSymbolPalette, setShowSymbolPalette] = useState(false);

  // Calculate screen position from world coordinates
  const screenPos = worldToScreen(shape.position.x, shape.position.y, viewport);

  // Focus on mount
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      // Move cursor to end
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
    }
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [text]);

  // Insert symbol at cursor position
  const insertSymbol = useCallback((symbol: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = text.substring(0, start) + symbol + text.substring(end);
      setText(newText);
      // Set cursor after inserted symbol
      setTimeout(() => {
        textarea.selectionStart = start + symbol.length;
        textarea.selectionEnd = start + symbol.length;
        textarea.focus();
      }, 0);
    }
  }, [text]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (showSymbolPalette) {
        setShowSymbolPalette(false);
      } else {
        onCancel();
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (text.trim()) {
        // Process DXF-style codes before saving
        onSave(processTextCodes(text));
      } else {
        onCancel();
      }
    } else if (e.key === 's' && e.ctrlKey && e.shiftKey) {
      // Ctrl+Shift+S opens symbol palette
      e.preventDefault();
      setShowSymbolPalette(true);
    }
    // Shift+Enter adds new line (default textarea behavior)
  }, [text, onSave, onCancel, showSymbolPalette]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't blur if clicking on symbol palette
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    if (text.trim()) {
      onSave(processTextCodes(text));
    } else {
      onCancel();
    }
  }, [text, onSave, onCancel]);

  // Calculate font styles for textarea
  const fontSize = shape.fontSize * viewport.zoom;
  const fontStyle = `${shape.italic ? 'italic ' : ''}${shape.bold ? 'bold ' : ''}`;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`,
        zIndex: 1000,
      }}
    >
      {/* Toolbar with symbol button */}
      <div
        style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: '4px',
          display: 'flex',
          gap: '4px',
          backgroundColor: 'rgba(30, 30, 30, 0.95)',
          padding: '4px',
          borderRadius: '4px',
          border: '1px solid #444',
        }}
      >
        <button
          onClick={() => setShowSymbolPalette(!showSymbolPalette)}
          title="Insert Symbol (Ctrl+Shift+S)"
          style={{
            padding: '2px 8px',
            fontSize: '14px',
            backgroundColor: showSymbolPalette ? '#0066ff' : '#333',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          Ω
        </button>
        <span style={{ fontSize: '10px', color: '#888', alignSelf: 'center' }}>
          Ctrl+Shift+S for symbols
        </span>
      </div>

      {/* Symbol palette popup */}
      {showSymbolPalette && (
        <div style={{ position: 'absolute', top: '-400px', left: 0 }}>
          <SymbolPalette
            onInsert={insertSymbol}
            onClose={() => setShowSymbolPalette(false)}
          />
        </div>
      )}

      {/* Text editor */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        style={{
          font: `${fontStyle}${fontSize}px ${shape.fontFamily}`,
          color: shape.color || '#ffffff',
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          border: '1px solid #0066ff',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          minWidth: '50px',
          minHeight: `${fontSize + 4}px`,
          padding: '2px 4px',
          transform: shape.rotation ? `rotate(${shape.rotation}rad)` : undefined,
          transformOrigin: 'top left',
          lineHeight: shape.lineHeight || 1.2,
          textAlign: shape.alignment,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        }}
        placeholder="Enter text..."
      />
    </div>
  );
}
