import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, Trash2, Pencil, X, UserCheck, FileText, Phone, Mail, MapPin, DollarSign, Filter, Plus, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import EditarIndicacaoModal from './EditarIndicacaoModal';
import NovaIndicacaoModal from './NovaIndicacaoModal';
import DetalheJornadaIndicacao from './DetalheJornadaIndicacao';
import { periodoRange, dentroPeriodo } from '../portal/FiltroIndicadores';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  danger: '#f87171',
  warning: '#fbbf24',
  purple: '#a78bfa',
  green: '#34d399',
};

const STATUS_CFG = {
  novo: { label: 'Novo', color: AURORA.accent, bg: 'rgba(0,212,170,0.12)' },
  em_atendimento: { label: 'Em Atendimento', color: AURORA.warning, bg: 'rgba(251,191,36,0.12)' },
  convertido_cliente: { label: '→ Cliente', color: AURORA.green, bg: 'rgba(52,211,153,0.12)' },
  convertido_contrato: { label: '→ Contrato', color: AURORA.purple, bg: 'rgba(167,139,250,0.12)' },
  convertido_venda: { label: 'Venda Convertida', color: '#0d1117', bg: 'linear-gradient(135deg, #34d399, #00D4AA)', glow: 'rgba(52,211,153,0.35)' },
  descartado: { label: 'Descartado', color: '#9ca3af', bg: 'rgba(100,100,100,0.2)' },
};

const fmtMoeda = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
const fmtData = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function IndicacoesTab({ vendedores, parceiroIdFixo, modoIndicador, parceiro, hideNovaButton, periodo, parceiroIdFiltro }) {
  const queryClient = useQueryClient();
  const [detalhe, setDetalhe] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroParceiro, setFiltroParceiro] = useState(parceiroIdFixo || 'todos');
  const [busca, setBusca] = useState('');
  const [convertendo, setConvertendo] = useState(null);
  const [editando, setEditando] = useState(null);
  const [showNova, setShowNova] = useState(false);

  const { data: indicacoes = [], isLoading } = useQuery({
    queryKey: ['lead-indicacoes'],
    queryFn: () => base44.entities.LeadIndicacao.list('-created_date', 200),
  });
  const { data: parceiros = [] } = useQuery({
    queryKey: ['parceiros-indicacao'],
    queryFn: () => base44.entities.Parceiro.list('nome'),
  });
  // Vendas vinculadas a indicações — mapa por id e por CPF/CNPJ. O status
  // "Venda Convertida" no acompanhamento do lead reflete que a conversão
  // (lead → venda) aconteceu; o comprovante (pagamento) é um detalhe financeiro
  // contabilizado à parte no Dashboard/Consolidado.
  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas-status-indicacoes'],
    queryFn: () => base44.entities.Venda.list('-created_date', 500),
  });
  const paidDocs = new Set();
  const vendaPorId = {};
  const vendaPorDoc = {};
  vendas.forEach(v => {
    vendaPorId[v.id] = v;
    const doc = (v.cpf_cnpj || '').replace(/\D/g, '');
    if (doc && !vendaPorDoc[doc]) vendaPorDoc[doc] = v;
    if (Array.isArray(v.comprovantes) && v.comprovantes.length > 0 && v.cpf_cnpj) {
      paidDocs.add(v.cpf_cnpj.replace(/\D/g, ''));
    }
  });

  // Admin visualizou as indicações → limpa o flag "nova" (badge do cabeçalho).
  // Não faz isso no modoIndicador (o parceiro vendo suas próprias indicações não
  // deve limpar a notificação do admin).
  useEffect(() => {
    if (modoIndicador) return;
    const novas = indicacoes.filter(i => i.nova === true);
    if (novas.length === 0) return;
    let cancelado = false;
    (async () => {
      for (const n of novas) {
        if (cancelado) return;
        try { await base44.entities.LeadIndicacao.update(n.id, { nova: false }); } catch (e) {}
      }
      if (!cancelado) {
        queryClient.invalidateQueries({ queryKey: ['lead-indicacoes'] });
        queryClient.invalidateQueries({ queryKey: ['indicacoes-novas-badge'] });
      }
    })();
    return () => { cancelado = true; };
  }, [indicacoes, modoIndicador, queryClient]);

  const range = periodoRange(periodo);
  const useExternalParceiro = parceiroIdFiltro !== undefined;
  const filtradas = indicacoes.filter(i => {
    const matchStatus = filtroStatus === 'todos' || i.status === filtroStatus;
    const matchParceiro = useExternalParceiro
      ? (parceiroIdFiltro === 'todos' || i.parceiro_id === parceiroIdFiltro)
      : (parceiroIdFixo ? i.parceiro_id === parceiroIdFixo : (filtroParceiro === 'todos' || i.parceiro_id === filtroParceiro));
    // Período: considera a data da indicação OU a data da venda vinculada — assim
    // um lead indicado no mês passado cuja venda aconteceu neste mês aparece no
    // mês atual (a venda é o marco recente que o indicador quer acompanhar).
    const iDoc = ((i.tipo === 'PF' ? i.pf_cpf : i.pj_cnpj) || '').replace(/\D/g, '');
    const vendaI = i.venda_id ? vendaPorId[i.venda_id] : vendaPorDoc[iDoc];
    const vendaData = vendaI?.data;
    const matchPeriodo = dentroPeriodo(i.created_date, range) || (vendaData && dentroPeriodo(vendaData, range));
    const nome = i.tipo === 'PF' ? i.pf_nome : i.pj_razao_social;
    const doc = i.tipo === 'PF' ? i.pf_cpf : i.pj_cnpj;
    const matchBusca = !busca || (nome?.toLowerCase().includes(busca.toLowerCase())) || (doc?.includes(busca));
    return matchStatus && matchParceiro && matchPeriodo && matchBusca;
  });

  const getNome = (i) => i.tipo === 'PF' ? i.pf_nome : i.pj_razao_social;
  const getDoc = (i) => i.tipo === 'PF' ? i.pf_cpf : i.pj_cnpj;
  const getContato = (i) => i.tipo === 'PF' ? (i.pf_whatsapp || i.pf_telefone) : (i.pj_whatsapp || i.pj_telefone);

  const atualizarStatus = async (lead, status) => {
    try {
      await base44.entities.LeadIndicacao.update(lead.id, {
        status,
        historico: [...(lead.historico || []), { status, label: STATUS_CFG[status]?.label || status, data: new Date().toISOString() }],
      });
      queryClient.invalidateQueries({ queryKey: ['lead-indicacoes'] });
      toast.success('Status atualizado');
    } catch (e) { toast.error('Erro: ' + e.message); }
  };

  const excluir = async (lead, e) => {
    if (e) e.stopPropagation();
    if (!confirm(`Excluir a indicação de "${getNome(lead)}"?`)) return;
    try {
      await base44.entities.LeadIndicacao.delete(lead.id);
      queryClient.invalidateQueries({ queryKey: ['lead-indicacoes'] });
      if (detalhe?.id === lead.id) setDetalhe(null);
      toast.success('Indicação excluída');
    } catch (e2) { toast.error('Erro: ' + e2.message); }
  };

  // ─── Conversão em Cliente ───
  const converterCliente = async (lead) => {
    setConvertendo('cliente');
    try {
      const isPF = lead.tipo === 'PF';
      const cliente = await base44.entities.Cliente.create({
        nome: getNome(lead),
        cpf_cnpj: getDoc(lead),
        email: isPF ? lead.pf_email : lead.pj_email,
        telefone: getContato(lead),
        responsavel_legal: !isPF ? lead.pj_nome_responsavel : '',
        cpf_responsavel: !isPF ? lead.pj_cpf_responsavel : '',
        nascimento: isPF ? lead.pf_nascimento : null,
        nacionalidade: isPF ? lead.pf_nacionalidade : '',
        profissao: isPF ? lead.pf_profissao : '',
        cep: isPF ? lead.pf_cep : lead.pj_cep,
        endereco: isPF ? lead.pf_endereco : lead.pj_endereco,
        bairro: isPF ? lead.pf_bairro : lead.pj_bairro,
        cidade: isPF ? lead.pf_cidade : lead.pj_cidade,
        estado: isPF ? lead.pf_estado : lead.pj_estado,
        origem: 'lead',
        lead_id: lead.id,
        subcarteira: lead.parceiro_nome,
        observacao: `Indicação de ${lead.parceiro_nome}. Produto: ${lead.produto}. Valor est.: ${fmtMoeda(lead.valor_estimado)}. ${lead.observacoes || ''}`.trim(),
      });
      await base44.entities.LeadIndicacao.update(lead.id, {
        status: 'convertido_cliente',
        cliente_id: cliente.id,
        convertido: true,
        convertido_em: new Date().toISOString(),
        historico: [...(lead.historico || []), { status: 'convertido_cliente', label: 'Cliente criado', data: new Date().toISOString() }],
      });
      queryClient.invalidateQueries({ queryKey: ['lead-indicacoes'] });
      toast.success('Cliente criado a partir da indicação!');
      setDetalhe(null);
    } catch (e) { toast.error('Erro: ' + e.message); }
    setConvertendo(null);
  };

  // ─── Conversão em Contrato (leva parceiro ao espelhamento) ───
  const converterContrato = async (lead) => {
    setConvertendo('contrato');
    try {
      const isPF = lead.tipo === 'PF';
      const contrato = await base44.entities.Contrato.create({
        tipo: lead.produto,
        nome: getNome(lead),
        cpf_cnpj: getDoc(lead),
        email: isPF ? lead.pf_email : lead.pj_email,
        telefone: isPF ? (lead.pf_telefone || lead.pf_whatsapp) : (lead.pj_telefone || lead.pj_whatsapp),
        cep: isPF ? lead.pf_cep : lead.pj_cep,
        endereco: isPF ? lead.pf_endereco : lead.pj_endereco,
        bairro: isPF ? lead.pf_bairro : lead.pj_bairro,
        cidade: isPF ? lead.pf_cidade : lead.pj_cidade,
        estado: isPF ? lead.pf_estado : lead.pj_estado,
        valor_adesao: lead.valor_estimado || null,
        status: 'rascunho',
        nascimento: isPF ? lead.pf_nascimento : null,
        nacionalidade: isPF ? lead.pf_nacionalidade : null,
        profissao: isPF ? lead.pf_profissao : null,
        responsavel_legal: !isPF ? lead.pj_nome_responsavel : null,
        cpf_responsavel: !isPF ? lead.pj_cpf_responsavel : null,
        indicadores: [{
          id: lead.parceiro_id,
          nome: lead.parceiro_nome,
          percentual: lead.parceiro_percentual ?? 0,
          tipo: lead.parceiro_email ? 'parceiro' : 'indicador',
        }],
        observacoes: `Indicação de ${lead.parceiro_nome}. ${lead.observacoes || ''}`.trim(),
      });
      await base44.entities.LeadIndicacao.update(lead.id, {
        status: 'convertido_contrato',
        contrato_id: contrato.id,
        convertido: true,
        convertido_em: new Date().toISOString(),
        historico: [...(lead.historico || []), { status: 'convertido_contrato', label: 'Contrato gerado', data: new Date().toISOString() }],
      });
      queryClient.invalidateQueries({ queryKey: ['lead-indicacoes'] });
      toast.success('Contrato criado! Parceiro adicionado ao espelhamento.');
      setDetalhe(null);
    } catch (e) { toast.error('Erro: ' + e.message); }
    setConvertendo(null);
  };

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
          <Filter className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome ou CPF/CNPJ..." className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: AURORA.text }} />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
          <option value="todos">Todos status</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {!parceiroIdFixo && !useExternalParceiro && (
          <select value={filtroParceiro} onChange={e => setFiltroParceiro(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
            <option value="todos">Todos parceiros</option>
            {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        )}
        {modoIndicador && !hideNovaButton && (
          <button onClick={() => setShowNova(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition"
            style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
            <Plus className="w-3.5 h-3.5" /> Nova Indicação
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-10 rounded-2xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <Send className="w-10 h-10 mx-auto mb-3" style={{ color: AURORA.textMuted }} />
          <p className="font-semibold" style={{ color: AURORA.text }}>Nenhuma indicação recebida</p>
          <p className="text-sm mt-1" style={{ color: AURORA.textMuted }}>
            {modoIndicador ? 'Cadastre uma nova indicação para começar a acompanhar o andamento.' : 'As indicações dos parceiros aparecerão aqui automaticamente'}
          </p>
          {modoIndicador && !hideNovaButton && (
            <button onClick={() => setShowNova(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl text-xs font-bold transition"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
              <Plus className="w-3.5 h-3.5" /> Nova Indicação
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(lead => {
            const docNorm = (getDoc(lead) || '').replace(/\D/g, '');
            const vendaLead = lead.venda_id ? vendaPorId[lead.venda_id] : vendaPorDoc[docNorm];
            const temVenda = !!vendaLead;
            const vendaEfetivada = lead.status === 'convertido_venda' || temVenda || (docNorm && paidDocs.has(docNorm));
            const st = vendaEfetivada ? STATUS_CFG.convertido_venda : (STATUS_CFG[lead.status] || STATUS_CFG.novo);
            const dataVenda = vendaLead?.data;
            const dataExibicao = dataVenda || lead.link_preenchido_em || lead.created_date;
            const titleLabel = dataVenda ? `Venda em ${fmtData(dataVenda)}` : `Recebida em ${fmtData(lead.link_preenchido_em || lead.created_date)}`;
            return (
              <div key={lead.id} onClick={() => setDetalhe(lead)}
                className="rounded-2xl p-4 cursor-pointer transition relative overflow-hidden"
                style={{
                  background: AURORA.surface,
                  border: `1px solid ${AURORA.border}`,
                  boxShadow: vendaEfetivada ? `0 0 0 1px rgba(52,211,153,0.25), 0 6px 20px ${st.glow}` : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = vendaEfetivada ? 'rgba(52,211,153,0.5)' : 'rgba(0,212,170,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = AURORA.border}>
                {vendaEfetivada && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg, #34d399, #00D4AA)' }} />
                )}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{
                    background: vendaEfetivada ? 'linear-gradient(135deg, rgba(52,211,153,0.25), rgba(0,212,170,0.25))' : 'linear-gradient(135deg, #00D4AA22, #0066cc22)',
                    color: vendaEfetivada ? AURORA.green : AURORA.accent,
                    border: `1px solid ${vendaEfetivada ? 'rgba(52,211,153,0.4)' : AURORA.border}`,
                  }}>
                    {vendaEfetivada ? <Trophy className="w-4 h-4" /> : getNome(lead)?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate" style={{ color: AURORA.text }}>{getNome(lead)}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1" style={{
                        background: st.bg,
                        color: st.color,
                        ...(vendaEfetivada ? { boxShadow: `0 0 12px ${st.glow}` } : {}),
                      }}>
                        {vendaEfetivada && <Trophy className="w-3 h-3" />}{st.label}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: AURORA.textMuted }}>
                      {lead.tipo === 'PF' ? '👤 PF' : '🏢 PJ'} · {getDoc(lead) || '—'} · {getContato(lead) || '—'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent }}>{lead.produto}</span>
                      {lead.valor_estimado != null && <span className="text-[9px]" style={{ color: AURORA.textMuted }}>{fmtMoeda(lead.valor_estimado)}</span>}
                      <span className="text-[9px] flex items-center gap-0.5" style={{ color: AURORA.purple }}>🔗 {lead.parceiro_nome}</span>
                      <span className="text-[9px] flex items-center gap-0.5 ml-auto" style={{ color: AURORA.textMuted }} title={titleLabel}>
                        🗓 {fmtData(dataExibicao)}
                      </span>
                    </div>
                  </div>
                  {!modoIndicador && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); setEditando(lead); }}
                        className="p-1.5 rounded-lg transition" style={{ background: AURORA.surface2, color: AURORA.accent, border: `1px solid ${AURORA.border}` }} title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => excluir(lead, e)}
                        className="p-1.5 rounded-lg transition" style={{ background: 'rgba(239,68,68,0.12)', color: AURORA.danger, border: '1px solid rgba(239,68,68,0.3)' }} title="Excluir">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editando && <EditarIndicacaoModal lead={editando} onClose={() => setEditando(null)} />}

      {showNova && <NovaIndicacaoModal parceiro={parceiro} onClose={() => setShowNova(false)} />}

      {/* Modal de detalhe / conversão */}
      {detalhe && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setDetalhe(null)}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
              <div>
                <p className="font-bold text-sm" style={{ color: AURORA.text }}>{getNome(detalhe)}</p>
                <p className="text-[11px]" style={{ color: AURORA.textMuted }}>Indicação de <strong style={{ color: AURORA.purple }}>{detalhe.parceiro_nome}</strong></p>
              </div>
              <button onClick={() => setDetalhe(null)} className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Info label="Tipo" value={detalhe.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'} />
                <Info label="Produto" value={detalhe.produto} />
                <Info label="Valor est." value={fmtMoeda(detalhe.valor_estimado)} />
                <Info label="Status" value={(() => {
                  const docD = (getDoc(detalhe) || '').replace(/\D/g, '');
                  const vendaD = detalhe.venda_id ? vendaPorId[detalhe.venda_id] : vendaPorDoc[docD];
                  const efetivada = detalhe.status === 'convertido_venda' || !!vendaD || paidDocs.has(docD);
                  return efetivada ? STATUS_CFG.convertido_venda.label : (STATUS_CFG[detalhe.status]?.label || '—');
                })()} />
              </div>

              <DetalheJornadaIndicacao lead={detalhe} />
            </div>

            {/* Ações */}
            {modoIndicador ? (
              <div className="p-4 flex justify-end" style={{ background: AURORA.surface2, borderTop: `1px solid ${AURORA.border}` }}>
                <button onClick={() => setDetalhe(null)} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: AURORA.surface, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>Fechar</button>
              </div>
            ) : (
              <div className="p-4 flex flex-wrap gap-2" style={{ background: AURORA.surface2, borderTop: `1px solid ${AURORA.border}` }}>
                {!detalhe.convertido && detalhe.status === 'novo' && (
                  <button onClick={() => atualizarStatus(detalhe, 'em_atendimento')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(251,191,36,0.12)', color: AURORA.warning, border: '1px solid rgba(251,191,36,0.3)' }}>
                    Iniciar Atendimento
                  </button>
                )}
                {!detalhe.cliente_id && (
                  <button onClick={() => converterCliente(detalhe)} disabled={convertendo === 'cliente'}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-40"
                    style={{ background: 'rgba(52,211,153,0.12)', color: AURORA.green, border: '1px solid rgba(52,211,153,0.3)' }}>
                    {convertendo === 'cliente' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />} Converter em Cliente
                  </button>
                )}
                {!detalhe.contrato_id && (
                  <button onClick={() => converterContrato(detalhe)} disabled={convertendo === 'contrato'}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-40"
                    style={{ background: 'rgba(167,139,250,0.12)', color: AURORA.purple, border: '1px solid rgba(167,139,250,0.3)' }}>
                    {convertendo === 'contrato' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} Converter em Contrato
                  </button>
                )}
                <div className="flex-1" />
                {detalhe.status !== 'descartado' && !detalhe.convertido && (
                  <button onClick={() => atualizarStatus(detalhe, 'descartado')} className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(100,100,100,0.15)', color: '#9ca3af' }}>Descartar</button>
                )}
                <button onClick={() => excluir(detalhe)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: AURORA.danger, border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, icon }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1" style={{ color: AURORA.textMuted }}>{icon}{label}</p>
      <p className="text-sm" style={{ color: AURORA.text }}>{value || '—'}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: AURORA.accent }}>{title}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{children}</div>
    </div>
  );
}