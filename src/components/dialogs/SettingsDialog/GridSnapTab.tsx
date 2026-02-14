import { useAppStore } from '../../../state/appStore';
import { formatLength } from '../../../units';

export function GridSnapTab() {
  const gridVisible = useAppStore(s => s.gridVisible);
  const toggleGrid = useAppStore(s => s.toggleGrid);
  const gridSize = useAppStore(s => s.gridSize);
  const setGridSize = useAppStore(s => s.setGridSize);
  const activeSnaps = useAppStore(s => s.activeSnaps);
  const toggleSnapType = useAppStore(s => s.toggleSnapType);
  const unitSettings = useAppStore(s => s.unitSettings);

  const gridSnapEnabled = activeSnaps.includes('grid');

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4">
      {/* Grid Settings */}
      <fieldset className="border border-cad-border rounded px-3 pb-3 pt-1">
        <legend className="text-xs font-semibold px-1">Grid</legend>

        <div className="flex items-center justify-between mt-2 mb-3">
          <div>
            <span className="text-xs font-medium">Show Grid</span>
            <p className="text-[10px] text-cad-text-dim">Display grid lines on the canvas</p>
          </div>
          <ToggleSwitch checked={gridVisible} onChange={toggleGrid} />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1">
            Grid Size ({unitSettings.lengthUnit})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="10000"
              value={gridSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 1) setGridSize(val);
              }}
              className="bg-cad-bg border border-cad-border text-cad-text text-xs px-2 py-1 rounded outline-none focus:border-cad-accent w-24"
            />
            <span className="text-[10px] text-cad-text-dim">
              Current: {formatLength(gridSize, unitSettings)}
            </span>
          </div>
        </div>
      </fieldset>

      {/* Snap to Grid */}
      <fieldset className="border border-cad-border rounded px-3 pb-3 pt-1">
        <legend className="text-xs font-semibold px-1">Snap to Grid</legend>

        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-xs font-medium">Enable Grid Snap</span>
            <p className="text-[10px] text-cad-text-dim">Snap cursor to grid intersections</p>
          </div>
          <ToggleSwitch checked={gridSnapEnabled} onChange={() => toggleSnapType('grid')} />
        </div>
      </fieldset>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
        checked ? 'bg-cad-accent' : 'bg-cad-border'
      }`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
