import { useAppStore } from '../../../state/appStore';
import type { LengthUnit, NumberFormat } from '../../../units/types';

const LENGTH_UNITS: { value: LengthUnit; label: string }[] = [
  { value: 'mm', label: 'Millimeters (mm)' },
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'm', label: 'Meters (m)' },
  { value: 'in', label: 'Inches (in)' },
  { value: 'ft', label: 'Feet (ft)' },
  { value: 'ft-in', label: 'Feet-Inches (ft-in)' },
];

export function UnitsScaleTab() {
  const unitSettings = useAppStore(s => s.unitSettings);
  const setLengthUnit = useAppStore(s => s.setLengthUnit);
  const setLengthPrecision = useAppStore(s => s.setLengthPrecision);
  const setAnglePrecision = useAppStore(s => s.setAnglePrecision);
  const setNumberFormat = useAppStore(s => s.setNumberFormat);
  const setShowUnitSuffix = useAppStore(s => s.setShowUnitSuffix);

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4">
      {/* Length Unit */}
      <fieldset className="border border-cad-border rounded px-3 pb-3 pt-1">
        <legend className="text-xs font-semibold px-1">Length Unit</legend>
        <div className="mt-2">
          <label className="text-xs font-medium block mb-1">Unit</label>
          <select
            value={unitSettings.lengthUnit}
            onChange={(e) => setLengthUnit(e.target.value as LengthUnit)}
            className="bg-cad-bg border border-cad-border text-cad-text text-xs px-2 py-1 rounded outline-none focus:border-cad-accent w-full"
          >
            {LENGTH_UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Precision */}
      <fieldset className="border border-cad-border rounded px-3 pb-3 pt-1">
        <legend className="text-xs font-semibold px-1">Precision</legend>

        <div className="mt-2 space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">
              Length Precision: {unitSettings.lengthPrecision} decimals
            </label>
            <input
              type="range"
              min="0"
              max="8"
              value={unitSettings.lengthPrecision}
              onChange={(e) => setLengthPrecision(Number(e.target.value))}
              className="w-full h-1.5 bg-cad-border rounded-lg appearance-none cursor-pointer accent-cad-accent"
            />
            <div className="flex justify-between text-[10px] text-cad-text-dim mt-0.5">
              <span>0</span>
              <span>8</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">
              Angle Precision: {unitSettings.anglePrecision} decimals
            </label>
            <input
              type="range"
              min="0"
              max="8"
              value={unitSettings.anglePrecision}
              onChange={(e) => setAnglePrecision(Number(e.target.value))}
              className="w-full h-1.5 bg-cad-border rounded-lg appearance-none cursor-pointer accent-cad-accent"
            />
            <div className="flex justify-between text-[10px] text-cad-text-dim mt-0.5">
              <span>0</span>
              <span>8</span>
            </div>
          </div>
        </div>
      </fieldset>

      {/* Number Format */}
      <fieldset className="border border-cad-border rounded px-3 pb-3 pt-1">
        <legend className="text-xs font-semibold px-1">Number Format</legend>
        <div className="mt-2">
          <label className="text-xs font-medium block mb-1">Decimal Separator</label>
          <select
            value={unitSettings.numberFormat}
            onChange={(e) => setNumberFormat(e.target.value as NumberFormat)}
            className="bg-cad-bg border border-cad-border text-cad-text text-xs px-2 py-1 rounded outline-none focus:border-cad-accent w-full"
          >
            <option value="period">Period (1,234.56)</option>
            <option value="comma">Comma (1.234,56)</option>
          </select>
        </div>
      </fieldset>

      {/* Display */}
      <fieldset className="border border-cad-border rounded px-3 pb-3 pt-1">
        <legend className="text-xs font-semibold px-1">Display</legend>
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-xs font-medium">Show Unit Suffix</span>
            <p className="text-[10px] text-cad-text-dim">Append unit label to displayed values</p>
          </div>
          <ToggleSwitch checked={unitSettings.showUnitSuffix} onChange={() => setShowUnitSuffix(!unitSettings.showUnitSuffix)} />
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
