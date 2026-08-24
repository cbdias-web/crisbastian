import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Phone, Package, MapPin, Loader2, PhoneCall, PhoneMissed, FileText, Phone as PhoneIcon, MessageSquare, ChevronRight, ArrowLeft, User, History, DollarSign } from 'lucide-react';
import { qrUrl, waLink, telParaTel } from './QrCodeContato';
import PitchAbordagemPanel from './PitchAbordagemPanel';
import NegociacaoLeadBlock from './NegociacaoLeadBlock';
import RegistroLigacaoForm from './RegistroLigacaoForm';
import CadastroCarteiraPanel from './CadastroCarteiraPanel';
import HistoricoInteracoes from './HistoricoInteracoes';
import AgendaMeetModal from '@/components/agenda/AgendaMeetModal';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(255,255,255,0.08)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  danger: '#f87171',
  green: '#34d399',
};

export default function CapaContatoPopup({ fila, user, vendedor, onAtualizado, onClose, onProximo }) {
  // view: 'capa' | 'registro' | 'cadastro' — a área principal troca entre elas (sem coluna extra)
  const [view, setView] = useState('capa');
  const [registrando, setRegistrando] = useState(false);
  const [conversa, setConversa] = useState(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [vendedores, setVendedores] = useState([]);
  const [agendaAberto, setAgendaAberto] = useState(false);
  const [classificando, setClassificando] = useState(null);
  const [leadIndicacao, setLeadIndicacao] = useState(null);
  const [produtoNeg, setProdutoNeg] = useState(fila.produto || '');
  const [valorNeg, setValorNeg] = useState(fila.valor_estimado != null ? fila.valor_estimado : '');
  const [salvandoNeg, setSalvandoNeg] = useState(false);

  useEffect(() => {
    base44.entities.Vendedor.filter({ ativo: true }, 'nome').then(setVendedores).catch(() => {});
  }, []);

  const isIndicacao = fila.tipo_origem === 'indicacao';

  useEffect(() => {
    if (isIndicacao && fila.lead_indicacao_id) {
      base44.entities.LeadIndicacao.get(fila.lead_indicacao_id).then(setLeadIndicacao).catch(() => setLeadIndicacao(null));
    }
  }, [fila.lead_indicacao_id, isIndicacao]);

  // Pré-preenche produto/valor da indicação quando ainda não informados na fila
  useEffect(() => {
    if (leadIndicacao) {
      setProdutoNeg((p) => p || leadIndicacao.produto || '');
      setValorNeg((v) => (v !== '' ? v : (leadIndicacao.valor_estimado != null ? leadIndicacao.valor_estimado : '')));
    }
  }, [leadIndicacao]);

  const registrarAtendeu = async () => {
    setRegistrando(true);
    try {
      await base44.functions.invoke('registrarTentativaContato', {
        fila_id: fila.id,
        acao: 'atendeu',
        interacao: { tipo: 'Ligação', descricao: 'Atendeu — contato telefônico realizado', resultado: 'Positivo' },
      });
      toast.success('Atendimento registrado. Agende a reunião e inclua outros gerentes.');
      onAtualizado?.();
      setAgendaAberto(true);
    } catch (e) {
      toast.error('Erro: ' + (e?.response?.data?.error || e.message));
    }
    setRegistrando(false);
  };

  const registrarNaoAtendeu = async () => {
    if (!confirm('Confirmar: cliente NÃO atendeu. O lead vai para o fim da fila e é reagendado para o próximo dia útil.')) return;
    setRegistrando(true);
    try {
      await base44.functions.invoke('registrarTentativaContato', { fila_id: fila.id, acao: 'nao_atendeu' });
      toast.success('Não atendido — reagendado. Avançando para o próximo lead da fila.');
      onAtualizado?.();
      if (onProximo) onProximo(fila);
      else onClose?.();
    } catch (e) {
      toast.error('Erro: ' + (e?.response?.data?.error || e.message));
    }
    setRegistrando(false);
  };

  const CLASSIFICACAO = [
    { key: 'em_contato', label: 'Em Contato', status: 'atendeu', color: '#fbbf24' },
    { key: 'qualificado', label: 'Qualificado', status: 'qualificado', color: '#60a5fa' },
    { key: 'desqualificado', label: 'Desqualificado', status: 'descartado', color: '#f87171' },
    { key: 'convertido', label: 'Convertido', status: 'convertido', color: '#34d399' },
    { key: 'voltar', label: 'Voltar à Fila', status: 'pendente', color: AURORA.accent },
  ];

  const salvarNegociacao = async () => {
    setSalvandoNeg(true);
    try {
      await base44.entities.FilaContato.update(fila.id, {
        produto: produtoNeg,
        valor_estimado: valorNeg !== '' ? Number(valorNeg) : null,
      });
      toast.success('Negociação salva.');
      onAtualizado?.();
    } catch (e) {
      toast.error('Erro: ' + (e?.message || e));
    }
    setSalvandoNeg(false);
  };

  const classificar = async (c) => {
    if (c.key === 'voltar' && fila.status === 'pendente') return;
    if (c.key !== 'voltar' && fila.status === c.status) return;
    setClassificando(c.key);
    try {
      if (c.status === 'qualificado' || c.status === 'convertido') {
        // Qualificado → Pipeline | Convertido → Contrato + Pipeline
        const res = await base44.functions.invoke('classificarLeadFila', {
          fila_id: fila.id,
          status: c.status,
          produto: produtoNeg,
          valor: valorNeg !== '' ? Number(valorNeg) : null,
        });
        if (res?.data?.error) throw new Error(res.data.error);
        toast.success(c.status === 'convertido'
          ? 'Lead convertido — contrato e pipeline criados.'
          : 'Lead qualificado e enviado para o Pipeline.');
      } else {
        await base44.entities.FilaContato.update(fila.id, { status: c.status });
        toast.success(`Lead classificado como "${c.label}".`);
      }
      onAtualizado?.();
      onClose?.();
    } catch (e) {
      toast.error('Erro: ' + (e?.message || e));
    }
    setClassificando(null);
  };

  const verCadastro = async () => {
    setView('cadastro');
    if (isIndicacao && !conversa) {
      setLoadingConv(true);
      try {
        const c = await base44.entities.ConversaWhatsapp.get(fila.ref_id).catch(() => null);
        setConversa(c || { id: fila.ref_id, lead_nome: fila.nome, telefone: fila.telefone, origem: fila.origem_label, produto_interesse: fila.produto });
      } finally { setLoadingConv(false); }
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        className="flex flex-col rounded-3xl overflow-hidden"
        style={{
          width: (view === 'cadastro' || view === 'registro') ? 1450 : 1180,
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'calc(100vh - 140px)',
          background: AURORA.surface,
          border: `1px solid ${AURORA.border}`,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          transition: 'width 0.28s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-start justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <h3 className="font-bold text-lg tracking-tight" style={{ color: AURORA.text }}>{fila.nome}</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: isIndicacao ? 'rgba(0,212,170,0.12)' : 'rgba(99,102,241,0.12)', color: isIndicacao ? AURORA.accent : '#818cf8' }}>
                {isIndicacao ? 'Indicação' : 'Carteira'}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs" style={{ color: AURORA.textMuted }}>
              {fila.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{fila.telefone}</span>}
              {(fila.produto || leadIndicacao?.produto) && <span className="flex items-center gap-1"><Package className="w-3 h-3" />{fila.produto || leadIndicacao.produto}</span>}
              {(fila.valor_estimado != null || leadIndicacao?.valor_estimado != null) && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />R$ {(fila.valor_estimado ?? leadIndicacao?.valor_estimado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
              {fila.origem_label && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{fila.origem_label}</span>}
              {fila.vendedor_nome && <span className="flex items-center gap-1"><User className="w-3 h-3" />Gerente: {fila.vendedor_nome}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg flex-shrink-0 transition hover:bg-white/5" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
        </div>

        {/* Barra de classificação rápida — move o lead para a coluna respectiva */}
        <div className="px-6 py-2.5 flex items-center gap-1.5 flex-wrap flex-shrink-0" style={{ borderBottom: `1px solid ${AURORA.border}`, background: AURORA.surface2 }}>
          <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: AURORA.textMuted }}>Classificar:</span>
          {CLASSIFICACAO.map(c => {
            const ativo = c.key === 'voltar' ? fila.status === 'pendente' : fila.status === c.status;
            return (
              <button key={c.key} onClick={() => classificar(c)} disabled={classificando !== null}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition disabled:opacity-40"
                style={{
                  background: ativo ? c.color : `${c.color}1a`,
                  color: ativo ? '#0d1117' : c.color,
                  border: `1px solid ${ativo ? c.color : `${c.color}55`}`,
                }}>
                {classificando === c.key && <Loader2 className="w-3 h-3 animate-spin" />}
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Body — 2 colunas fixas: principal (capa/registro/cadastro) + pitch */}
        <div className="flex-1 flex overflow-hidden">
          {/* Coluna principal */}
          <div className="flex-1 min-w-0 overflow-y-auto" style={{ borderRight: `1px solid ${AURORA.border}` }}>
            {view === 'capa' && (
              <div className="p-6 flex flex-col items-center gap-5">
                {/* Negociação em andamento — produto + valor (pré-preenchido p/ indicações) */}
                <NegociacaoLeadBlock
                  produto={produtoNeg}
                  valor={valorNeg}
                  onProdutoChange={setProdutoNeg}
                  onValorChange={setValorNeg}
                  onSave={salvarNegociacao}
                  saving={salvandoNeg}
                />
                {/* QR codes brancos, elegantes e espaçados */}
                <div className="w-full rounded-2xl py-6 px-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-center mb-5" style={{ color: AURORA.accent, opacity: 0.7 }}>Escaneie para contato</p>
                  <div className="flex justify-center" style={{ gap: 56 }}>
                    <div className="text-center">
                      <div className="rounded-xl p-2.5 inline-block" style={{ background: '#0d1117', border: `1px solid ${AURORA.border}` }}>
                        <img src={qrUrl(waLink(fila.telefone) || ' ', 118)} alt="QR WhatsApp" className="rounded-md" style={{ width: 118, height: 118 }} />
                      </div>
                      <p className="text-[11px] mt-2.5 flex items-center justify-center gap-1 font-medium" style={{ color: AURORA.green }}><MessageSquare className="w-3 h-3" /> WhatsApp</p>
                    </div>
                    <div className="text-center">
                      <div className="rounded-xl p-2.5 inline-block" style={{ background: '#0d1117', border: `1px solid ${AURORA.border}` }}>
                        <img src={qrUrl(telParaTel(fila.telefone) || ' ', 118)} alt="QR Ligação" className="rounded-md" style={{ width: 118, height: 118 }} />
                      </div>
                      <p className="text-[11px] mt-2.5 flex items-center justify-center gap-1 font-medium" style={{ color: '#60a5fa' }}><PhoneIcon className="w-3 h-3" /> Ligação</p>
                    </div>
                  </div>
                </div>

                {/* Botões de desfecho (chapados) + registro — simétricos e centralizados */}
                <div className="w-full" style={{ maxWidth: 420 }}>
                  <div className="flex gap-3">
                    <button onClick={registrarAtendeu} disabled={registrando}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition hover:brightness-110 disabled:opacity-50"
                      style={{ background: '#16a34a', color: '#fff' }}>
                      {registrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />} Atendeu
                    </button>
                    <button onClick={registrarNaoAtendeu} disabled={registrando}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition hover:brightness-110 disabled:opacity-50"
                      style={{ background: '#dc2626', color: '#fff' }}>
                      {registrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneMissed className="w-4 h-4" />} Não Atendeu
                    </button>
                  </div>
                  <button onClick={() => setView('registro')}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition hover:bg-white/5"
                    style={{ color: AURORA.accent, border: '1px solid rgba(0,212,170,0.45)', background: 'rgba(0,212,170,0.04)' }}>
                    <History className="w-4 h-4" /> Registros do Contato
                  </button>
                </div>

                {/* Link sutil para cadastro */}
                <button onClick={verCadastro}
                  className="flex items-center gap-1.5 text-xs font-medium transition hover:gap-2.5" style={{ color: AURORA.accent }}>
                  <FileText className="w-3.5 h-3.5" /> Ver cadastro do cliente
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {view === 'cadastro' && (
              <div>
                {/* Barra voltar */}
                <div className="flex items-center gap-2 px-5 py-3 sticky top-0 z-10" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
                  <button onClick={() => setView('capa')} className="flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-80" style={{ color: AURORA.textMuted }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                  </button>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Cadastro</p>
                </div>
                <div className="p-5">
                  <InfoOrigem fila={fila} user={user} vendedor={vendedor} leadIndicacao={leadIndicacao} />
                  {loadingConv ? (
                    <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>
                  ) : isIndicacao ? (
                    <CadastroIndicacao conversa={conversa} fila={fila} leadIndicacao={leadIndicacao} />
                  ) : (
                    <CadastroCarteiraPanel clienteId={fila.cliente_id || fila.ref_id} fila={fila} />
                  )}
                </div>
              </div>
            )}

            {view === 'registro' && (
              <div>
                <div className="flex items-center gap-2 px-5 py-3 sticky top-0 z-10" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
                  <button onClick={() => setView('capa')} className="flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-80" style={{ color: AURORA.textMuted }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                  </button>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Registros do Contato</p>
                </div>
                <div className="p-5 space-y-4">
                  <HistoricoInteracoes fila={fila} />
                  <RegistroLigacaoForm
                    fila={fila}
                    onConcluido={() => { onAtualizado?.(); onClose?.(); }}
                    onCancelar={() => setView('capa')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Coluna Pitch (fixa) */}
          <div className="flex-shrink-0 overflow-y-auto" style={{ width: (view === 'cadastro' || view === 'registro') ? 560 : 420, transition: 'width 0.28s ease' }}>
            <PitchAbordagemPanel produto={fila.produto} nomeLead={fila.nome} />
          </div>
        </div>
      </div>
    </div>
    {agendaAberto && (
      <AgendaMeetModal
        user={user}
        vendedorId={vendedor?.id || ''}
        vendedorNome={vendedor?.nome || ''}
        clienteNome={fila.nome}
        clienteId={fila.cliente_id || ''}
        clienteTelefone={fila.telefone || ''}
        todosVendedores={vendedores}
        onClose={() => { setAgendaAberto(false); onClose?.(); }}
        onSaved={() => { setAgendaAberto(false); onAtualizado?.(); onClose?.(); }}
      />
    )}
    </>
  );
}

// Bloco de Origem & Atendimento — mostra quem indicou (indicação) ou o gerente (carteira)
// e quem está atendendo o lead no momento.
function InfoOrigem({ fila, user, vendedor, leadIndicacao }) {
  const isInd = fila.tipo_origem === 'indicacao';
  const parceiro = fila.parceiro_nome || leadIndicacao?.parceiro_nome || (isInd && fila.origem_label
    ? fila.origem_label.replace(/^Indic[aã]ç[aã]o\s*[-–·]\s*/i, '').trim()
    : null);
  const gerente = fila.vendedor_nome || '—';
  const atendendo = vendedor?.nome || user?.full_name || user?.nome_tratamento || '—';
  const percentual = fila.parceiro_percentual ?? leadIndicacao?.parceiro_percentual ?? null;
  const valor = fila.valor_estimado ?? leadIndicacao?.valor_estimado ?? null;
  return (
    <div className="rounded-xl p-3 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
      <div>
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: AURORA.textMuted }}>Origem</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: isInd ? 'rgba(0,212,170,0.12)' : 'rgba(99,102,241,0.12)', color: isInd ? AURORA.accent : '#818cf8' }}>
            {isInd ? 'Indicação' : 'Carteira'}
          </span>
          <span className="text-xs font-medium" style={{ color: AURORA.text }}>
            {isInd ? (parceiro ? `Indicado por ${parceiro}` : 'Sem indicador') : `Gerente: ${gerente}`}
          </span>
        </div>
        {isInd && (percentual != null || valor != null) && (
          <div className="flex items-center gap-3 mt-1.5 text-[10px]" style={{ color: AURORA.textMuted }}>
            {percentual != null && <span>Comissão: <b style={{ color: AURORA.accent }}>{percentual}%</b></span>}
            {valor != null && <span>Valor est.: <b style={{ color: AURORA.accent }}>R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></span>}
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: AURORA.textMuted }}>Em Atendimento</p>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: 'rgba(0,212,170,0.15)', color: AURORA.accent }}>{(atendendo || '?').charAt(0).toUpperCase()}</span>
          <span className="text-xs font-semibold" style={{ color: AURORA.accent }}>{atendendo}</span>
        </div>
      </div>
    </div>
  );
}

// Wrapper leve para CadastroLeadPanel (indicação) — importa sob demanda e
// resolve a LeadIndicacao completa pelo id (100% das informações da indicação).
function CadastroIndicacao({ conversa, fila, leadIndicacao }) {
  const [Comp, setComp] = useState(null);
  const [leadResolvido, setLeadResolvido] = useState(leadIndicacao);
  useEffect(() => {
    import('@/components/central/CadastroLeadPanel').then(m => setComp(() => m.default)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!leadIndicacao && fila.lead_indicacao_id) {
      base44.entities.LeadIndicacao.get(fila.lead_indicacao_id).then(setLeadResolvido).catch(() => setLeadResolvido(null));
    } else {
      setLeadResolvido(leadIndicacao);
    }
  }, [fila.lead_indicacao_id, leadIndicacao]);
  if (!Comp) return <div className="py-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>;
  if (!conversa && !leadResolvido) return <p className="text-xs italic py-3" style={{ color: AURORA.textMuted }}>Indicação não encontrada.</p>;
  return <Comp conversa={conversa} leadIndicacao={leadResolvido} />;
}