import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ChevronDown } from "lucide-react";
import { startOfMonth, format } from 'date-fns';

export default function Filtros({ vendas, filtros, setFiltros }) {
  const produtos = [...new Set(vendas.map(v => v.produto).filter(Boolean))].sort();
  const vendedores = [...new Set(vendas.map(v => v.assessor_comercial).filter(Boolean))].sort();
  const times = [...new Set(vendas.map(v => v.time).filter(Boolean))].sort();

  const limparFiltros = () => {
    const dataInicioMes = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    setFiltros({
      dataInicio: dataInicioMes,
      dataFim: '',
      produtos: [],
      vendedores: [],
      times: []
    });
  };

  const toggleItem = (field, value) => {
    const currentArray = filtros[field];
    setFiltros({
      ...filtros,
      [field]: currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
    });
  };

  const temFiltrosAtivos = filtros.dataFim || filtros.produtos.length > 0 || filtros.vendedores.length > 0 || filtros.times.length > 0;

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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <Label>Produto</Label>
            <Select value={filtros.produto || ''} onValueChange={(value) => setFiltros({ ...filtros, produto: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todos</SelectItem>
                {produtos.map((produto) => (
                  <SelectItem key={produto} value={produto}>{produto}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vendedor</Label>
            <Select value={filtros.vendedor || ''} onValueChange={(value) => setFiltros({ ...filtros, vendedor: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todos</SelectItem>
                {vendedores.map((vendedor) => (
                  <SelectItem key={vendedor} value={vendedor}>{vendedor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Time</Label>
            <Select value={filtros.time || ''} onValueChange={(value) => setFiltros({ ...filtros, time: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todos</SelectItem>
                {times.map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}