import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Espelhamentos() {
  const [showForm, setShowForm] = useState(false);
  const [editingEspelhamento, setEditingEspelhamento] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    percentual_comissao: 10,
    ativo: true
  });

  const queryClient = useQueryClient();

  const { data: espelhamentos = [], isLoading } = useQuery({
    queryKey: ['espelhamentos'],
    queryFn: () => base44.entities.Espelhamento.list('nome'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Espelhamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['espelhamentos']);
      toast.success('Indicador cadastrado!');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Espelhamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['espelhamentos']);
      toast.success('Indicador atualizado!');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Espelhamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['espelhamentos']);
      toast.success('Indicador removido!');
    },
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      percentual_comissao: 10,
      ativo: true
    });
    setEditingEspelhamento(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      percentual_comissao: parseFloat(formData.percentual_comissao) || 10
    };

    if (editingEspelhamento) {
      updateMutation.mutate({ id: editingEspelhamento.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const handleEdit = (espelhamento) => {
    setEditingEspelhamento(espelhamento);
    setFormData(espelhamento);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja remover este indicador?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Indicadores (Espelhamento)</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Cadastro de indicadores para comissões de espelhamento</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Indicador
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingEspelhamento ? 'Editar Indicador' : 'Novo Indicador'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="percentual_comissao">Percentual Comissão Padrão (%)</Label>
                    <Input
                      id="percentual_comissao"
                      type="number"
                      step="0.1"
                      value={formData.percentual_comissao}
                      onChange={(e) => setFormData({ ...formData, percentual_comissao: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Indicadores Cadastrados ({espelhamentos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Comissão Padrão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {espelhamentos.map((espelhamento) => (
                  <TableRow key={espelhamento.id}>
                    <TableCell className="font-medium">{espelhamento.nome}</TableCell>
                    <TableCell>{espelhamento.email || '-'}</TableCell>
                    <TableCell>{espelhamento.telefone || '-'}</TableCell>
                    <TableCell>{espelhamento.percentual_comissao}%</TableCell>
                    <TableCell>
                      <Badge variant={espelhamento.ativo ? 'default' : 'secondary'}>
                        {espelhamento.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(espelhamento)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(espelhamento.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
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