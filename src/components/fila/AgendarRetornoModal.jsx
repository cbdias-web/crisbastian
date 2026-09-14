import { useState } from 'react';
import { X, CalendarPlus, Clock, AlertTriangle } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(255,255,255,0.08)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  warn: '#fbbf24',
};

const hojeStr = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

// Modal rápido de agendamento obrigatório: nenhum lead pode entrar (ou ficar)
// em "Em Contato" sem uma data/hora de retorno futura vinculada.
export default function AgendarRetornoModal({ leadNome, onConfirm, onCancel }) {
  const [data, setData] = useState('');
  const [hora, setHora] = useState('09:00');
  const [erro, setErro] = useState('');

  const confirmar = () => {
    if (!data) { setErro('Informe a data do próximo retorno.'); return; }
    if (data < hojeStr()) { setErro('A data do retorno deve ser hoje ou futura.'); return; }
    if (!hora) { setErro('Informe o horário do próximo retorno.'); return; }
    onConfirm({ data, hora });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }} onClick={onCancel}>
      <div className="rounded-2xl w-full max-w-sm overflow-hidden"
        style={{ background: AURORA.surface, border: `1px solid rgba(251,191,36,0.4)`, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-start justify-between" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: AURORA.warn }} />
              <h3 className="font-bold text-sm" style={{ color: AURORA.text }}>Retorno obrigatório</h3>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: AURORA.textMuted }}>{leadNome}</p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg transition hover:bg-white/5" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs rounded-xl px-3 py-2.5" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', color: AURORA.text }}>
            Nenhum lead pode ficar em <strong style={{ color: AURORA.warn }}>Em Contato</strong> sem um retorno agendado. Informe quando o cliente será buscado novamente.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] mb-1 flex items-center gap-1" style={{ color: AURORA.textMuted }}><CalendarPlus className="w-3 h-3" /> Data do retorno *</label>
              <input type="date" min={hojeStr()} value={data} onChange={e => { setData(e.target.value); setErro(''); }}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            </div>
            <div>
              <label className="text-[11px] mb-1 flex items-center gap-1" style={{ color: AURORA.textMuted }}><Clock className="w-3 h-3" /> Horário *</label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            </div>
          </div>
          {erro && <p className="text-[11px] font-semibold" style={{ color: '#f87171' }}>{erro}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${AURORA.border}` }}>
          <button onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
            Cancelar
          </button>
          <button onClick={confirmar}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition hover:brightness-110" style={{ background: AURORA.warn, color: '#0d1117' }}>
            <CalendarPlus className="w-4 h-4" /> Agendar retorno
          </button>
        </div>
      </div>
    </div>
  );
}