import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Phone, User, Package, MapPin, Loader2, PhoneCall, PhoneMissed, FileText, Phone as PhoneIcon, MessageSquare } from 'lucide-react';
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
    setShowCadastro(s => !s);
    if (showCadastro) return;
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
      <div className="w-full max-w-3xl max-h-[calc(100vh-140px)] flex flex-col rounded-2xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
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

        {/* Body — 2 colunas: esquerda capa/cadastro, direita pitch */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          <div className="flex-1 p-5 space-y-4 min-w-0">
            {etapa === 'capa' && (
              <>
                {/* QR codes */}
                <div className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: AURORA.accent }}>Escaneie para iniciar o contato</p>
                  <div className="flex gap-4 justify-center">
                    <div className="text-center">
                      <img src={qrUrl(waLink(fila.telefone) || ' ', 140)} alt="QR WhatsApp" className="rounded-lg" style={{ width: 140, height: 140, background: '#0d1117' }} />
                      <p className="text-[10px] mt-1 flex items-center justify-center gap-1" style={{ color: AURORA.green }}><MessageSquare className="w-3 h-3" /> WhatsApp</p>
                    </div>
                    <div className="text-center">
                      <img src={qrUrl(telParaTel(fila.telefone) || ' ', 140)} alt="QR Ligação" className="rounded-lg" style={{ width: 140, height: 140, background: '#0d1117' }} />
                      <p className="text-[10px] mt-1 flex items-center justify-center gap-1" style={{ color: '#60a5fa' }}><PhoneIcon className="w-3 h-3" /> Ligação</p>
                    </div>
                  </div>
                </div>

                {/* Botões Atendeu / Não Atendeu */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setEtapa('registro')}
                    className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition" style={{ background: AURORA.accent, color: '#0d1117' }}>
                    <PhoneCall className="w-4 h-4" /> Atendeu
                  </button>
                  <button onClick={registrarNaoAtendeu} disabled={registrando}
                    className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition disabled:opacity-40" style={{ background: 'rgba(239,68,68,0.15)', color: AURORA.danger, border: '1px solid rgba(239,68,68,0.3)' }}>
                    {registrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneMissed className="w-4 h-4" />} Não Atendeu
                  </button>
                </div>

                {/* Botão Cadastro */}
                <button onClick={abrirCadastro}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition"
                  style={{ background: 'rgba(0,212,170,0.08)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                  <FileText className="w-4 h-4" /> {showCadastro ? 'Ocultar Cadastro' : 'Ver Cadastro'}
                </button>

                {showCadastro && (
                  loadingConv ? <div className="py-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>
                  : isIndicacao
                    ? <CadastroIndicacao conversa={conversa} fila={fila} />
                    : <CadastroCarteiraPanel clienteId={fila.cliente_id || fila.ref_id} fila={fila} />
                )}
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

          {/* Lateral: Pitch */}
          <div className="md:w-64 flex-shrink-0 p-3 md:border-l" style={{ borderColor: AURORA.border }}>
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