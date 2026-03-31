import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Plus, Search, FileText, Send, DollarSign, Pencil, Trash2, Download, Paperclip, X, Save, Filter, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const STATUS_FLAGS = [
  { key: 'emitida', label: 'Solicitada', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', activeBg: 'bg-blue-500' },
  { key: 'enviada', label: 'Enviada', icon: Send, color: 'text-green-500', bg: 'bg-green-50', activeBg: 'bg-green-500' },
  { key: 'paga', label: 'Paga', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50', activeBg: 'bg-amber-500' },
];

const EMPTY_FORM = {
  cliente_parceiro: '', valor_liquido: '', produto: '',
  data_emissao: new Date().toISOString().split('T')[0],
  id_cobranca: '', observacao: '',
  mapa_producao_url: '', mapa_producao_nome: '',
  nf_url: '', nf_nome: '',
  emitida: false, enviada: false, paga: false,
};

export default function NotasFiscais() {
  const [showForm, setShowForm] = useState(false);
  const [editingNF, setEditingNF] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingNF, setUploadingNF] = useState(false);
  const [search, setSearch] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  const queryClient = useQueryClient();

  const { data: notas = [], isLoading } = useQuery({
    queryKey: ['notas-fiscais'],
    queryFn: () => base44.entities.NotaFiscal.list('-data_emissao'),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }, 'nome'),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome'),
  });

  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteDropOpen, setClienteDropOpen] = useState(false);
  const clienteDropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (clienteDropRef.current && !clienteDropRef.current.contains(e.target)) setClienteDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(clienteSearch.toLowerCase())
  ).slice(0, 10);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.NotaFiscal.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['notas-fiscais']); toast.success('NF cadastrada!'); fecharForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, nfAtual }) => {
      await base44.entities.NotaFiscal.update(id, data);
      // Se a NF está paga e tem venda vinculada, atualiza a venda
      const vendaId = nfAtual?.venda_id || data.venda_id;
      if (data.paga && vendaId) {
        await base44.entities.Venda.update(vendaId, {
          produto: data.produto || 'Nota Fiscal',
          cliente: data.cliente_parceiro,
          valor: parseFloat(data.valor_liquido) || 0,
          data: data.data_emissao,
          observacao: `Lançamento automático via NF. ID Cobrança: ${data.id_cobranca || '-'}`,
        });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries(['notas-fiscais']); queryClient.invalidateQueries(['vendas']); toast.success('NF atualizada!'); fecharForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (nf) => {
      // Se tinha venda vinculada, remove também
      if (nf.venda_id) {
        await base44.entities.Venda.delete(nf.venda_id).catch(() => {});
      }
      return base44.entities.NotaFiscal.delete(nf.id);
    },
    onSuccess: () => { queryClient.invalidateQueries(['notas-fiscais']); queryClient.invalidateQueries(['vendas']); toast.success('NF excluída!'); },
  });

  const toggleFlag = async (nf, flag, value) => {
    // Ao marcar como paga: criar venda. Ao desmarcar: remover venda vinculada.
    if (flag === 'paga') {
      if (value === true) {
        // Criar venda na entidade Venda
        const venda = await base44.entities.Venda.create({
          produto: nf.produto || 'Nota Fiscal',
          assessor_comercial: 'NOTA FISCAL',
          cliente: nf.cliente_parceiro,
          valor: nf.valor_liquido,
          data: nf.data_emissao || new Date().toISOString().split('T')[0],
          observacao: `Lançamento automático via NF. ID Cobrança: ${nf.id_cobranca || '-'}`,
          forma_pagamento: 'TRANSFERÊNCIA',
        });
        await base44.entities.NotaFiscal.update(nf.id, { paga: true, venda_id: venda.id });
        toast.success('NF marcada como paga e venda registrada!');
      } else {
        // Remover venda vinculada
        if (nf.venda_id) {
          await base44.entities.Venda.delete(nf.venda_id).catch(() => {});
        }
        await base44.entities.NotaFiscal.update(nf.id, { paga: false, venda_id: '' });
        toast.success('NF desmarcada. Venda removida.');
      }
    } else {
      await base44.entities.NotaFiscal.update(nf.id, { [flag]: value });
    }
    queryClient.invalidateQueries(['notas-fiscais']);
    queryClient.invalidateQueries(['vendas']);
  };

  const fecharForm = () => { setShowForm(false); setEditingNF(null); setFormData(EMPTY_FORM); };

  const abrirEdicao = (nf) => {
    setEditingNF(nf);
    setFormData({ ...EMPTY_FORM, ...nf });
    setShowForm(true);
  };

  const handleUploadMapa = async (file) => {
    if (!file) return;
    setUploadingFile(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(f => ({ ...f, mapa_producao_url: file_url, mapa_producao_nome: file.name }));
    setUploadingFile(false);
    toast.success('Arquivo anexado!');
  };

  const handleUploadNF = async (file) => {
    if (!file) return;
    setUploadingNF(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(f => ({ ...f, nf_url: file_url, nf_nome: file.name }));
    setUploadingNF(false);
    toast.success('NF anexada!');
  };

  const handleUploadNFDireto = async (nf, file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.NotaFiscal.update(nf.id, { nf_url: file_url, nf_nome: file.name });
    queryClient.invalidateQueries(['notas-fiscais']);
    toast.success('NF anexada!');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, valor_liquido: parseFloat(formData.valor_liquido) || 0 };
    if (editingNF) { updateMutation.mutate({ id: editingNF.id, data, nfAtual: editingNF }); }
    else { createMutation.mutate(data); }
  };

  const filteredNotas = useMemo(() => {
    return notas.filter(n => {
      const term = search.toLowerCase();
      const matchSearch = !term || n.cliente_parceiro?.toLowerCase().includes(term) || n.produto?.toLowerCase().includes(term) || n.id_cobranca?.toLowerCase().includes(term);
      const matchInicio = !dataInicio || (n.data_emissao && n.data_emissao >= dataInicio);
      const matchFim = !dataFim || (n.data_emissao && n.data_emissao <= dataFim);
      return matchSearch && matchInicio && matchFim;
    });
  }, [notas, search, dataInicio, dataFim]);

  const totalFiltrado = filteredNotas.reduce((s, n) => s + (n.valor_liquido || 0), 0);
  const totalSelecionado = filteredNotas.filter(n => selectedIds.includes(n.id)).reduce((s, n) => s + (n.valor_liquido || 0), 0);

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(prev => prev.length === filteredNotas.length ? [] : filteredNotas.map(n => n.id));

  const notasSelecionadas = selectedIds.length > 0 ? filteredNotas.filter(n => selectedIds.includes(n.id)) : filteredNotas;

  const gerarRelatorio = async (tipo = 'tela') => {
    if (notasSelecionadas.length === 0) { toast.error('Nenhuma NF para gerar relatório'); return; }
    if (tipo === 'tela') {
      const janela = window.open('', '_blank');
      const html = gerarHTMLRelatorio(notasSelecionadas);
      janela.document.write(html);
      janela.document.close();
      return;
    }
    setGerandoPDF(true);
    const html = gerarHTMLRelatorio(notasSelecionadas);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notas-fiscais-${format(new Date(), 'yyyy-MM-dd')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setGerandoPDF(false);
    toast.success('Relatório gerado!');
  };

  const gerarHTMLRelatorio = (lista) => {
    const periodoLabel = dataInicio && dataFim
      ? `${format(parseISO(dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(dataFim), 'dd/MM/yyyy')}`
      : 'Todos os períodos';
    const total = lista.reduce((s, n) => s + (n.valor_liquido || 0), 0);
    const rows = lista.map(n => `
      <tr>
        <td>${n.data_emissao ? format(parseISO(n.data_emissao), 'dd/MM/yyyy') : '-'}</td>
        <td>${n.cliente_parceiro || '-'}</td>
        <td>${n.produto || '-'}</td>
        <td>${n.id_cobranca || '-'}</td>
        <td style="text-align:right">${formatCurrency(n.valor_liquido)}</td>
        <td style="text-align:center">${n.emitida ? '✓' : '-'}</td>
        <td style="text-align:center">${n.enviada ? '✓' : '-'}</td>
        <td style="text-align:center">${n.paga ? '✓' : '-'}</td>
      </tr>`).join('');
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Notas Fiscais</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 20px; }
      h1 { color: #0f1e35; font-size: 18px; margin-bottom: 4px; }
      .sub { color: #666; font-size: 11px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background: #0f1e35; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
      td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
      tr:nth-child(even) td { background: #f9fafb; }
      .total { margin-top: 16px; text-align: right; font-size: 14px; font-weight: bold; color: #0f1e35; }
      @media print { button { display: none; } }
    </style></head><body>
    <h1>Villela Exchange — Relatório de Notas Fiscais</h1>
    <p class="sub">Período: ${periodoLabel} | Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
    <button onclick="window.print()" style="padding:6px 16px;background:#0f1e35;color:white;border:none;border-radius:6px;cursor:pointer;margin-bottom:12px;">Imprimir / Salvar PDF</button>
    <table>
      <thead><tr><th>Data Emissão</th><th>Cliente / Parceiro</th><th>Produto</th><th>ID Cobrança</th><th style="text-align:right">Valor Líquido</th><th>Solicitada</th><th>Enviada</th><th>Paga</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="total">Total: ${formatCurrency(total)}</p>
    </body></html>`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notas Fiscais</h1>
            <p className="text-gray-400 text-sm mt-0.5">Gestão de emissões e liquidações</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => gerarRelatorio('tela')} disabled={notasSelecionadas.length === 0}>
              <FileText className="w-4 h-4 mr-2" /> Relatório em Tela
            </Button>
            <Button variant="outline" onClick={() => gerarRelatorio('pdf')} disabled={gerandoPDF || notasSelecionadas.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
            <Button className="bg-[#1a3150] hover:bg-[#0f1e35]" onClick={() => { setEditingNF(null); setFormData(EMPTY_FORM); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nova NF
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por cliente, produto, ID de cobrança..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3150]" />
            </div>
            <div>
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Totalizadores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Cadastradas</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{notas.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide">No Filtro</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{filteredNotas.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Volume Filtrado</p>
            <p className="text-xl font-bold text-[#1a3150] mt-1">{formatCurrency(totalFiltrado)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Selecionados</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{selectedIds.length > 0 ? formatCurrency(totalSelecionado) : `${filteredNotas.length} NFs`}</p>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={selectedIds.length === filteredNotas.length && filteredNotas.length > 0}
                onChange={toggleAll} className="w-4 h-4 accent-[#1a3150] cursor-pointer" />
              <span className="text-sm text-gray-500">
                {selectedIds.length > 0 ? `${selectedIds.length} selecionada(s)` : `${filteredNotas.length} nota(s)`}
              </span>
            </div>
            {selectedIds.length > 0 && (
              <button onClick={() => setSelectedIds([])} className="text-xs text-red-400 hover:text-red-600">Limpar seleção</button>
            )}
          </div>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredNotas.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">Nenhuma nota fiscal encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left w-8"></th>
                    <th className="px-4 py-3 text-left">Data Emissão</th>
                    <th className="px-4 py-3 text-left">Cliente / Parceiro</th>
                    <th className="px-4 py-3 text-left">Produto</th>
                    <th className="px-4 py-3 text-left">ID Cobrança</th>
                    <th className="px-4 py-3 text-right">Valor Líquido</th>
                    <th className="px-4 py-3 text-left">Mapa</th>
                    <th className="px-4 py-3 text-left">NF Gerada</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredNotas.map(nf => (
                    <tr key={nf.id} className={`hover:bg-gray-50/50 transition ${selectedIds.includes(nf.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.includes(nf.id)} onChange={() => toggleSelect(nf.id)}
                          className="w-4 h-4 accent-[#1a3150] cursor-pointer" />
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {nf.data_emissao ? format(parseISO(nf.data_emissao), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{nf.cliente_parceiro}</td>
                      <td className="px-4 py-3 text-gray-600">{nf.produto || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{nf.id_cobranca || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(nf.valor_liquido)}
                      </td>
                      <td className="px-4 py-3">
                        {nf.mapa_producao_url ? (
                         <a href={nf.mapa_producao_url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs" title={nf.mapa_producao_nome}>
                           <Paperclip className="w-3.5 h-3.5" />
                           <span className="truncate max-w-[80px]">{nf.mapa_producao_nome || 'Arquivo'}</span>
                         </a>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {nf.nf_url ? (
                          <a href={nf.nf_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-xs" title={nf.nf_nome}>
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[80px]">{nf.nf_nome || 'NF'}</span>
                          </a>
                        ) : (
                          <label className="flex items-center gap-1 text-gray-400 hover:text-blue-500 text-xs cursor-pointer" title="Anexar NF gerada">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Anexar NF</span>
                            <input type="file" accept=".pdf" className="hidden"
                              onChange={e => e.target.files[0] && handleUploadNFDireto(nf, e.target.files[0])} />
                          </label>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {STATUS_FLAGS.map(flag => {
                            const Icon = flag.icon;
                            const ativo = nf[flag.key];
                            return (
                              <button key={flag.key} title={flag.label}
                                onClick={() => toggleFlag(nf, flag.key, !ativo)}
                                className={`p-1.5 rounded-lg transition ${ativo ? `${flag.activeBg} text-white` : `${flag.bg} ${flag.color} hover:opacity-80`}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => abrirEdicao(nf)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition" title="Editar">
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <button onClick={() => { if (confirm('Excluir esta NF?')) deleteMutation.mutate(nf); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition" title="Excluir">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-600">
                      Total ({filteredNotas.length} NFs)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#1a3150]">
                      {formatCurrency(totalFiltrado)}
                    </td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">{editingNF ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal'}</h2>
              <button onClick={fecharForm} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2" ref={clienteDropRef}>
                  <Label>Cliente / Parceiro *</Label>
                  <div className="relative">
                    <input
                      value={formData.cliente_parceiro}
                      onChange={e => { setFormData(f => ({ ...f, cliente_parceiro: e.target.value })); setClienteSearch(e.target.value); setClienteDropOpen(true); }}
                      onFocus={() => { setClienteSearch(formData.cliente_parceiro); setClienteDropOpen(true); }}
                      required
                      placeholder="Buscar ou digitar cliente/parceiro..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]"
                    />
                    {clienteDropOpen && clientesFiltrados.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {clientesFiltrados.map(c => (
                          <button key={c.id} type="button"
                            onMouseDown={() => { setFormData(f => ({ ...f, cliente_parceiro: c.nome })); setClienteDropOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition">
                            <span className="font-medium text-gray-900">{c.nome}</span>
                            {c.cpf_cnpj && <span className="text-xs text-gray-400 ml-2">{c.cpf_cnpj}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Produto</Label>
                  <select value={formData.produto} onChange={e => setFormData(f => ({ ...f, produto: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150] bg-white">
                    <option value="">Selecionar produto...</option>
                    {produtos.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Valor Líquido (R$) *</Label>
                  <Input type="number" step="0.01" min="0" value={formData.valor_liquido}
                    onChange={e => setFormData(f => ({ ...f, valor_liquido: e.target.value }))} required />
                </div>
                <div>
                  <Label>Data de Emissão *</Label>
                  <Input type="date" value={formData.data_emissao}
                    onChange={e => setFormData(f => ({ ...f, data_emissao: e.target.value }))} required />
                </div>
                <div>
                  <Label>ID da Cobrança</Label>
                  <Input value={formData.id_cobranca} onChange={e => setFormData(f => ({ ...f, id_cobranca: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Label>Mapa de Produção (arquivo)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-500 flex-1">
                      <Paperclip className="w-4 h-4" />
                      {uploadingFile ? 'Enviando...' : formData.mapa_producao_nome || 'Clique para anexar PDF, planilha...'}
                      <input type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden"
                        onChange={e => e.target.files[0] && handleUploadMapa(e.target.files[0])} disabled={uploadingFile} />
                    </label>
                    {formData.mapa_producao_url && (
                      <a href={formData.mapa_producao_url} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-2 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                        Visualizar
                      </a>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label>Nota Fiscal Gerada (PDF)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-blue-300 bg-blue-50/30 rounded-lg cursor-pointer hover:bg-blue-50 text-sm text-gray-500 flex-1">
                      <FileText className="w-4 h-4 text-blue-500" />
                      {uploadingNF ? 'Enviando...' : formData.nf_nome || 'Anexar NF gerada (PDF)...'}
                      <input type="file" accept=".pdf" className="hidden"
                        onChange={e => e.target.files[0] && handleUploadNF(e.target.files[0])} disabled={uploadingNF} />
                    </label>
                    {formData.nf_url && (
                      <a href={formData.nf_url} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-2 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                        Visualizar
                      </a>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label>Observação</Label>
                  <Textarea value={formData.observacao} onChange={e => setFormData(f => ({ ...f, observacao: e.target.value }))} rows={2} />
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-2 block">Status</Label>
                  <div className="flex gap-4">
                    {STATUS_FLAGS.map(flag => (
                      <label key={flag.key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!formData[flag.key]}
                          onChange={e => setFormData(f => ({ ...f, [flag.key]: e.target.checked }))}
                          className="w-4 h-4 accent-[#1a3150]" />
                        <span className="text-sm text-gray-600">{flag.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={fecharForm}>Cancelar</Button>
                <Button type="submit" className="bg-[#1a3150] hover:bg-[#0f1e35]"
                  disabled={createMutation.isPending || updateMutation.isPending || uploadingFile}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingNF ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}