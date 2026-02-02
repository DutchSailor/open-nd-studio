import { useState } from 'react';
import { X } from 'lucide-react';
import type { Sheet } from '../../types/geometry';

interface SheetSelectionDialogProps {
  sheets: Sheet[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  onCancel: () => void;
}

export function SheetSelectionDialog({ sheets, selectedIds, onConfirm, onCancel }: SheetSelectionDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div className="bg-cad-surface border border-cad-border rounded-lg shadow-xl w-[360px] max-h-[60vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-cad-border">
          <h3 className="text-sm font-semibold text-cad-text">Select Sheets</h3>
          <button onClick={onCancel} className="text-cad-text-dim hover:text-cad-text">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 px-4 pt-2">
          <button
            onClick={() => setSelected(new Set(sheets.map(s => s.id)))}
            className="text-xs text-cad-accent hover:underline"
          >
            Select All
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-cad-accent hover:underline"
          >
            Deselect All
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {sheets.length === 0 ? (
            <p className="text-xs text-cad-text-dim">No sheets available.</p>
          ) : (
            sheets.map(sheet => (
              <label key={sheet.id} className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={selected.has(sheet.id)}
                  onChange={() => toggle(sheet.id)}
                  className="accent-cad-accent"
                />
                <span className="text-sm text-cad-text">{sheet.name}</span>
                <span className="text-xs text-cad-text-dim ml-auto">
                  {sheet.paperSize} {sheet.orientation}
                </span>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-2 border-t border-cad-border">
          <button onClick={onCancel} className="px-3 py-1 text-sm text-cad-text hover:bg-cad-border rounded">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            className="px-3 py-1 text-sm bg-cad-accent text-white rounded hover:bg-cad-accent/80"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
