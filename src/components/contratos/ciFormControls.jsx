import { ChevronDown, ChevronUp } from 'lucide-react';

// Tokens e controles compartilhados do formulário de Conta Internacional.
export const AURORA = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)', borderActive: 'rgba(0,212,170,0.35)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', textMuted: 'rgba(230,237,243,0.55)',
  gold: '#fbbf24', goldDim: 'rgba(251,191,36,0.12)', danger: '#f87171',
};

export const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
export const labelStyle = { color: AURORA.textMuted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

export const CardSection = ({ title, icon: Icon, children, open, onToggle, badge }) => (
  <div className="rounded-xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
    <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 transition" style={{ background: AURORA.surface2 }}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: AURORA.accent }} />
        <span className="text-sm font-semibold" style={{ color: AURORA.text }}>{title}</span>
        {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: AURORA.accentDim, color: AURORA.accent }}>{badge}</span>}
      </div>
      {open ? <ChevronUp className="w-4 h-4" style={{ color: AURORA.textMuted }} /> : <ChevronDown className="w-4 h-4" style={{ color: AURORA.textMuted }} />}
    </button>
    {open && <div className="p-4">{children}</div>}
  </div>
);

export const LI = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
  </div>
);

export const SelectField = ({ label, value, onChange, options, placeholder = 'Selecione...' }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none">
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export const RadioBtns = ({ label, value, onChange, opts }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    <div className="flex flex-wrap gap-2">
      {opts.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className="px-3 py-1.5 text-xs rounded-lg font-semibold transition"
          style={value === o.value ? { background: AURORA.accent, color: '#0d1117' } : { ...inputStyle, border: `1px solid ${AURORA.border}` }}>
          {o.label}
        </button>
      ))}
    </div>
  </div>
);