import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react";

export default function StatsCards({ vendas, filteredVendas }) {
  const totalVendas = filteredVendas.length;
  const totalValor = filteredVendas.reduce((sum, v) => sum + (v.valor || 0), 0);
  const vendedoresUnicos = [...new Set(filteredVendas.map(v => v.assessor_comercial))].length;
  const ticketMedio = totalVendas > 0 ? totalValor / totalVendas : 0;

  const cards = [
    {
      title: "Total de Vendas",
      value: totalVendas,
      icon: ShoppingCart,
      color: "bg-blue-500",
      formatter: (v) => v.toLocaleString('pt-BR')
    },
    {
      title: "Faturamento Total",
      value: totalValor,
      icon: DollarSign,
      color: "bg-green-500",
      formatter: (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    },
    {
      title: "Ticket Médio",
      value: ticketMedio,
      icon: TrendingUp,
      color: "bg-purple-500",
      formatter: (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    },
    {
      title: "Vendedores Ativos",
      value: vendedoresUnicos,
      icon: Users,
      color: "bg-orange-500",
      formatter: (v) => v.toLocaleString('pt-BR')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold mt-2">{card.formatter(card.value)}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}