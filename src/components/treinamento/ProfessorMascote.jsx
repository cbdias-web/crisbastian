import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';

const EINSTEIN_URL = 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/367989976_image.png';
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
        <img
          src={EINSTEIN_URL}
          alt="Prof. Einstein"
          style={{
            width: 120,
            height: 'auto',
            display: 'block',
            // Remove fundo branco sem afetar o personagem
            mixBlendMode: 'multiply',
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))',
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}