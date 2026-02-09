import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export default function VendedoresChart({ vendas }) {
  const vendasPorVendedor = vendas.reduce((acc, venda) => {
    const vendedor = venda.assessor_comercial || 'Sem vendedor';
    if (!acc[vendedor]) {
      acc[vendedor] = 0;
    }
    acc[vendedor] += venda.valor || 0;
    return acc;
  }, {});

  const data = Object.entries(vendasPorVendedor)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas por Vendedor</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}