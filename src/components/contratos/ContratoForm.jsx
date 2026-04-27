import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Save, Search, User, DollarSign, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = {
  nome: '', cpf_cnpj: '', responsavel_legal: '', cpf_responsavel: '',
  nascimento: '', nacionalidade: 'Brasileira', profissao: '', estado_civil: '',
  email: '', telefone: '', cep: '', endereco: '', bairro: '', cidade: '', estado: '',
  valor_adesao: '', valor_parcela: '', num_parcelas: 1, valor_total: '',
  forma_pagamento: '', data_primeiro_pagamento: '', dia_vencimento: '',
  banco: '', agencia: '', conta: '', moeda: 'USD', cotacao: '', valor_em_moeda: '',
  prazo_meses: '', observacoes: '', data_contrato: new Date().toISOString().split('T')[0],
};

const FORMAS = ['PIX', 'TED/DOC', 'DÉBITO EM CONTA', 'BOLETO', 'CARTÃO DE CRÉDITO'];
const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];

const TIPO_COLOR = {
  'CONTA GLOBAL': '#0f1e35',
  'CONTA INTERNACIONAL': '#1a3a6b',
  'DOLARIZE AQUI': '#b45309',
};

export default function ContratoForm({ tipo, user, onSaved, onCancel, contratoExistente }) {
  const [form, setForm] = useState(contratoExistente ? { ...EMPTY, ...contratoExistente } : EMPTY);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [showBusca, setShowBusca] = useState(false);
  const [aba, setAba] = useState('dados');

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-contrato'],
    queryFn: () => base44.entities.Cliente.list('nome', 5000),
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const vendedorId = user?.id || '';
      const vendedorNome = user?.nome_tratamento || user?.full_name || user?.email || '';
      const payload = {
        ...data,
        tipo,
        vendedor_id: vendedorId,
        vendedor_nome: vendedorNome,
        valor_adesao: parseFloat(data.valor_adesao) || 0,
        valor_parcela: parseFloat(data.valor_parcela) || 0,
        num_parcelas: parseInt(data.num_parcelas) || 1,
        valor_total: parseFloat(data.valor_total) || 0,
        cotacao: parseFloat(data.cotacao) || 0,
        valor_em_moeda: parseFloat(data.valor_em_moeda) || 0,
        prazo_meses: parseInt(data.prazo_meses) || 0,
        dia_vencimento: parseInt(data.dia_vencimento) || 0,
      };

      let contrato;
      if (contratoExistente) {
        contrato = await base44.entities.Contrato.update(contratoExistente.id, { ...payload, status: contratoExistente.status });
      } else {
        contrato = await base44.entities.Contrato.create({ ...payload, status: 'rascunho' });
      }

      // Salvar cliente na carteira do gerente se não existir ainda
      if (data.nome && data.cpf_cnpj && !data.cliente_id) {
        try {
          const existentes = await base44.entities.Cliente.filter({ cpf_cnpj: data.cpf_cnpj });
          if (existentes.length === 0) {
            const novoCliente = await base44.entities.Cliente.create({
              nome: data.nome,
              cpf_cnpj: data.cpf_cnpj,
              email: data.email || '',
              telefone: data.telefone || '',
              cidade: data.cidade || '',
              estado: data.estado || '',
              vendedor_id: vendedorId,
              vendedor_nome: vendedorNome,
              observacao: `Cliente gerado pelo contrato ${tipo}.`,
              origem: 'nativo',
            });
            // Atualizar o contrato com o cliente_id recém criado
            await base44.entities.Contrato.update(contrato.id, { cliente_id: novoCliente.id });
            contrato = { ...contrato, cliente_id: novoCliente.id };
            toast.success(`Cliente "${data.nome}" salvo na carteira!`);
          }
        } catch (e) {
          // Não bloquear o fluxo por falha no cadastro do cliente
        }
      }

      return contrato;
    },
    onSuccess: (c) => { toast.success('Contrato salvo!'); onSaved(c); },
  });

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    c.cpf_cnpj?.includes(buscaCliente)
  ).slice(0, 8);

  const selecionarCliente = (c) => {
    setForm(f => ({
      ...f,
      nome: c.nome || '',
      cpf_cnpj: c.cpf_cnpj || '',
      email: c.email || '',
      telefone: c.telefone || '',
      cidade: c.cidade || '',
      estado: c.estado || '',
      cliente_id: c.id,
    }));
    setBuscaCliente(c.nome);
    setShowBusca(false);
    toast.success(`Cliente "${c.nome}" carregado!`);
  };

  const cor = TIPO_COLOR[tipo] || '#0f1e35';
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const campo = (label, key, type = 'text', opts = {}) => (
    <div>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">{label}{opts.required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input
        type={type}
        value={form[key] || ''}
        onChange={e => set(key, e.target.value)}
        required={opts.required}
        placeholder={opts.placeholder || ''}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1a3150] focus:border-[#1a3150]"
      />
    </div>
  );

  const select = (label, key, options, opts = {}) => (
    <div>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">{label}</label>
      <select value={form[key] || ''} onChange={e => set(key, e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1a3150] bg-white">
        <option value="">Selecione...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const abas = [
    { id: 'dados', label: 'Dados Pessoais', icon: User },
    { id: 'endereco', label: 'Endereço', icon: MapPin },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'obs', label: 'Obs. & Data', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={onCancel} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar para Contratos
        </button>

        {/* Header */}
        <div className="rounded-2xl p-5 mb-5 text-white flex items-center justify-between shadow-lg" style={{ background: cor }}>
          <div>
            <p className="text-xs opacity-60 uppercase tracking-widest font-semibold mb-1">{contratoExistente ? 'Editando Contrato' : 'Novo Contrato'}</p>
            <h2 className="text-xl font-bold">{tipo}</h2>
          </div>
          <FileText className="w-10 h-10 opacity-20" />
        </div>

        {/* Buscar cliente */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 relative">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Buscar cliente na base</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={buscaCliente} onChange={e => { setBuscaCliente(e.target.value); setShowBusca(true); }}
                onFocus={() => setShowBusca(true)}
                placeholder="Digite nome ou CPF/CNPJ do cliente..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
              {showBusca && buscaCliente.length >= 2 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {clientesFiltrados.length > 0 ? clientesFiltrados.map(c => (
                    <button key={c.id} type="button" onClick={() => selecionarCliente(c)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition border-b border-gray-50 last:border-0">
                      <p className="text-sm font-medium text-gray-800">{c.nome}</p>
                      {c.cpf_cnpj && <p className="text-[10px] text-gray-400">{c.cpf_cnpj}</p>}
                    </button>
                  )) : (
                    <p className="px-3 py-3 text-xs text-gray-400 text-center">Nenhum cliente encontrado — preencha os campos manualmente</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {abas.map(a => {
              const Icon = a.icon;
              return (
                <button key={a.id} onClick={() => setAba(a.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition ${aba === a.id ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  style={aba === a.id ? { background: cor } : {}}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{a.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {aba === 'dados' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {campo('Nome Completo / Razão Social', 'nome', 'text', { required: true })}
                {campo('CPF / CNPJ', 'cpf_cnpj', 'text', { required: true })}
                {campo('Responsável Legal', 'responsavel_legal')}
                {campo('CPF do Responsável Legal', 'cpf_responsavel')}
                {campo('Data de Nascimento', 'nascimento', 'date')}
                {campo('Nacionalidade', 'nacionalidade')}
                {campo('Profissão', 'profissao')}
                {select('Estado Civil', 'estado_civil', ESTADOS_CIVIS)}
                {campo('E-mail', 'email', 'email')}
                {campo('Telefone / WhatsApp', 'telefone')}
              </div>
            )}

            {aba === 'endereco' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {campo('CEP', 'cep')}
                {campo('Endereço (Rua, Nº, Complemento)', 'endereco')}
                {campo('Bairro', 'bairro')}
                {campo('Cidade', 'cidade')}
                {campo('Estado (UF)', 'estado')}
              </div>
            )}

            {aba === 'financeiro' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {campo('Valor Total do Contrato (R$)', 'valor_total', 'number')}
                {campo('Valor de Adesão / Entrada (R$)', 'valor_adesao', 'number')}
                {campo('Valor da Parcela (R$)', 'valor_parcela', 'number')}
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Número de Parcelas</label>
                  <select value={form.num_parcelas} onChange={e => set('num_parcelas', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1a3150] bg-white">
                    <option value={1}>À vista (sem parcelas)</option>
                    {[2,3,4,5,6,7,8,9,10,11,12,18,24,36,48,60].map(n => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </div>
                {select('Forma de Pagamento', 'forma_pagamento', FORMAS)}
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

            {aba === 'obs' && (
              <div className="space-y-4">
                {campo('Data do Contrato', 'data_contrato', 'date')}
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Observações</label>
                  <textarea value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={5}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1a3150] resize-none" />
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex gap-1">
              {abas.map((a, i) => (
                <button key={a.id} onClick={() => setAba(a.id)}
                  className={`w-2 h-2 rounded-full transition ${aba === a.id ? 'w-4' : 'bg-gray-300 hover:bg-gray-400'}`}
                  style={aba === a.id ? { background: cor } : {}} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.nome || !form.cpf_cnpj}
                className="flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-40"
                style={{ background: cor }}>
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar Contrato'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}