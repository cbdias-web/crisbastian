import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Vendedores() {
  const [showForm, setShowForm] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    time: '',
    percentual_comissao: 10,
    ativo: true
  });
  const queryClient = useQueryClient();

  const { data: vendedores = [], isLoading } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list('-created_date'),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, permissao_admin }) => base44.entities.User.update(id, { permissao_admin }),
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios']);
      toast.success('Permissão atualizada com sucesso!');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendedor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendedores']);
      resetForm();
      toast.success('Vendedor criado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vendedor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendedores']);
      resetForm();
      toast.success('Vendedor atualizado com sucesso!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendedor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendedores']);
      toast.success('Vendedor excluído com sucesso!');
    },
  });

  const resetForm = () => {
    setFormData({ nome: '', email: '', time: '', percentual_comissao: 10, ativo: true });
    setShowForm(false);
    setEditingVendedor(null);
  };

  const handleEdit = (vendedor) => {
    setEditingVendedor(vendedor);
    setFormData(vendedor);
    setShowForm(true);
  };

  const handleSave = () => {
    if (editingVendedor) {
      updateMutation.mutate({ id: editingVendedor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendedores</h1>
            <p className="text-gray-600 mt-1">Gerencie sua equipe de vendas</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Vendedor
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingVendedor ? 'Editar Vendedor' : 'Novo Vendedor'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Percentual Comissão (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.percentual_comissao}
                    onChange={(e) => setFormData({ ...formData, percentual_comissao: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="ativo">Vendedor Ativo</Label>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Todos os Vendedores ({vendedores.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Comissão (%)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissão Admin</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores.map((vendedor) => {
                  const usuario = usuarios.find(u => u.email === vendedor.email);
                  const temPermissao = usuario?.permissao_admin || false;
                  
                  return (
                    <TableRow key={vendedor.id}>
                      <TableCell className="font-medium">{vendedor.nome}</TableCell>
                      <TableCell>{vendedor.email || '-'}</TableCell>
                      <TableCell>{vendedor.time || '-'}</TableCell>
                      <TableCell>{vendedor.percentual_comissao}%</TableCell>
                      <TableCell>
                        <Badge variant={vendedor.ativo ? 'default' : 'secondary'}>
                          {vendedor.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {vendedor.email && usuario ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={temPermissao}
                              onChange={(e) => {
                                updateUserMutation.mutate({
                                  id: usuario.id,
                                  permissao_admin: e.target.checked
                                });
                              }}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <span className="text-sm">{temPermissao ? 'Sim' : 'Não'}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(vendedor)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Tem certeza que deseja excluir este vendedor?')) {
                                deleteMutation.mutate(vendedor.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}