import { useCallback, useEffect, useRef, useState } from 'react';
import { getSetting, setSetting } from './utils/settings';
import { MenuBar } from './components/MenuBar/MenuBar';
import { Ribbon } from './components/Ribbon/Ribbon';
import { Canvas } from './components/Canvas/Canvas';
import { NavigationPanel } from './components/NavigationPanel';
import { SheetPropertiesPanel } from './components/Panels/SheetPropertiesPanel';
import { RightPanelLayout } from './components/Panels/RightPanelLayout';
import { StatusBar } from './components/StatusBar/StatusBar';
import { FileTabBar } from './components/FileTabBar/FileTabBar';
import { PrintDialog } from './components/PrintDialog/PrintDialog';

import { SnapSettingsDialog } from './components/SnapSettingsDialog/SnapSettingsDialog';
import { Backstage, type BackstageView } from './components/Backstage/Backstage';
import { TitleBlockEditor } from './components/TitleBlockEditor';
import { NewSheetDialog } from './components/NewSheetDialog';
import { OptionsBar } from './components/OptionsBar/OptionsBar';
import { useKeyboardShortcuts } from './hooks/keyboard/useKeyboardShortcuts';
import { useGlobalKeyboard } from './hooks/keyboard/useGlobalKeyboard';
import { useAppStore } from './state/appStore';
import { CadApi } from './api';

function App() {
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  useGlobalKeyboard();

  // Backstage view
  const [backstageOpen, setBackstageOpen] = useState(false);
  const [backstageInitialView, setBackstageInitialView] = useState<BackstageView | undefined>();
  const openBackstage = useCallback(() => setBackstageOpen(true), []);
  const closeBackstage = useCallback(() => { setBackstageOpen(false); setBackstageInitialView(undefined); }, []);
  const onSendFeedback = useCallback(() => { setBackstageInitialView('feedback'); setBackstageOpen(true); }, []);

  // Right panel resizing
  const [rightPanelWidth, setRightPanelWidth] = useState(256);

  // Restore saved width
  useEffect(() => {
    getSetting<number>('rightPanelWidth', 256).then(setRightPanelWidth);
  }, []);
  const isResizingRight = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRight.current) return;
      const newWidth = Math.max(180, Math.min(500, window.innerWidth - e.clientX));
      setRightPanelWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (isResizingRight.current) {
        isResizingRight.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setRightPanelWidth(w => { setSetting('rightPanelWidth', w); return w; });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Block browser shortcuts in production (F5, Ctrl+R, Ctrl+Shift+I, Ctrl+U, etc.)
  useEffect(() => {
    if (import.meta.env.DEV) return;

    const handler = (e: KeyboardEvent) => {
      // F5 / Ctrl+R / Ctrl+Shift+R - refresh
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
      }
      // Ctrl+Shift+I - dev tools
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
      }
      // Ctrl+U - view source
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
      }
      // Ctrl+Shift+J - console
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
      }
      // F7 - caret browsing
      if (e.key === 'F7') {
        e.preventDefault();
      }
    };

    const contextHandler = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handler, true);
    window.addEventListener('contextmenu', contextHandler, true);
    return () => {
      window.removeEventListener('keydown', handler, true);
      window.removeEventListener('contextmenu', contextHandler, true);
    };
  }, []);

  // Initialize CAD API
  const cadApiRef = useRef<CadApi | null>(null);
  useEffect(() => {
    if (!cadApiRef.current) {
      cadApiRef.current = new CadApi(useAppStore);
      (window as any).cad = cadApiRef.current;
    }
    return () => {
      if (cadApiRef.current) {
        cadApiRef.current.dispose();
        cadApiRef.current = null;
        delete (window as any).cad;
      }
    };
  }, []);

  // Disable browser context menu in production
  useEffect(() => {
    if (import.meta.env.PROD) {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };
      document.addEventListener('contextmenu', handleContextMenu);
      return () => document.removeEventListener('contextmenu', handleContextMenu);
    }
  }, []);

  const {
    printDialogOpen,
    setPrintDialogOpen,
snapSettingsOpen,
    setSnapSettingsOpen,
    titleBlockEditorOpen,
    setTitleBlockEditorOpen,
    newSheetDialogOpen,
    setNewSheetDialogOpen,
    activeSheetId,
    editorMode,
  } = useAppStore();

  return (
    <div className="flex flex-col h-full w-full bg-cad-bg text-cad-text no-select">
      {/* Menu Bar */}
      <MenuBar />

      {/* Ribbon */}
      <Ribbon onOpenBackstage={openBackstage} />

      {/* Options Bar (shows when Array or similar commands are active) */}
      <OptionsBar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Navigation (Drawings & Sheets) */}
        <NavigationPanel />

        {/* Center - Canvas + Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <FileTabBar />
          <Canvas />
        </div>

        {/* Right Panel - Properties & Layers (or Sheet Properties in sheet mode) */}
        <div
          className="bg-cad-surface border-l border-cad-border flex flex-col overflow-hidden relative"
          style={{ width: rightPanelWidth, minWidth: 180, maxWidth: 500 }}
        >
          {/* Resize handle */}
          <div
            className="absolute top-0 left-0 w-px h-full cursor-col-resize hover:bg-cad-accent z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              isResizingRight.current = true;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }}
          />
          {editorMode === 'sheet' ? (
            <SheetPropertiesPanel />
          ) : (
            <RightPanelLayout />
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar onSendFeedback={onSendFeedback} />

      {/* Print Dialog */}
      <PrintDialog
        isOpen={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
      />

{/* Snap Settings Dialog */}
      <SnapSettingsDialog
        isOpen={snapSettingsOpen}
        onClose={() => setSnapSettingsOpen(false)}
      />

      {/* Title Block Editor Dialog */}
      {activeSheetId && (
        <TitleBlockEditor
          isOpen={titleBlockEditorOpen}
          onClose={() => setTitleBlockEditorOpen(false)}
          sheetId={activeSheetId}
        />
      )}

      {/* Backstage View */}
      <Backstage isOpen={backstageOpen} onClose={closeBackstage} initialView={backstageInitialView} />

      {/* New Sheet Dialog */}
      <NewSheetDialog
        isOpen={newSheetDialogOpen}
        onClose={() => setNewSheetDialogOpen(false)}
      />
    </div>
  );
}

export default App;
