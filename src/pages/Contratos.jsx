import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Eye, Trash2, Search, Globe, DollarSign, FilePlus, Edit2, ShoppingCart, Loader2, Link2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { todayBrasilia } from '@/lib/dateUtils';
import ContratoForm from '@/components/contratos/ContratoForm';
import ContratoViewer from '@/components/contratos/ContratoViewer';
import ClientesDraggableSidebar from '@/components/contratos/ClientesDraggableSidebar';

const TIPO_CONFIG = {
  'CONTA GLOBAL': { color: 'bg-[#0f1e35]', light: 'bg-blue-50 text-[#0f1e35] border-blue-200', icon: Globe, desc: 'Conta em moeda estrangeira para câmbio e investimentos internacionais' },
  'CONTA INTERNACIONAL': { color: 'bg-[#1a3a6b]', light: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Globe, desc: 'Abertura de conta internacional com transações em múltiplas moedas' },
  'DOLARIZE': { color: 'bg-amber-700', light: 'bg-amber-50 text-amber-700 border-amber-200', icon: DollarSign, desc: 'Dolarização de ativos e proteção patrimonial em dólar americano' },
  'ROF': { color: 'bg-emerald-700', light: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: FileText, desc: 'Registro de Operação Financeira para movimentações cambiais regulamentadas' },
  'CANAL BANCÁRIO': { color: 'bg-violet-700', light: 'bg-violet-50 text-violet-700 border-violet-200', icon: Building2, desc: 'Operações via canal bancário para transferências e câmbio direto' },
  'OFFSHORE': { color: 'bg-cyan-700', light: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: Globe, desc: 'Estruturação de empresa e conta bancária offshore no exterior' },
  'GARANTIAS': { color: 'bg-rose-700', light: 'bg-rose-50 text-rose-700 border-rose-200', icon: FileText, desc: 'Contrato de garantias e seguros patrimoniais e financeiros' },
  'HORA TÉCNICA': { color: 'bg-teal-700', light: 'bg-teal-50 text-teal-700 border-teal-200', icon: FileText, desc: 'Contrato de prestação de serviços por hora técnica especializada' },
};

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', cls: 'bg-gray-100 text-gray-500' },
  gerado: { label: 'PDF Gerado', cls: 'bg-blue-100 text-blue-700' },
  assinado: { label: 'Assinado', cls: 'bg-emerald-100 text-emerald-700' },
  aguardando_pagamento: { label: 'Aguard. Pagamento', cls: 'bg-amber-100 text-amber-700' },
  pago: { label: 'Pago', cls: 'bg-violet-100 text-violet-700' },
  no_pipeline: { label: 'No Pipeline', cls: 'bg-purple-100 text-purple-700' },
};

const fmtVal = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const fmtDate = (d) => d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy') : '—';

export default function Contratos() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('lista'); // 'lista' | 'novo' | 'viewer'
  const [contratoAtivo, setContratoAtivo] = useState(null);
  const [tipoSelecionado, setTipoSelecionado] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [enviandoPipelineId, setEnviandoPipelineId] = useState(null);
  const [clienteArrastado, setClienteArrastado] = useState(null);
  const [dragOverTipo, setDragOverTipo] = useState(null);
  const [clientePreSelecionado, setClientePreSelecionado] = useState(null); // para pré-preencher o form
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => base44.entities.Contrato.list('-created_date', 500),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contrato.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['contratos']); toast.success('Contrato excluído.'); },
  });

  const enviarParaVendas = async (c) => {
    if (!confirm(`Criar venda a partir do contrato de "${c.nome}" e ir para Vendas?`)) return;
    setEnviandoPipelineId(c.id);
    try {
      const contratoAtualizado = await base44.entities.Contrato.get(c.id);
      const ct = contratoAtualizado || c;
      const vendaPayload = {
        produto: ct.tipo,
        assessor_comercial: ct.vendedor_nome || '',
        vendedor_id: ct.vendedor_id || '',
        cliente: ct.nome || '',
        cpf_cnpj: ct.cpf_cnpj || '',
        valor: ct.valor_adesao || ct.valor_total || 0,
        valor_total_contrato: ct.valor_total || 0,
        data: todayBrasilia(),
        forma_pagamento: ct.origem_pagamento || ct.forma_pagamento || '',
        observacao: `Originado do Contrato ${ct.tipo}. Comprovante de pagamento anexado.`,
      };
      if (ct.indicadores?.length > 0) {
        vendaPayload.indicadores = ct.indicadores;
        vendaPayload.espelhamento = ct.indicadores[0]?.nome || '';
        vendaPayload.espelhamento_id = ct.indicadores[0]?.id || '';
        vendaPayload.percentual_comissao_espelhamento = ct.indicadores[0]?.percentual || 0;
      }
      await base44.entities.Venda.create(vendaPayload);
      await base44.entities.Contrato.update(ct.id, { status: 'no_pipeline' });
      queryClient.invalidateQueries(['contratos']);
      queryClient.invalidateQueries(['vendas']);
      toast.success('Venda criada! Redirecionando para Vendas...');
      setTimeout(() => window.location.href = '/Vendas', 1200);
    } catch (err) {
      toast.error('Erro: ' + err.message);
    }
    setEnviandoPipelineId(null);
  };

  const contratosFiltrados = contratos.filter(c => {
    const tipoOk = filtroTipo === 'Todos' || c.tipo === filtroTipo;
    const statusOk = filtroStatus === 'Todos' || c.status === filtroStatus;
    const buscaOk = !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.cpf_cnpj?.includes(busca);
    const dataRef = c.data_contrato || c.created_date?.split('T')[0] || '';
    const dataInicioOk = !filtroDataInicio || dataRef >= filtroDataInicio;
    const dataFimOk = !filtroDataFim || dataRef <= filtroDataFim;
    return tipoOk && statusOk && buscaOk && dataInicioOk && dataFimOk;
  });

  const handleDropCliente = (e, tipo) => {
    e.preventDefault();
    setDragOverTipo(null);
    const clienteData = e.dataTransfer.getData('clienteData');
    if (!clienteData) return;
    try {
      const cliente = JSON.parse(clienteData);
      setClientePreSelecionado(cliente);
      setTipoSelecionado(tipo);
      setContratoAtivo(null);
      setView('novo');
    } catch {}
  };

  if (view === 'novo') {
    return (
      <ContratoForm
        tipo={tipoSelecionado}
        user={user}
        contratoExistente={contratoAtivo || undefined}
        clientePreSelecionado={!contratoAtivo ? clientePreSelecionado : null}
        onSaved={(c) => { setContratoAtivo(c); setClientePreSelecionado(null); setView('viewer'); queryClient.invalidateQueries(['contratos']); }}
        onCancel={() => { setView('lista'); setContratoAtivo(null); setClientePreSelecionado(null); }}
      />
    );
  }

  if (view === 'viewer' && contratoAtivo) {
    return (
      <ContratoViewer
        contrato={contratoAtivo}
        isAdmin={isAdmin}
        onBack={() => { setView('lista'); setContratoAtivo(null); }}
        onUpdate={(c) => { setContratoAtivo(c); queryClient.invalidateQueries(['contratos']); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#1a3150]" /> Contratos
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Gere, gerencie e acompanhe contratos de clientes</p>
          </div>
        </div>

        {/* Cards de tipo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => {
            const Icon = cfg.icon;
            const qtd = contratos.filter(c => c.tipo === tipo && (isAdmin || c.created_by === user?.email || c.vendedor_id === user?.id)).length;
            return (
              <button key={tipo} onClick={() => { setTipoSelecionado(tipo); setClientePreSelecionado(null); setView('novo'); }}
                className={`group relative rounded-2xl p-4 text-left text-white overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl active:scale-[0.98] ${cfg.color} shadow-lg border border-white/10`}>
                {/* Fundo decorativo */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="absolute -right-3 -bottom-3 opacity-[0.08] pointer-events-none">
                  <Icon className="w-20 h-20" />
                </div>

                {/* Badge novo */}
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-5 h-5 rounded-lg bg-white/15 flex items-center justify-center">
                    <FilePlus className="w-3 h-3" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-60">Novo</span>
                </div>

                {/* Nome */}
                <p className="font-bold text-sm leading-tight mb-1.5 group-hover:opacity-100 opacity-95">{tipo}</p>

                {/* Desc */}
                <p className="text-[10px] opacity-50 leading-snug mb-3 line-clamp-2">{cfg.desc}</p>

                {/* Contador */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${qtd > 0 ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}>
                    {qtd} contrato{qtd !== 1 ? 's' : ''}
                  </span>
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                    <svg className="w-2.5 h-2.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou CPF/CNPJ..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white">
            <option value="Todos">Todos os tipos</option>
            {Object.keys(TIPO_CONFIG).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white">
            <option value="Todos">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Período:</span>
            <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
            <span className="text-xs text-gray-400">até</span>
            <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
            {(filtroDataInicio || filtroDataFim) && (
              <button onClick={() => { setFiltroDataInicio(''); setFiltroDataFim(''); }}
                className="text-xs text-red-400 hover:text-red-600 font-semibold px-1.5 py-1 hover:bg-red-50 rounded-lg transition">✕</button>
            )}
          </div>
          <span className="text-xs text-gray-400 ml-auto">{contratosFiltrados.length} contrato(s)</span>
        </div>

        {/* Lista */}
        {contratosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum contrato encontrado</p>
            <p className="text-xs text-gray-300 mt-1">Clique em um dos tipos acima para criar seu primeiro contrato</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold">Valor Total</th>
                  <th className="px-4 py-3 text-left font-semibold">Data</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-left font-semibold">Vendedor</th>}
                  <th className="px-4 py-3 text-center font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contratosFiltrados.map(c => {
                  const cfg = TIPO_CONFIG[c.tipo];
                  const stCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.rascunho;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => { setContratoAtivo(c); setView('viewer'); }}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 hover:text-blue-700 hover:underline">{c.nome || '—'}</p>
                        <p className="text-[10px] text-gray-400">{c.cpf_cnpj}</p>
                      </td>
                      <td className="px-4 py-3 min-w-[130px]">
                        <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${cfg?.light || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {c.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1a3150]">{fmtVal(c.valor_total)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(c.data_contrato || c.created_date?.split('T')[0])}</td>
                      <td className="px-4 py-3 min-w-[110px]">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-block text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${stCfg.cls}`}>{stCfg.label}</span>
                          {!c.link_assinatura && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 whitespace-nowrap">
                              <Link2 className="w-2.5 h-2.5" /> Link pendente
                            </span>
                          )}
                        </div>
                      </td>
                      {isAdmin && <td className="px-4 py-3 text-xs text-gray-500">{c.vendedor_nome || '—'}</td>}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setContratoAtivo(c); setView('viewer'); }}
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="Visualizar / Gerar PDF">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {/* Editar: próprio contrato ou admin */}
                          {(isAdmin || c.vendedor_id === user?.id || c.created_by === user?.email) && (
                            <button onClick={() => { setContratoAtivo(c); setTipoSelecionado(c.tipo); setView('novo'); }}
                              className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => enviarParaVendas(c)}
                            disabled={c.status === 'no_pipeline' || enviandoPipelineId === c.id}
                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition disabled:opacity-30" title="Enviar para Vendas">
                            {enviandoPipelineId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                          </button>
                          {/* Excluir: apenas admin */}
                          {isAdmin && (
                            <button onClick={() => { if (confirm('Excluir este contrato?')) deleteMutation.mutate(c.id); }}
                              className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition" title="Excluir">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
  );
}