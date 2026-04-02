import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getImpersonatedVendedor } from '@/lib/impersonation';
 import { base44 } from '@/api/base44Client';
 import { Button } from '@/components/ui/button';
 import { FileText, Filter, Download, Search, X, CheckCircle2, Clock, XCircle, MinusCircle, Users, Eye, Phone, Mail, MapPin, Save, Trash2, Edit2 } from 'lucide-react';
 import { format, parseISO } from 'date-fns';
 import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
 import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const today = () => new Date().toISOString().split('T')[0];
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const resultadoConfig = {
  'Positivo': { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  'Neutro': { color: 'bg-blue-50 text-blue-600', icon: MinusCircle },
  'Negativo': { color: 'bg-red-100 text-red-600', icon: XCircle },
  'Sem resposta': { color: 'bg-gray-100 text-gray-500', icon: Clock },
};

export default function RelatorioInteracoes() {
  const [user, setUser] = useState(null);
  const [vendedor, setVendedor] = useState(null);
  const [dataInicio, setDataInicio] = useState(firstOfMonth());
  const [dataFim, setDataFim] = useState(today());
  const [filtroVendedor, setFiltroVendedor] = useState('todos');
  const [filtroResultado, setFiltroResultado] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busca, setBusca] = useState('');
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [perfilCliente, setPerfilCliente] = useState(null);
  const [showSalvarClienteModal, setShowSalvarClienteModal] = useState(null);
  const [gerenteSelecionado, setGerenteSelecionado] = useState('');
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [editandoInteracao, setEditandoInteracao] = useState(null);
  const [editInteracaoForm, setEditInteracaoForm] = useState({});
  const [salvandoInteracao, setSalvandoInteracao] = useState(false);
  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-relatorio-perfil'],
    queryFn: () => base44.entities.Cliente.list('nome', 10000),
    enabled: !!user
  });

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!u) return;
      setUser(u);
      const isAdm = u.role === 'admin' || u.permissao_admin === true;
      const impersonado = isAdm ? getImpersonatedVendedor() : null;
      if (impersonado) {
        setVendedor(impersonado);
      } else {
        const vendedores = await base44.entities.Vendedor.filter({ email: u.email });
        if (vendedores.length > 0) setVendedor(vendedores[0]);
      }
    };
    load();
    window.addEventListener('impersonation-change', load);
    return () => window.removeEventListener('impersonation-change', load);
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: interacoes = [], isLoading } = useQuery({
    queryKey: ['interacoes-relatorio'],
    queryFn: () => base44.entities.InteracaoCliente.list('-data_interacao'),
    enabled: !!user
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-relatorio'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: isAdmin
  });

  const deleteInteracaoMutation = useMutation({
    mutationFn: (id) => base44.entities.InteracaoCliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['interacoes-relatorio']);
      toast.success('Interação removida!');
    },
    onError: () => {
      toast.error('Erro ao remover interação');
    }
  });

  const updateInteracaoMutation = useMutation({
    mutationFn: (data) => base44.entities.InteracaoCliente.update(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['interacoes-relatorio']);
      setEditandoInteracao(null);
      toast.success('Interação atualizada!');
    },
    onError: () => {
      toast.error('Erro ao atualizar interação');
    }
  });

  const handleDeleteInteracao = (id) => {
    if (confirm('Tem certeza que deseja remover esta interação?')) {
      deleteInteracaoMutation.mutate(id);
    }
  };

  const handleEditarInteracao = (interacao, e) => {
    e.stopPropagation();
    if (!isAdmin && interacao.vendedor_id !== vendedor?.id) {
      toast.error('Você pode editar apenas suas próprias interações');
      return;
    }
    setEditandoInteracao(interacao);
    setEditInteracaoForm({
      tipo: interacao.tipo,
      descricao: interacao.descricao,
      data_interacao: interacao.data_interacao,
      proximo_contato: interacao.proximo_contato || '',
      resultado: interacao.resultado
    });
  };

  const salvarEdicaoInteracao = () => {
    if (!editInteracaoForm.descricao?.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    setSalvandoInteracao(true);
    updateInteracaoMutation.mutate({
      id: editandoInteracao.id,
      updates: editInteracaoForm
    });
    setSalvandoInteracao(false);
  };

  const handleSalvarCliente = async () => {
    if (!perfilCliente || !gerenteSelecionado) {
      toast.error('Selecione um gerente');
      return;
    }
    setSalvandoCliente(true);
    try {
      const vendedorSelecionado = vendedores.find(v => v.id === gerenteSelecionado);
      await base44.entities.Cliente.create({
        nome: perfilCliente.nome,
        cpf_cnpj: perfilCliente.cpf_cnpj || '',
        telefone: perfilCliente.telefone || '',
        email: perfilCliente.email || '',
        cidade: perfilCliente.cidade || '',
        estado: perfilCliente.estado || '',
        vendedor_id: gerenteSelecionado,
        vendedor_nome: vendedorSelecionado?.nome || '',
        observacao: `Salvo do Relatório de Interações`
      });
      toast.success('Cliente salvo em Meus Clientes!');
      setShowSalvarClienteModal(null);
      setGerenteSelecionado('');
      setPerfilCliente(null);
    } catch (e) {
      toast.error('Erro ao salvar cliente');
    }
    setSalvandoCliente(false);
  };

  const interacoesFiltradas = interacoes.filter(i => {
    if (!isAdmin && vendedor && i.vendedor_id !== vendedor.id) return false;
    if (dataInicio && i.data_interacao < dataInicio) return false;
    if (dataFim && i.data_interacao > dataFim) return false;
    if (filtroVendedor !== 'todos' && i.vendedor_nome !== filtroVendedor) return false;
    if (filtroResultado !== 'todos' && i.resultado !== filtroResultado) return false;
    if (filtroTipo !== 'todos' && i.tipo !== filtroTipo) return false;
    const term = busca.toLowerCase();
    if (term && !(i.cliente_nome?.toLowerCase().includes(term) || i.descricao?.toLowerCase().includes(term) || i.vendedor_nome?.toLowerCase().includes(term))) return false;
    return true;
  });

  const resumoPorVendedor = interacoesFiltradas.reduce((acc, i) => {
    const key = i.vendedor_nome || 'Sem vendedor';
    if (!acc[key]) acc[key] = { total: 0, positivo: 0, negativo: 0, semResposta: 0 };
    acc[key].total++;
    if (i.resultado === 'Positivo') acc[key].positivo++;
    if (i.resultado === 'Negativo') acc[key].negativo++;
    if (i.resultado === 'Sem resposta') acc[key].semResposta++;
    return acc;
  }, {});

  const tipos = [...new Set(interacoes.map(i => i.tipo).filter(Boolean))];

  const dadosPorTipo = tipos.map(tipo => ({
    tipo,
    quantidade: interacoesFiltradas.filter(i => i.tipo === tipo).length
  }));

  const dadosPorResultado = [
    { resultado: 'Positivo', quantidade: interacoesFiltradas.filter(i => i.resultado === 'Positivo').length, fill: '#10b981' },
    { resultado: 'Neutro', quantidade: interacoesFiltradas.filter(i => i.resultado === 'Neutro').length, fill: '#3b82f6' },
    { resultado: 'Negativo', quantidade: interacoesFiltradas.filter(i => i.resultado === 'Negativo').length, fill: '#ef4444' },
    { resultado: 'Sem resposta', quantidade: interacoesFiltradas.filter(i => i.resultado === 'Sem resposta').length, fill: '#9ca3af' },
  ].filter(d => d.quantidade > 0);

  const dadosTempo = (() => {
    const mapa = {};
    interacoesFiltradas.forEach(i => {
      const data = i.data_interacao?.substring(0, 7);
      if (data) {
        if (!mapa[data]) mapa[data] = { periodo: data, total: 0 };
        mapa[data].total++;
      }
    });
    return Object.values(mapa).sort((a, b) => a.periodo.localeCompare(b.periodo));
  })();

  const abrirPerfil = (interacao, e) => {
    e.stopPropagation();
    const c = clientes.find(c => c.id === interacao.cliente_id);
    setPerfilCliente(c || { nome: interacao.cliente_nome, id: interacao.cliente_id });
  };

  const gerarRelatorioEmTela = () => {
    const vendedoresLista = isAdmin
      ? [...new Set(interacoesFiltradas.map(i => i.vendedor_nome).filter(Boolean))].sort()
      : [vendedor?.nome].filter(Boolean);

    const clientesLista = [...new Set(interacoesFiltradas.map(i => i.cliente_nome).filter(Boolean))].sort();

    const resumoRows = vendedoresLista.map(v => {
      const ints = interacoesFiltradas.filter(i => i.vendedor_nome === v);
      const pos = ints.filter(i => i.resultado === 'Positivo').length;
      const neu = ints.filter(i => i.resultado === 'Neutro').length;
      const neg = ints.filter(i => i.resultado === 'Negativo').length;
      const sr = ints.filter(i => i.resultado === 'Sem resposta').length;
      const pct = ints.length > 0 ? Math.round((pos / ints.length) * 100) : 0;
      return `<tr>
        <td>${v}</td>
        <td style="text-align:center">${ints.length}</td>
        <td style="text-align:center;color:#10b981;font-weight:bold">${pos}</td>
        <td style="text-align:center;color:#3b82f6">${neu}</td>
        <td style="text-align:center;color:#ef4444">${neg}</td>
        <td style="text-align:center;color:#9ca3af">${sr}</td>
        <td style="text-align:center;font-weight:bold;color:${pct >= 60 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444'}">${pct}%</td>
      </tr>`;
    }).join('');

    const vendHeaders = vendedoresLista.map(v => `<th>${v}</th>`).join('');

    const detalhamentoRows = clientesLista.map(c => {
      const cols = vendedoresLista.map(v => {
        const count = interacoesFiltradas.filter(i => i.cliente_nome === c && i.vendedor_nome === v).length;
        return `<td style="text-align:center;color:${count > 0 ? '#1a3150' : '#9ca3af'}">${count > 0 ? count : '—'}</td>`;
      }).join('');
      const total = interacoesFiltradas.filter(i => i.cliente_nome === c).length;
      return `<tr><td><strong>${c}</strong></td>${cols}<td style="text-align:center;font-weight:bold">${total}</td></tr>`;
    }).join('');

    const periodoLabel = `${dataInicio ? format(parseISO(dataInicio), 'dd/MM/yyyy') : '—'} a ${dataFim ? format(parseISO(dataFim), 'dd/MM/yyyy') : '—'}`;

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Interações</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 20px; }
      h1 { color: #0f1e35; font-size: 18px; margin-bottom: 4px; }
      h2 { color: #1a3150; font-size: 14px; margin-top: 24px; margin-bottom: 8px; }
      .sub { color: #666; font-size: 11px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #0f1e35; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
      td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
      tr:nth-child(even) td { background: #f9fafb; }
      @media print { button { display: none; } }
    </style></head><body>
    <h1>Villela Exchange — Relatório de Interações</h1>
    <p class="sub">Período: ${periodoLabel} · ${filtroVendedor !== 'todos' ? `Vendedor: ${filtroVendedor} · ` : ''}Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
    <button onclick="window.print()" style="padding:6px 16px;background:#0f1e35;color:white;border:none;border-radius:6px;cursor:pointer;margin-bottom:16px;">Imprimir / Salvar PDF</button>
    <h2>Resumo por Vendedor</h2>
    <table><thead><tr><th>Vendedor</th><th style="text-align:center">Total</th><th style="text-align:center">Positivas</th><th style="text-align:center">Neutras</th><th style="text-align:center">Negativas</th><th style="text-align:center">Sem Resposta</th><th style="text-align:center">% Positivo</th></tr></thead>
    <tbody>${resumoRows}</tbody></table>
    <h2>Detalhamento por Cliente</h2>
    <table><thead><tr><th>Cliente</th>${vendHeaders}<th style="text-align:center">Total</th></tr></thead><tbody>${detalhamentoRows}</tbody></table>
    </body></html>`;

    const janela = window.open('', '_blank');
    janela.document.write(html);
    janela.document.close();
  };

  const gerarPDF = async () => {
    setGerandoPDF(true);
    try {
      const response = await base44.functions.invoke('relatorioInteracoesPDF', {
        dataInicio,
        dataFim,
        filtroVendedor: filtroVendedor === 'todos' ? null : filtroVendedor,
        filtroResultado: filtroResultado === 'todos' ? null : filtroResultado,
        filtroTipo: filtroTipo === 'todos' ? null : filtroTipo,
        busca: busca || null,
        vendedorId: isAdmin ? null : vendedor?.id,
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-interacoes-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório gerado!');
    } catch (e) {
      toast.error('Erro ao gerar PDF');
    }
    setGerandoPDF(false);
  };

  if (!user) return (

    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relatório de Interações</h1>
            <p className="text-sm text-gray-500 mt-1">Acompanhe o desempenho de suas interações com clientes</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">Total no período</p>
              <p className="text-2xl font-bold text-[#0f1e35]">{interacoesFiltradas.length}</p>
            </div>
            <Button
              onClick={gerarRelatorioEmTela}
              disabled={interacoesFiltradas.length === 0}
              variant="outline"
              className="border-[#0f1e35] text-[#0f1e35]"
            >
              <FileText className="w-4 h-4 mr-2" />
              Relatório em Tela
            </Button>
            <Button
              onClick={gerarPDF}
              disabled={gerandoPDF || interacoesFiltradas.length === 0}
              className="bg-[#0f1e35] hover:bg-[#1a3150] text-white"
            >
              {gerandoPDF ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Filtros em linha horizontal */}
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Data início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Data fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
          </div>
          {isAdmin && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Vendedor</label>
              <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                <option value="todos">Todos Vendedores</option>
                {vendedores.map(v => <option key={v.id}>{v.nome}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Resultado</label>
            <select value={filtroResultado} onChange={e => setFiltroResultado(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
              <option value="todos">Todos Resultados</option>
              {['Positivo','Neutro','Negativo','Sem resposta'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
              <option value="todos">Todos Tipos</option>
              {tipos.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Busca</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Cliente, vendedor, descrição..."
                className="flex-1 py-2 text-sm outline-none bg-transparent" />
              {busca && <button onClick={() => setBusca('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: interacoesFiltradas.length, icon: '📊', color: 'bg-[#0f1e35] text-white' },
            { label: 'Positivas', value: interacoesFiltradas.filter(i => i.resultado === 'Positivo').length, icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Negativas', value: interacoesFiltradas.filter(i => i.resultado === 'Negativo').length, icon: '❌', color: 'bg-red-50 text-red-600' },
            { label: 'Sem Resposta', value: interacoesFiltradas.filter(i => i.resultado === 'Sem resposta').length, icon: '❓', color: 'bg-gray-100 text-gray-600' },
          ].map(kpi => (
            <div key={kpi.label} className={`rounded-2xl p-4 shadow-sm ${kpi.color}`}>
              <p className="text-sm opacity-70 mb-1">{kpi.label}</p>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold">{kpi.value}</p>
                <span className="text-2xl">{kpi.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Gráficos em grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ marginTop: '2rem' }}>
          {/* Gráfico de produtividade por vendedor (admin) */}
          {isAdmin && Object.keys(resumoPorVendedor).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">Produtividade por Vendedor</h3>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(resumoPorVendedor).map(([nome, dados]) => ({
                    vendedor: nome,
                    total: dados.total,
                    positivo: dados.positivo,
                    negativo: dados.negativo
                  }))} margin={{ bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="vendedor" fontSize={11} angle={-45} textAnchor="end" height={80} />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      cursor={{ fill: '#0f1e3505' }}
                    />
                    <Legend />
                    <Bar dataKey="total" fill="#2d3748" name="Total" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="positivo" fill="#86efac" name="Positivos" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="negativo" fill="#fca5a5" name="Negativos" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}



          {/* Gráfico por tipo */}
          {dadosPorTipo.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">Interações por Tipo</h3>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosPorTipo} layout="vertical" margin={{ left: 120, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="tipo" type="category" fontSize={11} width={110} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      cursor={{ fill: '#0f1e3505' }}
                    />
                    <Bar dataKey="quantidade" fill="#a0afc7" name="Quantidade" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Detalhamento ({interacoesFiltradas.length} registros)</h3>
          </div>
          {isLoading ? (
            <div className="py-16 flex justify-center"><div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" /></div>
          ) : interacoesFiltradas.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">Nenhuma interação encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Data</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Cliente</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Vendedor</th>}
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Tipo</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Resultado</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Descrição</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Próx. Contato</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {interacoesFiltradas.map(i => {
                    const res = resultadoConfig[i.resultado] || resultadoConfig['Neutro'];
                    const ResIcon = res.icon;
                    return (
                      <tr key={i.id} className="hover:bg-gray-50/50 transition border-b border-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {i.data_interacao ? format(parseISO(i.data_interacao), 'dd/MM') : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-800 truncate max-w-xs">{i.cliente_nome}</td>
                        {isAdmin && <td className="px-4 py-3 text-xs text-gray-600 truncate whitespace-nowrap">{i.vendedor_nome}</td>}
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{i.tipo}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 w-fit ${res.color}`}>
                            <ResIcon className="w-2.5 h-2.5" />{i.resultado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{i.descricao}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {i.resultado === 'Negativo' ? <span className="text-gray-300 text-[10px]">—</span> : (i.proximo_contato ? format(parseISO(i.proximo_contato), 'dd/MM') : '—')}
                        </td>
                        <td className="px-4 py-3 text-center flex items-center justify-center gap-1">
                          <button onClick={(e) => abrirPerfil(i, e)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#1a3150] transition" title="Ver perfil">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => handleEditarInteracao(i, e)} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition" title="Editar interação">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteInteracao(i.id)} disabled={deleteInteracaoMutation.isPending} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition" title="Deletar interação">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Modal Editar Interação */}
    {editandoInteracao && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Editar Interação</h3>
            <button onClick={() => setEditandoInteracao(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-6 space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
              <select value={editInteracaoForm.tipo} onChange={e => setEditInteracaoForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                {['Ligação','WhatsApp','E-mail','Reunião','Visita','Outro'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Resultado</label>
              <select value={editInteracaoForm.resultado} onChange={e => setEditInteracaoForm(p => ({ ...p, resultado: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                {['Positivo','Neutro','Negativo','Sem resposta'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data</label>
              <input type="date" value={editInteracaoForm.data_interacao} onChange={e => setEditInteracaoForm(p => ({ ...p, data_interacao: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Próximo contato</label>
              <input type="date" value={editInteracaoForm.proximo_contato} disabled={editInteracaoForm.resultado === 'Negativo'} onChange={e => setEditInteracaoForm(p => ({ ...p, proximo_contato: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150] disabled:opacity-40 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descrição *</label>
              <textarea value={editInteracaoForm.descricao} onChange={e => setEditInteracaoForm(p => ({ ...p, descricao: e.target.value }))}
                rows={3} placeholder="Descrição da interação..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150] resize-none" />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <button onClick={() => setEditandoInteracao(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button onClick={salvarEdicaoInteracao} disabled={salvandoInteracao} className="px-4 py-2 text-sm bg-[#0f1e35] text-white rounded-lg hover:bg-[#1a3150]">
              {salvandoInteracao ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal perfil cliente */}
    {perfilCliente && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Perfil do Cliente</h3>
            <button onClick={() => setPerfilCliente(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-[#0f1e35] flex items-center justify-center text-white font-bold text-lg">
                {(perfilCliente.nome || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{perfilCliente.nome}</p>
                {perfilCliente.origem === 'lead' && <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">🎯 Lead</span>}
                {perfilCliente.origem === 'lead_convertido' && <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">✅ Convertido</span>}
              </div>
            </div>
            {[
              { icon: FileText, label: 'CPF / CNPJ', value: perfilCliente.cpf_cnpj },
              { icon: Phone, label: 'Telefone', value: perfilCliente.telefone },
              { icon: Mail, label: 'E-mail', value: perfilCliente.email },
              { icon: MapPin, label: 'Cidade / UF', value: [perfilCliente.cidade, perfilCliente.estado].filter(Boolean).join(' / ') },
              { icon: Users, label: 'Gerente', value: perfilCliente.vendedor_nome },
            ].map(({ icon: Icon, label, value }) => value ? (
              <div key={label} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className="text-sm text-gray-800">{value}</p>
                </div>
              </div>
            ) : null)}
            {!perfilCliente.cpf_cnpj && !perfilCliente.telefone && !perfilCliente.email && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-xl p-3">Cadastro incompleto — sem CPF/CNPJ, telefone ou e-mail.</p>
            )}
          </div>
          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <Button 
              size="sm" 
              onClick={() => {
                setShowSalvarClienteModal(perfilCliente);
                setGerenteSelecionado(vendedor?.id || '');
              }}
              className="bg-[#0f1e35] hover:bg-[#1a3150] text-white gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar em Meus Clientes
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Modal salvar cliente em Meus Clientes */}
    {showSalvarClienteModal && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Selecionar Gerente</h3>
            <button onClick={() => { setShowSalvarClienteModal(null); setGerenteSelecionado(''); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Qual gerente será responsável por este cliente?
            </p>
            <select 
              value={gerenteSelecionado} 
              onChange={e => setGerenteSelecionado(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a3150]"
            >
              <option value="">Selecione um gerente...</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowSalvarClienteModal(null); setGerenteSelecionado(''); }}>Cancelar</Button>
            <Button 
              onClick={handleSalvarCliente} 
              disabled={!gerenteSelecionado || salvandoCliente}
              className="bg-[#0f1e35] hover:bg-[#1a3150]"
            >
              {salvandoCliente ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}