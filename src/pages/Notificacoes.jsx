import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Check, X, Clock, CheckCircle2, XCircle, AlertTriangle,
  BookOpen, Search, Filter, Trash2, Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const formatDateTime = (d) => d ? `${formatDate(d)} às ${new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '—';

export default function Notificacoes() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pendentes');
  const [search, setSearch] = useState('');
  const [searchPendentes, setSearchPendentes] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: () => base44.entities.NotificacaoAutorizacao.list('-created_date'),
    enabled: isAdmin
  });

  const { data: aceites = [] } = useQuery({
    queryKey: ['aceites-usuarios'],
    queryFn: () => base44.entities.AceiteUsuario.list('-created_date'),
    enabled: isAdmin
  });

  // Invalida AMBAS as queries para atualizar o badge do menu lateral imediatamente
  const invalidateAll = () => {
    queryClient.invalidateQueries(['notificacoes']);
    queryClient.invalidateQueries(['notificacoes-pendentes']);
    queryClient.invalidateQueries(['aceites-pendentes']);
    queryClient.invalidateQueries(['aceites-usuarios']);
  };

  const aprovarMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificacaoAutorizacao.update(id, {
      status: 'aprovado', lida: true,
      aprovado_por: user?.email,
      data_aprovacao: new Date().toISOString()
    }),
    onSuccess: () => { invalidateAll(); toast.success('Autorização aprovada!'); }
  });

  const rejeitarMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificacaoAutorizacao.update(id, {
      status: 'rejeitado', lida: true,
      aprovado_por: user?.email,
      data_aprovacao: new Date().toISOString()
    }),
    onSuccess: () => { invalidateAll(); toast.success('Autorização rejeitada!'); }
  });

  const marcarLidaMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificacaoAutorizacao.update(id, { lida: true }),
    onSuccess: () => { invalidateAll(); toast.success('Marcada como lida!'); }
  });

  const marcarTodasLidasMutation = useMutation({
    mutationFn: async () => {
      const naoLidas = processadasFiltradas.filter(n => !n.lida);
      await Promise.all(naoLidas.map(n => base44.entities.NotificacaoAutorizacao.update(n.id, { lida: true })));
    },
    onSuccess: () => { invalidateAll(); toast.success('Todas marcadas como lidas!'); }
  });

  const excluirMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificacaoAutorizacao.delete(id),
    onSuccess: () => { invalidateAll(); toast.success('Notificação removida!'); }
  });

  // Separação
  const pendentes = notificacoes.filter(n => n.status === 'pendente');
  const pendentesFiltrados = pendentes.filter(n => {
    const term = searchPendentes.toLowerCase();
    return !term || (
      n.vendedor_nome?.toLowerCase().includes(term) ||
      n.cliente?.toLowerCase().includes(term) ||
      String(n.total_espelhamento).includes(term)
    );
  });
  const processadas = notificacoes.filter(n => n.status !== 'pendente');
  const aceitesPendentes = aceites.filter(a => !a.leitura_gestao_vendas);
  const aceitesCompletos = aceites.filter(a => a.leitura_gestao_vendas);

  // Filtro de busca para processadas
  const processadasFiltradas = processadas.filter(n => {
    const term = search.toLowerCase();
    const matchSearch = !term || (
      n.vendedor_nome?.toLowerCase().includes(term) ||
      n.cliente?.toLowerCase().includes(term) ||
      n.aprovado_por?.toLowerCase().includes(term) ||
      String(n.total_espelhamento).includes(term)
    );
    const matchStatus = filtroStatus === 'todos' || n.status === filtroStatus;
    const dataRef = n.data_aprovacao || n.created_date;
    const matchInicio = !filtroDataInicio || (dataRef && dataRef.slice(0, 10) >= filtroDataInicio);
    const matchFim = !filtroDataFim || (dataRef && dataRef.slice(0, 10) <= filtroDataFim);
    return matchSearch && matchStatus && matchInicio && matchFim;
  });

  // Filtro de busca para aceites
  const aceitesFiltrados = [...aceitesPendentes, ...aceitesCompletos].filter(a => {
    const term = search.toLowerCase();
    return !term || (
      a.user_nome?.toLowerCase().includes(term) ||
      a.user_email?.toLowerCase().includes(term)
    );
  });

  const naoLidasCount = processadas.filter(n => !n.lida).length;
  const totalBadge = pendentes.length + aceitesPendentes.length;

  const tabs = [
    { id: 'pendentes', label: 'Pendentes', count: pendentes.length, color: 'amber' },
    { id: 'historico', label: 'Histórico', count: processadas.length, badge: naoLidasCount > 0 ? naoLidasCount : null, color: 'gray' },
    { id: 'onboarding', label: 'Onboarding', count: aceites.length, badge: aceitesPendentes.length > 0 ? aceitesPendentes.length : null, color: 'blue' },
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Acesso restrito a administradores</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Notificações e Autorizações</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {totalBadge > 0 ? `${totalBadge} item${totalBadge > 1 ? 's' : ''} requer${totalBadge === 1 ? '' : 'em'} atenção` : 'Tudo em dia'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendentes.length > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">{pendentes.length} autorização</span>
              </div>
            )}
            {aceitesPendentes.length > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">{aceitesPendentes.length} sem leitura</span>
              </div>
            )}
            {totalBadge === 0 && (
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700">Tudo tratado</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(''); setSearchPendentes(''); setFiltroStatus('todos'); setFiltroDataInicio(''); setFiltroDataFim(''); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id ? 'bg-[#1a3150] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{tab.count}</span>
              )}
              {tab.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-red-500 text-white">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Barra de pesquisa (Histórico e Onboarding) */}
        {(activeTab === 'historico' || activeTab === 'onboarding') && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={activeTab === 'historico' ? 'Buscar por vendedor, cliente, admin...' : 'Buscar por nome ou e-mail...'}
                  className="flex-1 text-sm outline-none bg-transparent"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            {activeTab === 'historico' && (
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  <select
                    value={filtroStatus}
                    onChange={e => setFiltroStatus(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                  >
                    <option value="todos">Todos os status</option>
                    <option value="aprovado">Aprovados</option>
                    <option value="rejeitado">Rejeitados</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">De:</span>
                  <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none" />
                  <span className="text-xs text-gray-500">Até:</span>
                  <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none" />
                </div>
                {(search || filtroStatus !== 'todos' || filtroDataInicio || filtroDataFim) && (
                  <button
                    onClick={() => { setSearch(''); setFiltroStatus('todos'); setFiltroDataInicio(''); setFiltroDataFim(''); }}
                    className="text-xs text-blue-600 hover:underline"
                  >Limpar filtros</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: PENDENTES */}
        {activeTab === 'pendentes' && (
          <div className="space-y-3">
            {pendentes.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchPendentes}
                    onChange={e => setSearchPendentes(e.target.value)}
                    placeholder="Buscar por vendedor, cliente..."
                    className="flex-1 text-sm outline-none bg-transparent"
                  />
                  {searchPendentes && (
                    <button onClick={() => setSearchPendentes('')} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
            {pendentesFiltrados.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma autorização pendente</p>
                <p className="text-gray-400 text-sm mt-1">Todas as solicitações foram tratadas.</p>
              </div>
            ) : pendentes.map(notif => (
              <div key={notif.id} className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-5 py-3 border-b border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-amber-900">Espelhamento acima de 30%</span>
                  </div>
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDateTime(notif.created_date)}
                  </span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div><p className="text-xs text-gray-500 mb-1">Vendedor</p><p className="font-semibold text-gray-900 text-sm">{notif.vendedor_nome}</p></div>
                    <div><p className="text-xs text-gray-500 mb-1">Cliente</p><p className="font-semibold text-gray-900 text-sm">{notif.cliente || '—'}</p></div>
                    <div><p className="text-xs text-gray-500 mb-1">Valor da Venda</p><p className="font-semibold text-gray-900 text-sm">{formatCurrency(notif.valor_venda)}</p></div>
                    <div><p className="text-xs text-gray-500 mb-1">Data da Venda</p><p className="font-semibold text-gray-900 text-sm">{formatDate(notif.data_venda)}</p></div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Total de Espelhamento</p>
                      <p className="text-2xl font-bold text-amber-700">{notif.total_espelhamento?.toFixed(1)}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-amber-800 mb-1">Distribuição:</p>
                      {notif.indicadores?.map((ind, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-amber-700">
                          <span>• {ind.nome}</span>
                          <span className="font-semibold">{ind.percentual}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => aprovarMutation.mutate(notif.id)} disabled={aprovarMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium text-sm disabled:opacity-50">
                      <Check className="w-4 h-4" /> Aprovar
                    </button>
                    <button onClick={() => rejeitarMutation.mutate(notif.id)} disabled={rejeitarMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium text-sm disabled:opacity-50">
                      <X className="w-4 h-4" /> Rejeitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: HISTÓRICO */}
        {activeTab === 'historico' && (
          <div className="space-y-3">
            {processadasFiltradas.length > 0 && naoLidasCount > 0 && (
              <div className="flex justify-end">
                <button onClick={() => marcarTodasLidasMutation.mutate()} disabled={marcarTodasLidasMutation.isPending}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition">
                  <Eye className="w-3.5 h-3.5" />
                  Marcar todas como lidas ({naoLidasCount})
                </button>
              </div>
            )}
            {processadasFiltradas.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
                <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">{processadas.length === 0 ? 'Nenhum histórico ainda' : 'Nenhum resultado encontrado'}</p>
              </div>
            ) : processadasFiltradas.map(notif => (
              <div key={notif.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${!notif.lida ? 'border-blue-200' : 'border-gray-100'}`}>
                <div className={`px-5 py-3 flex items-center justify-between ${!notif.lida ? 'bg-blue-50 border-b border-blue-100' : 'border-b border-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    {notif.status === 'aprovado' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-semibold text-sm ${notif.status === 'aprovado' ? 'text-green-800' : 'text-red-800'}`}>
                      {notif.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}
                    </span>
                    {!notif.lida && (
                      <span className="text-[10px] px-2 py-0.5 bg-blue-500 text-white rounded-full font-bold">NOVO</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{formatDateTime(notif.data_aprovacao || notif.created_date)}</span>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div><p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Vendedor</p><p className="text-sm font-medium text-gray-800">{notif.vendedor_nome}</p></div>
                    <div><p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Cliente</p><p className="text-sm font-medium text-gray-800">{notif.cliente || '—'}</p></div>
                    <div><p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Valor</p><p className="text-sm font-medium text-gray-800">{formatCurrency(notif.valor_venda)}</p></div>
                    <div><p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Espelhamento</p><p className="text-sm font-medium text-gray-800">{notif.total_espelhamento?.toFixed(1)}%</p></div>
                  </div>
                  {notif.aprovado_por && (
                    <p className="text-xs text-gray-400">Tratado por <span className="font-medium text-gray-600">{notif.aprovado_por}</span></p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    {!notif.lida && (
                      <button onClick={() => marcarLidaMutation.mutate(notif.id)}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition">
                        <Eye className="w-3.5 h-3.5" /> Marcar como lida
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm('Remover esta notificação do histórico?')) excluirMutation.mutate(notif.id); }}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 font-medium px-3 py-1.5 border border-red-100 rounded-lg hover:bg-red-50 transition ml-auto">
                      <Trash2 className="w-3.5 h-3.5" /> Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: ONBOARDING */}
        {activeTab === 'onboarding' && (
          <div className="space-y-4">
            {aceitesPendentes.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Pendentes ({aceitesPendentes.filter(a => {
                    const term = search.toLowerCase();
                    return !term || a.user_nome?.toLowerCase().includes(term) || a.user_email?.toLowerCase().includes(term);
                  }).length})
                </h3>
                <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
                  <div className="bg-amber-50 px-5 py-3 border-b border-amber-100">
                    <p className="text-xs text-amber-700 font-medium">Usuários que ainda não concluíram o Termo de Aceite e/ou a leitura obrigatória de Gestão de Vendas.</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {aceitesPendentes.filter(a => {
                      const term = search.toLowerCase();
                      return !term || a.user_nome?.toLowerCase().includes(term) || a.user_email?.toLowerCase().includes(term);
                    }).map(a => (
                      <div key={a.id} className="px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm flex-shrink-0">
                            {(a.user_nome || a.user_email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{a.user_nome || a.user_email}</p>
                            <p className="text-xs text-gray-400">{a.user_email}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Desde {formatDate(a.created_date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.termo_aceito ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {a.termo_aceito ? '✓ Termo' : '✗ Sem termo'}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-100 text-amber-700">
                            ✗ Sem leitura
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {aceitesCompletos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Onboarding completo ({aceitesCompletos.filter(a => {
                    const term = search.toLowerCase();
                    return !term || a.user_nome?.toLowerCase().includes(term) || a.user_email?.toLowerCase().includes(term);
                  }).length})
                </h3>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {aceitesCompletos.filter(a => {
                      const term = search.toLowerCase();
                      return !term || a.user_nome?.toLowerCase().includes(term) || a.user_email?.toLowerCase().includes(term);
                    }).map(a => (
                      <div key={a.id} className="px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                            {(a.user_nome || a.user_email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{a.user_nome || a.user_email}</p>
                            <p className="text-xs text-gray-400">{a.user_email}</p>
                            {a.leitura_gestao_vendas_em && (
                              <p className="text-[10px] text-gray-400 mt-0.5">Concluído em {formatDate(a.leitura_gestao_vendas_em)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">✓ Termo</span>
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">✓ Leitura</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {aceites.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
                <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">Nenhum registro de onboarding ainda</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}