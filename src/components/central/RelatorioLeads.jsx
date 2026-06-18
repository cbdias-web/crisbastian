import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart2, Clock, ArrowRight, Users, TrendingUp, X, Download, CheckCircle2, Lock, AlertTriangle } from 'lucide-react';
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
  const [exportando, setExportando] = useState(false);
  const printRef = useRef(null);

  const { data: conversas = [] } = useQuery({
    queryKey: ['relatorio-conversas'],
    queryFn: () => base44.entities.ConversaWhatsapp.list('-created_date', 500),
  });
  const { data: migracoes = [] } = useQuery({
    queryKey: ['relatorio-migracoes'],
    queryFn: () => base44.entities.LogMigracaoLead.list('-migrado_em', 500),
  });
  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-relatorio'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
  });
  const { data: statusGerentes = [] } = useQuery({
    queryKey: ['status-gerentes-relatorio'],
    queryFn: () => base44.entities.StatusGerente.list(),
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

  // Tempo médio de espera
  const temposEspera = conversasFiltradas
    .filter(c => c.primeira_mensagem_lead_em && c.ultima_resposta_gerente_em)
    .map(c => (new Date(c.ultima_resposta_gerente_em) - new Date(c.primeira_mensagem_lead_em)) / 60000);
  const tempoMedioMin = temposEspera.length
    ? Math.round(temposEspera.reduce((a, b) => a + b, 0) / temposEspera.length)
    : null;

  // Distribuição por gerente
  const statusMap = {};
  for (const s of statusGerentes) statusMap[s.vendedor_id] = s;

  const agora = new Date();
  const distribPorGerente = vendedores.map(v => {
    const st = statusMap[v.id];
    const disponivel = !st || st.disponivel || (st.bloqueado_ate && new Date(st.bloqueado_ate) < agora);
    const motivo = (!disponivel && st?.motivo_bloqueio) || null;
    const bloqueadoAte = st?.bloqueado_ate ? new Date(st.bloqueado_ate) : null;
    const minRestantes = bloqueadoAte && !disponivel ? Math.max(0, Math.round((bloqueadoAte - agora) / 60000)) : null;

    const leadsAtivos = conversasFiltradas.filter(c => c.vendedor_id === v.id && c.status === 'ativa').length;
    const leadsTotal = conversasFiltradas.filter(c => c.vendedor_id === v.id).length;
    const migOrigem = migracoesFiltradas.filter(m => m.vendedor_origem_id === v.id).length;
    const migDestino = migracoesFiltradas.filter(m => m.vendedor_destino_id === v.id).length;

    return { ...v, disponivel, motivo, minRestantes, leadsAtivos, leadsTotal, migOrigem, migDestino };
  });

  // Migrações por gerente
  const migPorGerente = {};
  for (const m of migracoesFiltradas) {
    migPorGerente[m.vendedor_origem_nome] = (migPorGerente[m.vendedor_origem_nome] || 0) + 1;
  }

  const ativos = conversasFiltradas.filter(c => c.status === 'ativa').length;
  const qualificados = conversasFiltradas.filter(c => c.status === 'qualificado').length;
  const encerrados = conversasFiltradas.filter(c => c.status === 'encerrada').length;

  const exportarPDF = () => {
    setExportando(true);
    const printContent = printRef.current?.innerHTML;
    const w = window.open('', '_blank');
    w.document.write(`
      <html>
        <head>
          <title>Relatório de Leads — Villela Exchange</title>
          <style>
            body { font-family: Arial, sans-serif; background: #fff; color: #111; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            h2 { font-size: 14px; color: #555; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
            .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
            .kpi { border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center; }
            .kpi .val { font-size: 24px; font-weight: bold; }
            .kpi .lbl { font-size: 11px; color: #666; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
            th { background: #f0f0f0; padding: 8px; text-align: left; font-size: 11px; }
            td { padding: 7px 8px; border-bottom: 1px solid #eee; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: bold; }
            .ok { background: #d1fae5; color: #065f46; }
            .lock { background: #fee2e2; color: #991b1b; }
            .footer { margin-top: 32px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
          </style>
        </head>
        <body>
          <h1>📊 Relatório de Leads & Atendimento</h1>
          <p style="font-size:12px;color:#666;">Período: últimos ${periodo} dias · Gerado em ${new Date().toLocaleString('pt-BR')}</p>

          <h2>Indicadores Gerais</h2>
          <div class="kpis">
            <div class="kpi"><div class="val">${conversasFiltradas.length}</div><div class="lbl">Total de leads</div></div>
            <div class="kpi"><div class="val">${tempoMedioMin != null ? tempoMedioMin + ' min' : 'N/A'}</div><div class="lbl">Tempo médio de resposta</div></div>
            <div class="kpi"><div class="val">${migracoesFiltradas.length}</div><div class="lbl">Migrações por timeout</div></div>
            <div class="kpi"><div class="val">${qualificados}</div><div class="lbl">Qualificados pela IA</div></div>
          </div>
          <div class="kpis">
            <div class="kpi"><div class="val" style="color:#059669">${ativos}</div><div class="lbl">Ativas</div></div>
            <div class="kpi"><div class="val" style="color:#7c3aed">${qualificados}</div><div class="lbl">Qualificados</div></div>
            <div class="kpi"><div class="val" style="color:#6b7280">${encerrados}</div><div class="lbl">Encerradas</div></div>
            <div class="kpi"></div>
          </div>

          <h2>Distribuição por Gerente</h2>
          <table>
            <thead><tr><th>Gerente</th><th>Status Agenda</th><th>Leads no período</th><th>Leads ativos</th><th>Migrações enviadas</th><th>Migrações recebidas</th></tr></thead>
            <tbody>
              ${distribPorGerente.map(v => `
                <tr>
                  <td>${v.nome}</td>
                  <td><span class="badge ${v.disponivel ? 'ok' : 'lock'}">${v.disponivel ? '✅ Disponível' : `🔒 ${v.motivo || 'bloqueado'}${v.minRestantes ? ' · ' + v.minRestantes + 'min' : ''}`}</span></td>
                  <td>${v.leadsTotal}</td>
                  <td>${v.leadsAtivos}</td>
                  <td>${v.migOrigem}</td>
                  <td>${v.migDestino}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>Histórico de Migrações</h2>
          <table>
            <thead><tr><th>Lead</th><th>De</th><th>Para</th><th>Espera</th><th>Data</th></tr></thead>
            <tbody>
              ${migracoesFiltradas.slice(0, 30).map(m => `
                <tr>
                  <td>${m.lead_nome}</td>
                  <td>${m.vendedor_origem_nome}</td>
                  <td>${m.vendedor_destino_nome}</td>
                  <td>${m.tempo_espera_min} min</td>
                  <td>${fmtDate(m.migrado_em)}</td>
                </tr>
              `).join('')}
              ${migracoesFiltradas.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#999;">Nenhuma migração no período</td></tr>' : ''}
            </tbody>
          </table>

          <div class="footer">Relatório gerado pela plataforma Villela Exchange · ${new Date().toLocaleString('pt-BR')}</div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); setExportando(false); }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl" style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}` }}>

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
            <button onClick={exportarPDF} disabled={exportando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              style={{ background: 'rgba(0,212,170,0.15)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
              <Download className="w-3.5 h-3.5" /> {exportando ? 'Gerando...' : 'Exportar PDF'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg" style={{ color: AURORA.textMuted }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6" ref={printRef}>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total de leads', value: conversasFiltradas.length, color: AURORA.accent, icon: Users },
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

          {/* Distribuição por status */}
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

          {/* ─── DISTRIBUIÇÃO POR GERENTE ─── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid rgba(0,212,170,0.2)` }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
              <Users className="w-4 h-4" style={{ color: AURORA.accent }} />
              <p className="text-sm font-bold" style={{ color: AURORA.text }}>Distribuição por Gerente</p>
              <span className="text-xs ml-auto" style={{ color: AURORA.textMuted }}>Últimos {periodo} dias</span>
            </div>
            <div className="divide-y" style={{ borderColor: AURORA.border }}>
              {/* cabeçalho */}
              <div className="grid gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: AURORA.textMuted, gridTemplateColumns: '1.5fr 1.2fr 0.7fr 0.7fr 0.7fr 0.7fr' }}>
                <span>Gerente</span><span>Status da agenda</span><span>Total</span><span>Ativos</span><span>Envia mig.</span><span>Recebe mig.</span>
              </div>
              {distribPorGerente.length === 0 && (
                <div className="px-5 py-4 text-sm text-center" style={{ color: AURORA.textMuted }}>Nenhum gerente encontrado</div>
              )}
              {distribPorGerente.map(v => (
                <div key={v.id} className="grid gap-2 px-5 py-3 items-center text-sm" style={{ gridTemplateColumns: '1.5fr 1.2fr 0.7fr 0.7fr 0.7fr 0.7fr' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#00D4AA22,#0066cc22)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                      {v.nome.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium truncate" style={{ color: AURORA.text }}>{v.nome}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {v.disponivel ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.15)', color: '#00D4AA' }}>
                        <CheckCircle2 className="w-3 h-3" /> Disponível
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                        <Lock className="w-3 h-3" />
                        {v.motivo || 'Bloqueado'}
                        {v.minRestantes > 0 && <span style={{ opacity: 0.7 }}> · {v.minRestantes}min</span>}
                      </span>
                    )}
                  </div>
                  <span className="font-bold" style={{ color: AURORA.text }}>{v.leadsTotal}</span>
                  <span className="font-bold" style={{ color: '#00D4AA' }}>{v.leadsAtivos}</span>
                  <span className="font-bold" style={{ color: v.migOrigem > 0 ? '#f87171' : AURORA.textMuted }}>{v.migOrigem}</span>
                  <span className="font-bold" style={{ color: v.migDestino > 0 ? '#fbbf24' : AURORA.textMuted }}>{v.migDestino}</span>
                </div>
              ))}
            </div>
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

          {/* Tabela de migrações recentes */}
          <div className="rounded-2xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid rgba(239,68,68,0.2)` }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
              <AlertTriangle className="w-4 h-4" style={{ color: '#f87171' }} />
              <p className="text-sm font-bold" style={{ color: AURORA.text }}>Histórico de Migrações por Timeout</p>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                {migracoesFiltradas.length} no período
              </span>
            </div>
            {migracoesFiltradas.length === 0 ? (
              <p className="text-center text-sm py-6" style={{ color: AURORA.textMuted }}>Nenhuma migração no período 🎉</p>
            ) : (
              <div className="divide-y" style={{ borderColor: AURORA.border }}>
                <div className="grid gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: AURORA.textMuted, gridTemplateColumns: '1.5fr 1fr 1fr 0.6fr 1fr' }}>
                  <span>Lead</span><span>Origem</span><span>Destino</span><span>Espera</span><span>Data</span>
                </div>
                {migracoesFiltradas.slice(0, 20).map(m => (
                  <div key={m.id} className="grid gap-2 px-5 py-2.5 text-xs items-center" style={{ color: AURORA.textMuted, gridTemplateColumns: '1.5fr 1fr 1fr 0.6fr 1fr' }}>
                    <span className="font-medium" style={{ color: AURORA.text }}>{m.lead_nome}</span>
                    <span>{m.vendedor_origem_nome}</span>
                    <span style={{ color: '#fbbf24' }}>{m.vendedor_destino_nome}</span>
                    <span style={{ color: '#f87171', fontWeight: 'bold' }}>{m.tempo_espera_min}min</span>
                    <span>{fmtDate(m.migrado_em)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}