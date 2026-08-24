import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Phone, Package, MapPin, Loader2, PhoneCall, PhoneMissed, FileText, Phone as PhoneIcon, MessageSquare, ChevronRight, ArrowLeft } from 'lucide-react';
import { qrUrl, waLink, telParaTel } from './QrCodeContato';
import PitchAbordagemPanel from './PitchAbordagemPanel';
import RegistroLigacaoForm from './RegistroLigacaoForm';
import CadastroCarteiraPanel from './CadastroCarteiraPanel';

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

export default function CapaContatoPopup({ fila, user, vendedor, onAtualizado, onClose }) {
  // view: 'capa' | 'registro' | 'cadastro' — a área principal troca entre elas (sem coluna extra)
  const [view, setView] = useState('capa');
  const [registrando, setRegistrando] = useState(false);
  const [conversa, setConversa] = useState(null);
  const [loadingConv, setLoadingConv] = useState(false);

  const isIndicacao = fila.tipo_origem === 'indicacao';

  const registrarNaoAtendeu = async () => {
    if (!confirm('Confirmar: cliente NÃO atendeu. O lead vai para o fim da fila e é reagendado para o próximo dia útil.')) return;
    setRegistrando(true);
    try {
      await base44.functions.invoke('registrarTentativaContato', { fila_id: fila.id, acao: 'nao_atendeu' });
      toast.success('Não atendido — reagendado para o próximo dia útil.');
      onAtualizado?.();
      onClose?.();
    } catch (e) {
      toast.error('Erro: ' + (e?.response?.data?.error || e.message));
    }
    setRegistrando(false);
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        className="flex flex-col rounded-3xl overflow-hidden"
        style={{
          width: 720,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 80px)',
          background: AURORA.surface,
          border: `1px solid ${AURORA.border}`,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
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
              {fila.produto && <span className="flex items-center gap-1"><Package className="w-3 h-3" />{fila.produto}</span>}
              {fila.origem_label && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{fila.origem_label}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg flex-shrink-0 transition hover:bg-white/5" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
        </div>

        {/* Body — 2 colunas fixas: principal (capa/registro/cadastro) + pitch */}
        <div className="flex-1 flex overflow-hidden">
          {/* Coluna principal */}
          <div className="flex-1 min-w-0 overflow-y-auto" style={{ borderRight: `1px solid ${AURORA.border}` }}>
            {view === 'capa' && (
              <div className="p-6 flex flex-col items-center gap-5">
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

                {/* Botões refinados em pílulas */}
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => setView('registro')}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition hover:brightness-110"
                    style={{ background: AURORA.accent, color: '#0d1117', boxShadow: '0 4px 16px rgba(0,212,170,0.25)' }}>
                    <PhoneCall className="w-4 h-4" /> Atendeu
                  </button>
                  <button onClick={registrarNaoAtendeu} disabled={registrando}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition hover:bg-red-500/10 disabled:opacity-40"
                    style={{ background: 'transparent', color: AURORA.danger, border: '1px solid rgba(248,113,113,0.35)' }}>
                    {registrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneMissed className="w-4 h-4" />} Não Atendeu
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
                  {loadingConv ? (
                    <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>
                  ) : isIndicacao ? (
                    <CadastroIndicacao conversa={conversa} fila={fila} />
                  ) : (
                    <CadastroCarteiraPanel clienteId={fila.cliente_id || fila.ref_id} fila={fila} />
                  )}
                </div>
              </div>
            )}

            {view === 'registro' && (
              <div className="p-5">
                <RegistroLigacaoForm
                  fila={fila}
                  onConcluido={() => { onAtualizado?.(); onClose?.(); }}
                  onCancelar={() => setView('capa')}
                />
              </div>
            )}
          </div>

          {/* Coluna Pitch (fixa) */}
          <div className="flex-shrink-0 overflow-y-auto" style={{ width: 280 }}>
            <PitchAbordagemPanel produto={fila.produto} nomeLead={fila.nome} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper leve para CadastroLeadPanel (indicação) — importa sob demanda.
function CadastroIndicacao({ conversa, fila }) {
  const [Comp, setComp] = useState(null);
  import('@/components/central/CadastroLeadPanel').then(m => setComp(() => m.default)).catch(() => {});
  if (!Comp) return <div className="py-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>;
  if (!conversa) return <p className="text-xs italic py-3" style={{ color: AURORA.textMuted }}>Conversa não encontrada.</p>;
  return <Comp conversa={conversa} />;
}