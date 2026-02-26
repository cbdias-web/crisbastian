import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, DollarSign, CheckCircle, Pencil, X, Save, Trash2, Download, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function ComissoesEspelhamento() {
  const [filtroVendedores, setFiltroVendedores] = useState([]);
  const [filtroPago, setFiltroPago] = useState('todos');
  const [editingComissao, setEditingComissao] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: comissoes = [], isLoading } = useQuery({
    queryKey: ['comissoesEspelhamento'],
    queryFn: () => base44.entities.ComissaoEspelhamento.list('-data_venda'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComissaoEspelhamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['comissoesEspelhamento']);
      toast.success('Comissão atualizada!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ComissaoEspelhamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['comissoesEspelhamento']);
      toast.success('Comissão removida!');
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

  const toggleVendedor = (vendedor) => {
    setFiltroVendedores(prev =>
      prev.includes(vendedor)
        ? prev.filter(v => v !== vendedor)
        : [...prev, vendedor]
    );
  };

  const exportarCSV = () => {
    const headers = ['Data', 'Vendedor Espelhamento', 'Valor Venda', 'Percentual', 'Comissão', 'Status'];
    const rows = comissoesFiltradas.map(c => [
      c.data_venda ? format(parseISO(c.data_venda), 'dd/MM/yyyy') : '-',
      c.vendedor_nome,
      c.valor_venda,
      c.percentual,
      c.valor_comissao,
      c.pago ? 'Paga' : 'Pendente'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comissoes_espelhamento_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  const comissoesFiltradas = comissoes.filter(c => {
    if (filtroVendedores.length > 0 && !filtroVendedores.includes(c.vendedor_nome)) return false;
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
          <h1 className="text-3xl font-bold text-gray-900">Comissões Espelhamento</h1>
          <p className="text-gray-600 mt-1">Gestão de comissões de espelhamento</p>
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
                <Button variant="outline" size="sm" onClick={exportarCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
                {isAdmin && (
                  <div>
                    <Label className="text-xs">Vendedores Espelhamento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-40 justify-between">
                          {filtroVendedores.length === 0 ? 'Todos' : `${filtroVendedores.length} selecionado(s)`}
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 max-h-64 overflow-y-auto">
                        <div className="space-y-2">
                          {vendedoresUnicos.map((vendedor) => (
                            <div key={vendedor} className="flex items-center space-x-2">
                              <Checkbox
                                id={`vendedor-${vendedor}`}
                                checked={filtroVendedores.includes(vendedor)}
                                onCheckedChange={() => toggleVendedor(vendedor)}
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
                )}
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
                  <TableHead>Vendedor Espelhamento</TableHead>
                  <TableHead>Valor Venda</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Ação</TableHead>}
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
                    {isAdmin && (
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja remover esta comissão?')) {
                                    deleteMutation.mutate(comissao.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
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