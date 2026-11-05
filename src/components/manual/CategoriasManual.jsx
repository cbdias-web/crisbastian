import React from 'react';
import { LayoutGrid, Check } from 'lucide-react';

const A = {
  surface: 'rgba(22,27,34,0.78)',
  surfaceHover: 'rgba(28,35,51,0.95)',
  border: 'rgba(0,212,170,0.12)',
  text: '#e6edf3',
  textSoft: '#d0d7de',
  textMuted: 'rgba(230,237,243,0.4)',
};

export default function CategoriasManual({ categories, activeCategory, totalSections, onSelect }) {
  const items = [
    { id: null, label: 'Tudo', icon: LayoutGrid, hue: '#8b96a3', count: totalSections },
    ...categories.map(c => ({ id: c.id, label: c.label, icon: c.icon, hue: c.hue, count: c.sections.length })),
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: A.textMuted }}>
          Explorar por área
        </p>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(0,212,170,0.22), transparent)' }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {items.map(({ id, label, icon: Icon, hue, count }) => {
          const isActive = (activeCategory ?? null) === id;
          return (
            <button
              key={id ?? 'all'}
              onClick={() => onSelect(id)}
              className="group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
              style={{
                background: isActive ? `linear-gradient(135deg, ${hue}26 0%, ${A.surface} 75%)` : A.surface,
                border: `1px solid ${isActive ? `${hue}66` : A.border}`,
                boxShadow: isActive ? `0 8px 24px -12px ${hue}99` : '0 1px 2px rgba(0,0,0,0.25)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = `${hue}44`;
                  e.currentTarget.style.background = A.surfaceHover;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = A.border;
                  e.currentTarget.style.background = A.surface;
                }
              }}
            >
              <span
                className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full transition-opacity"
                style={{ background: hue, opacity: isActive ? 1 : 0 }}
              />
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ background: `${hue}1f`, color: hue }}
              >
                <Icon className="w-[18px] h-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-tight truncate" style={{ color: isActive ? A.text : A.textSoft }}>
                  {label}
                </span>
                <span className="block text-[10px] uppercase tracking-wider mt-0.5" style={{ color: isActive ? hue : A.textMuted }}>
                  {count} {count === 1 ? 'seção' : 'seções'}
                </span>
              </span>
              {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: hue }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}