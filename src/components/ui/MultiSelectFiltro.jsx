import { useState } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

const AURORA = {
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.1)',
  text: '#e6edf3',
};

export default function MultiSelectFiltro({ placeholder, options, selected = [], onChange }) {
  const [open, setOpen] = useState(false);
  const resumo = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? (options.find(o => o.value === selected[0])?.label || selected[0])
      : `${selected.length} selecionados`;
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(i => i !== v) : [...selected, v]);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl focus:outline-none"
        style={{
          background: selected.length ? AURORA.accentDim : AURORA.surface2,
          border: `1px solid ${selected.length ? AURORA.accent : AURORA.border}`,
          color: selected.length ? AURORA.accent : AURORA.text,
        }}>
        <span className="max-w-[150px] truncate">{resumo}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {selected.length > 0 && (
        <button type="button" onClick={() => onChange([])} title="Limpar"
          className="absolute -right-1.5 -top-1.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: '#f87171', color: '#0d1117' }}>
          <X className="w-2.5 h-2.5" />
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 min-w-[210px] max-h-56 overflow-y-auto rounded-xl py-1 z-30 shadow-2xl"
            style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
            {options.map(o => (
              <button key={o.value} type="button" onClick={() => toggle(o.value)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition"
                style={{ color: AURORA.text }}
                onMouseEnter={e => e.currentTarget.style.background = AURORA.accentDim}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span className="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: selected.includes(o.value) ? AURORA.accent : 'rgba(0,212,170,0.4)',
                    background: selected.includes(o.value) ? AURORA.accent : 'transparent',
                  }}>
                  {selected.includes(o.value) && <Check className="w-2.5 h-2.5" style={{ color: '#0d1117' }} />}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}