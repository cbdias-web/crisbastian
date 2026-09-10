import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  TrendingUp, FileText, DollarSign, Trophy, RefreshCw, Loader2,
} from 'lucide-react';
import { periodoRange, dentroPeriodo } from './FiltroIndicadores';
import VendasEfetivasModal from './VendasEfetivasModal';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  green: '#34d399',
};

const fmtMoeda = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

export default function ConsolidadoIndicadores({ periodo, parceiroId, parceiros: parceirosProp }) {
  const queryClient = useQueryClient();
  const [showVendas, setShowVendas] = useState(false);
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['consolidado-leads'],
    queryFn: () => base44.entities.LeadIndicacao.list('-created_date', 500),
    refetchInterval: 30000,
  });

  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ['consolidado-vendas-indicadores'],
    queryFn: () => base44.entities.Venda.list('-created_date', 500),
  });

  // Parcelas futuras liquidadas (status='recebida') — somam à conversão/comissão
  // da indicação conforme a jornada completa do lead (entrada + parcelas pagas).
  const { data: parcelas = [], isLoading: loadingParcelas } = useQuery({
    queryKey: ['consolidado-parcelas-recebidas'],
    queryFn: () => base44.entities.ParcelaVenda.list('-created_date', 500),
  });

  const { data: parceirosQuery = [] } = useQuery({
    queryKey: ['consolidado-parceiros-ids'],
    queryFn: () => base44.entities.Parceiro.list('-created_date', 500),
    enabled: !parceirosProp,
  });
  const parceiros = parceirosProp || parceirosQuery;

  const range = periodoRange(periodo);
  const filtraParceiro = (parceiroIdItem) => !parceiroId || parceiroId === 'todos' || parceiroId === parceiroIdItem;

  // ── Fonte da verdade: a ORIGEM PORTAL (LeadIndicacao.venda_id) ──────────────
  // O Dash Parceiro acompanha apenas leads que nasceram no portal do indicador.
  // Uma venda feita pelo gerente (mesmo com espelhamento apontando para um Parceiro)
  // NÃO entra aqui — é uma operação distinta. O vínculo venda_id na LeadIndicacao é
  // estabelecido pela automação sincronizarJornadaIndicacaoVenda (e pela migração
  // contrato→venda), então esta view apenas consome esse vínculo.
  const leadsFiltrados = leads.filter(l => dentroPeriodo(l.created_date, range) && filtraParceiro(l.parceiro_id));
  const total = leadsFiltrados.length;
  const volumeIndicado = leadsFiltrados.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);

  // venda_id (da venda) -> { parceiro_id, parceiro_nome, percentual }
  // Construído a partir de TODOS os leads (não só os filtrados pelo período): o
  // vínculo venda↔parceiro independe de quando a indicação foi recebida. Assim uma
  // venda gerada hoje a partir de um lead do mês passado é contabilizada no mês
  // da VENDA (v.data), não fica presa ao mês do lead nem cai entre os meses.
  const vendaParaParceiro = {};
  leads.forEach(l => {
    if (l.venda_id && !vendaParaParceiro[l.venda_id]) {
      vendaParaParceiro[l.venda_id] = {
        parceiro_id: l.parceiro_id,
        parceiro_nome: l.parceiro_nome,
        percentual: Number(l.parceiro_percentual) || 0,
      };
    }
  });
  const portalVendaIds = new Set(Object.keys(vendaParaParceiro));

  // Vendas convertidas a partir de indicação de portal (pelo vínculo LeadIndicacao.venda_id).
  // Não exige comprovante: a conversão (lead → venda) aconteceu; o pagamento é um detalhe
  // financeiro, refletido no status da indicação pela automação.
  const vendasIndicadas = vendas.filter(v =>
    v.tipo_venda !== 'recorrencia' &&
    portalVendaIds.has(v.id) &&
    dentroPeriodo(v.data, range) &&
    (parceiroId === 'todos' || !parceiroId || vendaParaParceiro[v.id]?.parceiro_id === parceiroId)
  );
  const valorVenda = (v) => Number(v.valor) || 0;
  // Percentual do parceiro na venda: lê do espelhamento da própria venda (valor efetivo
  // atribuído no ato); cai para o percentual da indicação se não houver.
  const pctParceiroNaVenda = (v) => {
    const info = vendaParaParceiro[v.id];
    if (!info) return 0;
    const ind = (v.indicadores || []).find(i => i && i.id === info.parceiro_id);
    return ind ? (Number(ind.percentual) || 0) : info.percentual;
  };

  // Parcelas liquidadas (recebidas) cuja venda original veio de indicação de portal.
  const parcelasRecebidas = parcelas.filter(p =>
    p.status === 'recebida' &&
    portalVendaIds.has(p.venda_id) &&
    dentroPeriodo(p.data_recebimento, range) &&
    (parceiroId === 'todos' || !parceiroId || vendaParaParceiro[p.venda_id]?.parceiro_id === parceiroId)
  );
  const valorParcela = (p) => Number(p.valor_parcela) || 0;
  const pctParceiroNaParcela = (p) => {
    const info = vendaParaParceiro[p.venda_id];
    if (!info) return 0;
    const ind = (p.indicadores || []).find(i => i && i.id === info.parceiro_id);
    return ind ? (Number(ind.percentual) || 0) : info.percentual;
  };

  const totalEntradas = vendasIndicadas.reduce((s, v) => s + valorVenda(v), 0);
  const totalParcelas = parcelasRecebidas.reduce((s, p) => s + valorParcela(p), 0);
  const vendasConvertidasValor = totalEntradas + totalParcelas;
  const vendasEfetivasCount = vendasIndicadas.length;
  const comissaoGerada =
    vendasIndicadas.reduce((s, v) => s + valorVenda(v) * (pctParceiroNaVenda(v) / 100), 0) +
    parcelasRecebidas.reduce((s, p) => s + valorParcela(p) * (pctParceiroNaParcela(p) / 100), 0);

  // Detalhe das vendas contabilizadas no KPI "Vendas efetivas" (popup ao clicar)
  const vendasDetalhe = vendasIndicadas.map(v => ({
    id: v.id,
    cliente: v.cliente,
    produto: v.produto,
    data: v.data,
    valor: valorVenda(v),
    percentual: pctParceiroNaVenda(v),
    comissao: valorVenda(v) * (pctParceiroNaVenda(v) / 100),
    indicador: vendaParaParceiro[v.id]?.parceiro_nome || '—',
  }));

  // Funil de conversão — OBJETOS DE CÁLCULO DISTINTOS:
  //   Vendas Convertidas (verde)  = VENDAS com data (v.data) dentro do período,
  //                                 originadas de indicação do portal. Contadas pela
  //                                 DATA DA VENDA: uma venda fechada este mês entra
  //                                 neste mês, mesmo que a indicação tenha nascido
  //                                 em um mês anterior.
  //   Contratos (roxo)            = indicações RECEBIDAS no período que viraram
  //                                 contrato, mas ainda não viraram venda
  //   Indicações (verde-azulado)  = indicações RECEBIDAS no período ainda sem contrato
  // A indicação pertence ao mês em que foi recebida (created_date); a conversão em
  // venda pertence ao mês da venda (v.data) — por isso a soma dos segmentos pode
  // exceder o total de indicações recebidas no período.
  const leadsPeriodo = leads.filter(l => filtraParceiro(l.parceiro_id) && dentroPeriodo(l.created_date, range));
  const vendaIdsNoPeriodo = new Set(vendasIndicadas.map(v => v.id));
  const temContrato = (l) => !!(l.contrato_id || ['convertido_contrato', 'convertido_venda'].includes(l.status));
  const contratosApenas = leadsPeriodo.filter(l => temContrato(l) && !vendaIdsNoPeriodo.has(l.venda_id)).length;
  const indicacoesApenas = leadsPeriodo.filter(l => !temContrato(l) && !vendaIdsNoPeriodo.has(l.venda_id)).length;
  const vendasCount = vendasIndicadas.length;
  const totalGrafico = indicacoesApenas + contratosApenas + vendasCount;
  const chartData = [
    { key: 'indicacoes', name: 'Indicações', value: indicacoesApenas, color: AURORA.accent },
    { key: 'contratos', name: 'Contratos', value: contratosApenas, color: '#a78bfa' },
    { key: 'vendas', name: 'Vendas Convertidas', value: vendasCount, color: AURORA.green },
  ].filter(d => d.value > 0);

  // Ranking de indicadores (top 5) — total de indicações + vendas convertidas (origem portal)
  const rankingMap = {};
  leadsFiltrados.forEach(l => {
    const key = l.parceiro_id || '_sem';
    const nome = l.parceiro_nome || 'Sem parceiro';
    if (!rankingMap[key]) rankingMap[key] = { nome, total: 0, vendas: 0, valorVendas: 0, valor: 0 };
    rankingMap[key].total++;
  });
  vendasIndicadas.forEach(v => {
    const info = vendaParaParceiro[v.id];
    if (!info) return;
    const key = info.parceiro_id;
    if (parceiroId !== 'todos' && parceiroId && key !== parceiroId) return;
    if (!rankingMap[key]) rankingMap[key] = { nome: info.parceiro_nome || '—', total: 0, vendas: 0, valorVendas: 0, valor: 0 };
    rankingMap[key].vendas++;
    rankingMap[key].valorVendas += valorVenda(v);
    rankingMap[key].valor += valorVenda(v) * (pctParceiroNaVenda(v) / 100);
  });
  // Soma parcelas liquidadas ao valor acumulado e comissão de cada indicador.
  parcelasRecebidas.forEach(p => {
    const info = vendaParaParceiro[p.venda_id];
    if (!info) return;
    const key = info.parceiro_id;
    if (parceiroId !== 'todos' && parceiroId && key !== parceiroId) return;
    if (!rankingMap[key]) rankingMap[key] = { nome: info.parceiro_nome || '—', total: 0, vendas: 0, valorVendas: 0, valor: 0 };
    rankingMap[key].valorVendas += valorParcela(p);
    rankingMap[key].valor += valorParcela(p) * (pctParceiroNaParcela(p) / 100);
  });
  // Ranking ordenado pelo RESULTADO gerado no período (comissão → valor de vendas →
  // nº de indicações): um indicador que fechou venda este mês aparece no topo, mesmo
  // que a indicação de origem tenha nascido em mês anterior.
  const ranking = Object.values(rankingMap)
    .sort((a, b) => b.valor - a.valor || b.valorVendas - a.valorVendas || b.total - a.total)
    .slice(0, 5);

  const isLoading = loadingLeads || loadingVendas || loadingParcelas;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.text }}>
            <TrendingUp className="w-4 h-4" style={{ color: AURORA.accent }} /> Consolidação Geral
          </h2>
          <p className="text-xs" style={{ color: AURORA.textMuted }}>Soma de todas as indicações e conversões enviadas pelos indicadores</p>
        </div>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['consolidado-leads'] });
            queryClient.invalidateQueries({ queryKey: ['consolidado-vendas-indicadores'] });
          }}
          className="p-2 rounded-xl transition"
          style={{ background: AURORA.surface, color: AURORA.textMuted, border: `1px solid ${AURORA.border}` }}
          title="Atualizar consolidação">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Kpi label="Volume indicado" value={fmtMoeda(volumeIndicado)} icon={TrendingUp} color={AURORA.accent} />
        <Kpi label="Total de indicações" value={total} icon={FileText} color={AURORA.text} />
        <Kpi label="Vendas convertidas" value={fmtMoeda(vendasConvertidasValor)} icon={DollarSign} color={AURORA.green} />
        <Kpi label="Vendas efetivas" value={vendasEfetivasCount} icon={Trophy} color={AURORA.green} onClick={() => setShowVendas(true)} />
        <Kpi label="Comissão gerada" value={fmtMoeda(comissaoGerada)} icon={DollarSign} color={AURORA.accent} />
      </div>

      <div className="rounded-2xl p-5" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
        <p className="text-sm font-bold mb-3" style={{ color: AURORA.text }}>Distribuição por status</p>
        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: AURORA.accent }} /></div>
        ) : totalGrafico === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: AURORA.textMuted }}>Nenhuma indicação registrada</p>
        ) : (
          <div className="flex flex-col md:flex-row items-stretch gap-5">
            <div className="relative flex-shrink-0" style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                    {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    cursor={{ fill: 'rgba(0,212,170,0.06)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{
                          background: AURORA.surface2,
                          border: `1px solid ${AURORA.border}`,
                          borderRadius: 10,
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: AURORA.text }}>{d.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: AURORA.accent }}>{d.value}</span>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold" style={{ color: AURORA.text }}>{totalGrafico}</p>
                <p className="text-[10px]" style={{ color: AURORA.textMuted }}>indicações e vendas no período</p>
              </div>
            </div>

            {/* Legenda compacta */}
            <div className="flex flex-col justify-center gap-2 flex-shrink-0">
              {chartData.map(d => (
                <div key={d.key} className="flex items-center gap-2 whitespace-nowrap">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-xs" style={{ color: AURORA.textMuted }}>{d.name}</span>
                  <span className="text-xs font-bold" style={{ color: AURORA.text }}>{d.value}</span>
                </div>
              ))}
            </div>

            {/* Ranking de indicadores */}
            <div className="flex-1 min-w-0">
              <div className="rounded-xl h-full p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Trophy className="w-3.5 h-3.5" style={{ color: AURORA.accent }} />
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Top Indicadores</p>
                </div>
                {ranking.length === 0 ? (
                  <p className="text-[11px] py-3 text-center" style={{ color: AURORA.textMuted }}>Sem indicadores no período</p>
                ) : (
                  <div className="space-y-1.5">
                    {ranking.map((r, i) => {
                      const medal = ['#fbbf24', '#cbd5e1', '#d97706'][i] || AURORA.textMuted;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-5 text-center text-[11px] font-bold flex-shrink-0" style={{ color: medal }}>{i + 1}º</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: AURORA.text }}>{r.nome}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px]" style={{ color: AURORA.textMuted }}>{r.total} ind.</span>
                              {r.vendas > 0 && (
                                <span className="text-[10px] font-semibold" style={{ color: AURORA.green }}>
                                  {r.vendas} venda{r.vendas > 1 ? 's' : ''} · {fmtMoeda(r.valorVendas)}
                                </span>
                              )}
                              {r.vendas > 0 && r.valor > 0 && (
                                <span className="text-[10px]" style={{ color: AURORA.textMuted }}>
                                  · comissão <strong style={{ color: AURORA.accent }}>{fmtMoeda(r.valor)}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showVendas && <VendasEfetivasModal vendas={vendasDetalhe} onClose={() => setShowVendas(false)} />}
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color, onClick }) {
  return (
    <div onClick={onClick} title={onClick ? 'Clique para ver o detalhe' : undefined}
      className={`rounded-2xl p-4 transition${onClick ? ' cursor-pointer' : ''}`}
      style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = '0 8px 24px rgba(52,211,153,0.18)'; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.boxShadow = 'none'; }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <p className="text-[11px]" style={{ color: AURORA.textMuted }}>{label}</p>
      </div>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}