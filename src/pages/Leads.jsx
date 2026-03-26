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
  const [excluindo, setExcluindo] = useState(null);
  const [nomeLote, setNomeLote] = useState('');
  const [preview, setPreview] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [expandedLote, setExpandedLote] = useState(null);
  // Seleção de vendedores por lote (distribuição e redistribuição)
  const [selectedVendedores, setSelectedVendedores] = useState([]);
  const [showVendedoresModal, setShowVendedoresModal] = useState(null); // { lote, modo: 'distribuir'|'redistribuir' }
  const fileRef = useRef();
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
    queryFn: () => base44.entities.Lead.list(),
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
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) {
      toast.error('Nenhum dado válido. Use CSV com colunas: nome, cpf_cnpj, telefone');
      return;
    }
    setPreview(rows);
    setNomeLote(file.name.replace(/\.[^.]+$/, ''));
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
    setSelectedVendedores(vendedores.map(v => v.id)); // todos selecionados por padrão
    setShowVendedoresModal({ lote, modo });
  };

  const executarDistribuicao = async () => {
    const { lote, modo } = showVendedoresModal;
    const vendedoresSelecionados = vendedores.filter(v => selectedVendedores.includes(v.id));
    if (vendedoresSelecionados.length === 0) { toast.error('Selecione pelo menos um gerente/vendedor'); return; }

    setShowVendedoresModal(null);

    if (modo === 'distribuir') {
      setDistribuindo(lote.id);
    } else {
      setRedistribuindo(lote.id);
    }

    try {
      let leadsParaDistribuir;
      if (modo === 'distribuir') {
        leadsParaDistribuir = leads.filter(l => l.lote_id === lote.id && l.status === 'pendente');
      } else {
        // redistribuir: apenas os não convertidos que já foram distribuídos
        leadsParaDistribuir = leads.filter(l => l.lote_id === lote.id && l.status === 'distribuido' && !l.convertido);
      }

      if (leadsParaDistribuir.length === 0) {
        toast.info('Nenhum lead disponível para distribuição');
        setDistribuindo(null); setRedistribuindo(null);
        return;
      }

      const embaralhados = [...leadsParaDistribuir].sort(() => Math.random() - 0.5);

      for (let i = 0; i < embaralhados.length; i++) {
        const vendedor = vendedoresSelecionados[i % vendedoresSelecionados.length];
        const lead = embaralhados[i];

        // Se redistribuindo, remover da carteira anterior (excluir o cliente gerado, não convertido)
        if (modo === 'redistribuir' && lead.cliente_id && !lead.convertido) {
          try { await base44.entities.Cliente.delete(lead.cliente_id); } catch (_) {}
        }

        // Criar cliente na carteira com origem 'lead'
        const cliente = await base44.entities.Cliente.create({
          nome: lead.nome,
          cpf_cnpj: lead.cpf_cnpj,
          telefone: lead.telefone,
          vendedor_id: vendedor.id,
          vendedor_nome: vendedor.nome,
          origem: 'lead',
          lead_id: lead.id,
          observacao: `Lead importado — lote: ${lote.nome}`
        });

        await base44.entities.Lead.update(lead.id, {
          status: 'distribuido',
          vendedor_id: vendedor.id,
          vendedor_nome: vendedor.nome,
          cliente_id: cliente.id
        });
      }

      if (modo === 'distribuir') {
        await base44.entities.LoteLead.update(lote.id, {
          status: 'distribuido',
          distribuido_em: new Date().toISOString(),
          distribuido_por: user?.email
        });
      }

      // Gerar agenda automática: 5 leads por dia por gerente
      const LEADS_POR_DIA = 5;
      const hoje = new Date();
      // Agrupar leads por vendedor
      const leadsPorVendedor = {};
      for (let i = 0; i < embaralhados.length; i++) {
        const vendedor = vendedoresSelecionados[i % vendedoresSelecionados.length];
        if (!leadsPorVendedor[vendedor.id]) leadsPorVendedor[vendedor.id] = { vendedor, leads: [] };
        leadsPorVendedor[vendedor.id].leads.push(embaralhados[i]);
      }

      // Para redistribuição, limpar agenda antiga dos leads redistribuídos
      if (modo === 'redistribuir') {
        const idsLeads = embaralhados.map(l => l.id);
        const agendaAntiga = await base44.entities.AgendaContato.list();
        const paraExcluir = agendaAntiga.filter(a => idsLeads.includes(a.lead_id) && a.status === 'pendente');
        for (const a of paraExcluir) { try { await base44.entities.AgendaContato.delete(a.id); } catch (_) {} }
      }

      // Criar agenda por vendedor
      const agendaRecords = [];
      for (const { vendedor, leads: leadsVend } of Object.values(leadsPorVendedor)) {
        for (let i = 0; i < leadsVend.length; i++) {
          const diaOffset = Math.floor(i / LEADS_POR_DIA);
          const posicaoDia = (i % LEADS_POR_DIA) + 1;
          const dataAgendada = fmtDate(addDays(hoje, diaOffset), 'yyyy-MM-dd');
          const lead = leadsVend[i];
          agendaRecords.push({
            lead_id: lead.id,
            lead_nome: lead.nome,
            lead_cpf_cnpj: lead.cpf_cnpj || '',
            lead_telefone: lead.telefone || '',
            cliente_id: lead.cliente_id || '',
            vendedor_id: vendedor.id,
            vendedor_nome: vendedor.nome,
            data_agendada: dataAgendada,
            posicao_dia: posicaoDia,
            lote_id: lote.id,
            status: 'pendente'
          });
        }
      }

      // Salvar agenda em chunks
      const chunkSize = 50;
      for (let i = 0; i < agendaRecords.length; i += chunkSize) {
        await base44.entities.AgendaContato.bulkCreate(agendaRecords.slice(i, i + chunkSize));
      }

      toast.success(`${embaralhados.length} leads distribuídos entre ${vendedoresSelecionados.length} gerente(s)! Agenda gerada.`);
      queryClient.invalidateQueries(['lotes-leads']);
      queryClient.invalidateQueries(['leads-todos']);
    } catch (e) {
      toast.error('Erro na distribuição: ' + e.message);
    }
    setDistribuindo(null); setRedistribuindo(null);
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
          <Button onClick={() => setShowImport(true)} className="bg-[#0f1e35] hover:bg-[#1a3150] text-white">
            <Upload className="w-4 h-4 mr-2" /> Importar Lista
          </Button>
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
                      {stats.convertidos > 0 && <span className="text-emerald-600 font-medium">{stats.convertidos} convertidos</span>}
                      {stats.naoConvertidos > 0 && <span className="text-amber-600 font-medium">{stats.naoConvertidos} não convertidos</span>}
                      <span>Importado em {lote.created_date ? format(new Date(lote.created_date), 'dd/MM/yyyy') : '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lote.status === 'pendente' && (
                      <Button size="sm" onClick={() => abrirDistribuicao(lote, 'distribuir')} disabled={distribuindo === lote.id} className="bg-[#0f1e35] hover:bg-[#1a3150] text-white">
                        {distribuindo === lote.id ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" /> : <Shuffle className="w-3.5 h-3.5 mr-1.5" />}
                        Distribuir
                      </Button>
                    )}
                    {lote.status === 'distribuido' && stats.naoConvertidos > 0 && (
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
                {isExpanded && naoConvertidos.length > 0 && (
                  <div className="px-5 pb-4 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Leads não convertidos ({naoConvertidos.length})</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                      {naoConvertidos.map(lead => (
                        <div key={lead.id} className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 px-3 py-2 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          <span className="font-medium text-gray-800 truncate flex-1">{lead.nome}</span>
                          <span className="text-gray-400 truncate">{lead.vendedor_nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">Selecione quem receberá os leads:</p>
                <button
                  onClick={() => setSelectedVendedores(selectedVendedores.length === vendedores.length ? [] : vendedores.map(v => v.id))}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {selectedVendedores.length === vendedores.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {vendedores.map(v => (
                  <label key={v.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition text-sm ${selectedVendedores.includes(v.id) ? 'bg-[#0f1e35]/5 border-[#1a3150]/30 text-gray-900' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}>
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
                  <strong>Formato:</strong> CSV com colunas <code className="bg-blue-100 px-1 rounded">nome</code>, <code className="bg-blue-100 px-1 rounded">cpf_cnpj</code> e <code className="bg-blue-100 px-1 rounded">telefone</code>. Separador: vírgula ou ponto-e-vírgula.
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome do lote *</label>
                <input type="text" value={nomeLote} onChange={e => setNomeLote(e.target.value)}
                  placeholder="Ex: Lista SP - Março 2026"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Arquivo CSV</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#1a3150] transition" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Clique para selecionar o arquivo</p>
                  <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
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