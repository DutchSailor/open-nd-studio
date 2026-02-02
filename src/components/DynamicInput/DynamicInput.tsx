import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../state/appStore';
import { getDistance, getAngle } from '../../engine/geometry/CoordinateParser';
import {
  transformShape,
  translateTransform,
  rotateTransform,
  getShapeTransformUpdates,
} from '../../engine/geometry/Modify';

/**
 * Field configuration per tool
 */
interface FieldConfig {
  field1Label: string;
  field2Label: string;
}

const TOOL_FIELDS: Record<string, FieldConfig> = {
  line: { field1Label: 'Distance', field2Label: 'Angle' },
  rectangle: { field1Label: 'Width', field2Label: 'Height' },
  circle: { field1Label: 'Radius', field2Label: '' },
  arc: { field1Label: 'Radius', field2Label: 'Sweep' },
  ellipse: { field1Label: 'Radius X', field2Label: 'Radius Y' },
  polyline: { field1Label: 'Distance', field2Label: 'Angle' },
};

/**
 * DynamicInput - Editable tooltip near the cursor.
 * Tab cycles focus between fields, Enter applies values.
 * Typing a number auto-focuses the first field.
 */
export function DynamicInput() {
  const {
    activeTool,
    drawingPoints,
    isDrawing,
    mousePosition,
    viewport,
    canvasSize,
    lockedDistance,
    lockedAngle,
    setLockedDistance,
    setLockedAngle,
  } = useAppStore();

  const [focusedField, setFocusedField] = useState<0 | 1 | -1>(-1); // -1 = none, 0 = field1, 1 = field2
  const [field1Text, setField1Text] = useState('');
  const [field2Text, setField2Text] = useState('');
  const field1Ref = useRef<HTMLInputElement>(null);
  const field2Ref = useRef<HTMLInputElement>(null);

  const supportedDrawingTools = ['line', 'rectangle', 'circle', 'arc', 'ellipse', 'polyline'];
  const supportedModifyTools = ['move', 'copy'];

  const isModifyMode = supportedModifyTools.includes(activeTool) && drawingPoints.length >= 1;
  const isRotateMode = activeTool === 'rotate' && drawingPoints.length >= 2;
  const isDrawingMode = isDrawing && drawingPoints.length > 0 && supportedDrawingTools.includes(activeTool);

  // Only show when drawing with supported tools OR during move/copy/rotate with points set
  const showDynamicInput = isDrawingMode || isModifyMode || isRotateMode;

  // Reset when drawing ends or tool changes
  useEffect(() => {
    if (!showDynamicInput) {
      setFocusedField(-1);
      setField1Text('');
      setField2Text('');
      setLockedDistance(null);
      setLockedAngle(null);
    }
  }, [showDynamicInput, setLockedDistance, setLockedAngle]);

  // Focus management
  useEffect(() => {
    if (focusedField === 0) {
      field1Ref.current?.focus();
      field1Ref.current?.select();
    } else if (focusedField === 1) {
      field2Ref.current?.focus();
      field2Ref.current?.select();
    }
  }, [focusedField]);

  // Execute move/copy with typed distance
  const executeModifyWithDistance = useCallback((dist: number) => {
    if (!isModifyMode || drawingPoints.length < 1) return;

    const basePoint = drawingPoints[0];
    const worldMX = (mousePosition.x - viewport.offsetX) / viewport.zoom;
    const worldMY = (mousePosition.y - viewport.offsetY) / viewport.zoom;
    const dirX = worldMX - basePoint.x;
    const dirY = worldMY - basePoint.y;
    const dirLen = Math.hypot(dirX, dirY);
    if (dirLen < 0.001) return;

    const ux = dirX / dirLen;
    const uy = dirY / dirLen;
    const dx = ux * dist;
    const dy = uy * dist;
    const transform = translateTransform(dx, dy);

    const state = useAppStore.getState();
    const selected = state.shapes.filter((s) => state.selectedShapeIds.includes(s.id));
    if (selected.length === 0) return;

    if (activeTool === 'copy' || state.modifyCopy) {
      const copies = selected.map((s) => transformShape(s, transform));
      state.addShapes(copies);
      // Keep base point active for repeated copies
      state.setDrawingPreview(null);
    } else {
      const updates = selected.map((s) => ({
        id: s.id,
        updates: getShapeTransformUpdates(s, transform),
      }));
      state.updateShapes(updates);
      state.clearDrawingPoints();
      state.setDrawingPreview(null);
    }
  }, [isModifyMode, drawingPoints, mousePosition, viewport, activeTool]);

  // Execute rotate with typed angle, direction from mouse position
  const executeRotateWithAngle = useCallback((angleDeg: number) => {
    if (!isRotateMode || drawingPoints.length < 2) return;

    const center = drawingPoints[0];
    const startRay = drawingPoints[1];
    const worldMX = (mousePosition.x - viewport.offsetX) / viewport.zoom;
    const worldMY = (mousePosition.y - viewport.offsetY) / viewport.zoom;

    // Determine direction sign from mouse position relative to start ray
    const startAngle = Math.atan2(startRay.y - center.y, startRay.x - center.x);
    const mouseAngle = Math.atan2(worldMY - center.y, worldMX - center.x);
    let deltaAngle = mouseAngle - startAngle;
    // Normalize to [-PI, PI]
    while (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    while (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    const dirSign = deltaAngle >= 0 ? 1 : -1;

    const angleRad = dirSign * angleDeg * (Math.PI / 180);
    const transform = rotateTransform(center, angleRad);

    const state = useAppStore.getState();
    const selected = state.shapes.filter((s) => state.selectedShapeIds.includes(s.id));
    if (selected.length === 0) return;

    if (state.modifyCopy) {
      const copies = selected.map((s) => transformShape(s, transform));
      state.addShapes(copies);
    } else {
      const updates = selected.map((s) => ({
        id: s.id,
        updates: getShapeTransformUpdates(s, transform),
      }));
      state.updateShapes(updates);
    }
    state.clearDrawingPoints();
    state.setDrawingPreview(null);
  }, [isRotateMode, drawingPoints, mousePosition, viewport]);

  // Apply values and notify store
  const applyValues = useCallback(() => {
    if (isRotateMode) {
      const v1 = field1Text !== '' ? Number(field1Text) : null;
      if (v1 !== null && !isNaN(v1)) {
        executeRotateWithAngle(v1);
      }
      setFocusedField(-1);
      setField1Text('');
      return;
    }

    if (isModifyMode) {
      const v1 = field1Text !== '' ? Number(field1Text) : null;
      if (v1 !== null && !isNaN(v1)) {
        executeModifyWithDistance(v1);
      }
      setFocusedField(-1);
      setField1Text('');
      return;
    }

    const v1 = field1Text !== '' ? Number(field1Text) : null;
    const v2 = field2Text !== '' ? Number(field2Text) : null;

    if (v1 !== null && !isNaN(v1)) {
      setLockedDistance(v1);
    }
    if (v2 !== null && !isNaN(v2)) {
      setLockedAngle(v2);
    }

    setFocusedField(-1);
  }, [isRotateMode, isModifyMode, field1Text, field2Text, setLockedDistance, setLockedAngle, executeModifyWithDistance, executeRotateWithAngle]);

  // Global keyboard handler for Tab, Enter, and numeric input
  useEffect(() => {
    if (!showDynamicInput) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab cycles between fields
      if (e.key === 'Tab') {
        e.preventDefault();
        if (focusedField === -1) {
          setFocusedField(0);
        } else if (focusedField === 0) {
          if (isModifyMode || isRotateMode) {
            // For modify/rotate tools, Tab applies the value
            applyValues();
            return;
          }
          // Apply field 1 value
          const v1 = field1Text !== '' ? Number(field1Text) : null;
          if (v1 !== null && !isNaN(v1)) {
            setLockedDistance(v1);
          }
          const config = TOOL_FIELDS[activeTool];
          if (config?.field2Label) {
            setFocusedField(1);
          } else {
            setFocusedField(-1);
          }
        } else {
          // Apply field 2 value
          const v2 = field2Text !== '' ? Number(field2Text) : null;
          if (v2 !== null && !isNaN(v2)) {
            setLockedAngle(v2);
          }
          setFocusedField(-1);
        }
        return;
      }

      // Enter applies values
      if (e.key === 'Enter' && focusedField !== -1) {
        e.preventDefault();
        applyValues();
        return;
      }

      // Typing a number auto-focuses field 1
      if (focusedField === -1 && /^[0-9.\-]$/.test(e.key)) {
        e.preventDefault();
        setField1Text(e.key === '-' ? '-' : e.key);
        setFocusedField(0);
        // Need to set cursor position after the character
        setTimeout(() => {
          if (field1Ref.current) {
            field1Ref.current.selectionStart = field1Ref.current.value.length;
            field1Ref.current.selectionEnd = field1Ref.current.value.length;
          }
        }, 0);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDynamicInput, focusedField, field1Text, field2Text, activeTool, applyValues, setLockedDistance, setLockedAngle]);

  if (!showDynamicInput) return null;

  const config = TOOL_FIELDS[activeTool] ?? (isRotateMode ? { field1Label: 'Angle', field2Label: '' } : isModifyMode ? { field1Label: 'Distance', field2Label: '' } : null);
  if (!config) return null;

  // Convert screen position to world coordinates
  const worldX = (mousePosition.x - viewport.offsetX) / viewport.zoom;
  const worldY = (mousePosition.y - viewport.offsetY) / viewport.zoom;

  // Get last point for relative calculations
  const lastPoint = drawingPoints[drawingPoints.length - 1];
  const currentPoint = { x: worldX, y: worldY };

  // Calculate live values
  const distance = getDistance(lastPoint, currentPoint);
  const angle = getAngle(lastPoint, currentPoint);
  const deltaX = worldX - lastPoint.x;
  const deltaY = worldY - lastPoint.y;

  // Position the tooltip near the cursor
  const tooltipX = Math.min(mousePosition.x + 20, canvasSize.width - 250);
  const tooltipY = Math.min(mousePosition.y + 20, canvasSize.height - 100);

  // Display values: use locked if set, otherwise live
  const displayVal1 = lockedDistance !== null ? lockedDistance.toFixed(2) : distance.toFixed(2);
  const displayVal2 = lockedAngle !== null ? lockedAngle.toFixed(1) : angle.toFixed(1);

  return (
    <div
      className="absolute pointer-events-auto z-50"
      style={{
        left: tooltipX,
        top: tooltipY,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-cad-surface/95 border border-cad-accent shadow-lg p-2 font-mono text-xs">
        {/* Field 1: Distance / Width / Radius */}
        <div className="flex items-center gap-2 text-cad-text mb-1">
          <span className="text-cad-text-dim w-14 text-right">{config.field1Label}:</span>
          {focusedField === 0 ? (
            <input
              ref={field1Ref}
              type="text"
              className="bg-cad-bg border border-cad-accent text-green-400 font-semibold px-1 w-20 h-5 text-xs outline-none"
              value={field1Text}
              onChange={(e) => setField1Text(e.target.value)}
              onBlur={() => {
                const v = field1Text !== '' ? Number(field1Text) : null;
                if (v !== null && !isNaN(v)) {
                  setLockedDistance(v);
                }
              }}
            />
          ) : (
            <span
              className={`font-semibold cursor-text px-1 ${lockedDistance !== null ? 'text-green-400 bg-cad-bg border border-green-400/30' : 'text-green-400'}`}
              onClick={() => {
                setField1Text(displayVal1);
                setFocusedField(0);
              }}
            >
              {displayVal1}
            </span>
          )}
          {lockedDistance !== null && (
            <span className="text-green-400 text-[10px]">locked</span>
          )}
        </div>

        {/* Field 2: Angle / Height */}
        {config.field2Label && (
          <div className="flex items-center gap-2 text-cad-text mb-1">
            <span className="text-cad-text-dim w-14 text-right">{config.field2Label}:</span>
            {focusedField === 1 ? (
              <input
                ref={field2Ref}
                type="text"
                className="bg-cad-bg border border-cad-accent text-yellow-400 font-semibold px-1 w-20 h-5 text-xs outline-none"
                value={field2Text}
                onChange={(e) => setField2Text(e.target.value)}
                onBlur={() => {
                  const v = field2Text !== '' ? Number(field2Text) : null;
                  if (v !== null && !isNaN(v)) {
                    setLockedAngle(v);
                  }
                }}
              />
            ) : (
              <span
                className={`font-semibold cursor-text px-1 ${lockedAngle !== null ? 'text-yellow-400 bg-cad-bg border border-yellow-400/30' : 'text-yellow-400'}`}
                onClick={() => {
                  setField2Text(displayVal2);
                  setFocusedField(1);
                }}
              >
                {displayVal2}{config.field2Label === 'Angle' ? '\u00B0' : ''}
              </span>
            )}
            {lockedAngle !== null && (
              <span className="text-yellow-400 text-[10px]">locked</span>
            )}
          </div>
        )}

        {/* Separator */}
        <div className="border-t border-cad-border my-1.5" />

        {/* Read-only coordinates */}
        <div className="flex items-center gap-2 text-cad-text text-[10px]">
          <span className="text-cad-text-dim">X:</span>
          <span className="text-cad-accent">{worldX.toFixed(2)}</span>
          <span className="text-cad-text-dim ml-2">Y:</span>
          <span className="text-cad-accent">{worldY.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2 text-cad-text text-[10px]">
          <span className="text-cad-text-dim">{'\u0394'}X:</span>
          <span>{deltaX.toFixed(2)}</span>
          <span className="text-cad-text-dim ml-2">{'\u0394'}Y:</span>
          <span>{deltaY.toFixed(2)}</span>
        </div>

        {/* Hint */}
        {focusedField === -1 && (
          <div className="border-t border-cad-border mt-1.5 pt-1 text-cad-text-dim text-[9px]">
            Tab: edit values | Type number to enter distance
          </div>
        )}
      </div>
    </div>
  );
}
