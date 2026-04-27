import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Eye, Trash2, Search, Globe, DollarSign, FilePlus, Edit2, TrendingUp, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ContratoForm from '@/components/contratos/ContratoForm';
import ContratoViewer from '@/components/contratos/ContratoViewer';

const TIPO_CONFIG = {
  'CONTA GLOBAL': { color: 'bg-[#0f1e35]', light: 'bg-blue-50 text-[#0f1e35] border-blue-200', icon: Globe, desc: 'Conta em moeda estrangeira para câmbio e investimentos internacionais' },
  'CONTA INTERNACIONAL': { color: 'bg-[#1a3a6b]', light: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Globe, desc: 'Abertura de conta internacional com transações em múltiplas moedas' },
  'DOLARIZE AQUI': { color: 'bg-amber-700', light: 'bg-amber-50 text-amber-700 border-amber-200', icon: DollarSign, desc: 'Dolarização de ativos e proteção patrimonial em dólar americano' },
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
  const [enviandoPipelineId, setEnviandoPipelineId] = useState(null);
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

  const enviarPipeline = async (c) => {
    if (!confirm(`Enviar contrato de "${c.nome}" para o Pipeline?`)) return;
    setEnviandoPipelineId(c.id);
    try {
      const contratoAtualizado = await base44.entities.Contrato.get(c.id);
      const ct = contratoAtualizado || c;
      const pipeline = await base44.entities.Pipeline.create({
        cliente_nome: ct.nome,
        cliente_cpf_cnpj: ct.cpf_cnpj,
        cliente_telefone: ct.telefone || '',
        produto: ct.tipo,
        valor_estimado: ct.valor_total || ct.valor_adesao || 0,
        temperatura: 'Quente',
        origem: 'Carteira',
        vendedor_id: ct.vendedor_id || '',
        vendedor_nome: ct.vendedor_nome || '',
        descricao: `Contrato ${ct.tipo} gerado. Valor total: R$ ${Number(ct.valor_total || ct.valor_adesao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Aguardando finalização da venda.`,
        data_prevista: ct.data_primeiro_pagamento || '',
      });
      await base44.entities.Contrato.update(ct.id, { status: 'no_pipeline', pipeline_id: pipeline.id });
      queryClient.invalidateQueries(['contratos']);
      toast.success('Enviado para o Pipeline com sucesso!');
    } catch (err) {
      toast.error('Erro: ' + err.message);
    }
    setEnviandoPipelineId(null);
  };

  const contratosFiltrados = contratos.filter(c => {
    if (!isAdmin && c.vendedor_id !== user?.id && c.created_by !== user?.email) return false;
    const tipoOk = filtroTipo === 'Todos' || c.tipo === filtroTipo;
    const statusOk = filtroStatus === 'Todos' || c.status === filtroStatus;
    const buscaOk = !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.cpf_cnpj?.includes(busca);
    return tipoOk && statusOk && buscaOk;
  });

  if (view === 'novo') {
    return (
      <ContratoForm
        tipo={tipoSelecionado}
        user={user}
        contratoExistente={contratoAtivo || undefined}
        onSaved={(c) => { setContratoAtivo(c); setView('viewer'); queryClient.invalidateQueries(['contratos']); }}
        onCancel={() => { setView('lista'); setContratoAtivo(null); }}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => {
            const Icon = cfg.icon;
            const qtd = contratos.filter(c => c.tipo === tipo && (isAdmin || c.created_by === user?.email || c.vendedor_id === user?.id)).length;
            return (
              <button key={tipo} onClick={() => { setTipoSelecionado(tipo); setView('novo'); }}
                className={`relative rounded-2xl p-5 text-left text-white overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl ${cfg.color} shadow-md`}>
                <div className="absolute right-4 top-4 opacity-10">
                  <Icon className="w-16 h-16" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <FilePlus className="w-4 h-4 opacity-80" />
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Novo Contrato</span>
                </div>
                <p className="font-bold text-base leading-tight">{tipo}</p>
                <p className="text-xs opacity-60 mt-1 leading-snug">{cfg.desc}</p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-xs font-semibold opacity-80">{qtd} contrato(s)</span>
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
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{c.nome || '—'}</p>
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
                      <td className="px-4 py-3">
                       <div className="flex items-center justify-center gap-1">
                         <button onClick={() => { setContratoAtivo(c); setView('viewer'); }}
                           className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="Visualizar / Gerar PDF">
                           <Eye className="w-3.5 h-3.5" />
                         </button>
                         <button onClick={() => { setContratoAtivo(c); setTipoSelecionado(c.tipo); setView('novo'); }}
                           className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition" title="Editar">
                           <Edit2 className="w-3.5 h-3.5" />
                         </button>
                         <button
                           onClick={() => enviarPipeline(c)}
                           disabled={c.status === 'no_pipeline' || enviandoPipelineId === c.id}
                           className="p-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition disabled:opacity-30" title="Enviar ao Pipeline">
                           {enviandoPipelineId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                         </button>
                         <button onClick={() => { if (confirm('Excluir este contrato?')) deleteMutation.mutate(c.id); }}
                           className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition" title="Excluir">
                           <Trash2 className="w-3.5 h-3.5" />
                         </button>
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