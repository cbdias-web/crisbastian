import { useState, useEffect, useRef } from 'react';
import { todayBrasilia } from '@/lib/dateUtils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Save, Search, User, DollarSign, MapPin, FileText,
  Plus, Trash2, AlertTriangle, ChevronRight, ChevronLeft,
  CheckCircle2, Circle, X, UserCheck, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = {
  nome: '', cpf_cnpj: '', responsavel_legal: '', cpf_responsavel: '',
  nascimento: '', nacionalidade: 'Brasileira', profissao: '', estado_civil: '',
  email: '', telefone: '', cep: '', endereco: '', bairro: '', cidade: '', estado: '',
  valor_adesao: '', valor_parcela: '', num_parcelas: 1, valor_total: '',
  forma_pagamento: '', data_primeiro_pagamento: '', dia_vencimento: '',
  banco: '', agencia: '', conta: '', moeda: 'USD', cotacao: '', valor_em_moeda: '',
  prazo_meses: '', observacoes: '', data_contrato: todayBrasilia(),
  mensalidade: '', valor_divida: '', percentual_montante: '', administracao_debitos: [],
};

const FORMAS = ['PIX', 'TED/DOC', 'DÉBITO EM CONTA', 'BOLETO', 'CARTÃO DE CRÉDITO'];
const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];

const TIPO_COLOR = {
  'CONTA GLOBAL': '#0f1e35',
  'CONTA INTERNACIONAL': '#1a3a6b',
  'DOLARIZE': '#b45309',
  'ROF': '#047857',
  'CANAL BANCÁRIO': '#6d28d9',
  'OFFSHORE': '#0e7490',
  'GARANTIAS': '#be123c',
  'HORA TÉCNICA': '#0f766e',
  'RATING': '#0369a1',
};

const TIPO_GRADIENT = {
  'CONTA GLOBAL': 'from-[#0f1e35] to-[#1a3150]',
  'CONTA INTERNACIONAL': 'from-[#1a3a6b] to-[#2a4a8b]',
  'DOLARIZE': 'from-[#b45309] to-[#d97706]',
  'ROF': 'from-emerald-700 to-emerald-600',
  'CANAL BANCÁRIO': 'from-violet-700 to-violet-600',
  'OFFSHORE': 'from-cyan-700 to-cyan-600',
  'GARANTIAS': 'from-rose-700 to-rose-600',
  'HORA TÉCNICA': 'from-teal-700 to-teal-600',
  'RATING': 'from-sky-700 to-sky-600',
};

function calcProgress(form, aba) {
  const checks = {
    dados: ['nome', 'cpf_cnpj', 'email', 'telefone', 'nascimento', 'profissao', 'estado_civil', 'nacionalidade'],
    endereco: ['cep', 'endereco', 'bairro', 'cidade', 'estado'],
    financeiro: ['valor_total', 'forma_pagamento'],
    obs: ['data_contrato'],
  };
  const fields = checks[aba] || [];
  const filled = fields.filter(f => form[f] && String(form[f]).trim() !== '').length;
  return Math.round((filled / fields.length) * 100);
}

export default function ContratoForm({ tipo, user, onSaved, onCancel, contratoExistente, clientePreSelecionado }) {
  const [form, setForm] = useState(() => {
    if (contratoExistente) return { ...EMPTY, ...contratoExistente };
    if (clientePreSelecionado) return {
      ...EMPTY,
      nome: clientePreSelecionado.nome || '',
      cpf_cnpj: clientePreSelecionado.cpf_cnpj || '',
      email: clientePreSelecionado.email || '',
      telefone: clientePreSelecionado.telefone || '',
      cidade: clientePreSelecionado.cidade || '',
      estado: clientePreSelecionado.estado || '',
      cliente_id: clientePreSelecionado.id || '',
    };
    return EMPTY;
  });

  const queryClient = useQueryClient();
  const [buscaCliente, setBuscaCliente] = useState('');
  const [showBusca, setShowBusca] = useState(false);
  const [aba, setAba] = useState('dados');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [indicadores, setIndicadores] = useState(() => {
    if (contratoExistente?.indicadores?.length > 0) return contratoExistente.indicadores;
    return [];
  });
  const searchRef = useRef(null);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-contrato'],
    queryFn: () => base44.entities.Cliente.list('nome', 500),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: vendedoresList = [] } = useQuery({
    queryKey: ['vendedores-contrato'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: espelhamentosList = [] } = useQuery({
    queryKey: ['espelhamentos-contrato'],
    queryFn: async () => {
      const all = await base44.entities.Espelhamento.list('nome', 500);
      return all.filter(e => e.ativo !== false);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const indicadoresDisponiveis = [
    ...vendedoresList.map(v => ({ id: v.id, nome: v.nome, tipo: 'vendedor', percentual_comissao: v.percentual_comissao || 10 })),
    ...espelhamentosList.map(e => ({ id: e.id, nome: e.nome, tipo: 'indicador', percentual_comissao: e.percentual_comissao || 10 })),
  ].sort((a, b) => a.nome.localeCompare(b.nome));

  const totalPctIndicadores = indicadores.reduce((s, i) => s + (parseFloat(i.percentual) || 0), 0);
  const limiteIndicadoresExcedido = totalPctIndicadores > 50;

  const [novoIndicadorNome, setNovoIndicadorNome] = useState('');
  const [novoIndicadorEmail, setNovoIndicadorEmail] = useState('');
  const [novoIndicadorTelefone, setNovoIndicadorTelefone] = useState('');
  const [novoIndicadorPercentual, setNovoIndicadorPercentual] = useState(10);
  const [showNovoIndicador, setShowNovoIndicador] = useState(false);
  const [salvandoNovoIndicador, setSalvandoNovoIndicador] = useState(false);

  const [buscaIndicador, setBuscaIndicador] = useState(() => {
    const init = {};
    if (contratoExistente?.indicadores?.length > 0) {
      contratoExistente.indicadores.forEach((ind, i) => { init[i] = ind.nome || ''; });
    }
    return init;
  });
  const [showDropIndicador, setShowDropIndicador] = useState({});

  const addIndicador = () => setIndicadores(prev => [...prev, { id: '', nome: '', percentual: 10, tipo: 'indicador' }]);
  const removeIndicador = (idx) => {
    setIndicadores(prev => prev.filter((_, i) => i !== idx));
    setBuscaIndicador(prev => { const n = {...prev}; delete n[idx]; return n; });
    setShowDropIndicador(prev => { const n = {...prev}; delete n[idx]; return n; });
  };
  const updateIndicador = (idx, field, value) => setIndicadores(prev => prev.map((ind, i) => i === idx ? { ...ind, [field]: value } : ind));
  const criarNovoIndicador = async () => {
    if (!novoIndicadorNome.trim()) { toast.error('Nome é obrigatório.'); return; }
    setSalvandoNovoIndicador(true);
    try {
      const novo = await base44.entities.Espelhamento.create({
        nome: novoIndicadorNome.trim(),
        email: novoIndicadorEmail.trim() || undefined,
        telefone: novoIndicadorTelefone.trim() || undefined,
        percentual_comissao: novoIndicadorPercentual || 10,
        ativo: true,
      });
      await queryClient.invalidateQueries(['espelhamentos-contrato']);
      setIndicadores(prev => [...prev, { id: novo.id, nome: novo.nome, percentual: novoIndicadorPercentual || 10, tipo: 'indicador' }]);
      setNovoIndicadorNome('');
      setNovoIndicadorEmail('');
      setNovoIndicadorTelefone('');
      setNovoIndicadorPercentual(10);
      setShowNovoIndicador(false);
      toast.success(`Indicador "${novo.nome}" criado e adicionado!`);
    } catch (err) {
      toast.error('Erro ao criar indicador: ' + err.message);
    }
    setSalvandoNovoIndicador(false);
  };

  const selectIndicadorPessoa = (idx, pessoa) => {
    setIndicadores(prev => prev.map((ind, i) => i === idx ? { ...ind, id: pessoa.id, nome: pessoa.nome, tipo: pessoa.tipo, percentual: ind.percentual || pessoa.percentual_comissao } : ind));
    setBuscaIndicador(prev => ({ ...prev, [idx]: pessoa.nome }));
    setShowDropIndicador(prev => ({ ...prev, [idx]: false }));
  };

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowBusca(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buscarCep = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(f => ({
          ...f,
          endereco: data.logradouro || f.endereco,
          bairro: data.bairro || f.bairro,
          cidade: data.localidade || f.cidade,
          estado: data.uf || f.estado,
        }));
        toast.success('Endereço preenchido automaticamente!');
      }
    } catch {}
    setBuscandoCep(false);
  };

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const [vendedorEditId, setVendedorEditId] = useState(contratoExistente?.vendedor_id || '');
  const [vendedorEditNome, setVendedorEditNome] = useState(contratoExistente?.vendedor_nome || '');

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let vendedorId, vendedorNome;
      if (contratoExistente) {
        vendedorId = vendedorEditId || contratoExistente.vendedor_id || user?.id || '';
        vendedorNome = vendedorEditNome || contratoExistente.vendedor_nome || user?.nome_tratamento || user?.full_name || '';
      } else {
        vendedorId = user?.id || '';
        vendedorNome = user?.nome_tratamento || user?.full_name || user?.email || '';
      }
      const toNum = (v) => { const n = parseFloat(v); return isNaN(n) ? undefined : n; };
      const payload = {
        ...data,
        tipo: data._tipoOverride || tipo,
        vendedor_id: vendedorId,
        vendedor_nome: vendedorNome,
        valor_adesao: parseFloat(data.valor_adesao) || 0,
        valor_parcela: parseInt(data.num_parcelas) > 0 ? (parseFloat(data.valor_parcela) || 0) : 0,
        num_parcelas: parseInt(data.num_parcelas) || 0,
        valor_total: parseFloat(data.valor_total) || 0,
        cotacao: parseFloat(data.cotacao) || 0,
        valor_em_moeda: parseFloat(data.valor_em_moeda) || 0,
        prazo_meses: parseInt(data.prazo_meses) || 0,
        dia_vencimento: parseInt(data.dia_vencimento) || 0,
        mensalidade: toNum(data.mensalidade),
        valor_divida: toNum(data.valor_divida),
        percentual_montante: toNum(data.percentual_montante),
      };

      const payloadFinal = { ...payload, indicadores };

      let contrato;
      if (contratoExistente) {
        contrato = await base44.entities.Contrato.update(contratoExistente.id, { ...payloadFinal, status: contratoExistente.status });
      } else {
        contrato = await base44.entities.Contrato.create({ ...payloadFinal, status: 'rascunho' });
      }

      if (data.nome && data.cpf_cnpj) {
        try {
          const dadosCliente = {
            nome: data.nome,
            cpf_cnpj: data.cpf_cnpj,
            email: data.email || '',
            telefone: data.telefone || '',
            cidade: data.cidade || '',
            estado: data.estado || '',
            vendedor_id: vendedorId,
            vendedor_nome: vendedorNome,
          };
          const existentes = await base44.entities.Cliente.filter({ cpf_cnpj: data.cpf_cnpj });
          if (existentes.length === 0) {
            const novoCliente = await base44.entities.Cliente.create({
              ...dadosCliente,
              observacao: `Cliente gerado pelo contrato ${tipo}.`,
              origem: 'nativo',
            });
            await base44.entities.Contrato.update(contrato.id, { cliente_id: novoCliente.id });
            contrato = { ...contrato, cliente_id: novoCliente.id };
            toast.success(`Cliente "${data.nome}" salvo na carteira!`);
          } else {
            await base44.entities.Cliente.update(existentes[0].id, dadosCliente);
            if (!contrato.cliente_id) {
              await base44.entities.Contrato.update(contrato.id, { cliente_id: existentes[0].id });
              contrato = { ...contrato, cliente_id: existentes[0].id };
            }
          }
        } catch (e) {}
      }
      return contrato;
    },
    onSuccess: (c) => { toast.success('Contrato salvo!'); onSaved(c); },
    onError: (err) => { toast.error('Erro ao salvar contrato: ' + (err?.message || 'Verifique os campos obrigatórios')); },
  });

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    c.cpf_cnpj?.includes(buscaCliente)
  ).slice(0, 8);

  const selecionarCliente = (c) => {
    setForm(f => ({
      ...f,
      nome: c.nome || '', cpf_cnpj: c.cpf_cnpj || '', email: c.email || '',
      telefone: c.telefone || '', cidade: c.cidade || '', estado: c.estado || '', cliente_id: c.id,
    }));
    setBuscaCliente(c.nome);
    setShowBusca(false);
    toast.success(`Cliente "${c.nome}" carregado!`);
  };

  const cor = TIPO_COLOR[tipo] || '#0f1e35';
  const gradient = TIPO_GRADIENT[tipo] || 'from-[#0f1e35] to-[#1a3150]';

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    if (['valor_total', 'valor_adesao', 'num_parcelas'].includes(k)) {
      const total = parseFloat(k === 'valor_total' ? v : updated.valor_total) || 0;
      const nParcelas = parseInt(k === 'num_parcelas' ? v : updated.num_parcelas) || 0;
      const entrada = parseFloat(k === 'valor_adesao' ? v : updated.valor_adesao) || 0;
      if (nParcelas === 0) {
        updated.valor_adesao = total > 0 ? String(total) : updated.valor_adesao;
        updated.valor_parcela = '0';
      } else {
        const restante = Math.max(0, total - entrada);
        updated.valor_parcela = restante > 0 ? String((restante / nParcelas).toFixed(2)) : '0';
      }
    }
    return updated;
  });

  const campo = (label, key, type = 'text', opts = {}) => (
    <div className="group">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">
        {label}{opts.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[key] || ''}
        onChange={e => {
          set(key, e.target.value);
          if (key === 'cep') buscarCep(e.target.value);
        }}
        required={opts.required}
        placeholder={opts.placeholder || ''}
        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] transition-all bg-white hover:border-gray-300 placeholder:text-gray-300"
      />
    </div>
  );

  const selectField = (label, key, options) => (
    <div className="group">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">{label}</label>
      <select value={form[key] || ''} onChange={e => set(key, e.target.value)}
        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] bg-white hover:border-gray-300 transition-all appearance-none cursor-pointer">
        <option value="">Selecione...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const dadosPessoaisCompletos =
    form.nome?.trim() && form.cpf_cnpj?.trim() && form.email?.trim() &&
    form.telefone?.trim() && form.nascimento && form.profissao?.trim() &&
    form.estado_civil && form.nacionalidade?.trim();

  const enderecoCompleto =
    form.endereco?.trim() && form.cidade?.trim() && form.estado?.trim() &&
    form.bairro?.trim() && form.cep?.trim();

  const abas = [
    { id: 'dados', label: 'Dados Pessoais', icon: User },
    { id: 'endereco', label: 'Endereço', icon: MapPin, bloqueada: !dadosPessoaisCompletos, motivoBloqueio: 'Preencha os dados pessoais primeiro' },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign, bloqueada: !dadosPessoaisCompletos || !enderecoCompleto, motivoBloqueio: 'Preencha os dados pessoais e o endereço primeiro' },
    { id: 'obs', label: 'Obs. & Data', icon: FileText, bloqueada: !dadosPessoaisCompletos || !enderecoCompleto, motivoBloqueio: 'Preencha os dados pessoais e o endereço primeiro' },
  ];
  const abaIdx = abas.findIndex(a => a.id === aba);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={onCancel} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Voltar para Contratos
        </button>

        {/* Header */}
        <div className={`rounded-2xl p-6 mb-5 text-white shadow-xl bg-gradient-to-br ${gradient} relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-5">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white" />
            <div className="absolute -right-4 -bottom-12 w-56 h-56 rounded-full bg-white" />
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.25em] mb-1">{contratoExistente ? 'Editando Contrato' : 'Novo Contrato'}</p>
              <h2 className="text-2xl font-bold tracking-tight">{tipo}</h2>
              {form.nome && <p className="text-sm opacity-70 mt-1">{form.nome}</p>}
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <FileText className="w-7 h-7 opacity-60" />
              </div>
            </div>
          </div>
        </div>

        {/* Banner cliente pré-selecionado */}
        {clientePreSelecionado && !contratoExistente && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
              {(clientePreSelecionado.nome || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                Cliente: <span className="font-bold">{clientePreSelecionado.nome}</span>
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">Dados preenchidos automaticamente — complete as demais abas.</p>
            </div>
          </div>
        )}

        {/* Buscar cliente */}
        <div ref={searchRef} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 relative">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <Search className="w-3 h-3" /> Buscar cliente existente na base
          </p>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={buscaCliente}
              onChange={e => { setBuscaCliente(e.target.value); setShowBusca(true); }}
              onFocus={() => buscaCliente.length >= 1 && setShowBusca(true)}
              placeholder="Digite nome ou CPF/CNPJ do cliente para pré-preencher o formulário..."
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] transition-all"
            />
            {buscaCliente && (
              <button onClick={() => { setBuscaCliente(''); setShowBusca(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {showBusca && buscaCliente.length >= 2 && (
              <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                {clientesFiltrados.length > 0 ? clientesFiltrados.map(c => (
                  <button key={c.id} type="button" onClick={() => selecionarCliente(c)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-gray-50 last:border-0 flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm" style={{ background: cor }}>
                      {(c.nome || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-[#1a3150] truncate">{c.nome}</p>
                      {c.cpf_cnpj && <p className="text-[10px] text-gray-400 font-mono">{c.cpf_cnpj}</p>}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#1a3150] ml-auto flex-shrink-0" />
                  </button>
                )) : (
                  <div className="px-4 py-4 text-center">
                    <p className="text-xs text-gray-500 font-medium">Nenhum cliente encontrado</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Preencha os campos manualmente abaixo</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card principal com abas */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Navegação de abas */}
          <div className="border-b border-gray-100">
            <div className="flex">
              {abas.map((a) => {
                const Icon = a.icon;
                const progress = calcProgress(form, a.id);
                const isActive = aba === a.id;
                const isDone = progress === 100;
                const isBloqueada = a.bloqueada;
                return (
                  <button key={a.id}
                    onClick={() => {
                      if (isBloqueada) { toast.error(a.motivoBloqueio); return; }
                      setAba(a.id);
                    }}
                    title={isBloqueada ? a.motivoBloqueio : a.label}
                    className={`flex-1 relative flex flex-col items-center gap-1 pt-3.5 pb-2.5 text-xs font-semibold transition-all border-b-2 ${
                      isBloqueada
                        ? 'border-transparent text-gray-300 cursor-not-allowed bg-gray-50/50'
                        : isActive
                          ? 'border-current text-white'
                          : isDone
                            ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                            : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                    style={isActive && !isBloqueada ? { background: cor, borderColor: cor } : {}}>
                    <div className="flex items-center gap-1.5">
                      {isBloqueada
                        ? <X className="w-3.5 h-3.5 text-gray-300" />
                        : isDone && !isActive
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          : <Icon className="w-3.5 h-3.5" />
                      }
                      <span className="hidden sm:inline">{a.label}</span>
                    </div>
                    {!isBloqueada && (
                      <div className="w-8 h-0.5 rounded-full bg-current opacity-20 overflow-hidden">
                        <div className="h-full rounded-full bg-current opacity-100 transition-all"
                          style={{ width: `${progress}%`, opacity: isActive ? 0.7 : isDone ? 1 : 0.5 }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conteúdo das abas */}
          <div className="p-6">

            {aba === 'dados' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {campo('Nome Completo / Razão Social', 'nome', 'text', { required: true })}
                  {campo('CPF / CNPJ', 'cpf_cnpj', 'text', { required: true })}
                  {campo('Responsável Legal', 'responsavel_legal')}
                  {campo('CPF do Responsável Legal', 'cpf_responsavel')}
                  {campo('Data de Nascimento', 'nascimento', 'date')}
                  {campo('Nacionalidade', 'nacionalidade')}
                  {campo('Profissão', 'profissao')}
                  {selectField('Estado Civil', 'estado_civil', ESTADOS_CIVIS)}
                  {campo('E-mail', 'email', 'email')}
                  {campo('Telefone / WhatsApp', 'telefone')}
                </div>
              </div>
            )}

            {aba === 'endereco' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="group">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">
                      CEP <span className="text-[9px] normal-case font-normal text-blue-400">(preenchimento automático)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.cep || ''}
                        onChange={e => { set('cep', e.target.value); buscarCep(e.target.value); }}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] transition-all bg-white hover:border-gray-300 pr-9"
                      />
                      {buscandoCep && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-1">
                    {campo('Endereço (Rua, Nº, Complemento)', 'endereco')}
                  </div>
                  {campo('Bairro', 'bairro')}
                  {campo('Cidade', 'cidade')}
                  {campo('Estado (UF)', 'estado', 'text', { placeholder: 'SP' })}
                </div>

                {(form.cidade || form.estado) && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                      {[form.endereco, form.bairro, form.cidade, form.estado].filter(Boolean).join(', ')}
                      {form.cep && <span className="ml-1 text-blue-400 font-mono text-xs">· CEP {form.cep}</span>}
                    </p>
                  </div>
                )}
              </div>
            )}

            {aba === 'financeiro' && (
              <div className="space-y-5">
                {/* Resumo financeiro visual */}
                {(form.valor_total || form.valor_adesao) && (
                  <div className="grid grid-cols-3 gap-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor do Contrato</p>
                      <p className="text-lg font-bold text-[#1a3150] mt-0.5">
                        {form.valor_total ? `R$ ${Number(form.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </p>
                    </div>
                    <div className="text-center border-x border-gray-200">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {tipo === 'GARANTIAS' ? 'Mensalidade' : 'Entrada'}
                      </p>
                      <p className="text-lg font-bold text-emerald-600 mt-0.5">
                        {tipo === 'GARANTIAS'
                          ? (form.mensalidade ? `R$ ${Number(form.mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—')
                          : (form.valor_adesao ? `R$ ${Number(form.valor_adesao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {tipo === 'GARANTIAS' ? 'Valor da Dívida' : 'Parcelas'}
                      </p>
                      <p className="text-base font-bold text-gray-600 mt-0.5">
                        {tipo === 'GARANTIAS'
                          ? (form.valor_divida ? `R$ ${Number(form.valor_divida).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—')
                          : (form.valor_parcela && parseInt(form.num_parcelas) > 0
                              ? `${form.num_parcelas}× R$ ${Number(form.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : parseInt(form.num_parcelas) === 0 ? 'Só entrada' : '—')}
                      </p>
                    </div>
                  </div>
                )}

                {tipo === 'GARANTIAS' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="group">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">
                        Valor do Contrato (R$) <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <input type="number" value={form.valor_total || ''} onChange={e => set('valor_total', e.target.value)}
                        placeholder="Ex: 5500,00"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] transition-all bg-white hover:border-gray-300 placeholder:text-gray-300" />
                    </div>
                    <div className="group">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">
                        Mensalidade (R$) <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <input type="number" value={form.mensalidade || ''} onChange={e => set('mensalidade', e.target.value)}
                        placeholder="Ex: 500,00"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] transition-all bg-white hover:border-gray-300 placeholder:text-gray-300" />
                    </div>
                    <div className="group">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">
                        Valor da Dívida (R$)
                      </label>
                      <input type="number" value={form.valor_divida || ''} onChange={e => set('valor_divida', e.target.value)}
                        placeholder="Ex: 50000,00"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] transition-all bg-white hover:border-gray-300 placeholder:text-gray-300" />
                    </div>
                    <div className="group">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">
                        Percentual sobre o Montante (%)
                      </label>
                      <input type="number" step="0.01" value={form.percentual_montante || ''} onChange={e => set('percentual_montante', e.target.value)}
                        placeholder="Ex: 5,00"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] transition-all bg-white hover:border-gray-300 placeholder:text-gray-300" />
                    </div>
                    {selectField('Forma de Pagamento', 'forma_pagamento', FORMAS)}
                    {campo('Data do 1º Pagamento', 'data_primeiro_pagamento', 'date')}
                    {campo('Dia de Vencimento', 'dia_vencimento', 'number', { placeholder: 'Ex: 10' })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="group">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">
                        Valor de Adesão (R$) <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <input
                        type="number"
                        value={form.valor_total || ''}
                        onChange={e => set('valor_total', e.target.value)}
                        placeholder="Valor total do contrato"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] transition-all bg-white hover:border-gray-300 placeholder:text-gray-300"
                      />
                    </div>
                    <div className="group">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">
                        Valor de Entrada (R$)
                        {parseInt(form.num_parcelas) === 0 && <span className="ml-1 text-[9px] text-emerald-500 normal-case font-normal">(igual ao total)</span>}
                      </label>
                      <input
                        type="number"
                        value={form.valor_adesao || ''}
                        onChange={e => set('valor_adesao', e.target.value)}
                        placeholder={parseInt(form.num_parcelas) === 0 ? 'Igual ao valor total' : 'Ex: 5000,00'}
                        disabled={parseInt(form.num_parcelas) === 0}
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] transition-all bg-white hover:border-gray-300 placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </div>
                    <div className="group">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">
                        Valor da Parcela (R$) <span className="text-[9px] normal-case font-normal text-blue-400">(auto)</span>
                      </label>
                      <input
                        type="number"
                        value={form.valor_parcela || ''}
                        onChange={e => setForm(f => ({ ...f, valor_parcela: e.target.value }))}
                        placeholder="Calculado automaticamente"
                        className="w-full px-3.5 py-2.5 text-sm border border-blue-200 bg-blue-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-blue-300"
                      />
                    </div>
                    <div className="group">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">Número de Parcelas</label>
                      <select value={form.num_parcelas} onChange={e => set('num_parcelas', e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] bg-white hover:border-gray-300 transition-all cursor-pointer">
                        <option value={0}>Sem parcelas (só entrada)</option>
                        {[1,2,3,4,5,6,7,8,9,10,11,12,18,24,36,48,60].map(n => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                    </div>
                    {selectField('Forma de Pagamento', 'forma_pagamento', FORMAS)}
                    {campo('Data do 1º Pagamento', 'data_primeiro_pagamento', 'date')}
                    {campo('Dia de Vencimento', 'dia_vencimento', 'number', { placeholder: 'Ex: 10' })}
                    {campo('Prazo (meses)', 'prazo_meses', 'number')}
                    {campo('Banco', 'banco')}
                    {campo('Agência', 'agencia')}
                    {campo('Conta', 'conta')}
                    {campo('Moeda', 'moeda', 'text', { placeholder: 'USD, EUR...' })}
                    {campo('Cotação (R$ por unidade)', 'cotacao', 'number', { placeholder: 'Ex: 5.7850' })}
                    {campo('Valor em Moeda Estrangeira', 'valor_em_moeda', 'number')}
                  </div>
                )}

                {/* Indicadores */}
                <div className="border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div>
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Indicadores / Espelhamento</p>
                      {indicadores.length > 0 && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-20 h-1 rounded-full bg-gray-200 overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(totalPctIndicadores / 50 * 100, 100)}%`, background: limiteIndicadoresExcedido ? '#ef4444' : totalPctIndicadores > 30 ? '#f59e0b' : '#10b981' }} />
                          </div>
                          <p className={`text-[10px] font-semibold ${limiteIndicadoresExcedido ? 'text-red-600' : totalPctIndicadores > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {totalPctIndicadores.toFixed(1)}% / 50%
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setShowNovoIndicador(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Plus className="w-3 h-3" /> Novo Indicador
                      </button>
                      <button type="button" onClick={addIndicador}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition hover:opacity-90"
                        style={{ background: cor, color: 'white' }}>
                        <Plus className="w-3 h-3" /> Adicionar
                      </button>
                    </div>
                  </div>

                  {limiteIndicadoresExcedido && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-100">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-600">O total de indicadores não pode ultrapassar 50%.</p>
                    </div>
                  )}

                  {showNovoIndicador && (
                    <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Cadastrar novo indicador</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input value={novoIndicadorNome} onChange={e => setNovoIndicadorNome(e.target.value)}
                          placeholder="Nome *" className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white" />
                        <input value={novoIndicadorEmail} onChange={e => setNovoIndicadorEmail(e.target.value)}
                          placeholder="E-mail" type="email" className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white" />
                        <input value={novoIndicadorTelefone} onChange={e => setNovoIndicadorTelefone(e.target.value)}
                          placeholder="Telefone" className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white" />
                        <div className="flex items-center gap-1">
                          <input type="number" step="0.1" min="0" max="50" value={novoIndicadorPercentual}
                            onChange={e => setNovoIndicadorPercentual(parseFloat(e.target.value) || 10)}
                            className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 text-center font-semibold bg-white" />
                          <span className="text-xs text-gray-500">% comissão padrão</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={criarNovoIndicador} disabled={salvandoNovoIndicador}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">
                          {salvandoNovoIndicador ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          {salvandoNovoIndicador ? 'Salvando...' : 'Salvar e Adicionar'}
                        </button>
                        <button type="button" onClick={() => setShowNovoIndicador(false)}
                          className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    {indicadores.length === 0 ? (
                      <div className="text-center py-5 text-gray-300">
                        <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs text-gray-400">Nenhum indicador adicionado</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {indicadores.map((ind, idx) => {
                          const termoBusca = buscaIndicador[idx] ?? ind.nome ?? '';
                          const showDrop = showDropIndicador[idx] || false;
                          const opcoesFiltradas = indicadoresDisponiveis.filter(x =>
                            termoBusca.length === 0 || x.nome.toLowerCase().includes(termoBusca.toLowerCase())
                          );
                          return (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                              <div className="flex-1 relative">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                  <input
                                    type="text"
                                    value={termoBusca}
                                    onChange={e => {
                                      setBuscaIndicador(prev => ({ ...prev, [idx]: e.target.value }));
                                      setShowDropIndicador(prev => ({ ...prev, [idx]: true }));
                                      if (!e.target.value) updateIndicador(idx, 'id', '');
                                    }}
                                    onFocus={() => setShowDropIndicador(prev => ({ ...prev, [idx]: true }))}
                                    placeholder="Buscar indicador ou vendedor..."
                                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150] bg-white"
                                  />
                                  {ind.id && (
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  )}
                                </div>
                                {showDrop && (
                                  <div className="absolute z-40 left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-44 overflow-y-auto">
                                    {opcoesFiltradas.length > 0 ? (
                                      opcoesFiltradas.map(x => (
                                        <button key={x.id} type="button"
                                          onMouseDown={() => selectIndicadorPessoa(idx, x)}
                                          className="w-full text-left px-3 py-2 hover:bg-blue-50 transition flex items-center gap-2 border-b border-gray-50 last:border-0">
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${x.tipo === 'vendedor' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {x.tipo === 'vendedor' ? 'Vend.' : 'Ind.'}
                                          </span>
                                          <span className="text-xs text-gray-800 font-medium">{x.nome}</span>
                                          <span className="ml-auto text-[10px] text-gray-400">{x.percentual_comissao}%</span>
                                        </button>
                                      ))
                                    ) : termoBusca.length >= 2 ? (
                                      <div className="px-3 py-3 text-center">
                                        <p className="text-xs text-gray-500 mb-2">Nenhum resultado para "<strong>{termoBusca}</strong>"</p>
                                        <button type="button"
                                          onMouseDown={() => {
                                            setNovoIndicadorNome(termoBusca);
                                            setShowNovoIndicador(true);
                                            setShowDropIndicador(prev => ({ ...prev, [idx]: false }));
                                          }}
                                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 mx-auto">
                                          <Plus className="w-3 h-3" /> Cadastrar "{termoBusca}" como novo indicador
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="px-3 py-2 text-xs text-gray-400">Digite para buscar...</div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <input type="number" step="0.1" min="0" max="50" value={ind.percentual}
                                  onChange={e => updateIndicador(idx, 'percentual', parseFloat(e.target.value) || 0)}
                                  className="w-14 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150] text-center font-semibold" />
                                <span className="text-xs text-gray-400 font-medium">%</span>
                              </div>
                              <button type="button" onClick={() => removeIndicador(idx)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 hover:text-red-600 transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {aba === 'obs' && (
              <div className="space-y-4">
                <div className={`grid gap-4 ${contratoExistente ? 'grid-cols-2' : 'max-w-xs'}`}>
                  {campo('Data do Contrato', 'data_contrato', 'date')}
                  {contratoExistente && (
                    <div className="group">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">
                        Tipo do Contrato
                      </label>
                      <select
                        value={form._tipoOverride || tipo}
                        onChange={e => setForm(f => ({ ...f, _tipoOverride: e.target.value }))}
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] bg-white hover:border-gray-300 transition-all appearance-none cursor-pointer"
                      >
                        {['CONTA GLOBAL','CONTA INTERNACIONAL','DOLARIZE','ROF','CANAL BANCÁRIO','OFFSHORE','GARANTIAS','HORA TÉCNICA','RATING'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {isAdmin && contratoExistente && (
                    <div className="group">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">
                        Vendedor Responsável
                      </label>
                      <select
                        value={vendedorEditId}
                        onChange={e => {
                          const v = vendedoresList.find(x => x.id === e.target.value);
                          setVendedorEditId(e.target.value);
                          setVendedorEditNome(v?.nome || '');
                        }}
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] bg-white hover:border-gray-300 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Selecione o vendedor...</option>
                        {vendedoresList.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                      </select>
                      {vendedorEditNome && (
                        <p className="text-[10px] text-emerald-600 mt-1 font-medium">✓ {vendedorEditNome}</p>
                      )}
                    </div>
                  )}
                </div>
                {tipo === 'GARANTIAS' && (
                  <div className="group">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5" style={{ color: '#be123c' }}>
                      Administração de Débitos
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border border-rose-200 rounded-xl bg-rose-50/40">
                      {['Financeiros', 'Trabalhistas', 'Previdenciários', 'Tributários', 'Outras Dívidas'].map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer group/cb">
                          <input
                            type="checkbox"
                            checked={(form.administracao_debitos || []).includes(opt)}
                            onChange={e => {
                              const current = form.administracao_debitos || [];
                              set('administracao_debitos', e.target.checked ? [...current, opt] : current.filter(x => x !== opt));
                            }}
                            className="w-4 h-4 rounded border-rose-300 text-rose-700 focus:ring-rose-400 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700 group-hover/cb:text-rose-700 transition-colors">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="group">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#1a3150] transition-colors">Observações</label>
                  <textarea
                    value={form.observacoes || ''}
                    onChange={e => set('observacoes', e.target.value)}
                    rows={6}
                    placeholder="Informações adicionais, condições especiais, notas relevantes..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] resize-none hover:border-gray-300 transition-all placeholder:text-gray-300"
                  />
                  {form.observacoes && (
                    <p className="text-[10px] text-gray-400 mt-1 text-right">{form.observacoes.length} caracteres</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer com navegação */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-2">
              {abaIdx > 0 ? (
                <button onClick={() => setAba(abas[abaIdx - 1].id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition">
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
              ) : (
                <button onClick={onCancel} className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancelar</button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {abas.map((a) => {
                const prog = calcProgress(form, a.id);
                return (
                  <button key={a.id} onClick={() => setAba(a.id)}
                    className={`transition-all rounded-full ${aba === a.id ? 'w-6 h-2' : 'w-2 h-2'} ${prog === 100 ? 'bg-emerald-400' : ''}`}
                    style={aba === a.id ? { background: cor } : prog < 100 ? { background: '#d1d5db' } : {}} />
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {abaIdx < abas.length - 1 ? (
                (() => {
                  const proxima = abas[abaIdx + 1];
                  const bloqueada = proxima.bloqueada;
                  return (
                    <button
                      onClick={() => {
                        if (bloqueada) { toast.error(proxima.motivoBloqueio); return; }
                        setAba(proxima.id);
                      }}
                      title={bloqueada ? proxima.motivoBloqueio : 'Próxima aba'}
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition ${bloqueada ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'text-white hover:opacity-90'}`}
                      style={!bloqueada ? { background: cor } : {}}>
                      Próxima <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  );
                })()
              ) : null}
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.nome || !form.cpf_cnpj}
                className="flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-40 shadow-sm"
                style={{ background: cor }}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saveMutation.isPending ? 'Salvando...' : 'Salvar Contrato'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}