/**
 * Symbol Palette - Insert special characters and symbols into text
 * Common CAD/engineering symbols like Ø, °, ±, ², etc.
 */

import { useState, useRef, useEffect } from 'react';

// Symbol categories and their characters
const SYMBOL_CATEGORIES = {
  'Common': [
    { char: '°', name: 'Degree', code: '%%d' },
    { char: 'Ø', name: 'Diameter', code: '%%c' },
    { char: '±', name: 'Plus/Minus', code: '%%p' },
    { char: '²', name: 'Squared', code: '^2' },
    { char: '³', name: 'Cubed', code: '^3' },
    { char: '×', name: 'Multiply', code: null },
    { char: '÷', name: 'Divide', code: null },
    { char: '≈', name: 'Approximately', code: null },
    { char: '≠', name: 'Not Equal', code: null },
    { char: '≤', name: 'Less/Equal', code: null },
    { char: '≥', name: 'Greater/Equal', code: null },
    { char: '∞', name: 'Infinity', code: null },
  ],
  'Greek': [
    { char: 'α', name: 'Alpha', code: null },
    { char: 'β', name: 'Beta', code: null },
    { char: 'γ', name: 'Gamma', code: null },
    { char: 'δ', name: 'Delta', code: null },
    { char: 'ε', name: 'Epsilon', code: null },
    { char: 'θ', name: 'Theta', code: null },
    { char: 'λ', name: 'Lambda', code: null },
    { char: 'μ', name: 'Mu', code: null },
    { char: 'π', name: 'Pi', code: null },
    { char: 'σ', name: 'Sigma', code: null },
    { char: 'φ', name: 'Phi', code: null },
    { char: 'ω', name: 'Omega', code: null },
    { char: 'Δ', name: 'Delta (Upper)', code: null },
    { char: 'Σ', name: 'Sigma (Upper)', code: null },
    { char: 'Ω', name: 'Omega (Upper)', code: null },
  ],
  'Superscript': [
    { char: '⁰', name: 'Super 0', code: null },
    { char: '¹', name: 'Super 1', code: null },
    { char: '²', name: 'Super 2', code: null },
    { char: '³', name: 'Super 3', code: null },
    { char: '⁴', name: 'Super 4', code: null },
    { char: '⁵', name: 'Super 5', code: null },
    { char: '⁶', name: 'Super 6', code: null },
    { char: '⁷', name: 'Super 7', code: null },
    { char: '⁸', name: 'Super 8', code: null },
    { char: '⁹', name: 'Super 9', code: null },
    { char: '⁺', name: 'Super +', code: null },
    { char: '⁻', name: 'Super -', code: null },
    { char: 'ⁿ', name: 'Super n', code: null },
  ],
  'Subscript': [
    { char: '₀', name: 'Sub 0', code: null },
    { char: '₁', name: 'Sub 1', code: null },
    { char: '₂', name: 'Sub 2', code: null },
    { char: '₃', name: 'Sub 3', code: null },
    { char: '₄', name: 'Sub 4', code: null },
    { char: '₅', name: 'Sub 5', code: null },
    { char: '₆', name: 'Sub 6', code: null },
    { char: '₇', name: 'Sub 7', code: null },
    { char: '₈', name: 'Sub 8', code: null },
    { char: '₉', name: 'Sub 9', code: null },
    { char: '₊', name: 'Sub +', code: null },
    { char: '₋', name: 'Sub -', code: null },
  ],
  'Fractions': [
    { char: '½', name: 'One Half', code: null },
    { char: '⅓', name: 'One Third', code: null },
    { char: '¼', name: 'One Quarter', code: null },
    { char: '⅕', name: 'One Fifth', code: null },
    { char: '⅙', name: 'One Sixth', code: null },
    { char: '⅛', name: 'One Eighth', code: null },
    { char: '⅔', name: 'Two Thirds', code: null },
    { char: '¾', name: 'Three Quarters', code: null },
    { char: '⅝', name: 'Five Eighths', code: null },
    { char: '⅞', name: 'Seven Eighths', code: null },
  ],
  'Arrows': [
    { char: '←', name: 'Left Arrow', code: null },
    { char: '→', name: 'Right Arrow', code: null },
    { char: '↑', name: 'Up Arrow', code: null },
    { char: '↓', name: 'Down Arrow', code: null },
    { char: '↔', name: 'Left-Right Arrow', code: null },
    { char: '↕', name: 'Up-Down Arrow', code: null },
    { char: '⇐', name: 'Double Left', code: null },
    { char: '⇒', name: 'Double Right', code: null },
    { char: '⇑', name: 'Double Up', code: null },
    { char: '⇓', name: 'Double Down', code: null },
  ],
  'Units': [
    { char: '㎜', name: 'mm', code: null },
    { char: '㎝', name: 'cm', code: null },
    { char: '㎡', name: 'm²', code: null },
    { char: '㎥', name: 'm³', code: null },
    { char: '℃', name: 'Celsius', code: null },
    { char: '℉', name: 'Fahrenheit', code: null },
    { char: '‰', name: 'Per Mille', code: null },
    { char: '№', name: 'Number', code: null },
  ],
};

interface SymbolPaletteProps {
  onInsert: (symbol: string) => void;
  onClose: () => void;
}

export function SymbolPalette({ onInsert, onClose }: SymbolPaletteProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof SYMBOL_CATEGORIES>('Common');
  const [searchTerm, setSearchTerm] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Filter symbols by search term
  const filteredSymbols = searchTerm
    ? Object.entries(SYMBOL_CATEGORIES).flatMap(([_, symbols]) =>
        symbols.filter(s =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.char.includes(searchTerm)
        )
      )
    : SYMBOL_CATEGORIES[activeCategory];

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-cad-surface border border-cad-border rounded-lg shadow-xl w-80"
      style={{ maxHeight: '400px' }}
    >
      {/* Header */}
      <div className="p-2 border-b border-cad-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-cad-text">Insert Symbol</span>
          <button
            onClick={onClose}
            className="text-cad-text-dim hover:text-cad-text p-1"
          >
            ✕
          </button>
        </div>
        <input
          type="text"
          placeholder="Search symbols..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-cad-bg border border-cad-border rounded px-2 py-1 text-xs text-cad-text"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!searchTerm && (
        <div className="flex flex-wrap gap-1 p-2 border-b border-cad-border bg-cad-bg/50">
          {Object.keys(SYMBOL_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category as keyof typeof SYMBOL_CATEGORIES)}
              className={`px-2 py-1 text-xs rounded ${
                activeCategory === category
                  ? 'bg-cad-accent text-white'
                  : 'bg-cad-bg text-cad-text-dim hover:bg-cad-border hover:text-cad-text'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Symbol grid */}
      <div className="p-2 overflow-y-auto" style={{ maxHeight: '250px' }}>
        <div className="grid grid-cols-6 gap-1">
          {filteredSymbols.map((symbol, idx) => (
            <button
              key={`${symbol.char}-${idx}`}
              onClick={() => {
                onInsert(symbol.char);
                onClose();
              }}
              title={`${symbol.name}${symbol.code ? ` (${symbol.code})` : ''}`}
              className="w-10 h-10 flex items-center justify-center text-lg bg-cad-bg border border-cad-border rounded hover:bg-cad-accent hover:text-white hover:border-cad-accent transition-colors"
            >
              {symbol.char}
            </button>
          ))}
        </div>
        {filteredSymbols.length === 0 && (
          <div className="text-center text-cad-text-dim text-sm py-4">
            No symbols found
          </div>
        )}
      </div>

      {/* Footer with quick insert codes */}
      <div className="p-2 border-t border-cad-border bg-cad-bg/50">
        <div className="text-xs text-cad-text-dim">
          <span className="font-medium">Quick codes:</span>{' '}
          <code className="bg-cad-bg px-1 rounded">%%d</code> = °{' '}
          <code className="bg-cad-bg px-1 rounded">%%c</code> = Ø{' '}
          <code className="bg-cad-bg px-1 rounded">%%p</code> = ±
        </div>
      </div>
    </div>
  );
}

/**
 * Symbol Button - Opens the symbol palette
 */
interface SymbolButtonProps {
  onInsert: (symbol: string) => void;
  className?: string;
}

export function SymbolButton({ onInsert, className = '' }: SymbolButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setIsOpen(true);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={`px-2 py-1 text-xs bg-cad-bg border border-cad-border rounded hover:bg-cad-border ${className}`}
        title="Insert Symbol"
      >
        Ω
      </button>
      {isOpen && (
        <div style={{ position: 'fixed', top: position.top, left: position.left }}>
          <SymbolPalette
            onInsert={onInsert}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
}

/**
 * Process text with DXF-style codes (%%d, %%c, %%p)
 */
export function processTextCodes(text: string): string {
  return text
    .replace(/%%d/gi, '°')
    .replace(/%%c/gi, 'Ø')
    .replace(/%%p/gi, '±')
    .replace(/%%u/gi, '') // Underline toggle (handled separately)
    .replace(/%%o/gi, ''); // Overline toggle (handled separately)
}
