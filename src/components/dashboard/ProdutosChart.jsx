import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProdutosChart({ vendas }) {
  const vendasPorProduto = vendas.reduce((acc, venda) => {
    const produto = venda.produto || 'Sem produto';
    if (!acc[produto]) {
      acc[produto] = { produto, quantidade: 0, valor: 0 };
    }
    acc[produto].quantidade += 1;
    acc[produto].valor += venda.valor || 0;
    return acc;
  }, {});

  const data = Object.values(vendasPorProduto)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Produtos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="produto" type="category" width={150} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'valor') {
                  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                }
                return value;
              }}
            />
            <Bar dataKey="valor" fill="#8884d8" name="Valor Total" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}