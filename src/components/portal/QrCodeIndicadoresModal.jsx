import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { qrUrl } from '@/components/fila/QrCodeContato.jsx';

const AURORA = {
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

// Modal de QR Code do link genérico de indicação (/indicar).
// O indicador escaneia e cai direto na página de cadastro do portal.
export default function QrCodeIndicadoresModal({ link = 'https://villelaexchange.base44.app/indicar', onClose }) {
  const qr = qrUrl(link, 320);

  const baixar = () => {
    const a = document.createElement('a');
    a.href = qr;
    a.download = 'qrcode-indicacao-villela.png';
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(13,17,23,0.85)' }}
      onClick={onClose}>
      <div className="rounded-2xl p-6 w-full max-w-sm text-center relative" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg transition"
          style={{ color: AURORA.textMuted }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,212,170,0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-bold mb-1" style={{ color: AURORA.text }}>QR Code de Indicação</h3>
        <p className="text-xs mb-4" style={{ color: AURORA.textMuted }}>
          Indicador escaneia e cai direto no cadastro do portal do indicador.
        </p>

        <div className="inline-block rounded-xl p-3 bg-white mx-auto">
          <img src={qr} alt="QR Code do link de indicação" width={240} height={240}
            style={{ display: 'block' }} />
        </div>

        <p className="text-[11px] mt-3 break-all" style={{ color: AURORA.textMuted }}>{link}</p>

        <button onClick={baixar} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition"
          style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
          <Download className="w-3.5 h-3.5" /> Baixar QR Code (PNG)
        </button>
      </div>
    </div>
  );
}