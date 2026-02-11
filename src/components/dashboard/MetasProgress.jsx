import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function MetasProgress({ vendas }) {
  const { data: metas = [] } = useQuery({
    queryKey: ['metas'],
    queryFn: () => base44.entities.Meta.list('-mes'),
  });

  const mesAtual = format(new Date(), 'yyyy-MM');
  const metasDoMes = metas.filter(m => m.mes === mesAtual);

  const calcularRealizado = (meta) => {
    const [ano, mes] = meta.mes.split('-');
    const inicio = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    const fim = new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59);

    const vendasFiltradas = vendas.filter(v => {
      if (!v.data) return false;
      const dataVenda = new Date(v.data);
      
      if (meta.tipo === 'equipe') {
        return dataVenda >= inicio && dataVenda <= fim;
      } else {
        return dataVenda >= inicio && dataVenda <= fim && v.vendedor_id === meta.vendedor_id;
      }
    });

    return vendasFiltradas.reduce((sum, v) => sum + (parseFloat(v.valor) || 0), 0);
  };

  if (metasDoMes.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Metas do Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metasDoMes.map((meta) => {
            const realizado = calcularRealizado(meta);
            const percentual = meta.valor_meta > 0 ? (realizado / meta.valor_meta) * 100 : 0;
            
            return (
              <div key={meta.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{meta.vendedor_nome || 'Equipe Completa'}</p>
                    <Badge variant={meta.tipo === 'equipe' ? 'default' : 'secondary'} className="mt-1">
                      {meta.tipo}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {realizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      {' / '}
                      {meta.valor_meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        percentual >= 100 ? 'bg-green-500' : 
                        percentual >= 70 ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(percentual, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold min-w-[50px] text-right">
                    {percentual.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}