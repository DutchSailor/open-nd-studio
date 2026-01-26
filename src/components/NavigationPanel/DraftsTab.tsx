import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useAppStore } from '../../state/appStore';

export function DraftsTab() {
  const {
    drafts,
    activeDraftId,
    editorMode,
    addDraft,
    deleteDraft,
    renameDraft,
    switchToDraft,
  } = useAppStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleConfirmEdit = () => {
    if (editingId && editName.trim()) {
      renameDraft(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Add button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cad-border">
        <span className="text-xs text-cad-text-dim">Model Space</span>
        <button
          onClick={() => addDraft()}
          className="p-1 rounded hover:bg-cad-border transition-colors"
          title="Add Draft"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Drafts List */}
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-1">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                draft.id === activeDraftId && editorMode === 'draft'
                  ? 'bg-cad-accent/20 border border-cad-accent'
                  : 'hover:bg-cad-border/50 border border-transparent'
              }`}
              onClick={() => switchToDraft(draft.id)}
              onDoubleClick={() => handleStartEdit(draft.id, draft.name)}
            >
              {editingId === draft.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-cad-bg border border-cad-accent rounded px-1 py-0.5 text-xs text-cad-text outline-none"
                    autoFocus
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmEdit();
                    }}
                    className="p-0.5 rounded hover:bg-cad-border text-green-400"
                    title="Confirm"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEdit();
                    }}
                    className="p-0.5 rounded hover:bg-cad-border text-red-400"
                    title="Cancel"
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <>
                  {/* Draft icon */}
                  <div className="w-3 h-3 rounded-sm bg-cad-accent/50" />

                  {/* Draft name */}
                  <span className="flex-1 text-xs text-cad-text truncate">
                    {draft.name}
                  </span>

                  {/* Edit button (visible on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(draft.id, draft.name);
                    }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-cad-border text-cad-text-dim hover:text-cad-text transition-all"
                    title="Rename"
                  >
                    <Pencil size={12} />
                  </button>

                  {/* Delete button (visible on hover, only if more than one draft) */}
                  {drafts.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDraft(draft.id);
                      }}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-cad-border text-cad-text-dim hover:text-red-400 transition-all"
                      title="Delete Draft"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
