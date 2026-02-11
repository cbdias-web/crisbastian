import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import VendaForm from '../components/vendas/VendaForm';
import { Plus, Pencil, Trash2, Search, BarChart3, Loader2, ExternalLink, Download, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Vendas() {
  const [showForm, setShowForm] = useState(false);
  const [editingVenda, setEditingVenda] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [produtoFiltro, setProdutoFiltro] = useState('todos');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-data'),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list('nome'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const venda = await base44.entities.Venda.create(data);
      
      // Criar comissão automaticamente
      if (data.vendedor_id && data.valor && data.percentual_comissao) {
        const valorComissao = (data.valor * data.percentual_comissao) / 100;
        await base44.entities.Comissao.create({
          venda_id: venda.id,
          vendedor_id: data.vendedor_id,
          vendedor_nome: data.assessor_comercial,
          valor_venda: data.valor,
          percentual: data.percentual_comissao,
          valor_comissao: valorComissao,
          data_venda: data.data,
          pago: false
        });
      }
      
      return venda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendas']);
      queryClient.invalidateQueries(['comissoes']);
      setShowForm(false);
      toast.success('Venda criada com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const venda = await base44.entities.Venda.update(id, data);
      
      // Atualizar comissão existente
      const comissoes = await base44.entities.Comissao.filter({ venda_id: id });
      if (comissoes.length > 0) {
        const comissao = comissoes[0];
        const valorComissao = (data.valor * data.percentual_comissao) / 100;
        await base44.entities.Comissao.update(comissao.id, {
          vendedor_id: data.vendedor_id,
          vendedor_nome: data.assessor_comercial,
          valor_venda: data.valor,
          percentual: data.percentual_comissao,
          valor_comissao: valorComissao,
          data_venda: data.data
        });
      }
      
      return venda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendas']);
      queryClient.invalidateQueries(['comissoes']);
      setShowForm(false);
      setEditingVenda(null);
      toast.success('Venda atualizada com sucesso!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Venda.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendas']);
      toast.success('Venda excluída com sucesso!');
    },
  });

  const handleSave = (data) => {
    if (editingVenda) {
      updateMutation.mutate({ id: editingVenda.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (venda) => {
    setEditingVenda(venda);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta venda?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredVendas = vendas.filter(venda => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (
      venda.produto?.toLowerCase().includes(term) ||
      venda.assessor_comercial?.toLowerCase().includes(term) ||
      venda.cliente?.toLowerCase().includes(term) ||
      venda.cpf_cnpj?.includes(term)
    );

    const matchData = (!dataInicio || venda.data >= dataInicio) && (!dataFim || venda.data <= dataFim);
    const matchProduto = produtoFiltro === 'todos' || venda.produto === produtoFiltro;

    return matchSearch && matchData && matchProduto;
  });

  const exportarVendas = () => {
    const csv = [
      ['Data', 'Produto', 'Cliente', 'CPF/CNPJ', 'Vendedor', 'Valor', 'Forma Pagamento'],
      ...filteredVendas.map(v => [
        v.data ? format(parseISO(v.data), 'dd/MM/yyyy') : '',
        v.produto || '',
        v.cliente || '',
        v.cpf_cnpj || '',
        v.assessor_comercial || '',
        v.valor || '',
        v.forma_pagamento || ''
      ])
    ].map(row => row.join(';')).join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Vendas exportadas!');
  };

  const exportarClientes = () => {
    const clientesUnicos = [...new Set(filteredVendas
      .filter(v => v.cliente && v.cliente.trim())
      .map(v => ({ cliente: v.cliente, cpf_cnpj: v.cpf_cnpj }))
      .map(c => JSON.stringify(c)))]
      .map(c => JSON.parse(c));
    
    const csv = [
      ['Cliente', 'CPF/CNPJ'],
      ...clientesUnicos.map(c => [c.cliente, c.cpf_cnpj || ''])
    ].map(row => row.join(';')).join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Clientes exportados!');
  };

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Vendas</h1>
            <p className="text-gray-600 mt-1">Controle completo das suas vendas</p>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            )}
            <Button 
              onClick={() => {
                setEditingVenda(null);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Venda
            </Button>
          </div>
        </div>

        {showForm && (
          <VendaForm
            venda={editingVenda}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingVenda(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div>
                <Label>Produto</Label>
                <Select value={produtoFiltro} onValueChange={setProdutoFiltro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Produtos</SelectItem>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDataInicio('');
                    setDataFim('');
                    setProdutoFiltro('todos');
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Todas as Vendas ({filteredVendas.length})</CardTitle>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <>
                    <Button variant="outline" size="sm" onClick={exportarClientes}>
                      <Download className="w-4 h-4 mr-2" />
                      Clientes
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportarVendas}>
                      <Download className="w-4 h-4 mr-2" />
                      Vendas
                    </Button>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por produto, vendedor, cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-80"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendas.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell>
                        {venda.data ? format(parseISO(venda.data), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{venda.produto}</TableCell>
                      <TableCell>{venda.cliente || '-'}</TableCell>
                      <TableCell>{venda.assessor_comercial}</TableCell>
                      <TableCell>
                        {venda.time && <Badge variant="secondary">{venda.time}</Badge>}
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {venda.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>
                        {venda.forma_pagamento && (
                          <Badge variant="outline">{venda.forma_pagamento}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {venda.bitrix && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a href={venda.bitrix} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(venda)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(venda.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredVendas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}