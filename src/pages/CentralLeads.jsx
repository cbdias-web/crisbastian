import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Zap, RefreshCw, CheckCircle2, Search, Sparkles, Phone, Clock, Copy, BarChart2, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import ChatConversa from '@/components/central/ChatConversa';
import StatusGerenteWidget from '@/components/central/StatusGerenteWidget';
import RelatorioLeads from '@/components/central/RelatorioLeads';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.1)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const STATUS_COLORS = {
  ativa: { bg: 'rgba(0,212,170,0.15)', color: '#00D4AA', label: 'Ativa' },
  qualificado: { bg: 'rgba(139,92,246,0.2)', color: '#a78bfa', label: 'Qualificado' },
  encerrada: { bg: 'rgba(100,100,100,0.2)', color: '#9ca3af', label: 'Encerrada' },
};

function minutosAguardando(conv) {
  const msgs = conv.mensagens || [];
  const ultima = msgs[msgs.length - 1];
  if (!ultima || ultima.tipo !== 'recebida') return 0;
  return Math.round((Date.now() - new Date(ultima.timestamp)) / 60000);
}

export default function CentralLeads() {
  const [user, setUser] = useState(null);
  const [vendedorLogado, setVendedorLogado] = useState(null);
  const [conversaSelecionada, setConversaSelecionada] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [showRelatorio, setShowRelatorio] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u?.role !== 'admin') {
        const vends = await base44.entities.Vendedor.filter({ email: u.email });
        if (vends.length) setVendedorLogado(vends[0]);
      }
    }).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: conversas = [], isLoading, refetch } = useQuery({
    queryKey: ['conversas-whatsapp', user?.id, vendedorLogado?.id],
    queryFn: async () => {
      if (!user) return [];
      if (isAdmin) {
        return base44.entities.ConversaWhatsapp.list('-ultima_mensagem_em', 200);
      }
      if (!vendedorLogado) return [];
      return base44.entities.ConversaWhatsapp.filter({ vendedor_id: vendedorLogado.id }, '-ultima_mensagem_em');
    },
    enabled: !!user && (isAdmin || !!vendedorLogado),
    refetchInterval: 15000,
  });

  useEffect(() => {
    const unsub = base44.entities.ConversaWhatsapp.subscribe(() => { refetch(); });
    return unsub;
  }, []);

  const conversasFiltradas = conversas.filter(c => {
    const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus;
    const matchBusca = !busca || c.lead_nome?.toLowerCase().includes(busca.toLowerCase()) || c.telefone?.includes(busca);
    return matchStatus && matchBusca;
  });

  const totalNaoLidas = conversas.reduce((sum, c) => sum + (c.nao_lidas || 0), 0);
  const totalAtivas = conversas.filter(c => c.status === 'ativa').length;
  const totalAlerta = conversas.filter(c => c.alerta_sem_resposta).length;
  const totalQualificados = conversas.filter(c => c.status === 'qualificado').length;

  const marcarQualificado = async (conv, e) => {
    e.stopPropagation();
    await base44.entities.ConversaWhatsapp.update(conv.id, { status: 'qualificado' });
    refetch();
    toast.success('Lead marcado como qualificado!');
  };

  const copiarWebhook = () => {
    const url = `${window.location.origin}/api/functions/receberLeadExterno`;
    navigator.clipboard.writeText(url);
    toast.success('URL do webhook copiada!');
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: AURORA.bg, color: AURORA.text }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.15)' }}>
                <MessageSquare className="w-4 h-4" style={{ color: AURORA.accent }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: AURORA.text }}>Central de Leads</h1>
              {totalNaoLidas > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#ef4444', color: '#fff' }}>
                  {totalNaoLidas} nova{totalNaoLidas > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: AURORA.textMuted }}>
              {isAdmin ? 'Visão geral de todos os leads · Admin' : 'Seus leads recebidos'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button onClick={() => setShowRelatorio(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                  style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <BarChart2 className="w-3.5 h-3.5" /> Relatórios
                </button>
                <button onClick={copiarWebhook}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                  style={{ background: AURORA.accentDim, color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                  <Copy className="w-3.5 h-3.5" /> Webhook URL
                </button>
              </>
            )}
            <button onClick={() => refetch()} className="p-2 rounded-xl transition" style={{ background: AURORA.surface2, color: AURORA.textMuted }}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Widget de status do gerente (não-admin) */}
        {!isAdmin && user && <StatusGerenteWidget user={user} />}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Conversas ativas', value: totalAtivas, icon: MessageSquare, color: '#00D4AA' },
            { label: 'Qualificados', value: totalQualificados, icon: Sparkles, color: '#a78bfa' },
            { label: 'Aguardando resposta', value: totalAlerta, icon: AlertTriangle, color: '#fbbf24' },
            { label: 'Não lidas', value: totalNaoLidas, icon: Zap, color: '#f87171' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-2xl p-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                <p className="text-xs" style={{ color: AURORA.textMuted }}>{kpi.label}</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          {/* Lista */}
          <div className="flex flex-col gap-3" style={{ width: conversaSelecionada ? '380px' : '100%', flexShrink: 0 }}>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <Search className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar lead..."
                  className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: AURORA.text }} />
              </div>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm focus:outline-none"
                style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                <option value="todos">Todos</option>
                <option value="ativa">Ativas</option>
                <option value="qualificado">Qualificados</option>
                <option value="encerrada">Encerradas</option>
              </select>
            </div>

            {isLoading ? (
              <div className="text-center py-12" style={{ color: AURORA.textMuted }}>Carregando...</div>
            ) : conversasFiltradas.length === 0 ? (
              <div className="text-center py-12 rounded-2xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
                <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: AURORA.textMuted }} />
                <p className="font-semibold" style={{ color: AURORA.text }}>Nenhuma conversa encontrada</p>
                <p className="text-sm mt-1" style={{ color: AURORA.textMuted }}>Os leads chegam automaticamente via webhook</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversasFiltradas.map(conv => {
                  const stCfg = STATUS_COLORS[conv.status] || STATUS_COLORS.ativa;
                  const isSelected = conversaSelecionada?.id === conv.id;
                  const minEspera = minutosAguardando(conv);
                  const temAlerta = conv.alerta_sem_resposta || minEspera >= 5;
                  const temMigracao = (conv.migracoes || []).length > 0;

                  return (
                    <div key={conv.id} onClick={() => setConversaSelecionada(conv)}
                      className="rounded-2xl p-4 cursor-pointer transition"
                      style={{
                        background: isSelected ? 'rgba(0,212,170,0.08)' : AURORA.surface,
                        border: isSelected ? `1px solid ${AURORA.accent}` : temAlerta ? '1px solid rgba(251,191,36,0.4)' : `1px solid ${AURORA.border}`,
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(0,212,170,0.3)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = temAlerta ? 'rgba(251,191,36,0.4)' : AURORA.border; }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #00D4AA22, #0066cc22)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                            {conv.lead_nome?.charAt(0).toUpperCase()}
                          </div>
                          {temAlerta && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px]" style={{ background: '#fbbf24' }}>!</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm truncate" style={{ color: AURORA.text }}>{conv.lead_nome}</p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {conv.nao_lidas > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ef4444', color: '#fff' }}>{conv.nao_lidas}</span>
                              )}
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: stCfg.bg, color: stCfg.color }}>{stCfg.label}</span>
                            </div>
                          </div>
                          <p className="text-xs truncate mt-0.5" style={{ color: AURORA.textMuted }}>{conv.ultima_mensagem || 'Sem mensagens ainda'}</p>
                          <div className="flex items-center justify-between mt-1.5 gap-1 flex-wrap">
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] flex items-center gap-1" style={{ color: 'rgba(230,237,243,0.35)' }}>
                                <Phone className="w-3 h-3" />{conv.telefone}
                              </p>
                              {minEspera >= 5 && (
                                <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: minEspera >= 30 ? '#f87171' : '#fbbf24' }}>
                                  <Clock className="w-3 h-3" />{minEspera}min
                                </span>
                              )}
                              {temMigracao && (
                                <span className="flex items-center gap-0.5 text-[10px]" style={{ color: '#f87171' }}>
                                  <ArrowRight className="w-3 h-3" />{conv.migracoes.length}x migrado
                                </span>
                              )}
                            </div>
                            {conv.status === 'ativa' && (
                              <button onClick={(e) => marcarQualificado(conv, e)}
                                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg transition"
                                style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                                <CheckCircle2 className="w-3 h-3" /> Qualificado
                              </button>
                            )}
                          </div>
                          {isAdmin && conv.vendedor_nome && (
                            <p className="text-[10px] mt-1" style={{ color: 'rgba(230,237,243,0.3)' }}>👤 {conv.vendedor_nome}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chat */}
          {conversaSelecionada && (
            <div className="flex-1 rounded-2xl overflow-hidden" style={{ border: `1px solid ${AURORA.border}`, height: 'calc(100vh - 240px)' }}>
              <ChatConversa
                conversa={conversaSelecionada}
                isAdmin={isAdmin}
                onClose={() => setConversaSelecionada(null)}
                onUpdate={(updated) => { setConversaSelecionada(updated); refetch(); }}
              />
            </div>
          )}
        </div>
      </div>

      {showRelatorio && <RelatorioLeads onClose={() => setShowRelatorio(false)} />}
    </div>
  );
}