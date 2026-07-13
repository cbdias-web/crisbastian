import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, FileDown, Loader2, Wifi, Clock, Shield, Activity, Users, Search, ChevronDown, TrendingUp, Check, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import UserDetailPopup from './UserDetailPopup';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  textDim: 'rgba(230,237,243,0.35)',
};

const hoje = new Date().toISOString().split('T')[0];

const formatDataHora = (iso) => {
  if (!iso) return { data: 'Nunca acessou', hora: '—', relativo: '—' };
  const d = new Date(iso);
  const data = d.toLocaleDateString('pt-BR');
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const diffMin = (Date.now() - d.getTime()) / 1000 / 60;
  let relativo;
  if (diffMin <= 3) relativo = 'Online agora';
  else if (diffMin <= 60) relativo = `Ha ${Math.round(diffMin)} min`;
  else if (diffMin <= 1440) relativo = `Ha ${Math.round(diffMin / 60)}h`;
  else relativo = `Ha ${Math.round(diffMin / 1440)} dia(s)`;
  return { data, hora, relativo };
};

const formatDuracao = (min) => {
  if (!min || min <= 0) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}min`;
};

const formatHora = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const computarSessoes = (userSessoes, user) => {
  const ultimoAcesso = user.ultimo_acesso;
  const isOnline = getOnlineStatus(ultimoAcesso) === 'online';
  const nowMs = Date.now();

  // Fallback: sem registros de sessao, usar dados do User entity
  if (!userSessoes || userSessoes.length === 0) {
    const inicio = user.acesso_inicio;
    const inicioStr = inicio ? formatHora(inicio) : '—';
    let fimStr = '—';
    let duracao = '—';
    if (isOnline) {
      fimStr = 'Em sessão';
      if (inicio) {
        const diffMin = Math.round((nowMs - new Date(inicio).getTime()) / 1000 / 60);
        duracao = formatDuracao(diffMin);
      }
    } else if (ultimoAcesso) {
      fimStr = formatHora(ultimoAcesso);
      if (inicio) {
        const diffMin = Math.round((new Date(ultimoAcesso).getTime() - new Date(inicio).getTime()) / 1000 / 60);
        duracao = formatDuracao(diffMin);
      }
    }
    return { inicio: inicioStr, fim: fimStr, duracao, numSessoes: 0, totalMin: 0, sessoes: [] };
  }

  const sorted = [...userSessoes].sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  const primeira = sorted[0];
  const ultima = sorted[sorted.length - 1];
  const temAtiva = sorted.some(s => s.ativa);

  const inicioStr = formatHora(primeira.inicio);

  let fimStr = '—';
  if (temAtiva && isOnline) {
    fimStr = 'Em sessão';
  } else if (ultima.fim) {
    fimStr = formatHora(ultima.fim);
  } else if (ultima.ultimo_heartbeat) {
    fimStr = formatHora(ultima.ultimo_heartbeat);
  }

  let totalMin = 0;
  for (const s of sorted) {
    let fimRef = null;
    if (s.fim) {
      fimRef = new Date(s.fim);
    } else if (s.ativa && isOnline) {
      // Sessao ativa de usuario online: usar horario atual
      fimRef = new Date(nowMs);
    } else if (s.ultimo_heartbeat) {
      fimRef = new Date(s.ultimo_heartbeat);
    }
    if (fimRef) {
      totalMin += Math.max(0, Math.round((fimRef - new Date(s.inicio)) / 1000 / 60));
    }
  }

  return {
    inicio: inicioStr,
    fim: fimStr,
    duracao: formatDuracao(totalMin),
    numSessoes: sorted.length,
    totalMin,
    sessoes: sorted,
  };
};

const getOnlineStatus = (ultimoAcesso) => {
  if (!ultimoAcesso) return 'offline';
  const diff = (Date.now() - new Date(ultimoAcesso).getTime()) / 1000 / 60;
  if (diff <= 3) return 'online';
  if (diff <= 10) return 'ausente';
  return 'offline';
};

const statusColors = {
  online: { dot: '#10b981', bg: 'rgba(16,185,129,0.12)', text: '#34d399', label: 'Online' },
  ausente: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', label: 'Ausente' },
  offline: { dot: '#6b7280', bg: 'rgba(107,114,128,0.12)', text: '#9ca3af', label: 'Offline' },
};

export default function RelatorioAcessosModal({ usuarios, preSelecionados = [], onClose }) {
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [usuariosSelecionados, setUsuariosSelecionados] = useState(preSelecionados || []); // array de IDs
  const [usuarioDropOpen, setUsuarioDropOpen] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(hoje); // default: hoje
  const [usuarioPopup, setUsuarioPopup] = useState(null); // usuario selecionado para popup

  const { data: sessoes = [] } = useQuery({
    queryKey: ['relatorio-sessoes', dataInicio, dataFim],
    queryFn: async () => {
      const all = await base44.entities.SessaoUsuario.list('-inicio', 500);
      return all.filter(s => {
        if (!s.inicio) return false;
        const d = s.inicio.split('T')[0];
        if (dataInicio && d < dataInicio) return false;
        if (dataFim && d > dataFim) return false;
        return true;
      });
    },
  });

  const sessoesPorUsuario = useMemo(() => {
    const map = {};
    for (const s of sessoes) {
      if (!map[s.user_id]) map[s.user_id] = [];
      map[s.user_id].push(s);
    }
    return map;
  }, [sessoes]);

  const { data: atividades = {}, isLoading } = useQuery({
    queryKey: ['relatorio-acessos-atividades', dataInicio, dataFim],
    queryFn: async () => {
      const [vendas, mensagens, chamados, interacoes, agendas] = await Promise.all([
        base44.entities.Venda.list('-created_date', 500),
        base44.entities.MensagemChat.list('-created_date', 500),
        base44.entities.ChamadoSuporte.list('-created_date', 500),
        base44.entities.InteracaoCliente.list('-created_date', 500),
        base44.entities.AgendaContato.list('-created_date', 500),
      ]);

      const filtrarPorPeriodo = (lista) => {
        if (!dataInicio && !dataFim) return lista;
        return lista.filter(item => {
          if (!item.created_date) return false;
          const d = item.created_date.split('T')[0];
          if (dataInicio && d < dataInicio) return false;
          if (dataFim && d > dataFim) return false;
          return true;
        });
      };

      const contar = (lista) => {
        const filtrada = filtrarPorPeriodo(lista);
        const map = {};
        for (const item of filtrada) {
          if (item.created_by_id) {
            map[item.created_by_id] = (map[item.created_by_id] || 0) + 1;
          }
        }
        return map;
      };

      return {
        vendas: contar(vendas),
        mensagens: contar(mensagens),
        chamados: contar(chamados),
        interacoes: contar(interacoes),
        agendas: contar(agendas),
      };
    },
  });

  const usuariosAtivos = useMemo(() => {
    return usuarios.filter(u => u.ativo !== false && u.ultimo_acesso);
  }, [usuarios]);

  const usuariosComDados = useMemo(() => {
    return usuariosAtivos.map(u => {
      const status = getOnlineStatus(u.ultimo_acesso);
      const acesso = formatDataHora(u.ultimo_acesso);
      const atua = {
        vendas: atividades.vendas?.[u.id] || 0,
        mensagens: atividades.mensagens?.[u.id] || 0,
        chamados: atividades.chamados?.[u.id] || 0,
        interacoes: atividades.interacoes?.[u.id] || 0,
        agendas: atividades.agendas?.[u.id] || 0,
      };
      const totalAtua = atua.vendas + atua.mensagens + atua.chamados + atua.interacoes + atua.agendas;
      const isAdminUser = u.role === 'admin' || u.permissao_admin === true;
      const menusCount = isAdminUser ? 'Total' : (u.menus_acesso?.length || 0);
      const sessao = computarSessoes(sessoesPorUsuario[u.id] || [], u);
      return { ...u, status, acesso, atua, totalAtua, isAdminUser, menusCount, sessao };
    });
  }, [usuariosAtivos, atividades, sessoesPorUsuario]);

  const usuariosFiltrados = useMemo(() => {
    return usuariosComDados.filter(u => {
      // Filtro por usuarios selecionados (multi)
      if (usuariosSelecionados.length > 0 && !usuariosSelecionados.includes(u.id)) return false;
      // Filtro por busca textual
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        const match = (u.full_name?.toLowerCase().includes(t) ||
          u.email?.toLowerCase().includes(t) ||
          u.nome_tratamento?.toLowerCase().includes(t));
        if (!match) return false;
      }
      // Filtro por status
      if (filtroStatus === 'online') return u.status === 'online';
      if (filtroStatus === 'bloqueados') return u.ativo === false;
      if (filtroStatus === 'inativos') return !u.ultimo_acesso;
      return true;
    });
  }, [usuariosComDados, filtroStatus, searchTerm, usuariosSelecionados]);

  const stats = useMemo(() => {
    const online = usuariosComDados.filter(u => u.status === 'online').length;
    const bloqueados = usuariosComDados.filter(u => u.ativo === false).length;
    const nuncaAcessou = usuariosComDados.filter(u => !u.ultimo_acesso).length;
    const totalAtuacoes = usuariosComDados.reduce((s, u) => s + u.totalAtua, 0);
    return { total: usuariosComDados.length, online, bloqueados: 0, nuncaAcessou: 0, totalAtuacoes };
  }, [usuariosComDados]);

  // Dados para grafico - top 8 usuarios por atuações
  const chartData = useMemo(() => {
    return [...usuariosComDados]
      .filter(u => u.totalAtua > 0)
      .sort((a, b) => b.totalAtua - a.totalAtua)
      .slice(0, 8)
      .map(u => ({
        nome: (u.nome_tratamento || u.full_name || 'N/A').split(' ')[0].substring(0, 12),
        atuações: u.totalAtua,
      }));
  }, [usuariosComDados]);

  const gerarPDF = async () => {
    setGerandoPDF(true);
    try {
      const response = await base44.functions.invoke('gerarRelatorioAcessosPDF', {
        usuario_id: usuariosSelecionados.length === 1 ? usuariosSelecionados[0] : null,
        usuarios_ids: usuariosSelecionados.length > 1 ? usuariosSelecionados : null,
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
        filtro_status: filtroStatus,
        search_term: searchTerm || null,
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-acessos-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatorio PDF gerado!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao gerar PDF');
    }
    setGerandoPDF(false);
  };

  const limparFiltros = () => {
    setSearchTerm('');
    setUsuariosSelecionados([]);
    setDataInicio('');
    setDataFim(hoje);
    setFiltroStatus('todos');
  };

  const temFiltros = searchTerm || usuariosSelecionados.length > 0 || dataInicio || dataFim !== hoje || filtroStatus !== 'todos';

  const toggleUsuario = (id) => {
    setUsuariosSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Stats cards com filtro clicavel
  const statsCards = [
    { icon: Users, label: 'Total', value: stats.total, color: '#00D4AA', bg: 'rgba(0,212,170,0.06)', filterKey: 'todos' },
    { icon: Wifi, label: 'Online', value: stats.online, color: '#34d399', bg: 'rgba(16,185,129,0.06)', filterKey: 'online' },
    { icon: Shield, label: 'Bloqueados', value: stats.bloqueados, color: '#f87171', bg: 'rgba(239,68,68,0.06)', filterKey: 'bloqueados' },
    { icon: Clock, label: 'Nunca acessou', value: stats.nuncaAcessou, color: '#fbbf24', bg: 'rgba(245,158,11,0.06)', filterKey: 'inativos' },
    { icon: TrendingUp, label: 'Total Atuacoes', value: stats.totalAtuacoes, color: '#a78bfa', bg: 'rgba(167,139,250,0.06)', filterKey: null },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, borderRadius: 8, padding: '6px 10px' }}>
        <p style={{ color: AURORA.text, fontSize: 11, fontWeight: 600 }}>{payload[0].payload.nome}</p>
        <p style={{ color: AURORA.accent, fontSize: 12, fontWeight: 700 }}>{payload[0].value} atuacoes</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-7xl my-6 overflow-hidden"
        style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}` }}>

        {/* ═══ HEADER ═══ */}
        <div className="px-6 py-4 flex items-center justify-between sticky top-0 z-20"
          style={{ background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 60%, #16213e 100%)', borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', boxShadow: '0 4px 16px rgba(0,212,170,0.3)' }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: AURORA.text }}>Relatorio de Acessos</h3>
              <p className="text-xs" style={{ color: AURORA.textMuted }}>Controle de acesso e atuacoes dos usuarios</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={gerarPDF} disabled={gerandoPDF}
              className="border-[rgba(0,212,170,0.3)] text-[#00D4AA] hover:bg-[rgba(0,212,170,0.1)]">
              {gerandoPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
              Exportar PDF
            </Button>
            <button onClick={onClose} className="p-2 rounded-lg transition hover:bg-[rgba(0,212,170,0.1)]" style={{ color: AURORA.textMuted }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ═══ STATS CARDS (clicaveis) ═══ */}
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          {statsCards.map((s, i) => {
            const isActive = s.filterKey && filtroStatus === s.filterKey;
            return (
              <button key={i}
                onClick={() => s.filterKey && setFiltroStatus(isActive ? 'todos' : s.filterKey)}
                disabled={!s.filterKey}
                className="rounded-xl p-3 flex items-center gap-3 transition text-left"
                style={{
                  background: isActive ? AURORA.accentDim : s.bg,
                  border: `1px solid ${isActive ? 'rgba(0,212,170,0.4)' : `${s.color}22`}`,
                  cursor: s.filterKey ? 'pointer' : 'default',
                  boxShadow: isActive ? '0 4px 16px rgba(0,212,170,0.15)' : 'none',
                }}
                onMouseEnter={e => { if (s.filterKey && !isActive) e.currentTarget.style.transform = 'scale(1.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                <s.icon className="w-4 h-4 flex-shrink-0" style={{ color: s.color }} />
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: AURORA.textMuted }}>{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ═══ FILTROS ═══ */}
        <div className="px-6 pb-4">
          <div className="rounded-xl p-4 space-y-3" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <Search className="w-4 h-4" style={{ color: AURORA.accent }} />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: AURORA.accent }}>Filtros de Pesquisa</p>
              {temFiltros && (
                <button onClick={limparFiltros} className="ml-auto text-[11px] px-2 py-0.5 rounded-md transition"
                  style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}>
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Busca textual */}
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: AURORA.textMuted }}>Buscar</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: AURORA.textMuted }} />
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Nome ou email..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none transition"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
                </div>
              </div>

              {/* Selecao multipla de usuarios */}
              <div className="relative">
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: AURORA.textMuted }}>
                  Usuario(s) {usuariosSelecionados.length > 0 && `(${usuariosSelecionados.length} selecionado(s))`}
                </label>
                <button onClick={() => setUsuarioDropOpen(p => !p)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                  <span className="truncate">
                    {usuariosSelecionados.length === 0
                      ? 'Todos os usuarios'
                      : usuariosSelecionados.length === 1
                        ? (usuariosAtivos.find(u => u.id === usuariosSelecionados[0])?.nome_tratamento ||
                           usuariosAtivos.find(u => u.id === usuariosSelecionados[0])?.full_name || '1 selecionado')
                        : `${usuariosSelecionados.length} usuarios selecionados`}
                  </span>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-1 transition-transform ${usuarioDropOpen ? 'rotate-180' : ''}`} style={{ color: AURORA.textMuted }} />
                </button>
                {usuarioDropOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                    {/* Header com acoes rapidas */}
                    <div className="flex items-center gap-2 px-3 py-2 sticky top-0" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
                      <button onClick={() => setUsuariosSelecionados(usuariosAtivos.map(u => u.id))}
                        className="text-[10px] px-2 py-0.5 rounded-md transition"
                        style={{ color: AURORA.accent, background: AURORA.accentDim }}>
                        Selecionar todos
                      </button>
                      <button onClick={() => setUsuariosSelecionados([])}
                        className="text-[10px] px-2 py-0.5 rounded-md transition"
                        style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}>
                        Limpar
                      </button>
                    </div>
                    {usuariosAtivos.map(u => {
                      const checked = usuariosSelecionados.includes(u.id);
                      return (
                        <button key={u.id} onClick={() => toggleUsuario(u.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm transition hover:bg-[rgba(0,212,170,0.08)]"
                          style={{ color: checked ? AURORA.accent : AURORA.text }}>
                          <span className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                            style={{
                              background: checked ? AURORA.accent : 'transparent',
                              borderColor: checked ? AURORA.accent : AURORA.border,
                            }}>
                            {checked && <Check className="w-3 h-3 text-white" />}
                          </span>
                          {u.nome_tratamento || u.full_name || u.email}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Data inicio */}
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: AURORA.textMuted }}>Data Inicio</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
              </div>

              {/* Data fim (default: hoje) */}
              <div>
                <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: AURORA.textMuted }}>Data Fim <span style={{ color: AURORA.accent }}>(hoje)</span></label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
              </div>
            </div>

            {/* Filtros rapidos por status */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[10px] uppercase tracking-wide" style={{ color: AURORA.textMuted }}>Status:</span>
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'online', label: 'Online agora' },
                { key: 'bloqueados', label: 'Bloqueados' },
                { key: 'inativos', label: 'Nunca acessou' },
              ].map(f => (
                <button key={f.key} onClick={() => setFiltroStatus(f.key)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition"
                  style={{
                    background: filtroStatus === f.key ? AURORA.accentDim : 'transparent',
                    color: filtroStatus === f.key ? AURORA.accent : AURORA.textMuted,
                    border: `1px solid ${filtroStatus === f.key ? 'rgba(0,212,170,0.3)' : 'rgba(0,212,170,0.1)'}`,
                  }}>
                  {f.label}
                </button>
              ))}
              {usuariosSelecionados.length > 0 && (
                <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-lg"
                  style={{ background: AURORA.accentDim, border: '1px solid rgba(0,212,170,0.2)' }}>
                  <span className="text-[10px] font-medium" style={{ color: AURORA.accent }}>
                    {usuariosSelecionados.length} usuario(s) filtrado(s)
                  </span>
                  <button onClick={() => setUsuariosSelecionados([])}>
                    <XCircle className="w-3 h-3" style={{ color: AURORA.accent }} />
                  </button>
                </div>
              )}
              <span className="ml-auto text-xs" style={{ color: AURORA.textMuted }}>
                {usuariosFiltrados.length} usuario(s) exibido(s)
              </span>
            </div>
          </div>
        </div>

        {/* ═══ GRAFICO ═══ */}
        {chartData.length > 0 && (
          <div className="px-6 pb-4">
            <div className="rounded-xl p-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" style={{ color: AURORA.accent }} />
                <p className="text-sm font-semibold" style={{ color: AURORA.text }}>Top 8 Usuarios por Atuacoes</p>
                <span className="text-[10px]" style={{ color: AURORA.textMuted }}>(no periodo selecionado)</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="nome" tick={{ fill: AURORA.textMuted, fontSize: 10 }} axisLine={{ stroke: AURORA.border }} tickLine={false} />
                  <YAxis tick={{ fill: AURORA.textMuted, fontSize: 10 }} axisLine={false } tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,212,170,0.05)' }} />
                  <Bar dataKey="atuacoes" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={`rgba(0,212,170,${0.4 + (idx / chartData.length) * 0.6})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ═══ TABELA ═══ */}
        <div className="px-6 pb-6 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: AURORA.accent }} />
            </div>
          ) : (
            <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {['Usuario', 'Papel', 'Status', 'Inicio', 'Fim', 'Duracao', 'Menus', 'Vendas', 'Msgs', 'Chamados', 'Interacoes', 'Agenda', 'Total'].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider first:rounded-tl-xl last:rounded-tr-xl"
                      style={{ color: AURORA.text, background: AURORA.surface2, borderBottom: `2px solid ${AURORA.accent}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u, idx) => {
                  const sc = statusColors[u.status];
                  const initials = (u.full_name || u.email || 'U').charAt(0).toUpperCase();
                  return (
                    <tr key={u.id} className="transition cursor-pointer"
                      style={{ background: idx % 2 === 0 ? 'rgba(28,35,51,0.5)' : 'transparent' }}
                      onClick={() => setUsuarioPopup(u)}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(28,35,51,0.5)' : 'transparent'}>
                      <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate" style={{ color: AURORA.text }}>{u.nome_tratamento || u.full_name || '—'}</p>
                            <p className="text-[10px] truncate" style={{ color: AURORA.textDim }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: u.isAdminUser ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,249,0.12)', color: u.isAdminUser ? '#fbbf24' : '#60a5fa' }}>
                          {u.isAdminUser ? 'Admin' : 'Usuario'}
                        </span>
                        {u.ativo === false && (
                          <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Bloqueado</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: sc.bg, color: sc.text }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: u.sessao.inicio === '—' ? AURORA.textDim : '#9da7b3', borderBottom: `1px solid ${AURORA.border}` }}>
                        {u.sessao.inicio}
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: u.sessao.fim === 'Em sessao' ? '#34d399' : (u.sessao.fim === '—' ? AURORA.textDim : '#9da7b3'), borderBottom: `1px solid ${AURORA.border}`, fontWeight: u.sessao.fim === 'Em sessao' ? 600 : 400 }}>
                        {u.sessao.fim}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: u.sessao.duracao === '—' ? AURORA.textDim : AURORA.accent, borderBottom: `1px solid ${AURORA.border}` }}>
                        {u.sessao.duracao}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs" style={{ color: '#9da7b3', borderBottom: `1px solid ${AURORA.border}` }}>{u.menusCount}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: u.atua.vendas > 0 ? '#00D4AA' : AURORA.textDim, borderBottom: `1px solid ${AURORA.border}` }}>{u.atua.vendas}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: u.atua.mensagens > 0 ? '#60a5fa' : AURORA.textDim, borderBottom: `1px solid ${AURORA.border}` }}>{u.atua.mensagens}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: u.atua.chamados > 0 ? '#fbbf24' : AURORA.textDim, borderBottom: `1px solid ${AURORA.border}` }}>{u.atua.chamados}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: u.atua.interacoes > 0 ? '#a78bfa' : AURORA.textDim, borderBottom: `1px solid ${AURORA.border}` }}>{u.atua.interacoes}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: u.atua.agendas > 0 ? '#34d399' : AURORA.textDim, borderBottom: `1px solid ${AURORA.border}` }}>{u.atua.agendas}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: u.totalAtua > 0 ? '#00D4AA' : AURORA.textDim, borderBottom: `1px solid ${AURORA.border}` }}>{u.totalAtua}</td>
                    </tr>
                  );
                })}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-sm" style={{ color: AURORA.textDim }}>
                      <Users className="w-8 h-8 mx-auto mb-2" style={{ color: AURORA.textDim, opacity: 0.5 }} />
                      Nenhum usuario encontrado com os filtros selecionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ═══ POPUP DE DETALHE DO USUARIO ═══ */}
      {usuarioPopup && (
        <UserDetailPopup usuario={usuarioPopup} onClose={() => setUsuarioPopup(null)} />
      )}
    </div>
  );
}