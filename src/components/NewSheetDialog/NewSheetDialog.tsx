/**
 * NewSheetDialog - Dialog for creating new sheets from templates
 */

import { useState, useMemo } from 'react';
import { X, FileText, Layout, Grid2X2, Columns, Square } from 'lucide-react';
import { useAppStore } from '../../state/appStore';
import { BUILT_IN_SHEET_TEMPLATES } from '../../services/sheetTemplateService';
import type { SheetTemplate, ViewportPlaceholder } from '../../types/sheet';

interface NewSheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewSheetDialog({ isOpen, onClose }: NewSheetDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [sheetName, setSheetName] = useState('');
  const [drawingAssignments, setDraftAssignments] = useState<Record<string, string>>({});
  const [selectedPaperSize, setSelectedPaperSize] = useState<string>('A3');

  const { drawings, customSheetTemplates, addSheetFromTemplate, sheets } = useAppStore();

  // Combine built-in and custom templates
  const allTemplates = useMemo(() => {
    return [...BUILT_IN_SHEET_TEMPLATES, ...customSheetTemplates];
  }, [customSheetTemplates]);

  // Filter templates by selected paper size
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(t => t.paperSize === selectedPaperSize);
  }, [allTemplates, selectedPaperSize]);

  // Get unique paper sizes
  const paperSizes = useMemo(() => {
    const sizes = new Set(allTemplates.map(t => t.paperSize));
    return Array.from(sizes).sort();
  }, [allTemplates]);

  const selectedTemplate = allTemplates.find(t => t.id === selectedTemplateId);

  const handleCreate = () => {
    if (!selectedTemplateId) return;

    const name = sheetName.trim() || `Sheet ${sheets.length + 1}`;
    addSheetFromTemplate(selectedTemplateId, name, drawingAssignments);

    // Reset and close
    setSelectedTemplateId('');
    setSheetName('');
    setDraftAssignments({});
    onClose();
  };

  const handleAssignDraft = (placeholderId: string, draftId: string) => {
    setDraftAssignments(prev => ({
      ...prev,
      [placeholderId]: draftId,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-cad-surface border border-cad-border shadow-xl w-[700px] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-cad-border"
          style={{ background: 'linear-gradient(to bottom, #ffffff, #f5f5f5)', borderColor: '#d4d4d4' }}
        >
          <h2 className="text-sm font-semibold text-gray-800">New Sheet from Template</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500 hover:text-white rounded transition-colors text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Template Selection */}
          <div className="w-1/2 border-r border-cad-border flex flex-col">
            {/* Paper Size Filter */}
            <div className="p-3 border-b border-cad-border">
              <label className="block text-xs text-cad-text-dim mb-2">Paper Size:</label>
              <div className="flex flex-wrap gap-1">
                {paperSizes.map(size => (
                  <button
                    key={size}
                    onClick={() => {
                      setSelectedPaperSize(size);
                      setSelectedTemplateId('');
                    }}
                    className={`px-3 py-1 text-xs transition-colors ${
                      selectedPaperSize === size
                        ? 'bg-cad-accent text-white'
                        : 'bg-cad-input text-cad-text hover:bg-cad-hover'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {filteredTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplateId === template.id}
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      setDraftAssignments({});
                    }}
                  />
                ))}

                {filteredTemplates.length === 0 && (
                  <div className="text-center text-cad-text-dim py-8 text-sm">
                    No templates for {selectedPaperSize}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Configuration */}
          <div className="w-1/2 flex flex-col">
            {selectedTemplate ? (
              <>
                {/* Template Preview */}
                <div className="p-3 border-b border-cad-border">
                  <h3 className="text-sm font-medium text-cad-text mb-2">{selectedTemplate.name}</h3>
                  <p className="text-xs text-cad-text-dim mb-3">{selectedTemplate.description}</p>
                  <TemplatePreview template={selectedTemplate} />
                </div>

                {/* Sheet Name */}
                <div className="p-3 border-b border-cad-border">
                  <label className="block text-xs text-cad-text-dim mb-1">Sheet Name:</label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm bg-cad-input border border-cad-border text-cad-text"
                    placeholder={`Sheet ${sheets.length + 1}`}
                  />
                </div>

                {/* Viewport Assignments */}
                {selectedTemplate.viewportPlaceholders.length > 0 && (
                  <div className="flex-1 overflow-y-auto p-3">
                    <h4 className="text-xs font-medium text-cad-text-dim uppercase tracking-wider mb-2">
                      Assign Drafts to Viewports
                    </h4>
                    <p className="text-xs text-cad-text-dim mb-3">
                      Select which draft to show in each viewport. Leave empty to add later.
                    </p>

                    <div className="space-y-3">
                      {selectedTemplate.viewportPlaceholders.map(placeholder => (
                        <ViewportAssignment
                          key={placeholder.id}
                          placeholder={placeholder}
                          drawings={drawings}
                          selectedDraftId={drawingAssignments[placeholder.id] || ''}
                          onAssign={(draftId) => handleAssignDraft(placeholder.id, draftId)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedTemplate.viewportPlaceholders.length === 0 && (
                  <div className="flex-1 p-3">
                    <div className="text-center text-cad-text-dim py-8 text-sm">
                      This is a blank template. Add viewports after creating the sheet.
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-cad-text-dim text-sm">
                Select a template to continue
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-cad-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-cad-input border border-cad-border text-cad-text hover:bg-cad-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedTemplateId}
            className="px-4 py-1.5 text-sm bg-cad-accent text-white hover:bg-cad-accent/80 disabled:bg-cad-input disabled:text-cad-text-dim"
          >
            Create Sheet
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Template Card Component
// ============================================================================

interface TemplateCardProps {
  template: SheetTemplate;
  isSelected: boolean;
  onClick: () => void;
}

function TemplateCard({ template, isSelected, onClick }: TemplateCardProps) {
  const getTemplateIcon = () => {
    const count = template.viewportPlaceholders.length;
    if (count === 0) return <Square size={20} />;
    if (count === 1) return <FileText size={20} />;
    if (count === 2) return <Columns size={20} />;
    if (count === 4) return <Grid2X2 size={20} />;
    return <Layout size={20} />;
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 border cursor-pointer transition-colors ${
        isSelected
          ? 'border-cad-accent bg-cad-accent/10'
          : 'border-cad-border hover:border-cad-accent/50 hover:bg-cad-hover'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded ${isSelected ? 'bg-cad-accent text-white' : 'bg-cad-input text-cad-text-dim'}`}>
          {getTemplateIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-cad-text truncate">{template.name}</h4>
          <p className="text-xs text-cad-text-dim truncate">{template.description}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-cad-text-dim">
            <span>{template.orientation}</span>
            <span>-</span>
            <span>{template.viewportPlaceholders.length} viewport{template.viewportPlaceholders.length !== 1 ? 's' : ''}</span>
            {!template.isBuiltIn && (
              <>
                <span>-</span>
                <span className="text-cad-accent">Custom</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Template Preview Component
// ============================================================================

interface TemplatePreviewProps {
  template: SheetTemplate;
}

function TemplatePreview({ template }: TemplatePreviewProps) {
  // Calculate preview dimensions (scaled to fit in a box)
  const previewWidth = 200;
  const aspectRatio = template.orientation === 'landscape' ? 1.414 : 0.707; // A-series aspect ratio
  const previewHeight = template.orientation === 'landscape' ? previewWidth / aspectRatio : previewWidth * aspectRatio;

  // Get paper dimensions in mm for scaling
  const paperDims = getPaperDimensions(template.paperSize, template.orientation);
  const scaleX = previewWidth / paperDims.width;
  const scaleY = previewHeight / paperDims.height;

  return (
    <div
      className="bg-white border border-gray-300 relative mx-auto"
      style={{ width: previewWidth, height: previewHeight }}
    >
      {/* Viewport placeholders */}
      {template.viewportPlaceholders.map((placeholder, index) => (
        <div
          key={placeholder.id}
          className="absolute border border-blue-400 bg-blue-100/30 flex items-center justify-center"
          style={{
            left: placeholder.x * scaleX,
            top: placeholder.y * scaleY,
            width: placeholder.width * scaleX,
            height: placeholder.height * scaleY,
          }}
        >
          <span className="text-[8px] text-blue-600 font-medium">
            {index + 1}
          </span>
        </div>
      ))}

      {/* Title block area (bottom right) */}
      <div
        className="absolute bg-gray-200 border border-gray-400"
        style={{
          right: 5,
          bottom: 5,
          width: previewWidth * 0.4,
          height: previewHeight * 0.15,
        }}
      />
    </div>
  );
}

// Helper to get paper dimensions
function getPaperDimensions(paperSize: string, orientation: string): { width: number; height: number } {
  const sizes: Record<string, { width: number; height: number }> = {
    A4: { width: 210, height: 297 },
    A3: { width: 297, height: 420 },
    A2: { width: 420, height: 594 },
    A1: { width: 594, height: 841 },
    A0: { width: 841, height: 1189 },
  };

  const dims = sizes[paperSize] || sizes.A4;
  return orientation === 'landscape'
    ? { width: dims.height, height: dims.width }
    : dims;
}

// ============================================================================
// Viewport Assignment Component
// ============================================================================

interface ViewportAssignmentProps {
  placeholder: ViewportPlaceholder;
  drawings: { id: string; name: string }[];
  selectedDraftId: string;
  onAssign: (draftId: string) => void;
}

function ViewportAssignment({
  placeholder,
  drawings,
  selectedDraftId,
  onAssign,
}: ViewportAssignmentProps) {
  const scaleLabel = formatScale(placeholder.defaultScale);

  return (
    <div className="p-2 bg-cad-input border border-cad-border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-cad-text">{placeholder.name}</span>
        <span className="text-xs text-cad-text-dim">{scaleLabel}</span>
      </div>
      {placeholder.suggestedDrawingType && (
        <p className="text-xs text-cad-text-dim mb-2">
          Suggested: {placeholder.suggestedDrawingType}
        </p>
      )}
      <select
        value={selectedDraftId}
        onChange={(e) => onAssign(e.target.value)}
        className="w-full px-2 py-1 text-xs bg-cad-surface border border-cad-border text-cad-text"
      >
        <option value="">-- Leave empty --</option>
        {drawings.map(draft => (
          <option key={draft.id} value={draft.id}>
            {draft.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// Helper to format scale
function formatScale(scale: number): string {
  if (scale >= 1) {
    return `${Number.isInteger(scale) ? scale : scale.toFixed(1)}:1`;
  }
  const inverse = 1 / scale;
  return `1:${Number.isInteger(inverse) ? inverse : Math.round(inverse)}`;
}
