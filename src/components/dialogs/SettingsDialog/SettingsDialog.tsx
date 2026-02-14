import { Crosshair, Grid3x3, Monitor, Ruler } from 'lucide-react';
import { DraggableModal, ModalButton } from '../../shared/DraggableModal';
import { useAppStore } from '../../../state/appStore';
import type { SettingsDialogTab } from '../../../state/slices/uiSlice';
import { DrawingAidsTab } from './DrawingAidsTab';
import { GridSnapTab } from './GridSnapTab';
import { DisplayTab } from './DisplayTab';
import { UnitsScaleTab } from './UnitsScaleTab';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const tabs: { id: SettingsDialogTab; label: string; icon: typeof Crosshair }[] = [
  { id: 'drawing-aids', label: 'Drawing Aids', icon: Crosshair },
  { id: 'grid-snap', label: 'Grid & Snap', icon: Grid3x3 },
  { id: 'display', label: 'Display', icon: Monitor },
  { id: 'units-scale', label: 'Units & Scale', icon: Ruler },
];

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const activeTab = useAppStore(s => s.settingsDialogTab);
  const setTab = useAppStore(s => s.setSettingsDialogTab);

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      width={600}
      height={520}
      resizable
      minWidth={500}
      minHeight={400}
      footer={<ModalButton onClick={onClose} variant="primary">Close</ModalButton>}
    >
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar tabs */}
        <div className="w-[140px] border-r border-cad-border bg-cad-bg flex flex-col py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-default ${
                  isActive
                    ? 'bg-cad-accent/20 text-cad-accent border-r-2 border-cad-accent'
                    : 'text-cad-text-dim hover:bg-cad-hover hover:text-cad-text'
                }`}
              >
                <Icon size={14} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right content area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'drawing-aids' && <DrawingAidsTab />}
          {activeTab === 'grid-snap' && <GridSnapTab />}
          {activeTab === 'display' && <DisplayTab />}
          {activeTab === 'units-scale' && <UnitsScaleTab />}
        </div>
      </div>
    </DraggableModal>
  );
}
