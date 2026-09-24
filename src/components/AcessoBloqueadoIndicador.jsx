import React from 'react';
import { Lock, LogOut } from 'lucide-react';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

// Tela exibida a usuários com perfil de INDICADOR — acesso ao Dash Parceiro bloqueado.
export default function AcessoBloqueadoIndicador({ user, onLogout }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: AURORA.bg }}>
      <div className="rounded-2xl p-8 max-w-sm w-full text-center"
        style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <Lock className="w-7 h-7" style={{ color: '#f87171' }} />
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: AURORA.text }}>Acesso Bloqueado</h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: AURORA.textMuted }}>
          O acesso ao Portal do Indicador está temporariamente indisponível.
          Para mais informações, contate <strong style={{ color: AURORA.text }}>Jader</strong> ou <strong style={{ color: AURORA.text }}>Nayara</strong>.
        </p>
        {onLogout && (
          <button onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            style={{ background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
            <LogOut className="w-4 h-4" /> Sair
          </button>
        )}
      </div>
    </div>
  );
}