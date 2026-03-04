import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Save, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function Metas() {
  const [showForm, setShowForm] = useState(false);
  const [editingMeta, setEditingMeta] = useState(null);
  const [user, setUser] = useState(null);
  const [vendedorFiltro, setVendedorFiltro] = useState('todos');
  const [mesFiltro, setMesFiltro] = useState(format(new Date(), 'yyyy-MM'));
  const [formData, setFormData] = useState({
    mes: format(new Date(), 'yyyy-MM'),
    tipo: 'individual',
    vendedor_id: '',
    vendedor_nome: '',
    time: '',
    valor_meta: ''
  });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: metas = [], isLoading: loadingMetas } = useQuery({
    queryKey: ['metas'],
    queryFn: () => base44.entities.Meta.list('-mes'),
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list('nome'),
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Meta.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['metas']);
      resetForm();
      toast.success('Meta criada com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Meta.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['metas']);
      resetForm();
      toast.success('Meta atualizada com sucesso!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Meta.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['metas']);
      toast.success('Meta excluída com sucesso!');
    },
  });

  const resetForm = () => {
    setFormData({ mes: format(new Date(), 'yyyy-MM'), tipo: 'individual', vendedor_id: '', vendedor_nome: '', time: '', valor_meta: '' });
    setShowForm(false);
    setEditingMeta(null);
  };

  const handleEdit = (meta) => {
    setEditingMeta(meta);
    setFormData(meta);
    setShowForm(true);
  };

  const handleSave = () => {
    const data = {
      ...formData,
      valor_meta: parseFloat(formData.valor_meta)
    };
    if (editingMeta) {
      updateMutation.mutate({ id: editingMeta.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleVendedorChange = (vendedorId) => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    setFormData({
      ...formData,
      vendedor_id: vendedorId,
      vendedor_nome: vendedor?.nome || ''
    });
  };

  const calcularRealizado = (meta) => {
    const [ano, mes] = meta.mes.split('-');
    const inicio = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    const fim = new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59);

    const vendasFiltradas = vendas.filter(v => {
      if (!v.data) return false;
      const dataVenda = new Date(v.data);
      const dentroDoMes = dataVenda >= inicio && dataVenda <= fim;
      
      if (!dentroDoMes) return false;
      
      if (meta.tipo === 'equipe') {
        return true;
      } else if (meta.tipo === 'time') {
        return v.time === meta.time;
      } else {
        // Comparar por vendedor_id se existir, caso contrário por nome
        if (v.vendedor_id && meta.vendedor_id) {
          return v.vendedor_id === meta.vendedor_id;
        } else {
          return v.assessor_comercial === meta.vendedor_nome;
        }
      }
    });

    return vendasFiltradas.reduce((sum, v) => sum + (parseFloat(v.valor) || 0), 0);
  };

  if (loadingMetas) {
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
            <h1 className="text-3xl font-bold text-gray-900">Metas</h1>
            <p className="text-gray-600 mt-1">Gerencie metas individuais e da equipe</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Meta
            </Button>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingMeta ? 'Editar Meta' : 'Nova Meta'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Mês *</Label>
                  <Input
                    type="month"
                    value={formData.mes}
                    onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="equipe">Equipe</SelectItem>
                      <SelectItem value="time">Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.tipo === 'individual' && (
                  <div>
                    <Label>Vendedor *</Label>
                    <Select value={formData.vendedor_id} onValueChange={handleVendedorChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendedores.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.tipo === 'time' && (
                  <div>
                    <Label>Time *</Label>
                    <Select value={formData.time} onValueChange={(value) => setFormData({ ...formData, time: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TIME 1">TIME 1</SelectItem>
                        <SelectItem value="TIME 2">TIME 2</SelectItem>
                        <SelectItem value="TIME 3">TIME 3</SelectItem>
                        <SelectItem value="CONSÓRCIO">CONSÓRCIO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Valor da Meta *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_meta}
                    onChange={(e) => setFormData({ ...formData, valor_meta: e.target.value })}
                  />
                </div>
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
            <div className="flex justify-between items-center">
              <CardTitle>Todas as Metas ({metas.length})</CardTitle>
              <div className="w-64">
                <Select value={vendedorFiltro} onValueChange={setVendedorFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Vendedores</SelectItem>
                    {vendedores.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Realizado</TableHead>
                  <TableHead>Gap/Superação</TableHead>
                  <TableHead>Atingimento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metas
                  .filter(meta => {
                    if (vendedorFiltro === 'todos') return true;
                    return meta.vendedor_id === vendedorFiltro;
                  })
                  .map((meta) => {
                    const realizado = calcularRealizado(meta);
                    const percentual = meta.valor_meta > 0 ? (realizado / meta.valor_meta) * 100 : 0;
                    const gap = realizado - meta.valor_meta;
                    const gapPositivo = gap >= 0;
                    
                    return (
                      <TableRow key={meta.id}>
                        <TableCell>{meta.mes}</TableCell>
                        <TableCell>
                          <Badge variant={meta.tipo === 'equipe' ? 'default' : meta.tipo === 'time' ? 'outline' : 'secondary'}>
                            {meta.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {meta.tipo === 'equipe' ? 'Toda equipe' : meta.tipo === 'time' ? meta.time : meta.vendedor_nome}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {meta.valor_meta?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="font-semibold text-blue-600">
                          {realizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${gapPositivo ? 'text-green-600' : 'text-red-600'}`}>
                            {gapPositivo ? '+' : ''}{gap.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${percentual >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(percentual, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{percentual.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin && (
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(meta)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja excluir esta meta?')) {
                                    deleteMutation.mutate(meta.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          )}
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