import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  BarChart3, TrendingUp, CheckCircle, XCircle, Send, FileText,
  AlertCircle, Clock, DollarSign, Users, Package, Download, Loader2
} from 'lucide-react';
import { fmtBRL } from './usePrecificacaoConfig';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const STATUS_CONFIG = {
  rascunho:      { label: 'Rascunho',        color: '#94a3b8', bg: 'bg-gray-100',   text: 'text-gray-600',   icon: FileText },
  enviada:       { label: 'Enviada',          color: '#3b82f6', bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Send },
  em_negociacao: { label: 'Em Negociação',    color: '#f59e0b', bg: 'bg-amber-100',  text: 'text-amber-700',  icon: AlertCircle },
  aceita:        { label: 'Aceita',           color: '#22c55e', bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle },
  recusada:      { label: 'Recusada',         color: '#ef4444', bg: 'bg-red-100',    text: 'text-red-700',    icon: XCircle },
};

const PRODUTOS_CORES = {
  'Dolarize': '#b45309',
  'Offshore': '#0e7490',
  'Canal Bancario': '#6d28d9',
  'Conta Internacional': '#1a3a6b',
  'Seguro Garantia': '#be123c',
};

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function KPICard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-500' },
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'text-green-500' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: 'text-amber-500' },
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: 'text-red-500' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-500' },
    slate:  { bg: 'bg-slate-50',  text: 'text-slate-700',  icon: 'text-slate-500' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`rounded-2xl p-5 ${c.bg} border border-white`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl bg-white/70 ${c.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className={`text-xs font-semibold uppercase tracking-wide ${c.text} opacity-70`}>{label}</span>
      </div>
      <p className={`text-2xl font-extrabold ${c.text}`}>{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60 text-gray-600">{sub}</p>}
    </div>
  );
}

export default function RelatorioPrecificacao() {
  const hoje = new Date();
  const [anoFiltro, setAnoFiltro] = useState(hoje.getFullYear());

  const { data: propostas = [], isLoading } = useQuery({
    queryKey: ['propostas-relatorio'],
    queryFn: () => base44.entities.PropostaPrecificacao.list('-created_date', 500),
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-ativos'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
  });

  const doAno = propostas.filter(p => {
    const d = new Date(p.created_date);
    return d.getFullYear() === anoFiltro;
  });

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const total        = doAno.length;
  const aceitas      = doAno.filter(p => p.status === 'aceita').length;
  const recusadas    = doAno.filter(p => p.status === 'recusada').length;
  const emAndamento  = doAno.filter(p => ['enviada', 'em_negociacao'].includes(p.status)).length;
  const taxaConversao = total > 0 ? ((aceitas / total) * 100).toFixed(1) : '0.0';
  const valorAceitas = doAno.filter(p => p.status === 'aceita').reduce((s, p) => s + (p.valor_estimado || 0), 0);
  const valorTotal   = doAno.reduce((s, p) => s + (p.valor_estimado || 0), 0);

  // ── Por status (pie) ─────────────────────────────────────────────────────
  const porStatus = Object.entries(STATUS_CONFIG).map(([k, cfg]) => ({
    name: cfg.label,
    value: doAno.filter(p => p.status === k).length,
    color: cfg.color,
  })).filter(s => s.value > 0);

  // ── Por produto (bar) ────────────────────────────────────────────────────
  const produtosUnicos = [...new Set(doAno.map(p => p.produto).filter(Boolean))];
  const porProduto = produtosUnicos.map(prod => ({
    produto: prod,
    total:    doAno.filter(p => p.produto === prod).length,
    aceitas:  doAno.filter(p => p.produto === prod && p.status === 'aceita').length,
    recusadas: doAno.filter(p => p.produto === prod && p.status === 'recusada').length,
    valor:    doAno.filter(p => p.produto === prod && p.status === 'aceita').reduce((s, p) => s + (p.valor_estimado || 0), 0),
  })).sort((a, b) => b.total - a.total);

  // ── Por mês (bar) ────────────────────────────────────────────────────────
  const porMes = Array.from({ length: 12 }, (_, i) => {
    const doMes = doAno.filter(p => new Date(p.created_date).getMonth() === i);
    return {
      mes: MESES[i],
      propostas: doMes.length,
      aceitas:   doMes.filter(p => p.status === 'aceita').length,
    };
  });

  // ── Ranking de gerentes ──────────────────────────────────────────────────
  const rankingGerentes = [...new Set(doAno.map(p => p.vendedor_nome).filter(Boolean))]
    .map(nome => ({
      nome,
      total:    doAno.filter(p => p.vendedor_nome === nome).length,
      aceitas:  doAno.filter(p => p.vendedor_nome === nome && p.status === 'aceita').length,
      valor:    doAno.filter(p => p.vendedor_nome === nome && p.status === 'aceita').reduce((s, p) => s + (p.valor_estimado || 0), 0),
    }))
    .sort((a, b) => b.aceitas - a.aceitas);

  const anos = [...new Set(propostas.map(p => new Date(p.created_date).getFullYear()))].sort((a, b) => b - a);
  if (!anos.includes(anoFiltro) && anos.length) setAnoFiltro(anos[0]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho + Filtro de ano ─────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Relatório de Precificação</h2>
          <p className="text-xs text-gray-400 mt-0.5">Análise das propostas geradas pelos simuladores</p>
        </div>
        <select
          value={anoFiltro}
          onChange={e => setAnoFiltro(Number(e.target.value))}
          className="border border-gray-200 rounded-xl py-2 px-4 text-sm bg-white focus:outline-none focus:border-blue-400"
        >
          {(anos.length ? anos : [hoje.getFullYear()]).map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard icon={FileText}    label="Total"           value={total}                    color="slate" />
        <KPICard icon={CheckCircle} label="Aceitas"         value={aceitas}                  color="green" />
        <KPICard icon={Send}        label="Em Andamento"    value={emAndamento}              color="blue" />
        <KPICard icon={XCircle}     label="Recusadas"       value={recusadas}                color="red" />
        <KPICard icon={TrendingUp}  label="Conversão"       value={`${taxaConversao}%`}      color="violet" />
        <KPICard icon={DollarSign}  label="Valor Aceito"    value={fmtBRL(valorAceitas)}     sub={`de ${fmtBRL(valorTotal)} em propostas`} color="amber" />
      </div>

      {/* ── Gráficos principais ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Propostas por mês */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" /> Propostas por Mês — {anoFiltro}
          </h3>
          {doAno.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sem dados para o período</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porMes} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v, n) => [v, n === 'propostas' ? 'Propostas' : 'Aceitas']} />
                <Bar dataKey="propostas" name="Propostas" fill="#1a3150" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aceitas"   name="Aceitas"   fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pizza por status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-violet-500" /> Por Status
          </h3>
          {porStatus.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={porStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {porStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Por Produto ───────────────────────────────────────────────── */}
      {porProduto.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-500" /> Desempenho por Produto
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Produto</th>
                  <th className="text-center pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  <th className="text-center pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aceitas</th>
                  <th className="text-center pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recusadas</th>
                  <th className="text-center pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Conversão</th>
                  <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor Aceito</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {porProduto.map(p => {
                  const conv = p.total > 0 ? ((p.aceitas / p.total) * 100).toFixed(0) : 0;
                  const cor = PRODUTOS_CORES[p.produto] || '#1a3150';
                  return (
                    <tr key={p.produto} className="hover:bg-gray-50 transition">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cor }} />
                          <span className="font-medium text-gray-800">{p.produto}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 text-gray-600">{p.total}</td>
                      <td className="text-center py-3">
                        <span className="text-green-600 font-semibold">{p.aceitas}</span>
                      </td>
                      <td className="text-center py-3">
                        <span className="text-red-500 font-semibold">{p.recusadas}</span>
                      </td>
                      <td className="text-center py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${conv}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 w-8 text-right">{conv}%</span>
                        </div>
                      </td>
                      <td className="text-right py-3 font-semibold text-gray-800">{fmtBRL(p.valor)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="py-3 font-bold text-gray-800 pl-5">Total</td>
                  <td className="text-center py-3 font-bold text-gray-800">{total}</td>
                  <td className="text-center py-3 font-bold text-green-600">{aceitas}</td>
                  <td className="text-center py-3 font-bold text-red-500">{recusadas}</td>
                  <td className="text-center py-3 font-bold text-gray-800">{taxaConversao}%</td>
                  <td className="text-right py-3 font-bold text-gray-800">{fmtBRL(valorAceitas)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Ranking de Gerentes ───────────────────────────────────────── */}
      {rankingGerentes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Ranking de Gerentes
          </h3>
          <div className="space-y-3">
            {rankingGerentes.slice(0, 10).map((g, i) => {
              const conv = g.total > 0 ? ((g.aceitas / g.total) * 100).toFixed(0) : 0;
              const medalhas = ['🥇', '🥈', '🥉'];
              return (
                <div key={g.nome} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
                  <span className="w-6 text-base flex-shrink-0 text-center">
                    {i < 3 ? medalhas[i] : <span className="text-sm font-bold text-gray-400">{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{g.nome}</p>
                    <p className="text-xs text-gray-400">{g.total} propost{g.total !== 1 ? 'as' : 'a'} · {g.aceitas} aceita{g.aceitas !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs font-bold text-green-600">{conv}% conv.</span>
                    <span className="text-xs text-gray-500">{fmtBRL(g.valor)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nenhuma proposta gerada em {anoFiltro}</p>
          <p className="text-sm text-gray-400 mt-1">Use os simuladores para gerar propostas e acompanhar aqui.</p>
        </div>
      )}
    </div>
  );
}