import { useEffect } from 'react';
import { useAppStore } from '../../state/appStore';
import { getShapeBounds } from '../../engine/geometry/GeometryUtils';

// Common viewport scales (as ratios, e.g., 0.01 = 1:100)
const VIEWPORT_SCALES = [
  1,      // 1:1
  0.5,    // 1:2
  0.2,    // 1:5
  0.1,    // 1:10
  0.05,   // 1:20
  0.02,   // 1:50
  0.01,   // 1:100
  0.005,  // 1:200
  0.002,  // 1:500
  0.001,  // 1:1000
];

// Two-key shortcut sequences (two-key style)
const TWO_KEY_SHORTCUTS: Record<string, string> = {
  'md': 'select',
  'mv': 'move',
  'co': 'copy',
  'ro': 'rotate',
  'mm': 'mirror',
  're': 'scale',
  'tr': 'trim',
  'ex': 'extend',
  'of': 'offset',
  'fl': 'fillet',
  'li': 'line',
  'rc': 'rectangle',
  'ci': 'circle',
  'ar': 'arc',
  'pl': 'polyline',
  'el': 'ellipse',
  'sp': 'spline',
  'tx': 'text',
  'le': 'leader',
  'di': 'dimension',
  'dl': 'dimension-linear',
  'da': 'dimension-angular',
  'dr': 'dimension-radius',
  'dd': 'dimension-diameter',
  'se': 'section',  // Structural section
  'be': 'beam',     // Structural beam
  'im': 'image',    // Image import
};

const TWO_KEY_TIMEOUT = 750; // ms to wait for second key

export function useKeyboardShortcuts() {
  const {
    setActiveTool,
    setDimensionMode,
    deleteSelectedShapes,
    selectAll,
    deselectAll,
    zoomIn,
    zoomOut,
    zoomToFit,
    toggleGrid,
    toggleSnap,
    selectedShapeIds,
    undo,
    redo,
    setPrintDialogOpen,
    printDialogOpen,
    // Tool state
    activeTool,
    lastTool,
    repeatLastTool,
    isDrawing,
    // Placement state
    isPlacing,
    placementScale,
    cancelPlacement,
    setPlacementScale,
    // Sheet mode state
    editorMode,
    activeSheetId,
    viewportEditState,
    deleteSheetViewport,
    // Document management
    createNewDocument,
    closeDocument,
    switchDocument,
    activeDocumentId,
    documentOrder,
    // Dialogs
    openSectionDialog,
    openBeamDialog,
    setFindReplaceDialogOpen,
    findReplaceDialogOpen,
    // Clipboard
    copySelectedShapes,
    cutSelectedShapes,
    pasteShapes,
    // Visibility
    hideSelectedShapes,
    showAllShapes,
    isolateSelectedShapes,
    // Locking
    lockSelectedShapes,
    unlockSelectedShapes,
    // Grouping
    groupSelectedShapes,
    ungroupSelectedShapes,
    // 2D Cursor
    resetCursor2D,
    setCursor2DToSelected,
    snapSelectionToCursor2D,
  } = useAppStore();

  useEffect(() => {
    let pendingKey = '';
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPending = () => {
      pendingKey = '';
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields or textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Handle placement mode shortcuts first
      if (isPlacing) {
        switch (key) {
          case 'escape':
            e.preventDefault();
            cancelPlacement();
            clearPending();
            return;
          case '=':
          case '+': {
            e.preventDefault();
            const currentIndex = VIEWPORT_SCALES.indexOf(placementScale);
            if (currentIndex > 0) {
              setPlacementScale(VIEWPORT_SCALES[currentIndex - 1]);
            } else if (currentIndex === -1) {
              const closerIndex = VIEWPORT_SCALES.findIndex(s => s <= placementScale);
              if (closerIndex > 0) {
                setPlacementScale(VIEWPORT_SCALES[closerIndex - 1]);
              }
            }
            return;
          }
          case '-': {
            e.preventDefault();
            const currentIndex = VIEWPORT_SCALES.indexOf(placementScale);
            if (currentIndex >= 0 && currentIndex < VIEWPORT_SCALES.length - 1) {
              setPlacementScale(VIEWPORT_SCALES[currentIndex + 1]);
            } else if (currentIndex === -1) {
              const closerIndex = VIEWPORT_SCALES.findIndex(s => s < placementScale);
              if (closerIndex >= 0) {
                setPlacementScale(VIEWPORT_SCALES[closerIndex]);
              }
            }
            return;
          }
        }
      }

      // Axis lock toggle for move/copy tools (X/Y keys during active move/copy)
      if (!ctrl && !shift && (key === 'x' || key === 'y')) {
        const s = useAppStore.getState();
        if ((s.activeTool === 'move' || s.activeTool === 'copy') && s.drawingPoints.length >= 1) {
          e.preventDefault();
          clearPending();
          s.toggleMoveAxisLock(key);
          return;
        }
      }

      // Two-key sequence handling (two-key style)
      if (!ctrl && !shift && key.length === 1 && key >= 'a' && key <= 'z') {
        if (pendingKey) {
          // Second key of a two-key sequence
          const combo = pendingKey + key;
          clearPending();
          const tool = TWO_KEY_SHORTCUTS[combo];
          if (tool) {
            e.preventDefault();
            if (tool.startsWith('dimension-')) {
              const mode = tool.replace('dimension-', '') as any;
              setDimensionMode(mode);
              setActiveTool('dimension');
            } else if (tool === 'section') {
              // Section opens a dialog, not a tool
              if (editorMode === 'drawing') {
                openSectionDialog();
              }
            } else if (tool === 'beam') {
              // Beam opens a dialog, not a tool
              if (editorMode === 'drawing') {
                openBeamDialog();
              }
            } else {
              setActiveTool(tool as any);
            }
            return;
          }
          // Invalid combo — fall through to single-key handling for the second key
        }

        // Check if this key could be the start of a two-key combo
        const possibleCombos = Object.keys(TWO_KEY_SHORTCUTS).filter(k => k[0] === key);
        if (possibleCombos.length > 0) {
          pendingKey = key;
          pendingTimer = setTimeout(() => {
            // Timer expired — no second key, so execute single-key action
            const saved = pendingKey;
            clearPending();
            executeSingleKey(saved);
          }, TWO_KEY_TIMEOUT);
          return;
        }

        // Single-letter shortcuts that don't start any two-key combo
        executeSingleKey(key);
        return;
      }

      // Non-letter keys or modifiers: clear pending and handle immediately
      if (pendingKey && (ctrl || shift || key.length !== 1 || key < 'a' || key > 'z')) {
        clearPending();
      }

      // Escape always works immediately (but not when print dialog is open)
      if (key === 'escape') {
        if (printDialogOpen) return;
        clearPending();
        // Cancel viewport move if active
        const s = useAppStore.getState();
        if (s.viewportEditState.isMoving) {
          s.cancelViewportMove();
          return;
        }
        setActiveTool('select');
        return;
      }

      // Non-tool single keys
      if (!ctrl && !shift) {
        switch (key) {
          case 'delete':
          case 'backspace':
            if (editorMode === 'sheet' && viewportEditState.selectedViewportId && activeSheetId) {
              deleteSheetViewport(activeSheetId, viewportEditState.selectedViewportId);
            } else if (selectedShapeIds.length > 0) {
              deleteSelectedShapes();
            }
            break;
          case '=':
          case '+':
            zoomIn();
            break;
          case '-':
            zoomOut();
            break;
          case 'enter':
          case ' ':
            // Repeat last tool when in select mode and not drawing
            if (activeTool === 'select' && !isDrawing && lastTool) {
              e.preventDefault();
              repeatLastTool();
            }
            break;
        }
      }

      // Ctrl shortcuts
      if (ctrl && !shift) {
        switch (key) {
          case 'a':
            e.preventDefault();
            selectAll();
            break;
          case 'c':
            e.preventDefault();
            copySelectedShapes();
            break;
          case 'x':
            e.preventDefault();
            cutSelectedShapes();
            break;
          case 'v':
            e.preventDefault();
            pasteShapes();
            break;
          case 'g':
            e.preventDefault();
            groupSelectedShapes();
            break;
          case 'd':
            e.preventDefault();
            deselectAll();
            break;
          case 'n':
            e.preventDefault();
            createNewDocument();
            break;
          case 'w':
            e.preventDefault();
            closeDocument(activeDocumentId);
            break;
          case 's':
            e.preventDefault();
            console.log('Save');
            break;
          case 'o':
            e.preventDefault();
            console.log('Open');
            break;
          case 'z':
            e.preventDefault();
            undo();
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'p':
            e.preventDefault();
            setPrintDialogOpen(true);
            break;
          case 'h':
            e.preventDefault();
            setFindReplaceDialogOpen(true);
            break;
          case 'tab': {
            e.preventDefault();
            const currentIdx = documentOrder.indexOf(activeDocumentId);
            const nextIdx = (currentIdx + 1) % documentOrder.length;
            switchDocument(documentOrder[nextIdx]);
            break;
          }
        }
      }

      // Ctrl+Shift shortcuts
      if (ctrl && shift) {
        switch (key) {
          case 'z':
            e.preventDefault();
            redo();
            break;
          case 'g':
            e.preventDefault();
            ungroupSelectedShapes();
            break;
          case 'tab': {
            e.preventDefault();
            const currentIdx = documentOrder.indexOf(activeDocumentId);
            const prevIdx = (currentIdx - 1 + documentOrder.length) % documentOrder.length;
            switchDocument(documentOrder[prevIdx]);
            break;
          }
        }
      }

      // Shift shortcuts (without Ctrl)
      if (!ctrl && shift) {
        switch (key) {
          case 'h':
            e.preventDefault();
            showAllShapes();
            break;
          case 'l':
            e.preventDefault();
            unlockSelectedShapes();
            break;
          case 'c':
            e.preventDefault();
            resetCursor2D();
            break;
          case 's':
            e.preventDefault();
            // Snap cursor to selected (if shapes selected) or selected to cursor
            if (selectedShapeIds.length > 0) {
              setCursor2DToSelected();
            }
            break;
        }
      }
    };

    /**
     * Execute a single-key shortcut when the two-key timer expires.
     * These are legacy single-letter shortcuts that also serve as
     * first letters of two-key combos.
     */
    function executeSingleKey(k: string) {
      // Single-letter shortcuts for tools, visibility and locking
      switch (k) {
        case 'g': {
          const s = useAppStore.getState();
          if (s.editorMode === 'sheet') {
            // Sheet mode: start viewport move with base point at viewport center
            if (s.viewportEditState.selectedViewportId && s.activeSheetId) {
              const sheet = s.sheets.find(sh => sh.id === s.activeSheetId);
              const vp = sheet?.viewports.find(v => v.id === s.viewportEditState.selectedViewportId);
              if (vp && !vp.locked) {
                s.startViewportMove({ x: vp.x + vp.width / 2, y: vp.y + vp.height / 2 });
              }
            }
          } else {
            // Drawing mode: activate move tool with auto base point
            setActiveTool('move');
            if (s.selectedShapeIds.length > 0) {
              const idSet = new Set(s.selectedShapeIds);
              const selected = s.shapes.filter(sh => idSet.has(sh.id));
              if (selected.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const sh of selected) {
                  const b = getShapeBounds(sh);
                  if (b) {
                    minX = Math.min(minX, b.minX);
                    minY = Math.min(minY, b.minY);
                    maxX = Math.max(maxX, b.maxX);
                    maxY = Math.max(maxY, b.maxY);
                  }
                }
                if (minX !== Infinity) {
                  s.addDrawingPoint({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
                }
              }
            }
          }
          break;
        }
        case 'h':
          hideSelectedShapes();
          break;
        case 'i':
          isolateSelectedShapes();
          break;
        case 'l':
          lockSelectedShapes();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearPending();
    };
  }, [
    setActiveTool,
    setDimensionMode,
    deleteSelectedShapes,
    selectAll,
    deselectAll,
    zoomIn,
    zoomOut,
    zoomToFit,
    toggleGrid,
    toggleSnap,
    selectedShapeIds,
    undo,
    redo,
    setPrintDialogOpen,
    printDialogOpen,
    activeTool,
    lastTool,
    repeatLastTool,
    isDrawing,
    isPlacing,
    placementScale,
    cancelPlacement,
    setPlacementScale,
    editorMode,
    activeSheetId,
    viewportEditState,
    deleteSheetViewport,
    createNewDocument,
    closeDocument,
    switchDocument,
    activeDocumentId,
    documentOrder,
    openSectionDialog,
    openBeamDialog,
    setFindReplaceDialogOpen,
    findReplaceDialogOpen,
    copySelectedShapes,
    cutSelectedShapes,
    pasteShapes,
    hideSelectedShapes,
    showAllShapes,
    isolateSelectedShapes,
    lockSelectedShapes,
    unlockSelectedShapes,
    groupSelectedShapes,
    ungroupSelectedShapes,
    resetCursor2D,
    setCursor2DToSelected,
    snapSelectionToCursor2D,
  ]);
}
