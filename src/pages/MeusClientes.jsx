import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getImpersonatedVendedor } from '@/lib/impersonation';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import AgendaCalendario from '@/components/leads/AgendaCalendario';
import { isDiaUtil, mensagemNaoDiaUtil } from '@/lib/diaUtil';
import ClienteInteracaoModal from '@/components/leads/ClienteInteracaoModal';
import { Users, MessageSquare, Plus, ChevronDown, ChevronRight, Phone, Mail, Calendar, X, Save, Clock, CheckCircle2, XCircle, MinusCircle, Star, Filter, Trash2, Edit2, AlertTriangle, Eye, EyeOff, FolderInput, Video, Copy, Link2 } from 'lucide-react';
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
  const [form, setForm] = useState({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro', produtos: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('todos');
  const [filtroSubcarteira, setFiltroSubcarteira] = useState('todas');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showTrocarGerenteModal, setShowTrocarGerenteModal] = useState(false);
  const [novoGerenteId, setNovoGerenteId] = useState('');
  const [deduplicando, setDeduplicando] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(null);
  const [editClienteForm, setEditClienteForm] = useState({});
  const [cadastroClienteForm, setCadastroClienteForm] = useState({});
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [editandoInteracao, setEditandoInteracao] = useState(null);
  const [editInteracaoForm, setEditInteracaoForm] = useState({});
  const [salvandoInteracao, setSalvandoInteracao] = useState(false);
  const [salvandoBulk, setSalvandoBulk] = useState(false);
  const [vendedoresSelecionados, setVendedoresSelecionados] = useState([]);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [showNovoLeadModal, setShowNovoLeadModal] = useState(false);
  const [novoLeadForm, setNovoLeadForm] = useState({ nome: '', cpf_cnpj: '', telefone: '', email: '', subcarteira: '' });
  const [meetForm, setMeetForm] = useState({ horario: '', gerarMeet: false, link: '', loading: false });
  const [clienteModalId, setClienteModalId] = useState(null);
  const [criandoLead, setCriandoLead] = useState(false);
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownAberto(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const queryClient = useQueryClient();
  const hoje = new Date().toISOString().split('T')[0];

  // Sincronizar agenda ao entrar na página
  const sincronizarAgenda = async () => {
    try {
      const vendId = vendedor?.id;
      if (!vendId) return;
      
      // Buscar todas as interações do vendedor com próximo_contato definido
      const interacoes = await base44.entities.InteracaoCliente.filter({ vendedor_id: vendId }, '-data_interacao');
      const hoje = new Date().toISOString().split('T')[0];
      
      // Agendar novos contatos a partir do próximo_contato das interações
      const agendas = await base44.entities.AgendaContato.filter({ vendedor_id: vendId });
      const agendaMap = new Set(agendas.map(a => `${a.lead_id}-${a.data_agendada}`));
      
      for (const inter of interacoes) {
        if (inter.proximo_contato && inter.proximo_contato >= hoje) {
          const key = `${inter.cliente_id}-${inter.proximo_contato}`;
          if (!agendaMap.has(key)) {
            // Criar agenda se não existir
            await base44.entities.AgendaContato.create({
              lead_id: inter.cliente_id,
              lead_nome: inter.cliente_nome,
              lead_cpf_cnpj: inter.cliente_nome || '',
              lead_telefone: '',
              cliente_id: '',
              vendedor_id: vendId,
              vendedor_nome: inter.vendedor_nome,
              data_agendada: inter.proximo_contato,
              posicao_dia: 0,
              lote_id: '',
              status: 'pendente',
              resultado: ''
            });
          }
        }
      }
      
      queryClient.invalidateQueries(['agenda-contatos']);
    } catch (e) {
      console.error('Erro ao sincronizar agenda:', e);
    }
  };

  React.useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const isAdm = u.role === 'admin' || u.permissao_admin === true;
      // Verificar impersonação (admin espelhando vendedor)
      const impersonado = isAdm ? getImpersonatedVendedor() : null;
      if (impersonado) {
        setVendedor(impersonado);
        setTimeout(() => sincronizarAgenda(), 500);
      } else {
        const vendedores = await base44.entities.Vendedor.filter({ email: u.email });
        if (vendedores.length > 0) {
          setVendedor(vendedores[0]);
          setTimeout(() => sincronizarAgenda(), 500);
        }
      }
    }).catch(() => {});

    const handleChange = async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!u) return;
      const isAdm = u.role === 'admin' || u.permissao_admin === true;
      const impersonado = isAdm ? getImpersonatedVendedor() : null;
      if (impersonado) {
        setVendedor(impersonado);
      } else {
        const vendedores = await base44.entities.Vendedor.filter({ email: u.email });
        setVendedor(vendedores[0] || null);
      }
    };
    window.addEventListener('impersonation-change', handleChange);
    return () => window.removeEventListener('impersonation-change', handleChange);
  }, []);

  const isAdmin = (user?.role === 'admin' || user?.permissao_admin === true) && !getImpersonatedVendedor();

  const { data: todosVendedores = [] } = useQuery({
    queryKey: ['vendedores-crm'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: isAdmin
  });

  // Para admin: busca todos e filtra client-side; para usuário normal: filtra pelo vendedor
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-crm', isAdmin ? 'admin' : vendedor?.id],
    queryFn: () => {
      if (isAdmin) return base44.entities.Cliente.list('nome', 10000);
      if (vendedor) return base44.entities.Cliente.filter({ vendedor_id: vendedor.id }, 'nome', 10000);
      return [];
    },
    enabled: !!user && (isAdmin || !!vendedor)
  });

  // Vendedores selecionados no dropdown (vazio = todos)
  const clientesFiltradosPorVendedor = isAdmin && vendedoresSelecionados.length > 0
    ? clientes.filter(c => vendedoresSelecionados.includes(c.vendedor_id))
    : clientes;

  const { data: interacoes = [] } = useQuery({
    queryKey: ['interacoes-crm'],
    queryFn: () => base44.entities.InteracaoCliente.list('-data_interacao'),
    enabled: !!user
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-crm'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }, 'nome'),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InteracaoCliente.create(data),
    onSuccess: async (_, variables) => {
      const todayStr = new Date().toISOString().split('T')[0];

      if (variables.cliente_id) {
        const agendas = await base44.entities.AgendaContato.filter({ lead_id: variables.cliente_id });
        const futurasPendentes = agendas.filter(a => a.status === 'pendente' && a.data_agendada >= todayStr);

        if (variables.resultado === 'Negativo') {
          // Resultado negativo: remover TODAS as agendas futuras
          for (const a of futurasPendentes) await base44.entities.AgendaContato.delete(a.id);
        } else if (variables.proximo_contato) {
          // Remover apenas as que NÃO são a data do próximo contato (evitar duplicatas)
          const parasRemover = futurasPendentes.filter(a => a.data_agendada !== variables.proximo_contato);
          for (const a of parasRemover) await base44.entities.AgendaContato.delete(a.id);

          // Criar agenda para o próximo contato se ainda não existir
          const jaExiste = futurasPendentes.some(a => a.data_agendada === variables.proximo_contato);
          if (!jaExiste) {
            const cliente = clientes.find(c => c.id === variables.cliente_id);
            await base44.entities.AgendaContato.create({
              lead_id: variables.cliente_id,
              lead_nome: variables.cliente_nome || '',
              lead_cpf_cnpj: cliente?.cpf_cnpj || '',
              lead_telefone: cliente?.telefone || '',
              cliente_id: variables.cliente_id,
              vendedor_id: variables.vendedor_id || '',
              vendedor_nome: variables.vendedor_nome || '',
              data_agendada: variables.proximo_contato,
              posicao_dia: 0,
              lote_id: '',
              status: 'pendente',
              resultado: ''
            });
          }
        }
      }

      queryClient.invalidateQueries(['agenda-contatos']);
      queryClient.invalidateQueries(['interacoes-crm']);
      setShowForm(null);
      setForm({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro', produtos: [] });
      const msg = variables.resultado === 'Negativo'
        ? 'Interação registrada! Agenda futura removida.'
        : variables.proximo_contato
          ? `Interação registrada! Próximo contato agendado para ${variables.proximo_contato.split('-').reverse().join('/')}.`
          : 'Interação registrada!';
      toast.success(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InteracaoCliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['interacoes-crm']);
      toast.success('Interação removida!');
    }
  });

  const updateInteracaoMutation = useMutation({
    mutationFn: (data) => base44.entities.InteracaoCliente.update(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['interacoes-crm']);
      setEditandoInteracao(null);
      toast.success('Interação atualizada!');
    },
    onError: () => {
      toast.error('Erro ao atualizar interação');
    }
  });

  const converterLeadMutation = useMutation({
    mutationFn: async (cliente) => {
      await base44.entities.Cliente.update(cliente.id, { origem: 'lead_convertido' });
      if (cliente.lead_id) {
        await base44.entities.Lead.update(cliente.lead_id, { convertido: true, convertido_em: new Date().toISOString() });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes-crm']);
      toast.success('Lead convertido em cliente cativo!');
    }
  });

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === clientesFiltrados.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clientesFiltrados.map(c => c.id)));
    }
  };

  const handleTrocarGerente = async () => {
    if (!novoGerenteId) return;
    const gerenteNovo = todosVendedores.find(v => v.id === novoGerenteId);
    if (!gerenteNovo) return;
    setSalvandoBulk(true);
    try {
      const selecionados = clientesFiltrados.filter(c => selectedIds.has(c.id));
      for (const c of selecionados) {
        await base44.entities.Cliente.update(c.id, { vendedor_id: gerenteNovo.id, vendedor_nome: gerenteNovo.nome });
        if (c.lead_id) {
          await base44.entities.Lead.update(c.lead_id, { vendedor_id: gerenteNovo.id, vendedor_nome: gerenteNovo.nome });
        }
      }
      queryClient.invalidateQueries(['clientes-crm']);
      toast.success(`${selecionados.length} registro(s) transferido(s) para ${gerenteNovo.nome}!`);
      setSelectedIds(new Set());
      setShowTrocarGerenteModal(false);
      setNovoGerenteId('');
    } catch (e) { toast.error('Erro ao trocar gerente'); }
    setSalvandoBulk(false);
  };

  const handleDevolverLeads = async () => {
    const selecionados = clientesFiltrados.filter(c => selectedIds.has(c.id) && c.origem === 'lead');
    if (selecionados.length === 0) { toast.error('Selecione ao menos um lead para devolver'); return; }
    if (!confirm(`Devolver ${selecionados.length} lead(s) para "Não Distribuídos"? Eles serão removidos da carteira atual.`)) return;
    setSalvandoBulk(true);
    try {
      for (const c of selecionados) {
        await base44.entities.Cliente.update(c.id, { vendedor_id: '', vendedor_nome: '' });
        if (c.lead_id) {
          await base44.entities.Lead.update(c.lead_id, { status: 'pendente', vendedor_id: '', vendedor_nome: '' });
        }
      }
      queryClient.invalidateQueries(['clientes-crm']);
      toast.success(`${selecionados.length} lead(s) devolvido(s) com sucesso!`);
      setSelectedIds(new Set());
    } catch (e) { toast.error('Erro ao devolver leads'); }
    setSalvandoBulk(false);
  };

  const handleExcluirSelecionados = async () => {
    const selecionados = clientesFiltrados.filter(c => selectedIds.has(c.id));
    if (selecionados.length === 0) return;
    if (!confirm(`Excluir permanentemente ${selecionados.length} registro(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    setSalvandoBulk(true);
    try {
      for (const c of selecionados) {
        // Excluir interações do cliente
        const ints = interacoes.filter(i => i.cliente_id === c.id);
        for (const i of ints) await base44.entities.InteracaoCliente.delete(i.id);
        // Excluir cliente
        await base44.entities.Cliente.delete(c.id);
        // Se era lead, excluir o Lead também
        if (c.lead_id) {
          await base44.entities.Lead.delete(c.lead_id);
        }
      }
      queryClient.invalidateQueries(['clientes-crm']);
      queryClient.invalidateQueries(['interacoes-crm']);
      toast.success(`${selecionados.length} registro(s) excluído(s)!`);
      setSelectedIds(new Set());
    } catch (e) { toast.error('Erro ao excluir registros'); }
    setSalvandoBulk(false);
  };

  const abrirEdicaoCliente = (cliente, e) => {
    e.stopPropagation();
    setEditandoCliente(cliente);
    setEditClienteForm({
      nome: cliente.nome || '',
      cpf_cnpj: cliente.cpf_cnpj || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      observacao: cliente.observacao || '',
      subcarteira: cliente.subcarteira || '',
    });
  };

  const subcarteirasDisponiveis = [...new Set(clientesFiltradosPorVendedor.map(c => c.subcarteira).filter(Boolean))].sort();

  const excluirCliente = async (cliente) => {
    if (!confirm(`Excluir permanentemente "${cliente.nome}"? Esta ação não pode ser desfeita.`)) return;
    setSalvandoCliente(true);
    try {
      const ints = interacoes.filter(i => i.cliente_id === cliente.id);
      for (const i of ints) await base44.entities.InteracaoCliente.delete(i.id);
      await base44.entities.Cliente.delete(cliente.id);
      if (cliente.lead_id) await base44.entities.Lead.delete(cliente.lead_id);
      queryClient.invalidateQueries(['clientes-crm']);
      queryClient.invalidateQueries(['interacoes-crm']);
      toast.success('Cliente excluído!');
      setEditandoCliente(null);
    } catch (e) { toast.error('Erro ao excluir cliente'); }
    setSalvandoCliente(false);
  };

  const executarDeduplicacao = async () => {
    if (!confirm('Isso vai remover leads duplicados (sem nenhuma interação registrada), mantendo apenas um por CPF/CNPJ ou nome. Continuar?')) return;
    setDeduplicando(true);
    try {
      const res = await base44.functions.invoke('deduplicarLeads', {});
      const { excluidos, grupos_com_duplicatas } = res.data;
      toast.success(`${excluidos} lead(s) duplicado(s) removido(s) de ${grupos_com_duplicatas} grupo(s)!`);
      queryClient.invalidateQueries(['clientes-crm']);
    } catch (e) {
      toast.error('Erro ao deduplicar: ' + (e.response?.data?.error || e.message));
    }
    setDeduplicando(false);
  };

  const salvarEdicaoCliente = async () => {
    if (!editClienteForm.nome?.trim()) { toast.error('Nome é obrigatório'); return; }
    setSalvandoCliente(true);
    await base44.entities.Cliente.update(editandoCliente.id, editClienteForm);
    queryClient.invalidateQueries(['clientes-crm']);
    toast.success('Cadastro atualizado!');
    setEditandoCliente(null);
    setSalvandoCliente(false);
  };

  const criarNovoLead = async () => {
    if (!novoLeadForm.nome?.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setCriandoLead(true);
    try {
      const novoLead = await base44.entities.Cliente.create({
        nome: novoLeadForm.nome.trim(),
        cpf_cnpj: novoLeadForm.cpf_cnpj?.trim() || '',
        telefone: novoLeadForm.telefone?.trim() || '',
        email: novoLeadForm.email?.trim() || '',
        vendedor_id: vendedor?.id || '',
        vendedor_nome: vendedor?.nome || '',
        origem: 'nativo',
        subcarteira: novoLeadForm.subcarteira?.trim() || undefined,
      });
      toast.success('Lead criado com sucesso!');
      setShowNovoLeadModal(false);
      setNovoLeadForm({ nome: '', cpf_cnpj: '', telefone: '', email: '', subcarteira: '' });
      queryClient.invalidateQueries(['clientes-crm']);
      // Expandir o novo cliente e abrir formulário de nova interação
      setTimeout(() => {
        setExpandedCliente(novoLead.id);
        setCadastroClienteForm({
          nome: novoLead.nome,
          cpf_cnpj: novoLead.cpf_cnpj || '',
          telefone: novoLead.telefone || '',
          email: novoLead.email || '',
          cidade: novoLead.cidade || '',
          estado: novoLead.estado || ''
        });
        setForm({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro', produtos: [] });
        setShowForm(novoLead.id);
      }, 300);
    } catch (e) {
      toast.error('Erro ao criar lead');
    }
    setCriandoLead(false);
  };

  const gerarMeetLink = async (cliente) => {
    setMeetForm(p => ({ ...p, loading: true }));
    try {
      const CONNECTOR_ID = '69fb7ca02a88fc78b9e7694f';
      const res = await base44.functions.invoke('criarMeetAgenda', {
        agenda_id: cliente.id,
        lead_nome: cadastroClienteForm.nome || cliente.nome,
        data_agendada: form.proximo_contato || form.data_interacao,
        horario_inicio: meetForm.horario || '09:00',
      });
      setMeetForm(p => ({ ...p, link: res.data.meet_link, loading: false }));
      toast.success('Link Meet gerado!');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || '';
      if (msg.toLowerCase().includes('connection') || msg.toLowerCase().includes('no active')) {
        const url = await base44.connectors.connectAppUser('69fb7ca02a88fc78b9e7694f');
        window.open(url, '_blank');
        toast.info('Conecte sua conta Google e tente novamente');
      } else {
        toast.error('Erro ao gerar Meet: ' + msg);
      }
      setMeetForm(p => ({ ...p, loading: false }));
    }
  };

  const handleSave = async (cliente) => {
    if (!form.descricao.trim()) { toast.error('Descreva a interação'); return; }
    if (!cadastroClienteForm.nome?.trim() || !cadastroClienteForm.cpf_cnpj?.trim() || !cadastroClienteForm.telefone?.trim() || !cadastroClienteForm.email?.trim()) {
      toast.error('Preencha todos os campos obrigatórios do cadastro: Nome, CPF/CNPJ, Telefone e E-mail');
      return;
    }
    if (form.proximo_contato && !isDiaUtil(form.proximo_contato)) {
      const aviso = mensagemNaoDiaUtil(form.proximo_contato);
      toast.error(`Próximo contato inválido: ${aviso}`);
      return;
    }
    
    // Atualizar cadastro do cliente com os dados preenchidos
    try {
      await base44.entities.Cliente.update(cliente.id, {
        nome: cadastroClienteForm.nome.trim(),
        cpf_cnpj: cadastroClienteForm.cpf_cnpj.trim(),
        telefone: cadastroClienteForm.telefone.trim(),
        email: cadastroClienteForm.email.trim(),
        cidade: cadastroClienteForm.cidade?.trim() || cliente.cidade || '',
        estado: cadastroClienteForm.estado?.trim() || cliente.estado || '',
      });
    } catch (e) {
      console.error('Erro ao atualizar cadastro:', e);
    }
    
    // Criar interação
    createMutation.mutate({
      ...form,
      cliente_id: cliente.id,
      cliente_nome: cadastroClienteForm.nome.trim(),
      vendedor_id: vendedor?.id || '',
      vendedor_nome: vendedor?.nome || user?.full_name || '',
      produtos_negociados: form.produtos.length > 0 ? form.produtos.join(', ') : ''
    });
  };

  const abrirNovaInteracao = (cliente) => {
    // Pré-popular formulário com dados do cliente
    setCadastroClienteForm({
      nome: cliente.nome || '',
      cpf_cnpj: cliente.cpf_cnpj || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
    });
    setForm({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro', produtos: [] });
    setShowForm(cliente.id);
  };

  const getInteracoesCliente = (clienteId) => {
    return interacoes.filter(i => i.cliente_id === clienteId).sort((a, b) => b.data_interacao.localeCompare(a.data_interacao));
  };

  const getProximoContato = (clienteId) => {
    const proximas = interacoes
      .filter(i => i.cliente_id === clienteId && i.proximo_contato >= today())
      .sort((a, b) => a.proximo_contato.localeCompare(b.proximo_contato));
    return proximas[0]?.proximo_contato || null;
  };

  const totalLeads = clientesFiltradosPorVendedor.filter(c => c.origem === 'lead').length;
  const totalClientes = clientesFiltradosPorVendedor.filter(c => c.origem !== 'lead').length;

  const clientesFiltrados = clientesFiltradosPorVendedor.filter(c => {
    const matchSearch = !searchTerm || c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf_cnpj?.includes(searchTerm);
    const matchOrigem =
      filtroOrigem === 'todos' ||
      (filtroOrigem === 'clientes' && (c.origem === 'nativo' || c.origem === 'lead_convertido' || !c.origem)) ||
      (filtroOrigem === 'leads' && c.origem === 'lead');
    const matchSubcarteira = filtroSubcarteira === 'todas' || c.subcarteira === filtroSubcarteira;
    return matchSearch && matchOrigem && matchSubcarteira;
  });

  const vendedorParaAgenda = isAdmin
    ? (vendedoresSelecionados.length === 1 ? todosVendedores.find(v => v.id === vendedoresSelecionados[0]) : null)
    : vendedor;

  const handleEditarInteracao = (interacao, e) => {
    e.stopPropagation();
    const podEditar = isAdmin || interacao.vendedor_id === vendedor?.id || interacao.created_by === user?.email;
    if (!podEditar) {
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

  const salvarEdicaoInteracao = async () => {
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
            <h1 className="text-2xl font-bold text-gray-900">Agenda do Dia</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isAdmin
                ? vendedoresSelecionados.length === 0
                  ? 'Carteira Geral — todos os vendedores'
                  : vendedoresSelecionados.length === 1
                    ? `Carteira de ${todosVendedores.find(v => v.id === vendedoresSelecionados[0])?.nome || ''}`
                    : `${vendedoresSelecionados.length} vendedores selecionados`
                : vendedor ? `Carteira de ${vendedor.nome}` : 'Nenhum vendedor vinculado ao seu e-mail'
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button variant="outline" onClick={executarDeduplicacao} disabled={deduplicando}
                className="border-amber-200 text-amber-700 hover:bg-amber-50 text-xs h-8 px-3">
                {deduplicando
                  ? <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-1.5" />
                  : <Users className="w-3.5 h-3.5 mr-1.5" />}
                Remover Duplicados
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-[#1a3150]">{clientesFiltrados.length}</p>
                <p className="text-xs text-gray-400">clientes</p>
              </div>
              <button
                onClick={() => setMostrarClientes(p => !p)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${
                  mostrarClientes
                    ? 'bg-[#0f1e35] text-white border-[#0f1e35]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#0f1e35] hover:text-[#0f1e35]'
                }`}
              >
                {mostrarClientes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {mostrarClientes ? 'Ocultar' : 'Exibir Clientes'}
              </button>
            </div>
          </div>
        </div>

        {/* Seletor de vendedores + Botão Novo Lead */}
        <div className="flex items-end gap-3">
          {isAdmin && (
            <div className="relative flex-1" ref={dropdownRef}>
              <button
                onClick={() => setDropdownAberto(p => !p)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-[#1a3150] transition shadow-sm w-full"
              >
                <Filter className="w-4 h-4 text-gray-400" />
                {vendedoresSelecionados.length === 0
                  ? 'Todos os vendedores (Carteira Geral)'
                  : `${vendedoresSelecionados.length} vendedor${vendedoresSelecionados.length > 1 ? 'es' : ''} selecionado${vendedoresSelecionados.length > 1 ? 's' : ''}`
                }
                <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${dropdownAberto ? 'rotate-180' : ''}`} />
              </button>

              {dropdownAberto && (
                <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-2xl shadow-lg p-3 min-w-64">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filtrar por vendedor</span>
                    {vendedoresSelecionados.length > 0 && (
                      <button onClick={() => { setVendedoresSelecionados([]); setSearchTerm(''); setExpandedCliente(null); }} className="text-xs text-blue-600 hover:underline">Limpar</button>
                    )}
                  </div>
                  <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={vendedoresSelecionados.length === 0}
                      onChange={() => { setVendedoresSelecionados([]); setExpandedCliente(null); }}
                      className="w-4 h-4 accent-[#1a3150]"
                    />
                    <span className="font-medium text-gray-700">Todos (Carteira Geral)</span>
                  </label>
                  <div className="my-1 border-t border-gray-100" />
                  {todosVendedores.map(v => (
                    <label key={v.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={vendedoresSelecionados.includes(v.id)}
                        onChange={() => {
                          setVendedoresSelecionados(prev =>
                            prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]
                          );
                          setExpandedCliente(null);
                          setSearchTerm('');
                        }}
                        className="w-4 h-4 accent-[#1a3150]"
                      />
                      <span className="text-gray-700">{v.nome}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {(isAdmin || vendedor) && (
            <Button
              onClick={() => setShowNovoLeadModal(true)}
              className="bg-[#0f1e35] hover:bg-[#1a3150] text-white gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Lead/Prospect
            </Button>
          )}
        </div>

        {/* Agenda de contatos (leads) */}
        {(isAdmin || vendedorParaAgenda) && (
          <AgendaCalendario
            vendedorId={vendedorParaAgenda?.id || ''}
            vendedor={vendedorParaAgenda}
            user={user}
            isAdmin={isAdmin}
            todosVendedores={todosVendedores}
            clientes={clientes}
            onClienteClick={(leadId) => {
              setClienteModalId(leadId);
            }}
          />
        )}

        {/* Barra de ações em lote */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-[#0f1e35] text-white px-4 py-3 rounded-2xl shadow-lg flex-wrap">
            <span className="text-sm font-semibold mr-auto">{selectedIds.size} selecionado(s)</span>
            {isAdmin && (
              <>
                <button onClick={() => setShowTrocarGerenteModal(true)} disabled={salvandoBulk}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-medium transition">
                  <Users className="w-3.5 h-3.5" /> Trocar Gerente
                </button>
                <button onClick={handleExcluirSelecionados} disabled={salvandoBulk}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-xs font-medium transition">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </>
            )}
            <button onClick={handleDevolverLeads} disabled={salvandoBulk}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/80 hover:bg-amber-500 rounded-lg text-xs font-medium transition">
              Devolver Leads Não Convertidos
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition">Cancelar</button>
          </div>
        )}



        {/* Filtro Clientes / Leads + Busca */}
        {(isAdmin || vendedor) && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              {[
                { key: 'todos', label: `Todos (${clientesFiltradosPorVendedor.length})` },
                { key: 'clientes', label: `✅ Clientes (${totalClientes})` },
                { key: 'leads', label: `🎯 Leads (${totalLeads})` },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFiltroOrigem(opt.key)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filtroOrigem === opt.key ? 'bg-[#0f1e35] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {subcarteirasDisponiveis.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">Subcarteira:</span>
              <button
                onClick={() => setFiltroSubcarteira('todas')}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                  filtroSubcarteira === 'todas' ? 'bg-[#0f1e35] text-white border-[#0f1e35]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}
              >
                Todas
              </button>
              {subcarteirasDisponiveis.map(sc => (
                <button
                  key={sc}
                  onClick={() => setFiltroSubcarteira(filtroSubcarteira === sc ? 'todas' : sc)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    filtroSubcarteira === sc ? 'bg-[#1a3150] text-white border-[#1a3150]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  📁 {sc}
                </button>
              ))}
            </div>
          )}
          <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3150] bg-white"
            />
          </div>
        )}

        {/* Lista de clientes */}
        {!mostrarClientes ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 text-center">
            <Eye className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-sm">Clientes ocultos por privacidade</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">Clique em "Exibir Clientes" para visualizar a lista</p>
            <button
              onClick={() => setMostrarClientes(true)}
              className="px-5 py-2 bg-[#0f1e35] text-white text-sm font-medium rounded-xl hover:bg-[#1a3150] transition"
            >
              Exibir Clientes
            </button>
          </div>
        ) : (
        <div className="space-y-2">
          {clientesFiltrados.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <input type="checkbox"
                checked={selectedIds.size === clientesFiltrados.length && clientesFiltrados.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 accent-[#1a3150] cursor-pointer"
              />
              <span className="text-xs text-gray-400">Selecionar todos ({clientesFiltrados.length})</span>
            </div>
          )}
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
            const isLead = cliente.origem === 'lead';

            return (
              <div key={cliente.id} id={`cliente-${cliente.id}`} className={`group bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${
                selectedIds.has(cliente.id)
                  ? 'border-[#1a3150]/40 ring-1 ring-[#1a3150]/20'
                  : isLead
                    ? 'border-amber-100 hover:border-amber-300 hover:shadow-md hover:bg-amber-50/30'
                    : 'border-gray-100 hover:border-blue-200 hover:shadow-md hover:bg-blue-50/20'
              }`}>
                {/* Card header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer transition"
                  onClick={() => setExpandedCliente(isExpanded ? null : cliente.id)}
                >
                  <input type="checkbox" checked={selectedIds.has(cliente.id)}
                    onChange={e => toggleSelect(cliente.id, e)} onClick={e => e.stopPropagation()}
                    className="w-4 h-4 accent-[#1a3150] cursor-pointer flex-shrink-0" />
                  <div className="w-9 h-9 rounded-full bg-[#0f1e35] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(cliente.nome || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{cliente.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{cliente.cpf_cnpj || cliente.email || cliente.telefone || '—'}</p>
                    {cliente.vendedor_nome && (
                      <p className="text-[10px] text-blue-600 font-medium mt-0.5">Gerente: {cliente.vendedor_nome}</p>
                    )}
                    {cliente.origem === 'lead' && cliente.created_date && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Importado em {format(new Date(cliente.created_date), 'dd/MM/yyyy')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={(e) => abrirEdicaoCliente(cliente, e)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#1a3150] transition"
                      title="Editar cadastro"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {cliente.subcarteira && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">📁 {cliente.subcarteira}</span>
                    )}
                    {cliente.origem === 'lead' && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">🎯 Lead</span>
                    )}
                    {cliente.origem === 'lead_convertido' && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-2.5 h-2.5" /> Convertido
                      </span>
                    )}
                    {proximoContato && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 font-medium px-2 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />{format(parseISO(proximoContato), 'dd/MM')}
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
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => abrirNovaInteracao(cliente)} className="bg-[#0f1e35] hover:bg-[#1a3150] text-white">
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Interação
                      </Button>
                      {cliente.origem === 'lead' && (
                        <Button size="sm" variant="outline" onClick={() => {
                          if (!cliente.cpf_cnpj?.trim() || !cliente.telefone?.trim() || !cliente.nome?.trim()) {
                            toast.error('Cadastro incompleto. Preencha nome, CPF/CNPJ e telefone antes de converter.');
                            return;
                          }
                          if (confirm(`Converter ${cliente.nome} em cliente cativo?`)) converterLeadMutation.mutate(cliente);
                        }} disabled={converterLeadMutation.isPending} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                          <Star className="w-3.5 h-3.5 mr-1.5" /> Converter em Cliente
                        </Button>
                      )}
                    </div>

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
                              <button onClick={(e) => handleEditarInteracao(inter, e)} className="text-gray-200 hover:text-[#1a3150] transition flex-shrink-0" title="Editar interação">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
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
        )}
      </div>

      {/* Modal Edição de Cliente */}
      {editandoCliente && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Editar Cadastro</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editandoCliente.origem === 'lead' ? '🎯 Lead' : '✅ Cliente'}</p>
              </div>
              <button onClick={() => setEditandoCliente(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-3">
              {[{ key: 'nome', label: 'Nome *', placeholder: 'Nome completo' }, { key: 'cpf_cnpj', label: 'CPF / CNPJ', placeholder: '000.000.000-00' }, { key: 'telefone', label: 'Telefone', placeholder: '(11) 99999-9999' }, { key: 'email', label: 'E-mail', placeholder: 'email@exemplo.com' }, { key: 'cidade', label: 'Cidade', placeholder: 'São Paulo' }, { key: 'estado', label: 'Estado (UF)', placeholder: 'SP' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                  <input
                    type="text"
                    value={editClienteForm[f.key] || ''}
                    onChange={e => setEditClienteForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Subcarteira</label>
                {subcarteirasDisponiveis.length > 0 ? (
                  <select
                    value={editClienteForm.subcarteira || ''}
                    onChange={e => setEditClienteForm(p => ({ ...p, subcarteira: e.target.value === '__limpar__' ? '' : e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white"
                  >
                    <option value="">— Nenhuma —</option>
                    {subcarteirasDisponiveis.map(sc => (
                      <option key={sc} value={sc}>📁 {sc}</option>
                    ))}
                    <option value="__nova__">+ Digitar nova subcarteira...</option>
                  </select>
                ) : null}
                {(subcarteirasDisponiveis.length === 0 || (editClienteForm.subcarteira === '__nova__') || (!subcarteirasDisponiveis.includes(editClienteForm.subcarteira) && editClienteForm.subcarteira !== '')) && (
                  <input
                    type="text"
                    value={editClienteForm.subcarteira === '__nova__' ? '' : (editClienteForm.subcarteira || '')}
                    onChange={e => setEditClienteForm(p => ({ ...p, subcarteira: e.target.value }))}
                    placeholder="Digite o nome da subcarteira..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] mt-1"
                  />
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Observação</label>
                <textarea
                  value={editClienteForm.observacao || ''}
                  onChange={e => setEditClienteForm(p => ({ ...p, observacao: e.target.value }))}
                  rows={2}
                  placeholder="Observações..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between gap-2">
              <Button variant="outline" onClick={() => excluirCliente(editandoCliente)} disabled={salvandoCliente}
                className="border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditandoCliente(null)}>Cancelar</Button>
                <Button onClick={salvarEdicaoCliente} disabled={salvandoCliente} className="bg-[#0f1e35] hover:bg-[#1a3150]">
                  {salvandoCliente ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <input type="date" value={editInteracaoForm.proximo_contato} onChange={e => setEditInteracaoForm(p => ({ ...p, proximo_contato: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]" />
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

      {/* Modal Novo Lead */}
      {showNovoLeadModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Novo Lead/Prospect</h3>
              <button onClick={() => setShowNovoLeadModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome Completo *</label>
                <input type="text" value={novoLeadForm.nome} onChange={e => setNovoLeadForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome do lead"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">CPF / CNPJ</label>
                <input type="text" value={novoLeadForm.cpf_cnpj} onChange={e => setNovoLeadForm(p => ({ ...p, cpf_cnpj: e.target.value }))}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
                <input type="text" value={novoLeadForm.telefone} onChange={e => setNovoLeadForm(p => ({ ...p, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">E-mail</label>
                <input type="email" value={novoLeadForm.email} onChange={e => setNovoLeadForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Subcarteira (opcional)</label>
                {subcarteirasDisponiveis.length > 0 ? (
                  <select value={novoLeadForm.subcarteira} onChange={e => setNovoLeadForm(p => ({ ...p, subcarteira: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150] bg-white">
                    <option value="">Nenhuma</option>
                    {subcarteirasDisponiveis.map(sc => (
                      <option key={sc} value={sc}>📁 {sc}</option>
                    ))}
                    <option value="__nova__">+ Nova subcarteira...</option>
                  </select>
                ) : null}
                {(subcarteirasDisponiveis.length === 0 || novoLeadForm.subcarteira === '__nova__') && (
                  <input
                    type="text"
                    value={novoLeadForm.subcarteira === '__nova__' ? '' : novoLeadForm.subcarteira}
                    onChange={e => setNovoLeadForm(p => ({ ...p, subcarteira: e.target.value }))}
                    placeholder="Digite o nome da subcarteira..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150] mt-1"
                  />
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNovoLeadModal(false)}>Cancelar</Button>
              <Button onClick={criarNovoLead} disabled={criandoLead || !novoLeadForm.nome} className="bg-[#0f1e35] hover:bg-[#1a3150]">
                {criandoLead ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Criar e Registrar Interação
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cliente (Agenda) */}
      {clienteModalId && (
        <ClienteInteracaoModal
          clienteId={clienteModalId}
          vendedor={vendedor}
          user={user}
          onClose={() => setClienteModalId(null)}
        />
      )}

      {/* Modal Nova Interação (pop-up suspenso) */}
      {showForm && (() => {
        const cliente = clientesFiltrados.find(c => c.id === showForm) || clientes.find(c => c.id === showForm);
        if (!cliente) return null;
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #1a3150 100%)' }}>
                <div>
                  <h3 className="font-bold text-white text-base">Nova Interação</h3>
                  <p className="text-blue-200 text-xs mt-0.5">{cliente.nome}</p>
                </div>
                <button onClick={() => { setShowForm(null); setCadastroClienteForm({}); setMeetForm({ horario: '', gerarMeet: false, link: '', loading: false }); }} className="p-1.5 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Complementar Cadastro */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0f1e35] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    Complementar Cadastro
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'nome', label: 'Nome *', placeholder: 'Nome completo' },
                      { key: 'cpf_cnpj', label: 'CPF / CNPJ *', placeholder: '000.000.000-00' },
                      { key: 'telefone', label: 'Telefone *', placeholder: '(11) 99999-9999' },
                      { key: 'email', label: 'E-mail *', placeholder: 'email@exemplo.com', type: 'email' },
                      { key: 'cidade', label: 'Cidade', placeholder: 'São Paulo' },
                      { key: 'estado', label: 'Estado (UF)', placeholder: 'SP' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                        <input type={f.type || 'text'} value={cadastroClienteForm[f.key] || ''} onChange={e => setCadastroClienteForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a3150]" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dados da Interação */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0f1e35] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    Dados da Interação
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                      <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a3150]">
                        {['Ligação','WhatsApp','E-mail','Reunião','Visita','Outro'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Resultado</label>
                      <select value={form.resultado} onChange={e => setForm(p => ({ ...p, resultado: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a3150]">
                        {['Positivo','Neutro','Negativo','Sem resposta'].map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Data do contato</label>
                      <input type="date" value={form.data_interacao} onChange={e => setForm(p => ({ ...p, data_interacao: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a3150]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Próximo contato</label>
                      <input type="date" value={form.proximo_contato} disabled={form.resultado === 'Negativo'} onChange={e => setForm(p => ({ ...p, proximo_contato: e.target.value }))}
                        className={`w-full px-3 py-2 text-sm border rounded-xl bg-white focus:outline-none focus:border-[#1a3150] disabled:opacity-40 disabled:cursor-not-allowed ${form.proximo_contato && mensagemNaoDiaUtil(form.proximo_contato) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                      {form.proximo_contato && mensagemNaoDiaUtil(form.proximo_contato) && (
                        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          {mensagemNaoDiaUtil(form.proximo_contato)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Produtos */}
                {produtos.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Produtos abordados</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                      {produtos.map(p => (
                        <label key={p.id} className="flex items-center gap-2 text-xs p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer border border-gray-100 transition">
                          <input
                            type="checkbox"
                            checked={form.produtos.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) setForm(prev => ({ ...prev, produtos: [...prev.produtos, p.id] }));
                              else setForm(prev => ({ ...prev, produtos: prev.produtos.filter(id => id !== p.id) }));
                            }}
                            className="w-3.5 h-3.5 accent-[#1a3150] flex-shrink-0"
                          />
                          <span className="text-gray-700 truncate">{p.nome}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Google Meet */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-[#1a73e8]" />
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Reunião Google Meet</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={meetForm.gerarMeet}
                        onChange={e => setMeetForm(p => ({ ...p, gerarMeet: e.target.checked, link: '' }))}
                        className="w-4 h-4 accent-[#1a73e8]" />
                      <span className="text-xs text-gray-500">Agendar reunião</span>
                    </label>
                  </div>

                  {meetForm.gerarMeet && (
                    <div className="space-y-3">
                      <div className="flex items-end gap-3 flex-wrap">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Horário de início</label>
                          <input type="time" value={meetForm.horario} onChange={e => setMeetForm(p => ({ ...p, horario: e.target.value }))}
                            className="px-3 py-2 text-sm border border-gray-200 bg-white rounded-xl focus:outline-none focus:border-[#1a73e8]" />
                        </div>
                        {!meetForm.link && (
                          <button onClick={() => gerarMeetLink(cliente)} disabled={meetForm.loading}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-semibold rounded-xl transition">
                            {meetForm.loading
                              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              : <Video className="w-4 h-4" />}
                            {meetForm.loading ? 'Gerando...' : 'Gerar Link'}
                          </button>
                        )}
                      </div>

                      {meetForm.link && (
                        <div className="flex items-center gap-2 p-2.5 bg-white border border-blue-200 rounded-xl flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <a href={meetForm.link} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-[#1a73e8] font-semibold hover:underline truncate flex-1">
                            {meetForm.link}
                          </a>
                          <button onClick={() => { navigator.clipboard.writeText(meetForm.link); toast.success('Link copiado!'); }}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-[11px] font-semibold rounded-lg border border-blue-100 hover:bg-blue-100 transition flex-shrink-0">
                            <Copy className="w-3 h-3" /> Copiar
                          </button>
                          <button onClick={() => setMeetForm(p => ({ ...p, link: '', horario: '' }))}
                            className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Descrição */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Descrição *</label>
                  <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                    rows={4} placeholder="Descreva o que foi tratado na conversa..."
                    autoFocus
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a3150] resize-none" />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0 bg-gray-50/50">
                <Button variant="outline" onClick={() => { setShowForm(null); setCadastroClienteForm({}); setMeetForm({ horario: '', gerarMeet: false, link: '', loading: false }); }}>
                  <X className="w-4 h-4 mr-1.5" /> Cancelar
                </Button>
                <Button onClick={() => handleSave(cliente)} disabled={createMutation.isPending} className="bg-[#0f1e35] hover:bg-[#1a3150]">
                  {createMutation.isPending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    : <Save className="w-4 h-4 mr-1.5" />}
                  Salvar Interação
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Trocar Gerente */}
      {showTrocarGerenteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Trocar Gerente Responsável</h3>
              <button onClick={() => setShowTrocarGerenteModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">{selectedIds.size} registro(s) selecionado(s) serão transferidos para:</p>
              <select value={novoGerenteId} onChange={e => setNovoGerenteId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a3150]">
                <option value="">Selecione o novo gerente...</option>
                {todosVendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTrocarGerenteModal(false)}>Cancelar</Button>
              <Button onClick={handleTrocarGerente} disabled={!novoGerenteId || salvandoBulk} className="bg-[#0f1e35] hover:bg-[#1a3150]">
                {salvandoBulk ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : null}
                Confirmar Transferência
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}