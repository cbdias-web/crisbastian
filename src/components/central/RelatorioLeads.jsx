import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart2, Clock, ArrowRight, Users, TrendingUp, X, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function RelatorioLeads({ onClose }) {
  const [periodo, setPeriodo] = useState(7);

  const { data: conversas = [] } = useQuery({
    queryKey: ['relatorio-conversas', periodo],
    queryFn: () => base44.entities.ConversaWhatsapp.list('-created_date', 500),
  });

  const { data: migracoes = [] } = useQuery({
    queryKey: ['relatorio-migracoes', periodo],
    queryFn: () => base44.entities.LogMigracaoLead.list('-migrado_em', 500),
  });

  const cutoff = new Date(Date.now() - periodo * 24 * 60 * 60 * 1000);

  const conversasFiltradas = conversas.filter(c => new Date(c.created_date) >= cutoff);
  const migracoesFiltradas = migracoes.filter(m => new Date(m.migrado_em) >= cutoff);

  // Entradas por dia
  const entradasPorDia = {};
  for (const c of conversasFiltradas) {
    const dia = new Date(c.created_date).toLocaleDateString('pt-BR');
    entradasPorDia[dia] = (entradasPorDia[dia] || 0) + 1;
  }
  const chartEntradas = Object.entries(entradasPorDia).map(([dia, total]) => ({ dia, total }));

  // Tempo médio de espera (da primeira msg do lead até primeira resposta do gerente)
  const temposEspera = conversasFiltradas
    .filter(c => c.primeira_mensagem_lead_em && c.ultima_resposta_gerente_em)
    .map(c => (new Date(c.ultima_resposta_gerente_em) - new Date(c.primeira_mensagem_lead_em)) / 60000);
  const tempoMedioMin = temposEspera.length
    ? Math.round(temposEspera.reduce((a, b) => a + b, 0) / temposEspera.length)
    : null;

  // Migrações por gerente origem
  const migPorGerente = {};
  for (const m of migracoesFiltradas) {
    migPorGerente[m.vendedor_origem_nome] = (migPorGerente[m.vendedor_origem_nome] || 0) + 1;
  }

  // Status distribuição
  const ativos = conversasFiltradas.filter(c => c.status === 'ativa').length;
  const qualificados = conversasFiltradas.filter(c => c.status === 'qualificado').length;
  const encerrados = conversasFiltradas.filter(c => c.status === 'encerrada').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5" style={{ color: AURORA.accent }} />
            <h2 className="font-bold text-lg" style={{ color: AURORA.text }}>Relatório de Leads & Atendimento</h2>
          </div>
          <div className="flex items-center gap-3">
            <select value={periodo} onChange={e => setPeriodo(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl text-sm focus:outline-none"
              style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
              <option value={7}>Últimos 7 dias</option>
              <option value={14}>Últimos 14 dias</option>
              <option value={30}>Últimos 30 dias</option>
            </select>
            <button onClick={onClose} className="p-2 rounded-lg" style={{ color: AURORA.textMuted }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Leads no período', value: conversasFiltradas.length, color: AURORA.accent, icon: Users },
              { label: 'Tempo médio resposta', value: tempoMedioMin != null ? `${tempoMedioMin} min` : 'N/A', color: '#fbbf24', icon: Clock },
              { label: 'Migrações por timeout', value: migracoesFiltradas.length, color: '#f87171', icon: ArrowRight },
              { label: 'Qualificados pela IA', value: qualificados, color: '#a78bfa', icon: TrendingUp },
            ].map(k => (
              <div key={k.label} className="rounded-2xl p-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                  <p className="text-xs" style={{ color: AURORA.textMuted }}>{k.label}</p>
                </div>
                <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Gráfico entradas por dia */}
          <div className="rounded-2xl p-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <p className="text-sm font-bold mb-3" style={{ color: AURORA.text }}>📈 Entradas de leads por dia</p>
            {chartEntradas.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartEntradas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,170,0.1)" />
                  <XAxis dataKey="dia" tick={{ fill: AURORA.textMuted, fontSize: 11 }} />
                  <YAxis tick={{ fill: AURORA.textMuted, fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text, borderRadius: 8 }} />
                  <Bar dataKey="total" fill={AURORA.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-sm py-8" style={{ color: AURORA.textMuted }}>Nenhum dado no período</p>
            )}
          </div>

          {/* Distribuição de status */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Ativas', value: ativos, bg: 'rgba(0,212,170,0.1)', color: '#00D4AA' },
              { label: 'Qualificados', value: qualificados, bg: 'rgba(139,92,246,0.1)', color: '#a78bfa' },
              { label: 'Encerradas', value: encerrados, bg: 'rgba(100,100,100,0.1)', color: '#9ca3af' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg, border: `1px solid ${s.color}33` }}>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: AURORA.textMuted }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Migrações por gerente */}
          {Object.keys(migPorGerente).length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: AURORA.surface, border: `1px solid rgba(239,68,68,0.2)` }}>
              <p className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#f87171' }}>
                <ArrowRight className="w-4 h-4" /> Migrações por gerente (timeout 30min)
              </p>
              <div className="space-y-2">
                {Object.entries(migPorGerente).sort((a, b) => b[1] - a[1]).map(([nome, qtd]) => (
                  <div key={nome} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: AURORA.surface2 }}>
                    <span className="text-sm" style={{ color: AURORA.text }}>{nome}</span>
                    <span className="text-sm font-bold" style={{ color: '#f87171' }}>{qtd} migração{qtd > 1 ? 'ões' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela de migrações recentes */}
          {migracoesFiltradas.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
              <div className="px-4 py-3" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.textMuted }}>Histórico de migrações recentes</p>
              </div>
              <div className="divide-y" style={{ borderColor: AURORA.border }}>
                {migracoesFiltradas.slice(0, 10).map(m => (
                  <div key={m.id} className="px-4 py-3 grid grid-cols-4 gap-2 text-xs" style={{ color: AURORA.textMuted }}>
                    <span style={{ color: AURORA.text }}>{m.lead_nome}</span>
                    <span>{m.vendedor_origem_nome} → {m.vendedor_destino_nome}</span>
                    <span style={{ color: '#f87171' }}>{m.tempo_espera_min} min espera</span>
                    <span>{fmtDate(m.migrado_em)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}