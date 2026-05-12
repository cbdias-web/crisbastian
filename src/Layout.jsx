import React, { useEffect, useState } from 'react';
import OnboardingModal from '@/components/OnboardingModal';
import ComunicadoModal from '@/components/ComunicadoModal';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { getImpersonatedVendedor, setImpersonatedVendedor, clearImpersonation } from '@/lib/impersonation';
import { BarChart3, Table2, Users, Package, DollarSign, Upload, Target, Moon, Sun, UserCheck, FileText, AlertTriangle, LogOut, BookOpen, Briefcase, Menu, X, Eye, EyeOff, Megaphone, Receipt, GraduationCap, TrendingUp, ScrollText, MessageSquare } from 'lucide-react';
import AssistenteFloating from '@/components/chat/AssistenteFloating.jsx';
import MarketTicker from '@/components/MarketTicker.jsx';
import GoogleCalendarConectarModal from '@/components/GoogleCalendarConectarModal.jsx';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [comercialMenuOpen, setComercialMenuOpen] = useState(true);
  const [apoioMenuOpen, setApoioMenuOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aceite, setAceite] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [comunicadoPendente, setComunicadoPendente] = useState(null);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      setDisplayName(u?.nome_tratamento || u?.full_name || u?.email || '');
      // Verificar aceite do usuário
      try {
        const aceites = await base44.entities.AceiteUsuario.filter({ user_id: u.id });
        const a = aceites[0] || null;
        setAceite(a);
        if (!a || !a.termo_aceito || !a.leitura_gestao_vendas) {
          setShowOnboarding(true);
        }
      } catch (e) {}
      // Verificar comunicados pendentes
      try {
        const comunicados = await base44.entities.Comunicado.filter({ ativo: true });
        if (comunicados.length > 0) {
          const leituras = await base44.entities.ComunicadoLeitura.filter({ user_id: u.id });
          const lidosIds = new Set(leituras.map(l => l.comunicado_id));
          const pendente = comunicados.find(c => !lidosIds.has(c.id));
          if (pendente) setComunicadoPendente(pendente);
        }
      } catch (e) {}
      // Registrar presença online
      try {
        await base44.auth.updateMe({ ultimo_acesso: new Date().toISOString() });
      } catch (e) {}
    }).catch(() => {});
  }, []);

  // Heartbeat: atualiza ultimo_acesso a cada 2 minutos enquanto o usuário está na página
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await base44.auth.updateMe({ ultimo_acesso: new Date().toISOString() });
      } catch (e) {}
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const saveDisplayName = async () => {
    if (!displayName.trim()) {
      toast.error('Nome não pode estar vazio');
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({ nome_tratamento: displayName.trim() });
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      setEditingName(false);
      toast.success('Nome atualizado!');
    } catch (error) {
      toast.error('Erro ao salvar nome');
    }
    setSaving(false);
  };

  const { data: notificacoesPendentes = [] } = useQuery({
    queryKey: ['notificacoes-pendentes'],
    queryFn: async () => {
      const all = await base44.entities.NotificacaoAutorizacao.list();
      return all.filter(n => n.status === 'pendente');
    },
    enabled: isAdmin,
    refetchInterval: 30000
  });

  const { data: aceitesPendentes = [] } = useQuery({
    queryKey: ['aceites-pendentes'],
    queryFn: async () => {
      const all = await base44.entities.AceiteUsuario.list();
      return all.filter(a => !a.leitura_gestao_vendas);
    },
    enabled: isAdmin,
    refetchInterval: 60000
  });

  const { data: todasMensagensChat = [] } = useQuery({
    queryKey: ['chat-unread-global'],
    queryFn: async () => {
      const all = await base44.entities.MensagemChat.list('-created_date', 100);
      return all.filter(m => m.remetente_email !== user?.email);
    },
    enabled: !!user,
    refetchInterval: 5000
  });

  // Zera badge automaticamente quando o usuário está na ChatPage
  const isOnChatPage = currentPageName === 'ChatPage';

  const mensagensNaoLidas = (() => {
    if (!user || !todasMensagensChat.length || isOnChatPage) return 0;
    let lastSeen = {};
    try { lastSeen = JSON.parse(localStorage.getItem('chat_last_seen') || '{}'); } catch {}
    let count = 0;
    for (const msg of todasMensagensChat) {
      const canal = msg.canal;
      const msgTime = new Date(msg.created_date).getTime();
      const seenTime = lastSeen[canal] ? new Date(lastSeen[canal]).getTime() : 0;
      if (msgTime > seenTime) count++;
    }
    return count;
  })();

  const totalPendentes = notificacoesPendentes.length + aceitesPendentes.length;

  const menusUsuario = user?.menus_acesso || ['Dashboard', 'Vendas', 'Vendedores'];

  // BLOCO COMERCIAL
  const menuComercial = [
    { name: 'Vendas', icon: Table2, page: 'Vendas', allowUser: true },
    { name: 'Agenda do Dia', icon: Briefcase, page: 'MeusClientes', allowUser: true, alwaysVisible: true },
    { name: 'Contratos', icon: ScrollText, page: 'Contratos', allowUser: true, alwaysVisible: true },
    { name: 'Pipeline', icon: TrendingUp, page: 'Pipeline', allowUser: true, alwaysVisible: true },
  ].filter(item => {
    if (isAdmin) return true;
    if (item.alwaysVisible) return true;
    if (!item.allowUser) return false;
    return menusUsuario.includes(item.page);
  });

  // BLOCO APOIO
  const menuApoio = [
    { name: 'Clientes', icon: UserCheck, page: 'Clientes', allowUser: false },
    { name: 'Vendedores', icon: Users, page: 'Vendedores', allowUser: true },
    { name: 'Indicadores', icon: Users, page: 'Espelhamentos', allowUser: false },
    { name: 'Chat Interno', icon: MessageSquare, page: 'ChatPage', allowUser: true, alwaysVisible: true },
    { name: 'Rel. Interações', icon: FileText, page: 'RelatorioInteracoes', allowUser: true, alwaysVisible: true },
    { name: 'Manual', icon: BookOpen, page: 'Manual', allowUser: true, alwaysVisible: true },
    { name: 'Capacitação', icon: GraduationCap, page: 'Treinamento', allowUser: true, alwaysVisible: true },
  ].filter(item => {
    if (isAdmin) return true;
    if (item.alwaysVisible) return true;
    return menusUsuario.includes(item.page);
  });

  // BLOCO ADMINISTRATIVO
  const menuItems = []; // mantido vazio, substituído pelos blocos acima

  const adminMenuItems = [
    { name: 'Comissões', icon: DollarSign, page: 'Comissoes' },
    { name: 'Notificações', icon: AlertTriangle, page: 'Notificacoes', badge: totalPendentes },
    { name: 'Comunicados', icon: Megaphone, page: 'Comunicados' },
    { name: 'Notas Fiscais', icon: Receipt, page: 'NotasFiscais' },
    { name: 'Capacitação (Admin)', icon: GraduationCap, page: 'TreinamentoAdmin' },
    { name: 'Relatório Comissões', icon: FileText, page: 'RelatorioComissoes' },
    { name: 'Prospecção', icon: Users, page: 'Leads' },
    { name: 'Metas', icon: Target, page: 'Metas' },
    { name: 'Produtos', icon: Package, page: 'Produtos' },
    { name: 'Importar', icon: Upload, page: 'Importar' },
  ].filter(item => {
    if (isAdmin) return true;
    return menusUsuario.includes(item.page);
  });

  const handleLogout = () => {
    if (confirm('Deseja realmente sair?')) {
      base44.auth.logout();
    }
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [impersonating, setImpersonating] = useState(() => getImpersonatedVendedor());
  const [vendedoresList, setVendedoresList] = useState([]);
  const [showImpersonateMenu, setShowImpersonateMenu] = useState(false);

  useEffect(() => {
    const handleChange = () => setImpersonating(getImpersonatedVendedor());
    window.addEventListener('impersonation-change', handleChange);
    return () => window.removeEventListener('impersonation-change', handleChange);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      base44.entities.Vendedor.filter({ ativo: true }, 'nome').then(setVendedoresList).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const allMenuItems = [
    { name: 'Dashboard', icon: BarChart3, page: 'Dashboard' },
    ...menuComercial,
    ...menuApoio,
    ...(adminMenuItems.length > 0 ? adminMenuItems : []),
    ...(isAdmin ? [{ name: 'Usuários', icon: Users, page: 'Usuarios' }] : []),
  ];

  const pageTitle = allMenuItems.find(m => m.page === currentPageName)?.name || currentPageName || 'Menu';

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-800">
      {showOnboarding && user && (
        <OnboardingModal
          user={user}
          aceite={aceite}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
      {!showOnboarding && comunicadoPendente && user && (
        <ComunicadoModal
          comunicado={comunicadoPendente}
          user={user}
          onClose={() => setComunicadoPendente(null)}
        />
      )}
      {!showOnboarding && user && <GoogleCalendarConectarModal />}

      {/* ===== MOBILE TOP BAR ===== */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 shadow-lg" style={{ background: 'linear-gradient(90deg, #0f1e35 0%, #1a3150 100%)' }}>
          <button onClick={() => setMobileMenuOpen(true)} className="text-white p-1.5">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-white font-semibold text-base">{pageTitle}</span>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
            {(user?.nome_tratamento || user?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* ===== MOBILE DRAWER OVERLAY ===== */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 h-full flex flex-col shadow-2xl" style={{ background: 'linear-gradient(180deg, #0f1e35 0%, #1a3150 60%, #1e3a5f 100%)' }}>
            <div className="p-5 flex items-center justify-between border-b border-white/10">
              <div>
                <h1 className="text-lg font-bold text-white">Villela Exchange</h1>
                <p className="text-[10px] text-blue-300/60 uppercase tracking-widest">Gestão Comercial</p>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {/* Dashboard */}
              {(() => {
                const isActive = currentPageName === 'Dashboard';
                return (
                  <Link to={createPageUrl('Dashboard')} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all ${isActive ? 'bg-white/15 text-white font-semibold' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'}`}>
                    <BarChart3 className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Dashboard</span>
                  </Link>
                );
              })()}

              {/* Comercial */}
              {menuComercial.length > 0 && <p className="text-[10px] font-semibold text-blue-300/40 uppercase tracking-[0.2em] px-2 mt-3 mb-1">Comercial</p>}
              {menuComercial.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all ${isActive ? 'bg-white/15 text-white font-semibold' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'}`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                );
              })}

              {/* Apoio */}
              {menuApoio.length > 0 && <p className="text-[10px] font-semibold text-blue-300/40 uppercase tracking-[0.2em] px-2 mt-3 mb-1">Apoio</p>}
              {menuApoio.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all ${isActive ? 'bg-white/15 text-white font-semibold' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'}`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                );
              })}

              {/* Administrativo */}
              {adminMenuItems.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-blue-300/40 uppercase tracking-[0.2em] px-2 mt-3 mb-1">Administrativo</p>
                  {adminMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPageName === item.page;
                    return (
                      <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all relative ${isActive ? 'bg-white/15 text-white font-semibold' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'}`}>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium">{item.name}</span>
                        {item.badge > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>
            <div className="border-t border-white/10 p-3 space-y-1">
              {isAdmin && (
                <Link to={createPageUrl('Usuarios')} onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                    currentPageName === 'Usuarios' ? 'bg-white/15 text-white' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                  }`}>
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Usuários</span>
                </Link>
              )}
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-blue-100/70 hover:bg-white/10 hover:text-white transition-all">
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ===== DESKTOP SIDEBAR ===== */}
      {!isMobile && (
      <aside className={`flex shadow-xl flex-col fixed left-0 top-0 h-screen transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`} style={{ background: 'linear-gradient(180deg, #0f1e35 0%, #1a3150 60%, #1e3a5f 100%)' }}>
        <div className={`${sidebarCollapsed ? 'p-3' : 'p-6 pb-4'} flex-shrink-0`}>
          <div className="flex items-center justify-between mb-2">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-white tracking-wide">Villela Exchange</h1>
                <p className="text-[11px] text-blue-300/60 mt-0.5 uppercase tracking-widest">Gestão Comercial</p>
              </div>
            )}
            <div className={`flex items-center gap-1 ${sidebarCollapsed ? 'flex-col w-full' : ''}`}>
              {!sidebarCollapsed && (
                <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)} className="text-blue-200/70 hover:text-white hover:bg-white/10">
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(c => !c)} className="text-blue-200/70 hover:text-white hover:bg-white/10">
                {sidebarCollapsed ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>}
              </Button>
            </div>
          </div>
          {!sidebarCollapsed && (
            <div className="mt-2">
              <input
                type="text"
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                placeholder="Buscar menu..."
                className="w-full px-3 py-1.5 text-xs bg-white/10 text-white placeholder-blue-300/50 border border-white/10 rounded-lg focus:outline-none focus:border-white/30"
              />
            </div>
          )}
        </div>
        <nav className="px-3 pb-4 flex-1 overflow-y-auto">
          {/* Dashboard sempre no topo */}
          {(() => {
            const isActive = currentPageName === 'Dashboard';
            return (
              <Link to={createPageUrl('Dashboard')} title={sidebarCollapsed ? 'Dashboard' : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all relative ${sidebarCollapsed ? 'justify-center px-2' : ''} ${
                  isActive ? 'bg-white/15 text-white font-semibold shadow-sm' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                }`}>
                <BarChart3 className="w-4 h-4 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm font-medium">Dashboard</span>}
              </Link>
            );
          })()}

          {/* BLOCO COMERCIAL */}
          {menuComercial.filter(item => !sidebarSearch || item.name.toLowerCase().includes(sidebarSearch.toLowerCase())).length > 0 && !sidebarCollapsed && (
            <button onClick={() => setComercialMenuOpen(prev => !prev)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 mt-3 transition-all text-blue-100/70 hover:bg-white/10 hover:text-white">
              <span className="text-[10px] font-semibold text-blue-300/60 uppercase tracking-[0.2em] flex-1 text-left">Comercial</span>
              <svg className={`w-3.5 h-3.5 text-blue-300/50 transition-transform ${comercialMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
          {(comercialMenuOpen || sidebarCollapsed) && menuComercial.filter(item => !sidebarSearch || item.name.toLowerCase().includes(sidebarSearch.toLowerCase())).map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link key={item.page} to={createPageUrl(item.page)} title={sidebarCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all relative ${sidebarCollapsed ? 'justify-center px-2' : ''} ${
                  isActive ? 'bg-white/15 text-white font-semibold shadow-sm' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            );
          })}

          {/* BLOCO APOIO */}
          {menuApoio.filter(item => !sidebarSearch || item.name.toLowerCase().includes(sidebarSearch.toLowerCase())).length > 0 && !sidebarCollapsed && (
            <button onClick={() => setApoioMenuOpen(prev => !prev)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 mt-3 transition-all text-blue-100/70 hover:bg-white/10 hover:text-white">
              <span className="text-[10px] font-semibold text-blue-300/60 uppercase tracking-[0.2em] flex-1 text-left">Apoio</span>
              <svg className={`w-3.5 h-3.5 text-blue-300/50 transition-transform ${apoioMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
          {(apoioMenuOpen || sidebarCollapsed) && menuApoio.filter(item => !sidebarSearch || item.name.toLowerCase().includes(sidebarSearch.toLowerCase())).map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link key={item.page} to={createPageUrl(item.page)} title={sidebarCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all relative ${sidebarCollapsed ? 'justify-center px-2' : ''} ${
                  isActive ? 'bg-white/15 text-white font-semibold shadow-sm' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm font-medium">{item.name}</span>}
                {item.page === 'ChatPage' && mensagensNaoLidas > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{mensagensNaoLidas > 9 ? '9+' : mensagensNaoLidas}</span>
                )}
              </Link>
            );
          })}

          {/* BLOCO ADMINISTRATIVO */}
          {adminMenuItems.length > 0 && !sidebarCollapsed && (
            <>
              <button onClick={() => setAdminMenuOpen(prev => !prev)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 mt-3 transition-all text-blue-100/70 hover:bg-white/10 hover:text-white">
                <span className="text-[10px] font-semibold text-blue-300/60 uppercase tracking-[0.2em] flex-1 text-left">Administrativo</span>
                {!adminMenuOpen && totalPendentes > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{totalPendentes}</span>
                )}
                <svg className={`w-3.5 h-3.5 text-blue-300/50 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {adminMenuOpen && adminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link key={item.page} to={createPageUrl(item.page)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all relative ${
                      isActive ? 'bg-white/15 text-white font-semibold shadow-sm' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                    }`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.name}</span>
                    {item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </>
          )}
          {/* Administrativo colapsado: ícones com badge */}
          {adminMenuItems.length > 0 && sidebarCollapsed && adminMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link key={item.page} to={createPageUrl(item.page)} title={item.name}
                className={`flex items-center justify-center px-2 py-2.5 rounded-xl mb-1 transition-all relative ${
                  isActive ? 'bg-white/15 text-white' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.badge > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3 space-y-1 flex-shrink-0">
          {isAdmin && (
            <>
              <Link to={createPageUrl('Usuarios')} title={sidebarCollapsed ? 'Usuários' : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${sidebarCollapsed ? 'justify-center px-2' : ''} ${
                  currentPageName === 'Usuarios' ? 'bg-white/15 text-white font-semibold' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                }`}>
                <Users className="w-4 h-4 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm font-medium">Usuários</span>}
              </Link>
              {!sidebarCollapsed && (
                <div className="relative">
                  <button onClick={() => setShowImpersonateMenu(p => !p)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                      impersonating ? 'bg-amber-500/30 text-amber-200' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                    }`}>
                    <Eye className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{impersonating ? `Espelhando: ${impersonating.nome.split(' ')[0]}` : 'Espelhar Vendedor'}</span>
                  </button>
                  {showImpersonateMenu && (
                    <div className="absolute bottom-full left-0 mb-1 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 max-h-64 overflow-y-auto">
                      {impersonating && (
                        <button onClick={() => { clearImpersonation(); setShowImpersonateMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 font-semibold">
                          <EyeOff className="w-3.5 h-3.5" /> Sair do Espelhamento
                        </button>
                      )}
                      <div className="my-1 border-t border-gray-100" />
                      {vendedoresList.map(v => (
                        <button key={v.id} onClick={() => { setImpersonatedVendedor(v); setShowImpersonateMenu(false); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition ${
                            impersonating?.id === v.id ? 'font-semibold text-[#1a3150] bg-blue-50' : 'text-gray-700'
                          }`}>
                          {v.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          <button onClick={handleLogout} title={sidebarCollapsed ? 'Sair' : undefined} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-blue-100/70 hover:bg-white/10 hover:text-white transition-all ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>
        </aside>
        )}

      {/* ===== IMPERSONATION BANNER ===== */}
      {impersonating && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-4 py-2 text-white text-sm font-semibold" style={{ background: '#b45309' }}>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>Você está vendo como: <strong>{impersonating.nome}</strong></span>
          </div>
          <button onClick={() => { clearImpersonation(); }} className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs transition">
            <EyeOff className="w-3.5 h-3.5" /> Sair do Espelhamento
          </button>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className={`flex-1 min-w-0 overflow-x-hidden transition-all duration-300 ${!isMobile ? (sidebarCollapsed ? 'ml-16' : 'ml-64') : 'pt-14'} ${impersonating ? (isMobile ? 'pt-24' : 'pt-10') : ''}`}>
        <MarketTicker />
        {children}
        <AssistenteFloating />
      </main>
    </div>
  );
}