import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Loader2 } from 'lucide-react';
import { periodoRange, dentroPeriodo } from '@/components/portal/FiltroIndicadores';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const STATUS = {
  novo: { label: 'Novo', color: '#00D4AA', bg: 'rgba(0,212,170,0.12)' },
  em_atendimento: { label: 'Em atendimento', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  convertido_cliente: { label: 'Convertido · cliente', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  convertido_contrato: { label: 'Convertido · contrato', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  convertido_venda: { label: 'Convertido · venda', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  descartado: { label: 'Descartado', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

const fmtData = (s) => String(s || '').slice(0, 10).split('-').reverse().join('/');
const fmtValor = (v) => (v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—');

// Tabela SOMENTE LEITURA das indicações, filtrada por período e indicador
export default function IndicacoesTabelaLeitura({ periodo, parceiroIdFiltro }) {
  const { data: indicacoes = [], isLoading } = useQuery({
    queryKey: ['indicacoes-leitura'],
    queryFn: () => base44.entities.LeadIndicacao.list('-created_date', 500),
  });

  const range = periodoRange(periodo);
  const lista = indicacoes.filter((li) => {
    if (parceiroIdFiltro && parceiroIdFiltro !== 'todos' && li.parceiro_id !== parceiroIdFiltro) return false;
    return dentroPeriodo(li.created_date, range);
  });

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
        <Send className="w-4 h-4" style={{ color: AURORA.accent }} />
        <h2 className="text-sm font-bold" style={{ color: AURORA.text }}>Indicações ({lista.length})</h2>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: AURORA.accent }} />
        </div>
      ) : lista.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs" style={{ color: AURORA.textMuted }}>Nenhuma indicação no período selecionado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: AURORA.surface2, color: AURORA.textMuted }}>
                <th className="text-left px-4 py-2 font-semibold">Data</th>
                <th className="text-left px-4 py-2 font-semibold">Indicador</th>
                <th className="text-left px-4 py-2 font-semibold">Lead</th>
                <th className="text-left px-4 py-2 font-semibold">Produto</th>
                <th className="text-left px-4 py-2 font-semibold">Valor</th>
                <th className="text-left px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((li) => {
                const st = STATUS[li.status] || { label: li.status, color: AURORA.textMuted, bg: 'rgba(230,237,243,0.08)' };
                return (
                  <tr key={li.id} style={{ borderTop: `1px solid ${AURORA.border}` }}>
                    <td className="px-4 py-2" style={{ color: AURORA.textMuted }}>{fmtData(li.created_date)}</td>
                    <td className="px-4 py-2" style={{ color: AURORA.text }}>{li.parceiro_nome || '—'}</td>
                    <td className="px-4 py-2 font-medium" style={{ color: AURORA.text }}>
                      {li.tipo === 'PJ' ? (li.pj_razao_social || '—') : (li.pf_nome || '—')}
                    </td>
                    <td className="px-4 py-2" style={{ color: AURORA.textMuted }}>{li.produto || '—'}</td>
                    <td className="px-4 py-2" style={{ color: AURORA.textMuted }}>{fmtValor(li.valor_estimado)}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}