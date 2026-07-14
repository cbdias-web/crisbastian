import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Gift } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const PREMIOS = [
  { label: 'Almoço', emoji: '🍽️', color: '#ef4444' },
  { label: 'Janta', emoji: '🌙', color: '#8b5cf6' },
  { label: 'Dia de Folga', emoji: '🏖️', color: '#10b981' },
  { label: 'R$ 100,00', emoji: '💰', color: '#f59e0b' },
];

// Duplicar para 8 segmentos (visual mais rico)
const SEGMENTOS = [...PREMIOS, ...PREMIOS];

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

export default function RoletaPopup({ roletaId, user, onClose }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const spin = () => {
    if (spinning || salvando) return;
    setSpinning(true);
    setResultado(null);

    const segAngle = 360 / SEGMENTOS.length;
    const randomSeg = Math.floor(Math.random() * SEGMENTOS.length);
    const premio = SEGMENTOS[randomSeg];
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

      // Confetti!
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

  // SVG segments
  const radius = 155;
  const center = 175;
  const segAngle = 360 / SEGMENTOS.length;

  const segments = SEGMENTOS.map((seg, i) => {
    const startAngle = (i * segAngle - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * segAngle - 90) * (Math.PI / 180);
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArc = segAngle > 180 ? 1 : 0;
    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const textAngle = (i * segAngle + segAngle / 2 - 90) * (Math.PI / 180);
    const textRadius = radius * 0.62;
    const tx = center + textRadius * Math.cos(textAngle);
    const ty = center + textRadius * Math.sin(textAngle);
    const textRotation = i * segAngle + segAngle / 2;

    return { path, seg, tx, ty, textRotation };
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 60%, #16213e 100%)',
          border: '1px solid rgba(0,212,170,0.25)',
          boxShadow: '0 0 60px rgba(0,212,170,0.2), 0 20px 60px rgba(0,0,0,0.7)',
        }}>

        {/* Header */}
        <div className="px-6 py-5 text-center relative" style={{ borderBottom: `1px solid ${A.border}` }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Gift className="w-6 h-6" style={{ color: A.accent }} />
            <h2 className="text-xl font-bold" style={{ color: A.text }}>Roleta de Prêmios</h2>
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

        {/* Wheel */}
        <div className="p-6 flex flex-col items-center">
          <div className="relative" style={{ width: 360, height: 360 }}>
            {/* Pointer */}
            <div className="absolute left-1/2 -translate-x-1/2 z-10"
              style={{
                top: '-4px',
                width: 0, height: 0,
                borderLeft: '14px solid transparent',
                borderRight: '14px solid transparent',
                borderTop: '24px solid #00D4AA',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
              }} />

            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 40px rgba(0,212,170,0.3)', border: '3px solid rgba(0,212,170,0.4)', borderRadius: '50%' }} />

            <svg width="350" height="350" viewBox="0 0 350 350"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                display: 'block',
                margin: 5,
              }}>
              {segments.map((s, i) => (
                <g key={i}>
                  <path d={s.path} fill={s.seg.color} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
                  <text x={s.tx} y={s.ty} fill="white" fontSize="13" fontWeight="bold"
                    textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${s.textRotation}, ${s.tx}, ${s.ty})`}
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                    {s.seg.emoji} {s.seg.label}
                  </text>
                </g>
              ))}
              <circle cx={center} cy={center} r="22" fill="#0d1117" stroke="#00D4AA" strokeWidth="2" />
              <text x={center} y={center} fill="#00D4AA" fontSize="20" textAnchor="middle" dominantBaseline="middle">🎁</text>
            </svg>
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