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
            <Label>Produtos</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {filtros.produtos.length === 0 ? 'Todos' : `${filtros.produtos.length} selecionado(s)`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {produtos.map((produto) => (
                    <div key={produto} className="flex items-center space-x-2">
                      <Checkbox
                        id={`produto-${produto}`}
                        checked={filtros.produtos.includes(produto)}
                        onCheckedChange={() => toggleItem('produtos', produto)}
                      />
                      <label
                        htmlFor={`produto-${produto}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {produto}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Vendedores</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {filtros.vendedores.length === 0 ? 'Todos' : `${filtros.vendedores.length} selecionado(s)`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {vendedores.map((vendedor) => (
                    <div key={vendedor} className="flex items-center space-x-2">
                      <Checkbox
                        id={`vendedor-${vendedor}`}
                        checked={filtros.vendedores.includes(vendedor)}
                        onCheckedChange={() => toggleItem('vendedores', vendedor)}
                      />
                      <label
                        htmlFor={`vendedor-${vendedor}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {vendedor}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Times</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {filtros.times.length === 0 ? 'Todos' : `${filtros.times.length} selecionado(s)`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {times.map((time) => (
                    <div key={time} className="flex items-center space-x-2">
                      <Checkbox
                        id={`time-${time}`}
                        checked={filtros.times.includes(time)}
                        onCheckedChange={() => toggleItem('times', time)}
                      />
                      <label
                        htmlFor={`time-${time}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {time}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}