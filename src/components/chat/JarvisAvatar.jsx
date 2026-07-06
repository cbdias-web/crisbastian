import { useState, useEffect } from 'react';

const JARVIS_IMG = 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/270241d13_CapturadeTela2026-07-06as092119.png';

const SIZE_MAP = {
  sm: { dim: 32, cls: 'w-8 h-8' },
  md: { dim: 40, cls: 'w-10 h-10' },
  lg: { dim: 56, cls: 'w-14 h-14' },
  xl: { dim: 72, cls: 'w-18 h-18' },
};

export default function JarvisAvatar({ size = 'md', pulse = false, glow = true }) {
  const cfg = SIZE_MAP[size] || SIZE_MAP.md;
  const [reactorPulse, setReactorPulse] = useState(0);

  // Anima o reator de forma dinâmica
  useEffect(() => {
    if (!glow) return;
    const interval = setInterval(() => {
      setReactorPulse(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [glow]);

  // Intensidade do glow oscilando
  const glowIntensity = glow ? 0.4 + Math.sin((reactorPulse / 100) * Math.PI * 2) * 0.3 : 0;
  const reactorScale = glow ? 1 + Math.sin((reactorPulse / 100) * Math.PI * 2) * 0.08 : 1;

  return (
    <div className={`relative ${cfg.cls} flex-shrink-0`} style={{ filter: glow ? `drop-shadow(0 0 ${4 + glowIntensity * 8}px rgba(0,123,255,${glowIntensity}))` : 'none' }}>
      {/* Ring pulsante externo */}
      {pulse && (
        <span className="absolute inset-0 rounded-full opacity-20 animate-ping" style={{ background: 'radial-gradient(circle, #007BFF 0%, transparent 70%)' }} />
      )}

      {/* Glow do reator de arco */}
      {glow && (
        <span
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: '-15%',
            background: `radial-gradient(circle at 50% 65%, rgba(0,123,255,${0.3 * glowIntensity}) 0%, rgba(174,228,255,${0.15 * glowIntensity}) 30%, transparent 60%)`,
            transform: `scale(${reactorScale})`,
            transition: 'transform 0.3s ease-out',
          }}
        />
      )}

      {/* Imagem do robô */}
      <img
        src={JARVIS_IMG}
        alt="Jarvis AI Assistant"
        className="relative z-10 w-full h-full object-cover rounded-full"
        style={{
          border: '1.5px solid rgba(0,123,255,0.3)',
          boxShadow: glow ? `inset 0 0 8px rgba(0,123,255,${glowIntensity * 0.3})` : 'none',
        }}
      />

      {/* Glow dos olhos */}
      {glow && (
        <span
          className="absolute rounded-full pointer-events-none z-20"
          style={{
            top: '28%',
            left: '28%',
            width: '44%',
            height: '8%',
            background: `radial-gradient(ellipse, rgba(255,255,255,${0.6 + glowIntensity * 0.4}) 0%, transparent 70%)`,
            filter: `blur(${1 + glowIntensity}px)`,
          }}
        />
      )}

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