import { useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore, generateId } from '../../state/appStore';
import {
  showOpenDialog,
  showSaveDialog,
  showExportDialog,
  showExportAllFormatsDialog,
  readProjectFile,
  writeProjectFile,
  exportToSVG,
  exportToDXF,
  exportToIFC,
  showError,
  showInfo,
  showImportDxfDialog,
  parseDXF,
  parseDXFInsUnits,
  type ProjectFile,
} from '../../services/file/fileService';
import { logger } from '../../services/log/logService';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { DEFAULT_PROJECT_INFO } from '../../types/projectInfo';

export function useFileOperations() {
  const setFilePath = useAppStore(s => s.setFilePath);
  const setProjectName = useAppStore(s => s.setProjectName);
  const setModified = useAppStore(s => s.setModified);
  const setPrintDialogOpen = useAppStore(s => s.setPrintDialogOpen);
  const addShapes = useAppStore(s => s.addShapes);

  const handleNew = useCallback(async () => {
    useAppStore.getState().createNewDocument();
  }, []);

  const handleOpen = useCallback(async () => {
    const filePath = await showOpenDialog();
    if (!filePath) return;

    const extension = filePath.split('.').pop()?.toLowerCase();

    if (extension === 'dxf') {
      try {
        const content = await readTextFile(filePath);
        const fileName = filePath.split(/[/\\]/).pop()?.replace('.dxf', '') || 'Untitled';

        const s = useAppStore.getState();
        const prevDocId = s.activeDocumentId;
        const isEmptyUntitled = !s.isModified && !s.currentFilePath
          && s.shapes.length === 0 && s.projectName.startsWith('Untitled');

        // Create a new empty document first so we get its default layer/drawing IDs
        const docId = generateId();
        s.openDocument(docId, {
          projectName: fileName,
          isModified: false,
          projectInfo: { ...DEFAULT_PROJECT_INFO },
        });

        // Now parse DXF using the new document's layer/drawing IDs
        const newState = useAppStore.getState();
        const { shapes, blockDefinitions } = parseDXF(content, newState.activeLayerId, newState.activeDrawingId);
        if (shapes.length === 0) {
          await showInfo('No supported entities found in the DXF file.\n\nSupported entities: LINE, CIRCLE, ARC, ELLIPSE, POLYLINE, LWPOLYLINE, SPLINE, TEXT, MTEXT, POINT, SOLID, 3DFACE, TRACE, INSERT');
          return;
        }

        // Add the parsed shapes and block definitions to the new document
        const store = useAppStore.getState();
        store.addShapes(shapes);
        if (blockDefinitions.length > 0) {
          store.addBlockDefinitions(blockDefinitions);
        }

        // Detect and apply DXF units
        const dxfUnit = parseDXFInsUnits(content);
        if (dxfUnit) {
          useAppStore.getState().setLengthUnit(dxfUnit);
        }

        if (isEmptyUntitled) {
          useAppStore.getState().closeDocument(prevDocId);
        }
        logger.info(`Opened DXF file: ${fileName}`, 'File');
      } catch (err) {
        await showError(`Failed to open DXF: ${err}`);
      }
      return;
    }

    try {
      const project = await readProjectFile(filePath);
      const fileName = filePath.split(/[/\\]/).pop()?.replace('.o2d', '') || 'Untitled';

      // Check if current tab is an empty untitled document — close it after opening
      const s = useAppStore.getState();
      const prevDocId = s.activeDocumentId;
      const isEmptyUntitled = !s.isModified && !s.currentFilePath
        && s.shapes.length === 0 && s.projectName.startsWith('Untitled');

      // Open as a new document tab (or switch to it if already open)
      const docId = generateId();
      s.openDocument(docId, {
        shapes: project.shapes,
        layers: project.layers,
        activeLayerId: project.activeLayerId,
        drawings: project.drawings || [],
        sheets: project.sheets || [],
        activeDrawingId: project.activeDrawingId || (project.drawings?.[0]?.id ?? ''),
        activeSheetId: project.activeSheetId ?? null,
        drawingViewports: project.drawingViewports || {},
        sheetViewports: project.sheetViewports || {},
        filePath,
        projectName: fileName,
        isModified: false,
        projectInfo: project.projectInfo || { ...DEFAULT_PROJECT_INFO },
      });

      // Restore snap settings from project
      if (project.settings) {
        const store = useAppStore.getState();
        store.setGridSize(project.settings.gridSize);
        if (store.gridVisible !== project.settings.gridVisible) store.toggleGrid();
        if (store.snapEnabled !== project.settings.snapEnabled) store.toggleSnap();
      }

      // Restore project-level filled region types (backward compatible)
      if (project.filledRegionTypes && project.filledRegionTypes.length > 0) {
        useAppStore.getState().setProjectFilledRegionTypes(project.filledRegionTypes);
      }
      // Restore project info (backward compatible)
      if (project.projectInfo) {
        useAppStore.getState().setProjectInfo(project.projectInfo);
      }
      // Restore unit settings (backward compatible)
      if (project.unitSettings) {
        useAppStore.getState().setUnitSettings(project.unitSettings);
      }
      // Restore block definitions (backward compatible)
      if (project.blockDefinitions && project.blockDefinitions.length > 0) {
        useAppStore.getState().addBlockDefinitions(project.blockDefinitions);
      }

      // Close the previous empty untitled tab
      if (isEmptyUntitled) {
        useAppStore.getState().closeDocument(prevDocId);
      }
      logger.info(`Opened project: ${fileName}`, 'File');
    } catch (err) {
      await showError(`Failed to open file: ${err}`);
    }
  }, [addShapes]);

  const handleSave = useCallback(async () => {
    const s = useAppStore.getState();
    let filePath = s.currentFilePath;

    if (!filePath) {
      filePath = await showSaveDialog(s.projectName);
      if (!filePath) return;
    }

    try {
      // Collect non-built-in filled region types for saving with project
      const customRegionTypes = s.filledRegionTypes.filter(t => !t.isBuiltIn);
      const project: ProjectFile = {
        version: 3,
        name: s.projectName,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        drawings: s.drawings,
        sheets: s.sheets,
        activeDrawingId: s.activeDrawingId,
        activeSheetId: s.activeSheetId,
        drawingViewports: s.drawingViewports,
        sheetViewports: s.sheetViewports,
        shapes: s.shapes,
        layers: s.layers,
        activeLayerId: s.activeLayerId,
        settings: {
          gridSize: s.gridSize,
          gridVisible: s.gridVisible,
          snapEnabled: s.snapEnabled,
        },
        savedPrintPresets: Object.keys(s.savedPrintPresets).length > 0 ? s.savedPrintPresets : undefined,
        filledRegionTypes: customRegionTypes.length > 0 ? customRegionTypes : undefined,
        projectInfo: {
          ...s.projectInfo,
          erpnext: { ...s.projectInfo.erpnext, apiSecret: '' },
        },
        unitSettings: s.unitSettings,
        blockDefinitions: s.blockDefinitions.length > 0 ? s.blockDefinitions : undefined,
      };

      await writeProjectFile(filePath, project);
      setFilePath(filePath);
      setModified(false);

      const fileName = filePath.split(/[/\\]/).pop()?.replace('.o2d', '') || 'Untitled';
      setProjectName(fileName);
      logger.info(`Project saved: ${fileName}`, 'File');
    } catch (err) {
      await showError(`Failed to save file: ${err}`);
    }
  }, [setFilePath, setModified, setProjectName]);

  const handleSaveAs = useCallback(async () => {
    const s = useAppStore.getState();
    const filePath = await showSaveDialog(s.projectName);
    if (!filePath) return;

    try {
      const customRegionTypes = s.filledRegionTypes.filter(t => !t.isBuiltIn);
      const project: ProjectFile = {
        version: 3,
        name: s.projectName,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        drawings: s.drawings,
        sheets: s.sheets,
        activeDrawingId: s.activeDrawingId,
        activeSheetId: s.activeSheetId,
        drawingViewports: s.drawingViewports,
        sheetViewports: s.sheetViewports,
        shapes: s.shapes,
        layers: s.layers,
        activeLayerId: s.activeLayerId,
        settings: {
          gridSize: s.gridSize,
          gridVisible: s.gridVisible,
          snapEnabled: s.snapEnabled,
        },
        savedPrintPresets: Object.keys(s.savedPrintPresets).length > 0 ? s.savedPrintPresets : undefined,
        filledRegionTypes: customRegionTypes.length > 0 ? customRegionTypes : undefined,
        projectInfo: {
          ...s.projectInfo,
          erpnext: { ...s.projectInfo.erpnext, apiSecret: '' },
        },
        unitSettings: s.unitSettings,
        blockDefinitions: s.blockDefinitions.length > 0 ? s.blockDefinitions : undefined,
      };

      await writeProjectFile(filePath, project);
      setFilePath(filePath);
      setModified(false);

      const fileName = filePath.split(/[/\\]/).pop()?.replace('.o2d', '') || 'Untitled';
      setProjectName(fileName);
      logger.info(`Project saved as: ${fileName}`, 'File');
    } catch (err) {
      await showError(`Failed to save file: ${err}`);
    }
  }, [setFilePath, setModified, setProjectName]);

  const handleExport = useCallback(async () => {
    const s = useAppStore.getState();
    if (s.shapes.length === 0) {
      await showInfo('Nothing to export. Draw some shapes first.');
      return;
    }

    const filePath = await showExportAllFormatsDialog(s.projectName);
    if (!filePath) return;

    try {
      const extension = filePath.split('.').pop()?.toLowerCase();
      let content: string;

      if (extension === 'ifc') {
        const customPatterns = [...s.userPatterns, ...s.projectPatterns];
        content = exportToIFC(s.shapes, s.layers, customPatterns);
      } else if (extension === 'dxf') {
        content = exportToDXF(s.shapes, s.unitSettings, s.blockDefinitions);
      } else if (extension === 'json') {
        content = JSON.stringify({ shapes: s.shapes, layers: s.layers }, null, 2);
      } else {
        content = exportToSVG(s.shapes, undefined, undefined, s.blockDefinitions);
      }

      await writeTextFile(filePath, content);
      await showInfo(`Exported successfully to ${filePath}`);
    } catch (err) {
      await showError(`Failed to export: ${err}`);
    }
  }, []);

  const handleExportSVG = useCallback(async () => {
    const s = useAppStore.getState();
    if (s.shapes.length === 0) { await showInfo('Nothing to export. Draw some shapes first.'); return; }
    const filePath = await showExportDialog('svg', s.projectName);
    if (!filePath) return;
    try {
      await writeTextFile(filePath, exportToSVG(s.shapes, undefined, undefined, s.blockDefinitions));
      await showInfo(`Exported successfully to ${filePath}`);
    } catch (err) { await showError(`Failed to export: ${err}`); }
  }, []);

  const handleExportDXF = useCallback(async () => {
    const s = useAppStore.getState();
    if (s.shapes.length === 0) { await showInfo('Nothing to export. Draw some shapes first.'); return; }
    const filePath = await showExportDialog('dxf', s.projectName);
    if (!filePath) return;
    try {
      await writeTextFile(filePath, exportToDXF(s.shapes, s.unitSettings, s.blockDefinitions));
      await showInfo(`Exported successfully to ${filePath}`);
    } catch (err) { await showError(`Failed to export: ${err}`); }
  }, []);

  const handleExportIFC = useCallback(async () => {
    const s = useAppStore.getState();
    if (s.shapes.length === 0) { await showInfo('Nothing to export. Draw some shapes first.'); return; }
    const filePath = await showExportDialog('ifc', s.projectName);
    if (!filePath) return;
    try {
      const customPatterns = [...s.userPatterns, ...s.projectPatterns];
      await writeTextFile(filePath, exportToIFC(s.shapes, s.layers, customPatterns));
      await showInfo(`Exported successfully to ${filePath}`);
    } catch (err) { await showError(`Failed to export: ${err}`); }
  }, []);

  const handleExportJSON = useCallback(async () => {
    const s = useAppStore.getState();
    if (s.shapes.length === 0) { await showInfo('Nothing to export. Draw some shapes first.'); return; }
    const filePath = await showExportDialog('json', s.projectName);
    if (!filePath) return;
    try {
      await writeTextFile(filePath, JSON.stringify({ shapes: s.shapes, layers: s.layers }, null, 2));
      await showInfo(`Exported successfully to ${filePath}`);
    } catch (err) { await showError(`Failed to export: ${err}`); }
  }, []);

  const handleImportDXF = useCallback(async () => {
    const filePath = await showImportDxfDialog();
    if (!filePath) return;

    try {
      const content = await readTextFile(filePath);
      const s = useAppStore.getState();
      const { shapes, blockDefinitions } = parseDXF(content, s.activeLayerId, s.activeDrawingId);
      if (shapes.length === 0) {
        await showInfo('No supported entities found in the DXF file.\n\nSupported entities: LINE, CIRCLE, ARC, ELLIPSE, POLYLINE, LWPOLYLINE, SPLINE, TEXT, MTEXT, POINT, SOLID, 3DFACE, TRACE, INSERT');
        return;
      }

      addShapes(shapes);
      if (blockDefinitions.length > 0) {
        useAppStore.getState().addBlockDefinitions(blockDefinitions);
      }

      // Detect and apply DXF units
      const dxfUnit = parseDXFInsUnits(content);
      if (dxfUnit) {
        useAppStore.getState().setLengthUnit(dxfUnit);
      }
      logger.info(`Imported DXF: ${shapes.length} entities (${blockDefinitions.length} block definitions)`, 'File');
    } catch (err) {
      await showError(`Failed to import DXF: ${err}`);
    }
  }, [addShapes]);

  const handlePrint = useCallback(() => {
    setPrintDialogOpen(true);
  }, [setPrintDialogOpen]);

  const handleExit = useCallback(() => {
    getCurrentWindow().close();
  }, []);

  return { handleNew, handleOpen, handleSave, handleSaveAs, handleExport, handleExportSVG, handleExportDXF, handleExportIFC, handleExportJSON, handleImportDXF, handlePrint, handleExit };
}
