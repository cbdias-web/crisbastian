import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, Star } from 'lucide-react';

const POS_KEY = 'einstein_coach_pos_v1';
function loadPos() {
  try { const s = localStorage.getItem(POS_KEY); if (s) return JSON.parse(s); } catch {}
  return { right: 24, bottom: 96, left: null, top: null };
}

const EINSTEIN_IMG = 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/8c19256a8_generated_image.png';

const EinsteinAvatar = ({ bounce }) => (
  <div
    className={`relative ${bounce ? 'animate-bounce' : ''}`}
    style={{ width: 72, height: 72 }}
  >
    <img
      src={EINSTEIN_IMG}
      alt="Einstein"
      className="w-full h-full rounded-full object-cover border-4 border-amber-200 shadow-xl"
      style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.22))' }}
    />
    {/* Badge online */}
    <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
  </div>
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
  const [pos, setPos] = useState(loadPos);
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const hasDragged = useRef(false);

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

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    hasDragged.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top };

    const onMove = (ev) => {
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true;
      if (!hasDragged.current) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const newLeft = Math.max(0, Math.min(window.innerWidth - w, dragRef.current.origLeft + dx));
      const newTop = Math.max(0, Math.min(window.innerHeight - h, dragRef.current.origTop + dy));
      // Mover diretamente via style para não causar re-render durante o drag
      el.style.left = newLeft + 'px';
      el.style.top = newTop + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      dragRef.current.lastLeft = newLeft;
      dragRef.current.lastTop = newTop;
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (hasDragged.current && dragRef.current.lastLeft != null) {
        const newPos = { left: dragRef.current.lastLeft, top: dragRef.current.lastTop, bottom: null, right: null };
        setPos(newPos);
        localStorage.setItem(POS_KEY, JSON.stringify(newPos));
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (dismissed || !visible) return null;

  const containerStyle = {
    position: 'fixed',
    zIndex: 40,
    left: pos.left ?? 'auto',
    right: pos.right ?? 'auto',
    top: pos.top != null ? pos.top : 'auto',
    bottom: pos.top != null ? 'auto' : (pos.bottom ?? 96),
  };

  return (
    <div ref={containerRef} style={{ ...containerStyle, maxWidth: '300px' }}
      className="flex flex-col items-end gap-1 select-none cursor-grab active:cursor-grabbing"
      onMouseDown={onMouseDown}>

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