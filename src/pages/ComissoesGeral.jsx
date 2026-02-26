import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, DollarSign, CheckCircle, Download, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ComissoesGeral() {
  const [filtroVendedores, setFiltroVendedores] = useState([]);
  const [filtroPago, setFiltroPago] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: comissoes = [], isLoading: isLoadingComissoes } = useQuery({
    queryKey: ['comissoes'],
    queryFn: () => base44.entities.Comissao.list('-data_venda'),
  });

  const { data: comissoesEspelhamento = [], isLoading: isLoadingEspelhamento } = useQuery({
    queryKey: ['comissoesEspelhamento'],
    queryFn: () => base44.entities.ComissaoEspelhamento.list('-data_venda'),
  });

  const toggleVendedor = (vendedor) => {
    setFiltroVendedores(prev =>
      prev.includes(vendedor)
        ? prev.filter(v => v !== vendedor)
        : [...prev, vendedor]
    );
  };

  const todasComissoes = [
    ...comissoes.map(c => ({ ...c, tipo: 'vendedor' })),
    ...comissoesEspelhamento.map(c => ({ ...c, tipo: 'espelhamento' }))
  ].sort((a, b) => {
    const dateA = a.data_venda ? new Date(a.data_venda) : new Date(0);
    const dateB = b.data_venda ? new Date(b.data_venda) : new Date(0);
    return dateB - dateA;
  });

  const vendedoresUnicos = [...new Set(todasComissoes.map(c => c.vendedor_nome))].filter(Boolean);

  const comissoesFiltradas = todasComissoes.filter(c => {
    if (filtroVendedores.length > 0 && !filtroVendedores.includes(c.vendedor_nome)) return false;
    if (filtroPago === 'pago' && !c.pago) return false;
    if (filtroPago === 'pendente' && c.pago) return false;
    if (filtroTipo !== 'todos' && c.tipo !== filtroTipo) return false;
    return true;
  });

  const exportarCSV = () => {
    const headers = ['Data', 'Vendedor', 'Tipo', 'Valor Venda', 'Percentual', 'Comissão', 'Status'];
    const rows = comissoesFiltradas.map(c => [
      c.data_venda ? format(parseISO(c.data_venda), 'dd/MM/yyyy') : '-',
      c.vendedor_nome,
      c.tipo === 'vendedor' ? 'Vendedor' : 'Espelhamento',
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
    link.download = `comissoes_geral_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  const totalComissoes = comissoesFiltradas.reduce((sum, c) => sum + (c.valor_comissao || 0), 0);
  const totalPago = comissoesFiltradas.filter(c => c.pago).reduce((sum, c) => sum + (c.valor_comissao || 0), 0);
  const totalPendente = totalComissoes - totalPago;

  if (isLoadingComissoes || isLoadingEspelhamento) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Comissões Geral</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Visão geral de todas as comissões (vendedores + espelhamento)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Comissões</p>
                  <p className="text-2xl font-bold mt-2 dark:text-gray-100">
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pagas</p>
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendentes</p>
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
                    <Label className="text-xs">Vendedores</Label>
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
                  <Label className="text-xs">Tipo</Label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="border rounded px-3 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="todos">Todos</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="espelhamento">Espelhamento</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <select
                    value={filtroPago}
                    onChange={(e) => setFiltroPago(e.target.value)}
                    className="border rounded px-3 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor Venda</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoesFiltradas.map((comissao, index) => (
                  <TableRow key={`${comissao.tipo}-${comissao.id}`}>
                    <TableCell>
                      {comissao.data_venda ? format(parseISO(comissao.data_venda), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="font-medium">{comissao.vendedor_nome}</TableCell>
                    <TableCell>
                      <Badge variant={comissao.tipo === 'vendedor' ? 'default' : 'outline'}>
                        {comissao.tipo === 'vendedor' ? 'Vendedor' : 'Espelhamento'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {comissao.valor_venda?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>{comissao.percentual}%</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {comissao.valor_comissao?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={comissao.pago ? 'default' : 'secondary'}>
                        {comissao.pago ? 'Paga' : 'Pendente'}
                      </Badge>
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