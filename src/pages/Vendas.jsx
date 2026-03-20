import React, { useState } from 'react';
import ImportarVendasModal from '../components/vendas/ImportarVendasModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import VendaForm from '../components/vendas/VendaForm';
import { Plus, Pencil, Trash2, Search, BarChart3, Loader2, ExternalLink, Download, Filter, FileSpreadsheet, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Vendas() {
  const [showForm, setShowForm] = useState(false);
  const [editingVenda, setEditingVenda] = useState(null);
  const [showImportar, setShowImportar] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const now = new Date();
  const [dataInicio, setDataInicio] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [dataFim, setDataFim] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  const [produtoFiltro, setProdutoFiltro] = useState('todos');
  const [vendedorFiltro, setVendedorFiltro] = useState('todos');
  const [gerandoRelatorioPDF, setGerandoRelatorioPDF] = useState(false);
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

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list('nome'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const venda = await base44.entities.Venda.create(data);

      // Comissão do vendedor
      if (data.vendedor_id && data.valor && data.percentual_comissao) {
        await base44.entities.Comissao.create({
          venda_id: venda.id,
          vendedor_id: data.vendedor_id,
          vendedor_nome: data.assessor_comercial,
          valor_venda: data.valor,
          percentual: data.percentual_comissao,
          valor_comissao: (data.valor * data.percentual_comissao) / 100,
          data_venda: data.data,
          pago: false
        });
      }

      // Comissões dos indicadores (múltiplos)
      const indicadores = data.indicadores || [];
      for (const ind of indicadores) {
        if (ind.id && ind.percentual > 0) {
          if (ind.tipo === 'vendedor') {
            // Vendedor usado como indicador: vai para tabela Comissao
            await base44.entities.Comissao.create({
              venda_id: venda.id,
              vendedor_id: ind.id,
              vendedor_nome: ind.nome,
              valor_venda: data.valor,
              percentual: ind.percentual,
              valor_comissao: (data.valor * ind.percentual) / 100,
              data_venda: data.data,
              pago: false,
              tipo: 'comissao'
            });
          } else {
            // Indicador puro: vai para tabela ComissaoEspelhamento
            await base44.entities.ComissaoEspelhamento.create({
              venda_id: venda.id,
              vendedor_id: ind.id,
              vendedor_nome: ind.nome,
              valor_venda: data.valor,
              percentual: ind.percentual,
              valor_comissao: (data.valor * ind.percentual) / 100,
              data_venda: data.data,
              pago: false
            });
          }
        }
      }

      // Auto-vincula o cliente ao vendedor da venda
      if (data.cliente && data.cliente.trim() && data.vendedor_id) {
        const clientesExistentes = await base44.entities.Cliente.filter({ nome: data.cliente.trim() });
        if (clientesExistentes.length > 0) {
          const cli = clientesExistentes[0];
          if (!cli.vendedor_id) {
            await base44.entities.Cliente.update(cli.id, {
              vendedor_id: data.vendedor_id,
              vendedor_nome: data.assessor_comercial
            });
          }
        } else {
          await base44.entities.Cliente.create({
            nome: data.cliente.trim(),
            cpf_cnpj: data.cpf_cnpj || '',
            vendedor_id: data.vendedor_id,
            vendedor_nome: data.assessor_comercial
          });
        }
      }

      return venda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendas']);
      queryClient.invalidateQueries(['comissoes']);
      queryClient.invalidateQueries(['comissoesEspelhamento']);
      queryClient.invalidateQueries(['clientes']);
      setShowForm(false);
      toast.success('Venda criada com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const venda = await base44.entities.Venda.update(id, data);

      // Atualiza comissão do vendedor
      const comissoesVend = await base44.entities.Comissao.filter({ venda_id: id });
      if (comissoesVend.length > 0) {
        await base44.entities.Comissao.update(comissoesVend[0].id, {
          vendedor_id: data.vendedor_id,
          vendedor_nome: data.assessor_comercial,
          valor_venda: data.valor,
          percentual: data.percentual_comissao,
          valor_comissao: (data.valor * data.percentual_comissao) / 100,
          data_venda: data.data
        });
      } else if (data.vendedor_id && data.percentual_comissao) {
        await base44.entities.Comissao.create({
          venda_id: id,
          vendedor_id: data.vendedor_id,
          vendedor_nome: data.assessor_comercial,
          valor_venda: data.valor,
          percentual: data.percentual_comissao,
          valor_comissao: (data.valor * data.percentual_comissao) / 100,
          data_venda: data.data,
          pago: false
        });
      }

      // Reconstrói comissões de indicadores — apaga todas e recria
      const comissoesEsp = await base44.entities.ComissaoEspelhamento.filter({ venda_id: id });
      for (const c of comissoesEsp) {
        await base44.entities.ComissaoEspelhamento.delete(c.id);
      }
      
      // Remove comissões extras de vendedores usados como indicadores
      const todasComissoes = await base44.entities.Comissao.filter({ venda_id: id });
      const comissaoVendedorPrincipal = todasComissoes.find(c => c.vendedor_id === data.vendedor_id && c.tipo !== 'bonus');
      for (const c of todasComissoes) {
        if (c.id !== comissaoVendedorPrincipal?.id && c.tipo !== 'bonus') {
          await base44.entities.Comissao.delete(c.id);
        }
      }
      
      const indicadores = data.indicadores || [];
      for (const ind of indicadores) {
        if (ind.id && ind.percentual > 0) {
          if (ind.tipo === 'vendedor') {
            // Vendedor usado como indicador: vai para tabela Comissao
            await base44.entities.Comissao.create({
              venda_id: id,
              vendedor_id: ind.id,
              vendedor_nome: ind.nome,
              valor_venda: data.valor,
              percentual: ind.percentual,
              valor_comissao: (data.valor * ind.percentual) / 100,
              data_venda: data.data,
              pago: false,
              tipo: 'comissao'
            });
          } else {
            // Indicador puro: vai para tabela ComissaoEspelhamento
            await base44.entities.ComissaoEspelhamento.create({
              venda_id: id,
              vendedor_id: ind.id,
              vendedor_nome: ind.nome,
              valor_venda: data.valor,
              percentual: ind.percentual,
              valor_comissao: (data.valor * ind.percentual) / 100,
              data_venda: data.data,
              pago: false
            });
          }
        }
      }

      return venda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendas']);
      queryClient.invalidateQueries(['comissoes']);
      queryClient.invalidateQueries(['comissoesEspelhamento']);
      setShowForm(false);
      setEditingVenda(null);
      toast.success('Venda atualizada com sucesso!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Remove comissões associadas antes de excluir a venda
      const [comissoes, comissoesEsp] = await Promise.all([
        base44.entities.Comissao.filter({ venda_id: id }),
        base44.entities.ComissaoEspelhamento.filter({ venda_id: id }),
      ]);
      await Promise.all([
        ...comissoes.map(c => base44.entities.Comissao.delete(c.id)),
        ...comissoesEsp.map(c => base44.entities.ComissaoEspelhamento.delete(c.id)),
      ]);
      return base44.entities.Venda.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendas']);
      queryClient.invalidateQueries(['comissoes']);
      queryClient.invalidateQueries(['comissoesEspelhamento']);
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
    const matchVendedor = vendedorFiltro === 'todos' || venda.assessor_comercial === vendedorFiltro;

    return matchSearch && matchData && matchProduto && matchVendedor;
  });

  const totalAcumulado = filteredVendas.reduce((sum, v) => sum + (v.valor || 0), 0);

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

  const gerarRelatorioVendasPDF = async () => {
    setGerandoRelatorioPDF(true);
    try {
      const response = await base44.functions.invoke('gerarRelatorioVendasPDF', {
        dataInicio,
        dataFim,
        vendedorFiltro: vendedorFiltro === 'todos' ? null : vendedorFiltro,
        produtoFiltro: produtoFiltro === 'todos' ? null : produtoFiltro
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-vendas-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório gerado!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao gerar relatório');
    }
    setGerandoRelatorioPDF(false);
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
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowImportar(true)}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Importar Histórico
                </Button>
                <Button
                  variant="outline"
                  onClick={gerarRelatorioVendasPDF}
                  disabled={gerandoRelatorioPDF}
                >
                  {gerandoRelatorioPDF ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Relatório PDF
                </Button>
              </>
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

        {showImportar && (
          <ImportarVendasModal onClose={() => setShowImportar(false)} />
        )}

        {showForm && (
          <VendaForm
            venda={editingVenda}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingVenda(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
            isAdmin={isAdmin}
          />
        )}

        {/* Contadores */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50">
              <BarChart3 className="w-5 h-5 text-[#1a3150]" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Cadastradas</p>
              <p className="text-2xl font-bold text-gray-900">{vendas.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50">
              <Filter className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">No Período Filtrado</p>
              <p className="text-2xl font-bold text-gray-900">{filteredVendas.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50">
              <Search className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Volume do Período</p>
              <p className="text-2xl font-bold text-emerald-600">{totalAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <Label>Vendedor</Label>
                <Select value={vendedorFiltro} onValueChange={setVendedorFiltro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Vendedores</SelectItem>
                    {vendedores.map((v) => (
                      <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    setVendedorFiltro('todos');
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