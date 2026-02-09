import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { BarChart3, Table2, Users, Package, DollarSign, Upload } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const menuItems = [
    { name: 'Dashboard', icon: BarChart3, page: 'Dashboard' },
    { name: 'Vendas', icon: Table2, page: 'Vendas' },
    { name: 'Comissões', icon: DollarSign, page: 'Comissoes' },
    { name: 'Vendedores', icon: Users, page: 'Vendedores' },
    { name: 'Produtos', icon: Package, page: 'Produtos' },
    { name: 'Importar', icon: Upload, page: 'Importar' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-600">Sistema de Vendas</h1>
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
                    : 'text-gray-700 hover:bg-gray-100'
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