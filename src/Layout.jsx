import React, { useEffect, useState, useRef } from 'react';
import OnboardingModal from '@/components/OnboardingModal';
import ComunicadoModal from '@/components/ComunicadoModal';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { getImpersonatedVendedor, setImpersonatedVendedor, clearImpersonation } from '@/lib/impersonation';
import {
  BarChart3, Table2, Users, Package, DollarSign, Upload, Target, Moon, Sun,
  UserCheck, FileText, AlertTriangle, LogOut, BookOpen, Briefcase, Menu, X,
  Eye, EyeOff, Megaphone, Receipt, GraduationCap, TrendingUp, ScrollText,
  MessageSquare, Calculator, LifeBuoy, Activity, ChevronDown, Bell, Settings,
  Search
} from 'lucide-react';
import AssistenteFloating from '@/components/chat/AssistenteFloating.jsx';
import BannerAlertaSistema from '@/components/BannerAlertaSistema.jsx';
import MarketTicker from '@/components/MarketTicker.jsx';
import GoogleCalendarConectarModal from '@/components/GoogleCalendarConectarModal.jsx';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

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
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [aceite, setAceite] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [comunicadoPendente, setComunicadoPendente] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [impersonating, setImpersonating] = useState(() => getImpersonatedVendedor());
  const [vendedoresList, setVendedoresList] = useState([]);
  const [showImpersonateMenu, setShowImpersonateMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    // Force dark mode always
    document.documentElement.classList.add('dark');
    document.body.style.background = AURORA.bg;
  }, []);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
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
      try { await base44.auth.updateMe({ ultimo_acesso: new Date().toISOString() }); } catch (e) {}
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try { await base44.auth.updateMe({ ultimo_acesso: new Date().toISOString() }); } catch (e) {}
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleChange = () => setImpersonating(getImpersonatedVendedor());
    window.addEventListener('impersonation-change', handleChange);
    return () => window.removeEventListener('impersonation-change', handleChange);
  }, []);

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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenDropdown(null);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: notificacoesPendentes = [] } = useQuery({
    queryKey: ['notificacoes-pendentes'],
    queryFn: async () => {
      const all = await base44.entities.NotificacaoAutorizacao.list();
      return all.filter((n) => n.status === 'pendente');
    },
    enabled: isAdmin,
    refetchInterval: 30000
  });

  const { data: chamadosPendentes = [] } = useQuery({
    queryKey: ['chamados-pendentes-layout'],
    queryFn: async () => {
      if (!user) return [];
      const todos = await base44.entities.ChamadoSuporte.filter({ usuario_id: user.id });
      return todos.filter(c => ['aguardando_usuario','aberto','em_andamento'].includes(c.status));
    },
    enabled: !!user,
    refetchInterval: 30000
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
    refetchInterval: 15000
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
  const navGroups = [
    {
      label: 'Comercial',
      items: [
        { name: 'Dashboard', icon: BarChart3, page: 'Dashboard', alwaysVisible: true },
        { name: 'Vendas', icon: Table2, page: 'Vendas', allowUser: true },
        { name: 'Agenda do Dia', icon: Briefcase, page: 'MeusClientes', alwaysVisible: true },
        { name: 'Contratos', icon: ScrollText, page: 'Contratos', alwaysVisible: true },
        { name: 'Pipeline', icon: TrendingUp, page: 'Pipeline', alwaysVisible: true },
        { name: 'Precificação', icon: Calculator, page: 'Precificacao', alwaysVisible: true },
        { name: 'Desempenho', icon: Activity, page: 'Desempenho', alwaysVisible: true },
      ].filter(i => isAdmin || i.alwaysVisible || menusUsuario.includes(i.page))
    },
    {
      label: 'Apoio',
      items: [
        { name: 'Clientes', icon: UserCheck, page: 'Clientes', allowUser: false },
        { name: 'Vendedores', icon: Users, page: 'Vendedores', allowUser: true },
        { name: 'Indicadores', icon: Users, page: 'Espelhamentos', allowUser: false },
        { name: 'Chat Interno', icon: MessageSquare, page: 'ChatPage', alwaysVisible: true, badge: mensagensNaoLidas },
        { name: 'Rel. Interações', icon: FileText, page: 'RelatorioInteracoes', alwaysVisible: true },
        { name: 'Manual', icon: BookOpen, page: 'Manual', alwaysVisible: true },
        { name: 'Capacitação', icon: GraduationCap, page: 'Treinamento', alwaysVisible: true },
        { name: 'Suporte', icon: LifeBuoy, page: 'Suporte', alwaysVisible: true, badge: chamadosPendentes.length },
      ].filter(i => isAdmin || i.alwaysVisible || menusUsuario.includes(i.page))
    },
    ...(isAdmin ? [{
      label: 'Admin',
      items: [
        { name: 'Comissões', icon: DollarSign, page: 'Comissoes' },
        { name: 'Notificações', icon: AlertTriangle, page: 'Notificacoes', badge: totalPendentes },
        { name: 'Comunicados', icon: Megaphone, page: 'Comunicados' },
        { name: 'Notas Fiscais', icon: Receipt, page: 'NotasFiscais' },
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

  const NavLink = ({ item }) => {
    const isActive = currentPageName === item.page;
    const Icon = item.icon;
    return (
      <Link
        to={createPageUrl(item.page)}
        onClick={() => { setOpenDropdown(null); setMobileMenuOpen(false); }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all relative group"
        style={{
          color: isActive ? AURORA.accent : AURORA.text,
          background: isActive ? AURORA.accentDim : 'transparent',
          border: isActive ? `1px solid ${AURORA.border}` : '1px solid transparent',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,212,170,0.07)'; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{item.name}</span>
        {item.badge > 0 && (
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
            style={{ background: '#ef4444', color: '#fff' }}>
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: AURORA.bg, color: AURORA.text }}>
      {showOnboarding && user && (
        <OnboardingModal user={user} aceite={aceite} onComplete={() => setShowOnboarding(false)} />
      )}
      {!showOnboarding && comunicadoPendente && user && (
        <ComunicadoModal comunicado={comunicadoPendente} user={user} onClose={() => setComunicadoPendente(null)} />
      )}
      {!showOnboarding && user && <GoogleCalendarConectarModal />}

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

      {/* ═══ TOP NAVIGATION BAR ═══ */}
      <header
        className="fixed left-0 right-0 z-50 flex flex-col"
        style={{
          top: impersonating ? '36px' : '0',
          background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 60%, #16213e 100%)',
          borderBottom: `1px solid ${AURORA.border}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        {/* Row 1: Brand + actions */}
        <div className="flex items-center justify-between px-6 py-3">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
              VX
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: AURORA.text }}>Villela Exchange</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: AURORA.textMuted }}>Gestão Comercial</div>
            </div>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
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
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition"
                style={{ color: AURORA.textMuted }}
                onMouseEnter={e => e.currentTarget.style.background = AURORA.accentDim}
                onMouseLeave={e => { if (!showUserMenu) e.currentTarget.style.background = 'transparent'; }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
                  {(user?.nome_tratamento || user?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline text-sm" style={{ color: AURORA.text }}>
                  {(user?.nome_tratamento || user?.full_name || '').split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-1 w-44 rounded-xl shadow-2xl py-1 z-50"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                  <div className="px-3 py-2 text-xs" style={{ color: AURORA.textMuted, borderBottom: `1px solid ${AURORA.border}` }}>
                    {user?.email}
                  </div>
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

        {/* Row 2: Navigation tabs (desktop) */}
        {!isMobile && (
          <div className="flex items-center px-6 pb-2 gap-1" ref={dropdownRef}>
            {/* Dashboard quick link */}
            <Link to={createPageUrl('Dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition"
              style={{
                color: currentPageName === 'Dashboard' ? AURORA.accent : AURORA.textMuted,
                background: currentPageName === 'Dashboard' ? AURORA.accentDim : 'transparent',
                border: currentPageName === 'Dashboard' ? `1px solid ${AURORA.border}` : '1px solid transparent',
              }}>
              <BarChart3 className="w-3.5 h-3.5" />
              Dashboard
            </Link>

            {navGroups.map((group) => {
              const isOpen = openDropdown === group.label;
              const hasActive = group.items.some(i => i.page === currentPageName);
              const groupBadge = group.items.reduce((sum, i) => sum + (i.badge || 0), 0);

              return (
                <div key={group.label} className="relative">
                  <button
                    onClick={() => setOpenDropdown(isOpen ? null : group.label)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition relative"
                    style={{
                      color: hasActive || isOpen ? AURORA.accent : AURORA.textMuted,
                      background: hasActive || isOpen ? AURORA.accentDim : 'transparent',
                      border: hasActive || isOpen ? `1px solid ${AURORA.border}` : '1px solid transparent',
                    }}>
                    {group.label}
                    {groupBadge > 0 && (
                      <span className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
                    )}
                    <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="absolute top-full left-0 mt-2 rounded-xl shadow-2xl py-2 z-50 min-w-[200px]"
                      style={{
                        background: AURORA.surface2,
                        border: `1px solid ${AURORA.border}`,
                        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${AURORA.border}`,
                      }}>
                      {group.items.map(item => (
                        <NavLink key={item.page} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </header>

      {/* ═══ MOBILE FULL-SCREEN MENU ═══ */}
      {isMobile && mobileMenuOpen && (
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
          paddingTop: impersonating
            ? (isMobile ? '150px' : '116px')
            : (isMobile ? '110px' : '116px'),
          minHeight: '100vh',
          background: AURORA.bg,
        }}
      >
        <MarketTicker />
        <BannerAlertaSistema user={user} />
        {children}
        <AssistenteFloating />
      </main>
    </div>
  );
}