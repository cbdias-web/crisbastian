import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getImpersonatedVendedor } from '@/lib/impersonation';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, Calendar, FileText, DollarSign, Target, Activity, Phone } from 'lucide-react';
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#0f1e35', '#1a73e8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = subMonths(new Date(), 5 - i);
  return {
    key: format(d, 'yyyy-MM'),
    label: format(d, 'MMM/yy', { locale: ptBR }),
    start: format(startOfMonth(d), 'yyyy-MM-dd'),
    end: format(endOfMonth(d), 'yyyy-MM-dd'),
  };
});

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

export default function Desempenho() {
  const [user, setUser] = useState(null);
  const [vendedor, setVendedor] = useState(null);

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

  // Filtra por vendedor se não for admin
  const filtrar = (arr, campo = 'vendedor_id') =>
    isAdmin ? arr : arr.filter(i => i[campo] === vendedor?.id);

  const vendasF = filtrar(vendas);
  const agendaF = filtrar(agenda);
  const pipelineF = filtrar(pipeline);
  const contratosF = filtrar(contratos);
  const interacoesF = filtrar(interacoes);

  // ── Gráfico 1: Vendas x Contatos por mês ─────────────────────────────────
  const vendasXContatos = MONTHS.map(m => ({
    mes: m.label,
    vendas: vendasF.filter(v => v.data?.startsWith(m.key)).length,
    contatos: agendaF.filter(a => a.data_agendada?.startsWith(m.key)).length,
    realizados: agendaF.filter(a => a.data_agendada?.startsWith(m.key) && a.status === 'realizado').length,
  }));

  // ── Gráfico 2: Vendas x Pipeline (conversões) ─────────────────────────────
  const vendasXPipe = MONTHS.map(m => ({
    mes: m.label,
    vendas: vendasF.filter(v => v.data?.startsWith(m.key)).length,
    pipeline_quente: pipelineF.filter(p =>
      p.created_date?.startsWith(m.key) && p.temperatura === 'Quente'
    ).length,
    pipeline_fechado: pipelineF.filter(p =>
      p.created_date?.startsWith(m.key) && p.temperatura === 'Fechado'
    ).length,
  }));

  // ── Gráfico 3: Status dos contratos ───────────────────────────────────────
  const statusCount = contratosF.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  const contratosStatus = Object.entries(statusCount).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  // ── Gráfico 4: Tipos de contratos ─────────────────────────────────────────
  const tipoCount = contratosF.reduce((acc, c) => {
    acc[c.tipo] = (acc[c.tipo] || 0) + 1;
    return acc;
  }, {});
  const contratosTipo = Object.entries(tipoCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Gráfico 5: Interações por resultado por mês ───────────────────────────
  const interacoesChart = MONTHS.map(m => ({
    mes: m.label,
    positivo: interacoesF.filter(i => i.data_interacao?.startsWith(m.key) && i.resultado === 'Positivo').length,
    negativo: interacoesF.filter(i => i.data_interacao?.startsWith(m.key) && i.resultado === 'Negativo').length,
    neutro: interacoesF.filter(i => i.data_interacao?.startsWith(m.key) && i.resultado === 'Neutro').length,
    sem_resposta: interacoesF.filter(i => i.data_interacao?.startsWith(m.key) && i.resultado === 'Sem resposta').length,
  }));

  // ── Gráfico 6: Temperatura do pipeline ───────────────────────────────────
  const tempCount = pipelineF.reduce((acc, p) => {
    acc[p.temperatura] = (acc[p.temperatura] || 0) + 1;
    return acc;
  }, {});
  const pipelineTemp = [
    { name: 'Frio', value: tempCount['Frio'] || 0, color: '#93c5fd' },
    { name: 'Morno', value: tempCount['Morno'] || 0, color: '#fbbf24' },
    { name: 'Quente', value: tempCount['Quente'] || 0, color: '#f97316' },
    { name: 'Fechado', value: tempCount['Fechado'] || 0, color: '#10b981' },
    { name: 'Perdido', value: tempCount['Perdido'] || 0, color: '#ef4444' },
  ].filter(p => p.value > 0);

  // ── Gráfico 7: Receita por produto ───────────────────────────────────────
  const produtoMap = vendasF.reduce((acc, v) => {
    const k = v.produto || 'Outros';
    if (!acc[k]) acc[k] = { produto: k, total: 0, qtd: 0 };
    acc[k].total += v.valor || 0;
    acc[k].qtd++;
    return acc;
  }, {});
  const produtoChart = Object.values(produtoMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 7);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const mesAtual = format(new Date(), 'yyyy-MM');
  const vendasMes = vendasF.filter(v => v.data?.startsWith(mesAtual)).length;
  const contatosMes = agendaF.filter(a => a.data_agendada?.startsWith(mesAtual)).length;
  const contratosAbertos = contratosF.filter(c => !['pago', 'no_pipeline'].includes(c.status)).length;
  const pipelineAtivos = pipelineF.filter(p => !['Fechado', 'Perdido'].includes(p.temperatura)).length;

  const fmtBRL = (v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`;
  const receitaMes = vendasF.filter(v => v.data?.startsWith(mesAtual)).reduce((s, v) => s + (v.valor || 0), 0);

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel de Desempenho</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visão consolidada de vendas, agenda, pipeline e contratos
            {!isAdmin && vendedor ? ` — ${vendedor.nome}` : ' — Todos os gerentes'}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Vendas este mês" value={vendasMes} sub={fmtBRL(receitaMes)} color="bg-[#0f1e35]" />
          <StatCard icon={Phone} label="Contatos este mês" value={contatosMes} sub={`${agendaF.filter(a => a.data_agendada?.startsWith(mesAtual) && a.status === 'realizado').length} realizados`} color="bg-blue-600" />
          <StatCard icon={FileText} label="Contratos abertos" value={contratosAbertos} sub="Aguardando fechamento" color="bg-amber-600" />
          <StatCard icon={TrendingUp} label="Pipeline ativo" value={pipelineAtivos} sub="Negociações em curso" color="bg-emerald-600" />
        </div>

        {/* Row 1: Vendas x Contatos | Vendas x Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="📞 Vendas × Contatos Agenda (últimos 6 meses)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={vendasXContatos} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="vendas" name="Vendas" fill="#0f1e35" radius={[4, 4, 0, 0]} />
                <Bar dataKey="contatos" name="Contatos agendados" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realizados" name="Contatos realizados" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="🔥 Vendas × Conversões Pipeline (últimos 6 meses)">
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
          </ChartCard>
        </div>

        {/* Row 2: Status contratos | Temperatura pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="📄 Contratos por Status">
            {contratosStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum contrato encontrado</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={contratosStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="value" name="Contratos" fill="#1a73e8" radius={[0, 4, 4, 0]}>
                    {contratosStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
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
                    <Pie data={pipelineTemp} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                      paddingAngle={3} dataKey="value">
                      {pipelineTemp.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
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

        {/* Row 3: Interações por resultado | Receita por produto */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="🤝 Interações por Resultado (últimos 6 meses)">
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
          </ChartCard>

          <ChartCard title="💰 Volume de Vendas por Produto">
            {produtoChart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma venda registrada</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={produtoChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="produto" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={(v) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Receita']} />
                  <Bar dataKey="total" name="Receita" fill="#0f1e35" radius={[0, 4, 4, 0]}>
                    {produtoChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
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
                  {contratosTipo.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

      </div>
    </div>
  );
}