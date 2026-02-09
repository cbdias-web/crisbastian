import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { X, Save } from "lucide-react";

const formasPagamento = [
  "DÉBITO EM CONTA",
  "CARTÃO DE CRÉDITO",
  "BOLETO",
  "PIX",
  "TRANSFERÊNCIA",
  "DINHEIRO"
];

export default function VendaForm({ venda, onSave, onCancel, isLoading }) {
  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list('nome'),
  });

  const [formData, setFormData] = useState(venda || {
    produto: '',
    assessor_comercial: '',
    time: '',
    valor: '',
    data: '',
    forma_pagamento: '',
    parcelamento: '',
    cpf_cnpj: '',
    cliente: '',
    bitrix: '',
    observacao: '',
    vendedor_id: '',
    percentual_comissao: 10
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      valor: parseFloat(formData.valor) || 0,
      percentual_comissao: parseFloat(formData.percentual_comissao) || 0
    };
    onSave(dataToSave);
  };

  const handleVendedorChange = (vendedorId) => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    setFormData({
      ...formData,
      vendedor_id: vendedorId,
      assessor_comercial: vendedor?.nome || '',
      percentual_comissao: vendedor?.percentual_comissao || 10
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{venda ? 'Editar Venda' : 'Nova Venda'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="produto">Produto *</Label>
              <Input
                id="produto"
                value={formData.produto}
                onChange={(e) => setFormData({ ...formData, produto: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="vendedor_id">Vendedor *</Label>
              <Select
                value={formData.vendedor_id}
                onValueChange={handleVendedorChange}
                required
              >
                <SelectTrigger id="vendedor_id">
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.id}>
                      {vendedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="percentual_comissao">Comissão (%) *</Label>
              <Input
                id="percentual_comissao"
                type="number"
                step="0.1"
                value={formData.percentual_comissao}
                onChange={(e) => setFormData({ ...formData, percentual_comissao: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="valor">Valor *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value })}
              >
                <SelectTrigger id="forma_pagamento">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamento.map((forma) => (
                    <SelectItem key={forma} value={forma}>{forma}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="parcelamento">Parcelamento</Label>
              <Input
                id="parcelamento"
                type="date"
                value={formData.parcelamento}
                onChange={(e) => setFormData({ ...formData, parcelamento: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cliente">Cliente</Label>
              <Input
                id="cliente"
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <Input
                id="cpf_cnpj"
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="bitrix">Link Bitrix</Label>
              <Input
                id="bitrix"
                value={formData.bitrix}
                onChange={(e) => setFormData({ ...formData, bitrix: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}