import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal } from 'lucide-react';

export default function RankingVendedores({ vendas }) {
  const vendasPorVendedor = vendas.reduce((acc, venda) => {
    const vendedor = venda.assessor_comercial || 'Sem vendedor';
    if (!acc[vendedor]) {
      acc[vendedor] = { vendedor, total: 0, quantidade: 0 };
    }
    acc[vendedor].total += venda.valor || 0;
    acc[vendedor].quantidade += 1;
    return acc;
  }, {});

  // Separar CONSÓRCIO dos demais vendedores
  const todosVendedores = Object.values(vendasPorVendedor);
  const consorcio = todosVendedores.find(v => v.vendedor === 'CONSÓRCIO');
  const vendedoresRankeados = todosVendedores
    .filter(v => v.vendedor !== 'CONSÓRCIO')
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Adicionar CONSÓRCIO no final se existir
  const ranking = consorcio ? [...vendedoresRankeados, consorcio] : vendedoresRankeados;

  const getMedalIcon = (index, isConsorcio) => {
    if (isConsorcio) return <span className="w-5 h-5 flex items-center justify-center text-gray-400">-</span>;
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-gray-400 font-bold">{index + 1}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Ranking de Vendedores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {ranking.map((item, index) => {
            const isConsorcio = item.vendedor === 'CONSÓRCIO';
            return (
              <div 
                key={item.vendedor} 
                className={`flex items-center gap-3 p-3 rounded-lg ${isConsorcio ? 'bg-gray-100 border-t border-gray-300 mt-2' : 'bg-gray-50'}`}
              >
                {getMedalIcon(index, isConsorcio)}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.vendedor}</p>
                  <p className="text-sm text-gray-600">{item.quantidade} vendas</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">
                    {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}