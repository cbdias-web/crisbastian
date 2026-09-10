import { X, Trophy } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  green: '#34d399',
};

const fmtMoeda = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

// Listagem das vendas convertidas (origem portal) contabilizadas no KPI
// "Vendas efetivas" da Consolidação Geral do Dash Parceiro.
export default function VendasEfetivasModal({ vendas = [], onClose }) {
  const totalValor = vendas.reduce((s, v) => s + (Number(v.valor) || 0), 0);
  const totalComissao = vendas.reduce((s, v) => s + (Number(v.comissao) || 0), 0);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden max-h-[85vh] flex flex-col" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(52,211,153,0.15)' }}>
              <Trophy className="w-4 h-4" style={{ color: AURORA.green }} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm" style={{ color: AURORA.text }}>Vendas Efetivas do Período</p>
              <p className="text-[11px] truncate" style={{ color: AURORA.textMuted }}>
                {vendas.length} venda{vendas.length === 1 ? '' : 's'} · {fmtMoeda(totalValor)} · comissão {fmtMoeda(totalComissao)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
        </div>

        {/* Lista */}
        <div className="p-4 overflow-y-auto space-y-2">
          {vendas.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: AURORA.textMuted }}>Nenhuma venda convertida no período</p>
          ) : vendas.map(v => (
            <div key={v.id} className="rounded-xl p-3 flex items-center gap-3 transition"
              style={{ background: AURORA.surface2, border: '1px solid rgba(52,211,153,0.2)' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 18px rgba(52,211,153,0.15)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.25), rgba(0,212,170,0.25))', color: AURORA.green, border: '1px solid rgba(52,211,153,0.4)' }}>
                {v.cliente?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: AURORA.text }}>{v.cliente || '—'}</p>
                <p className="text-[11px] truncate" style={{ color: AURORA.textMuted }}>
                  {v.produto || '—'} · {fmtData(v.data)}{v.indicador && v.indicador !== '—' ? ` · 🔗 ${v.indicador}` : ''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: AURORA.green }}>{fmtMoeda(v.valor)}</p>
                <p className="text-[10px]" style={{ color: AURORA.textMuted }}>comissão {fmtMoeda(v.comissao)} ({v.percentual}%)</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}