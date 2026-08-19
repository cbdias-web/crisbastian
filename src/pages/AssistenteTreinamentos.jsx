import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Bot, GraduationCap, Plus, Loader2 } from 'lucide-react';
import MessageBubble from '@/components/chat/MessageBubble';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

export default function AssistenteTreinamentos() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  useEffect(() => {
    if (!currentConversation) return;
    const unsub = base44.agents.subscribeToConversation(currentConversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsub();
  }, [currentConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    const list = await base44.agents.listConversations({ agent_name: 'assistente_treinamentos' }).catch(() => []);
    setConversations(list);
    if (list.length > 0) {
      const conv = await base44.agents.getConversation(list[0].id);
      setCurrentConversation(conv);
      setMessages(conv.messages || []);
    }
    setLoading(false);
  };

  const newConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: 'assistente_treinamentos',
      metadata: { name: `Conversa ${new Date().toLocaleDateString('pt-BR')}` }
    });
    setCurrentConversation(conv);
    setMessages([]);
    setConversations(prev => [conv, ...prev]);
  };

  const selectConversation = async (conv) => {
    const full = await base44.agents.getConversation(conv.id);
    setCurrentConversation(full);
    setMessages(full.messages || []);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    let conv = currentConversation;
    if (!conv) {
      conv = await base44.agents.createConversation({
        agent_name: 'assistente_treinamentos',
        metadata: { name: `Conversa ${new Date().toLocaleDateString('pt-BR')}` }
      });
      setCurrentConversation(conv);
      setConversations(prev => [conv, ...prev]);
    }

    const text = input.trim();
    setInput('');
    setSending(true);

    await base44.agents.addMessage(conv, { role: 'user', content: text });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isTyping = sending || messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content;

  return (
    <div className="flex h-screen relative" style={{ background: 'transparent', color: AURORA.text }}>
      {/* Sidebar */}
      <aside className="w-64 flex flex-col flex-shrink-0" style={{ background: AURORA.surface, borderRight: `1px solid ${AURORA.border}` }}>
        <div className="p-4" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: AURORA.text }}>Assistente</p>
              <p className="text-[10px]" style={{ color: AURORA.textMuted }}>Treinamentos</p>
            </div>
          </div>
          <button
            onClick={newConversation}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition"
            style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Plus className="w-4 h-4" /> Nova Conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: AURORA.textMuted }} /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: AURORA.textMuted }}>Nenhuma conversa ainda</p>
          ) : conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm mb-1 transition"
              style={{
                color: currentConversation?.id === conv.id ? AURORA.accent : AURORA.text,
                background: currentConversation?.id === conv.id ? AURORA.accentDim : 'transparent',
                border: currentConversation?.id === conv.id ? `1px solid ${AURORA.border}` : '1px solid transparent',
              }}
            >
              <p className="truncate">{conv.metadata?.name || 'Conversa'}</p>
              <p className="text-[10px] mt-0.5" style={{ color: AURORA.textMuted }}>
                {conv.created_date ? new Date(conv.created_date).toLocaleDateString('pt-BR') : ''}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-3" style={{ background: AURORA.surface, borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f1e35, #1a3150)' }}>
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold" style={{ color: AURORA.text }}>Assistente de Treinamentos</p>
            <p className="text-xs flex items-center gap-1" style={{ color: '#34d399' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#34d399' }} /> Online
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!currentConversation && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: AURORA.accentDim }}>
                <GraduationCap className="w-8 h-8" style={{ color: AURORA.accent }} />
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: AURORA.text }}>Assistente de Treinamentos</h2>
              <p className="text-sm max-w-sm mb-4" style={{ color: AURORA.textMuted }}>
                Tire dúvidas, encontre conteúdos, acesse documentos e PDFs disponíveis na plataforma de treinamentos.
              </p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {[
                  'Quais treinamentos estão disponíveis?',
                  'Como funciona o produto Offshore?',
                  'Tem algum contrato para baixar?',
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="text-left px-4 py-2.5 rounded-xl text-sm transition"
                    style={{
                      color: AURORA.text,
                      background: AURORA.surface2,
                      border: `1px solid ${AURORA.border}`,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: AURORA.surface2 }}>
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: AURORA.textMuted }} />
              </div>
              <div className="rounded-2xl px-4 py-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <div className="flex gap-1 items-center h-4">
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: AURORA.textMuted, animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: AURORA.textMuted, animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: AURORA.textMuted, animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4" style={{ background: AURORA.surface, borderTop: `1px solid ${AURORA.border}` }}>
          <div className="flex items-end gap-3 rounded-2xl px-4 py-3 transition" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta sobre os treinamentos..."
              rows={1}
              className="flex-1 text-sm bg-transparent resize-none focus:outline-none max-h-32"
              style={{ minHeight: '24px', color: AURORA.text }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="p-2 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-center mt-2" style={{ color: AURORA.textMuted }}>
            O assistente pode acessar todos os módulos e conteúdos publicados na plataforma
          </p>
        </div>
      </div>
    </div>
  );
}