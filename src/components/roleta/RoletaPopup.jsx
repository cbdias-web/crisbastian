import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Gift } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
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

const WHEEL_SIZE = 440;

const TITULOS = {
  default: 'Roleta de Prêmios',
  brincadeira: 'Roleta da Brincadeira 🎉',
};

export default function RoletaPopup({ roletaId, user, tipo = 'default', onClose }) {
  const premios = PREMIOS_POR_TIPO[tipo] || PREMIOS_POR_TIPO.default;
  const segmentos = getSegmentos(tipo);

  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const spin = () => {
    if (spinning || salvando) return;
    setSpinning(true);
    setResultado(null);

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

    setTimeout(async () => {
      setSpinning(false);
      setResultado(premio);

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#00D4AA', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'],
      });

      setSalvando(true);
      try {
        await base44.entities.RoletaPremio.update(roletaId, {
          ja_girou: true,
          premio: `${premio.emoji} ${premio.label}`,
          girado_em: new Date().toISOString(),
        });
      } catch (e) {
        toast.error('Erro ao registrar prêmio');
      }
      setSalvando(false);
    }, 4200);
  };

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
        <div className="px-6 py-5 text-center relative" style={{ borderBottom: `1px solid ${A.border}` }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Gift className="w-6 h-6" style={{ color: A.accent }} />
            <h2 className="text-xl font-bold" style={{ color: A.text }}>{TITULOS[tipo] || TITULOS.default}</h2>
          </div>
          <p className="text-sm" style={{ color: A.textMuted }}>
            {resultado ? '🎉 Parabéns! Você foi premiado!' : 'Gire a roleta e ganhe um prêmio!'}
          </p>
          {!resultado && (
            <button onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg transition"
              style={{ color: A.textMuted }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Wheel + Legend */}
        <div className="p-6 flex flex-col lg:flex-row items-center gap-6">
          {/* Legend lateral (hidden after result) */}
          {!resultado && (
            <div className="w-full lg:w-44 flex-shrink-0 space-y-2 order-2 lg:order-1">
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: A.accent }}>
                Legenda
              </p>
              {premios.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: A.surface, border: `1px solid ${A.border}` }}>
                  <div className="w-8 h-8 rounded-md flex items-center justify-center text-lg"
                    style={{ background: p.color }}>
                    {p.emoji}
                  </div>
                  <span className="text-sm font-medium" style={{ color: A.text }}>{p.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex-shrink-0 order-1 lg:order-2" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
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

            {/* Spin button or result */}
            {resultado ? (
            <div className="mt-6 text-center space-y-4 w-full">
             <div className="p-6 rounded-2xl"
               style={{
                 background: 'rgba(0,212,170,0.08)',
                 border: '1px solid rgba(0,212,170,0.3)',
                 boxShadow: '0 0 24px rgba(0,212,170,0.15)',
               }}>
               <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: A.textMuted }}>
                 Você ganhou
               </p>
               <div className="text-5xl mb-2">{resultado.emoji}</div>
               <p className="text-2xl font-bold" style={{ color: A.accent }}>{resultado.label}</p>
             </div>
              <button onClick={onClose}
                className="w-full py-3 rounded-xl font-semibold transition"
                style={{ background: `linear-gradient(135deg, ${A.accent}, #0066cc)`, color: '#0d1117' }}>
                {salvando ? 'Registrando...' : '✨ Receber Prêmio!'}
              </button>
            </div>
          ) : (
            <button onClick={spin} disabled={spinning}
              className="mt-6 px-10 py-3 rounded-xl font-bold text-lg transition disabled:opacity-60"
              style={{
                background: spinning ? '#333' : `linear-gradient(135deg, ${A.accent}, #0066cc)`,
                color: '#0d1117',
                boxShadow: spinning ? 'none' : `0 0 24px rgba(0,212,170,0.3)`,
              }}>
              {spinning ? '🌀 Girando...' : '🎯 Girar Roleta'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}