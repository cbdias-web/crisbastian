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

const EinsteinSVG = () => (
  <svg width="100" height="150" viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cabelo selvagem */}
    <ellipse cx="50" cy="32" rx="28" ry="10" fill="#f0f0f0"/>
    <path d="M22 38 Q14 20 22 12 Q28 6 34 14" fill="#e8e8e8"/>
    <path d="M78 38 Q86 20 78 12 Q72 6 66 14" fill="#e8e8e8"/>
    <path d="M26 28 Q18 14 26 6 Q32 1 36 10" fill="#f0f0f0"/>
    <path d="M74 28 Q82 14 74 6 Q68 1 64 10" fill="#f0f0f0"/>
    <path d="M30 22 Q24 8 34 4 Q42 0 42 12" fill="#e8e8e8"/>
    <path d="M70 22 Q76 8 66 4 Q58 0 58 12" fill="#e8e8e8"/>
    {/* Cabeça */}
    <ellipse cx="50" cy="46" rx="22" ry="24" fill="#FDDBB4"/>
    {/* Sobrancelhas */}
    <path d="M32 36 Q38 32 44 36" stroke="#888" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <path d="M56 36 Q62 32 68 36" stroke="#888" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    {/* Óculos */}
    <circle cx="38" cy="44" r="7" stroke="#555" strokeWidth="1.8" fill="white" fillOpacity="0.5"/>
    <circle cx="62" cy="44" r="7" stroke="#555" strokeWidth="1.8" fill="white" fillOpacity="0.5"/>
    <line x1="45" y1="44" x2="55" y2="44" stroke="#555" strokeWidth="1.5"/>
    <line x1="31" y1="44" x2="27" y2="46" stroke="#555" strokeWidth="1.5"/>
    <line x1="69" y1="44" x2="73" y2="46" stroke="#555" strokeWidth="1.5"/>
    {/* Olhos */}
    <circle cx="38" cy="44" r="3" fill="#4a3728"/>
    <circle cx="62" cy="44" r="3" fill="#4a3728"/>
    <circle cx="39" cy="43" r="1" fill="white"/>
    <circle cx="63" cy="43" r="1" fill="white"/>
    {/* Nariz */}
    <path d="M50 48 Q47 54 50 56 Q53 54 50 48" fill="#e8a87c"/>
    {/* Bigode */}
    <path d="M38 60 Q44 57 50 60 Q56 57 62 60" fill="#e8e8e8" stroke="#ccc" strokeWidth="0.5"/>
    <path d="M40 62 Q45 58 50 61 Q55 58 60 62" fill="#e0e0e0"/>
    {/* Boca sorrindo */}
    <path d="M44 65 Q50 70 56 65" stroke="#c0735a" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    {/* Orelhas */}
    <ellipse cx="28" cy="48" rx="4" ry="6" fill="#FDDBB4"/>
    <ellipse cx="72" cy="48" rx="4" ry="6" fill="#FDDBB4"/>
    {/* Pescoço */}
    <rect x="44" y="68" width="12" height="10" fill="#FDDBB4"/>
    {/* Camisa/gravata */}
    <path d="M40 76 Q50 80 60 76 L65 95 Q50 98 35 95 Z" fill="white" stroke="#ddd" strokeWidth="0.5"/>
    <path d="M47 78 L50 92 L53 78 Q50 76 47 78Z" fill="#c0392b"/>
    {/* Jaleco */}
    <path d="M28 78 Q36 74 40 76 L38 130 Q28 132 22 128 Z" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.8"/>
    <path d="M72 78 Q64 74 60 76 L62 130 Q72 132 78 128 Z" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.8"/>
    {/* Corpo/camisa por baixo */}
    <path d="M40 76 L38 130 Q50 133 62 130 L60 76 Q50 80 40 76Z" fill="white" stroke="#eee" strokeWidth="0.5"/>
    {/* Bolso jaleco */}
    <rect x="30" y="92" width="10" height="8" rx="1" fill="white" stroke="#ddd" strokeWidth="0.8"/>
    {/* Braço esquerdo levantado */}
    <path d="M28 82 Q18 78 14 68 Q12 62 18 60" stroke="#f5f5f5" strokeWidth="12" strokeLinecap="round" fill="none"/>
    <path d="M28 82 Q18 78 14 68 Q12 62 18 60" stroke="#ddd" strokeWidth="12.5" strokeLinecap="round" fill="none" opacity="0.3"/>
    {/* Mão esquerda apontando */}
    <ellipse cx="19" cy="58" rx="5" ry="6" fill="#FDDBB4"/>
    <rect x="17" y="48" width="4" height="12" rx="2" fill="#FDDBB4"/>
    {/* Braço direito */}
    <path d="M72 82 Q80 86 82 96" stroke="#f5f5f5" strokeWidth="11" strokeLinecap="round" fill="none"/>
    <path d="M72 82 Q80 86 82 96" stroke="#ddd" strokeWidth="11.5" strokeLinecap="round" fill="none" opacity="0.3"/>
    {/* Mão direita */}
    <ellipse cx="83" cy="98" rx="5" ry="5" fill="#FDDBB4"/>
    {/* Calça */}
    <path d="M38 130 Q44 132 50 131 Q56 132 62 130 L64 148 Q57 150 50 149 Q43 150 36 148 Z" fill="#555"/>
    {/* Pernas */}
    <rect x="36" y="140" width="12" height="10" rx="2" fill="#555"/>
    <rect x="52" y="140" width="12" height="10" rx="2" fill="#555"/>
    {/* Sapatos */}
    <ellipse cx="42" cy="150" rx="8" ry="4" fill="#333"/>
    <ellipse cx="58" cy="150" rx="8" ry="4" fill="#333"/>
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
            <span className="text-[10px] font-bold text-[#1a3150] uppercase tracking-wider">Prof. Einstein</span>
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
        <EinsteinSVG />
      </div>
    </div>
  );
}