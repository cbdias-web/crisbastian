import { X, Eye, Mail, Phone } from 'lucide-react';
import IndicacoesTab from './IndicacoesTab';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

export default function IndicadorBoxModal({ parceiro, onEntrarPortal, onClose, readOnly = false }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 gap-2" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00D4AA22, #0066cc22)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
              {parceiro.nome?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: AURORA.text }}>{parceiro.nome}</p>
              <p className="text-[11px] flex items-center gap-2 flex-wrap" style={{ color: AURORA.textMuted }}>
                {parceiro.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 flex-shrink-0" />{parceiro.email}</span>}
                {parceiro.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{parceiro.telefone}</span>}
                <span>· {parceiro.percentual_comissao ?? 0}%</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!readOnly && (
              <button onClick={onEntrarPortal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                style={{ background: 'rgba(0,212,170,0.10)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}
                title="Abrir o portal deste indicador"
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,170,0.18)'; e.currentTarget.style.borderColor = 'rgba(0,212,170,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,212,170,0.10)'; e.currentTarget.style.borderColor = AURORA.border; }}>
                <Eye className="w-3.5 h-3.5" /> Entrar no Portal
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Body: indicações do parceiro (admin pode atuar; readOnly = somente visualização) */}
        <div className="p-4 overflow-y-auto flex-1">
          <IndicacoesTab parceiroIdFixo={parceiro.id} modoIndicador={readOnly} hideNovaButton={readOnly} />
        </div>
      </div>
    </div>
  );
}