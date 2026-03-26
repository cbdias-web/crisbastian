import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
 import { base44 } from '@/api/base44Client';
 import { Button } from '@/components/ui/button';
 import { FileText, Filter, Download, Search, X, CheckCircle2, Clock, XCircle, MinusCircle, Users, Eye, Phone, Mail, MapPin, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

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

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-relatorio-perfil'],
    queryFn: () => base44.entities.Cliente.list('nome', 10000),
    enabled: !!user
  });

  React.useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const vendedores = await base44.entities.Vendedor.filter({ email: u.email });
      if (vendedores.length > 0) setVendedor(vendedores[0]);
    }).catch(() => {});
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

  const handleSalvarCliente = async () => {
    if (!perfilCliente || !gerenteSelecionado) {
      toast.error('Selecione um gerente');
      return;
    }
    setSalvandoCliente(true);
    try {
      const vendedorSelecionado = vendedores.find(v => v.id === gerenteSelecionado);
      // Criar cliente em "Meus Clientes" com o gerente selecionado
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

  // Agrupamento por vendedor para o resumo
  const resumoPorVendedor = interacoesFiltradas.reduce((acc, i) => {
    const key = i.vendedor_nome || 'Sem vendedor';
    if (!acc[key]) acc[key] = { total: 0, positivo: 0, negativo: 0, semResposta: 0 };
    acc[key].total++;
    if (i.resultado === 'Positivo') acc[key].positivo++;
    if (i.resultado === 'Negativo') acc[key].negativo++;
    if (i.resultado === 'Sem resposta') acc[key].semResposta++;
    return acc;
  }, {});

  // Tipos únicos
  const tipos = [...new Set(interacoes.map(i => i.tipo).filter(Boolean))];

  const abrirPerfil = (interacao, e) => {
    e.stopPropagation();
    const c = clientes.find(c => c.id === interacao.cliente_id);
    setPerfilCliente(c || { nome: interacao.cliente_nome, id: interacao.cliente_id });
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatório de Interações</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isAdmin ? 'Visão geral de todos os vendedores' : `Carteira de ${vendedor?.nome || user?.full_name}`}
            </p>
          </div>
          <Button
            onClick={gerarPDF}
            disabled={gerandoPDF || interacoesFiltradas.length === 0}
            className="bg-[#0f1e35] hover:bg-[#1a3150] text-white"
          >
            {gerandoPDF ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Exportar PDF
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total de Interações', value: interacoesFiltradas.length, color: 'bg-[#0f1e35] text-white' },
            { label: 'Positivas', value: interacoesFiltradas.filter(i => i.resultado === 'Positivo').length, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Negativas', value: interacoesFiltradas.filter(i => i.resultado === 'Negativo').length, color: 'bg-red-50 text-red-600' },
            { label: 'Sem Resposta', value: interacoesFiltradas.filter(i => i.resultado === 'Sem resposta').length, color: 'bg-gray-100 text-gray-600' },
          ].map(kpi => (
            <div key={kpi.label} className={`rounded-2xl p-4 shadow-sm ${kpi.color}`}>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs font-medium opacity-70 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
            </div>
            {isAdmin && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Vendedor</label>
                <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                  <option value="todos">Todos</option>
                  {vendedores.map(v => <option key={v.id}>{v.nome}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Resultado</label>
              <select value={filtroResultado} onChange={e => setFiltroResultado(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                <option value="todos">Todos</option>
                {['Positivo','Neutro','Negativo','Sem resposta'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                <option value="todos">Todos</option>
                {tipos.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Busca livre</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                  placeholder="Cliente, vendedor, descrição..."
                  className="flex-1 py-2 text-sm outline-none bg-transparent" />
                {busca && <button onClick={() => setBusca('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
              </div>
            </div>
          </div>
        </div>

        {/* Resumo por vendedor (admin) */}
        {isAdmin && Object.keys(resumoPorVendedor).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Resumo por Vendedor</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {Object.entries(resumoPorVendedor).map(([nome, dados]) => (
                <div key={nome} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{nome}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold text-gray-700">{dados.total} interações</span>
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{dados.positivo} pos.</span>
                    <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{dados.negativo} neg.</span>
                    <span className="text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{dados.semResposta} s/resp.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                    {isAdmin && <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Vendedor</th>}
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Resultado</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Descrição</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Próx. Contato</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Perfil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {interacoesFiltradas.map(i => {
                    const res = resultadoConfig[i.resultado] || resultadoConfig['Neutro'];
                    const ResIcon = res.icon;
                    return (
                      <tr key={i.id} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={(e) => abrirPerfil(i, e)}>
                        <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {i.data_interacao ? format(parseISO(i.data_interacao), 'dd/MM/yyyy') : '—'}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-800 underline text-blue-600">{i.cliente_nome}</td>
                        {isAdmin && <td className="px-5 py-3 text-sm text-gray-600">{i.vendedor_nome}</td>}
                        <td className="px-5 py-3 text-sm text-gray-600">{i.tipo}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 w-fit ${res.color}`}>
                            <ResIcon className="w-3 h-3" />{i.resultado}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600 max-w-xs truncate">{i.descricao}</td>
                        <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {i.proximo_contato ? format(parseISO(i.proximo_contato), 'dd/MM/yyyy') : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <button onClick={(e) => abrirPerfil(i, e)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#1a3150] transition" title="Ver perfil">
                            <Eye className="w-4 h-4" />
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