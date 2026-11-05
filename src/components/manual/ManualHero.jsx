import React from 'react';
import { BookOpen, Search, X, Loader2 } from 'lucide-react';

const A = {
  text: '#e6edf3',
  muted: 'rgba(230,237,243,0.5)',
  accent: '#00D4AA',
};

export default function ManualHero({ stats, busca, onBusca, documentos }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(0,212,170,0.10) 0%, rgba(22,27,34,0.96) 42%, rgba(13,17,23,0.99) 100%)',
        border: '1px solid rgba(0,212,170,0.16)',
        boxShadow: '0 18px 50px -30px rgba(0,212,170,0.6)',
      }}
    >
      <div
        className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,212,170,0.22) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.14) 0%, transparent 70%)' }}
      />

      <div className="relative p-5 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-2" style={{ color: 'rgba(0,212,170,0.75)' }}>
              Central de Conhecimento
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,212,170,0.14)', border: '1px solid rgba(0,212,170,0.25)' }}
              >
                <BookOpen className="w-5 h-5" style={{ color: A.accent }} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-tight" style={{ color: A.text }}>
                  Manual da Plataforma
                </h1>
                <p className="text-xs mt-0.5" style={{ color: A.muted }}>
                  Tudo o que a operação faz, documentado e pesquisável
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {stats.map(s => (
              <div
                key={s.label}
                className="px-3 py-2 rounded-lg min-w-[74px]"
                style={{ background: 'rgba(13,17,23,0.55)', border: '1px solid rgba(0,212,170,0.12)' }}
              >
                <p className="text-base font-bold leading-none" style={{ color: A.text }}>{s.value}</p>
                <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: A.muted }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-5 max-w-2xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(230,237,243,0.35)' }} />
          <input
            value={busca}
            onChange={e => onBusca(e.target.value)}
            placeholder="Buscar por tela, rotina ou funcionalidade (ex.: cadência, rate, comissão)…"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm focus:outline-none"
            style={{ color: A.text }}
          />
          {busca && (
            <button
              onClick={() => onBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition"
              style={{ color: 'rgba(230,237,243,0.5)' }}
              onMouseEnter={e => e.currentTarget.style.color = A.accent}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(230,237,243,0.5)'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="text-[9px] uppercase tracking-[0.18em] font-semibold mr-1" style={{ color: 'rgba(230,237,243,0.35)' }}>
            Guias em PDF
          </span>
          {documentos.map(doc => {
            const Icon = doc.icon;
            return (
              <button
                key={doc.label}
                onClick={doc.onClick}
                disabled={doc.loading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                style={{ background: 'rgba(22,27,34,0.9)', border: '1px solid rgba(0,212,170,0.14)', color: 'rgba(230,237,243,0.78)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,170,0.45)'; e.currentTarget.style.color = A.text; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,212,170,0.14)'; e.currentTarget.style.color = 'rgba(230,237,243,0.78)'; }}
              >
                {doc.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: A.accent }} /> : <Icon className="w-3.5 h-3.5" style={{ color: A.accent }} />}
                {doc.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}