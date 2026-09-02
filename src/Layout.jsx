import React, { useEffect, useState, useRef } from 'react';
import OnboardingModal from '@/components/OnboardingModal';
import ComunicadoModal from '@/components/ComunicadoModal';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { getImpersonatedVendedor, setImpersonatedVendedor, clearImpersonation } from '@/lib/impersonation';
import {
  BarChart3, Table2, Users, Package, DollarSign, Upload, Target, Moon, Sun,
  UserCheck, FileText, AlertTriangle, LogOut, BookOpen, Briefcase, Menu, X,
  Eye, EyeOff, Megaphone, Receipt, GraduationCap, TrendingUp, ScrollText,
  MessageSquare, Calculator, LifeBuoy, Activity, ChevronDown, Bell, Settings,
  Search, Zap, Rocket, Newspaper, Bot, User, Handshake
} from 'lucide-react';
import AssistenteFloating from '@/components/chat/AssistenteFloating.jsx';
import ProfileModal from '@/components/ProfileModal.jsx';
import BannerAlertaSistema from '@/components/BannerAlertaSistema.jsx';
import MarketTicker from '@/components/MarketTicker.jsx';
import HeaderNav from '@/components/layout/HeaderNav.jsx';
import GoogleCalendarConectarModal from '@/components/GoogleCalendarConectarModal.jsx';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useAcessoDashParceiro } from '@/hooks/useAcessoDashParceiro';

// Aurora Borealis color tokens
const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.12)',
  accentGlow: 'rgba(0,212,170,0.25)',
  navBg: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 50%, #16213e 100%)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  cardBg: 'rgba(28,35,51,0.85)',
  cardBorder: 'rgba(0,212,170,0.18)',
};

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [parceiroByEmail, setParceiroByEmail] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [aceite, setAceite] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [comunicadoPendente, setComunicadoPendente] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [impersonating, setImpersonating] = useState(() => getImpersonatedVendedor());
  const [vendedoresList, setVendedoresList] = useState([]);
  const [showImpersonateMenu, setShowImpersonateMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const userMenuRef = useRef(null);

  useEffect(() => {
    // Force dark mode always
    document.documentElement.classList.add('dark');
    document.body.style.background = AURORA.bg;
  }, []);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      // Sinal robusto de Indicador: e-mail cadastrado em Parceiro ativo
      // (o usuário convidado só é criado ao aceitar o convite, então o role/flag
      //  podem não estar setados no primeiro login — o casamento por e-mail garante).
      try {
        if (u && u.role !== 'admin' && u.email) {
          const ps = await base44.entities.Parceiro.filter({ email: u.email });
          if (ps.length > 0 && ps[0].ativo !== false) {
            setParceiroByEmail(ps[0]);
            // Auto-correção: grava a flag indicador no próprio usuário para que
            // sessões futuras não dependam desta consulta (rede de segurança caso
            // a promoção feita no convite tenha falhado silenciosamente).
            if (u.indicador !== true && u.role !== 'indicador') {
              try { await base44.auth.updateMe({ indicador: true }); } catch (e) {}
            }
          }
        }
      } catch (e) {}
      try {
        const imp = getImpersonatedVendedor();
        if (imp?.avatar_url) {
          setUserAvatar(imp.avatar_url);
        } else if (u?.avatar_url) {
          setUserAvatar(u.avatar_url);
        } else if (u?.email) {
          const vends = await base44.entities.Vendedor.filter({ email: u.email });
          if (vends.length > 0 && vends[0].avatar_url) setUserAvatar(vends[0].avatar_url);
        }
      } catch (e) {}
      try {
        const aceites = await base44.entities.AceiteUsuario.filter({ user_id: u.id });
        const a = aceites[0] || null;
        setAceite(a);
        if (!a || !a.termo_aceito || !a.leitura_gestao_vendas) setShowOnboarding(true);
      } catch (e) {}
      try {
        const comunicados = await base44.entities.Comunicado.filter({ ativo: true });
        if (comunicados.length > 0) {
          const leituras = await base44.entities.ComunicadoLeitura.filter({ user_id: u.id });
          const lidosIds = new Set(leituras.map((l) => l.comunicado_id));
          const pendente = comunicados.find((c) => !lidosIds.has(c.id));
          if (pendente) setComunicadoPendente(pendente);
        }
      } catch (e) {}
      const agora = new Date().toISOString();
      try {
        await base44.auth.updateMe({ ultimo_acesso: agora });

        // Tentar reusar sessao existente (refresh nao cria nova sessao)
        const existingSessionId = localStorage.getItem('current_session_id');
        let sessionReused = false;

        if (existingSessionId) {
          try {
            const existing = await base44.entities.SessaoUsuario.get(existingSessionId);
            if (existing && existing.user_id === u.id) {
              // Reusar sessao se ainda ativa ou se heartbeat foi ha menos de 10 min
              // (10 min = mesmo threshold do scheduler limparSessoesStale)
              const heartbeatAge = existing.ultimo_heartbeat
                ? (Date.now() - new Date(existing.ultimo_heartbeat).getTime()) / 1000 / 60
                : 999;
              if (existing.ativa || heartbeatAge <= 10) {
                await base44.entities.SessaoUsuario.update(existingSessionId, {
                  ativa: true,
                  fim: null,
                  ultimo_heartbeat: agora,
                });
                sessionReused = true;
              }
            }
          } catch (e) {
            // Sessao nao existe mais
          }
        }

        if (!sessionReused) {
          // Fechar sessoes antigas que ficaram abertas (cleanup)
          try {
            await base44.functions.invoke('registrarFimSessao', { user_id: u.id, close_all: true });
          } catch (e) {}

          // Criar nova sessao individual (com retry + fallback backend)
          let sessaoCriada = null;
          for (let tentativa = 1; tentativa <= 3 && !sessaoCriada; tentativa++) {
            try {
              sessaoCriada = await base44.entities.SessaoUsuario.create({
                user_id: u.id,
                user_email: u.email,
                user_name: u.full_name || u.nome_tratamento || '',
                inicio: agora,
                ativa: true,
                ultimo_heartbeat: agora,
                duracao_min: 0,
              });
            } catch (e) {
              console.error(`[Layout] Tentativa ${tentativa} - Erro ao criar sessão:`, e?.message || e);
              if (tentativa < 3) await new Promise(r => setTimeout(r, 1000 * tentativa));
            }
          }
          if (sessaoCriada) {
            localStorage.setItem('current_session_id', sessaoCriada.id);
            try { await base44.auth.updateMe({ acesso_inicio: agora }); } catch (e) {}
          } else {
            // Fallback: função backend com service role
            try {
              const resp = await base44.functions.invoke('registrarAtividadeUsuario', {});
              if (resp?.data?.session_id) {
                localStorage.setItem('current_session_id', resp.data.session_id);
                try { await base44.auth.updateMe({ acesso_inicio: agora }); } catch (e) {}
              }
            } catch (e) {
              console.error('[Layout] Fallback backend também falhou:', e?.message || e);
            }
          }
        }
      } catch (e) {}
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const agora = new Date().toISOString();
        try { await base44.auth.updateMe({ ultimo_acesso: agora }); } catch (e) {}
        const sessionId = localStorage.getItem('current_session_id');
        if (sessionId) {
          try {
            await base44.entities.SessaoUsuario.update(sessionId, { ultimo_heartbeat: agora });
          } catch (e) {
            // Fallback: atualizar via backend (service role)
            try { await base44.functions.invoke('registrarAtividadeUsuario', { session_id: sessionId }); } catch (e2) {}
          }
        }
      } catch (e) {}
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Atualizar heartbeat ao sair da pagina (sem fechar a sessao)
  // O scheduler limparSessoesStale fecha sessoes inativas (>10 min sem heartbeat)
  useEffect(() => {
    const updateHeartbeatOnExit = () => {
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId) return;
      try {
        base44.entities.SessaoUsuario.update(sessionId, {
          ultimo_heartbeat: new Date().toISOString(),
        }).catch(() => {});
      } catch (e) {}
    };

    window.addEventListener('pagehide', updateHeartbeatOnExit);
    return () => {
      window.removeEventListener('pagehide', updateHeartbeatOnExit);
    };
  }, []);

  useEffect(() => {
    const handleChange = () => {
      const imp = getImpersonatedVendedor();
      setImpersonating(imp);
      if (imp?.avatar_url) {
        setUserAvatar(imp.avatar_url);
      } else if (user?.avatar_url) {
        setUserAvatar(user.avatar_url);
      } else if (user?.email) {
        base44.entities.Vendedor.filter({ email: user.email })
          .then(vends => { if (vends.length > 0 && vends[0].avatar_url) setUserAvatar(vends[0].avatar_url); })
          .catch(() => {});
      }
    };
    window.addEventListener('impersonation-change', handleChange);
    return () => window.removeEventListener('impersonation-change', handleChange);
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      base44.entities.Vendedor.filter({ ativo: true }, 'nome').then(setVendedoresList).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;
  const isIndicador = user?.role === 'indicador' || user?.indicador === true || !!parceiroByEmail;
  const isHenriqueStein = user?.email === 'henrique.stein@psjunior.com';
  // Dash Parceiro (somente leitura): gerentes/SDRs atuando na Fila de Contatos
  const { data: podeVerDashParceiro = false } = useAcessoDashParceiro(user);

  // Indicador: sempre cai no Dash Parceiro, que entrega a experiência completa do portal
  // (termo de uso → boas-vindas → 2 menus: Indicar + Dash/acompanhar).
  useEffect(() => {
    if (isIndicador && currentPageName !== 'DashParceiro') {
      navigate('/DashParceiro', { replace: true });
    }
  }, [isIndicador, currentPageName, navigate]);

  const { data: notificacoesPendentes = [] } = useQuery({
    queryKey: ['notificacoes-pendentes'],
    queryFn: async () => {
      const all = await base44.entities.NotificacaoAutorizacao.list();
      return all.filter((n) => n.status === 'pendente');
    },
    enabled: isAdmin,
    refetchInterval: 60000
  });

  const { data: chamadosPendentes = [] } = useQuery({
    queryKey: ['chamados-pendentes-layout'],
    queryFn: async () => {
      if (!user) return [];
      const todos = await base44.entities.ChamadoSuporte.filter({ usuario_id: user.id });
      return todos.filter(c => ['aguardando_usuario','aberto','em_andamento'].includes(c.status));
    },
    enabled: !!user,
    refetchInterval: 60000
  });

  // Indicações novas (não visualizadas) — badge do link Dash Parceiro no cabeçalho
  const { data: novasIndicacoes = [] } = useQuery({
    queryKey: ['indicacoes-novas-badge'],
    queryFn: async () => {
      const all = await base44.entities.LeadIndicacao.list('-created_date', 200);
      return all.filter(i => i.nova === true);
    },
    enabled: isAdmin,
    refetchInterval: 60000
  });

  const { data: todasMensagensChat = [] } = useQuery({
    queryKey: ['chat-unread-global'],
    queryFn: async () => {
      const all = await base44.entities.MensagemChat.list('-created_date', 100);
      return all.filter((m) => {
        if (m.remetente_email === user?.email) return false;
        if (m.tipo_canal === 'direto') return m.destinatario_email === user?.email;
        return true;
      });
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  const isOnChatPage = currentPageName === 'ChatPage';
  useEffect(() => {
    if (!isOnChatPage) return;
    const now = new Date().toISOString();
    let lastSeen = {};
    try { lastSeen = JSON.parse(localStorage.getItem('chat_last_seen') || '{}'); } catch {}
    for (const msg of todasMensagensChat) lastSeen[msg.canal] = now;
    for (const canal of ['geral', 'comercial', 'avisos']) lastSeen[canal] = now;
    localStorage.setItem('chat_last_seen', JSON.stringify(lastSeen));
  }, [isOnChatPage, todasMensagensChat]);

  const mensagensNaoLidas = (() => {
    if (!user || !todasMensagensChat.length || isOnChatPage) return 0;
    let lastSeen = {};
    try { lastSeen = JSON.parse(localStorage.getItem('chat_last_seen') || '{}'); } catch {}
    let count = 0;
    for (const msg of todasMensagensChat) {
      const msgTime = new Date(msg.created_date).getTime();
      const seenTime = lastSeen[msg.canal] ? new Date(lastSeen[msg.canal]).getTime() : 0;
      if (msgTime > seenTime) count++;
    }
    return count;
  })();

  const totalPendentes = notificacoesPendentes.length;

  const menusUsuario = user?.menus_acesso || ['Dashboard', 'Vendas', 'Vendedores'];

  // ─── Navigation groups ────────────────────────────────────────────────
  const navGroups = isIndicador ? [{
    label: 'Indicador',
    items: [{ name: 'Meu Painel', icon: Handshake, page: 'DashParceiro', alwaysVisible: true }],
  }] : [
    {
      label: 'Comercial',
      items: [
        { name: 'Dashboard', icon: BarChart3, page: 'Dashboard', alwaysVisible: true },
        { name: 'Vendas', icon: Table2, page: 'Vendas', allowUser: true },
        { name: 'Fila de Contatos', icon: Zap, page: 'FilaContato', alwaysVisible: true },
        { name: 'Contratos', icon: ScrollText, page: 'Contratos', alwaysVisible: true },
        { name: 'Implantações', icon: Rocket, page: 'Implantacoes', alwaysVisible: true },
        { name: 'Pipeline', icon: TrendingUp, page: 'Pipeline', alwaysVisible: true },
        { name: 'Desempenho', icon: Activity, page: 'Desempenho', alwaysVisible: true },
      ].filter(i => isAdmin || i.alwaysVisible || menusUsuario.includes(i.page))
    },
    {
      label: 'Apoio',
      items: [
        { name: 'Clientes', icon: UserCheck, page: 'Clientes', allowUser: false },
        { name: 'Vendedores', icon: Users, page: 'Vendedores', allowUser: true },
        { name: 'Indicadores', icon: Users, page: 'Espelhamentos', allowUser: false },
        { name: 'Dash Parceiro', icon: Handshake, page: 'DashParceiro', gateEsteira: true },
        { name: 'Rel. Interações', icon: FileText, page: 'RelatorioInteracoes', alwaysVisible: true },
        { name: 'Manual', icon: BookOpen, page: 'Manual', alwaysVisible: true },
        { name: 'Capacitação', icon: GraduationCap, page: 'Treinamento', alwaysVisible: true },
        { name: 'Assistente IA', icon: Bot, page: 'AssistenteTreinamentos', alwaysVisible: true },
        { name: 'Suporte', icon: LifeBuoy, page: 'Suporte', alwaysVisible: true, badge: chamadosPendentes.length },
      ].filter(i => isAdmin || i.alwaysVisible || menusUsuario.includes(i.page) || (i.gateEsteira && podeVerDashParceiro))
    },
    ...(isAdmin ? [{
      label: 'Admin',
      items: [
        { name: 'Comissões', icon: DollarSign, page: 'Comissoes' },
        { name: 'Notificações', icon: AlertTriangle, page: 'Notificacoes', badge: totalPendentes },
        { name: 'Comunicados', icon: Megaphone, page: 'Comunicados' },
        { name: 'Capacitação (Admin)', icon: GraduationCap, page: 'TreinamentoAdmin' },
        { name: 'Rel. Comissões', icon: FileText, page: 'RelatorioComissoes' },
        { name: 'Prospecção', icon: Users, page: 'Leads' },
        { name: 'Metas', icon: Target, page: 'Metas' },
        { name: 'Produtos', icon: Package, page: 'Produtos' },
        { name: 'Importar', icon: Upload, page: 'Importar' },
        { name: 'Usuários', icon: Users, page: 'Usuarios' },
      ]
    }] : [])
  ];

  const handleLogout = () => {
    if (confirm('Deseja realmente sair?')) base44.auth.logout();
  };

  return (
    <div style={{ minHeight: '100vh', background: AURORA.bg, color: AURORA.text }}>
      {/* ═══ BACKGROUND WATERMARK (fixed, com overlay escuro) ═══ */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: `url("${isHenriqueStein ? 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/a807d1c54_generated_image.png' : 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/ed94a18f2_generated_image.png'}")`,
          backgroundSize: isHenriqueStein ? 'contain' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: isHenriqueStein ? 'no-repeat' : 'no-repeat',
          opacity: isHenriqueStein ? 0.18 : 0.45,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          background: 'linear-gradient(180deg, rgba(13,17,23,0.55) 0%, rgba(13,17,23,0.45) 40%, rgba(13,17,23,0.60) 100%)',
          pointerEvents: 'none',
        }}
      />

      {showOnboarding && user && !isIndicador && (
        <OnboardingModal user={user} aceite={aceite} onComplete={() => setShowOnboarding(false)} />
      )}
      {!showOnboarding && comunicadoPendente && user && (
        <ComunicadoModal comunicado={comunicadoPendente} user={user} onClose={() => setComunicadoPendente(null)} />
      )}
      {!showOnboarding && user && <GoogleCalendarConectarModal />}

      {showProfileModal && user && (
        <ProfileModal
          user={user}
          userAvatar={userAvatar}
          onAvatarChange={(url, updatedUser) => {
            if (url !== undefined) setUserAvatar(url);
            if (updatedUser) setUser(updatedUser);
          }}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* ═══ IMPERSONATION BANNER ═══ */}
      {impersonating && (
        <div className="fixed top-0 left-0 right-0 z-[70] flex items-center justify-between px-4 py-2 text-sm font-semibold"
          style={{ background: 'linear-gradient(90deg, #b45309, #d97706)', color: '#fff' }}>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>Espelhando: <strong>{impersonating.nome}</strong></span>
          </div>
          <button onClick={() => clearImpersonation()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <EyeOff className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      )}

      {/* ═══ TOP NAVIGATION BAR ═══ (oculto para indicadores — usam o cabeçalho próprio do PortalIndicadorAuth) */}
      {!isIndicador && (
      <header
        className="fixed left-0 right-0 z-50 flex flex-col"
        style={{
          top: impersonating ? '36px' : '0',
          background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 60%, #16213e 100%)',
          borderBottom: `1px solid ${AURORA.border}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        {/* Single row: Brand + Navigation + Actions */}
        <div className="flex items-center px-6 py-3 gap-4">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
              VX
            </div>
            <div>
              <div className="font-bold text-sm leading-tight" style={{ color: AURORA.text }}>{isHenriqueStein ? 'PS JUNIOR' : 'Villela Exchange'}</div>
              <div className="text-[9px] uppercase tracking-widest leading-tight" style={{ color: AURORA.textMuted }}>{isHenriqueStein ? 'Colorada' : 'Gestão Comercial'}</div>
            </div>
          </Link>

          {/* Divider between brand and navigation */}
          <div className="hidden md:block h-7 w-px flex-shrink-0" style={{ background: AURORA.border }} />

          {/* Navigation menus (desktop) — drag-and-drop para admin reordenar */}
          {!isMobile && (
            <HeaderNav
              user={user}
              currentPageName={currentPageName}
              isIndicador={isIndicador}
              isAdmin={isAdmin}
              groups={navGroups}
              dashBadge={novasIndicacoes.length}
            />
          )}

          {/* Right side actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications bell */}
            {isAdmin && totalPendentes > 0 && (
              <Link to={createPageUrl('Notificacoes')} className="relative p-2 rounded-lg transition"
                style={{ color: AURORA.textMuted }}
                onMouseEnter={e => e.currentTarget.style.background = AURORA.accentDim}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
              </Link>
            )}

            {/* Impersonate (admin) */}
            {isAdmin && (
              <div className="relative" ref={null}>
                <button onClick={() => setShowImpersonateMenu(p => !p)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition"
                  style={{
                    background: impersonating ? 'rgba(180,83,9,0.3)' : AURORA.accentDim,
                    color: impersonating ? '#fbbf24' : AURORA.accent,
                    border: `1px solid ${impersonating ? 'rgba(180,83,9,0.5)' : AURORA.border}`,
                  }}>
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{impersonating ? impersonating.nome.split(' ')[0] : 'Espelhar'}</span>
                </button>
                {showImpersonateMenu && (
                  <div className="absolute top-full right-0 mt-1 w-52 rounded-xl shadow-2xl py-1 z-50 max-h-64 overflow-y-auto"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                    {impersonating && (
                      <button onClick={() => { clearImpersonation(); setShowImpersonateMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold"
                        style={{ color: '#fbbf24' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <EyeOff className="w-3.5 h-3.5" /> Sair do Espelhamento
                      </button>
                    )}
                    <div style={{ borderTop: `1px solid ${AURORA.border}`, margin: '4px 0' }} />
                    {vendedoresList.map(v => (
                      <button key={v.id} onClick={() => { setImpersonatedVendedor(v); setShowImpersonateMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm transition"
                        style={{ color: impersonating?.id === v.id ? AURORA.accent : AURORA.text }}
                        onMouseEnter={e => e.currentTarget.style.background = AURORA.accentDim}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {v.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* User avatar menu */}
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(p => !p)}
                className="flex items-center gap-3 px-3 py-1.5 rounded-2xl transition"
                style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = AURORA.surface2}
                onMouseLeave={e => { if (!showUserMenu) e.currentTarget.style.background = AURORA.surface; }}>
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: AURORA.textMuted }}>Bem Vindo</p>
                  <p className="text-sm font-semibold leading-tight" style={{ color: AURORA.text }}>
                    {user?.nome_tratamento || user?.full_name || 'Usuário'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
                  {userAvatar
                    ? <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    : (user?.nome_tratamento || user?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />
              </button>
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-1 w-44 rounded-xl shadow-2xl py-1 z-50"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                  <div className="px-3 py-2 text-xs" style={{ color: AURORA.textMuted, borderBottom: `1px solid ${AURORA.border}` }}>
                    {user?.email}
                  </div>
                  <button onClick={() => { setShowUserMenu(false); setShowProfileModal(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm transition"
                    style={{ color: AURORA.text }}
                    onMouseEnter={e => e.currentTarget.style.background = AURORA.accentDim}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <User className="w-4 h-4" /> Meu Perfil
                  </button>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm transition"
                    style={{ color: '#f87171' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            {isMobile && (
              <button onClick={() => setMobileMenuOpen(p => !p)} className="p-2 rounded-lg"
                style={{ color: AURORA.text }}>
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </header>
      )}

      {/* ═══ MOBILE FULL-SCREEN MENU ═══ */}
      {!isIndicador && isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: 'rgba(13,17,23,0.98)', paddingTop: '60px' }}>
          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <Link to={createPageUrl('Dashboard')} onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl mb-2 text-sm font-medium"
              style={{
                color: currentPageName === 'Dashboard' ? AURORA.accent : AURORA.text,
                background: currentPageName === 'Dashboard' ? AURORA.accentDim : AURORA.surface,
                border: `1px solid ${AURORA.border}`,
              }}>
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </Link>
            {navGroups.map(group => (
              <div key={group.label} className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-1"
                  style={{ color: AURORA.accent, opacity: 0.7 }}>
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = currentPageName === item.page;
                    return (
                      <Link key={item.page} to={createPageUrl(item.page)}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium"
                        style={{
                          color: isActive ? AURORA.accent : AURORA.text,
                          background: isActive ? AURORA.accentDim : 'transparent',
                          border: isActive ? `1px solid ${AURORA.border}` : '1px solid transparent',
                        }}>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.name}</span>
                        {item.badge > 0 && (
                          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: '#ef4444', color: '#fff' }}>
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="p-4 border-t" style={{ borderColor: AURORA.border }}>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
              style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}>
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          paddingTop: isIndicador
            ? '0px'
            : (impersonating ? '116px' : '80px'),
          minHeight: '100vh',
          background: 'transparent',
        }}
      >
        {!isIndicador && (
          <div style={{ marginBottom: 10 }}>
            <MarketTicker />
          </div>
        )}
        <BannerAlertaSistema user={user} />
        {children}
      </main>

      {/* Jarvis fora do <main> para não ser tapado pelo cabeçalho fixo (z-50) */}
      {!isIndicador && <AssistenteFloating />}
    </div>
  );
}