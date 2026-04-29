import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format as fmtDate } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Users, Shuffle, Trash2, CheckCircle2, Clock, FileText, AlertTriangle, X, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  return lines.slice(1).map(line => {
    const cols = line.split(/[;,]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
    const nome = obj['nome'] || obj['name'] || obj['razao_social'] || obj['razão social'] || '';
    const cpf_cnpj = obj['cpf'] || obj['cnpj'] || obj['cpf_cnpj'] || obj['cpf/cnpj'] || '';
    const telefone = obj['telefone'] || obj['celular'] || obj['fone'] || obj['phone'] || '';
    return { nome: nome.trim(), cpf_cnpj: cpf_cnpj.trim(), telefone: telefone.trim() };
  }).filter(r => r.nome);
};

export default function Leads() {
  const [user, setUser] = useState(null);
  const [importando, setImportando] = useState(false);
  const [distribuindo, setDistribuindo] = useState(null);
  const [redistribuindo, setRedistribuindo] = useState(null);
  const [deduplicando, setDeduplicando] = useState(false);
  const [progresso, setProgresso] = useState(null); // { atual, total, loteId }
  const [excluindo, setExcluindo] = useState(null);
  const [revertendo, setRevertendo] = useState(null);
  const [nomeLote, setNomeLote] = useState('');
  const [preview, setPreview] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [expandedLote, setExpandedLote] = useState(null);
  // Seleção de vendedores por lote (distribuição e redistribuição)
  const [selectedVendedores, setSelectedVendedores] = useState([]);
  const [showVendedoresModal, setShowVendedoresModal] = useState(null); // { lote, modo: 'distribuir'|'redistribuir' }
  const [distribuicaoTipo, setDistribuicaoTipo] = useState('coletivo'); // 'individual' | 'coletivo'
  const [subcarteira, setSubcarteira] = useState('');
  const fileRef = useRef();
  const [dragging, setDragging] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: lotes = [], isLoading } = useQuery({
    queryKey: ['lotes-leads'],
    queryFn: () => base44.entities.LoteLead.list('-created_date'),
    enabled: isAdmin
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-todos'],
    queryFn: () => base44.entities.Lead.list('nome', 10000),
    enabled: isAdmin
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-ativos-leads'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: isAdmin
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset input so same file can be selected again
    e.target.value = '';
    try {
      const isExcel = file.name.match(/\.xlsx?$/i);
      let rows = [];
      if (isExcel) {
        // Upload e extração via integração
        toast.info('Processando arquivo Excel...');
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    nome: { type: 'string' },
                    cpf_cnpj: { type: 'string' },
                    telefone: { type: 'string' },
                  }
                }
              }
            }
          }
        });
        if (result.status === 'error') throw new Error(result.details || 'Erro ao processar Excel');
        rows = (result.output?.items || []).filter(r => r.nome?.trim());
      } else {
        const text = await file.text();
        rows = parseCSV(text);
      }
      if (rows.length === 0) {
        toast.error('Nenhum dado válido encontrado. Verifique se o arquivo tem a coluna "nome".');
        return;
      }
      setPreview(rows);
      setNomeLote(file.name.replace(/\.[^.]+$/, ''));
      toast.success(`${rows.length} registros encontrados`);
    } catch (err) {
      toast.error('Erro ao ler arquivo: ' + (err.message || 'Verifique o formato do arquivo'));
    }
  };

  const importarLote = async () => {
    if (!preview || !nomeLote.trim()) { toast.error('Informe um nome para o lote'); return; }
    setImportando(true);
    try {
      const lote = await base44.entities.LoteLead.create({ nome: nomeLote.trim(), total: preview.length, status: 'pendente' });
      const chunks = [];
      for (let i = 0; i < preview.length; i += 50) chunks.push(preview.slice(i, i + 50));
      for (const chunk of chunks) {
        await base44.entities.Lead.bulkCreate(chunk.map(r => ({ ...r, lote_id: lote.id, lote_nome: lote.nome, status: 'pendente', convertido: false })));
      }
      toast.success(`${preview.length} leads importados!`);
      setPreview(null); setNomeLote(''); setShowImport(false);
      queryClient.invalidateQueries(['lotes-leads']);
      queryClient.invalidateQueries(['leads-todos']);
    } catch (e) { toast.error('Erro ao importar leads'); }
    setImportando(false);
  };

  const abrirDistribuicao = (lote, modo) => {
    setSelectedVendedores(vendedores.map(v => v.id));
    setDistribuicaoTipo('coletivo');
    setSubcarteira('');
    setShowVendedoresModal({ lote, modo });
  };

  const executarDistribuicao = async () => {
    const { lote, modo } = showVendedoresModal;
    const vendedoresSelecionados = vendedores.filter(v => selectedVendedores.includes(v.id));
    if (vendedoresSelecionados.length === 0) { toast.error('Selecione pelo menos um gerente/vendedor'); return; }

    setShowVendedoresModal(null);
    if (modo === 'distribuir') setDistribuindo(lote.id);
    else setRedistribuindo(lote.id);

    try {
      // Pegar leads do lote diretamente da query (já em memória)
      let leadsParaDistribuir;
      if (modo === 'distribuir') {
        leadsParaDistribuir = leads.filter(l => l.lote_id === lote.id && l.status === 'pendente');
      } else {
        leadsParaDistribuir = leads.filter(l => l.lote_id === lote.id && l.status === 'distribuido' && !l.convertido);
      }

      if (leadsParaDistribuir.length === 0) {
        toast.info('Nenhum lead disponível para distribuição');
        setDistribuindo(null); setRedistribuindo(null);
        return;
      }

      // Embaralhar e atribuir vendedor
      const embaralhados = [...leadsParaDistribuir].sort(() => Math.random() - 0.5);
      let assignments;
      if (distribuicaoTipo === 'individual') {
        // Cada vendedor selecionado recebe TODOS os leads
        assignments = vendedoresSelecionados.flatMap(vendedor =>
          embaralhados.map(lead => ({
            leadId: lead.id,
            leadNome: lead.nome,
            leadCpfCnpj: lead.cpf_cnpj || '',
            leadTelefone: lead.telefone || '',
            leadClienteId: lead.cliente_id || '',
            vendedorId: vendedor.id,
            vendedorNome: vendedor.nome,
          }))
        );
      } else {
        // Leads divididos aleatoriamente entre os vendedores
        assignments = embaralhados.map((lead, i) => ({
          leadId: lead.id,
          leadNome: lead.nome,
          leadCpfCnpj: lead.cpf_cnpj || '',
          leadTelefone: lead.telefone || '',
          leadClienteId: lead.cliente_id || '',
          vendedorId: vendedoresSelecionados[i % vendedoresSelecionados.length].id,
          vendedorNome: vendedoresSelecionados[i % vendedoresSelecionados.length].nome,
        }));
      }

      // Dividir em lotes de 300 e chamar função sequencialmente
      const LOTE_SIZE = 300;
      const batches = [];
      for (let i = 0; i < assignments.length; i += LOTE_SIZE) {
        batches.push(assignments.slice(i, i + LOTE_SIZE));
      }

      setProgresso({ atual: 0, total: assignments.length, loteId: lote.id });

      let processados = 0;
      for (const batch of batches) {
        await base44.functions.invoke('distribuirLeads', {
          mode: 'batch',
          modo,
          loteNome: lote.nome,
          assignments: batch,
          subcarteira: subcarteira.trim() || null,
        });
        processados += batch.length;
        setProgresso({ atual: processados, total: assignments.length, loteId: lote.id });
      }

      // Gerar agenda e finalizar lote
      const LEADS_POR_DIA = 5;
      const hoje = new Date();
      const leadsPorVendedor = {};
      assignments.forEach(a => {
        if (!leadsPorVendedor[a.vendedorId]) leadsPorVendedor[a.vendedorId] = { vendedorId: a.vendedorId, vendedorNome: a.vendedorNome, items: [] };
        leadsPorVendedor[a.vendedorId].items.push(a);
      });
      const agendaRecords = [];
      for (const { vendedorId, vendedorNome, items } of Object.values(leadsPorVendedor)) {
        items.forEach((a, i) => {
          const d = new Date(hoje);
          d.setDate(d.getDate() + Math.floor(i / LEADS_POR_DIA));
          agendaRecords.push({
            lead_id: a.leadId,
            lead_nome: a.leadNome,
            lead_cpf_cnpj: a.leadCpfCnpj || '',
            lead_telefone: a.leadTelefone || '',
            cliente_id: '',
            vendedor_id: vendedorId,
            vendedor_nome: vendedorNome,
            data_agendada: d.toISOString().split('T')[0],
            posicao_dia: (i % LEADS_POR_DIA) + 1,
            lote_id: lote.id,
            status: 'pendente'
          });
        });
      }

      await base44.functions.invoke('distribuirLeads', {
        mode: 'finalizar',
        modo,
        loteId: lote.id,
        agendaRecords,
      });

      toast.success(`${assignments.length} leads distribuídos com sucesso!`);
      queryClient.invalidateQueries(['lotes-leads']);
      queryClient.invalidateQueries(['leads-todos']);
    } catch (e) {
      toast.error('Erro na distribuição: ' + (e.response?.data?.error || e.message));
    }
    setDistribuindo(null); setRedistribuindo(null);
    setProgresso(null);
  };

  const executarDeduplicacao = async () => {
    if (!confirm('Isso vai remover leads duplicados (sem nenhuma interação registrada), mantendo apenas um por CPF/CNPJ ou nome. Continuar?')) return;
    setDeduplicando(true);
    try {
      const res = await base44.functions.invoke('deduplicarLeads', {});
      const { excluidos, grupos_com_duplicatas } = res.data;
      toast.success(`${excluidos} lead(s) duplicado(s) removido(s) de ${grupos_com_duplicatas} grupo(s)!`);
      queryClient.invalidateQueries(['leads-todos']);
      queryClient.invalidateQueries(['clientes-crm']);
    } catch (e) {
      toast.error('Erro ao deduplicar: ' + (e.response?.data?.error || e.message));
    }
    setDeduplicando(false);
  };

  const reverterDistribuicao = async (lote, vendedor = null) => {
    const msg = vendedor
      ? `Reverter os leads de "${vendedor.nome}" no lote "${lote.nome}"? Os leads voltarão para pendente e os clientes criados serão removidos.`
      : `Reverter TODA a distribuição do lote "${lote.nome}"? Todos os leads voltarão para pendente.`;
    if (!confirm(msg)) return;
    setRevertendo(lote.id);
    try {
      const payload = { loteId: lote.id };
      if (vendedor) payload.vendedorId = vendedor.id;
      const res = await base44.functions.invoke('reverterDistribuicao', payload);
      const { leadsRevertidos, clientesExcluidos } = res.data;
      toast.success(`${leadsRevertidos} lead(s) revertido(s), ${clientesExcluidos} cliente(s) removido(s)!`);
      queryClient.invalidateQueries(['lotes-leads']);
      queryClient.invalidateQueries(['leads-todos']);
    } catch (e) { toast.error('Erro ao reverter: ' + (e.response?.data?.error || e.message)); }
    setRevertendo(null);
  };

  const excluirLote = async (lote) => {
    if (!confirm(`Excluir o lote "${lote.nome}"? Os clientes já convertidos em carteira serão mantidos.`)) return;
    setExcluindo(lote.id);
    try {
      const leadsDoLote = leads.filter(l => l.lote_id === lote.id);
      for (const lead of leadsDoLote) await base44.entities.Lead.delete(lead.id);
      await base44.entities.LoteLead.delete(lote.id);
      toast.success('Lote excluído!');
      queryClient.invalidateQueries(['lotes-leads']);
      queryClient.invalidateQueries(['leads-todos']);
    } catch (e) { toast.error('Erro ao excluir lote'); }
    setExcluindo(null);
  };

  const getLoteStats = (loteId) => {
    const ls = leads.filter(l => l.lote_id === loteId);
    const distribuidos = ls.filter(l => l.status === 'distribuido');
    const convertidos = ls.filter(l => l.convertido);
    const naoConvertidos = distribuidos.filter(l => !l.convertido);
    return { total: ls.length, pendentes: ls.filter(l => l.status === 'pendente').length, distribuidos: distribuidos.length, convertidos: convertidos.length, naoConvertidos: naoConvertidos.length };
  };

  const getLeadsNaoConvertidos = (loteId) => leads.filter(l => l.lote_id === loteId && l.status === 'distribuido' && !l.convertido);

  if (!isAdmin) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <AlertTriangle className="w-10 h-10 text-gray-300 mr-3" />
      <p className="text-gray-500">Acesso restrito a administradores.</p>
    </div>
  );

  const totalPendentes = lotes.filter(l => l.status === 'pendente').reduce((s, l) => s + (l.total || 0), 0);
  const totalConvertidos = leads.filter(l => l.convertido).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prospecção — Novos Leads</h1>
            <p className="text-sm text-gray-500 mt-0.5">Importe listas e distribua entre gerentes/vendedores selecionados</p>
          </div>
          <div className="flex items-center gap-2">
          <Button variant="outline" onClick={executarDeduplicacao} disabled={deduplicando} className="border-amber-200 text-amber-700 hover:bg-amber-50">
            {deduplicando ? <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-2" /> : <Shuffle className="w-4 h-4 mr-2" />}
            Remover Duplicados
          </Button>
          <Button onClick={() => setShowImport(true)} className="bg-[#0f1e35] hover:bg-[#1a3150] text-white">
            <Upload className="w-4 h-4 mr-2" /> Importar Lista
          </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0f1e35] text-white rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold">{lotes.length}</p>
            <p className="text-xs opacity-70 mt-0.5">Lotes importados</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 shadow-sm border border-amber-100">
            <p className="text-2xl font-bold text-amber-700">{totalPendentes}</p>
            <p className="text-xs text-amber-600 mt-0.5">Aguardando distribuição</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 shadow-sm border border-emerald-100">
            <p className="text-2xl font-bold text-emerald-700">{totalConvertidos}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Leads convertidos</p>
          </div>
        </div>

        {/* Vendedores ativos */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-semibold text-blue-800">{vendedores.length} gerente(s)/vendedor(es) ativo(s)</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {vendedores.map(v => (
              <span key={v.id} className="text-xs bg-white border border-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">{v.nome}</span>
            ))}
          </div>
        </div>

        {/* Barra de progresso */}
        {progresso && (
          <div className="bg-white rounded-2xl border border-[#1a3150]/20 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-[#1a3150]">Distribuindo leads...</p>
              <p className="text-sm font-bold text-[#1a3150]">{progresso.atual} / {progresso.total}</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-[#1a3150] h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((progresso.atual / progresso.total) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{Math.round((progresso.atual / progresso.total) * 100)}% concluído — aguarde, não feche a página</p>
          </div>
        )}

        {/* Lista de lotes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Lotes de Leads</h3>
          </div>
          {isLoading ? (
            <div className="py-16 flex justify-center"><div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" /></div>
          ) : lotes.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">Nenhum lote importado ainda</p>
            </div>
          ) : lotes.map(lote => {
            const stats = getLoteStats(lote.id);
            const isExpanded = expandedLote === lote.id;
            const naoConvertidos = getLeadsNaoConvertidos(lote.id);

            return (
              <div key={lote.id} className="border-b border-gray-50 last:border-0">
                <div className="px-5 py-4 flex items-center gap-4">
                  <button onClick={() => setExpandedLote(isExpanded ? null : lote.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{lote.nome}</p>
                      {lote.status === 'distribuido' ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Distribuído
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pendente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      <span>{stats.total} leads</span>
                      {stats.distribuidos > 0 && <span className="text-blue-600 font-medium">{stats.distribuidos} distribuídos</span>}
                      {stats.convertidos > 0 && <span className="text-emerald-600 font-medium">{stats.convertidos} convertidos</span>}
                      {stats.naoConvertidos > 0 && <span className="text-amber-600 font-medium">{stats.naoConvertidos} em tratamento</span>}
                      <span>Importado em {lote.created_date ? format(new Date(lote.created_date), 'dd/MM/yyyy') : '—'}</span>
                    </div>
                    {/* Barra de progresso de conversão */}
                    {stats.total > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden flex">
                            <div
                              className="bg-emerald-500 h-2 transition-all"
                              style={{ width: `${Math.round((stats.convertidos / stats.total) * 100)}%` }}
                            />
                            <div
                              className="bg-blue-400 h-2 transition-all"
                              style={{ width: `${Math.round((stats.naoConvertidos / stats.total) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">
                            {Math.round((stats.convertidos / stats.total) * 100)}% convertidos
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Convertidos ({stats.convertidos})</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Em tratamento ({stats.naoConvertidos})</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />Pendentes ({stats.pendentes})</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lote.status === 'pendente' && (
                      <Button size="sm" onClick={() => abrirDistribuicao(lote, 'distribuir')} disabled={distribuindo === lote.id} className="bg-[#0f1e35] hover:bg-[#1a3150] text-white">
                        {distribuindo === lote.id ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" /> : <Shuffle className="w-3.5 h-3.5 mr-1.5" />}
                        Distribuir
                      </Button>
                    )}
                    {(lote.status === 'distribuido' || stats.distribuidos > 0) && (
                      <Button size="sm" variant="outline" onClick={() => reverterDistribuicao(lote)} disabled={revertendo === lote.id} className="border-orange-200 text-orange-600 hover:bg-orange-50">
                        {revertendo === lote.id ? <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mr-1.5" /> : <span className="mr-1.5">↩</span>}
                        Reverter
                      </Button>
                    )}
                    {(lote.status === 'distribuido' || stats.distribuidos > 0) && stats.naoConvertidos > 0 && (
                      <Button size="sm" variant="outline" onClick={() => abrirDistribuicao(lote, 'redistribuir')} disabled={redistribuindo === lote.id} className="border-blue-200 text-blue-600 hover:bg-blue-50">
                        {redistribuindo === lote.id ? <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                        Redistribuir ({stats.naoConvertidos})
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => excluirLote(lote)} disabled={excluindo === lote.id} className="text-red-500 border-red-200 hover:bg-red-50">
                      {excluindo === lote.id ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Leads não convertidos expandido */}
                {isExpanded && naoConvertidos.length > 0 && (() => {
                  // Agrupar por vendedor
                  const porVendedor = {};
                  naoConvertidos.forEach(l => {
                    if (!porVendedor[l.vendedor_id]) porVendedor[l.vendedor_id] = { id: l.vendedor_id, nome: l.vendedor_nome, leads: [] };
                    porVendedor[l.vendedor_id].leads.push(l);
                  });
                  return (
                    <div className="px-5 pb-4 bg-gray-50/50">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Leads por vendedor ({naoConvertidos.length})</p>
                      <div className="space-y-2">
                        {Object.values(porVendedor).map(vend => (
                          <div key={vend.id} className="bg-white rounded-xl border border-gray-100 p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs font-semibold text-gray-700">{vend.nome} <span className="text-gray-400 font-normal">({vend.leads.length} leads)</span></p>
                              <button
                                onClick={() => reverterDistribuicao(lote, vend)}
                                disabled={revertendo === lote.id}
                                className="text-[10px] font-semibold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2 py-1 rounded-lg transition disabled:opacity-40"
                              >
                                ↩ Reverter apenas {vend.nome.split(' ')[0]}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                              {vend.leads.map(lead => (
                                <div key={lead.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                  <span className="font-medium text-gray-800 truncate">{lead.nome}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {isExpanded && naoConvertidos.length === 0 && lote.status === 'distribuido' && (
                  <div className="px-5 pb-4 bg-emerald-50/30">
                    <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Todos os leads deste lote foram convertidos!
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal seleção de vendedores */}
      {showVendedoresModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {showVendedoresModal.modo === 'distribuir' ? 'Selecionar Gerentes para Distribuição' : 'Redistribuir Leads Não Convertidos'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Lote: {showVendedoresModal.lote.nome}</p>
              </div>
              <button onClick={() => setShowVendedoresModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-3">
              {/* Tipo de distribuição */}
              <div className="flex gap-2 mb-1">
                <button
                  onClick={() => { setDistribuicaoTipo('coletivo'); setSelectedVendedores(vendedores.map(v => v.id)); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${
                    distribuicaoTipo === 'coletivo' ? 'bg-[#0f1e35] text-white border-[#0f1e35]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  Coletivo (vários)
                </button>
                <button
                  onClick={() => { setDistribuicaoTipo('individual'); setSelectedVendedores(vendedores.length > 0 ? [vendedores[0].id] : []); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${
                    distribuicaoTipo === 'individual' ? 'bg-[#0f1e35] text-white border-[#0f1e35]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  Individual (um só)
                </button>
              </div>
              {distribuicaoTipo === 'coletivo' && (
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">Leads distribuídos aleatoriamente entre os selecionados:</p>
                  <button
                    onClick={() => setSelectedVendedores(selectedVendedores.length === vendedores.length ? [] : vendedores.map(v => v.id))}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {selectedVendedores.length === vendedores.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>
              )}
              {distribuicaoTipo === 'individual' && (
                <p className="text-xs text-gray-500">Cada vendedor selecionado recebe <strong>todos</strong> os leads:</p>
              )}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {vendedores.map(v => (
                  <label key={v.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition text-sm ${
                    selectedVendedores.includes(v.id)
                      ? 'bg-[#0f1e35]/5 border-[#1a3150]/30 text-gray-900' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedVendedores.includes(v.id)}
                      onChange={() => setSelectedVendedores(prev => prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id])}
                      className="w-4 h-4 accent-[#1a3150]"
                    />
                    <span className="font-medium flex-1">{v.nome}</span>
                    {v.time && <span className="text-xs text-gray-400">{v.time}</span>}
                  </label>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Subcarteira / Pasta <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input
                  type="text"
                  value={subcarteira}
                  onChange={e => setSubcarteira(e.target.value)}
                  placeholder="Ex: Importadores Abril, Lista SP..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]"
                />
                <p className="text-[10px] text-gray-400 mt-1">Se preenchido, os leads ficam agrupados nesta pasta na carteira do vendedor.</p>
              </div>
              {showVendedoresModal.modo === 'redistribuir' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs text-blue-700">Os leads <strong>não convertidos</strong> serão removidos das carteiras atuais e redistribuídos aleatoriamente entre os selecionados.</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowVendedoresModal(null)}>Cancelar</Button>
              <Button onClick={executarDistribuicao} disabled={selectedVendedores.length === 0} className="bg-[#0f1e35] hover:bg-[#1a3150]">
                <Shuffle className="w-4 h-4 mr-2" />
                {showVendedoresModal.modo === 'distribuir' ? 'Distribuir' : 'Redistribuir'} para {selectedVendedores.length} gerente(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal importação */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#1a3150]" />
                <h3 className="font-semibold text-gray-900">Importar Lista de Leads</h3>
              </div>
              <button onClick={() => { setShowImport(false); setPreview(null); setNomeLote(''); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-700">
                  <strong>Formato:</strong> CSV ou Excel (.xlsx) com colunas <code className="bg-blue-100 px-1 rounded">nome</code>, <code className="bg-blue-100 px-1 rounded">cpf_cnpj</code> e <code className="bg-blue-100 px-1 rounded">telefone</code>. Separador: vírgula ou ponto-e-vírgula.
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome do lote *</label>
                <input type="text" value={nomeLote} onChange={e => setNomeLote(e.target.value)}
                  placeholder="Ex: Lista SP - Março 2026"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Arquivo CSV ou Excel</label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${dragging ? 'border-[#1a3150] bg-blue-50' : 'border-gray-200 hover:border-[#1a3150]'}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileChange({ target: { files: [file], value: '' } });
                  }}
                >
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${dragging ? 'text-[#1a3150]' : 'text-gray-300'}`} />
                  <p className="text-sm text-gray-500">{dragging ? 'Solte o arquivo aqui' : 'Clique ou arraste o arquivo aqui'}</p>
                  <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                </div>
              </div>
              {preview && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-sm font-semibold text-emerald-800">{preview.length} leads encontrados</p>
                  <ul className="mt-1 space-y-0.5">
                    {preview.slice(0, 3).map((r, i) => (
                      <li key={i} className="text-xs text-emerald-700">• {r.nome}{r.cpf_cnpj ? ` · ${r.cpf_cnpj}` : ''}{r.telefone ? ` · ${r.telefone}` : ''}</li>
                    ))}
                    {preview.length > 3 && <li className="text-xs text-emerald-500">...e mais {preview.length - 3}</li>}
                  </ul>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowImport(false); setPreview(null); setNomeLote(''); }}>Cancelar</Button>
              <Button onClick={importarLote} disabled={!preview || importando || !nomeLote.trim()} className="bg-[#0f1e35] hover:bg-[#1a3150]">
                {importando ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Importando...</> : <><Upload className="w-4 h-4 mr-2" />Importar {preview ? `${preview.length} leads` : ''}</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}