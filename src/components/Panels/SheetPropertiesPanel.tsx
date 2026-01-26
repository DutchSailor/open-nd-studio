import { useState, useCallback } from 'react';
import { useAppStore } from '../../state/appStore';

export function SheetPropertiesPanel() {
  const {
    sheets,
    activeSheetId,
    drafts,
    addSheetViewport,
    updateSheetViewport,
    deleteSheetViewport,
    updateTitleBlockField,
    setTitleBlockVisible,
    // Viewport editing state (synced with canvas)
    viewportEditState,
    selectViewport,
    centerViewportOnDraft,
    fitViewportToDraft,
  } = useAppStore();

  const [isAddingViewport, setIsAddingViewport] = useState(false);
  const [newViewportDraftId, setNewViewportDraftId] = useState<string>('');

  // Use the global viewport selection state instead of local state
  const selectedViewportId = viewportEditState.selectedViewportId;

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  const handleAddViewport = useCallback(() => {
    if (!activeSheetId || !newViewportDraftId) return;

    // Add viewport with default size
    addSheetViewport(activeSheetId, newViewportDraftId, {
      x: 20,  // mm from left
      y: 20,  // mm from top
      width: 150,  // mm
      height: 100,  // mm
    });

    setIsAddingViewport(false);
    setNewViewportDraftId('');
  }, [activeSheetId, newViewportDraftId, addSheetViewport]);

  const handleDeleteViewport = useCallback((viewportId: string) => {
    if (!activeSheetId) return;
    deleteSheetViewport(activeSheetId, viewportId);
    // Selection is automatically cleared in the store if deleted viewport was selected
  }, [activeSheetId, deleteSheetViewport]);

  const handleViewportScaleChange = useCallback((viewportId: string, scaleStr: string) => {
    if (!activeSheetId) return;
    // Parse scale like "1:100" or "1:50"
    const match = scaleStr.match(/1:(\d+)/);
    if (match) {
      const scale = 1 / parseInt(match[1], 10);
      updateSheetViewport(activeSheetId, viewportId, { scale });
    }
  }, [activeSheetId, updateSheetViewport]);

  if (!activeSheet) {
    return (
      <div className="p-3 text-cad-text-dim text-sm">
        No sheet selected
      </div>
    );
  }

  const selectedViewport = selectedViewportId
    ? activeSheet.viewports.find(vp => vp.id === selectedViewportId)
    : null;

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Sheet Info */}
      <div className="p-3 border-b border-cad-border">
        <h3 className="font-medium text-cad-text mb-2">Sheet: {activeSheet.name}</h3>
        <div className="text-cad-text-dim text-xs">
          {activeSheet.paperSize} {activeSheet.orientation}
        </div>
      </div>

      {/* Viewports Section */}
      <div className="p-3 border-b border-cad-border">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-cad-text">Viewports</h4>
          <button
            onClick={() => setIsAddingViewport(true)}
            className="px-2 py-1 text-xs bg-cad-primary hover:bg-cad-primary-hover text-white"
            title="Add Viewport"
          >
            + Add
          </button>
        </div>

        {isAddingViewport && (
          <div className="mb-2 p-2 bg-cad-surface border border-cad-border">
            <label className="block text-xs text-cad-text-dim mb-1">Drawing:</label>
            <select
              value={newViewportDraftId}
              onChange={(e) => setNewViewportDraftId(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-cad-input border border-cad-border text-cad-text mb-2"
            >
              <option value="">Select draft...</option>
              {drafts.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <button
                onClick={handleAddViewport}
                disabled={!newViewportDraftId}
                className="flex-1 px-2 py-1 text-xs bg-cad-primary hover:bg-cad-primary-hover disabled:bg-cad-input disabled:text-cad-text-dim text-white"
              >
                Create
              </button>
              <button
                onClick={() => { setIsAddingViewport(false); setNewViewportDraftId(''); }}
                className="px-2 py-1 text-xs bg-cad-input hover:bg-cad-hover text-cad-text"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Viewport List */}
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {activeSheet.viewports.length === 0 ? (
            <div className="text-xs text-cad-text-dim italic">No viewports</div>
          ) : (
            activeSheet.viewports.map(vp => {
              const draft = drafts.find(d => d.id === vp.draftId);
              const isSelected = selectedViewportId === vp.id;
              return (
                <div
                  key={vp.id}
                  onClick={() => selectViewport(isSelected ? null : vp.id)}
                  className={`flex items-center justify-between px-2 py-1 cursor-pointer ${
                    isSelected
                      ? 'bg-cad-primary text-white'
                      : 'bg-cad-input hover:bg-cad-hover text-cad-text'
                  }`}
                >
                  <span className="text-xs truncate flex-1">
                    {draft?.name || 'Unknown'}
                    {vp.locked && <span className="ml-1 opacity-60">(locked)</span>}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteViewport(vp.id); }}
                    className="ml-1 text-xs opacity-60 hover:opacity-100"
                    title="Delete viewport"
                  >
                    x
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Viewport Properties */}
      {selectedViewport && (
        <div className="p-3 border-b border-cad-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-cad-text">Viewport Properties</h4>
            <span className="text-xs px-1.5 py-0.5 bg-cad-primary/20 text-cad-primary border border-cad-primary/30">
              Selected
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => centerViewportOnDraft(selectedViewport.id)}
              disabled={selectedViewport.locked}
              className="flex-1 px-2 py-1.5 text-xs bg-cad-input border border-cad-border text-cad-text hover:bg-cad-hover disabled:opacity-50"
              title="Center view on draft boundary"
            >
              Center
            </button>
            <button
              onClick={() => fitViewportToDraft(selectedViewport.id)}
              disabled={selectedViewport.locked}
              className="flex-1 px-2 py-1.5 text-xs bg-cad-input border border-cad-border text-cad-text hover:bg-cad-hover disabled:opacity-50"
              title="Fit view to show entire draft"
            >
              Fit to Draft
            </button>
          </div>

          <div className="space-y-2">
            {/* Scale */}
            <div>
              <label className="block text-xs text-cad-text-dim mb-1">Scale:</label>
              <select
                value={`1:${Math.round(1 / selectedViewport.scale)}`}
                onChange={(e) => handleViewportScaleChange(selectedViewport.id, e.target.value)}
                className="w-full px-2 py-1 text-xs bg-cad-input border border-cad-border text-cad-text"
                disabled={selectedViewport.locked}
              >
                <option value="1:1">1:1</option>
                <option value="1:2">1:2</option>
                <option value="1:5">1:5</option>
                <option value="1:10">1:10</option>
                <option value="1:20">1:20</option>
                <option value="1:50">1:50</option>
                <option value="1:100">1:100</option>
                <option value="1:200">1:200</option>
                <option value="1:500">1:500</option>
                <option value="1:1000">1:1000</option>
              </select>
            </div>

            {/* Position */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-cad-text-dim mb-1">X (mm):</label>
                <input
                  type="number"
                  value={Math.round(selectedViewport.x)}
                  onChange={(e) => updateSheetViewport(activeSheetId!, selectedViewport.id, { x: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-1 text-xs bg-cad-input border border-cad-border text-cad-text"
                  disabled={selectedViewport.locked}
                />
              </div>
              <div>
                <label className="block text-xs text-cad-text-dim mb-1">Y (mm):</label>
                <input
                  type="number"
                  value={Math.round(selectedViewport.y)}
                  onChange={(e) => updateSheetViewport(activeSheetId!, selectedViewport.id, { y: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-1 text-xs bg-cad-input border border-cad-border text-cad-text"
                  disabled={selectedViewport.locked}
                />
              </div>
            </div>

            {/* Size */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-cad-text-dim mb-1">Width (mm):</label>
                <input
                  type="number"
                  min="20"
                  value={Math.round(selectedViewport.width)}
                  onChange={(e) => updateSheetViewport(activeSheetId!, selectedViewport.id, { width: Math.max(20, parseFloat(e.target.value) || 20) })}
                  className="w-full px-2 py-1 text-xs bg-cad-input border border-cad-border text-cad-text"
                  disabled={selectedViewport.locked}
                />
              </div>
              <div>
                <label className="block text-xs text-cad-text-dim mb-1">Height (mm):</label>
                <input
                  type="number"
                  min="20"
                  value={Math.round(selectedViewport.height)}
                  onChange={(e) => updateSheetViewport(activeSheetId!, selectedViewport.id, { height: Math.max(20, parseFloat(e.target.value) || 20) })}
                  className="w-full px-2 py-1 text-xs bg-cad-input border border-cad-border text-cad-text"
                  disabled={selectedViewport.locked}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="vp-locked"
                  checked={selectedViewport.locked}
                  onChange={(e) => updateSheetViewport(activeSheetId!, selectedViewport.id, { locked: e.target.checked })}
                  className="w-3 h-3"
                />
                <label htmlFor="vp-locked" className="text-xs text-cad-text">Locked</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="vp-visible"
                  checked={selectedViewport.visible}
                  onChange={(e) => updateSheetViewport(activeSheetId!, selectedViewport.id, { visible: e.target.checked })}
                  className="w-3 h-3"
                />
                <label htmlFor="vp-visible" className="text-xs text-cad-text">Visible</label>
              </div>
            </div>

            {/* Tip for interaction */}
            {!selectedViewport.locked && (
              <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <strong>Tip:</strong> Drag handles on canvas to resize. Drag center to move.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Title Block Section */}
      <div className="p-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-cad-text">Title Block</h4>
          <input
            type="checkbox"
            checked={activeSheet.titleBlock.visible}
            onChange={(e) => setTitleBlockVisible(activeSheetId!, e.target.checked)}
            className="w-3 h-3"
            title="Show/Hide Title Block"
          />
        </div>

        {activeSheet.titleBlock.visible && (
          <div className="space-y-2">
            {activeSheet.titleBlock.fields.map(field => (
              <div key={field.id}>
                <label className="block text-xs text-cad-text-dim mb-1">{field.label}:</label>
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => updateTitleBlockField(activeSheetId!, field.id, e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-cad-input border border-cad-border text-cad-text"
                  placeholder={field.label}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
