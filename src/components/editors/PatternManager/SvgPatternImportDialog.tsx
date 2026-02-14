/**
 * SvgPatternImportDialog - Selection dialog for importing multiple SVG patterns
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { DraggableModal, ModalButton } from '../../shared/DraggableModal';
import type { ParsedSvgPattern } from '../../../services/export/svgPatternService';
import { svgToImage } from '../../../services/export/svgPatternService';

interface SvgPatternImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patterns: ParsedSvgPattern[];
  onImport: (selected: ParsedSvgPattern[]) => void;
}

interface PatternGroup {
  key: string;
  label: string;
  patterns: ParsedSvgPattern[];
  subGroups?: PatternGroup[];
}

/**
 * Auto-group patterns by ID prefix:
 * - NEN47_<num>_<material>_... → "NEN47 Standard" > "<num> <Material>"
 * - CUST_NEN47_<num>_<material>_... → "Custom NEN47" > "<num> <Material>"
 * - Everything else → "Basic"
 */
function groupPatterns(patterns: ParsedSvgPattern[]): PatternGroup[] {
  const basic: ParsedSvgPattern[] = [];
  const nen47Map = new Map<string, ParsedSvgPattern[]>();
  const custNen47Map = new Map<string, ParsedSvgPattern[]>();

  for (const p of patterns) {
    const custMatch = p.id.match(/^CUST_NEN47_(\d+)_([^_]+(?:_[^_]+)*?)_\d+$/i);
    if (custMatch) {
      const subKey = `${custMatch[1]}_${custMatch[2]}`;
      if (!custNen47Map.has(subKey)) custNen47Map.set(subKey, []);
      custNen47Map.get(subKey)!.push(p);
      continue;
    }

    const nen47Match = p.id.match(/^NEN47_(\d+)_([^_]+(?:_[^_]+)*?)_\d+$/i);
    if (nen47Match) {
      const subKey = `${nen47Match[1]}_${nen47Match[2]}`;
      if (!nen47Map.has(subKey)) nen47Map.set(subKey, []);
      nen47Map.get(subKey)!.push(p);
      continue;
    }

    basic.push(p);
  }

  const formatSubGroupLabel = (key: string): string => {
    const parts = key.split('_');
    const num = parts[0];
    const name = parts.slice(1).join(' ').replace(/\b\w/g, c => c.toUpperCase());
    return `${num} ${name}`;
  };

  const buildSubGroups = (map: Map<string, ParsedSvgPattern[]>): PatternGroup[] => {
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        const numA = parseInt(a.split('_')[0]);
        const numB = parseInt(b.split('_')[0]);
        return numA - numB;
      })
      .map(([key, pats]) => ({
        key,
        label: formatSubGroupLabel(key),
        patterns: pats,
      }));
  };

  const groups: PatternGroup[] = [];

  if (basic.length > 0) {
    groups.push({ key: 'basic', label: 'Basic', patterns: basic });
  }
  if (nen47Map.size > 0) {
    const allNen47 = Array.from(nen47Map.values()).flat();
    groups.push({
      key: 'nen47',
      label: 'NEN47 Standard',
      patterns: allNen47,
      subGroups: buildSubGroups(nen47Map),
    });
  }
  if (custNen47Map.size > 0) {
    const allCust = Array.from(custNen47Map.values()).flat();
    groups.push({
      key: 'cust_nen47',
      label: 'Custom NEN47',
      patterns: allCust,
      subGroups: buildSubGroups(custNen47Map),
    });
  }

  return groups;
}

function filterPatterns(patterns: ParsedSvgPattern[], search: string): ParsedSvgPattern[] {
  if (!search.trim()) return patterns;
  const lower = search.toLowerCase();
  return patterns.filter(p =>
    p.id.toLowerCase().includes(lower) || p.name.toLowerCase().includes(lower)
  );
}

/** Lazy SVG preview that only renders when visible */
function SvgPreviewTile({ svgContent, width, height }: { svgContent: string; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || rendered) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    svgToImage(svgContent)
      .then(img => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        setRendered(true);
      })
      .catch(() => {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#999';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', width / 2, height / 2 + 3);
      });
  }, [isVisible, rendered, svgContent, width, height]);

  return (
    <div ref={containerRef} className="flex-shrink-0">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-cad-border bg-white"
        style={{ width, height }}
      />
    </div>
  );
}

export function SvgPatternImportDialog({
  isOpen,
  onClose,
  patterns,
  onImport,
}: SvgPatternImportDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  // Start with all groups collapsed except basic
  useEffect(() => {
    if (isOpen) {
      setCollapsed(new Set(['nen47', 'cust_nen47']));
      setSelected(new Set());
      setSearch('');
    }
  }, [isOpen]);

  const filteredPatterns = useMemo(() => filterPatterns(patterns, search), [patterns, search]);
  const groups = useMemo(() => groupPatterns(filteredPatterns), [filteredPatterns]);

  const totalFiltered = filteredPatterns.length;
  const selectedCount = useMemo(() => {
    return filteredPatterns.filter(p => selected.has(p.id)).length;
  }, [filteredPatterns, selected]);

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const togglePattern = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((patternIds: string[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = patternIds.every(id => next.has(id));
      if (allSelected) {
        patternIds.forEach(id => next.delete(id));
      } else {
        patternIds.forEach(id => next.add(id));
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(filteredPatterns.map(p => p.id)));
  }, [filteredPatterns]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleImport = useCallback(() => {
    const selectedPatterns = patterns.filter(p => selected.has(p.id));
    onImport(selectedPatterns);
  }, [patterns, selected, onImport]);

  const getGroupCheckState = (ids: string[]): 'all' | 'some' | 'none' => {
    const count = ids.filter(id => selected.has(id)).length;
    if (count === 0) return 'none';
    if (count === ids.length) return 'all';
    return 'some';
  };

  const renderPatternRow = (p: ParsedSvgPattern) => (
    <label
      key={p.id}
      className="flex items-center gap-2 px-2 py-1 hover:bg-cad-hover cursor-pointer"
    >
      <input
        type="checkbox"
        checked={selected.has(p.id)}
        onChange={() => togglePattern(p.id)}
        className="accent-cad-accent flex-shrink-0"
      />
      <SvgPreviewTile svgContent={p.svgContent} width={24} height={18} />
      <span className="text-xs truncate" title={p.id}>{p.name}</span>
      {p.tileRotation != null && p.tileRotation !== 0 && (
        <span className="text-[10px] text-cad-text-dim ml-auto flex-shrink-0">{p.tileRotation}°</span>
      )}
    </label>
  );

  const renderSubGroup = (sub: PatternGroup, parentKey: string) => {
    const collapseKey = `${parentKey}/${sub.key}`;
    const isCollapsed = collapsed.has(collapseKey);
    const ids = sub.patterns.map(p => p.id);
    const checkState = getGroupCheckState(ids);

    return (
      <div key={collapseKey} className="ml-4">
        <div className="flex items-center gap-1 px-1 py-0.5">
          <button
            onClick={() => toggleCollapse(collapseKey)}
            className="p-0.5 hover:bg-cad-hover rounded"
          >
            {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
          </button>
          <input
            type="checkbox"
            checked={checkState === 'all'}
            ref={el => { if (el) el.indeterminate = checkState === 'some'; }}
            onChange={() => toggleGroup(ids)}
            className="accent-cad-accent"
          />
          <span className="text-xs font-medium">{sub.label}</span>
          <span className="text-[10px] text-cad-text-dim ml-1">({sub.patterns.length})</span>
        </div>
        {!isCollapsed && (
          <div className="ml-4">
            {sub.patterns.map(renderPatternRow)}
          </div>
        )}
      </div>
    );
  };

  const renderGroup = (group: PatternGroup) => {
    const isCollapsed = collapsed.has(group.key);
    const ids = group.patterns.map(p => p.id);
    const checkState = getGroupCheckState(ids);

    return (
      <div key={group.key} className="mb-1">
        <div className="flex items-center gap-1 px-1 py-1">
          <button
            onClick={() => toggleCollapse(group.key)}
            className="p-0.5 hover:bg-cad-hover rounded"
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
          <input
            type="checkbox"
            checked={checkState === 'all'}
            ref={el => { if (el) el.indeterminate = checkState === 'some'; }}
            onChange={() => toggleGroup(ids)}
            className="accent-cad-accent"
          />
          <span className="text-xs font-semibold">{group.label}</span>
          <span className="text-[10px] text-cad-text-dim ml-1">({group.patterns.length})</span>
        </div>
        {!isCollapsed && (
          <>
            {group.subGroups
              ? group.subGroups.map(sub => renderSubGroup(sub, group.key))
              : <div className="ml-6">{group.patterns.map(renderPatternRow)}</div>
            }
          </>
        )}
      </div>
    );
  };

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Import SVG Patterns"
      width={500}
      height={520}
      zIndex={60}
      resizable
      minWidth={350}
      minHeight={300}
      footer={
        <>
          <ModalButton onClick={onClose} variant="secondary">
            Cancel
          </ModalButton>
          <ModalButton
            onClick={handleImport}
            variant="primary"
            disabled={selectedCount === 0}
          >
            Import ({selectedCount})
          </ModalButton>
        </>
      }
    >
      <div className="flex flex-col h-full">
        {/* Search bar */}
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center gap-1.5 bg-cad-input border border-cad-border px-2 py-1 rounded">
            <Search size={12} className="text-cad-text-dim flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patterns..."
              className="bg-transparent text-xs w-full outline-none text-cad-text placeholder:text-cad-text-dim"
            />
          </div>
        </div>

        {/* Select All / Deselect All + count */}
        <div className="flex items-center gap-2 px-3 py-1 border-b border-cad-border">
          <button onClick={selectAll} className="text-xs text-cad-accent hover:underline">
            Select All
          </button>
          <button onClick={deselectAll} className="text-xs text-cad-accent hover:underline">
            Deselect All
          </button>
          <span className="text-[10px] text-cad-text-dim ml-auto">
            {selectedCount} selected / {totalFiltered}
          </span>
        </div>

        {/* Pattern tree */}
        <div className="flex-1 overflow-y-auto p-1">
          {groups.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-cad-text-dim">
              {search ? 'No patterns match your search' : 'No patterns found'}
            </div>
          ) : (
            groups.map(renderGroup)
          )}
        </div>
      </div>
    </DraggableModal>
  );
}
