import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, X, Loader2, Plus, ChevronDown, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
    <Avatar size="sm" />
    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
      <div className="flex gap-1 items-center h-4">
        {[0, 150, 300].map(d => (
          <div key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

const PdfButton = ({ toolCalls }) => {
  if (!toolCalls?.length) return null;
  const pdfCall = toolCalls.find(tc => tc.name === 'jarvisGerarPDF' && tc.results);
  if (!pdfCall) return null;
  let res;
  try { res = typeof pdfCall.results === 'string' ? JSON.parse(pdfCall.results) : pdfCall.results; } catch { return null; }
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
      📄 Baixar Relatório PDF
    </button>
  );
};

const Message = ({ message }) => {
  const isUser = message.role === 'user';
  if (!message.content && !message.tool_calls?.length) return null;
  return (
    <div className={`flex gap-2 items-end ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <Avatar size="sm" />}
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
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
        <PdfButton toolCalls={message.tool_calls} />
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

export default function AssistenteFloating() {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [userName, setUserName] = useState('');
  const [userLoaded, setUserLoaded] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const inactivityTimer = useRef(null);

  const INACTIVITY_MINUTES = 30;

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(async () => {
      const conv = await base44.agents.createConversation({
        agent_name: 'assistente_treinamentos',
        metadata: { name: 'Chat' }
      });
      setConversation(conv);
      setMessages([]);
      setIsFirstMessage(true);
      base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
      });
    }, INACTIVITY_MINUTES * 60 * 1000);
  };

  useEffect(() => {
    base44.auth.me().then(u => {
      setUserName(u?.nome_tratamento || u?.full_name || u?.email || '');
      setUserLoaded(true);
    }).catch(() => setUserLoaded(true));
  }, []);

  useEffect(() => {
    if (open && !initialized && userLoaded) initConversation();
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open, userLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const initConversation = async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: 'assistente_treinamentos' });
      let conv;
      if (list.length > 0) {
        conv = await base44.agents.getConversation(list[0].id);
      } else {
        conv = await base44.agents.createConversation({
          agent_name: 'assistente_treinamentos',
          metadata: { name: 'Chat' }
        });
      }
      setConversation(conv);
      const msgs = conv.messages || [];
      setMessages(msgs);
      setIsFirstMessage(msgs.length === 0);
      setInitialized(true);
      base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
      });
    } catch (e) {}
  };

  const newChat = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: 'assistente_treinamentos',
      metadata: { name: 'Chat' }
    });
    setConversation(conv);
    setMessages([]);
    setIsFirstMessage(true);
    base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });
  };

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);
    let conv = conversation;
    if (!conv) {
      conv = await base44.agents.createConversation({ agent_name: 'assistente_treinamentos', metadata: { name: 'Chat' } });
      setConversation(conv);
    }
    const content = userName ? `[Usuário: ${userName}] ${msg}` : msg;
    setIsFirstMessage(false);
    resetInactivityTimer();
    await base44.agents.addMessage(conv, { role: 'user', content });
    setSending(false);
  };

  const isTyping = sending || (messages.length > 0 && messages[messages.length - 1]?.role !== 'user' && !messages[messages.length - 1]?.content);

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2">
        {!open && (
          <div className="flex items-center gap-2 animate-bounce-slow">
            <div className="bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg border border-gray-100 whitespace-nowrap">
              Posso te ajudar? 👋
            </div>
          </div>
        )}
        <button onClick={() => setOpen(o => !o)} className="group relative" title="Jarvis">
          <Avatar size="lg" pulse={!open} />
          {open && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center z-20">
              <ChevronDown className="w-3 h-3 text-white" />
            </span>
          )}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[99] w-[360px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ height: '520px' }}>

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
            {messages.length === 0 && !sending && (
              <div className="flex flex-col items-center text-center pt-4 pb-2">
                <Avatar size="lg" />
                <p className="mt-3 text-sm font-semibold text-gray-800">Olá! Sou o Jarvis 👋</p>
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
            {messages.map((msg, i) => {
              const display = { ...msg };
              if (msg.role === 'user' && msg.content?.includes('[Usuário:')) {
                display.content = msg.content.replace(/^\[Usuário:[^\]]*\]\s*/, '');
              }
              return <Message key={i} message={display} />;
            })}
            {isTyping && <TypingIndicator />}
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