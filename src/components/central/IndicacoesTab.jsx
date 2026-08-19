import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, Trash2, X, UserCheck, FileText, Phone, Mail, MapPin, DollarSign, Filter } from 'lucide-react';
import { toast } from 'sonner';

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
  convertido_venda: { label: '→ Venda', color: AURORA.green, bg: 'rgba(52,211,153,0.18)' },
  descartado: { label: 'Descartado', color: '#9ca3af', bg: 'rgba(100,100,100,0.2)' },
};

const fmtMoeda = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

export default function IndicacoesTab({ vendedores }) {
  const queryClient = useQueryClient();
  const [detalhe, setDetalhe] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroParceiro, setFiltroParceiro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [convertendo, setConvertendo] = useState(null);

  const { data: indicacoes = [], isLoading } = useQuery({
    queryKey: ['lead-indicacoes'],
    queryFn: () => base44.entities.LeadIndicacao.list('-created_date', 200),
  });
  const { data: parceiros = [] } = useQuery({
    queryKey: ['parceiros-indicacao'],
    queryFn: () => base44.entities.Parceiro.list('nome'),
  });

  const filtradas = indicacoes.filter(i => {
    const matchStatus = filtroStatus === 'todos' || i.status === filtroStatus;
    const matchParceiro = filtroParceiro === 'todos' || i.parceiro_id === filtroParceiro;
    const nome = i.tipo === 'PF' ? i.pf_nome : i.pj_razao_social;
    const doc = i.tipo === 'PF' ? i.pf_cpf : i.pj_cnpj;
    const matchBusca = !busca || (nome?.toLowerCase().includes(busca.toLowerCase())) || (doc?.includes(busca));
    return matchStatus && matchParceiro && matchBusca;
  });

  const getNome = (i) => i.tipo === 'PF' ? i.pf_nome : i.pj_razao_social;
  const getDoc = (i) => i.tipo === 'PF' ? i.pf_cpf : i.pj_cnpj;
  const getContato = (i) => i.tipo === 'PF' ? (i.pf_whatsapp || i.pf_telefone) : (i.pj_whatsapp || i.pj_telefone);

  const atualizarStatus = async (lead, status) => {
    try {
      await base44.entities.LeadIndicacao.update(lead.id, { status });
      queryClient.invalidateQueries({ queryKey: ['lead-indicacoes'] });
      toast.success('Status atualizado');
    } catch (e) { toast.error('Erro: ' + e.message); }
  };

  const excluir = async (lead) => {
    if (!confirm(`Excluir a indicação de "${getNome(lead)}"?`)) return;
    try {
      await base44.entities.LeadIndicacao.delete(lead.id);
      queryClient.invalidateQueries({ queryKey: ['lead-indicacoes'] });
      setDetalhe(null);
      toast.success('Indicação excluída');
    } catch (e) { toast.error('Erro: ' + e.message); }
  };

  // ─── Conversão em Cliente ───
  const converterCliente = async (lead) => {
    setConvertendo('cliente');
    try {
      const cliente = await base44.entities.Cliente.create({
        nome: getNome(lead),
        cpf_cnpj: getDoc(lead),
        email: lead.tipo === 'PF' ? lead.pf_email : lead.pj_email,
        telefone: getContato(lead),
        cidade: lead.tipo === 'PF' ? lead.pf_cidade : lead.pj_cidade,
        estado: lead.tipo === 'PF' ? lead.pf_estado : lead.pj_estado,
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
        <select value={filtroParceiro} onChange={e => setFiltroParceiro(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
          <option value="todos">Todos parceiros</option>
          {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-10 rounded-2xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <Send className="w-10 h-10 mx-auto mb-3" style={{ color: AURORA.textMuted }} />
          <p className="font-semibold" style={{ color: AURORA.text }}>Nenhuma indicação recebida</p>
          <p className="text-sm mt-1" style={{ color: AURORA.textMuted }}>As indicações dos parceiros aparecerão aqui automaticamente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(lead => {
            const st = STATUS_CFG[lead.status] || STATUS_CFG.novo;
            return (
              <div key={lead.id} onClick={() => setDetalhe(lead)}
                className="rounded-2xl p-4 cursor-pointer transition"
                style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,212,170,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = AURORA.border}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00D4AA22, #0066cc22)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                    {getNome(lead)?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate" style={{ color: AURORA.text }}>{getNome(lead)}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: AURORA.textMuted }}>
                      {lead.tipo === 'PF' ? '👤 PF' : '🏢 PJ'} · {getDoc(lead) || '—'} · {getContato(lead) || '—'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent }}>{lead.produto}</span>
                      {lead.valor_estimado != null && <span className="text-[9px]" style={{ color: AURORA.textMuted }}>{fmtMoeda(lead.valor_estimado)}</span>}
                      <span className="text-[9px] flex items-center gap-0.5" style={{ color: AURORA.purple }}>🔗 {lead.parceiro_nome}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                <Info label="Status" value={STATUS_CFG[detalhe.status]?.label} />
              </div>

              {/* Contato */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Info icon={<Mail className="w-3 h-3" />} label="E-mail" value={detalhe.tipo === 'PF' ? detalhe.pf_email : detalhe.pj_email} />
                <Info icon={<Phone className="w-3 h-3" />} label="Telefone" value={detalhe.tipo === 'PF' ? detalhe.pf_telefone : detalhe.pj_telefone} />
                <Info icon={<Phone className="w-3 h-3" />} label="WhatsApp" value={detalhe.tipo === 'PF' ? detalhe.pf_whatsapp : detalhe.pj_whatsapp} />
              </div>

              {/* Dados PF ou PJ */}
              {detalhe.tipo === 'PF' ? (
                <Section title="Dados Pessoa Física">
                  <Info label="CPF" value={detalhe.pf_cpf} />
                  <Info label="RG" value={detalhe.pf_rg} />
                  <Info label="Nascimento" value={detalhe.pf_nascimento} />
                  <Info label="Nacionalidade" value={detalhe.pf_nacionalidade} />
                  <Info label="Profissão" value={detalhe.pf_profissao} />
                  <Info label="Renda" value={fmtMoeda(detalhe.pf_renda)} />
                </Section>
              ) : (
                <Section title="Dados Pessoa Jurídica">
                  <Info label="CNPJ" value={detalhe.pj_cnpj} />
                  <Info label="Responsável" value={detalhe.pj_nome_responsavel} />
                  <Info label="CPF Responsável" value={detalhe.pj_cpf_responsavel} />
                  <Info label="Ramo" value={detalhe.pj_ramo_atividade} />
                  <Info label="Faturamento" value={fmtMoeda(detalhe.pj_faturamento)} />
                </Section>
              )}

              {/* Endereço */}
              <Section title="Endereço">
                <Info label="CEP" value={detalhe.tipo === 'PF' ? detalhe.pf_cep : detalhe.pj_cep} />
                <Info label="Logradouro" value={detalhe.tipo === 'PF' ? detalhe.pf_endereco : detalhe.pj_endereco} />
                <Info label="Número" value={detalhe.tipo === 'PF' ? detalhe.pf_numero : detalhe.pj_numero} />
                <Info label="Complemento" value={detalhe.tipo === 'PF' ? detalhe.pf_complemento : detalhe.pj_complemento} />
                <Info label="Bairro" value={detalhe.tipo === 'PF' ? detalhe.pf_bairro : detalhe.pj_bairro} />
                <Info label="Cidade/UF" value={`${detalhe.tipo === 'PF' ? detalhe.pf_cidade : detalhe.pj_cidade || ''} / ${detalhe.tipo === 'PF' ? detalhe.pf_estado : detalhe.pj_estado || ''}`} />
              </Section>

              {detalhe.observacoes && (
                <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                  <p className="text-[11px] font-bold mb-1" style={{ color: AURORA.textMuted }}>OBSERVAÇÕES</p>
                  <p className="text-xs" style={{ color: AURORA.text }}>{detalhe.observacoes}</p>
                </div>
              )}

              {detalhe.cliente_id && <p className="text-[11px]" style={{ color: AURORA.green }}>✓ Cliente criado (ID: {detalhe.cliente_id.slice(0, 8)}…)</p>}
              {detalhe.contrato_id && <p className="text-[11px]" style={{ color: AURORA.purple }}>✓ Contrato criado (ID: {detalhe.contrato_id.slice(0, 8)}…)</p>}
            </div>

            {/* Ações */}
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