import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Phone, User, Package, MapPin, Loader2, PhoneCall, PhoneMissed, FileText, Phone as PhoneIcon, MessageSquare, ChevronRight } from 'lucide-react';
import { qrUrl, waLink, telParaTel } from './QrCodeContato';
import PitchAbordagemPanel from './PitchAbordagemPanel';
import RegistroLigacaoForm from './RegistroLigacaoForm';
import CadastroCarteiraPanel from './CadastroCarteiraPanel';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  danger: '#f87171',
  green: '#34d399',
};

export default function CapaContatoPopup({ fila, user, vendedor, onAtualizado, onClose }) {
  const [etapa, setEtapa] = useState('capa'); // capa | registro
  const [showCadastro, setShowCadastro] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  // Busca conversa para CadastroLeadPanel quando for indicação
  const [conversa, setConversa] = useState(null);
  const [loadingConv, setLoadingConv] = useState(false);

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

  const abrirCadastro = async () => {
    const next = !showCadastro;
    setShowCadastro(next);
    if (!next) return;
    if (fila.tipo_origem === 'indicacao' && !conversa) {
      setLoadingConv(true);
      try {
        const c = await base44.entities.ConversaWhatsapp.get(fila.ref_id).catch(() => null);
        setConversa(c || { id: fila.ref_id, lead_nome: fila.nome, telefone: fila.telefone, origem: fila.origem_label, produto_interesse: fila.produto });
      } finally { setLoadingConv(false); }
    }
  };

  const isIndicacao = fila.tipo_origem === 'indicacao';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: showCadastro ? 960 : 640,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 80px)',
          background: AURORA.surface,
          border: `1px solid ${AURORA.border}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          transition: 'width 320ms ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 flex items-start justify-between flex-shrink-0" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-base" style={{ color: AURORA.text }}>{fila.nome}</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: isIndicacao ? 'rgba(0,212,170,0.15)' : 'rgba(99,102,241,0.15)', color: isIndicacao ? AURORA.accent : '#818cf8' }}>
                {isIndicacao ? 'Indicação' : 'Carteira'}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs" style={{ color: AURORA.textMuted }}>
              {fila.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{fila.telefone}</span>}
              {fila.produto && <span className="flex items-center gap-1"><Package className="w-3 h-3" />{fila.produto}</span>}
              {fila.origem_label && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{fila.origem_label}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
        </div>

        {/* Body — colunas: capa (fixa) | cadastro (expande quando aberta) | pitch (fixa) */}
        <div className="flex-1 flex flex-row overflow-hidden">
          {/* Coluna Capa */}
          <div
            className="flex-shrink-0 overflow-y-auto p-4 space-y-3"
            style={{ width: 300, borderRight: `1px solid ${AURORA.border}` }}
          >
            {etapa === 'capa' && (
              <>
                {/* QR codes brandos e espaçados */}
                <div className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-3 text-center" style={{ color: AURORA.accent, opacity: 0.8 }}>Escaneie para contato</p>
                  <div className="flex justify-between items-start" style={{ gap: 28 }}>
                    <div className="text-center flex-1">
                      <img src={qrUrl(waLink(fila.telefone) || ' ', 132)} alt="QR WhatsApp" className="rounded-lg mx-auto" style={{ width: 132, height: 132, background: '#0d1117', opacity: 0.82 }} />
                      <p className="text-[10px] mt-1.5 flex items-center justify-center gap-1 font-semibold" style={{ color: AURORA.green }}><MessageSquare className="w-3 h-3" /> WhatsApp</p>
                    </div>
                    <div className="text-center flex-1">
                      <img src={qrUrl(telParaTel(fila.telefone) || ' ', 132)} alt="QR Ligação" className="rounded-lg mx-auto" style={{ width: 132, height: 132, background: '#0d1117', opacity: 0.82 }} />
                      <p className="text-[10px] mt-1.5 flex items-center justify-center gap-1 font-semibold" style={{ color: '#60a5fa' }}><PhoneIcon className="w-3 h-3" /> Ligação</p>
                    </div>
                  </div>
                </div>

                {/* Botões Atendeu / Não Atendeu */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEtapa('registro')}
                    className="flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl text-sm font-bold transition hover:brightness-110" style={{ background: AURORA.accent, color: '#0d1117' }}>
                    <PhoneCall className="w-4 h-4" /> Atendeu
                  </button>
                  <button onClick={registrarNaoAtendeu} disabled={registrando}
                    className="flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl text-sm font-bold transition disabled:opacity-40 hover:brightness-110" style={{ background: 'rgba(239,68,68,0.15)', color: AURORA.danger, border: '1px solid rgba(239,68,68,0.3)' }}>
                    {registrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneMissed className="w-4 h-4" />} Não Atendeu
                  </button>
                </div>

                {/* Toggle Cadastro */}
                <button onClick={abrirCadastro}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: showCadastro ? 'rgba(0,212,170,0.14)' : 'rgba(0,212,170,0.06)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> {showCadastro ? 'Ocultar Cadastro' : 'Ver Cadastro'}</span>
                  <ChevronRight className="w-4 h-4 transition-transform" style={{ transform: showCadastro ? 'rotate(90deg)' : 'none' }} />
                </button>
              </>
            )}

            {etapa === 'registro' && (
              <RegistroLigacaoForm
                fila={fila}
                onConcluido={() => { onAtualizado?.(); onClose?.(); }}
                onCancelar={() => setEtapa('capa')}
              />
            )}
          </div>

          {/* Coluna Cadastro — expande quando ativada */}
          {showCadastro && (
            <div className="flex-1 min-w-0 overflow-y-auto p-4" style={{ borderRight: `1px solid ${AURORA.border}` }}>
              {loadingConv ? (
                <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>
              ) : isIndicacao ? (
                <CadastroIndicacao conversa={conversa} fila={fila} />
              ) : (
                <CadastroCarteiraPanel clienteId={fila.cliente_id || fila.ref_id} fila={fila} />
              )}
            </div>
          )}

          {/* Coluna Pitch */}
          <div className="flex-shrink-0 overflow-y-auto" style={{ width: 280 }}>
            <PitchAbordagemPanel produto={fila.produto} nomeLead={fila.nome} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper leve para CadastroLeadPanel (indicação) — importa sob demanda para evitar ciclo.
function CadastroIndicacao({ conversa, fila }) {
  const [Comp, setComp] = useState(null);
  import('@/components/central/CadastroLeadPanel').then(m => setComp(() => m.default)).catch(() => {});
  if (!Comp) return <div className="py-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>;
  if (!conversa) return <p className="text-xs italic py-3" style={{ color: AURORA.textMuted }}>Conversa não encontrada.</p>;
  return <Comp conversa={conversa} />;
}