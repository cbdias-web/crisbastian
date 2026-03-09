import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { X, Save, Plus, Trash2, AlertTriangle, Search, UserPlus } from "lucide-react";

const formasPagamento = [
  "DÉBITO EM CONTA", "CARTÃO DE CRÉDITO", "BOLETO", "PIX", "TRANSFERÊNCIA", "DINHEIRO"
];

export default function VendaForm({ venda, onSave, onCancel, isLoading, isAdmin }) {
  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list('nome'),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }, 'nome'),
  });

  const { data: espelhamentos = [] } = useQuery({
    queryKey: ['espelhamentos'],
    queryFn: () => base44.entities.Espelhamento.filter({ ativo: true }, 'nome'),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome'),
  });

  const [clienteSearch, setClienteSearch] = useState(venda?.cliente || '');
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', cpf_cnpj: '', email: '', telefone: '', cidade: '', estado: '', observacao: '' });
  const [criandoCliente, setCriandoCliente] = useState(false);
  const clienteRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (clienteRef.current && !clienteRef.current.contains(e.target)) setClienteDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.cpf_cnpj?.includes(clienteSearch)
  ).slice(0, 8);

  const selecionarCliente = (c) => {
    setFormData(f => ({ ...f, cliente: c.nome, cpf_cnpj: c.cpf_cnpj || f.cpf_cnpj }));
    setClienteSearch(c.nome);
    setClienteDropdown(false);
  };

  const handleCriarCliente = async () => {
    if (!novoCliente.nome.trim()) return;
    setCriandoCliente(true);
    const novo = await base44.entities.Cliente.create({ ...novoCliente, nome: novoCliente.nome.trim() });
    setFormData(f => ({ ...f, cliente: novo.nome, cpf_cnpj: novo.cpf_cnpj || f.cpf_cnpj }));
    setClienteSearch(novo.nome);
    setNovoCliente({ nome: '', cpf_cnpj: '', email: '', telefone: '', cidade: '', estado: '', observacao: '' });
    setShowNovoClienteModal(false);
    setClienteDropdown(false);
    setCriandoCliente(false);
  };

  const hoje = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState(venda || {
    produto: '', assessor_comercial: '', time: '', valor: '', data: hoje,
    forma_pagamento: '', parcelamento: '', cpf_cnpj: '', cliente: '',
    bitrix: '', observacao: '', vendedor_id: '', percentual_comissao: 10,
  });

  // Multi-indicador state — backward compat com campo antigo
  const [indicadores, setIndicadores] = useState(() => {
    if (venda?.indicadores?.length > 0) return venda.indicadores;
    if (venda?.espelhamento_id) {
      return [{ id: venda.espelhamento_id, nome: venda.espelhamento || '', percentual: venda.percentual_comissao_espelhamento || 10 }];
    }
    return [];
  });

  const totalPctIndicadores = indicadores.reduce((s, i) => s + (parseFloat(i.percentual) || 0), 0);
  const limiteExcedido = !isAdmin && totalPctIndicadores > 30;

  const handleVendedorChange = (vendedorId) => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    setFormData({ ...formData, vendedor_id: vendedorId, assessor_comercial: vendedor?.nome || '', percentual_comissao: vendedor?.percentual_comissao || 10 });
  };

  const addIndicador = () => {
    setIndicadores(prev => [...prev, { id: '', nome: '', percentual: 10 }]);
  };

  const removeIndicador = (idx) => {
    setIndicadores(prev => prev.filter((_, i) => i !== idx));
  };

  const updateIndicadorEsp = (idx, espId) => {
    const esp = espelhamentos.find(e => e.id === espId);
    setIndicadores(prev => prev.map((ind, i) =>
      i === idx ? { id: espId, nome: esp?.nome || '', percentual: esp?.percentual_comissao || 10 } : ind
    ));
  };

  const updateIndicadorPct = (idx, pct) => {
    setIndicadores(prev => prev.map((ind, i) =>
      i === idx ? { ...ind, percentual: parseFloat(pct) || 0 } : ind
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (limiteExcedido) return;
    const dataToSave = {
      ...formData,
      valor: parseFloat(formData.valor) || 0,
      percentual_comissao: parseFloat(formData.percentual_comissao) || 0,
      indicadores,
      // backward compat
      espelhamento: indicadores[0]?.nome || '',
      espelhamento_id: indicadores[0]?.id || '',
      percentual_comissao_espelhamento: indicadores[0]?.percentual || 0,
    };
    onSave(dataToSave);
  };

  return (
    <>
      <CardHeader>
        <CardTitle>{venda ? 'Editar Venda' : 'Nova Venda'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Produto *</Label>
              <Select value={formData.produto} onValueChange={v => setFormData({ ...formData, produto: v })} required>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {produtos.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendedor *</Label>
              <Select value={formData.vendedor_id} onValueChange={handleVendedorChange} required>
                <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                <SelectContent>
                  {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Comissão Vendedor (%)</Label>
              <Input type="number" step="0.1" value={formData.percentual_comissao}
                onChange={e => setFormData({ ...formData, percentual_comissao: e.target.value })} />
            </div>
            <div>
              <Label>Valor *</Label>
              <Input type="number" step="0.01" value={formData.valor}
                onChange={e => setFormData({ ...formData, valor: e.target.value })} required />
            </div>
            <div>
              <Label>Data *</Label>
              <Input type="date" value={formData.data}
                onChange={e => setFormData({ ...formData, data: e.target.value })} required />
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={formData.forma_pagamento} onValueChange={v => setFormData({ ...formData, forma_pagamento: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2" ref={clienteRef}>
              <Label>Cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={clienteSearch}
                  onChange={e => { setClienteSearch(e.target.value); setFormData(f => ({ ...f, cliente: e.target.value })); setClienteDropdown(true); }}
                  onFocus={() => setClienteDropdown(true)}
                  placeholder="Buscar ou digitar nome do cliente..."
                  className="w-full pl-9 pr-4 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                />
                {clienteDropdown && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                    {clientesFiltrados.map(c => (
                      <button key={c.id} type="button" onMouseDown={() => selecionarCliente(c)}
                        className="w-full flex items-start gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{c.nome}</p>
                          {c.cpf_cnpj && <p className="text-xs text-gray-400">{c.cpf_cnpj}</p>}
                        </div>
                      </button>
                    ))}
                    {clientesFiltrados.length === 0 && clienteSearch.trim() && (
                      <div className="px-4 py-2 text-xs text-gray-500">Nenhum cliente encontrado.</div>
                    )}
                    <div className="border-t border-gray-100 p-2">
                      <button type="button"
                        onMouseDown={() => { setShowNovoClienteModal(true); setClienteDropdown(false); }}
                        className="w-full flex items-center gap-1.5 px-3 py-2 bg-[#1a3150] text-white rounded-lg text-xs font-medium hover:opacity-90 justify-center">
                        <UserPlus className="w-3.5 h-3.5" /> Cadastrar novo cliente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>CPF/CNPJ</Label>
              <Input value={formData.cpf_cnpj || ''} onChange={e => setFormData({ ...formData, cpf_cnpj: e.target.value })} />
            </div>
            <div>
              <Label>Time</Label>
              <Select value={formData.time || ''} onValueChange={v => setFormData({ ...formData, time: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o time" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIME 1">TIME 1</SelectItem>
                  <SelectItem value="TIME 2">TIME 2</SelectItem>
                  <SelectItem value="TIME 3">TIME 3</SelectItem>
                  <SelectItem value="CONSÓRCIO">CONSÓRCIO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link Bitrix</Label>
              <Input value={formData.bitrix || ''} onChange={e => setFormData({ ...formData, bitrix: e.target.value })} />
            </div>
          </div>

          {/* Indicadores (Espelhamento) - múltiplos */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Indicadores (Espelhamento)</h3>
                {indicadores.length > 0 && (
                  <p className={`text-xs mt-0.5 ${limiteExcedido ? "text-red-600 font-semibold" : totalPctIndicadores > 25 ? "text-amber-600" : "text-gray-400"}`}>
                    Total indicadores: {totalPctIndicadores.toFixed(1)}%{!isAdmin ? " (máx 30%)" : ""}
                  </p>
                )}
              </div>
              <button type="button" onClick={addIndicador}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1a3150] text-white rounded-lg hover:opacity-90 transition">
                <Plus className="w-3.5 h-3.5" /> Adicionar Indicador
              </button>
            </div>

            {limiteExcedido && (
              <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">O total de comissões dos indicadores não pode ultrapassar 30%. Apenas administradores podem definir percentuais maiores.</p>
              </div>
            )}

            {indicadores.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">Nenhum indicador adicionado</p>
            ) : (
              <div className="space-y-2">
                {indicadores.map((ind, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select value={ind.id} onValueChange={espId => updateIndicadorEsp(idx, espId)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione o indicador" />
                        </SelectTrigger>
                        <SelectContent>
                          {espelhamentos.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20">
                      <Input type="number" step="0.1" value={ind.percentual}
                        onChange={e => updateIndicadorPct(idx, e.target.value)}
                        className="h-9 text-sm text-center" />
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">%</span>
                    <button type="button" onClick={() => removeIndicador(idx)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Observação</Label>
            <Textarea value={formData.observacao || ''} onChange={e => setFormData({ ...formData, observacao: e.target.value })} rows={3} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" /> Cancelar
          </Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isLoading || limiteExcedido}>
            <Save className="w-4 h-4 mr-2" /> Salvar
          </Button>
        </CardFooter>
      </form>

    {/* Modal novo cliente */}

    {showNovoClienteModal && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Novo Cliente</h3>
            <button type="button" onClick={() => setShowNovoClienteModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nome *</label>
              <input value={novoCliente.nome} onChange={e => setNovoCliente(p => ({ ...p, nome: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="Nome completo" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">CPF / CNPJ</label>
              <input value={novoCliente.cpf_cnpj} onChange={e => setNovoCliente(p => ({ ...p, cpf_cnpj: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="000.000.000-00" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</label>
                <input value={novoCliente.telefone} onChange={e => setNovoCliente(p => ({ ...p, telefone: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</label>
                <input type="email" value={novoCliente.email} onChange={e => setNovoCliente(p => ({ ...p, email: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="email@exemplo.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cidade</label>
                <input value={novoCliente.cidade} onChange={e => setNovoCliente(p => ({ ...p, cidade: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estado (UF)</label>
                <input value={novoCliente.estado} onChange={e => setNovoCliente(p => ({ ...p, estado: e.target.value }))}
                  maxLength={2} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" placeholder="SP" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Observação</label>
              <textarea value={novoCliente.observacao} onChange={e => setNovoCliente(p => ({ ...p, observacao: e.target.value }))}
                rows={2} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] resize-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowNovoClienteModal(false)}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="button" onClick={handleCriarCliente} disabled={criandoCliente || !novoCliente.nome.trim()}
              className="flex-1 px-4 py-2 text-sm bg-[#1a3150] text-white rounded-xl hover:bg-[#0f1e35] font-medium disabled:opacity-50">
              {criandoCliente ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}