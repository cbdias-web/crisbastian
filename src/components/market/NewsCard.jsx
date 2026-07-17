import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ExternalLink, ChevronDown, Clock } from 'lucide-react';
import Sparkline from './Sparkline';

function formatData(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const agora = new Date();
    const diffMs = agora - d;
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 1) return 'agora';
    if (diffH < 24) return `há ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'ontem';
    if (diffD < 7) return `há ${diffD} dias`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch { return ''; }
}

const A = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.5)',
};

const CATEGORIAS = {
  commodities: { label: 'Commodities', color: '#f59e0b', icon: '🛢️' },
  forex: { label: 'Câmbio', color: '#60a5fa', icon: '💱' },
  acoes: { label: 'Bolsas', color: '#a78bfa', icon: '📈' },
  cripto: { label: 'Cripto', color: '#fbbf24', icon: '₿' },
  economia: { label: 'Economia', color: '#34d399', icon: '🏛️' },
  renda_fixa: { label: 'Renda Fixa', color: '#2dd4bf', icon: '🏦' },
};

const IMPACTO_STYLES = {
  positivo: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', label: 'Positivo' },
  negativo: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: 'Negativo' },
  neutro: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', label: 'Neutro' },
};

function formatPreco(valor, moeda) {
  if (!valor && valor !== 0) return '—';
  const prefix = moeda === 'BRL' ? 'R$' : moeda === 'USD' ? 'US$' : '';
  return `${prefix} ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function NewsCard({ news }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORIAS[news.categoria] || CATEGORIAS.economia;
  const impacto = IMPACTO_STYLES[news.impacto] || IMPACTO_STYLES.neutro;
  const up = (news.variacao_pct || 0) >= 0;
  const sparkColor = up ? '#34d399' : '#f87171';

  const TendIcon = news.tendencia === 'alta' ? TrendingUp : news.tendencia === 'baixa' ? TrendingDown : Minus;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${cat.color}44`; e.currentTarget.style.boxShadow = `0 0 20px ${cat.color}15, 0 4px 16px rgba(0,0,0,0.4)`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = A.border; e.currentTarget.style.boxShadow = 'none'; }}
      style={{ background: A.surface, border: `1px solid ${A.border}` }}
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: `${cat.color}18` }}>
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: `${cat.color}15`, color: cat.color }}>
              {cat.label}
            </span>
            {news.relevancia === 'alta' && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                ⚡ Alta
              </span>
            )}
            {news.publicado_em && (
              <span className="text-[9px] flex items-center gap-0.5 ml-auto" style={{ color: A.textMuted }}>
                <Clock className="w-2.5 h-2.5" /> {formatData(news.publicado_em)}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold leading-tight" style={{ color: A.text }}>{news.titulo}</h3>
        </div>
      </div>

      {/* Price + Sparkline */}
      <div className="px-4 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: A.textMuted }}>{news.ativo_nome || news.ativo_simbolo || '—'}</p>
            <p className="text-base font-bold" style={{ color: A.text }}>{formatPreco(news.preco_atual, news.moeda)}</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
            style={{ background: up ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: up ? '#34d399' : '#f87171' }}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {up ? '+' : ''}{(news.variacao_pct || 0).toFixed(2)}%
          </div>
        </div>
        {news.sparkline && news.sparkline.length > 1 && (
          <Sparkline data={news.sparkline} color={sparkColor} width={100} height={32} />
        )}
      </div>

      {/* Summary */}
      <div className="px-4 pb-2">
        <p className="text-xs leading-relaxed" style={{ color: A.textMuted }}>{news.resumo}</p>
      </div>

      {/* Tags + Impacto */}
      <div className="px-4 pb-3 flex items-center flex-wrap gap-1.5">
        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: impacto.bg, color: impacto.color }}>
          <TendIcon className="w-2.5 h-2.5" /> {impacto.label}
        </span>
        {(news.tags || []).slice(0, 3).map((tag, i) => (
          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,212,170,0.08)', color: A.textMuted }}>
            #{tag}
          </span>
        ))}
      </div>

      {/* Expandable content */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium transition"
        style={{ borderTop: `1px solid ${A.border}`, color: A.accent }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.05)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        {expanded ? 'Recolher' : 'Ver análise'}
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2">
          <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(230,237,243,0.75)' }}>
            {news.conteudo}
          </div>
          {news.fonte_url && (
            <a href={news.fonte_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs font-medium transition"
              style={{ color: A.accent }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              {news.fonte || 'Ver fonte'} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}