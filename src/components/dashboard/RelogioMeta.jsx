import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Target, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

export default function RelogioMeta({ vendas }) {
  const mesAtual = format(new Date(), 'yyyy-MM');
  
  const { data: metas = [] } = useQuery({
    queryKey: ['metas'],
    queryFn: () => base44.entities.Meta.list(),
  });

  const metaMes = metas.find(m => m.mes === mesAtual && m.tipo === 'equipe');
  
  if (!metaMes) {
    return null;
  }

  const inicioMes = startOfMonth(new Date());
  const fimMes = endOfMonth(new Date());
  const hoje = new Date();
  
  const diasTotais = differenceInDays(fimMes, inicioMes) + 1;
  const diasDecorridos = differenceInDays(hoje, inicioMes) + 1;
  const diasRestantes = diasTotais - diasDecorridos;
  const percentualDiasDecorridos = (diasDecorridos / diasTotais) * 100;

  const totalRealizado = vendas.reduce((sum, v) => sum + (v.valor || 0), 0);
  const percentualRealizado = (totalRealizado / metaMes.valor_meta) * 100;
  
  const metaEsperada = (metaMes.valor_meta * diasDecorridos) / diasTotais;
  const diferencaMeta = totalRealizado - metaEsperada;
  const percentualEsperado = (metaEsperada / metaMes.valor_meta) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Relógio da Meta - {format(new Date(), 'MMMM/yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Meta do Mês</p>
            <p className="text-2xl font-bold text-blue-600">
              {metaMes.valor_meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Realizado</p>
            <p className="text-2xl font-bold text-green-600">
              {totalRealizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-gray-500 mt-1">{percentualRealizado.toFixed(1)}% da meta</p>
          </div>
          <div className={`p-4 rounded-lg ${diferencaMeta >= 0 ? 'bg-emerald-50' : 'bg-orange-50'}`}>
            <p className="text-sm text-gray-600">Meta Esperada Hoje</p>
            <p className={`text-2xl font-bold ${diferencaMeta >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
              {metaEsperada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {diferencaMeta >= 0 ? '+' : ''}{diferencaMeta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progresso da Meta</span>
              <span className="font-semibold">{percentualRealizado.toFixed(1)}%</span>
            </div>
            <Progress value={percentualRealizado} className="h-3" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progresso Esperado ({diasDecorridos} de {diasTotais} dias)</span>
              <span className="font-semibold">{percentualEsperado.toFixed(1)}%</span>
            </div>
            <Progress value={percentualEsperado} className="h-2 opacity-50" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Dias Restantes</p>
              <p className="font-semibold">{diasRestantes} dias</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Falta Converter</p>
              <p className="font-semibold">
                {(metaMes.valor_meta - totalRealizado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
        </div>

        {diferencaMeta < 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-900">Atenção!</p>
              <p className="text-xs text-orange-700">
                Você está abaixo da meta esperada para hoje. É necessário acelerar as vendas nos próximos dias.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}