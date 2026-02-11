import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatsCards from '../components/dashboard/StatsCards';
import VendasChart from '../components/dashboard/VendasChart';
import VendedoresChart from '../components/dashboard/VendedoresChart';
import ProdutosChart from '../components/dashboard/ProdutosChart';
import Filtros from '../components/dashboard/Filtros';
import VendasRecentes from '../components/dashboard/VendasRecentes';
import RankingVendedores from '../components/dashboard/RankingVendedores';
import MetaEquipeChart from '../components/dashboard/MetaEquipeChart';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Table2, Loader2 } from 'lucide-react';
import { parseISO, isWithinInterval } from 'date-fns';

export default function Dashboard() {
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    produtos: [],
    vendedores: [],
    times: []
  });

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-data'),
  });

  const filteredVendas = vendas.filter(venda => {
    if (filtros.dataInicio && venda.data) {
      const vendaData = parseISO(venda.data);
      const inicio = parseISO(filtros.dataInicio);
      if (vendaData < inicio) return false;
    }
    if (filtros.dataFim && venda.data) {
      const vendaData = parseISO(venda.data);
      const fim = parseISO(filtros.dataFim);
      if (vendaData > fim) return false;
    }
    if (filtros.produtos && filtros.produtos.length > 0 && !filtros.produtos.includes(venda.produto)) {
      return false;
    }
    if (filtros.vendedores && filtros.vendedores.length > 0 && !filtros.vendedores.includes(venda.assessor_comercial)) {
      return false;
    }
    if (filtros.times && filtros.times.length > 0 && !filtros.times.includes(venda.time)) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Vendas</h1>
            <p className="text-gray-600 mt-1">Análise completa das suas vendas</p>
          </div>
          <Link to={createPageUrl('Vendas')}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Table2 className="w-4 h-4 mr-2" />
              Ver Tabela
            </Button>
          </Link>
        </div>

        <Filtros vendas={vendas} filtros={filtros} setFiltros={setFiltros} />

        <StatsCards vendas={vendas} filteredVendas={filteredVendas} />

        <MetaEquipeChart vendas={filteredVendas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VendasChart vendas={filteredVendas} />
          <VendedoresChart vendas={filteredVendas} />
        </div>

        <ProdutosChart vendas={filteredVendas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VendasRecentes vendas={filteredVendas} />
          <RankingVendedores vendas={filteredVendas} />
        </div>
      </div>
    </div>
  );
}