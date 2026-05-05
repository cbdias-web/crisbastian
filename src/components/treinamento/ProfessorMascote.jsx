import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';

const POS_KEY = 'einstein_mascote_pos_v2';

const FRASES = {
  dashboard: [
    "Olá! Escolha um módulo e vamos aprender juntos! 🎓",
    "O conhecimento é a melhor ferramenta de vendas!",
    "Cada aula concluída te deixa mais perto do topo!",
    "Que tal explorar um módulo novo hoje?",
  ],
  modulo: [
    "Ótimo módulo! Clique em uma aula para começar.",
    "Vai passo a passo — cada aula conta! 📚",
    "Você está quase lá. Continue assim!",
    "Foco na trilha e o resultado vem! 💪",
  ],
  aula: [
    "Preste atenção, esse conteúdo é valioso!",
    "Anote os pontos principais enquanto assiste.",
    "Quando terminar, marque como concluída! ✅",
    "Você está evoluindo! Continue assim.",
  ],
  concluida: [
    "Parabéns! Aula concluída! 🎉",
    "Incrível! Você está dominando o conteúdo!",
    "Brilhante! Próxima aula te espera! →",
    "Que orgulho! Continue a jornada! 🏆",
  ],
};

const JarvisAvatar = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.22))' }}>
    <ellipse cx="7" cy="30" rx="6" ry="8" fill="#e8e8e8" />
    <ellipse cx="49" cy="30" rx="6" ry="8" fill="#e8e8e8" />
    <rect x="10" y="10" width="36" height="36" rx="14" fill="white" />
    <rect x="10" y="10" width="36" height="36" rx="14" fill="url(#mascote_grad)" opacity="0.15" />
    <rect x="15" y="16" width="26" height="20" rx="6" fill="#1a1a1a" />
    {/* Olho esquerdo azul */}
    <rect x="19" y="21" width="7" height="7" rx="3.5" fill="#4a90d9" />
    <rect x="21" y="23" width="3" height="3" rx="1.5" fill="#7ab8f5" />
    <rect x="20" y="22" width="1.5" height="1.5" rx="0.75" fill="white" />
    {/* Olho direito — piscando / linha relaxada */}
    <path d="M31 24.5 Q34 21.5 37 24.5" stroke="#4a90d9" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    {/* Sorriso */}
    <path d="M20 31 Q28 37 36 31" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <ellipse cx="7" cy="30" rx="3" ry="5" fill="#d0d0d0" />
    <ellipse cx="49" cy="30" rx="3" ry="5" fill="#d0d0d0" />
    {/* Antenas */}
    <polygon points="18,12 14,4 22,10" fill="white" />
    <polygon points="38,12 42,4 34,10" fill="white" />
    <polygon points="18,11 15.5,6 21,10" fill="#e0e0e0" />
    <polygon points="38,11 40.5,6 35,10" fill="#e0e0e0" />
    {/* Pés */}
    <rect x="20" y="46" width="6" height="5" rx="2" fill="#e8e8e8" />
    <rect x="30" y="46" width="6" height="5" rx="2" fill="#e8e8e8" />
    {/* Badge online */}
    <circle cx="44" cy="42" r="4" fill="#34d399" />
    <defs>
      <linearGradient id="mascote_grad" x1="10" y1="10" x2="46" y2="46" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#a0c4ff" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
    </defs>
  </svg>
);

function loadPos() {
  try {
    const s = localStorage.getItem(POS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  // Posição padrão: canto inferior esquerdo
  return { right: null, bottom: 0, left: 24, top: null };
}

export default function ProfessorMascote({ contexto = 'dashboard', progresso = 0, userName = '' }) {
  const [visivel, setVisivel] = useState(false);
  const [dispensado, setDispensado] = useState(false);
  const [fraseIdx, setFraseIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [mostrarBalao, setMostrarBalao] = useState(true);
  const [pos, setPos] = useState(loadPos);

  const timerRef = useRef(null);
  const dragRef = useRef(null);
  const hasDragged = useRef(false);
  const containerRef = useRef(null);

  const frases = FRASES[contexto] || FRASES.dashboard;

  useEffect(() => {
    setDispensado(false);
    setFraseIdx(0);
    setMostrarBalao(true);
    const t = setTimeout(() => setVisivel(true), 600);
    return () => clearTimeout(t);
  }, [contexto]);

  useEffect(() => {
    if (dispensado || !visivel) return;
    timerRef.current = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setFraseIdx(i => (i + 1) % frases.length);
        setAnimating(false);
      }, 300);
    }, 8000);
    return () => clearInterval(timerRef.current);
  }, [dispensado, visivel, frases.length, contexto]);

  const proximaFrase = () => {
    setAnimating(true);
    setTimeout(() => {
      setFraseIdx(i => (i + 1) % frases.length);
      setAnimating(false);
    }, 200);
  };

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    hasDragged.current = false;
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      origLeft: rect.left, origTop: rect.top,
    };

    const onMove = (ev) => {
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true;
      if (!hasDragged.current) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const newLeft = Math.max(0, Math.min(window.innerWidth - w, dragRef.current.origLeft + dx));
      const newTop = Math.max(0, Math.min(window.innerHeight - h, dragRef.current.origTop + dy));
      const newPos = { left: newLeft, top: newTop, bottom: null, right: null };
      setPos(newPos);
      localStorage.setItem(POS_KEY, JSON.stringify(newPos));
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (dispensado || !visivel) return null;

  const primeiroNome = userName ? userName.split(' ')[0] : '';
  const frase = frases[fraseIdx].replace('{nome}', primeiroNome);

  const containerStyle = {
    position: 'fixed',
    zIndex: 40,
    left: pos.left ?? 'auto',
    right: pos.right ?? 'auto',
    top: pos.top != null ? pos.top : 'auto',
    bottom: pos.top != null ? 'auto' : (pos.bottom ?? 0),
  };

  return (
    <div
      ref={containerRef}
      style={{ ...containerStyle, maxWidth: 230 }}
      className="flex flex-col items-start select-none"
    >
      {/* Balão de fala */}
      {mostrarBalao && (
        <div
          className="relative bg-white border border-blue-100 rounded-2xl rounded-bl-none shadow-xl px-4 py-3 mb-0"
          style={{ maxWidth: 220, minWidth: 160 }}
        >
          <button
            onClick={() => setDispensado(true)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition z-10"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 bg-[#D4AF37] rounded-full" />
            <span className="text-[10px] font-bold text-[#1a3150] uppercase tracking-wider">Jarvis</span>
          </div>
          <p className={`text-sm text-gray-700 leading-relaxed transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}>
            {frase}
          </p>
          {contexto === 'modulo' && progresso > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                <span>Progresso</span><span className="font-semibold">{progresso}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-[#1a3150] to-blue-400 transition-all" style={{ width: `${progresso}%` }} />
              </div>
            </div>
          )}
          <button onClick={proximaFrase} className="mt-2 text-[10px] text-[#1a3150] hover:underline flex items-center gap-1 font-medium">
            outra dica <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Boneco arrastável */}
      <div
        onMouseDown={onMouseDown}
        onClick={() => { if (!hasDragged.current) setMostrarBalao(v => !v); }}
        className="cursor-grab active:cursor-grabbing"
        title="Arraste para mover · clique para dica"
        style={{ lineHeight: 0 }}
      >
        <JarvisAvatar />
      </div>
    </div>
  );
}