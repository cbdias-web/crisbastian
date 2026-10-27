import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { KeyRound, Loader2, X, ShieldCheck, ArrowRight } from 'lucide-react';

const A = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  muted: 'rgba(230,237,243,0.55)',
  danger: '#f87171',
};

export default function ModalCodigoLiberacao({ onClose, onConfirm }) {
  const [codigo, setCodigo] = useState('');
  const [validando, setValidando] = useState(false);
  const [erro, setErro] = useState('');
  const [valido, setValido] = useState(null);

  const validar = async () => {
    const c = codigo.trim().toUpperCase();
    if (!c) { setErro('Informe o código de liberação.'); return; }
    setValidando(true);
    setErro('');
    try {
      const res = await base44.functions.invoke('codigoLiberacaoVenda', { acao: 'validar', codigo: c });
      const data = res?.data || {};
      if (data.valido) setValido({ codigo: c, criado_por: data.criado_por });
      else setErro(data.error || 'Código inválido.');
    } catch (e) {
      setErro(e?.response?.data?.error || e.message || 'Erro ao validar o código.');
    }
    setValidando(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: A.surface, border: `1px solid ${A.border}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: A.surface2, borderBottom: `1px solid ${A.border}` }}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" style={{ color: A.accent }} />
            <div>
              <p className="font-bold text-sm" style={{ color: A.text }}>Liberação para venda manual</p>
              <p className="text-[10px]" style={{ color: A.muted }}>Cada código vale para um único lançamento</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: A.muted }}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: A.muted }}>
            O lançamento manual está bloqueado. Solicite à gerência o código de liberação exclusivo desta venda.
          </p>

          <div>
            <label className="text-[11px] font-semibold mb-1 block" style={{ color: A.muted }}>Código de liberação *</label>
            <input
              value={codigo}
              onChange={e => { setCodigo(e.target.value.toUpperCase()); setErro(''); setValido(null); }}
              onKeyDown={e => { if (e.key === 'Enter') validar(); }}
              placeholder="VX-XXXX-XXXX"
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl text-sm tracking-widest font-mono focus:outline-none uppercase"
              style={{ background: A.surface2, border: `1px solid ${erro ? 'rgba(239,68,68,0.5)' : A.border}`, color: A.text }}
            />
            {erro && <p className="text-[11px] mt-1" style={{ color: A.danger }}>{erro}</p>}
          </div>

          {valido && (
            <div className="rounded-xl px-3 py-2.5 flex items-start gap-2" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}>
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#34d399' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#6ee7b7' }}>Código válido</p>
                <p className="text-[10px]" style={{ color: 'rgba(110,231,183,0.8)' }}>
                  Liberado por {valido.criado_por || 'gerência'} — será consumido ao salvar a venda.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold"
              style={{ color: A.muted, border: `1px solid ${A.border}` }}>
              Cancelar
            </button>
            {valido ? (
              <button onClick={() => onConfirm(valido.codigo)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: A.accent, color: '#0d1117' }}>
                Continuar <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button onClick={validar} disabled={validando}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                style={{ background: A.accent, color: '#0d1117' }}>
                {validando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                Validar código
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}