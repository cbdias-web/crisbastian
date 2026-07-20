import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Users, Edit2, Save, X, Shield, UserPlus, Mail, Wifi, Trash2, ArrowRight, Lock, Unlock, MessageSquare, MessageSquareOff, Activity, Gift, Eye } from 'lucide-react';
import { toast } from 'sonner';
import RelatorioAcessosModal from '../components/usuarios/RelatorioAcessosModal';
import RelatorioRoletaModal from '../components/roleta/RelatorioRoletaModal';
import RoletaPreviewModal from '../components/roleta/RoletaPreviewModal';

const menusDisponiveis = [
  { id: 'Dashboard', nome: 'Dashboard', descricao: 'Visão geral e métricas' },
  { id: 'Vendas', nome: 'Vendas', descricao: 'Gestão de vendas' },
  { id: 'Vendedores', nome: 'Vendedores', descricao: 'Perfil do vendedor' },
  { id: 'CentralLeads', nome: 'Central de Leads', descricao: 'Gestão de leads e conversas WhatsApp' },
  { id: 'Implantacoes', nome: 'Implantações', descricao: 'Acompanhamento de implantação de produtos' },
  { id: 'Comissoes', nome: 'Comissões', descricao: 'Gestão de comissões' },
  { id: 'RelatorioComissoes', nome: 'Relatório', descricao: 'Relatórios de comissões' },
  { id: 'Metas', nome: 'Metas', descricao: 'Gestão de metas' },
  { id: 'Clientes', nome: 'Clientes', descricao: 'Cadastro de clientes' },
  { id: 'Espelhamentos', nome: 'Indicadores', descricao: 'Gestão de indicadores' },
  { id: 'Produtos', nome: 'Produtos', descricao: 'Cadastro de produtos' },
  { id: 'Importar', nome: 'Importar', descricao: 'Importação de dados' },
  { id: 'Notificacoes', nome: 'Notificações', descricao: 'Autorizações e alertas' }
];

const menusDefault = ['Dashboard', 'Vendas', 'Vendedores'];

export default function Usuarios() {
  const [user, setUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [menusEditando, setMenusEditando] = useState([]);
  const [nomeEditando, setNomeEditando] = useState('');
  const [showConviteModal, setShowConviteModal] = useState(false);
  const [conviteForm, setConviteForm] = useState({ email: '', nome: '', role: 'user' });
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [conviteVendedorEmail, setConviteVendedorEmail] = useState('');
  const [enviandoConviteVendedor, setEnviandoConviteVendedor] = useState(null);
  const [migrandoClientes, setMigrandoClientes] = useState(false);
  const [showMigrarcaoModal, setShowMigrarcaoModal] = useState(false);
  const [showRelatorioAcessos, setShowRelatorioAcessos] = useState(false);
  const [showRelatorioRoleta, setShowRelatorioRoleta] = useState(false);
  const [showPreviewRoleta, setShowPreviewRoleta] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [migracaoForm, setMigracaoForm] = useState({ vendedor_origem_id: '', vendedor_destino_id: '' });
  const [liberandoRodadas, setLiberandoRodadas] = useState(false);
  const [showLiberarRodadasModal, setShowLiberarRodadasModal] = useState(false);
  const [rodadasPorUsuario, setRodadasPorUsuario] = useState(1);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const getOnlineStatus = (ultimoAcesso) => {
    if (!ultimoAcesso) return 'offline';
    const diff = (Date.now() - new Date(ultimoAcesso).getTime()) / 1000 / 60;
    if (diff <= 3) return 'online';
    if (diff <= 10) return 'ausente';
    return 'offline';
  };

  const getStatusLabel = (ultimoAcesso) => {
    if (!ultimoAcesso) return 'Nunca acessou';
    const diff = (Date.now() - new Date(ultimoAcesso).getTime()) / 1000 / 60;
    if (diff <= 3) return 'Online agora';
    if (diff <= 60) return `Há ${Math.round(diff)} min`;
    if (diff <= 1440) return `Há ${Math.round(diff / 60)}h`;
    return new Date(ultimoAcesso).toLocaleDateString('pt-BR');
  };

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list('full_name'),
    enabled: isAdmin,
    refetchInterval: 30000
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-lista'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: isAdmin
  });

  const { data: roletas = [] } = useQuery({
    queryKey: ['roletas-premios'],
    queryFn: () => base44.entities.RoletaPremio.list(),
    enabled: isAdmin,
    refetchInterval: 15000
  });

  const toggleRoleta = async (usuario) => {
    const existing = roletas.find(r => r.user_id === usuario.id && r.ativo);
    try {
      if (existing) {
        await base44.entities.RoletaPremio.update(existing.id, { ativo: false });
        toast.success('Roleta desativada para ' + (usuario.full_name || usuario.email));
      } else {
        await base44.entities.RoletaPremio.create({
          user_id: usuario.id,
          user_nome: usuario.full_name || usuario.email,
          user_email: usuario.email,
          ativo: true,
          ja_girou: false,
        });
        toast.success('🎡 Roleta liberada para ' + (usuario.full_name || usuario.email) + '!');
      }
      queryClient.invalidateQueries(['roletas-premios']);
    } catch (e) {
      toast.error('Erro ao liberar roleta');
    }
  };

  // Vendedores sem acesso ao sistema (email não coincide com nenhum usuário)
  const emailsUsuarios = new Set(usuarios.map(u => u.email?.toLowerCase()));
  const vendedoresSemAcesso = vendedores.filter(v => v.email && !emailsUsuarios.has(v.email.toLowerCase()));

  // Convites pendentes: usuários que nunca acessaram o sistema
  const convitesPendentes = usuarios.filter(u => !u.ultimo_acesso);

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios']);
      setEditingUser(null);
      toast.success('Usuário atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar usuário')
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios']);
      toast.success('Usuário removido!');
    },
    onError: () => toast.error('Erro ao remover usuário')
  });

  const iniciarEdicao = (usuario) => {
    setEditingUser(usuario.id);
    setMenusEditando(usuario.menus_acesso || menusDefault);
    setNomeEditando(usuario.nome_tratamento || usuario.full_name || '');
  };

  const cancelarEdicao = () => {
    setEditingUser(null);
    setMenusEditando([]);
  };

  const salvarUsuario = (usuario) => {
    updateUserMutation.mutate({ id: usuario.id, data: { menus_acesso: menusEditando, role: usuario.role, nome_tratamento: nomeEditando.trim() } });
  };

  const toggleMenu = (menuId) => {
    setMenusEditando(prev =>
      prev.includes(menuId) ? prev.filter(m => m !== menuId) : [...prev, menuId]
    );
  };

  const toggleAtivo = (usuario) => {
    const novoAtivo = usuario.ativo !== false ? false : true;
    if (!novoAtivo && !confirm(`Bloquear ${usuario.full_name || usuario.email}? O usuário perderá acesso imediatamente.`)) return;
    updateUserMutation.mutate({ id: usuario.id, data: { ativo: novoAtivo } });
    toast.success(novoAtivo ? 'Usuário reativado!' : 'Usuário bloqueado!');
  };

  const toggleAdmin = (usuario) => {
    const novoRole = usuario.role === 'admin' ? 'user' : 'admin';
    updateUserMutation.mutate({
      id: usuario.id,
      data: {
        role: novoRole,
        menus_acesso: novoRole === 'admin' ? menusDisponiveis.map(m => m.id) : (usuario.menus_acesso || menusDefault)
      }
    });
  };

  const enviarConvite = async () => {
    if (!conviteForm.email || !conviteForm.nome) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setEnviandoConvite(true);
    try {
      await base44.users.inviteUser(conviteForm.email, conviteForm.role);
      toast.success(`Convite enviado para ${conviteForm.email}!`);
      setShowConviteModal(false);
      setConviteForm({ email: '', nome: '', role: 'user' });
      queryClient.invalidateQueries(['usuarios']);
    } catch (error) {
      toast.error(error.message || 'Erro ao enviar convite');
    }
    setEnviandoConvite(false);
  };

  const enviarConviteVendedor = async (vendedor) => {
    setEnviandoConviteVendedor(vendedor.id);
    try {
      await base44.users.inviteUser(vendedor.email, 'user');
      toast.success(`Convite enviado para ${vendedor.email}!`);
      queryClient.invalidateQueries(['usuarios']);
    } catch (error) {
      toast.error(error.message || 'Erro ao enviar convite');
    }
    setEnviandoConviteVendedor(null);
  };

  const liberarRodadasSelecionados = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Selecione ao menos um usuário');
      return;
    }
    const usuariosSelecionados = usuarios.filter(u => selectedUserIds.includes(u.id));
    setLiberandoRodadas(true);
    let criadas = 0;
    let resetadas = 0;
    for (const u of usuariosSelecionados) {
      const existentes = roletas.filter(r => r.user_id === u.id);
      const ativas = existentes.filter(r => r.ativo && !r.ja_girou);
      const giradas = existentes.filter(r => r.ativo && r.ja_girou);

      // Se já tem rodadas ativas não giradas, pular (já tem rodada disponível)
      if (ativas.length > 0) continue;

      // Resetar registros já girados (reactivar com ja_girou=false)
      if (giradas.length > 0) {
        await base44.entities.RoletaPremio.update(giradas[0].id, { ja_girou: false, premio: '', girado_em: null });
        resetadas++;
      } else {
        // Criar nova roleta ativa
        await base44.entities.RoletaPremio.create({
          user_id: u.id,
          user_nome: u.full_name || u.email,
          user_email: u.email,
          ativo: true,
          ja_girou: false,
        });
        criadas++;
      }
    }
    queryClient.invalidateQueries(['roletas-premios']);
    toast.success(`${selectedUserIds.length} usuário(s) processado(s)! ${resetadas} rodada(s) resetada(s), ${criadas} nova(s) liberada(s).`);
    setShowLiberarRodadasModal(false);
    setLiberandoRodadas(false);
  };

  const executarMigracao = async () => {
    if (!confirm('Executar migração de clientes de vendedores inativos? Fernando Huffel → Samuel Fraga; Christiano → Bruna')) return;
    setMigrandoClientes(true);
    try {
      const res = await base44.functions.invoke('migrarClientesVendedoresInativos', {});
      toast.success(res.data.message);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao migrar clientes');
    }
    setMigrandoClientes(false);
  };

  const executarMigriacaoPersonalizada = async () => {
    if (!migracaoForm.vendedor_origem_id || !migracaoForm.vendedor_destino_id) {
      toast.error('Selecione vendedor de origem e destino');
      return;
    }
    if (migracaoForm.vendedor_origem_id === migracaoForm.vendedor_destino_id) {
      toast.error('Vendedores devem ser diferentes');
      return;
    }
    if (!confirm('Transferir todos os clientes do vendedor selecionado?')) return;
    
    setMigrandoClientes(true);
    try {
      const res = await base44.functions.invoke('migrarClientesVendedor', {
        vendedor_origem_id: migracaoForm.vendedor_origem_id,
        vendedor_destino_id: migracaoForm.vendedor_destino_id
      });
      toast.success(res.data.message);
      setShowMigrarcaoModal(false);
      setMigracaoForm({ vendedor_origem_id: '', vendedor_destino_id: '' });
      queryClient.invalidateQueries(['usuarios']);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao migrar clientes');
    }
    setMigrandoClientes(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-sm text-gray-500">Apenas administradores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const onlineCount = usuarios.filter(u => getOnlineStatus(u.ultimo_acesso) === 'online').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
            <p className="text-sm text-gray-500 mt-0.5">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (selectedUserIds.length > 0) {
                  setShowRelatorioAcessos(true);
                } else {
                  setShowRelatorioAcessos(true);
                }
              }}
              variant="outline"
              className="border-[#00D4AA] text-[#00D4AA] hover:bg-[rgba(0,212,170,0.08)]"
            >
              <Activity className="w-4 h-4 mr-2" />
              Relatório de Acessos
              {selectedUserIds.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00D4AA] text-[#0d1117]">
                  {selectedUserIds.length}
                </span>
              )}
            </Button>
            <Button
              onClick={() => setShowPreviewRoleta(true)}
              variant="outline"
              className="border-[#00D4AA] text-[#00D4AA] hover:bg-[rgba(0,212,170,0.08)]"
            >
              <Eye className="w-4 h-4 mr-2" />
              Visualizar Roleta
            </Button>
            <Button
              onClick={() => {
                if (selectedUserIds.length === 0) {
                  toast.error('Selecione os usuários na lista para liberar rodadas');
                  return;
                }
                setShowLiberarRodadasModal(true);
              }}
              variant="outline"
              className="border-amber-400 text-amber-600 hover:bg-amber-50"
            >
              <Gift className="w-4 h-4 mr-2" />
              Liberar Rodadas
              {selectedUserIds.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {selectedUserIds.length}
                </span>
              )}
            </Button>
            <Button
              onClick={() => setShowRelatorioRoleta(true)}
              variant="outline"
              className="border-amber-400 text-amber-600 hover:bg-amber-50"
            >
              <Gift className="w-4 h-4 mr-2" />
              Relatório de Prêmios
            </Button>
            <Button
              onClick={() => setShowConviteModal(true)}
              className="bg-[#0f1e35] hover:bg-[#1a3150] text-white px-5"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              + Convidar Usuário
            </Button>
          </div>
        </div>

        {/* Status Online */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wifi className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-700">Status Online</h3>
            {onlineCount > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">{onlineCount} online</span>
            )}
            <span className="text-xs text-gray-400 ml-auto">Atualiza a cada 30s</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {usuarios.map(u => {
              const status = getOnlineStatus(u.ultimo_acesso);
              const label = getStatusLabel(u.ultimo_acesso);
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedUserIds([u.id]);
                    setShowRelatorioAcessos(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition cursor-pointer ${
                    selectedUserIds.includes(u.id)
                      ? 'bg-[rgba(0,212,170,0.12)] border-[#00D4AA] text-[#00D4AA]'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#00D4AA]'
                  }`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    status === 'online' ? 'bg-emerald-500' :
                    status === 'ausente' ? 'bg-amber-400' : 'bg-gray-300'
                  }`} />
                  <span className="font-medium">{u.nome_tratamento || u.full_name || u.email}</span>
                  <span className={`text-[10px] ${
                    status === 'online' ? 'text-emerald-600 font-semibold' : 'text-gray-400'
                  }`}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Migração de Clientes */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">Migração de Clientes</p>
                <p className="text-xs text-amber-700 mt-0.5">Transferir clientes entre vendedores</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowMigrarcaoModal(true)}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 h-9 text-xs"
              >
                <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                Personalizado
              </Button>
              <Button
                onClick={executarMigracao}
                disabled={migrandoClientes}
                className="bg-amber-600 hover:bg-amber-700 text-white h-9 text-xs"
              >
                {migrandoClientes ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" /> : <ArrowRight className="w-3.5 h-3.5 mr-1.5" />}
                Automático
              </Button>
            </div>
          </div>
        </div>

        {/* Vendedores sem acesso */}
        {vendedoresSemAcesso.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800">Vendedores Ativos Sem Acesso ao Sistema</h3>
            </div>
            <p className="text-xs text-amber-600 mb-4">Os vendedores abaixo estão cadastrados mas ainda não receberam convite de acesso.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {vendedoresSemAcesso.map(v => (
                <div key={v.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-sm font-semibold text-gray-900 truncate uppercase">{v.nome}</p>
                    <p className="text-xs text-gray-500 truncate">{v.email}</p>
                  </div>
                  <button
                    onClick={() => enviarConviteVendedor(v)}
                    disabled={enviandoConviteVendedor === v.id}
                    className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                  >
                    {enviandoConviteVendedor === v.id ? '...' : 'Enviar Convite'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover ${v.nome} da lista de pendentes?`)) {
                        base44.entities.Vendedor.update(v.id, { email: '' });
                        queryClient.invalidateQueries(['vendedores-lista']);
                        toast.success('Vendedor removido da lista!');
                      }
                    }}
                    className="flex-shrink-0 p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition"
                    title="Remover da lista"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabela de usuários */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.length === usuarios.length && usuarios.length > 0}
                    onChange={(e) => setSelectedUserIds(e.target.checked ? usuarios.map(u => u.id) : [])}
                    className="w-4 h-4 accent-[#00D4AA] cursor-pointer"
                    title="Selecionar todos"
                  />
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Nome</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">E-mail</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Papel</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Chat</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map((usuario) => {
                const isEditing = editingUser === usuario.id;
                const menusUsuario = usuario.menus_acesso || menusDefault;
                const isAdminUser = usuario.role === 'admin' || usuario.permissao_admin === true;
                const initials = (usuario.full_name || usuario.email || 'U').charAt(0).toUpperCase();

                return (
                  <React.Fragment key={usuario.id}>
                    <tr className="hover:bg-gray-50/50 transition">
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(usuario.id)}
                          onChange={() => setSelectedUserIds(prev =>
                            prev.includes(usuario.id) ? prev.filter(id => id !== usuario.id) : [...prev, usuario.id]
                          )}
                          className="w-4 h-4 accent-[#00D4AA] cursor-pointer"
                        />
                      </td>
                       <td className="px-5 py-3.5">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-[#0f1e35] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                             {initials}
                           </div>
                           <div className="min-w-0">
                             <p className="text-sm text-gray-800 font-medium truncate">{usuario.full_name || usuario.email}</p>
                             {usuario.nome_tratamento && usuario.nome_tratamento !== usuario.full_name && (
                               <p className="text-[10px] text-gray-500 truncate">{usuario.nome_tratamento}</p>
                             )}
                           </div>
                         </div>
                       </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{usuario.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          isAdminUser ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {isAdminUser ? 'Admin' : 'Usuário'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          usuario.ativo === false
                            ? 'bg-red-100 text-red-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {usuario.ativo === false ? 'Bloqueado' : 'Ativo'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => updateUserMutation.mutate({ id: usuario.id, data: { visivel_no_chat: usuario.visivel_no_chat === false ? true : false } })}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                            usuario.visivel_no_chat === false
                              ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                          title={usuario.visivel_no_chat === false ? 'Oculto no chat — clique para mostrar' : 'Visível no chat — clique para ocultar'}
                        >
                          {usuario.visivel_no_chat === false
                            ? <><MessageSquareOff className="w-3.5 h-3.5" /> Oculto</>
                            : <><MessageSquare className="w-3.5 h-3.5" /> Visível</>
                          }
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => isEditing ? cancelarEdicao() : iniciarEdicao(usuario)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-blue-600"
                            title="Editar acessos"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleAdmin(usuario)}
                            className={`p-1.5 hover:bg-gray-100 rounded-lg transition ${isAdminUser ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
                            title={isAdminUser ? 'Remover admin' : 'Tornar admin'}
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleAtivo(usuario)}
                            className={`p-1.5 rounded-lg transition ${
                              usuario.ativo === false
                                ? 'text-emerald-500 hover:bg-emerald-50'
                                : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
                            }`}
                            title={usuario.ativo === false ? 'Reativar usuário' : 'Bloquear usuário'}
                          >
                            {usuario.ativo === false ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => toggleRoleta(usuario)}
                            className={`p-1.5 rounded-lg transition ${
                              roletas.find(r => r.user_id === usuario.id && r.ativo)
                                ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                                : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                            }`}
                            title={roletas.find(r => r.user_id === usuario.id && r.ativo) ? 'Roleta ativa — clique para desativar' : 'Liberar roleta de prêmios'}
                          >
                            <Gift className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Remover ${usuario.full_name || usuario.email}?`)) deleteUserMutation.mutate(usuario.id); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition text-gray-300 hover:text-red-500"
                            title="Remover usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isEditing && (
                      <tr>
                        <td colSpan={7} className="px-5 py-4 bg-blue-50/50 border-t border-blue-100">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Nome de Tratamento</p>
                              <input
                                type="text"
                                value={nomeEditando}
                                onChange={e => setNomeEditando(e.target.value)}
                                placeholder="Nome de tratamento"
                                className="w-64 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]"
                              />
                            </div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Menus de Acesso</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {menusDisponiveis.map((menu) => (
                                <label key={menu.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition text-xs ${
                                  menusEditando.includes(menu.id) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}>
                                  <input type="checkbox" checked={menusEditando.includes(menu.id)}
                                    onChange={() => toggleMenu(menu.id)} className="w-3.5 h-3.5 accent-blue-600" />
                                  {menu.nome}
                                </label>
                              ))}
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" onClick={() => salvarUsuario(usuario)} className="bg-[#0f1e35] hover:bg-[#1a3150]">
                                <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelarEdicao}>
                                <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm">Nenhum usuário encontrado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal de Migração Personalizada */}
        {showMigrarcaoModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-gray-900">Migração Personalizada</h3>
                </div>
                <button onClick={() => setShowMigrarcaoModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wider">Vendedor de Origem (Inativo) *</label>
                  <select value={migracaoForm.vendedor_origem_id} onChange={(e) => setMigracaoForm(p => ({ ...p, vendedor_origem_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-600 bg-white">
                    <option value="">Selecione um vendedor...</option>
                    {vendedores.map(v => (
                      <option key={v.id} value={v.id}>{v.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wider">Vendedor de Destino (Ativo) *</label>
                  <select value={migracaoForm.vendedor_destino_id} onChange={(e) => setMigracaoForm(p => ({ ...p, vendedor_destino_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-600 bg-white">
                    <option value="">Selecione um vendedor...</option>
                    {vendedores.map(v => (
                      <option key={v.id} value={v.id}>{v.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <p className="text-xs text-amber-700">
                    <strong>Atenção:</strong> Todos os clientes do vendedor de origem serão transferidos para o vendedor de destino.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowMigrarcaoModal(false)} disabled={migrandoClientes}>Cancelar</Button>
                <Button onClick={executarMigriacaoPersonalizada} disabled={migrandoClientes || !migracaoForm.vendedor_origem_id || !migracaoForm.vendedor_destino_id}
                  className="bg-amber-600 hover:bg-amber-700">
                  {migrandoClientes ? (
                    <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Migrando...</>
                  ) : (
                    <><ArrowRight className="w-4 h-4 mr-2" />Executar Migração</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Relatório de Acessos */}
        {showRelatorioAcessos && (
          <RelatorioAcessosModal
            usuarios={usuarios}
            preSelecionados={selectedUserIds}
            onClose={() => setShowRelatorioAcessos(false)}
          />
        )}

        {showRelatorioRoleta && (
          <RelatorioRoletaModal
            roletas={roletas}
            onClose={() => setShowRelatorioRoleta(false)}
          />
        )}

        {showPreviewRoleta && (
          <RoletaPreviewModal onClose={() => setShowPreviewRoleta(false)} />
        )}

        {/* Modal Liberar Rodadas */}
        {showLiberarRodadasModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-gray-900">Liberar Rodadas da Roleta</h3>
                </div>
                <button onClick={() => setShowLiberarRodadasModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <p className="text-xs text-amber-700">
                    <strong>{selectedUserIds.length} usuário(s) selecionado(s):</strong> {selectedUserIds.map(id => usuarios.find(u => u.id === id)?.full_name || usuarios.find(u => u.id === id)?.email).join(', ')}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Esta ação vai <strong>liberar uma nova rodada</strong> da roleta para cada usuário selecionado:
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1 ml-4 list-disc">
                    <li>Usuários que já giraram terão a rodada <strong>resetada</strong> (poderão girar novamente)</li>
                    <li>Usuários sem roleta ativada terão uma <strong>nova rodada criada</strong></li>
                    <li>Usuários que já têm rodada disponível serão <strong>mantidos</strong></li>
                  </ul>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowLiberarRodadasModal(false)} disabled={liberandoRodadas}>Cancelar</Button>
                <Button onClick={liberarRodadasSelecionados} disabled={liberandoRodadas}
                  className="bg-amber-500 hover:bg-amber-600 text-white">
                  {liberandoRodadas ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Liberando...</>
                  ) : (
                    <><Gift className="w-4 h-4 mr-2" />Confirmar Liberação</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Convite */}
        {showConviteModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#1a3150]" />
                  <h3 className="font-semibold text-gray-900">Convidar Novo Usuário</h3>
                </div>
                <button onClick={() => setShowConviteModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block uppercase tracking-wider">Nome Completo *</label>
                  <input type="text" value={conviteForm.nome} onChange={(e) => setConviteForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Digite o nome completo"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block uppercase tracking-wider">E-mail *</label>
                  <input type="email" value={conviteForm.email} onChange={(e) => setConviteForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="usuario@exemplo.com"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block uppercase tracking-wider">Tipo de Acesso</label>
                  <select value={conviteForm.role} onChange={(e) => setConviteForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white">
                    <option value="user">Usuário Padrão</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>Após o convite:</strong> O usuário receberá um e-mail com link para criar sua senha e acessar o sistema.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowConviteModal(false)} disabled={enviandoConvite}>Cancelar</Button>
                <Button onClick={enviarConvite} disabled={enviandoConvite || !conviteForm.email || !conviteForm.nome}
                  className="bg-[#0f1e35] hover:bg-[#1a3150]">
                  {enviandoConvite ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Enviando...</>
                  ) : (
                    <><Mail className="w-4 h-4 mr-2" />Enviar Convite</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}