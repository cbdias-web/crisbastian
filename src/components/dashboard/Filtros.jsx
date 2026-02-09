import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function Filtros({ vendas, filtros, setFiltros }) {
  const produtos = [...new Set(vendas.map(v => v.produto).filter(Boolean))].sort();
  const vendedores = [...new Set(vendas.map(v => v.assessor_comercial).filter(Boolean))].sort();

  const limparFiltros = () => {
    setFiltros({
      dataInicio: '',
      dataFim: '',
      produto: 'todos',
      vendedor: 'todos'
    });
  };

  const temFiltrosAtivos = filtros.dataInicio || filtros.dataFim || 
                          filtros.produto !== 'todos' || filtros.vendedor !== 'todos';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Filtros</h3>
          {temFiltrosAtivos && (
            <Button variant="outline" size="sm" onClick={limparFiltros}>
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="dataInicio">Data Início</Label>
            <Input
              id="dataInicio"
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="dataFim">Data Fim</Label>
            <Input
              id="dataFim"
              type="date"
              value={filtros.dataFim}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="produto">Produto</Label>
            <Select value={filtros.produto} onValueChange={(value) => setFiltros({ ...filtros, produto: value })}>
              <SelectTrigger id="produto">
                <SelectValue placeholder="Todos os produtos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os produtos</SelectItem>
                {produtos.map((produto) => (
                  <SelectItem key={produto} value={produto}>{produto}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="vendedor">Vendedor</Label>
            <Select value={filtros.vendedor} onValueChange={(value) => setFiltros({ ...filtros, vendedor: value })}>
              <SelectTrigger id="vendedor">
                <SelectValue placeholder="Todos os vendedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os vendedores</SelectItem>
                {vendedores.map((vendedor) => (
                  <SelectItem key={vendedor} value={vendedor}>{vendedor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}