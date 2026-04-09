import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, X, Loader2, Plus, ChevronDown, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';


const Avatar = ({ size = 'md', pulse = false }) => {
  const s = size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  return (
    <div className={`relative ${s} flex-shrink-0`}>
      {pulse && (
        <span className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
      )}
      <div className={`${s} rounded-full bg-gradient-to-br from-[#1a3150] to-blue-500 flex items-center justify-center shadow-lg relative z-10`}>
        <span className="text-white font-bold" style={{ fontSize: size === 'lg' ? 22 : size === 'sm' ? 13 : 17 }}>V</span>
      </div>
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && !initialized) initConversation();
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

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
      setMessages(conv.messages || []);
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
    await base44.agents.addMessage(conv, { role: 'user', content: msg });
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
        <button
          onClick={() => setOpen(o => !o)}
          className="group relative"
          title="Assistente Villela"
        >
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
              <p className="text-white font-semibold text-sm">Assistente Villela</p>
              <p className="text-blue-300 text-[10px] flex items-center gap-1">
                <Globe className="w-2.5 h-2.5" /> Acesso à plataforma + web
              </p>
            </div>
            <button onClick={newChat} title="Nova conversa"
              className="text-white/60 hover:text-white transition p-1">
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
                <p className="mt-3 text-sm font-semibold text-gray-800">Olá! Sou o Assistente Villela 👋</p>
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
            {messages.map((msg, i) => <Message key={i} message={msg} />)}
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