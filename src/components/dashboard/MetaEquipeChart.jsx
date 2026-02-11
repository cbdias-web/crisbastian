import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Target } from 'lucide-react';
import { format } from 'date-fns';

export default function MetaEquipeChart({ vendas }) {
  const { data: metas = [] } = useQuery({
    queryKey: ['metas'],
    queryFn: () => base44.entities.Meta.list('-mes'),
  });

  const mesAtual = format(new Date(), 'yyyy-MM');
  const metaEquipe = metas.find(m => m.mes === mesAtual && m.tipo === 'equipe');

  if (!metaEquipe) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Meta da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">Nenhuma meta da equipe definida para este mês</p>
        </CardContent>
      </Card>
    );
  }

  const [ano, mes] = metaEquipe.mes.split('-');
  const inicio = new Date(parseInt(ano), parseInt(mes) - 1, 1);
  const fim = new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59);

  const vendasDoMes = vendas.filter(v => {
    if (!v.data) return false;
    const dataVenda = new Date(v.data);
    return dataVenda >= inicio && dataVenda <= fim;
  });

  const realizado = vendasDoMes.reduce((sum, v) => sum + (parseFloat(v.valor) || 0), 0);
  const percentual = metaEquipe.valor_meta > 0 ? (realizado / metaEquipe.valor_meta) * 100 : 0;

  const chartData = [
    {
      name: 'Meta da Equipe',
      Meta: metaEquipe.valor_meta,
      Realizado: realizado,
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Atingimento da Meta da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Meta</p>
              <p className="text-2xl font-bold">
                {metaEquipe.valor_meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Realizado</p>
              <p className="text-2xl font-bold text-blue-600">
                {realizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Atingimento</p>
              <p className={`text-2xl font-bold ${percentual >= 100 ? 'text-green-600' : 'text-yellow-600'}`}>
                {percentual.toFixed(1)}%
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              />
              <Legend />
              <Bar dataKey="Meta" fill="#94a3b8" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Realizado" radius={[8, 8, 0, 0]}>
                <Cell fill={percentual >= 100 ? '#10b981' : '#3b82f6'} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}