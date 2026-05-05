import { useState, useEffect } from 'react';
import { X, ChevronRight, Star } from 'lucide-react';

// Avatar do Einstein: cabelo bagunçado, bigode, jaleco branco
const EinsteinAvatar = ({ bounce }) => (
  <svg
    width="64" height="72"
    viewBox="0 0 64 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={bounce ? 'animate-bounce' : ''}
    style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.18))' }}
  >
    {/* Corpo / jaleco */}
    <rect x="12" y="48" width="40" height="22" rx="8" fill="#f0f0f0" />
    <rect x="12" y="48" width="40" height="22" rx="8" fill="white" />
    {/* Gravata */}
    <polygon points="32,51 29,58 32,60 35,58" fill="#c0392b" />
    {/* Gola */}
    <path d="M20 48 L32 54 L44 48" stroke="#d0d0d0" strokeWidth="1.5" fill="none" />

    {/* Pescoço */}
    <rect x="27" y="42" width="10" height="8" rx="4" fill="#f5d5a0" />

    {/* Cabeça */}
    <ellipse cx="32" cy="30" rx="18" ry="20" fill="#f5d5a0" />

    {/* Cabelo bagunçado — branco */}
    <path d="M14 22 Q10 10 18 8 Q14 4 22 6 Q24 2 32 4 Q40 2 42 6 Q50 4 46 8 Q54 10 50 22" fill="white" stroke="#ddd" strokeWidth="0.5" />
    {/* Mechas extras */}
    <path d="M14 18 Q8 12 12 7" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <path d="M50 18 Q56 12 52 7" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <path d="M20 6 Q16 0 20 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M44 6 Q48 0 44 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" />

    {/* Sobrancelhas expressivas */}
    <path d="M20 22 Q24 19 28 22" stroke="#888" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M36 22 Q40 19 44 22" stroke="#888" strokeWidth="1.8" strokeLinecap="round" fill="none" />

    {/* Olhos */}
    <ellipse cx="25" cy="27" rx="3.5" ry="3.5" fill="white" />
    <ellipse cx="39" cy="27" rx="3.5" ry="3.5" fill="white" />
    <circle cx="25" cy="27" r="2" fill="#4a3728" />
    <circle cx="39" cy="27" r="2" fill="#4a3728" />
    <circle cx="25.8" cy="26.2" r="0.7" fill="white" />
    <circle cx="39.8" cy="26.2" r="0.7" fill="white" />

    {/* Nariz */}
    <path d="M31 30 Q30 34 29 35 Q32 36 35 35 Q34 34 33 30" fill="#e8b88a" />

    {/* Bigode branco famoso */}
    <path d="M22 38 Q27 41 32 39 Q37 41 42 38" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M24 37 Q32 42 40 37" stroke="#e0e0e0" strokeWidth="1.5" strokeLinecap="round" fill="none" />

    {/* Boca sorrindo */}
    <path d="M27 37 Q32 40 37 37" stroke="#c0956a" strokeWidth="1.5" strokeLinecap="round" fill="none" />

    {/* Orelhas */}
    <ellipse cx="14" cy="30" rx="3" ry="4.5" fill="#f5d5a0" />
    <ellipse cx="50" cy="30" rx="3" ry="4.5" fill="#f5d5a0" />

    {/* Ícone E=mc² na altura do jaleco */}
    <text x="22" y="64" fontSize="7" fill="#888" fontFamily="serif" fontStyle="italic" fontWeight="bold">E=mc²</text>
  </svg>
);

// Mensagens no estilo Einstein
const getMensagens = (aulaIdx, totalAulas, nomeAula, jaFeita, proximaAula) => {
  if (jaFeita && proximaAula) {
    return [
      `Wunderbar! 🎉 Você concluiu "${nomeAula}". Pronto para o próximo desafio?`,
      `A imaginação é mais importante que o conhecimento — e você está usando as duas!`,
    ];
  }
  if (jaFeita && !proximaAula) {
    return [
      `Extraordinário! 🏆 Você concluiu o módulo inteiro. A persistência é o caminho do gênio!`,
      `"A mente que se abre a uma nova ideia jamais volta ao seu tamanho original." Parabéns!`,
    ];
  }
  if (aulaIdx === 0) {
    return [
      `Guten Tag! Sou Einstein, seu tutor. 👋 Vamos explorar o conhecimento juntos?`,
      `"Aprender é a única coisa que a mente nunca se cansa." Bem-vindo à primeira aula!`,
    ];
  }
  const restantes = totalAulas - aulaIdx - 1;
  if (restantes === 0) {
    return [
      `Última aula! 🏁 "O sucesso é 1% inspiração e 99% transpiração." Você quase lá chegou!`,
    ];
  }
  if (restantes === 1) {
    return [
      `Quase lá! 💪 Só mais uma aula e o módulo será seu. Ich glaube an Sie!`,
    ];
  }
  const frases = [
    `"Nunca pare de questionar." Ainda ${restantes} aulas pela frente — cada uma vale ouro!`,
    `A curiosidade tem sua própria razão de existir. Continue avançando!`,
    `"Genialidade é 1% talento e 99% trabalho duro." Você está no caminho certo!`,
    `Dica do Einstein: tente explicar o que aprendeu com suas próprias palavras para fixar melhor.`,
    `"A lógica leva de A a B. A imaginação leva a qualquer lugar." Foco e criatividade!`,
  ];
  return [frases[aulaIdx % frases.length]];
};

export default function EinsteinCoach({ aulaIdx, totalAulas, nomeAula, concluida, proximaAula, onProxima }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [bounce, setBounce] = useState(true);
  const [msgIdx, setMsgIdx] = useState(0);
  const [animating, setAnimating] = useState(false);

  const mensagens = getMensagens(aulaIdx, totalAulas, nomeAula, concluida, proximaAula);
  const mensagem = mensagens[msgIdx % mensagens.length];

  useEffect(() => {
    setDismissed(false);
    setMsgIdx(0);
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, [aulaIdx, concluida]);

  useEffect(() => {
    const t = setTimeout(() => setBounce(false), 3000);
    return () => clearTimeout(t);
  }, [visible]);

  const handleNextMsg = () => {
    if (mensagens.length > 1) {
      setAnimating(true);
      setTimeout(() => {
        setMsgIdx(i => i + 1);
        setAnimating(false);
      }, 200);
    }
  };

  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-1 select-none"
      style={{ maxWidth: '300px' }}>

      {/* Balão de fala */}
      <div
        className={`relative bg-white border border-amber-100 rounded-2xl rounded-br-none shadow-xl px-4 py-3 transition-all duration-300 ${animating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
        style={{ maxWidth: '280px' }}
      >
        {/* Fechar */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-2 -right-2 w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>

        {/* Cabeçalho Einstein */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-2 h-2 bg-amber-400 rounded-full" />
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Einstein</span>
          <span className="text-[10px] text-gray-400">· Coach de aprendizado</span>
        </div>

        {/* Mensagem */}
        <p className="text-sm text-gray-700 leading-relaxed italic">{mensagem}</p>

        {/* Ações */}
        <div className="flex items-center justify-between mt-3 gap-2">
          {mensagens.length > 1 && (
            <button
              onClick={handleNextMsg}
              className="text-[11px] text-amber-600 hover:text-amber-800 underline transition"
            >
              outra citação
            </button>
          )}
          <div className="flex-1" />
          {concluida && proximaAula ? (
            <button
              onClick={onProxima}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition shadow-sm"
            >
              Próxima aula <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : !concluida ? (
            <div className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              Conclua para avançar
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              🏆 Módulo completo!
            </div>
          )}
        </div>
      </div>

      {/* Avatar Einstein */}
      <div className="self-end cursor-pointer" onClick={() => setDismissed(true)} title="Fechar">
        <EinsteinAvatar bounce={bounce} />
      </div>
    </div>
  );
}