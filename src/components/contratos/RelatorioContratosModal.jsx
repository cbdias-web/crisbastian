import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, FileDown, Loader2, FileText, DollarSign, CheckCircle, ShoppingCart, Link2, Search, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

const AURORA = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)', accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', textMuted: 'rgba(230,237,243,0.55)', textDim: 'rgba(230,237,243,0.35)',
};

const TIPOS = ['CONTA GLOBAL', 'CONTA INTERNACIONAL', 'DOLARIZE', 'ROF', 'CANAL BANCÁRIO', 'OFFSHORE', 'GARANTIAS', 'HORA TÉCNICA'];
const STATUS_OPTS = [
  { key: 'rascunho', label: 'Rascunho', color: '#6b7280' },
  { key: 'gerado', label: 'PDF Gerado', color: '#3b82f6' },
  { key: 'assinado', label: 'Assinado', color: '#10b981' },
  { key: 'aguardando_pagamento', label: 'Aguard. Pagamento', color: '#f59e0b' },
  { key: 'pago', label: 'Pago', color: '#8b5cf6' },
  { key: 'no_pipeline', label: 'No Pipeline', color: '#a855f7' },
];

const fmtVal = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

export default function RelatorioContratosModal({ onClose }) {
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroVendedor, setFiltroVendedor] = useState('Todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ['contratos-relatorio'],
    queryFn: () => base44.entities.Contrato.list('-created_date', 500),
  });

  const vendedoresDisponiveis = useMemo(() => {
    return [...new Set(contratos.map(c => c.vendedor_nome).filter(Boolean))].sort();
  }, [contratos]);

  const contratosFiltrados = useMemo(() => {
    return contratos.filter(c => {
      if (filtroTipo !== 'Todos' && c.tipo !== filtroTipo) return false;
      if (filtroStatus !== 'Todos' && c.status !== filtroStatus) return false;
      if (filtroVendedor !== 'Todos' && c.vendedor_nome !== filtroVendedor) return false;
      if (busca) {
        const t = busca.toLowerCase();
        if (!c.nome?.toLowerCase().includes(t) && !c.cpf_cnpj?.includes(busca)) return false;
      }
      const dataRef = c.data_contrato || (c.created_date ? c.created_date.split('T')[0] : '');
      if (dataInicio && dataRef < dataInicio) return false;
      if (dataFim && dataRef > dataFim) return false;
      return true;
    });
  }, [contratos, filtroTipo, filtroStatus, filtroVendedor, busca, dataInicio, dataFim]);

  const stats = useMemo(() => {
    const total = contratosFiltrados.length;
    const valorTotal = contratosFiltrados.reduce((s, c) => s + (Number(c.valor_total) || 0), 0);
    const assinados = contratosFiltrados.filter(c => c.status === 'assinado' || c.contrato_assinado_url).length;
    const noPipeline = contratosFiltrados.filter(c => c.status === 'no_pipeline' || c.pipeline_id).length;
    const linkPendente = contratosFiltrados.filter(c => !c.link_assinatura && c.status !== 'rascunho').length;
    return { total, valorTotal, assinados, noPipeline, linkPendente };
  }, [contratosFiltrados]);

  const chartTipoData = useMemo(() => {
    const map = {};
    for (const c of contratosFiltrados) {
      const t = c.tipo || 'OUTROS';
      if (!map[t]) map[t] = { count: 0, valor: 0 };
      map[t].count++;
      map[t].valor += Number(c.valor_total) || 0;
    }
    return Object.entries(map).map(([tipo, data]) => ({ tipo: tipo.substring(0, 12), ...data })).sort((a, b) => b.count - a.count);
  }, [contratosFiltrados]);

  const chartStatusData = useMemo(() => {
    const map = {};
    for (const c of contratosFiltrados) {
      const s = c.status || 'rascunho';
      map[s] = (map[s] || 0) + 1;
    }
    return STATUS_OPTS.map(s => ({ status: s.label, count: map[s.key] || 0, color: s.color }));
  }, [contratosFiltrados]);

  const chartVendedorData = useMemo(() => {
    const map = {};
    for (const c of contratosFiltrados) {
      const v = c.vendedor_nome || 'N/A';
      if (!map[v]) map[v] = { count: 0, valor: 0 };
      map[v].count++;
      map[v].valor += Number(c.valor_total) || 0;
    }
    return Object.entries(map).map(([nome, data]) => ({ nome: nome.split(' ')[0].substring(0, 10), ...data })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [contratosFiltrados]);

  const gerarPDF = async () => {
    setGerandoPDF(true);
    try {
      const response = await base44.functions.invoke('gerarRelatorioContratosPDF', {
        tipo: filtroTipo !== 'Todos' ? filtroTipo : null,
        status: filtroStatus !== 'Todos' ? filtroStatus : null,
        vendedor_nome: filtroVendedor !== 'Todos' ? filtroVendedor : null,
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-contratos-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório PDF gerado!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao gerar PDF');
    }
    setGerandoPDF(false);
  };

  const limparFiltros = () => {
    setBusca(''); setFiltroTipo('Todos'); setFiltroStatus('Todos');
    setFiltroVendedor('Todos'); setDataInicio(''); setDataFim('');
  };

  const temFiltros = busca || filtroTipo !== 'Todos' || filtroStatus !== 'Todos' || filtroVendedor !== 'Todos' || dataInicio || dataFim;

  const statsCards = [
    { icon: FileText, label: 'Total de Contratos', value: stats.total, color: '#00D4AA', bg: 'rgba(0,212,170,0.06)' },
    { icon: DollarSign, label: 'Valor Total', value: fmtVal(stats.valorTotal), color: '#3b82f6', bg: 'rgba(59,130,249,0.06)' },
    { icon: CheckCircle, label: 'Assinados', value: stats.assinados, color: '#34d399', bg: 'rgba(16,185,129,0.06)' },
    { icon: ShoppingCart, label: 'Encaminhados p/ Vendas', value: stats.noPipeline, color: '#a855f7', bg: 'rgba(168,85,247,0.06)' },
    { icon: Link2, label: 'Link Pendente', value: stats.linkPendente, color: '#fbbf24', bg: 'rgba(245,158,11,0.06)' },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, borderRadius: 8, padding: '6px 10px' }}>
        <p style={{ color: AURORA.text, fontSize: 11, fontWeight: 600 }}>{payload[0].payload.tipo || payload[0].payload.status || payload[0].payload.nome}</p>
        <p style={{ color: AURORA.accent, fontSize: 12, fontWeight: 700 }}>{payload[0].value} contrato(s)</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-7xl my-6 overflow-hidden"
        style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}` }}>

        {/* HEADER */}
        <div className="px-6 py-4 flex items-center justify-between sticky top-0 z-20"
          style={{ background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 60%, #16213e 100%)', borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', boxShadow: '0 4px 16px rgba(0,212,170,0.3)' }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: AURORA.text }}>Relatório de Contratos</h3>
              <p className="text-xs" style={{ color: AURORA.textMuted }}>Contratos gerados, valores, status e encaminhamentos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={gerarPDF} disabled={gerandoPDF}
              className="border-[rgba(0,212,170,0.3)] text-[#00D4AA] hover:bg-[rgba(0,212,170,0.1)]">
              {gerandoPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
              Exportar PDF
            </Button>
            <button onClick={onClose} className="p-2 rounded-lg transition hover:bg-[rgba(0,212,170,0.1)]" style={{ color: AURORA.textMuted }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          {statsCards.map((s, i) => (
            <div key={i} className="rounded-xl p-3 flex items-center gap-3 transition"
              style={{ background: s.bg, border: `1px solid ${s.color}22` }}>
              <s.icon className="w-4 h-4 flex-shrink-0" style={{ color: s.color }} />
              <div>
                <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: AURORA.textMuted }}>{s.label}</p>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div className="px-6 pb-4">
          <div className="rounded-xl p-4 space-y-3" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <Search className="w-4 h-4" style={{ color: AURORA.accent }} />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: AURORA.accent }}>Filtros</p>
              {temFiltros && (
                <button onClick={limparFiltros} className="ml-auto text-[11px] px-2 py-0.5 rounded-md transition"
                  style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}>
                  Limpar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: AURORA.textMuted }}>Buscar</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: AURORA.textMuted }} />
                  <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                    placeholder="Nome ou CPF/CNPJ..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none transition"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: AURORA.textMuted }}>Tipo</label>
                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                  <option value="Todos">Todos os tipos</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: AURORA.textMuted }}>Status</label>
                <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                  <option value="Todos">Todos os status</option>
                  {STATUS_OPTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: AURORA.textMuted }}>Vendedor</label>
                <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                  <option value="Todos">Todos os vendedores</option>
                  {vendedoresDisponiveis.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: AURORA.textMuted }}>Período</label>
                <div className="flex items-center gap-1">
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-lg focus:outline-none"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
                  <span className="text-xs" style={{ color: AURORA.textMuted }}>→</span>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-lg focus:outline-none"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <span className="text-xs" style={{ color: AURORA.textMuted }}>
                {contratosFiltrados.length} contrato(s) exibido(s)
              </span>
            </div>
          </div>
        </div>

        {/* GRAFICOS */}
        <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Por Tipo */}
          <div className="rounded-xl p-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4" style={{ color: AURORA.accent }} />
              <p className="text-sm font-semibold" style={{ color: AURORA.text }}>Contratos por Tipo</p>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartTipoData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <XAxis dataKey="tipo" tick={{ fill: AURORA.textMuted, fontSize: 9 }} axisLine={{ stroke: AURORA.border }} tickLine={false} />
                <YAxis tick={{ fill: AURORA.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,212,170,0.05)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartTipoData.map((_, idx) => <Cell key={idx} fill={`rgba(0,212,170,${0.4 + (idx / Math.max(chartTipoData.length, 1)) * 0.6})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Por Status */}
          <div className="rounded-xl p-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4" style={{ color: AURORA.accent }} />
              <p className="text-sm font-semibold" style={{ color: AURORA.text }}>Contratos por Status</p>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartStatusData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <XAxis dataKey="status" tick={{ fill: AURORA.textMuted, fontSize: 8 }} axisLine={{ stroke: AURORA.border }} tickLine={false} />
                <YAxis tick={{ fill: AURORA.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,212,170,0.05)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartStatusData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Por Vendedor */}
          <div className="rounded-xl p-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4" style={{ color: '#3b82f6' }} />
              <p className="text-sm font-semibold" style={{ color: AURORA.text }}>Top Vendedores</p>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartVendedorData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <XAxis dataKey="nome" tick={{ fill: AURORA.textMuted, fontSize: 9 }} axisLine={{ stroke: AURORA.border }} tickLine={false} />
                <YAxis tick={{ fill: AURORA.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,249,0.05)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABELA */}
        <div className="px-6 pb-6 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: AURORA.accent }} />
            </div>
          ) : (
            <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {['Cliente', 'CPF/CNPJ', 'Tipo', 'Valor Total', 'Data', 'Status', 'Vendedor', 'Assinado', 'Vendas', 'Origem', 'Adesão'].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider first:rounded-tl-xl last:rounded-tr-xl"
                      style={{ color: AURORA.text, background: AURORA.surface2, borderBottom: `2px solid ${AURORA.accent}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contratosFiltrados.map((c, idx) => {
                  const statusOpt = STATUS_OPTS.find(s => s.key === c.status) || STATUS_OPTS[0];
                  const assinado = c.contrato_assinado_url ? { label: 'Sim', color: '#34d399' } : (c.link_assinatura ? { label: 'Link enviado', color: '#fbbf24' } : { label: 'Não', color: '#f87171' });
                  const vendas = (c.status === 'no_pipeline' || c.pipeline_id) ? { label: 'Sim', color: '#34d399' } : { label: 'Não', color: AURORA.textDim };
                  const dataRef = c.data_contrato || (c.created_date ? c.created_date.split('T')[0] : '');
                  return (
                    <tr key={c.id} className="transition"
                      style={{ background: idx % 2 === 0 ? 'rgba(28,35,51,0.5)' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(28,35,51,0.5)' : 'transparent'}>
                      <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
                        <p className="font-medium" style={{ color: AURORA.text }}>{c.nome || '—'}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: '#9da7b3', borderBottom: `1px solid ${AURORA.border}` }}>{c.cpf_cnpj || '—'}</td>
                      <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent }}>
                          {c.tipo || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-xs" style={{ color: AURORA.accent, borderBottom: `1px solid ${AURORA.border}` }}>{fmtVal(c.valor_total)}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: '#9da7b3', borderBottom: `1px solid ${AURORA.border}` }}>
                        {dataRef ? new Date(dataRef + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: `${statusOpt.color}22`, color: statusOpt.color }}>
                          {statusOpt.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: '#9da7b3', borderBottom: `1px solid ${AURORA.border}` }}>{c.vendedor_nome || '—'}</td>
                      <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
                        <span className="text-[10px] font-semibold" style={{ color: assinado.color }}>{assinado.label}</span>
                      </td>
                      <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
                        <span className="text-[10px] font-semibold" style={{ color: vendas.color }}>{vendas.label}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: '#9da7b3', borderBottom: `1px solid ${AURORA.border}` }}>{c.origem_pagamento || '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: '#9da7b3', borderBottom: `1px solid ${AURORA.border}` }}>{fmtVal(c.valor_adesao)}</td>
                    </tr>
                  );
                })}
                {contratosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-sm" style={{ color: AURORA.textDim }}>
                      <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: AURORA.textDim, opacity: 0.5 }} />
                      Nenhum contrato encontrado com os filtros selecionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}