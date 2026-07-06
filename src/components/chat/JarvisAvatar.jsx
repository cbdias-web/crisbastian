import { useState, useEffect, useRef } from 'react';

const JARVIS_IMG = 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/270241d13_CapturadeTela2026-07-06as092119.png';

const SIZE_MAP = {
  sm: { dim: 32, cls: 'w-8 h-8' },
  md: { dim: 40, cls: 'w-10 h-10' },
  lg: { dim: 56, cls: 'w-14 h-14' },
  xl: { dim: 80, cls: 'w-20 h-20' },
};

export default function JarvisAvatar({ size = 'md', pulse = false, glow = true }) {
  const cfg = SIZE_MAP[size] || SIZE_MAP.md;
  const [tick, setTick] = useState(0);
  const [blinkPhase, setBlinkPhase] = useState(false);
  const tickRef = useRef(0);

  // Loop de animação principal (~60fps com throttle)
  useEffect(() => {
    if (!glow) return;
    let raf;
    let last = 0;
    const loop = (ts) => {
      if (ts - last > 50) {
        tickRef.current = (tickRef.current + 1) % 360;
        setTick(tickRef.current);
        last = ts;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [glow]);

  // Pisca os olhos periodicamente
  useEffect(() => {
    if (!glow) return;
    const interval = setInterval(() => {
      setBlinkPhase(true);
      setTimeout(() => setBlinkPhase(false), 150);
    }, 3500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [glow]);

  const t = tick / 360 * Math.PI * 2;
  const glowIntensity = glow ? 0.5 + Math.sin(t) * 0.3 : 0;
  const eyeGlow = glow ? 0.7 + Math.sin(t * 1.5) * 0.3 : 0;
  const scanY = glow ? (Math.sin(t * 0.5) * 0.5 + 0.5) * 100 : 0;

  return (
    <div
      className={`relative ${cfg.cls} flex-shrink-0 rounded-full`}
      style={{
        filter: glow ? `drop-shadow(0 0 ${6 + glowIntensity * 10}px rgba(0,123,255,${glowIntensity * 0.6}))` : 'none',
      }}
    >
      {/* Ring pulsante externo */}
      {pulse && (
        <span
          className="absolute inset-0 rounded-full opacity-30 animate-ping"
          style={{ background: 'radial-gradient(circle, #007BFF 0%, transparent 70%)' }}
        />
      )}

      {/* Glow do reator (azul) */}
      {glow && (
        <span
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: '-20%',
            background: `radial-gradient(circle at 50% 70%, rgba(0,123,255,${0.35 * glowIntensity}) 0%, rgba(174,228,255,${0.12 * glowIntensity}) 35%, transparent 65%)`,
          }}
        />
      )}

      {/* Frame metálico */}
      <div
        className="absolute inset-0 rounded-full z-10 overflow-hidden"
        style={{
          border: '2px solid rgba(142,146,150,0.4)',
          boxShadow: `
            inset 0 0 ${4 + glowIntensity * 6}px rgba(0,123,255,${glowIntensity * 0.3}),
            0 1px 2px rgba(0,0,0,0.5)
          `,
        }}
      >
        {/* Imagem — crop focado no rosto/cabeça */}
        <img
          src={JARVIS_IMG}
          alt="Jarvis AI"
          className="w-full h-full object-cover"
          style={{
            objectPosition: '50% 25%',
            transform: `scale(${glow ? 1.05 + Math.sin(t) * 0.02 : 1})`,
            transition: 'transform 0.3s ease-out',
          }}
        />

        {/* Linha de scan horizontal dinâmica */}
        {glow && (
          <span
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${scanY}%`,
              height: '1.5px',
              background: `linear-gradient(90deg, transparent 0%, rgba(174,228,255,${0.6 + eyeGlow * 0.4}) 50%, transparent 100%)`,
              boxShadow: `0 0 4px rgba(174,228,255,${0.5 + eyeGlow * 0.5})`,
              opacity: glow ? 0.7 : 0,
            }}
          />
        )}

        {/* Glow dos olhos brancos */}
        {glow && !blinkPhase && (
          <span
            className="absolute pointer-events-none rounded-full"
            style={{
              top: '24%',
              left: '26%',
              width: '48%',
              height: '6%',
              background: `radial-gradient(ellipse, rgba(255,255,255,${0.8 + eyeGlow * 0.2}) 0%, rgba(174,228,255,0.3) 50%, transparent 80%)`,
              filter: `blur(${1 + eyeGlow}px)`,
            }}
          />
        )}

        {/* Linha brilhante da testa */}
        {glow && (
          <span
            className="absolute pointer-events-none"
            style={{
              top: '17%',
              left: '32%',
              width: '36%',
              height: '2px',
              background: `linear-gradient(90deg, transparent 0%, rgba(174,228,255,${0.5 + eyeGlow * 0.5}) 50%, transparent 100%)`,
              filter: `blur(0.5px)`,
              boxShadow: `0 0 3px rgba(174,228,255,${eyeGlow})`,
            }}
          />
        )}

        {/* Vinheta sutil nas bordas para destacar o rosto */}
        <span
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{
            background: 'radial-gradient(circle at 50% 30%, transparent 50%, rgba(13,17,23,0.4) 95%)',
          }}
        />
      </div>

      {/* Indicador de status online */}
      <span
        className="absolute bottom-0 right-0 w-3 h-3 rounded-full z-30"
        style={{
          background: '#00D4AA',
          border: '2px solid #0d1117',
          boxShadow: '0 0 6px rgba(0,212,170,0.6)',
        }}
      />
    </div>
  );
}