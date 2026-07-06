import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, X, Loader2, Plus, ChevronDown, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import JarvisAvatar from '@/components/chat/JarvisAvatar.jsx';

const INACTIVITY_MS = 30 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'jarvis_last_activity';



const TypingIndicator = () => (
  <div className="flex flex-col items-center gap-1">
    <div className="rounded-2xl px-4 py-3 shadow-sm" style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.15)' }}>
      <div className="flex gap-1 items-center h-4">
        {[0, 150, 300].map(d => (
          <div key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
    <JarvisAvatar size="sm" />
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
      className="flex items-center gap-2 mt-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-md" style={{ background: 'linear-gradient(135deg,#00D4AA,#0066cc)', color: '#fff' }}>
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
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-md" style={{ background: 'linear-gradient(135deg,#00D4AA,#0066cc)', color: '#fff' }}>
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
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-center'}`}>
      <div style={isUser ? { background: 'linear-gradient(135deg,#00D4AA,#0066cc)', color: '#fff' } : { background: '#161b22', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }} className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
        isUser
          ? 'rounded-br-sm'
          : 'rounded-bl-sm'
      }`}>
        {isUser ? (
          <p className="leading-relaxed">{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" style={{ color: '#e6edf3' }}
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer"
                  className="underline inline-flex items-center gap-0.5" style={{ color: '#00D4AA' }}>
                  {children}<Globe className="w-2.5 h-2.5 inline ml-0.5" />
                </a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2 rounded-lg text-xs" style={{ border: '1px solid rgba(0,212,170,0.15)' }}>
                  <table className="w-full border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead style={{ background: '#1c2333', color: '#00D4AA' }}>{children}</thead>,
              th: ({ children }) => <th className="px-2.5 py-1.5 text-left font-semibold whitespace-nowrap">{children}</th>,
              td: ({ children }) => <td className="px-2.5 py-1.5" style={{ borderTop: '1px solid rgba(0,212,170,0.1)' }}>{children}</td>,
              tr: ({ children }) => <tr>{children}</tr>,
              p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-3 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 ml-3 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              code: ({ inline, children }) => inline
                ? <code className="px-1 py-0.5 rounded text-xs" style={{ background: '#1c2333', color: '#00D4AA' }}>{children}</code>
                : <pre className="rounded p-2 overflow-x-auto text-xs my-1" style={{ background: '#0d1117', color: '#e6edf3' }}><code>{children}</code></pre>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        <PdfButton toolCalls={message.tool_calls} content={message.content} />
      </div>
      {!isUser && <JarvisAvatar size="sm" />}
    </div>
  );
};

const SUGGESTIONS = [
  'Quantas interações fiz este mês?',
  'Quais treinamentos estão disponíveis?',
  'Preciso de ajuda — abrir chamado de suporte',
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
const CONVERSATION_KEY = 'jarvis_conversation_id';

function loadPosition() {
  try {
    const saved = localStorage.getItem(POSITION_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { right: 24, bottom: 24 };
}

// Rotas conhecidas da plataforma
const ROTAS_PLATAFORMA = {
  'dashboard': '/',
  'vendas': '/Vendas',
  'vendedores': '/Vendedores',
  'clientes': '/Clientes',
  'indicadores': '/Espelhamentos',
  'espelhamentos': '/Espelhamentos',
  'pipeline': '/Pipeline',
  'contratos': '/Contratos',
  'comissões': '/Comissoes',
  'comissoes': '/Comissoes',
  'meus clientes': '/MeusClientes',
  'meusclientes': '/MeusClientes',
  'treinamento': '/Treinamento',
  'capacitação': '/Treinamento',
  'manual': '/Manual',
  'metas': '/Metas',
  'leads': '/Leads',
  'prospecção': '/Leads',
  'comunicados': '/Comunicados',
  'notificações': '/Notificacoes',
  'notificacoes': '/Notificacoes',
  'usuários': '/Usuarios',
  'usuarios': '/Usuarios',
  'notas fiscais': '/NotasFiscais',
  'notasfiscais': '/NotasFiscais',
  'relatório': '/RelatorioComissoes',
  'relatoriocomissoes': '/RelatorioComissoes',
};

function executarComandoMensagem(mensagem, navigate) {
  if (!mensagem || !navigate) return false;
  const texto = mensagem.toLowerCase();

  // Padrão explícito: [NAVEGAR:/Pagina] ou [IR:/Pagina]
  const cmdMatch = mensagem.match(/\[(NAVEGAR|IR|ABRIR|GOTO)\s*[:/]?\s*([^\]]+)\]/i);
  if (cmdMatch) {
    const destino = cmdMatch[2].trim();
    const rota = destino.startsWith('/') ? destino : `/${destino}`;
    navigate(rota);
    return true;
  }

  // Padrão: "acesse/abra/vá para/navegue para X"
  const navegacaoMatch = texto.match(/(?:acesse|abra|vá para|va para|navegue para|abrir|ir para)\s+(?:a\s+)?(?:página\s+de\s+|aba\s+de\s+|módulo\s+de\s+)?(.+?)(?:\.|!|$)/i);
  if (navegacaoMatch) {
    const destino = navegacaoMatch[1].trim().toLowerCase().replace(/^(a|o|as|os)\s+/, '');
    for (const [chave, rota] of Object.entries(ROTAS_PLATAFORMA)) {
      if (destino.includes(chave)) {
        navigate(rota);
        return true;
      }
    }
  }

  return false;
}

export default function AssistenteFloating() {
  const navigate = useNavigate();
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
  // unreadChatCount removido — badge do chat interno fica só no menu lateral
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

  // Verifica mensagens pendentes e não lidas do chat ao carregar e periodicamente
  useEffect(() => {
    if (!userLoaded) return;
    const poll = async () => {
      await checkMensagensPendentes();
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [userLoaded]);

  // checkUnreadChat removido — badge do chat interno fica só no menu lateral

  // Re-verifica ao abrir — apenas carrega as pendentes, sem marcar automaticamente
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
      // Executa comandos automaticamente nas novas mensagens
      pendentes.forEach(msg => {
        executarComandoMensagem(msg.mensagem, navigate);
      });
      setMensagensPendentes(pendentes);
      return { user, pendentes };
    } catch (e) {}
    return null;
  };

  const marcarMensagensComoLidas = async (msgs, nomeUsuario) => {
    if (!msgs || msgs.length === 0) return;
    // Limpa o estado local IMEDIATAMENTE para evitar re-exibição
    setMensagensPendentes([]);
    const agora = new Date().toISOString();
    const nome = nomeUsuario || userName || 'O destinatário';
    for (const msg of msgs) {
      try {
        await base44.entities.JarvisMensagem.update(msg.id, { lida: true, lida_em: agora });
        // Enviar confirmação de leitura ao remetente
        if (msg.remetente_email) {
          await base44.integrations.Core.SendEmail({
            to: msg.remetente_email,
            subject: `✅ Mensagem lida por ${nome}`,
            body: `<p>Olá, <strong>${msg.remetente_nome || 'Admin'}</strong>!</p><p>Sua mensagem enviada pelo Jarvis foi lida por <strong>${nome}</strong> em ${new Date(agora).toLocaleString('pt-BR')}.</p><blockquote style="border-left:3px solid #1a3150;padding-left:12px;color:#555;">${msg.mensagem}</blockquote><p style="color:#888;font-size:12px;">— Jarvis · Villela Exchange</p>`
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
    localStorage.setItem(CONVERSATION_KEY, conv.id);
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
      // Tenta restaurar conversa existente do localStorage
      const savedId = localStorage.getItem(CONVERSATION_KEY);
      if (savedId && !isInactive()) {
        try {
          const existingConv = await base44.agents.getConversation(savedId);
          if (existingConv) {
            if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
            setConversation(existingConv);
            setMessages(existingConv.messages || []);
            setIsFirstMessage((existingConv.messages || []).length === 0);
            setPdfDownloaded(false);
            unsubscribeRef.current = base44.agents.subscribeToConversation(existingConv.id, (data) => {
              setMessages(data.messages || []);
            });
            setInitialized(true);
            return;
          }
        } catch (e) {
          // Conversa não encontrada, cria nova
          localStorage.removeItem(CONVERSATION_KEY);
        }
      }
      await startFreshConversation();
      setInitialized(true);
    } catch (e) {}
  };

  const newChat = async () => {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(CONVERSATION_KEY);
    await startFreshConversation();
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
            <div className="text-xs font-medium px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap" style={{ background: '#1c2333', color: '#e6edf3', border: '1px solid rgba(0,212,170,0.15)' }}>
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
                <JarvisAvatar size="lg" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-20 shadow-lg">
                <span className="text-white text-[10px] font-bold">{mensagensPendentes.length}</span>
              </span>
            </div>
          ) : (
            <JarvisAvatar size="lg" pulse={!open} />
          )}
          {open && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center z-20" style={{ background: '#1c2333' }}>
              <ChevronDown className="w-3 h-3 text-white" />
            </span>
          )}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div style={{ ...chatStyle, width: '360px', maxWidth: 'calc(100vw - 24px)', height: '520px', background: '#0d1117', border: '1px solid rgba(0,212,170,0.18)' }} className="rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 60%, #16213e 100%)', borderBottom: '1px solid rgba(0,212,170,0.15)' }}>
            <JarvisAvatar size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">Jarvis</p>
              <p className="text-[10px] flex items-center gap-1" style={{ color: 'rgba(0,212,170,0.7)' }}>
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
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: '#0d1117' }}>
            {/* Mensagens pendentes do admin */}
            {mensagensPendentes.length > 0 && (
              <div className="space-y-2">
                {mensagensPendentes.map((msg) => {
                  const temComando = /\[(NAVEGAR|IR|ABRIR|GOTO)[:/]/i.test(msg.mensagem) ||
                    /(?:acesse|abra|vá para|navegue para|ir para)\s+/i.test(msg.mensagem);
                  return (
                    <div key={msg.id} className="rounded-xl p-3" style={{ background: 'rgba(0,102,204,0.1)', border: '1px solid rgba(0,102,204,0.3)' }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: '#5b9bd5' }}>📢 Mensagem de {msg.remetente_nome || 'Administrador'}</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#e6edf3' }}>{msg.mensagem}</p>
                      {temComando && (
                        <button
                          onClick={() => executarComandoMensagem(msg.mensagem, navigate)}
                          className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-white px-2.5 py-1 rounded-lg transition" style={{ background: 'linear-gradient(135deg,#00D4AA,#0066cc)' }}
                        >
                          ▶ Executar comando
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => { marcarMensagensComoLidas(mensagensPendentes); setMensagensPendentes([]); }}
                  className="w-full text-xs py-1 underline" style={{ color: '#00D4AA' }}
                >Marcar como lida</button>
              </div>
            )}

            {messages.length === 0 && !sending && mensagensPendentes.length === 0 && (
              <div className="flex flex-col items-center text-center pt-4 pb-2">
                <p className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Olá! Sou o Jarvis 👋</p>
                <p className="text-xs mt-1 mb-4" style={{ color: 'rgba(230,237,243,0.55)' }}>Acesso a treinamentos, produtos, clientes e muito mais — além da web.</p>
                <div className="flex flex-col gap-1.5 w-full">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left text-xs px-3 py-2 rounded-xl transition" style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.15)', color: 'rgba(230,237,243,0.75)' }}>
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
              <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '1px solid rgba(0,212,170,0.12)' }}>
                <p className="text-xs font-medium px-1 leading-relaxed" style={{ color: 'rgba(230,237,243,0.55)' }}>
                  {userName ? `${userName.split(' ')[0]}, precisa de mais alguma informação sobre o assunto que estamos tratando?` : 'Precisa de mais alguma informação sobre o assunto que estamos tratando?'}
                </p>
                <p className="text-[10px] px-1 mb-1" style={{ color: 'rgba(230,237,243,0.4)' }}>Ou quer explorar outro assunto?</p>
                {postSuggestions.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="w-full text-left text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl hover:border-[#1a3150] hover:bg-blue-50 transition text-gray-600">
                    {s}
                  </button>
                ))}
                <button onClick={newChat}
                  className="w-full text-center text-[11px] py-1.5 transition" style={{ color: 'rgba(230,237,243,0.4)' }}>
                  ou encerrar esta conversa e começar uma nova
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(0,212,170,0.15)', background: '#0d1117' }}>
            <div className="flex items-end gap-2 rounded-xl px-3 py-2 transition" style={{ background: '#1c2333', border: '1px solid rgba(0,212,170,0.2)' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Pergunte qualquer coisa..."
                rows={1}
                className="flex-1 text-sm bg-transparent resize-none focus:outline-none max-h-24" style={{ color: '#e6edf3' }}
                style={{ minHeight: '22px' }}
              />
              <button onClick={() => send()} disabled={!input.trim() || sending}
                className="p-1.5 text-white rounded-lg disabled:opacity-40 transition flex-shrink-0" style={{ background: 'linear-gradient(135deg,#00D4AA,#0066cc)' }}>
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}