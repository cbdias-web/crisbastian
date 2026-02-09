import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function VendasChart({ vendas }) {
  const vendasPorMes = vendas.reduce((acc, venda) => {
    if (!venda.data) return acc;
    const mes = format(parseISO(venda.data), 'MMM/yyyy', { locale: ptBR });
    if (!acc[mes]) {
      acc[mes] = { mes, quantidade: 0, valor: 0 };
    }
    acc[mes].quantidade += 1;
    acc[mes].valor += venda.valor || 0;
    return acc;
  }, {});

  const data = Object.values(vendasPorMes).sort((a, b) => {
    const [mesA, anoA] = a.mes.split('/');
    const [mesB, anoB] = b.mes.split('/');
    return new Date(anoA, mesA) - new Date(anoB, mesB);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas por Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'valor') {
                  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                }
                return value;
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="quantidade" fill="#8884d8" name="Quantidade" />
            <Bar yAxisId="right" dataKey="valor" fill="#82ca9d" name="Valor Total" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}