import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';

// Frases por contexto
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

// SVG boneco professor corpo inteiro
function ProfessorSVG({ animating }) {
  return (
    <svg
      width="90"
      height="160"
      viewBox="0 0 90 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={animating ? 'animate-bounce' : ''}
      style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}
    >
      {/* Chapéu de formatura */}
      <rect x="22" y="8" width="46" height="7" rx="3" fill="#0f1e35" />
      <polygon points="45,2 25,8 65,8" fill="#1a3150" />
      <line x1="65" y1="8" x2="72" y2="18" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="72" cy="19" r="3" fill="#D4AF37" />

      {/* Cabeça */}
      <circle cx="45" cy="32" r="16" fill="#FDDBB4" />
      {/* Olhos */}
      <circle cx="39" cy="30" r="2.5" fill="#1a1a1a" />
      <circle cx="51" cy="30" r="2.5" fill="#1a1a1a" />
      {/* Brilho olho */}
      <circle cx="40" cy="29" r="0.9" fill="white" />
      <circle cx="52" cy="29" r="0.9" fill="white" />
      {/* Sobrancelhas */}
      <path d="M36 26 Q39 24.5 42 26" stroke="#7a5230" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M48 26 Q51 24.5 54 26" stroke="#7a5230" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {/* Sorriso */}
      <path d="M38 36 Q45 41 52 36" stroke="#c0704a" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* Bochecha */}
      <circle cx="36" cy="35" r="3.5" fill="#f4a57a" opacity="0.4" />
      <circle cx="54" cy="35" r="3.5" fill="#f4a57a" opacity="0.4" />
      {/* Óculos */}
      <rect x="34" y="27.5" width="10" height="7" rx="3" stroke="#4a3728" strokeWidth="1.4" fill="none" />
      <rect x="46" y="27.5" width="10" height="7" rx="3" stroke="#4a3728" strokeWidth="1.4" fill="none" />
      <line x1="44" y1="31" x2="46" y2="31" stroke="#4a3728" strokeWidth="1.2" />
      <line x1="34" y1="31" x2="31" y2="30" stroke="#4a3728" strokeWidth="1.2" />
      <line x1="56" y1="31" x2="59" y2="30" stroke="#4a3728" strokeWidth="1.2" />

      {/* Pescoço */}
      <rect x="41" y="47" width="8" height="8" rx="3" fill="#FDDBB4" />

      {/* Jaleco */}
      <path d="M18 80 Q20 55 30 52 L45 56 L60 52 Q70 55 72 80 L72 130 L18 130 Z" fill="white" />
      {/* Gola jaleco */}
      <path d="M30 52 L45 65 L60 52" stroke="#e0e0e0" strokeWidth="1.5" fill="none" />
      {/* Bolso jaleco */}
      <rect x="24" y="78" width="13" height="10" rx="2" stroke="#e0e0e0" strokeWidth="1" fill="white" />
      <line x1="27" y1="80" x2="27" y2="86" stroke="#1a3150" strokeWidth="1" />
      <line x1="30" y1="80" x2="30" y2="86" stroke="#1a3150" strokeWidth="1" />
      <line x1="33" y1="80" x2="33" y2="86" stroke="#1a3150" strokeWidth="1" />
      {/* Gravata */}
      <polygon points="42,56 48,56 46,78 44,78" fill="#1a3150" />
      <polygon points="44,78 46,78 45,84" fill="#0f1e35" />

      {/* Braço esquerdo — levantado (apontando) */}
      <path d="M18 70 Q6 60 10 45" stroke="white" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M18 70 Q6 60 10 45" stroke="#e8e8e8" strokeWidth="9" strokeLinecap="round" fill="none" />
      {/* Mão esquerda */}
      <circle cx="10" cy="43" r="7" fill="#FDDBB4" />
      {/* Dedinhos apontando */}
      <path d="M8 37 Q7 32 10 31" stroke="#FDDBB4" strokeWidth="4" strokeLinecap="round" />
      <path d="M10 36 Q10 31 13 30" stroke="#FDDBB4" strokeWidth="4" strokeLinecap="round" />

      {/* Braço direito — ao lado */}
      <path d="M72 70 Q84 75 82 90" stroke="white" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M72 70 Q84 75 82 90" stroke="#e8e8e8" strokeWidth="9" strokeLinecap="round" fill="none" />
      {/* Mão direita */}
      <circle cx="82" cy="92" r="7" fill="#FDDBB4" />

      {/* Calça */}
      <path d="M18 130 L22 155 L38 155 L45 135 L52 155 L68 155 L72 130 Z" fill="#1a3150" />
      {/* Sapatos */}
      <ellipse cx="30" cy="156" rx="10" ry="5" fill="#0f1e35" />
      <ellipse cx="60" cy="156" rx="10" ry="5" fill="#0f1e35" />
    </svg>
  );
}

export default function ProfessorMascote({ contexto = 'dashboard', progresso = 0, nomeModulo = '', userName = '' }) {
  const [visivel, setVisivel] = useState(false);
  const [dispensado, setDispensado] = useState(false);
  const [fraseIdx, setFraseIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [mostrarBalao, setMostrarBalao] = useState(true);
  const timerRef = useRef(null);

  const frases = FRASES[contexto] || FRASES.dashboard;

  useEffect(() => {
    setDispensado(false);
    setFraseIdx(0);
    setMostrarBalao(true);
    const t = setTimeout(() => setVisivel(true), 600);
    return () => clearTimeout(t);
  }, [contexto]);

  // Troca de frase automática a cada 8s
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

  if (dispensado || !visivel) return null;

  const primeiroNome = userName ? userName.split(' ')[0] : '';
  const frase = frases[fraseIdx].replace('{nome}', primeiroNome);

  return (
    <div
      className="fixed bottom-0 left-6 z-40 flex flex-col items-center select-none pointer-events-none"
      style={{ maxWidth: 200 }}
    >
      {/* Balão de fala */}
      {mostrarBalao && (
        <div
          className="pointer-events-auto relative bg-white border border-blue-100 rounded-2xl rounded-bl-none shadow-xl px-4 py-3 mb-1"
          style={{ maxWidth: 220, minWidth: 160 }}
        >
          {/* Fechar balão */}
          <button
            onClick={() => setDispensado(true)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>

          {/* Cabeçalho */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 bg-[#D4AF37] rounded-full" />
            <span className="text-[10px] font-bold text-[#1a3150] uppercase tracking-wider">Prof. Einstein</span>
          </div>

          {/* Frase */}
          <p
            className={`text-sm text-gray-700 leading-relaxed transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}
          >
            {frase}
          </p>

          {/* Progresso (só no contexto modulo) */}
          {contexto === 'modulo' && progresso > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                <span>Progresso</span>
                <span className="font-semibold">{progresso}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-[#1a3150] to-blue-400 transition-all"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>
          )}

          {/* Próxima frase */}
          <button
            onClick={proximaFrase}
            className="mt-2 text-[10px] text-[#1a3150] hover:underline flex items-center gap-1 font-medium"
          >
            outra dica <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Boneco — clicável para reabrir balão */}
      <div
        className="pointer-events-auto cursor-pointer hover:scale-105 transition-transform"
        onClick={() => setMostrarBalao(v => !v)}
        title={mostrarBalao ? 'Fechar dica' : 'Ver dica'}
      >
        <ProfessorSVG animating={false} />
      </div>
    </div>
  );
}