import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, X, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function Notificacoes() {
  const [user, setUser] = useState(null);
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

  const marcarComoLidaMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificacaoAutorizacao.update(id, { lida: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacoes']);
    }
  });

  const aprovarMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificacaoAutorizacao.update(id, {
      status: 'aprovado',
      lida: true,
      aprovado_por: user?.email,
      data_aprovacao: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacoes']);
      toast.success('Autorização aprovada!');
    }
  });

  const rejeitarMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificacaoAutorizacao.update(id, {
      status: 'rejeitado',
      lida: true,
      aprovado_por: user?.email,
      data_aprovacao: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacoes']);
      toast.success('Autorização rejeitada!');
    }
  });

  const pendentes = notificacoes.filter(n => n.status === 'pendente');
  const processadas = notificacoes.filter(n => n.status !== 'pendente');

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

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
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Notificações e Autorizações</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-gray-100 shadow-sm">
            <Bell className="w-5 h-5 text-[#1a3150]" />
            <span className="font-semibold text-gray-900">{pendentes.length}</span>
          </div>
        </div>

        {/* Notificações Pendentes */}
        {pendentes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Pendentes de Aprovação</h3>
            {pendentes.map(notif => (
              <div key={notif.id} className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-5 py-3 border-b border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span className="font-semibold text-amber-900">Espelhamento acima de 30%</span>
                    </div>
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(notif.created_date).toLocaleDateString('pt-BR')} às {new Date(notif.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Vendedor</p>
                      <p className="font-semibold text-gray-900">{notif.vendedor_nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Cliente</p>
                      <p className="font-semibold text-gray-900">{notif.cliente || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Valor da Venda</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(notif.valor_venda)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Data da Venda</p>
                      <p className="font-semibold text-gray-900">{new Date(notif.data_venda).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Total de Espelhamento</p>
                      <p className="text-2xl font-bold text-amber-700">{notif.total_espelhamento.toFixed(1)}%</p>
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
                    <button
                      onClick={() => aprovarMutation.mutate(notif.id)}
                      disabled={aprovarMutation.isLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium text-sm disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => rejeitarMutation.mutate(notif.id)}
                      disabled={rejeitarMutation.isLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium text-sm disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Rejeitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notificações Processadas */}
        {processadas.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Histórico</h3>
            {processadas.map(notif => (
              <div key={notif.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {notif.status === 'aprovado' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`font-semibold ${notif.status === 'aprovado' ? 'text-green-900' : 'text-red-900'}`}>
                        {notif.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {notif.vendedor_nome} • {formatCurrency(notif.valor_venda)} • {notif.total_espelhamento.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {notif.aprovado_por && `Por ${notif.aprovado_por} • `}
                      {new Date(notif.data_aprovacao || notif.created_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {!notif.lida && (
                    <button
                      onClick={() => marcarComoLidaMutation.mutate(notif.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Marcar como lida
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {notificacoes.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center">
            <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Nenhuma notificação</p>
          </div>
        )}
      </div>
    </div>
  );
}