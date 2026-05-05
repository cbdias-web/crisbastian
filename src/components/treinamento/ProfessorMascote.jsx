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

const EINSTEIN_3D_URL = 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/48c3902d4_generated_image.png';

// Imagem 3D Einstein
function ProfessorSVG() {
  return (
    <img
      src={EINSTEIN_3D_URL}
      alt="Prof. Einstein"
      style={{ width: 120, height: 'auto', filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.25))' }}
    />
  );
}

function _OldSVG() {
  return (
    <svg
      width="90"
      height="170"
      viewBox="0 0 90 170"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}
    >
      {/* ── CABELO BRANCO BAGUNÇADO ── */}
      {/* tufos laterais e topo */}
      <path d="M24 28 Q18 18 22 10 Q27 4 33 8 Q36 2 42 4 Q46 0 52 3 Q58 1 63 7 Q68 4 70 12 Q74 20 68 28" fill="#f0f0f0" />
      <path d="M22 26 Q14 22 16 14 Q19 8 25 11" fill="#e8e8e8" />
      <path d="M68 26 Q76 22 74 14 Q71 8 65 11" fill="#e8e8e8" />
      {/* tufos extras bagunçados */}
      <path d="M26 16 Q22 10 27 7" stroke="#d0d0d0" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M32 10 Q30 4 35 3" stroke="#d0d0d0" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M45 8 Q44 2 48 2" stroke="#d0d0d0" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M54 10 Q55 4 59 5" stroke="#d0d0d0" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M62 15 Q66 9 64 6" stroke="#d0d0d0" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* cabelo lateral esquerdo mais despenteado */}
      <path d="M22 30 Q14 32 16 40 Q18 46 23 44" fill="#e8e8e8" />
      <path d="M68 30 Q76 32 74 40 Q72 46 67 44" fill="#e8e8e8" />

      {/* ── CABEÇA ── */}
      <ellipse cx="45" cy="36" rx="21" ry="22" fill="#F5D5A8" />

      {/* ── SOBRANCELHAS ESPESSAS E EXPRESSIVAS ── */}
      <path d="M30 26 Q35 22 40 25" stroke="#888" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M50 25 Q55 22 60 26" stroke="#888" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* ── OLHOS ── */}
      <ellipse cx="36" cy="32" rx="4" ry="4.5" fill="white" />
      <ellipse cx="54" cy="32" rx="4" ry="4.5" fill="white" />
      <circle cx="37" cy="33" r="2.5" fill="#4a3010" />
      <circle cx="55" cy="33" r="2.5" fill="#4a3010" />
      <circle cx="37.8" cy="31.8" r="1" fill="black" />
      <circle cx="55.8" cy="31.8" r="1" fill="black" />
      {/* brilho */}
      <circle cx="38.5" cy="31.5" r="0.7" fill="white" />
      <circle cx="56.5" cy="31.5" r="0.7" fill="white" />

      {/* ── ÓCULOS REDONDOS CLÁSSICOS ── */}
      <circle cx="36" cy="32" r="5.5" stroke="#6b4c1e" strokeWidth="1.6" fill="none" />
      <circle cx="54" cy="32" r="5.5" stroke="#6b4c1e" strokeWidth="1.6" fill="none" />
      <line x1="41.5" y1="32" x2="48.5" y2="32" stroke="#6b4c1e" strokeWidth="1.4" />
      <line x1="30.5" y1="31" x2="27" y2="30" stroke="#6b4c1e" strokeWidth="1.4" />
      <line x1="59.5" y1="31" x2="63" y2="30" stroke="#6b4c1e" strokeWidth="1.4" />

      {/* ── NARIZ ── */}
      <path d="M44 34 Q42 40 44 43 Q46 44 48 43 Q50 40 46 34" stroke="#c9956a" strokeWidth="1.2" fill="#F0C090" />

      {/* ── BIGODE CARACTERÍSTICO ── */}
      <path d="M33 46 Q39 43 45 45 Q51 43 57 46" stroke="#bbb" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M34 47 Q39 50 45 48 Q51 50 56 47" stroke="#ccc" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* ── SORRISO ── */}
      <path d="M38 50 Q45 55 52 50" stroke="#b07050" strokeWidth="1.6" strokeLinecap="round" fill="none" />

      {/* ── BOCHECHA ── */}
      <circle cx="32" cy="42" r="4" fill="#f4a57a" opacity="0.3" />
      <circle cx="58" cy="42" r="4" fill="#f4a57a" opacity="0.3" />

      {/* ── PESCOÇO ── */}
      <rect x="40" y="57" width="10" height="8" rx="3" fill="#F5D5A8" />

      {/* ── JALECO BRANCO ── */}
      <path d="M16 90 Q18 63 28 60 L45 65 L62 60 Q72 63 74 90 L74 138 L16 138 Z" fill="white" />
      {/* sombra jaleco */}
      <path d="M16 90 Q18 63 28 60 L45 65 L62 60 Q72 63 74 90" stroke="#e0e0e0" strokeWidth="1" fill="none" />
      {/* Gola V */}
      <path d="M28 60 L45 76 L62 60" stroke="#d8d8d8" strokeWidth="1.5" fill="none" />
      {/* Bolso com caneta */}
      <rect x="22" y="85" width="14" height="11" rx="2" stroke="#ddd" strokeWidth="1" fill="#fafafa" />
      <line x1="26" y1="84" x2="26" y2="94" stroke="#1a3150" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="29" y1="84" x2="29" y2="94" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="84" x2="32" y2="94" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
      {/* Gravata */}
      <polygon points="42,65 48,65 46,86 44,86" fill="#1a3150" />
      <polygon points="44,86 46,86 45,92" fill="#0f1e35" />
      {/* listras gravata */}
      <line x1="42.5" y1="70" x2="47.5" y2="70" stroke="#2d5a9e" strokeWidth="1" />
      <line x1="43" y1="76" x2="47" y2="76" stroke="#2d5a9e" strokeWidth="1" />

      {/* ── BRAÇO ESQUERDO — LEVANTADO APONTANDO ── */}
      <path d="M16 78 Q4 66 8 50" stroke="white" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M16 78 Q4 66 8 50" stroke="#ececec" strokeWidth="10" strokeLinecap="round" fill="none" />
      {/* Mão */}
      <circle cx="8" cy="47" r="7.5" fill="#F5D5A8" />
      {/* Dedo indicador apontando para cima */}
      <path d="M7 40 Q6.5 33 9 31" stroke="#F5D5A8" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M9.5 39 Q9 33 11.5 31" stroke="#F5D5A8" strokeWidth="3.5" strokeLinecap="round" />

      {/* ── BRAÇO DIREITO — SEGURANDO QUADRO-NEGRO ── */}
      <path d="M74 78 Q84 80 84 96" stroke="white" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M74 78 Q84 80 84 96" stroke="#ececec" strokeWidth="10" strokeLinecap="round" fill="none" />
      {/* Mão */}
      <circle cx="84" cy="98" r="7.5" fill="#F5D5A8" />
      {/* Mini quadro-negro */}
      <rect x="76" y="102" width="20" height="14" rx="2" fill="#1a3150" />
      <text x="78" y="113" fontSize="7" fill="#D4AF37" fontFamily="serif" fontStyle="italic">E=mc²</text>
      <rect x="76" y="102" width="20" height="14" rx="2" stroke="#0f1e35" strokeWidth="1" fill="none" />

      {/* ── CALÇA ── */}
      <path d="M16 138 L20 162 L36 162 L45 142 L54 162 L70 162 L74 138 Z" fill="#2c3e50" />
      {/* Dobra calça */}
      <line x1="45" y1="138" x2="45" y2="150" stroke="#1a2a3a" strokeWidth="1" />

      {/* ── SAPATOS ── */}
      <ellipse cx="28" cy="163" rx="11" ry="5" fill="#1a1a1a" />
      <ellipse cx="62" cy="163" rx="11" ry="5" fill="#1a1a1a" />
      {/* brilho sapato */}
      <ellipse cx="25" cy="161" rx="4" ry="1.5" fill="#333" />
      <ellipse cx="59" cy="161" rx="4" ry="1.5" fill="#333" />
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