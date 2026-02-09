import React, { useState } from 'react';
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
    observacao: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      valor: parseFloat(formData.valor) || 0
    };
    onSave(dataToSave);
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
              <Label htmlFor="assessor_comercial">Assessor Comercial *</Label>
              <Input
                id="assessor_comercial"
                value={formData.assessor_comercial}
                onChange={(e) => setFormData({ ...formData, assessor_comercial: e.target.value })}
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