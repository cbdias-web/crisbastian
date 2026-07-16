import React, { useState, useRef, useEffect } from 'react';
import { Search, Check, ChevronDown, Users, X } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  borderActive: 'rgba(0,212,170,0.35)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.10)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  textDim: 'rgba(230,237,243,0.35)',
};

export default function GerenteMultiSelect({ vendedores = [], selected = [], onChange, label = 'Gerentes' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = vendedores.filter(v =>
    !search || v.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => onChange(vendedores.map(v => v.id));
  const clearAll = () => onChange([]);

  const selectedVendedores = selected
    .map(id => vendedores.find(v => v.id === id))
    .filter(Boolean);

  const displayText = selected.length === 0
    ? 'Todos os gerentes'
    : selected.length === 1
      ? selectedVendedores[0]?.nome || '1 gerente'
      : `${selected.length} gerentes`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl transition"
        style={{
          background: open ? AURORA.accentDim : AURORA.surface2,
          border: `1px solid ${open ? AURORA.borderActive : AURORA.border}`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-3.5 h-3.5 flex-shrink-0" style={{ color: AURORA.accent }} />
          <span className="text-sm font-medium truncate" style={{ color: selected.length > 0 ? AURORA.text : AURORA.textMuted }}>
            {displayText}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {selected.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: AURORA.accent, color: '#0d1117' }}>
              {selected.length}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            style={{ color: AURORA.textMuted }} />
        </div>
      </button>

      {/* Tags dos gerentes selecionados */}
      {selectedVendedores.length > 0 && !open && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedVendedores.slice(0, 4).map(v => (
            <span key={v.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
              style={{ background: AURORA.accentDim, color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
              {v.avatar_url
                ? <img src={v.avatar_url} alt="" className="w-3 h-3 rounded-full object-cover" />
                : <span className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold"
                    style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
                    {(v.nome || '?').charAt(0).toUpperCase()}
                  </span>}
              <span className="truncate max-w-[80px]">{v.nome.split(' ')[0]}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(selected.filter(s => s !== v.id)); }}
                className="hover:opacity-70 transition flex-shrink-0">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {selectedVendedores.length > 4 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(255,255,255,0.06)', color: AURORA.textMuted }}>
              +{selectedVendedores.length - 4}
            </span>
          )}
        </div>
      )}

      {open && (
        <div className="absolute z-[100] mt-1.5 w-full rounded-xl shadow-2xl overflow-hidden"
          style={{ background: AURORA.surface2, border: `1px solid ${AURORA.borderActive}`, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>

          {/* Search */}
          <div className="p-2 border-b" style={{ borderColor: AURORA.border }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: AURORA.textDim }} />
              <input
                type="text"
                placeholder="Buscar gerente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg focus:outline-none"
                style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}`, color: AURORA.text }}
              />
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b" style={{ borderColor: AURORA.border }}>
            <button onClick={selectAll}
              className="text-[10px] font-semibold px-2 py-1 rounded-md transition"
              style={{ color: AURORA.accent, background: AURORA.accentDim }}>
              Selecionar todos
            </button>
            {selected.length > 0 && (
              <button onClick={clearAll}
                className="text-[10px] font-semibold px-2 py-1 rounded-md transition flex items-center gap-1"
                style={{ color: '#f87171' }}>
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
            <span className="ml-auto text-[10px]" style={{ color: AURORA.textDim }}>
              {filtered.length} de {vendedores.length}
            </span>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: AURORA.textDim }}>Nenhum gerente encontrado</p>
            ) : filtered.map(v => {
              const isSelected = selected.includes(v.id);
              return (
                <button
                  key={v.id}
                  onClick={() => toggle(v.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition"
                  style={{ background: isSelected ? AURORA.accentDim : 'transparent' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,212,170,0.05)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isSelected ? AURORA.accent : 'transparent',
                      borderColor: isSelected ? AURORA.accent : AURORA.textDim,
                    }}>
                    {isSelected && <Check className="w-2.5 h-2.5" style={{ color: '#0d1117' }} strokeWidth={3} />}
                  </div>
                  {v.avatar_url ? (
                    <img src={v.avatar_url} alt={v.nome} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
                      {(v.nome || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm truncate" style={{ color: isSelected ? AURORA.text : AURORA.text }}>
                    {v.nome}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}