import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calculator, Lock, Send, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PrecificacaoBloqueada({ user }) {
  const [solicitacao, setSolicitacao] = useState(null); // null = loading, false = nenhuma, obj = existe
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.NotificacaoAutorizacao.filter({ tipo: 'solicitacao_precificacao', user_id: user.id })
      .then(list => {
        // Pega a mais recente
        const sorted = list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setSolicitacao(sorted[0] || false);
      })
      .catch(() => setSolicitacao(false))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleSolicitar = async () => {
    setEnviando(true);
    try {
      const nova = await base44.entities.NotificacaoAutorizacao.create({
        tipo: 'solicitacao_precificacao',
        vendedor_nome: user.nome_tratamento || user.full_name || user.email,
        user_id: user.id,
        user_email: user.email,
        status: 'pendente',
        lida: false,
      });
      setSolicitacao(nova);
      toast.success('Solicitação enviada! Os administradores serão notificados.');
    } catch {
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusInfo = {
    pendente: {
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
      title: 'Solicitação em análise',
      desc: 'Sua solicitação foi enviada e está sendo avaliada pelos administradores. Aguarde o retorno.',
    },
    aprovado: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200',
      title: 'Acesso aprovado!',
      desc: 'Seu acesso foi aprovado. Recarregue a página para acessar a Precificação.',
    },
    rejeitado: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
      title: 'Solicitação rejeitada',
      desc: 'Sua solicitação foi rejeitada. Entre em contato com um administrador para mais informações.',
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Ícone central */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a3150] to-[#0f1e35] flex items-center justify-center shadow-xl relative">
            <Calculator className="w-9 h-9 text-white" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
              <Lock className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Precificação</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            O acesso a esta funcionalidade é restrito. Solicite liberação e aguarde a aprovação de um administrador.
          </p>
        </div>

        {/* Status da solicitação */}
        {solicitacao && solicitacao.status && (() => {
          const info = statusInfo[solicitacao.status];
          const Icon = info.icon;
          return (
            <div className={`rounded-2xl border p-5 mb-4 ${info.bg}`}>
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${info.color}`} />
                <div>
                  <p className={`font-semibold text-sm ${info.color}`}>{info.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{info.desc}</p>
                  {solicitacao.data_aprovacao && (
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(solicitacao.data_aprovacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Botão solicitar */}
        {(!solicitacao || solicitacao.status === 'rejeitado') && (
          <button
            onClick={handleSolicitar}
            disabled={enviando}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1a3150] text-white rounded-2xl hover:bg-[#0f1e35] transition font-semibold text-sm disabled:opacity-60 shadow-lg"
          >
            {enviando ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {enviando ? 'Enviando...' : solicitacao?.status === 'rejeitado' ? 'Solicitar novamente' : 'Solicitar acesso'}
          </button>
        )}

        {/* Dica */}
        {!solicitacao && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Você receberá acesso assim que um administrador aprovar sua solicitação.
          </p>
        )}
      </div>
    </div>
  );
}