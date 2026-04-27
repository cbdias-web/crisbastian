import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, X, Loader2, Plus, ChevronDown, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const INACTIVITY_MS = 30 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'jarvis_last_activity';

const Avatar = ({ size = 'md', pulse = false }) => {
  const dim = size === 'lg' ? 56 : size === 'sm' ? 32 : 40;
  const s = size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  return (
    <div className={`relative ${s} flex-shrink-0`}>
      {pulse && (
        <span className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
      )}
      <svg width={dim} height={dim} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-lg">
        <ellipse cx="7" cy="30" rx="6" ry="8" fill="#e8e8e8" />
        <ellipse cx="49" cy="30" rx="6" ry="8" fill="#e8e8e8" />
        <rect x="10" y="10" width="36" height="36" rx="14" fill="white" />
        <rect x="10" y="10" width="36" height="36" rx="14" fill="url(#grad)" opacity="0.15" />
        <rect x="15" y="16" width="26" height="20" rx="6" fill="#1a1a1a" />
        <rect x="19" y="21" width="7" height="7" rx="3.5" fill="white" />
        <path d="M31 24.5 Q34 21.5 37 24.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M20 31 Q28 36 36 31" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <ellipse cx="7" cy="30" rx="3" ry="5" fill="#d0d0d0" />
        <ellipse cx="49" cy="30" rx="3" ry="5" fill="#d0d0d0" />
        <polygon points="18,12 14,4 22,10" fill="white" />
        <polygon points="38,12 42,4 34,10" fill="white" />
        <polygon points="18,11 15.5,6 21,10" fill="#e0e0e0" />
        <polygon points="38,11 40.5,6 35,10" fill="#e0e0e0" />
        <defs>
          <linearGradient id="grad" x1="10" y1="10" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a0c4ff" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full z-20" />
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex gap-3 items-end">
    <div className="flex-shrink-0 mb-1"><Avatar size="sm" /></div>
    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
      <div className="flex gap-1 items-center h-4">
        {[0, 150, 300].map(d => (
          <div key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

const PdfButton = ({ toolCalls, content }) => {
  let res = null;
  if (toolCalls?.length) {
    for (const tc of toolCalls) {
      if (!tc.results) continue;
      try {
        const parsed = typeof tc.results === 'string' ? JSON.parse(tc.results) : tc.results;
        if (parsed?.pdf_base64) { res = parsed; break; }
        if (parsed?.data?.pdf_base64) { res = parsed.data; break; }
      } catch {}
    }
  }
  if (!res && content) {
    try {
      const match = content.match(/"pdf_base64"\s*:\s*"([A-Za-z0-9+/=]+)"/);
      const fnMatch = content.match(/"filename"\s*:\s*"([^"]+)"/);
      if (match) res = { pdf_base64: match[1], filename: fnMatch?.[1] || 'relatorio.pdf' };
    } catch {}
  }
  if (!res?.pdf_base64) return null;
  const handleDownload = () => {
    const binary = atob(res.pdf_base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.filename || 'relatorio.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={handleDownload}
      className="flex items-center gap-2 mt-2 px-4 py-2.5 bg-[#0f1e35] text-white rounded-xl text-xs font-semibold hover:bg-[#1a3150] transition shadow-md">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
      Baixar Relatório PDF
    </button>
  );
};

const extractPdf = (messages) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.tool_calls?.length) {
      for (const tc of msg.tool_calls) {
        if (!tc.results) continue;
        try {
          const r = typeof tc.results === 'string' ? JSON.parse(tc.results) : tc.results;
          if (r?.pdf_base64) return r;
          if (r?.data?.pdf_base64) return r.data;
        } catch {}
      }
    }
    if (msg.role === 'tool' && msg.content) {
      try {
        const r = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
        if (r?.pdf_base64) return r;
      } catch {}
    }
  }
  return null;
};

const GlobalPdfButton = ({ messages, onDownloaded }) => {
  const res = extractPdf(messages);
  if (!res?.pdf_base64) return null;
  const handleDownload = () => {
    const binary = atob(res.pdf_base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.filename || 'relatorio.pdf';
    a.click();
    URL.revokeObjectURL(url);
    onDownloaded();
  };
  return (
    <div className="flex justify-start pl-10">
      <button onClick={handleDownload}
        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition shadow-md">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        Baixar Relatorio PDF
      </button>
    </div>
  );
};

const Message = ({ message }) => {
  const isUser = message.role === 'user';
  if (!message.content && !message.tool_calls?.length) return null;
  return (
    <div className={`flex gap-2 items-end ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <div className="flex-shrink-0 mb-1"><Avatar size="sm" /></div>}
      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
        isUser
          ? 'bg-[#0f1e35] text-white rounded-br-sm'
          : 'bg-white border border-slate-200 text-gray-800 rounded-bl-sm'
      }`}>
        {isUser ? (
          <p className="leading-relaxed">{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800 inline-flex items-center gap-0.5">
                  {children}<Globe className="w-2.5 h-2.5 inline ml-0.5" />
                </a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2 rounded-lg border border-slate-200 text-xs">
                  <table className="w-full border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-[#0f1e35] text-white">{children}</thead>,
              th: ({ children }) => <th className="px-2.5 py-1.5 text-left font-semibold whitespace-nowrap">{children}</th>,
              td: ({ children }) => <td className="px-2.5 py-1.5 border-t border-slate-100">{children}</td>,
              tr: ({ children }) => <tr className="even:bg-slate-50">{children}</tr>,
              p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-3 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 ml-3 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              code: ({ inline, children }) => inline
                ? <code className="px-1 py-0.5 rounded bg-slate-100 text-xs">{children}</code>
                : <pre className="bg-slate-900 text-slate-100 rounded p-2 overflow-x-auto text-xs my-1"><code>{children}</code></pre>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        <PdfButton toolCalls={message.tool_calls} content={message.content} />
      </div>
    </div>
  );
};

const SUGGESTIONS = [
  'Quantas interações fiz este mês?',
  'Quais treinamentos estão disponíveis?',
  'Quais leads ainda não foram convertidos?',
  'Qual o volume de vendas deste mês?',
];

const POST_SUGGESTIONS = [
  'Ver ranking de vendedores do mês',
  'Quais leads não foram convertidos?',
  'Resumo das minhas comissões',
  'Treinamentos disponíveis',
  'Relatório de interações com clientes',
  'Metas do time este mês',
  'Clientes sem contato recente',
  'Agenda de prospecção de hoje',
];

function recordActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

function isInactive() {
  const last = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
  // Sem registro = nunca usou → tela limpa
  if (last === 0) return true;
  // Dia diferente → sempre tela limpa
  const lastDate = new Date(last).toDateString();
  const today = new Date().toDateString();
  if (lastDate !== today) return true;
  // Mesmo dia mas inativo por mais de 30 min
  return (Date.now() - last) > INACTIVITY_MS;
}

const POSITION_KEY = 'jarvis_position';

function loadPosition() {
  try {
    const saved = localStorage.getItem(POSITION_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { right: 24, bottom: 24 };
}

export default function AssistenteFloating() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(loadPosition);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 });
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [userName, setUserName] = useState('');
  const [userLoaded, setUserLoaded] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [mensagensPendentes, setMensagensPendentes] = useState([]);
  const [showPostSuggestions, setShowPostSuggestions] = useState(false);
  const [postSuggestions, setPostSuggestions] = useState([]);
  const inactivityTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUserName(u?.nome_tratamento || u?.full_name || u?.email || '');
      setUserLoaded(true);
    }).catch(() => setUserLoaded(true));
  }, []);

  // Verifica mensagens pendentes ao carregar e periodicamente
  useEffect(() => {
    if (userLoaded) {
      checkMensagensPendentes();
      const interval = setInterval(checkMensagensPendentes, 30000);
      return () => clearInterval(interval);
    }
  }, [userLoaded]);

  // Re-verifica ao abrir
  useEffect(() => {
    if (open && userName) {
      checkMensagensPendentes();
    }
  }, [open, userName]);

  const checkMensagensPendentes = async () => {
    try {
      const user = await base44.auth.me();
      if (!user?.email) return;
      const pendentes = await base44.entities.JarvisMensagem.filter({ destinatario_email: user.email, lida: false });
      setMensagensPendentes(pendentes);
    } catch (e) {}
  };

  const marcarMensagensComoLidas = async (msgs) => {
    const agora = new Date().toISOString();
    for (const msg of msgs) {
      try {
        await base44.entities.JarvisMensagem.update(msg.id, { lida: true, lida_em: agora });
        // Enviar confirmação de leitura ao remetente
        if (msg.remetente_email) {
          const destinatario = userName || 'O destinatário';
          await base44.integrations.Core.SendEmail({
            to: msg.remetente_email,
            subject: `✅ Mensagem lida por ${destinatario}`,
            body: `<p>Olá, <strong>${msg.remetente_nome || 'Admin'}</strong>!</p><p>Sua mensagem enviada pelo Jarvis foi lida por <strong>${destinatario}</strong> em ${new Date(agora).toLocaleString('pt-BR')}.</p><blockquote style="border-left:3px solid #1a3150;padding-left:12px;color:#555;">${msg.mensagem}</blockquote><p style="color:#888;font-size:12px;">— Jarvis · Villela Exchange</p>`
          });
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (open && userLoaded) {
      if (!initialized) {
        initConversation();
      } else if (isInactive()) {
        startFreshConversation();
      }
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open, userLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const startFreshConversation = async () => {
    if (inactivityTimerRef.current) { clearTimeout(inactivityTimerRef.current); inactivityTimerRef.current = null; }
    setShowPostSuggestions(false);
    if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
    const conv = await base44.agents.createConversation({
      agent_name: 'assistente_treinamentos',
      metadata: { name: 'Chat' }
    });
    setConversation(conv);
    setMessages([]);
    setIsFirstMessage(true);
    setPdfDownloaded(false);
    unsubscribeRef.current = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });
    return conv;
  };

  const initConversation = async () => {
    try {
      await startFreshConversation();
      setInitialized(true);
    } catch (e) {}
  };

  const newChat = async () => {
    await startFreshConversation();
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  };

  const isTyping = sending || (messages.length > 0 && messages[messages.length - 1]?.role !== 'user' && !messages[messages.length - 1]?.content);

  const INACTIVITY_SUGGESTIONS_MS = 5 * 60 * 1000; // 5 minutos

  const schedulePostSuggestions = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    setShowPostSuggestions(false);
    inactivityTimerRef.current = setTimeout(() => {
      const shuffled = [...POST_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 3);
      setPostSuggestions(shuffled);
      setShowPostSuggestions(true);
    }, INACTIVITY_SUGGESTIONS_MS);
  };

  // Agenda sugestões após cada resposta completa do assistente
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!isTyping && messages.length >= 2 && lastMsg?.role === 'assistant' && lastMsg?.content) {
      schedulePostSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isTyping]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);
    // Cancela timer de sugestões ao enviar nova mensagem
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    setShowPostSuggestions(false);
    let conv = conversation;
    if (!conv) {
      conv = await base44.agents.createConversation({ agent_name: 'assistente_treinamentos', metadata: { name: 'Chat' } });
      setConversation(conv);
    }
    const content = userName ? `[Usuário: ${userName}] ${msg}` : msg;
    setIsFirstMessage(false);
    recordActivity();
    await base44.agents.addMessage(conv, { role: 'user', content });
    setSending(false);
  };

  // Drag logic
  const btnContainerRef = useRef(null);
  const hasDragged = useRef(false);

  const startDrag = (clientX, clientY) => {
    const el = btnContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    hasDragged.current = false;
    dragRef.current = { dragging: true, startX: clientX, startY: clientY, origLeft: rect.left, origTop: rect.top };
  };

  const moveDrag = (clientX, clientY) => {
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true;
    if (!hasDragged.current) return;
    const newLeft = Math.max(0, Math.min(window.innerWidth - 64, dragRef.current.origLeft + dx));
    const newTop = Math.max(0, Math.min(window.innerHeight - 64, dragRef.current.origTop + dy));
    const newPos = { left: newLeft, top: newTop };
    setPos(newPos);
    localStorage.setItem(POSITION_KEY, JSON.stringify(newPos));
  };

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    startDrag(e.clientX, e.clientY);
    e.preventDefault();

    const onMove = (ev) => moveDrag(ev.clientX, ev.clientY);
    const onUp = () => {
      dragRef.current.dragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onTouchStart = (e) => {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
    // não chama preventDefault aqui para não bloquear o clique

    const onMove = (ev) => {
      const t = ev.touches[0];
      moveDrag(t.clientX, t.clientY);
      if (hasDragged.current) ev.preventDefault();
    };
    const onEnd = () => {
      dragRef.current.dragging = false;
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  const handleBtnClick = () => {
    if (hasDragged.current) return;
    setOpen(o => !o);
  };

  // Compute style: support both {right,bottom} default and {left,top} after drag
  const btnStyle = pos.left !== undefined
    ? { position: 'fixed', left: pos.left, top: pos.top, zIndex: 9999 }
    : { position: 'fixed', right: pos.right ?? 24, bottom: pos.bottom ?? 24, zIndex: 9999 };

  const chatStyle = pos.left !== undefined
    ? { position: 'fixed', left: Math.min(pos.left, window.innerWidth - 376), top: Math.max(0, pos.top - 540), zIndex: 9998 }
    : { position: 'fixed', right: (pos.right ?? 24), bottom: (pos.bottom ?? 24) + 88, zIndex: 9998 };

  return (
    <>
      {/* Floating button */}
      <div ref={btnContainerRef} style={btnStyle} className="flex flex-col items-end gap-2 select-none">
        {!open && (
          <div className="flex items-center gap-2" style={{ pointerEvents: 'none' }}>
            <div className="bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg border border-gray-100 whitespace-nowrap">
              Posso te ajudar? 👋
            </div>
          </div>
        )}
        <button
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onClick={handleBtnClick}
          className="group relative cursor-grab active:cursor-grabbing"
          title="Jarvis (arraste para mover)"
        >
          {mensagensPendentes.length > 0 && !open ? (
            <div className="relative w-14 h-14 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-red-500 opacity-40 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="relative z-10">
                <Avatar size="lg" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-20 shadow-lg">
                <span className="text-white text-[10px] font-bold">{mensagensPendentes.length}</span>
              </span>
            </div>
          ) : (
            <Avatar size="lg" pulse={!open} />
          )}
          {open && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center z-20">
              <ChevronDown className="w-3 h-3 text-white" />
            </span>
          )}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div style={{ ...chatStyle, width: '360px', maxWidth: 'calc(100vw - 24px)', height: '520px' }} className="bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-[#0f1e35] to-[#1a3150] px-4 py-3 flex items-center gap-3">
            <Avatar size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">Jarvis</p>
              <p className="text-blue-300 text-[10px] flex items-center gap-1">
                <Globe className="w-2.5 h-2.5" /> Acesso à plataforma + web
              </p>
            </div>
            <button onClick={newChat} title="Nova conversa" className="text-white/60 hover:text-white transition p-1">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
            {/* Mensagens pendentes do admin */}
            {mensagensPendentes.length > 0 && (
              <div className="space-y-2">
                {mensagensPendentes.map((msg) => (
                  <div key={msg.id} className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-blue-600 mb-1">📢 Mensagem de {msg.remetente_nome || 'Administrador'}</p>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.mensagem}</p>
                  </div>
                ))}
                <button
                  onClick={() => { marcarMensagensComoLidas(mensagensPendentes); setMensagensPendentes([]); }}
                  className="w-full text-xs text-blue-600 hover:text-blue-800 py-1 underline"
                >Marcar como lida</button>
              </div>
            )}

            {messages.length === 0 && !sending && mensagensPendentes.length === 0 && (
              <div className="flex flex-col items-center text-center pt-4 pb-2">
                <p className="text-sm font-semibold text-gray-800">Olá! Sou o Jarvis 👋</p>
                <p className="text-xs text-gray-500 mt-1 mb-4">Acesso a treinamentos, produtos, clientes e muito mais — além da web.</p>
                <div className="flex flex-col gap-1.5 w-full">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl hover:border-[#1a3150] hover:bg-blue-50 transition text-gray-600">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.length === 0 && !sending && mensagensPendentes.length > 0 && null}
            {messages.length > 0 && messages.map((msg, i) => {
              const display = { ...msg };
              if (msg.role === 'user' && msg.content?.includes('[Usuário:')) {
                display.content = msg.content.replace(/^\[Usuário:[^\]]*\]\s*/, '');
              }
              if (msg.role === 'user' && msg.content?.includes('[BROADCAST_ADMIN')) {
                return null;
              }
              return <Message key={i} message={display} />;
            })}
            {!pdfDownloaded && <GlobalPdfButton messages={messages} onDownloaded={() => setPdfDownloaded(true)} />}
            {isTyping && <TypingIndicator />}
            {/* Post-response suggestions: só aparecem após 5 min de inatividade */}
            {showPostSuggestions && !isTyping && (
              <div className="mt-3 border-t border-gray-100 pt-3 space-y-1.5">
                <p className="text-xs text-gray-500 font-medium px-1 leading-relaxed">
                  {userName ? `${userName.split(' ')[0]}, precisa de mais alguma informação sobre o assunto que estamos tratando?` : 'Precisa de mais alguma informação sobre o assunto que estamos tratando?'}
                </p>
                <p className="text-[10px] text-gray-400 px-1 mb-1">Ou quer explorar outro assunto?</p>
                {postSuggestions.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="w-full text-left text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl hover:border-[#1a3150] hover:bg-blue-50 transition text-gray-600">
                    {s}
                  </button>
                ))}
                <button onClick={newChat}
                  className="w-full text-center text-[11px] py-1.5 text-gray-400 hover:text-gray-600 transition">
                  ou encerrar esta conversa e começar uma nova
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 bg-white">
            <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-[#1a3150] transition">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Pergunte qualquer coisa..."
                rows={1}
                className="flex-1 text-sm bg-transparent resize-none focus:outline-none text-gray-800 placeholder-gray-400 max-h-24"
                style={{ minHeight: '22px' }}
              />
              <button onClick={() => send()} disabled={!input.trim() || sending}
                className="p-1.5 bg-[#0f1e35] text-white rounded-lg hover:bg-[#1a3150] disabled:opacity-40 transition flex-shrink-0">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}