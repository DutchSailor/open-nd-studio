import { useAppStore } from '../../../state/appStore';
import { UI_THEMES } from '../../../state/slices/snapSlice';
import type { UITheme } from '../../../state/slices/snapSlice';

export function DisplayTab() {
  const uiTheme = useAppStore(s => s.uiTheme);
  const setUITheme = useAppStore(s => s.setUITheme);
  const whiteBackground = useAppStore(s => s.whiteBackground);
  const toggleWhiteBackground = useAppStore(s => s.toggleWhiteBackground);
  const boundaryVisible = useAppStore(s => s.boundaryVisible);
  const toggleBoundaryVisible = useAppStore(s => s.toggleBoundaryVisible);
  const showLineweight = useAppStore(s => s.showLineweight);
  const toggleShowLineweight = useAppStore(s => s.toggleShowLineweight);

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4">
      {/* Theme */}
      <fieldset className="border border-cad-border rounded px-3 pb-3 pt-1">
        <legend className="text-xs font-semibold px-1">Theme</legend>
        <div className="mt-2">
          <label className="text-xs font-medium block mb-1">UI Theme</label>
          <select
            value={uiTheme}
            onChange={(e) => setUITheme(e.target.value as UITheme)}
            className="bg-cad-bg border border-cad-border text-cad-text text-xs px-2 py-1 rounded outline-none focus:border-cad-accent w-full"
          >
            {UI_THEMES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Background */}
      <fieldset className="border border-cad-border rounded px-3 pb-3 pt-1">
        <legend className="text-xs font-semibold px-1">Background</legend>
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-xs font-medium">White Background</span>
            <p className="text-[10px] text-cad-text-dim">Use white canvas background instead of dark</p>
          </div>
          <ToggleSwitch checked={whiteBackground} onChange={toggleWhiteBackground} />
        </div>
      </fieldset>

      {/* Drawing Boundary */}
      <fieldset className="border border-cad-border rounded px-3 pb-3 pt-1">
        <legend className="text-xs font-semibold px-1">Drawing Boundary</legend>
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-xs font-medium">Show Boundary</span>
            <p className="text-[10px] text-cad-text-dim">Display drawing boundary rectangle</p>
          </div>
          <ToggleSwitch checked={boundaryVisible} onChange={toggleBoundaryVisible} />
        </div>
      </fieldset>

      {/* Lineweight Display */}
      <fieldset className="border border-cad-border rounded px-3 pb-3 pt-1">
        <legend className="text-xs font-semibold px-1">Lineweight Display</legend>
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-xs font-medium">Show Lineweight</span>
            <p className="text-[10px] text-cad-text-dim">Display actual line weights on canvas</p>
          </div>
          <ToggleSwitch checked={showLineweight} onChange={toggleShowLineweight} />
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
