import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Zap, RefreshCw, CheckCircle2, Search, Sparkles, Phone, Clock, Copy, BarChart2, AlertTriangle, ArrowRight, Users, Lock, Settings, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import ChatConversa from '@/components/central/ChatConversa';
import StatusGerenteWidget from '@/components/central/StatusGerenteWidget';
import RelatorioLeads from '@/components/central/RelatorioLeads';
import GerenciarConversaModal from '@/components/central/GerenciarConversaModal';
import KanbanLeads from '@/components/central/KanbanLeads';
import LeadAbordagemModal from '@/components/central/LeadAbordagemModal';


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
  ativa: { bg: 'rgba(0,212,170,0.15)', color: '#00D4AA', label: 'Ativo' },
  aguardando: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Aguardando' },
  qualificado: { bg: 'rgba(139,92,246,0.2)', color: '#a78bfa', label: 'Qualificado' },
  desqualificado: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', label: 'Desqualificado' },
  convertido: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Convertido' },
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
  const [filtroGerente, setFiltroGerente] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [filtroHorario, setFiltroHorario] = useState('todos');
  const [filtroProduto, setFiltroProduto] = useState('todos');
  const [filtroOrigem, setFiltroOrigem] = useState('todos');
  const [busca, setBusca] = useState('');
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('leads');
  const [conversaGerenciar, setConversaGerenciar] = useState(null);
  const [leadAbordagem, setLeadAbordagem] = useState(null);
  const [modoVisualizacao, setModoVisualizacao] = useState('lista');
  const queryClient = useQueryClient();

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
  const temPermissaoCentralLeads = isAdmin || (user?.menus_acesso || []).includes('CentralLeads');

  const { data: conversas = [], isLoading, refetch } = useQuery({
    queryKey: ['conversas-whatsapp', user?.id, vendedorLogado?.id],
    queryFn: async () => {
      if (!user) return [];
      if (isAdmin) return base44.entities.ConversaWhatsapp.list('-ultima_mensagem_em', 200);
      if (!vendedorLogado) return [];
      return base44.entities.ConversaWhatsapp.filter({ vendedor_id: vendedorLogado.id }, '-ultima_mensagem_em');
    },
    enabled: !!user && (isAdmin || !!vendedorLogado),
    refetchInterval: 15000,
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-central'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: !!user && isAdmin,
  });

  const { data: statusGerentes = [] } = useQuery({
    queryKey: ['status-gerentes-central'],
    queryFn: () => base44.entities.StatusGerente.list(),
    enabled: !!user && isAdmin,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const unsub = base44.entities.ConversaWhatsapp.subscribe(() => { refetch(); });
    return unsub;
  }, []);

  const conversasFiltradas = conversas.filter(c => {
    const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus;
    const matchBusca = !busca || c.lead_nome?.toLowerCase().includes(busca.toLowerCase()) || c.telefone?.includes(busca);
    const matchGerente = filtroGerente === 'todos' || c.vendedor_id === filtroGerente;

    let matchPeriodo = true;
    if (filtroPeriodo !== 'todos') {
      const dias = parseInt(filtroPeriodo);
      const cutoff = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
      matchPeriodo = new Date(c.created_date) >= cutoff;
    }

    let matchHorario = true;
    if (filtroHorario !== 'todos' && c.created_date) {
      const h = new Date(c.created_date).getHours();
      if (filtroHorario === 'manha') matchHorario = h >= 6 && h < 12;
      else if (filtroHorario === 'tarde') matchHorario = h >= 12 && h < 18;
      else if (filtroHorario === 'noite') matchHorario = h >= 18 || h < 6;
      else if (filtroHorario === 'comercial') matchHorario = h >= 8 && h < 18;
    }

    const matchProduto = filtroProduto === 'todos' || c.produto_interesse === filtroProduto;
    const matchOrigem = filtroOrigem === 'todos' || c.origem === filtroOrigem;

    return matchStatus && matchBusca && matchGerente && matchPeriodo && matchHorario && matchProduto && matchOrigem;
  });

  // Produtos e origens disponíveis para os filtros (deduzidos das conversas existentes)
  const produtosDisponiveis = [...new Set(conversas.map(c => c.produto_interesse).filter(Boolean))].sort();
  const origensDisponiveis = [...new Set(conversas.map(c => c.origem).filter(Boolean))].sort();

  // Dados gerentes
  const toggleCentralLeads = async (v) => {
    await base44.entities.Vendedor.update(v.id, { ativo_central_leads: v.ativo_central_leads === false ? true : false });
    queryClient.invalidateQueries({ queryKey: ['vendedores-central'] });
    toast.success(`${v.nome} ${v.ativo_central_leads === false ? 'habilitado' : 'removido'} da esteira de leads`);
  };

  const agora = new Date();
  const statusMap = {};
  for (const s of statusGerentes) statusMap[s.vendedor_id] = s;
  const gerentesInfo = vendedores.map(v => {
    const st = statusMap[v.id];
    const disponivel = !st || st.disponivel || (st.bloqueado_ate && new Date(st.bloqueado_ate) < agora);
    const motivo = !disponivel ? (st?.motivo_bloqueio || 'bloqueado') : null;
    const bloqueadoAte = st?.bloqueado_ate ? new Date(st.bloqueado_ate) : null;
    const minRestantes = bloqueadoAte && !disponivel ? Math.max(0, Math.round((bloqueadoAte - agora) / 60000)) : null;
    const leadsAtivos = conversas.filter(c => c.vendedor_id === v.id && c.status === 'ativa').length;
    const alertas = conversas.filter(c => c.vendedor_id === v.id && c.alerta_sem_resposta).length;
    return { ...v, disponivel, motivo, minRestantes, leadsAtivos, alertas };
  });

  const totalNaoLidas = conversas.reduce((sum, c) => sum + (c.nao_lidas || 0), 0);
  const totalAtivas = conversas.filter(c => c.status === 'ativa').length;
  const totalAlerta = conversas.filter(c => c.alerta_sem_resposta || c.status === 'aguardando').length;
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

  if (user && !temPermissaoCentralLeads) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: AURORA.bg }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Lock className="w-8 h-8" style={{ color: '#f87171' }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: AURORA.text }}>Acesso Restrito</h2>
          <p className="text-sm mb-1" style={{ color: AURORA.textMuted }}>A Central de Leads está bloqueada para o seu perfil.</p>
          <p className="text-xs" style={{ color: AURORA.textMuted }}>Solicite liberação ao administrador.</p>
        </div>
      </div>
    );
  }

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
                  <BarChart2 className="w-3.5 h-3.5" /> Relatórios (PDF)
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

        {/* Abas (admin) */}
        {isAdmin && (
          <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
            {[
               { key: 'leads', label: 'Conversas', icon: MessageSquare },
               { key: 'gerentes', label: `Gerentes (${gerentesInfo.length})`, icon: Users },
             ].map(aba => (
              <button key={aba.key} onClick={() => setAbaAtiva(aba.key)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition"
                style={{
                  background: abaAtiva === aba.key ? AURORA.accent : 'transparent',
                  color: abaAtiva === aba.key ? '#0d1117' : AURORA.textMuted,
                }}>
                <aba.icon className="w-3.5 h-3.5" /> {aba.label}
              </button>
            ))}
          </div>
        )}

        {/* KPIs */}
        {(abaAtiva === 'leads' || abaAtiva === 'gerentes') && (
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
        )}

        {/* ─── ABA GERENTES ─── */}
        {isAdmin && abaAtiva === 'gerentes' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
              <Users className="w-4 h-4" style={{ color: AURORA.accent }} />
              <p className="text-sm font-bold" style={{ color: AURORA.text }}>Status dos Gerentes em Tempo Real</p>
              <span className="ml-auto text-xs" style={{ color: AURORA.textMuted }}>
                {gerentesInfo.filter(g => g.disponivel).length} disponíveis · {gerentesInfo.filter(g => !g.disponivel).length} bloqueados
              </span>
            </div>
            {gerentesInfo.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: AURORA.textMuted }}>Nenhum gerente ativo encontrado</p>
            ) : (
              <div>
                <div className="grid px-5 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: AURORA.textMuted, gridTemplateColumns: '2fr 1.8fr 0.7fr 0.7fr 1fr', borderBottom: `1px solid ${AURORA.border}` }}>
                  <span>Gerente</span><span>Status da agenda</span><span>Leads ativos</span><span>Alertas SLA</span><span>Esteira de leads</span>
                </div>
                {gerentesInfo.map(v => {
                  const naEsteira = v.ativo_central_leads !== false;
                  return (
                  <div key={v.id} className="grid px-5 py-4 items-center" style={{ gridTemplateColumns: '2fr 1.8fr 0.7fr 0.7fr 1fr', borderBottom: `1px solid ${AURORA.border}`, opacity: naEsteira ? 1 : 0.6 }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,rgba(0,212,170,0.2),rgba(0,102,204,0.2))', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                        {v.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: AURORA.text }}>{v.nome}</p>
                        {v.email && <p className="text-[11px]" style={{ color: AURORA.textMuted }}>{v.email}</p>}
                      </div>
                    </div>
                    <div>
                      {v.disponivel ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                          style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.25)' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                          Disponível
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                            <Lock className="w-3 h-3" />{v.motivo}
                          </span>
                          {v.minRestantes > 0 && (
                            <p className="text-[10px] mt-0.5 ml-1" style={{ color: '#fbbf24' }}>⏱ libera em {v.minRestantes} min</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold" style={{ color: v.leadsAtivos > 0 ? AURORA.accent : AURORA.textMuted }}>{v.leadsAtivos}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold" style={{ color: v.alertas > 0 ? '#fbbf24' : AURORA.textMuted }}>{v.alertas}</p>
                    </div>
                    <div className="flex justify-center">
                      <button onClick={() => toggleCentralLeads(v)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                        style={{
                          background: naEsteira ? 'rgba(0,212,170,0.12)' : 'rgba(239,68,68,0.12)',
                          color: naEsteira ? '#00D4AA' : '#f87171',
                          border: `1px solid ${naEsteira ? 'rgba(0,212,170,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        }}>
                        {naEsteira ? '✅ Na esteira' : '⛔ Fora da esteira'}
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── ABA LEADS ─── */}
        {abaAtiva === 'leads' && (
          <div>
            {/* Toggle de visualização */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <button onClick={() => setModoVisualizacao('lista')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  style={{
                    background: modoVisualizacao === 'lista' ? AURORA.accent : 'transparent',
                    color: modoVisualizacao === 'lista' ? '#0d1117' : AURORA.textMuted,
                  }}>
                  <List className="w-3.5 h-3.5" /> Lista
                </button>
                <button onClick={() => setModoVisualizacao('kanban')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  style={{
                    background: modoVisualizacao === 'kanban' ? AURORA.accent : 'transparent',
                    color: modoVisualizacao === 'kanban' ? '#0d1117' : AURORA.textMuted,
                  }}>
                  <LayoutGrid className="w-3.5 h-3.5" /> Kanban
                </button>
              </div>
            </div>

            {/* Modo Kanban */}
            {modoVisualizacao === 'kanban' ? (
              <>
                <KanbanLeads
                  conversas={conversasFiltradas}
                  onSelectConversa={setLeadAbordagem}
                  onRefresh={refetch}
                />
              </>
            ) : (
              <div className="flex gap-4">
            {/* Lista */}
            <div className="flex flex-col gap-3" style={{ width: conversaSelecionada ? '380px' : '100%', flexShrink: 0 }}>
              {/* Barra de busca */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: AURORA.textMuted }} />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar lead ou telefone..."
                  className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: AURORA.text }} />
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs focus:outline-none"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                  <option value="todos">🟢 Todos status</option>
                  <option value="ativa">Ativos</option>
                  <option value="aguardando">Aguardando</option>
                  <option value="qualificado">Qualificados</option>
                  <option value="desqualificado">Desqualificados</option>
                  <option value="convertido">Convertidos</option>
                  <option value="encerrada">Encerradas</option>
                </select>

                {isAdmin && (
                  <select value={filtroGerente} onChange={e => setFiltroGerente(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs focus:outline-none"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                    <option value="todos">👤 Todos gerentes</option>
                    {vendedores.map(v => (
                      <option key={v.id} value={v.id}>{v.nome}</option>
                    ))}
                  </select>
                )}

                <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs focus:outline-none"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                  <option value="todos">📅 Todo período</option>
                  <option value="1">Hoje</option>
                  <option value="7">Últimos 7 dias</option>
                  <option value="14">Últimos 14 dias</option>
                  <option value="30">Últimos 30 dias</option>
                </select>

                <select value={filtroHorario} onChange={e => setFiltroHorario(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs focus:outline-none"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                  <option value="todos">🕐 Qualquer horário</option>
                  <option value="comercial">Comercial (08h–18h)</option>
                  <option value="manha">Manhã (06h–12h)</option>
                  <option value="tarde">Tarde (12h–18h)</option>
                  <option value="noite">Noite/madrugada</option>
                </select>

                <select value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs focus:outline-none"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                  <option value="todos">📦 Todos produtos</option>
                  {produtosDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select value={filtroOrigem} onChange={e => setFiltroOrigem(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs focus:outline-none"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                  <option value="todos">🔗 Todas origens</option>
                  {origensDisponiveis.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Contador de resultados */}
              {(filtroStatus !== 'todos' || filtroGerente !== 'todos' || filtroPeriodo !== 'todos' || filtroHorario !== 'todos' || filtroProduto !== 'todos' || filtroOrigem !== 'todos' || busca) && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: AURORA.textMuted }}>
                    {conversasFiltradas.length} conversa{conversasFiltradas.length !== 1 ? 's' : ''} encontrada{conversasFiltradas.length !== 1 ? 's' : ''}
                  </span>
                  <button onClick={() => { setFiltroStatus('todos'); setFiltroGerente('todos'); setFiltroPeriodo('todos'); setFiltroHorario('todos'); setFiltroProduto('todos'); setFiltroOrigem('todos'); setBusca(''); }}
                    className="text-xs underline" style={{ color: AURORA.accent }}>
                    Limpar filtros
                  </button>
                </div>
              )}

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
                              <div className="flex items-center gap-1">
                                {conv.status === 'ativa' && (
                                  <button onClick={(e) => marcarQualificado(conv, e)}
                                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg transition"
                                    style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                                    <CheckCircle2 className="w-3 h-3" /> Qualificado
                                  </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); setConversaGerenciar(conv); }}
                                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg transition"
                                  style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}
                                  title={isAdmin ? "Gerenciar: editar, excluir, mover/mesclar, transferir gerente" : "Editar / classificar lead"}>
                                  <Settings className="w-3 h-3" /> {isAdmin ? 'Gerenciar' : 'Editar'}
                                </button>
                              </div>
                            </div>
                            {isAdmin && conv.vendedor_nome && (
                              <p className="text-[10px] mt-1" style={{ color: 'rgba(230,237,243,0.3)' }}>👤 {conv.vendedor_nome}</p>
                            )}
                            {(conv.produto_interesse || conv.origem) && (
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                {conv.produto_interesse && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent, border: '1px solid rgba(0,212,170,0.25)' }}>
                                    📦 {conv.produto_interesse}
                                  </span>
                                )}
                                {conv.origem && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                                    🔗 {conv.origem}
                                  </span>
                                )}
                              </div>
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
            )}
          </div>
        )}

      </div>

      {showRelatorio && <RelatorioLeads onClose={() => setShowRelatorio(false)} />}

      {conversaGerenciar && (
        <GerenciarConversaModal
          conversa={conversaGerenciar}
          conversas={conversas}
          vendedores={vendedores}
          isAdmin={isAdmin}
          onClose={() => setConversaGerenciar(null)}
          onConcluido={() => { setConversaSelecionada(null); refetch(); }}
        />
      )}

      {leadAbordagem && (
        <LeadAbordagemModal
          conversa={leadAbordagem}
          user={user}
          vendedor={vendedorLogado}
          isAdmin={isAdmin}
          onClose={() => setLeadAbordagem(null)}
          onAtualizado={refetch}
          onAbrirChat={() => { setConversaSelecionada(leadAbordagem); setLeadAbordagem(null); }}
          onGerenciar={() => { setConversaGerenciar(leadAbordagem); setLeadAbordagem(null); }}
        />
      )}
    </div>
  );
}