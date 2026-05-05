import { useState, useEffect } from 'react';
import { X, ChevronRight, Star } from 'lucide-react';

const JarvisAvatar = ({ bounce }) => (
  <svg
    width="56" height="56"
    viewBox="0 0 56 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xl ${bounce ? 'animate-bounce' : ''}`}
    style={{ filter: 'drop-shadow(0 4px 12px rgba(26,49,80,0.35))' }}
  >
    <ellipse cx="7" cy="30" rx="6" ry="8" fill="#e8e8e8" />
    <ellipse cx="49" cy="30" rx="6" ry="8" fill="#e8e8e8" />
    <rect x="10" y="10" width="36" height="36" rx="14" fill="white" />
    <rect x="10" y="10" width="36" height="36" rx="14" fill="url(#gradCoach)" opacity="0.18" />
    <rect x="15" y="16" width="26" height="20" rx="6" fill="#1a1a1a" />
    <rect x="19" y="21" width="7" height="7" rx="3.5" fill="#60a5fa" />
    <rect x="30" y="21" width="7" height="7" rx="3.5" fill="#60a5fa" />
    <rect x="21" y="23" width="3" height="3" rx="1.5" fill="white" opacity="0.8" />
    <rect x="32" y="23" width="3" height="3" rx="1.5" fill="white" opacity="0.8" />
    <path d="M20 32 Q28 37 36 32" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <ellipse cx="7" cy="30" rx="3" ry="5" fill="#d0d0d0" />
    <ellipse cx="49" cy="30" rx="3" ry="5" fill="#d0d0d0" />
    <polygon points="18,12 14,4 22,10" fill="white" />
    <polygon points="38,12 42,4 34,10" fill="white" />
    <polygon points="18,11 15.5,6 21,10" fill="#e0e0e0" />
    <polygon points="38,11 40.5,6 35,10" fill="#e0e0e0" />
    <defs>
      <linearGradient id="gradCoach" x1="10" y1="10" x2="46" y2="46" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
    </defs>
  </svg>
);

// Mensagens contextuais baseadas no progresso
const getMensagens = (aulaIdx, totalAulas, nomeAula, jaFeita, proximaAula) => {
  if (jaFeita && proximaAula) {
    return [
      `Ótimo trabalho! 🎉 Você concluiu "${nomeAula}". Pronto para o próximo tópico?`,
      `Excelente! Mais uma aula no seu histórico. Vamos continuar avançando!`,
    ];
  }
  if (jaFeita && !proximaAula) {
    return [
      `Parabéns! 🏆 Você concluiu o módulo inteiro! Incrível dedicação!`,
      `Missão cumprida! Você chegou ao fim deste módulo. Que orgulho!`,
    ];
  }
  if (aulaIdx === 0) {
    return [
      `Olá! Sou o Jarvis 👋 Bem-vindo à primeira aula deste módulo. Vamos juntos!`,
      `Que bom ter você aqui! Esta é a aula de abertura. Foco e boa leitura!`,
    ];
  }
  const restantes = totalAulas - aulaIdx - 1;
  if (restantes === 0) {
    return [
      `Última aula do módulo! 🏁 Você chegou longe. Conclua e colha os frutos!`,
    ];
  }
  if (restantes === 1) {
    return [
      `Quase lá! 💪 Só mais uma aula após esta e o módulo estará completo!`,
    ];
  }
  const frases = [
    `Você está indo muito bem! Ainda ${restantes} aulas pela frente neste módulo.`,
    `Continue assim! Cada aula concluída é um passo na sua evolução.`,
    `Foco! 🎯 Ao concluir este módulo, seu conhecimento vai escalar.`,
    `Dica do Jarvis: anote os pontos principais para fixar melhor o conteúdo!`,
  ];
  return [frases[aulaIdx % frases.length]];
};

export default function JarvisCoach({ aulaIdx, totalAulas, nomeAula, concluida, proximaAula, onProxima }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [bounce, setBounce] = useState(true);
  const [msgIdx, setMsgIdx] = useState(0);
  const [animating, setAnimating] = useState(false);

  const mensagens = getMensagens(aulaIdx, totalAulas, nomeAula, concluida, proximaAula);
  const mensagem = mensagens[msgIdx % mensagens.length];

  // Aparece depois de 2s ao entrar na aula
  useEffect(() => {
    setDismissed(false);
    setMsgIdx(0);
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, [aulaIdx, concluida]);

  // Para o bounce após 3s
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
    <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-2 select-none"
      style={{ maxWidth: '300px' }}>

      {/* Balão de fala */}
      <div
        className={`relative bg-white border border-blue-100 rounded-2xl rounded-br-none shadow-xl px-4 py-3 transition-all duration-300 ${animating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
        style={{ maxWidth: '280px' }}
      >
        {/* Fechar */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-2 -right-2 w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>

        {/* Cabeçalho Jarvis */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full" />
          <span className="text-[10px] font-bold text-[#1a3150] uppercase tracking-wider">Jarvis</span>
          <span className="text-[10px] text-gray-400">· Coach de aprendizado</span>
        </div>

        {/* Mensagem */}
        <p className="text-sm text-gray-700 leading-relaxed">{mensagem}</p>

        {/* Ações */}
        <div className="flex items-center justify-between mt-3 gap-2">
          {mensagens.length > 1 && (
            <button
              onClick={handleNextMsg}
              className="text-[11px] text-blue-500 hover:text-blue-700 underline transition"
            >
              outra dica
            </button>
          )}
          <div className="flex-1" />
          {concluida && proximaAula ? (
            <button
              onClick={onProxima}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a3150] text-white text-xs font-semibold rounded-lg hover:bg-[#0f1e35] transition shadow-sm"
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

      {/* Avatar Jarvis */}
      <div className="self-end cursor-pointer" onClick={() => setDismissed(true)} title="Fechar">
        <JarvisAvatar bounce={bounce} />
      </div>
    </div>
  );
}