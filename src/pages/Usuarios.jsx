import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Edit2, Save, X, Shield, UserPlus, Mail, Wifi, WifiOff, Clock } from 'lucide-react';
import { toast } from 'sonner';

const menusDisponiveis = [
  { id: 'Dashboard', nome: 'Dashboard', descricao: 'Visão geral e métricas' },
  { id: 'Vendas', nome: 'Vendas', descricao: 'Gestão de vendas' },
  { id: 'Vendedores', nome: 'Vendedores', descricao: 'Perfil do vendedor' },
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
  const [showConviteModal, setShowConviteModal] = useState(false);
  const [conviteForm, setConviteForm] = useState({ email: '', nome: '', role: 'user' });
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const getOnlineStatus = (ultimoAcesso) => {
    if (!ultimoAcesso) return 'offline';
    const diff = (Date.now() - new Date(ultimoAcesso).getTime()) / 1000 / 60; // minutos
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
    queryFn: async () => {
      const users = await base44.entities.User.list('full_name');
      return users;
    },
    enabled: isAdmin,
    refetchInterval: 30000 // atualiza a cada 30s para refletir quem está online
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.User.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios']);
      setEditingUser(null);
      toast.success('Usuário atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar usuário');
    }
  });

  const iniciarEdicao = (usuario) => {
    setEditingUser(usuario.id);
    setMenusEditando(usuario.menus_acesso || menusDefault);
  };

  const cancelarEdicao = () => {
    setEditingUser(null);
    setMenusEditando([]);
  };

  const salvarUsuario = (usuario) => {
    updateUserMutation.mutate({
      id: usuario.id,
      data: {
        menus_acesso: menusEditando,
        role: usuario.role
      }
    });
  };

  const toggleMenu = (menuId) => {
    setMenusEditando(prev => 
      prev.includes(menuId) 
        ? prev.filter(m => m !== menuId)
        : [...prev, menuId]
    );
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
            <p className="text-sm text-gray-500">Apenas administradores podem acessar esta página.</p>
          </CardContent>
        </Card>
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Painel Online */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-2">
          <div className="flex items-center gap-2 mb-3">
            <Wifi className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-700">Status Online</h3>
            <span className="text-xs text-gray-400 ml-auto">Atualiza a cada 30s</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {usuarios.map(u => {
              const status = getOnlineStatus(u.ultimo_acesso);
              const label = getStatusLabel(u.ultimo_acesso);
              return (
                <div key={u.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
                  status === 'online' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                  status === 'ausente' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    status === 'online' ? 'bg-emerald-500 animate-pulse' :
                    status === 'ausente' ? 'bg-amber-400' : 'bg-gray-300'
                  }`} />
                  <span>{u.nome_tratamento || u.full_name || u.email}</span>
                  <span className={`text-[10px] ${
                    status === 'online' ? 'text-emerald-600' :
                    status === 'ausente' ? 'text-amber-600' : 'text-gray-400'
                  }`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
            <p className="text-gray-600 mt-1">Controle de acessos e permissões</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowConviteModal(true)}
              className="bg-gradient-to-r from-[#0f1e35] to-[#1a3150] hover:opacity-90"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Convidar Usuário
            </Button>
            <div className="bg-blue-50 rounded-xl px-4 py-2">
              <p className="text-xs text-gray-500">Total de usuários</p>
              <p className="text-2xl font-bold text-[#1a3150]">{usuarios.length}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuários do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usuarios.map((usuario) => {
                const isEditing = editingUser === usuario.id;
                const menusUsuario = usuario.menus_acesso || menusDefault;
                const isAdminUser = usuario.role === 'admin' || usuario.permissao_admin === true;

                return (
                  <div key={usuario.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0f1e35] to-[#1a3150] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {usuario.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{usuario.full_name}</p>
                            {isAdminUser && (
                              <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{usuario.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAdminUser}
                            onChange={() => toggleAdmin(usuario)}
                            className="w-4 h-4 accent-amber-600"
                          />
                          <span>Administrador</span>
                        </label>
                        {!isEditing ? (
                          <Button variant="ghost" size="sm" onClick={() => iniciarEdicao(usuario)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Editar Acessos
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={cancelarEdicao}>
                              <X className="w-4 h-4" />
                            </Button>
                            <Button size="sm" onClick={() => salvarUsuario(usuario)} className="bg-green-600 hover:bg-green-700">
                              <Save className="w-4 h-4 mr-2" />
                              Salvar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Menus de Acesso</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {menusDisponiveis.map((menu) => (
                            <label key={menu.id} className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition ${
                              menusEditando.includes(menu.id) ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}>
                              <input type="checkbox" checked={menusEditando.includes(menu.id)}
                                onChange={() => toggleMenu(menu.id)} className="mt-0.5 w-4 h-4 accent-blue-600" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{menu.nome}</p>
                                <p className="text-xs text-gray-400">{menu.descricao}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-700">
                            <strong>Nota:</strong> Usuários não-admin só podem visualizar seus próprios dados nas páginas Dashboard, Vendas e Vendedores.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Menus com Acesso ({menusUsuario.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {menusUsuario.map((menuId) => {
                            const menu = menusDisponiveis.find(m => m.id === menuId);
                            return menu ? (
                              <span key={menuId} className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium">
                                {menu.nome}
                              </span>
                            ) : null;
                          })}
                          {menusUsuario.length === 0 && (
                            <span className="text-xs text-gray-400 italic">Nenhum menu configurado</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {usuarios.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum usuário encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">ℹ️ Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Menus padrão:</strong> Novos usuários têm acesso a Dashboard, Vendas e Vendedores (apenas seus próprios dados).</p>
            <p>• <strong>Administradores:</strong> Têm acesso completo a todos os menus e podem visualizar dados de todos os usuários.</p>
            <p>• <strong>Restrições:</strong> Usuários não-admin só visualizam seus próprios dados, mesmo que tenham acesso ao menu.</p>
            <p>• <strong>Convite:</strong> Um e-mail de convite será enviado com instruções para criar a senha de acesso.</p>
          </CardContent>
        </Card>
      </div>

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
                className="bg-gradient-to-r from-[#0f1e35] to-[#1a3150] hover:opacity-90">
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
  );
}