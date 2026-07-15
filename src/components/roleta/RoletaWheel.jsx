import React from 'react';

// Prêmios padrão da roleta — compartilhado entre popup e preview
export const PREMIOS = [
  { label: 'Almoço', emoji: '🍽️', color: '#ef4444' },
  { label: 'Janta', emoji: '🌙', color: '#8b5cf6' },
  { label: 'Dia de Folga', emoji: '🏖️', color: '#10b981' },
  { label: 'R$ 100,00', emoji: '💰', color: '#f59e0b' },
];

// Duplicar para 8 segmentos (visual mais rico)
export const SEGMENTOS = [...PREMIOS, ...PREMIOS];

/**
 * Renderiza apenas a roda SVG (sem botões/lógica de spin).
 * Props:
 *  - rotation: graus de rotação atual
 *  - spinning: se está animando (aplica transition)
 *  - size: tamanho em px (default 440)
 */
export default function RoletaWheel({ rotation = 0, spinning = false, size = 440 }) {
  const radius = size / 2 - 20;
  const center = size / 2;
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
    const textRadius = radius * 0.68;
    const tx = center + textRadius * Math.cos(textAngle);
    const ty = center + textRadius * Math.sin(textAngle);
    const textRotation = i * segAngle + segAngle / 2;

    return { path, seg, tx, ty, textRotation };
  });

  const fontSizeEmoji = Math.round(size * 0.085);  // ~37px at 440

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: spinning ? 'transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
        display: 'block',
      }}>
      {segments.map((s, i) => (
        <g key={i}>
          <path d={s.path} fill={s.seg.color} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
          <text x={s.tx} y={s.ty}
            textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(${s.textRotation}, ${s.tx}, ${s.ty})`}
            style={{ fontSize: fontSizeEmoji }}>
            {s.seg.emoji}
          </text>
        </g>
      ))}
      <circle cx={center} cy={center} r={size * 0.058} fill="#0d1117" stroke="#00D4AA" strokeWidth="2.5" />
      <text x={center} y={center} fill="#00D4AA" fontSize={size * 0.052} textAnchor="middle" dominantBaseline="middle">🎁</text>
    </svg>
  );
}