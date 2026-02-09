import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, CheckCircle, Pencil, X, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function Comissoes() {
  const [filtroVendedor, setFiltroVendedor] = useState('todos');
  const [filtroPago, setFiltroPago] = useState('todos');
  const [editingComissao, setEditingComissao] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const queryClient = useQueryClient();

  const { data: comissoes = [], isLoading } = useQuery({
    queryKey: ['comissoes'],
    queryFn: () => base44.entities.Comissao.list('-data_venda'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comissao.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['comissoes']);
      toast.success('Comissão atualizada!');
    },
  });

  const marcarComoPago = (comissao) => {
    updateMutation.mutate({ id: comissao.id, data: { pago: !comissao.pago } });
  };

  const handleEdit = (comissao) => {
    setEditingComissao(comissao.id);
    setEditFormData({
      percentual: comissao.percentual,
      valor_comissao: comissao.valor_comissao
    });
  };

  const handleSaveEdit = (comissao) => {
    const novoPercentual = parseFloat(editFormData.percentual);
    const novoValorComissao = (comissao.valor_venda * novoPercentual) / 100;
    
    updateMutation.mutate({
      id: comissao.id,
      data: {
        percentual: novoPercentual,
        valor_comissao: novoValorComissao
      }
    });
    setEditingComissao(null);
  };

  const handleCancelEdit = () => {
    setEditingComissao(null);
    setEditFormData({});
  };

  const vendedoresUnicos = [...new Set(comissoes.map(c => c.vendedor_nome))].filter(Boolean);

  const comissoesFiltradas = comissoes.filter(c => {
    if (filtroVendedor !== 'todos' && c.vendedor_nome !== filtroVendedor) return false;
    if (filtroPago === 'pago' && !c.pago) return false;
    if (filtroPago === 'pendente' && c.pago) return false;
    return true;
  });

  const totalComissoes = comissoesFiltradas.reduce((sum, c) => sum + (c.valor_comissao || 0), 0);
  const totalPago = comissoesFiltradas.filter(c => c.pago).reduce((sum, c) => sum + (c.valor_comissao || 0), 0);
  const totalPendente = totalComissoes - totalPago;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comissões</h1>
          <p className="text-gray-600 mt-1">Gestão de comissões de vendedores</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Comissões</p>
                  <p className="text-2xl font-bold mt-2">
                    {totalComissoes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="bg-blue-500 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pagas</p>
                  <p className="text-2xl font-bold mt-2 text-green-600">
                    {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="bg-green-500 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendentes</p>
                  <p className="text-2xl font-bold mt-2 text-orange-600">
                    {totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="bg-orange-500 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Todas as Comissões ({comissoesFiltradas.length})</CardTitle>
              <div className="flex gap-4">
                <div>
                  <Label className="text-xs">Vendedor</Label>
                  <select
                    value={filtroVendedor}
                    onChange={(e) => setFiltroVendedor(e.target.value)}
                    className="border rounded px-3 py-1 text-sm"
                  >
                    <option value="todos">Todos</option>
                    {vendedoresUnicos.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <select
                    value={filtroPago}
                    onChange={(e) => setFiltroPago(e.target.value)}
                    className="border rounded px-3 py-1 text-sm"
                  >
                    <option value="todos">Todos</option>
                    <option value="pago">Pagas</option>
                    <option value="pendente">Pendentes</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Valor Venda</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoesFiltradas.map((comissao) => (
                  <TableRow key={comissao.id}>
                    <TableCell>
                      {comissao.data_venda ? format(parseISO(comissao.data_venda), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="font-medium">{comissao.vendedor_nome}</TableCell>
                    <TableCell>
                      {comissao.valor_venda?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>
                      {editingComissao === comissao.id ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={editFormData.percentual}
                          onChange={(e) => setEditFormData({ ...editFormData, percentual: e.target.value })}
                          className="w-20"
                        />
                      ) : (
                        `${comissao.percentual}%`
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {editingComissao === comissao.id ? (
                        ((comissao.valor_venda * parseFloat(editFormData.percentual || 0)) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      ) : (
                        comissao.valor_comissao?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={comissao.pago ? 'default' : 'secondary'}>
                        {comissao.pago ? 'Paga' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {editingComissao === comissao.id ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(comissao)}>
                              <Save className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(comissao)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => marcarComoPago(comissao)}
                            >
                              {comissao.pago ? 'Pendente' : 'Paga'}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}