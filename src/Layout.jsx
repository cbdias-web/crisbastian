import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { BarChart3, Table2, Users, Package, DollarSign, Upload, Target, Moon, Sun, UserCheck, Edit2, Check, X, FileText, AlertTriangle } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setDisplayName(u?.nome_tratamento || u?.full_name || u?.email || '');
    }).catch(() => {});
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

  const menuItems = [
    { name: 'Dashboard', icon: BarChart3, page: 'Dashboard', allowUser: true },
    { name: 'Vendas', icon: Table2, page: 'Vendas', allowUser: true },
    { name: 'Comissões', icon: DollarSign, page: 'Comissoes', allowUser: false },
    { name: 'Relatório', icon: FileText, page: 'RelatorioComissoes', allowUser: false },
    { name: 'Metas', icon: Target, page: 'Metas', allowUser: true },
    { name: 'Clientes', icon: UserCheck, page: 'Clientes', allowUser: false },
    { name: 'Vendedores', icon: Users, page: 'Vendedores', allowUser: true },
    { name: 'Indicadores', icon: Users, page: 'Espelhamentos', allowUser: false },
    { name: 'Produtos', icon: Package, page: 'Produtos', allowUser: false },
    { name: 'Importar', icon: Upload, page: 'Importar', allowUser: false },
    { name: 'Notificações', icon: AlertTriangle, page: 'Notificacoes', allowUser: false, badge: notificacoesPendentes.length },
  ].filter(item => isAdmin || item.allowUser);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-800">
      <aside className="w-64 shadow-xl flex flex-col" style={{ background: 'linear-gradient(180deg, #0f1e35 0%, #1a3150 60%, #1e3a5f 100%)' }}>
        <div className="p-6 pb-4">
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
        <div className="px-5 pb-2">
          <p className="text-[10px] font-semibold text-blue-300/40 uppercase tracking-[0.2em]">Menu</p>
        </div>
        <nav className="px-3 pb-4 flex-1">
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
        </nav>
      </aside>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}