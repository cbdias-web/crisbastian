import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import VendaForm from '../components/vendas/VendaForm';
import { Plus, Pencil, Trash2, Search, BarChart3, Loader2, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Vendas() {
  const [showForm, setShowForm] = useState(false);
  const [editingVenda, setEditingVenda] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-data'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Venda.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendas']);
      setShowForm(false);
      toast.success('Venda criada com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Venda.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendas']);
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
    return (
      venda.produto?.toLowerCase().includes(term) ||
      venda.assessor_comercial?.toLowerCase().includes(term) ||
      venda.cliente?.toLowerCase().includes(term) ||
      venda.cpf_cnpj?.includes(term)
    );
  });

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
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
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

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Todas as Vendas ({filteredVendas.length})</CardTitle>
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredVendas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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