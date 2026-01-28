import { useEffect } from 'react';
import { MenuBar } from './components/MenuBar/MenuBar';
import { Ribbon } from './components/Ribbon/Ribbon';
import { Canvas } from './components/Canvas/Canvas';
import { NavigationPanel } from './components/NavigationPanel';
import { ToolPalette } from './components/ToolPalette/ToolPalette';
import { PropertiesPanel } from './components/Panels/PropertiesPanel';
import { LayersPanel } from './components/Panels/LayersPanel';
import { SheetPropertiesPanel } from './components/Panels/SheetPropertiesPanel';
import { DrawingPropertiesPanel } from './components/Panels/DrawingPropertiesPanel';
import { StatusBar } from './components/StatusBar/StatusBar';
import { CommandLine } from './components/CommandLine/CommandLine';
import { PrintDialog } from './components/PrintDialog/PrintDialog';
import { AboutDialog } from './components/AboutDialog/AboutDialog';
import { SnapSettingsDialog } from './components/SnapSettingsDialog/SnapSettingsDialog';
import { TitleBlockEditor } from './components/TitleBlockEditor';
import { NewSheetDialog } from './components/NewSheetDialog';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useGlobalKeyboard } from './hooks/useGlobalKeyboard';
import { useAppStore } from './state/appStore';

function App() {
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  useGlobalKeyboard();

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
    aboutDialogOpen,
    setAboutDialogOpen,
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
      <Ribbon />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Navigation (Drawings & Sheets) */}
        <NavigationPanel />

        {/* Tool Palette */}
        <ToolPalette />

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Canvas />
          <CommandLine />
        </div>

        {/* Right Panel - Properties & Layers (or Sheet Properties in sheet mode) */}
        <div className="w-64 bg-cad-surface border-l border-cad-border flex flex-col overflow-hidden">
          {editorMode === 'sheet' ? (
            <SheetPropertiesPanel />
          ) : (
            <>
              <div className="flex-shrink-0 max-h-[40%] overflow-y-auto border-b border-cad-border">
                <DrawingPropertiesPanel />
              </div>
              <div className="flex-shrink-0 max-h-[30%] overflow-y-auto border-b border-cad-border">
                <PropertiesPanel />
              </div>
              <div className="flex-1 overflow-y-auto">
                <LayersPanel />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Print Dialog */}
      <PrintDialog
        isOpen={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
      />

      {/* About Dialog */}
      <AboutDialog
        isOpen={aboutDialogOpen}
        onClose={() => setAboutDialogOpen(false)}
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

      {/* New Sheet Dialog */}
      <NewSheetDialog
        isOpen={newSheetDialogOpen}
        onClose={() => setNewSheetDialogOpen(false)}
      />
    </div>
  );
}

export default App;
