import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from 'date-fns';
import { TrendingUp } from 'lucide-react';

export default function VendasRecentes({ vendas }) {
  const vendasRecentes = vendas
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Vendas Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {vendasRecentes.map((venda) => (
            <div key={venda.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{venda.produto}</p>
                <p className="text-sm text-gray-600">{venda.cliente || venda.assessor_comercial}</p>
                <p className="text-xs text-gray-500">
                  {venda.data ? format(parseISO(venda.data), 'dd/MM/yyyy') : '-'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">
                  {venda.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}