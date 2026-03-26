import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, Plus, ChevronDown, ChevronRight, Phone, Mail, Calendar, X, Save, Clock, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const tipoIcons = {
  'Ligação': Phone,
  'WhatsApp': MessageSquare,
  'E-mail': Mail,
  'Reunião': Calendar,
  'Visita': Users,
  'Outro': MessageSquare,
};

const resultadoConfig = {
  'Positivo': { color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
  'Neutro': { color: 'text-blue-600 bg-blue-50', icon: MinusCircle },
  'Negativo': { color: 'text-red-600 bg-red-50', icon: XCircle },
  'Sem resposta': { color: 'text-gray-500 bg-gray-100', icon: Clock },
};

const today = () => new Date().toISOString().split('T')[0];

export default function MeusClientes() {
  const [user, setUser] = useState(null);
  const [vendedor, setVendedor] = useState(null);
  const [expandedCliente, setExpandedCliente] = useState(null);
  const [showForm, setShowForm] = useState(null); // cliente_id
  const [form, setForm] = useState({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro' });
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const vendedores = await base44.entities.Vendedor.filter({ email: u.email });
      if (vendedores.length > 0) setVendedor(vendedores[0]);
    }).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: todosVendedores = [] } = useQuery({
    queryKey: ['vendedores-crm'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: isAdmin
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-crm', vendedor?.id, isAdmin],
    queryFn: () => {
      if (isAdmin && !vendedor) return base44.entities.Cliente.list('nome');
      if (vendedor) return base44.entities.Cliente.filter({ vendedor_id: vendedor.id }, 'nome');
      return [];
    },
    enabled: !!user
  });

  const { data: interacoes = [] } = useQuery({
    queryKey: ['interacoes-crm'],
    queryFn: () => base44.entities.InteracaoCliente.list('-data_interacao'),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InteracaoCliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['interacoes-crm']);
      setShowForm(null);
      setForm({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro' });
      toast.success('Interação registrada!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InteracaoCliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['interacoes-crm']);
      toast.success('Interação removida!');
    }
  });

  const handleSave = (cliente) => {
    if (!form.descricao.trim()) { toast.error('Descreva a interação'); return; }
    createMutation.mutate({
      ...form,
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      vendedor_id: vendedor?.id || '',
      vendedor_nome: vendedor?.nome || user?.full_name || '',
    });
  };

  const clientesFiltrados = clientes.filter(c =>
    !searchTerm || c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf_cnpj?.includes(searchTerm)
  );

  const getInteracoesCliente = (clienteId) => interacoes.filter(i => i.cliente_id === clienteId);
  const getProximoContato = (clienteId) => {
    const proximas = interacoes
      .filter(i => i.cliente_id === clienteId && i.proximo_contato >= today())
      .sort((a, b) => a.proximo_contato.localeCompare(b.proximo_contato));
    return proximas[0]?.proximo_contato || null;
  };

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meus Clientes</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {vendedor ? `Carteira de ${vendedor.nome}` : isAdmin ? 'Visão administrativa' : 'Nenhum vendedor vinculado ao seu e-mail'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#1a3150]">{clientesFiltrados.length}</p>
            <p className="text-xs text-gray-400">clientes</p>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3150] bg-white"
        />

        {/* Lista de clientes */}
        <div className="space-y-2">
          {clientesFiltrados.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Nenhum cliente encontrado</p>
            </div>
          )}

          {clientesFiltrados.map(cliente => {
            const interacoesCliente = getInteracoesCliente(cliente.id);
            const proximoContato = getProximoContato(cliente.id);
            const isExpanded = expandedCliente === cliente.id;
            const isFormOpen = showForm === cliente.id;

            return (
              <div key={cliente.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Card header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition"
                  onClick={() => setExpandedCliente(isExpanded ? null : cliente.id)}
                >
                  <div className="w-9 h-9 rounded-full bg-[#0f1e35] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(cliente.nome || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{cliente.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{cliente.cpf_cnpj || cliente.email || cliente.telefone || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {proximoContato && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 font-medium px-2 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(proximoContato), 'dd/MM')}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{interacoesCliente.length} interação{interacoesCliente.length !== 1 ? 'ões' : ''}</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                    {/* Botão nova interação */}
                    {!isFormOpen && (
                      <Button
                        size="sm"
                        onClick={() => setShowForm(cliente.id)}
                        className="bg-[#0f1e35] hover:bg-[#1a3150] text-white"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Interação
                      </Button>
                    )}

                    {/* Formulário */}
                    {isFormOpen && (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Registrar Interação</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                            <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                              {['Ligação','WhatsApp','E-mail','Reunião','Visita','Outro'].map(t => <option key={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Resultado</label>
                            <select value={form.resultado} onChange={e => setForm(p => ({ ...p, resultado: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                              {['Positivo','Neutro','Negativo','Sem resposta'].map(r => <option key={r}>{r}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Data</label>
                            <input type="date" value={form.data_interacao} onChange={e => setForm(p => ({ ...p, data_interacao: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Próximo contato</label>
                            <input type="date" value={form.proximo_contato} onChange={e => setForm(p => ({ ...p, proximo_contato: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Descrição *</label>
                          <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                            rows={3} placeholder="Descreva o que foi tratado..."
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150] resize-none" />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSave(cliente)} disabled={createMutation.isPending} className="bg-[#0f1e35] hover:bg-[#1a3150]">
                            <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowForm(null)}>
                            <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Histórico de interações */}
                    {interacoesCliente.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Histórico</p>
                        {interacoesCliente.map(inter => {
                          const Icon = tipoIcons[inter.tipo] || MessageSquare;
                          const res = resultadoConfig[inter.resultado] || resultadoConfig['Neutro'];
                          const ResIcon = res.icon;
                          return (
                            <div key={inter.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                              <div className="p-1.5 bg-white rounded-lg border border-gray-200 flex-shrink-0 h-fit">
                                <Icon className="w-4 h-4 text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <span className="text-xs font-semibold text-gray-700">{inter.tipo}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${res.color}`}>
                                    <ResIcon className="w-2.5 h-2.5" />{inter.resultado}
                                  </span>
                                  <span className="text-[10px] text-gray-400 ml-auto">{inter.data_interacao ? format(parseISO(inter.data_interacao), 'dd/MM/yyyy') : ''}</span>
                                </div>
                                <p className="text-xs text-gray-600">{inter.descricao}</p>
                                {inter.proximo_contato && (
                                  <p className="text-[10px] text-blue-500 mt-1 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    Próximo contato: {format(parseISO(inter.proximo_contato), 'dd/MM/yyyy')}
                                  </p>
                                )}
                              </div>
                              <button onClick={() => { if (confirm('Remover interação?')) deleteMutation.mutate(inter.id); }}
                                className="text-gray-200 hover:text-red-400 transition flex-shrink-0">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Nenhuma interação registrada ainda.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}