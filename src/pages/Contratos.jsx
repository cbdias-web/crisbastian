import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Eye, Trash2, Search, Globe, DollarSign, FilePlus, Edit2, ShoppingCart, Loader2, Link2, Building2, ChevronDown, X, BarChart3 } from 'lucide-react';
import RelatorioContratosModal from '@/components/contratos/RelatorioContratosModal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { todayBrasilia } from '@/lib/dateUtils';
import ContratoForm from '@/components/contratos/ContratoForm';
import ContratoViewer from '@/components/contratos/ContratoViewer';
import ClientesDraggableSidebar from '@/components/contratos/ClientesDraggableSidebar';

const TIPO_CONFIG = {
  'CONTA GLOBAL': { color: 'bg-[#0f1e35]', light: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: Globe, desc: 'Conta em moeda estrangeira para câmbio e investimentos internacionais' },
  'CONTA INTERNACIONAL': { color: 'bg-[#1a3a6b]', light: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', icon: Globe, desc: 'Abertura de conta internacional com transações em múltiplas moedas' },
  'DOLARIZE': { color: 'bg-amber-700', light: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: DollarSign, desc: 'Dolarização de ativos e proteção patrimonial em dólar americano' },
  'ROF': { color: 'bg-emerald-700', light: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: FileText, desc: 'Registro de Operação Financeira para movimentações cambiais regulamentadas' },
  'CANAL BANCÁRIO': { color: 'bg-violet-700', light: 'bg-violet-500/15 text-violet-300 border-violet-500/30', icon: Building2, desc: 'Operações via canal bancário para transferências e câmbio direto' },
  'OFFSHORE': { color: 'bg-cyan-700', light: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', icon: Globe, desc: 'Estruturação de empresa e conta bancária offshore no exterior' },
  'GARANTIAS': { color: 'bg-rose-700', light: 'bg-rose-500/15 text-rose-300 border-rose-500/30', icon: FileText, desc: 'Contrato de garantias e seguros patrimoniais e financeiros' },
  'HORA TÉCNICA': { color: 'bg-teal-700', light: 'bg-teal-500/15 text-teal-300 border-teal-500/30', icon: FileText, desc: 'Contrato de prestação de serviços por hora técnica especializada' },
  'RATING': { color: 'bg-sky-700', light: 'bg-sky-500/15 text-sky-300 border-sky-500/30', icon: BarChart3, desc: 'Contrato de serviços de rating e análise de crédito internacional' },
};

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', cls: 'bg-gray-500/20 text-gray-300' },
  gerado: { label: 'PDF Gerado', cls: 'bg-blue-500/20 text-blue-300' },
  assinado: { label: 'Assinado', cls: 'bg-emerald-500/20 text-emerald-300' },
  aguardando_pagamento: { label: 'Aguard. Pagamento', cls: 'bg-amber-500/20 text-amber-300' },
  pago: { label: 'Pago', cls: 'bg-violet-500/20 text-violet-300' },
  no_pipeline: { label: 'No Pipeline', cls: 'bg-purple-500/20 text-purple-300' },
};

const fmtVal = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const fmtDate = (d) => d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy') : '—';

export default function Contratos() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('lista');
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
  const [clientePreSelecionado, setClientePreSelecionado] = useState(null);
  const [filtroVendedores, setFiltroVendedores] = useState([]);
  const [vendedorDropdownOpen, setVendedorDropdownOpen] = useState(false);
  const [showRelatorio, setShowRelatorio] = useState(false);
  const vendedorDropdownRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  useEffect(() => {
    const handler = (e) => {
      if (vendedorDropdownRef.current && !vendedorDropdownRef.current.contains(e.target)) {
        setVendedorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
        tipo_venda: 'nova',
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

  const vendedoresDisponiveis = [...new Set(contratos.map(c => c.vendedor_nome).filter(Boolean))].sort();

  const contratosFiltrados = contratos.filter(c => {
    const tipoOk = filtroTipo === 'Todos' || c.tipo === filtroTipo;
    const statusOk = filtroStatus === 'Todos' || c.status === filtroStatus;
    const buscaOk = !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.cpf_cnpj?.includes(busca);
    const dataRef = c.data_contrato || c.created_date?.split('T')[0] || '';
    const dataInicioOk = !filtroDataInicio || dataRef >= filtroDataInicio;
    const dataFimOk = !filtroDataFim || dataRef <= filtroDataFim;
    const vendedorOk = !isAdmin || filtroVendedores.length === 0 || filtroVendedores.includes(c.vendedor_nome);
    return tipoOk && statusOk && buscaOk && dataInicioOk && dataFimOk && vendedorOk;
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
    <div className="min-h-screen p-4 md:p-6" style={{ background: '#0d1117' }}>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header — indicação da entidade */}
        <div className="flex items-center justify-between gap-3 rounded-2xl px-5 py-4" style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,212,170,0.12)' }}>
              <FileText className="w-6 h-6" style={{ color: '#00D4AA' }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#00D4AA' }}>Comercial</p>
              <h1 className="text-2xl font-bold" style={{ color: '#e6edf3' }}>Contratos</h1>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(230,237,243,0.55)' }}>Gere, gerencie e acompanhe contratos de clientes</p>
            </div>
          </div>
          <button onClick={() => setShowRelatorio(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:scale-105 flex-shrink-0"
            style={{ background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.3)', color: '#00D4AA' }}>
            <BarChart3 className="w-4 h-4" />
            Relatório
          </button>
        </div>

        {/* Cards de tipo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => {
            const Icon = cfg.icon;
            const qtd = contratos.filter(c => c.tipo === tipo && (isAdmin || c.created_by === user?.email || c.vendedor_id === user?.id)).length;
            return (
              <button key={tipo} onClick={() => { setTipoSelecionado(tipo); setClientePreSelecionado(null); setView('novo'); }}
                className={`group relative rounded-2xl p-4 text-left text-white overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl active:scale-[0.98] ${cfg.color} shadow-lg border border-white/10`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="absolute -right-3 -bottom-3 opacity-[0.08] pointer-events-none">
                  <Icon className="w-20 h-20" />
                </div>
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-5 h-5 rounded-lg bg-white/15 flex items-center justify-center">
                    <FilePlus className="w-3 h-3" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-60">Novo</span>
                </div>
                <p className="font-bold text-sm leading-tight mb-1.5 group-hover:opacity-100 opacity-95">{tipo}</p>
                <p className="text-[10px] opacity-50 leading-snug mb-3 line-clamp-2">{cfg.desc}</p>
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
        <div className="rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-center" style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.15)' }}>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou CPF/CNPJ..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none" style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }} />
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl focus:outline-none" style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }}>
            <option value="Todos">Todos os tipos</option>
            {Object.keys(TIPO_CONFIG).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl focus:outline-none" style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }}>
            <option value="Todos">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Período:</span>
            <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg focus:outline-none" style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }} />
            <span className="text-xs text-gray-400">até</span>
            <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg focus:outline-none" style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }} />
            {(filtroDataInicio || filtroDataFim) && (
              <button onClick={() => { setFiltroDataInicio(''); setFiltroDataFim(''); }}
                className="text-xs text-red-400 hover:text-red-600 font-semibold px-1.5 py-1 hover:bg-red-50 rounded-lg transition">✕</button>
            )}
          </div>
          {/* Filtro por gerente (apenas admin) */}
          {isAdmin && (
            <div className="relative" ref={vendedorDropdownRef}>
              <button
                onClick={() => setVendedorDropdownOpen(p => !p)}
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded-xl focus:outline-none transition whitespace-nowrap ${
                  filtroVendedores.length > 0 ? 'font-semibold' : ''
                }`}
                style={{ background: '#1c2333', border: `1px solid ${filtroVendedores.length > 0 ? '#00D4AA' : 'rgba(0,212,170,0.15)'}`, color: filtroVendedores.length > 0 ? '#00D4AA' : 'rgba(230,237,243,0.55)' }}>
                Gerente{filtroVendedores.length > 0 ? ` (${filtroVendedores.length})` : ''}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${vendedorDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {vendedorDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-xl shadow-xl z-50 py-1 max-h-60 overflow-y-auto" style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.15)' }}>
                  {filtroVendedores.length > 0 && (
                    <button onClick={() => setFiltroVendedores([])}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 font-semibold transition">
                      <X className="w-3 h-3" /> Limpar seleção
                    </button>
                  )}
                  {vendedoresDisponiveis.length === 0 && (
                    <p className="px-3 py-2 text-xs text-gray-400 italic">Nenhum gerente encontrado</p>
                  )}
                  {vendedoresDisponiveis.map(v => {
                    const sel = filtroVendedores.includes(v);
                    return (
                      <button key={v} onClick={() => setFiltroVendedores(prev => sel ? prev.filter(x => x !== v) : [...prev, v])}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition"
                        style={{ color: sel ? '#00D4AA' : '#e6edf3', fontWeight: sel ? 600 : 400 }}>
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-[#00D4AA] border-[#00D4AA]' : 'border-gray-500'}`}>
                          {sel && <svg className="w-2.5 h-2.5" style={{ color: '#0d1117' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </span>
                        {v}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <span className="text-xs text-gray-400 ml-auto">{contratosFiltrados.length} contrato(s)</span>
        </div>

        {/* Lista */}
        {contratosFiltrados.length === 0 ? (
          <div className="rounded-2xl shadow-sm py-16 text-center" style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.15)' }}>
            <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(230,237,243,0.2)' }} />
            <p className="text-sm" style={{ color: 'rgba(230,237,243,0.55)' }}>Nenhum contrato encontrado</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(230,237,243,0.35)' }}>Clique em um dos tipos acima para criar seu primeiro contrato</p>
          </div>
        ) : (
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.15)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider" style={{ background: '#1c2333', color: 'rgba(230,237,243,0.55)' }}>
                  <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold">Valor Total</th>
                  <th className="px-4 py-3 text-left font-semibold">Data</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-left font-semibold">Vendedor</th>}
                  <th className="px-4 py-3 text-center font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody style={{ borderColor: 'rgba(0,212,170,0.1)' }}>
                {contratosFiltrados.map(c => {
                  const cfg = TIPO_CONFIG[c.tipo];
                  const stCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.rascunho;
                  return (
                    <tr key={c.id} className="transition cursor-pointer" style={{ borderTop: '1px solid rgba(0,212,170,0.1)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { setContratoAtivo(c); setView('viewer'); }}>
                      <td className="px-4 py-3">
                        <p className="font-medium hover:underline" style={{ color: '#e6edf3' }}>{c.nome || '—'}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(230,237,243,0.4)' }}>{c.cpf_cnpj}</p>
                      </td>
                      <td className="px-4 py-3 min-w-[130px]">
                        <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${cfg?.light || 'bg-gray-500/15 text-gray-300 border-gray-500/30'}`}>
                          {c.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: '#00D4AA' }}>{fmtVal(c.valor_total)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'rgba(230,237,243,0.5)' }}>{fmtDate(c.data_contrato || c.created_date?.split('T')[0])}</td>
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
                      {isAdmin && <td className="px-4 py-3 text-xs" style={{ color: 'rgba(230,237,243,0.5)' }}>{c.vendedor_nome || '—'}</td>}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setContratoAtivo(c); setView('viewer'); }}
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="Visualizar / Gerar PDF">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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
        {showRelatorio && <RelatorioContratosModal onClose={() => setShowRelatorio(false)} />}
      </div>
    </div>
  );
}