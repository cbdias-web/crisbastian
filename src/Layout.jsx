import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { BarChart3, Table2, Users, Package, DollarSign, Upload, Target, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
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

  const menuItems = [
    { name: 'Dashboard', icon: BarChart3, page: 'Dashboard', allowUser: true },
    { name: 'Vendas', icon: Table2, page: 'Vendas', allowUser: true },
    { name: 'Comissões', icon: DollarSign, page: 'Comissoes', allowUser: false },
    { name: 'Comissões Espelhamento', icon: DollarSign, page: 'ComissoesEspelhamento', allowUser: false },
    { name: 'Metas', icon: Target, page: 'Metas', allowUser: true },
    { name: 'Vendedores', icon: Users, page: 'Vendedores', allowUser: false },
    { name: 'Produtos', icon: Package, page: 'Produtos', allowUser: false },
    { name: 'Importar', icon: Upload, page: 'Importar', allowUser: false },
  ].filter(item => isAdmin || item.allowUser);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg">
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Sistema de Vendas</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="dark:text-gray-300"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
        <nav className="p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
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