import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export default function Filtros({ vendas, filtros, setFiltros }) {
  const produtos = [...new Set(vendas.map(v => v.produto).filter(Boolean))].sort();
  const vendedores = [...new Set(vendas.map(v => v.assessor_comercial).filter(Boolean))].sort();

  const limparFiltros = () => {
    setFiltros({
      dataInicio: '',
      dataFim: '',
      produtos: [],
      vendedores: []
    });
  };

  const toggleProduto = (produto) => {
    const produtosAtuais = filtros.produtos || [];
    if (produtosAtuais.includes(produto)) {
      setFiltros({ ...filtros, produtos: produtosAtuais.filter(p => p !== produto) });
    } else {
      setFiltros({ ...filtros, produtos: [...produtosAtuais, produto] });
    }
  };

  const toggleVendedor = (vendedor) => {
    const vendedoresAtuais = filtros.vendedores || [];
    if (vendedoresAtuais.includes(vendedor)) {
      setFiltros({ ...filtros, vendedores: vendedoresAtuais.filter(v => v !== vendedor) });
    } else {
      setFiltros({ ...filtros, vendedores: [...vendedoresAtuais, vendedor] });
    }
  };

  const temFiltrosAtivos = filtros.dataInicio || filtros.dataFim || 
                          (filtros.produtos && filtros.produtos.length > 0) || 
                          (filtros.vendedores && filtros.vendedores.length > 0);

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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-2">
            <Label>
              Produtos {filtros.produtos?.length > 0 && `(${filtros.produtos.length} selecionados)`}
            </Label>
            <div className="flex flex-wrap gap-2">
              {produtos.map((produto) => (
                <Badge
                  key={produto}
                  variant={filtros.produtos?.includes(produto) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => toggleProduto(produto)}
                >
                  {produto}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Vendedores {filtros.vendedores?.length > 0 && `(${filtros.vendedores.length} selecionados)`}
            </Label>
            <div className="flex flex-wrap gap-2">
              {vendedores.map((vendedor) => (
                <Badge
                  key={vendedor}
                  variant={filtros.vendedores?.includes(vendedor) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => toggleVendedor(vendedor)}
                >
                  {vendedor}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}