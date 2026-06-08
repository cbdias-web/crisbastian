import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getImpersonatedVendedor } from '@/lib/impersonation';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, Calendar, FileText, DollarSign, Target, Activity, Phone } from 'lucide-react';
import { format, subMonths, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FiltrosDesempenho, { buildDateRange } from '@/components/desempenho/FiltrosDesempenho';

const COLORS = ['#0f1e35', '#1a73e8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const fmtBRL = (v) => v >= 1000000 ? `R$ ${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`;

function StatCard({ icon: Icon, label, value, sub, color = 'bg-[#0f1e35]' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const FILTROS_PADRAO = {
  periodo: '6_meses',
  dataInicio: '',
  dataFim: '',
  vendedores_sel: [],
  produtos_sel: [],
  temperatura: '',
  status_contrato: '',
  tipo_interacao: '',
  time: '',
};

export default function Desempenho() {
  const [user, setUser] = useState(null);
  const [vendedor, setVendedor] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_PADRAO);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!u) return;
      setUser(u);
      const isAdm = u.role === 'admin' || u.permissao_admin === true;
      const imp = isAdm ? getImpersonatedVendedor() : null;
      if (imp) { setVendedor(imp); return; }
      const vs = await base44.entities.Vendedor.filter({ email: u.email });
      if (vs.length > 0) setVendedor(vs[0]);
    };
    load();
    window.addEventListener('impersonation-change', load);
    return () => window.removeEventListener('impersonation-change', load);
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  // Data queries
  const { data: vendas = [] } = useQuery({
    queryKey: ['desempenho-vendas'],
    queryFn: () => base44.entities.Venda.list('-data', 5000),
    enabled: !!user,
  });

  const { data: agenda = [] } = useQuery({
    queryKey: ['desempenho-agenda'],
    queryFn: () => base44.entities.AgendaContato.list('-data_agendada', 5000),
    enabled: !!user,
  });

  const { data: pipeline = [] } = useQuery({
    queryKey: ['desempenho-pipeline'],
    queryFn: () => base44.entities.Pipeline.list('-created_date', 2000),
    enabled: !!user,
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ['desempenho-contratos'],
    queryFn: () => base44.entities.Contrato.list('-created_date', 2000),
    enabled: !!user,
  });

  const { data: interacoes = [] } = useQuery({
    queryKey: ['desempenho-interacoes'],
    queryFn: () => base44.entities.InteracaoCliente.list('-data_interacao', 5000),
    enabled: !!user,
  });

  const { data: todosVendedores = [] } = useQuery({
    queryKey: ['desempenho-vendedores'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: isAdmin,
  });

  // ── Derivações de filtros ──────────────────────────────────────────────────
  const dateRange = useMemo(() => buildDateRange(filtros.periodo, filtros.dataInicio, filtros.dataFim), [filtros.periodo, filtros.dataInicio, filtros.dataFim]);

  // Meses para os gráficos de série temporal
  const MONTHS = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    if (!isValid(start) || !isValid(end)) return [];
    return eachMonthOfInterval({ start, end }).map(d => ({
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMM/yy', { locale: ptBR }),
    }));
  }, [dateRange]);

  // Lista de produtos únicos
  const produtos = useMemo(() => [...new Set(vendas.map(v => v.produto).filter(Boolean))].sort(), [vendas]);

  // Filtragem por vendedor (admin vs gerente)
  const filtrarVendedor = (arr, campo = 'vendedor_id') => {
    if (isAdmin) {
      // Se admin selecionou gerentes específicos, filtra
      if (filtros.vendedores_sel?.length > 0) {
        return arr.filter(i => filtros.vendedores_sel.includes(i[campo]));
      }
      // Se filtrou por time
      if (filtros.time) {
        const idsDoTime = todosVendedores.filter(v => v.time === filtros.time).map(v => v.id);
        return arr.filter(i => idsDoTime.includes(i[campo]));
      }
      return arr;
    }
    return arr.filter(i => i[campo] === vendedor?.id);
  };

  // Filtragem por data
  const filtrarData = (arr, campo) => {
    if (!dateRange.start && !dateRange.end) return arr;
    return arr.filter(i => {
      const d = i[campo];
      if (!d) return false;
      const dt = d.slice(0, 10);
      if (dateRange.start && dt < dateRange.start) return false;
      if (dateRange.end && dt > dateRange.end) return false;
      return true;
    });
  };

  // Aplicar todos os filtros
  const vendasF = useMemo(() => {
    let r = filtrarVendedor(vendas);
    r = filtrarData(r, 'data');
    if (filtros.produtos_sel?.length > 0) r = r.filter(v => filtros.produtos_sel.includes(v.produto));
    return r;
  }, [vendas, filtros, todosVendedores, vendedor, dateRange]);

  const agendaF = useMemo(() => filtrarData(filtrarVendedor(agenda), 'data_agendada'), [agenda, filtros, todosVendedores, vendedor, dateRange]);

  const pipelineF = useMemo(() => {
    let r = filtrarVendedor(pipeline);
    if (filtros.temperatura) r = r.filter(p => p.temperatura === filtros.temperatura);
    return r;
  }, [pipeline, filtros, todosVendedores, vendedor]);

  const contratosF = useMemo(() => {
    let r = filtrarVendedor(contratos);
    r = filtrarData(r, 'created_date');
    if (filtros.status_contrato) r = r.filter(c => c.status === filtros.status_contrato);
    if (filtros.produtos_sel?.length > 0) r = r.filter(c => filtros.produtos_sel.includes(c.tipo));
    return r;
  }, [contratos, filtros, todosVendedores, vendedor, dateRange]);

  const interacoesF = useMemo(() => filtrarData(filtrarVendedor(interacoes), 'data_interacao'), [interacoes, filtros, todosVendedores, vendedor, dateRange]);

  // ── Gráficos ──────────────────────────────────────────────────────────────
  const vendasXContatos = MONTHS.map(m => ({
    mes: m.label,
    vendas: vendasF.filter(v => v.data?.startsWith(m.key)).length,
    contatos: agendaF.filter(a => a.data_agendada?.startsWith(m.key)).length,
    realizados: agendaF.filter(a => a.data_agendada?.startsWith(m.key) && a.status === 'realizado').length,
  }));

  const vendasXPipe = MONTHS.map(m => ({
    mes: m.label,
    vendas: vendasF.filter(v => v.data?.startsWith(m.key)).length,
    pipeline_quente: pipelineF.filter(p => p.created_date?.startsWith(m.key) && p.temperatura === 'Quente').length,
    pipeline_fechado: pipelineF.filter(p => p.created_date?.startsWith(m.key) && p.temperatura === 'Fechado').length,
  }));

  const statusCount = contratosF.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});
  const contratosStatus = Object.entries(statusCount).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  const tipoCount = contratosF.reduce((acc, c) => { acc[c.tipo] = (acc[c.tipo] || 0) + 1; return acc; }, {});
  const contratosTipo = Object.entries(tipoCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const interacoesChart = MONTHS.map(m => ({
    mes: m.label,
    positivo: interacoesF.filter(i => i.data_interacao?.startsWith(m.key) && i.resultado === 'Positivo').length,
    negativo: interacoesF.filter(i => i.data_interacao?.startsWith(m.key) && i.resultado === 'Negativo').length,
    neutro: interacoesF.filter(i => i.data_interacao?.startsWith(m.key) && i.resultado === 'Neutro').length,
    sem_resposta: interacoesF.filter(i => i.data_interacao?.startsWith(m.key) && i.resultado === 'Sem resposta').length,
  }));

  const tempCount = pipelineF.reduce((acc, p) => { acc[p.temperatura] = (acc[p.temperatura] || 0) + 1; return acc; }, {});
  const pipelineTemp = [
    { name: 'Frio', value: tempCount['Frio'] || 0, color: '#93c5fd' },
    { name: 'Morno', value: tempCount['Morno'] || 0, color: '#fbbf24' },
    { name: 'Quente', value: tempCount['Quente'] || 0, color: '#f97316' },
    { name: 'Fechado', value: tempCount['Fechado'] || 0, color: '#10b981' },
    { name: 'Perdido', value: tempCount['Perdido'] || 0, color: '#ef4444' },
  ].filter(p => p.value > 0);

  const produtoMap = vendasF.reduce((acc, v) => {
    const k = v.produto || 'Outros';
    if (!acc[k]) acc[k] = { produto: k, total: 0, qtd: 0 };
    acc[k].total += v.valor || 0;
    acc[k].qtd++;
    return acc;
  }, {});
  const produtoChart = Object.values(produtoMap).sort((a, b) => b.total - a.total).slice(0, 8);

  // ── Ranking de gerentes (admin only) ─────────────────────────────────────
  const rankingGerentes = useMemo(() => {
    if (!isAdmin) return [];
    const map = {};
    vendasF.forEach(v => {
      const id = v.vendedor_id;
      if (!id) return;
      if (!map[id]) map[id] = { id, nome: v.assessor_comercial || 'Desconhecido', vendas: 0, receita: 0 };
      map[id].vendas++;
      map[id].receita += v.valor || 0;
    });
    return Object.values(map).sort((a, b) => b.receita - a.receita).slice(0, 10);
  }, [vendasF, isAdmin]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const vendasTotal = vendasF.length;
  const receitaTotal = vendasF.reduce((s, v) => s + (v.valor || 0), 0);
  const contratosAbertos = contratosF.filter(c => !['pago', 'no_pipeline'].includes(c.status)).length;
  const pipelineAtivos = pipelineF.filter(p => !['Fechado', 'Perdido'].includes(p.temperatura)).length;
  const taxaConversao = agendaF.length > 0 ? ((vendasTotal / agendaF.length) * 100).toFixed(1) : '0';
  const ticketMedio = vendasTotal > 0 ? (receitaTotal / vendasTotal) : 0;

  // Label do período
  const periodoLabel = (() => {
    if (filtros.periodo !== 'custom') return '';
    if (filtros.dataInicio && filtros.dataFim)
      return ` (${filtros.dataInicio.slice(0, 7)} → ${filtros.dataFim.slice(0, 7)})`;
    return '';
  })();

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel de Desempenho</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isAdmin
                ? filtros.vendedores_sel?.length > 0
                  ? `${filtros.vendedores_sel.length} gerente${filtros.vendedores_sel.length > 1 ? 's' : ''} selecionado${filtros.vendedores_sel.length > 1 ? 's' : ''}`
                  : filtros.time
                    ? `Time: ${filtros.time}`
                    : 'Todos os gerentes'
                : vendedor?.nome || 'Minha visão'}
              {periodoLabel}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <FiltrosDesempenho
          vendedores={todosVendedores}
          produtos={produtos}
          filtros={filtros}
          onChange={setFiltros}
          isAdmin={isAdmin}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={DollarSign} label="Total de Vendas" value={vendasTotal} sub={fmtBRL(receitaTotal)} color="bg-[#0f1e35]" />
          <StatCard icon={Target} label="Ticket Médio" value={fmtBRL(ticketMedio)} sub={`${vendasTotal} vendas`} color="bg-violet-600" />
          <StatCard icon={Phone} label="Contatos" value={agendaF.length} sub={`${agendaF.filter(a => a.status === 'realizado').length} realizados`} color="bg-blue-600" />
          <StatCard icon={TrendingUp} label="Taxa Conversão" value={`${taxaConversao}%`} sub="vendas / contatos" color="bg-cyan-600" />
          <StatCard icon={FileText} label="Contratos Abertos" value={contratosAbertos} sub="Aguardando fechamento" color="bg-amber-600" />
          <StatCard icon={Activity} label="Pipeline Ativo" value={pipelineAtivos} sub="Negociações em curso" color="bg-emerald-600" />
        </div>

        {/* Filtros aplicados tags */}
        {(filtros.vendedores_sel?.length > 0 || filtros.produtos_sel?.length > 0 || filtros.temperatura || filtros.status_contrato) && (
          <div className="flex flex-wrap gap-2">
            {filtros.vendedores_sel?.map(id => {
              const v = todosVendedores.find(x => x.id === id);
              return v ? (
                <span key={id} className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-medium">
                  {v.nome}
                  <button onClick={() => setFiltros(f => ({ ...f, vendedores_sel: f.vendedores_sel.filter(x => x !== id) }))} className="hover:text-blue-900">✕</button>
                </span>
              ) : null;
            })}
            {filtros.produtos_sel?.map(p => (
              <span key={p} className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-medium">
                {p}
                <button onClick={() => setFiltros(f => ({ ...f, produtos_sel: f.produtos_sel.filter(x => x !== p) }))} className="hover:text-emerald-900">✕</button>
              </span>
            ))}
            {filtros.temperatura && (
              <span className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-full font-medium">
                Pipeline: {filtros.temperatura}
                <button onClick={() => setFiltros(f => ({ ...f, temperatura: '' }))} className="hover:text-orange-900">✕</button>
              </span>
            )}
            {filtros.status_contrato && (
              <span className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-medium">
                Contrato: {filtros.status_contrato.replace(/_/g, ' ')}
                <button onClick={() => setFiltros(f => ({ ...f, status_contrato: '' }))} className="hover:text-amber-900">✕</button>
              </span>
            )}
          </div>
        )}

        {/* Row 1: Vendas x Contatos | Vendas x Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="📞 Vendas × Contatos Agenda">
            {MONTHS.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Defina um período válido</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={vendasXContatos} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="vendas" name="Vendas" fill="#0f1e35" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="contatos" name="Agendados" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realizados" name="Realizados" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="🔥 Vendas × Conversões Pipeline">
            {MONTHS.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Defina um período válido</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={vendasXPipe}>
                  <defs>
                    <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f1e35" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0f1e35" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gQuente" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="vendas" name="Vendas fechadas" stroke="#0f1e35" fill="url(#gVendas)" strokeWidth={2} dot={{ r: 3 }} />
                  <Area type="monotone" dataKey="pipeline_quente" name="Pipeline quente" stroke="#f97316" fill="url(#gQuente)" strokeWidth={2} dot={{ r: 3 }} />
                  <Area type="monotone" dataKey="pipeline_fechado" name="Pipeline fechado" stroke="#10b981" fill="none" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Row 2: Status contratos | Temperatura pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="📄 Contratos por Status">
            {contratosStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum contrato no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={contratosStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="value" name="Contratos" fill="#1a73e8" radius={[0, 4, 4, 0]}>
                    {contratosStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="🌡️ Pipeline por Temperatura">
            {pipelineTemp.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma negociação encontrada</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="60%" height={220}>
                  <PieChart>
                    <Pie data={pipelineTemp} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      {pipelineTemp.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} negociações`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2.5">
                  {pipelineTemp.map(p => (
                    <div key={p.name} className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <div>
                        <p className="text-xs font-semibold text-gray-700">{p.name}</p>
                        <p className="text-[10px] text-gray-400">{p.value} negoc.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Row 3: Interações | Receita por produto */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="🤝 Interações por Resultado">
            {MONTHS.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Defina um período válido</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={interacoesChart} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="positivo" name="Positivo" fill="#10b981" stackId="a" />
                  <Bar dataKey="neutro" name="Neutro" fill="#93c5fd" stackId="a" />
                  <Bar dataKey="negativo" name="Negativo" fill="#ef4444" stackId="a" />
                  <Bar dataKey="sem_resposta" name="Sem resposta" fill="#d1d5db" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="💰 Volume de Vendas por Produto">
            {produtoChart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma venda no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={produtoChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="produto" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={(v) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Receita']} />
                  <Bar dataKey="total" name="Receita" fill="#0f1e35" radius={[0, 4, 4, 0]}>
                    {produtoChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Row 4: Contratos por tipo */}
        {contratosTipo.length > 0 && (
          <ChartCard title="📋 Contratos por Tipo">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={contratosTipo} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Qtd" radius={[4, 4, 0, 0]}>
                  {contratosTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Row 5: Ranking de gerentes (admin only) */}
        {isAdmin && rankingGerentes.length > 0 && (
          <ChartCard title="🏆 Ranking de Gerentes — Receita no período">
            <div className="space-y-2">
              {rankingGerentes.map((g, i) => {
                const maxReceita = rankingGerentes[0]?.receita || 1;
                const pct = (g.receita / maxReceita) * 100;
                const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                return (
                  <div key={g.id} className="flex items-center gap-3">
                    <span className="w-7 text-center text-sm font-bold">{medalha}</span>
                    <div className="w-28 text-xs font-medium text-gray-700 truncate">{g.nome}</div>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : '#1a3150' }}
                      />
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs font-bold text-gray-800">{fmtBRL(g.receita)}</p>
                      <p className="text-[10px] text-gray-400">{g.vendas} venda{g.vendas !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        )}

      </div>
    </div>
  );
}