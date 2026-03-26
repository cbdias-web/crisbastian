import React, { useEffect, useState } from 'react';
import OnboardingModal from '@/components/OnboardingModal';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { BarChart3, Table2, Users, Package, DollarSign, Upload, Target, Moon, Sun, UserCheck, FileText, AlertTriangle, LogOut, BookOpen, Briefcase } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  const [aceite, setAceite] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  const totalPendentes = notificacoesPendentes.length + aceitesPendentes.length;

  const menusUsuario = user?.menus_acesso || ['Dashboard', 'Vendas', 'Vendedores'];

  const menuItems = [
    { name: 'Dashboard', icon: BarChart3, page: 'Dashboard', allowUser: true },
    { name: 'Vendas', icon: Table2, page: 'Vendas', allowUser: true },
    { name: 'Comissões', icon: DollarSign, page: 'Comissoes', allowUser: false },
    { name: 'Clientes', icon: UserCheck, page: 'Clientes', allowUser: false },
    { name: 'Vendedores', icon: Users, page: 'Vendedores', allowUser: true },
    { name: 'Indicadores', icon: Users, page: 'Espelhamentos', allowUser: false },
    { name: 'Notificações', icon: AlertTriangle, page: 'Notificacoes', allowUser: false, badge: totalPendentes },
    { name: 'Manual', icon: BookOpen, page: 'Manual', allowUser: true },
    { name: 'Meus Clientes', icon: Briefcase, page: 'MeusClientes', allowUser: true },
    { name: 'Rel. Interacoes', icon: FileText, page: 'RelatorioInteracoes', allowUser: true },
  ].filter(item => {
    if (isAdmin) return true;
    if (!item.allowUser) return false;
    return menusUsuario.includes(item.page);
  });

  const adminMenuItems = [
    { name: 'Relatório', icon: FileText, page: 'RelatorioComissoes' },
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

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-800">
      {showOnboarding && user && (
        <OnboardingModal
          user={user}
          aceite={aceite}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
      <aside className="w-64 shadow-xl flex flex-col fixed left-0 top-0 h-screen" style={{ background: 'linear-gradient(180deg, #0f1e35 0%, #1a3150 60%, #1e3a5f 100%)' }}>
        <div className="p-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Villela Exchange</h1>
              <p className="text-[11px] text-blue-300/60 mt-0.5 uppercase tracking-widest">Gestão Comercial</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="text-blue-200/70 hover:text-white hover:bg-white/10"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="px-5 pb-2 flex-shrink-0">
          <p className="text-[10px] font-semibold text-blue-300/40 uppercase tracking-[0.2em]">Menu</p>
        </div>
        <nav className="px-3 pb-4 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all relative ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold shadow-sm'
                    : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">{item.name}</span>
                {item.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {adminMenuItems.length > 0 && (
            <>
              <button
                onClick={() => setAdminMenuOpen(prev => !prev)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 mt-2 transition-all text-blue-100/70 hover:bg-white/10 hover:text-white"
              >
                <span className="text-[10px] font-semibold text-blue-300/60 uppercase tracking-[0.2em] flex-1 text-left">Administrativo</span>
                <svg className={`w-3.5 h-3.5 text-blue-300/50 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {adminMenuOpen && adminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all ${
                      isActive
                        ? 'bg-white/15 text-white font-semibold shadow-sm'
                        : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>
        
        {/* Menu fixo na base - sempre visível */}
        <div className="border-t border-white/10 p-3 space-y-1 flex-shrink-0">
          {isAdmin && (
            <Link
              to={createPageUrl('Usuarios')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                currentPageName === 'Usuarios'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Usuários</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-blue-100/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}