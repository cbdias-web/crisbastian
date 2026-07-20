import React, { useState } from 'react';
import { X, Eye } from 'lucide-react';
import RoletaWheel, { PREMIOS_POR_TIPO, getSegmentos } from './RoletaWheel.jsx';

const A = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.5)',
  gold: '#D4AF37',
};

const WHEEL_SIZE = 420;

const TIPO_CONFIG = {
  default: { label: 'Roleta Padrão', icon: '🎁', desc: 'Almoço, Janta, Folga, R$100' },
  brincadeira: { label: 'Brincadeira', icon: '🎉', desc: '🧉 Chimarrão, ☕ Café, 🧀 Pão de Queijo' },
};

/**
 * Modal de visualização da roleta para administradores.
 * Permite girar a roleta em modo preview (sem salvar resultado)
 * para inspecionar o visual e identificar ajustes necessários.
 */
export default function RoletaPreviewModal({ onClose }) {
  const [tipo, setTipo] = useState('default');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [previewResultado, setPreviewResultado] = useState(null);

  const premios = PREMIOS_POR_TIPO[tipo];
  const segmentos = getSegmentos(tipo);

  const trocarTipo = (novoTipo) => {
    if (spinning) return;
    setTipo(novoTipo);
    setPreviewResultado(null);
    setRotation(0);
  };

  const spinPreview = () => {
    if (spinning) return;
    setSpinning(true);
    setPreviewResultado(null);

    const segAngle = 360 / segmentos.length;
    const randomSeg = Math.floor(Math.random() * segmentos.length);
    const premio = segmentos[randomSeg];
    const segmentCenter = randomSeg * segAngle + segAngle / 2;

    const fullSpins = 5;
    const currentMod = rotation % 360;
    const neededMod = (360 - segmentCenter) % 360;
    let delta = neededMod - currentMod;
    if (delta < 0) delta += 360;
    const targetRotation = rotation + fullSpins * 360 + delta;
    setRotation(targetRotation);

    setTimeout(() => {
      setSpinning(false);
      setPreviewResultado(premio);
    }, 4200);
  };

  // Prêmios únicos
  const premiosUnicos = segmentos.filter((seg, i, arr) =>
    arr.findIndex(s => s.label === seg.label) === i
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-3xl shadow-2xl w-full max-w-2xl relative overflow-hidden max-h-[95vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 60%, #16213e 100%)',
          border: '1px solid rgba(0,212,170,0.25)',
          boxShadow: '0 0 60px rgba(0,212,170,0.2), 0 20px 60px rgba(0,0,0,0.7)',
        }}>

        {/* Header */}
        <div className="px-6 py-5 relative" style={{ borderBottom: `1px solid ${A.border}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" style={{ color: A.accent }} />
              <div>
                <h2 className="text-lg font-bold" style={{ color: A.text }}>Visualização da Roleta</h2>
                <p className="text-xs" style={{ color: A.textMuted }}>Modo prévia — girar não registra prêmio</p>
              </div>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-lg transition"
              style={{ color: A.textMuted }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Seletor de tipo */}
          <div className="flex gap-2 mt-3">
            {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => trocarTipo(key)} disabled={spinning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                style={{
                  background: tipo === key ? A.accentDim : 'transparent',
                  border: `1px solid ${tipo === key ? A.border : 'rgba(255,255,255,0.08)'}`,
                  color: tipo === key ? A.accent : A.textMuted,
                }}>
                <span>{cfg.icon}</span>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 flex flex-col lg:flex-row gap-6 items-center">
          {/* Wheel */}
          <div className="relative flex-shrink-0" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
            {/* Pointer */}
            <div className="absolute left-1/2 -translate-x-1/2 z-10"
              style={{
                top: '-4px',
                width: 0, height: 0,
                borderLeft: '16px solid transparent',
                borderRight: '16px solid transparent',
                borderTop: '28px solid #00D4AA',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
              }} />
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 40px rgba(0,212,170,0.3)', border: '3px solid rgba(0,212,170,0.4)', borderRadius: '50%' }} />

            <RoletaWheel rotation={rotation} spinning={spinning} size={WHEEL_SIZE} premios={premios} />
          </div>

          {/* Info panel */}
          <div className="flex-1 w-full space-y-4">
            {/* Status do preview */}
            {previewResultado && (
              <div className="p-4 rounded-2xl text-center"
                style={{
                  background: 'rgba(0,212,170,0.08)',
                  border: '1px solid rgba(0,212,170,0.3)',
                }}>
                <div className="text-3xl mb-1">{previewResultado.emoji}</div>
                <p className="text-lg font-bold" style={{ color: A.accent }}>{previewResultado.label}</p>
                <p className="text-[10px] mt-1" style={{ color: A.textMuted }}>(resultado da prévia)</p>
              </div>
            )}

            {/* Lista de prêmios configurados */}
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: A.accent }}>
                Prêmios Configurados ({premiosUnicos.length} únicos · {segmentos.length} segmentos)
              </p>
              <div className="space-y-1.5">
                {premiosUnicos.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{ background: A.surface, border: `1px solid ${A.border}` }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                      style={{ background: p.color }}>
                      {p.emoji}
                    </div>
                    <span className="text-sm font-medium" style={{ color: A.text }}>{p.label}</span>
                    <span className="ml-auto text-xs" style={{ color: A.textMuted }}>
                      {segmentos.filter(s => s.label === p.label).length}x na roleta
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Botão de girar prévia */}
            <button onClick={spinPreview} disabled={spinning}
              className="w-full py-3 rounded-xl font-semibold transition disabled:opacity-60"
              style={{
                background: spinning ? '#333' : `linear-gradient(135deg, ${A.accent}, #0066cc)`,
                color: '#0d1117',
                boxShadow: spinning ? 'none' : `0 0 24px rgba(0,212,170,0.2)`,
              }}>
              {spinning ? '🌀 Girando...' : '🎯 Girar Prévia (teste)'}
            </button>
            <p className="text-center text-[10px]" style={{ color: A.textMuted }}>
              Use para verificar o visual e a legibilidade dos prêmios antes de liberar aos usuários.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}