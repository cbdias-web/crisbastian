import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Bot, GraduationCap, Plus, Loader2 } from 'lucide-react';
import MessageBubble from '@/components/chat/MessageBubble';

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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#0f1e35] flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Assistente</p>
              <p className="text-[10px] text-gray-400">Treinamentos</p>
            </div>
          </div>
          <button
            onClick={newConversation}
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#0f1e35] text-white text-sm rounded-xl hover:bg-[#1a3150] transition"
          >
            <Plus className="w-4 h-4" /> Nova Conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Nenhuma conversa ainda</p>
          ) : conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm mb-1 transition ${
                currentConversation?.id === conv.id
                  ? 'bg-[#0f1e35]/10 text-[#0f1e35] font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <p className="truncate">{conv.metadata?.name || 'Conversa'}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {conv.created_date ? new Date(conv.created_date).toLocaleDateString('pt-BR') : ''}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0f1e35] to-[#1a3150] flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Assistente de Treinamentos</p>
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" /> Online
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!currentConversation && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#0f1e35]/10 flex items-center justify-center mb-4">
                <GraduationCap className="w-8 h-8 text-[#1a3150]" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Assistente de Treinamentos</h2>
              <p className="text-sm text-gray-500 max-w-sm mb-4">
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
                    className="text-left px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:border-[#1a3150] transition"
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
              <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-100 px-6 py-4">
          <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-[#1a3150] transition">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta sobre os treinamentos..."
              rows={1}
              className="flex-1 text-sm bg-transparent resize-none focus:outline-none text-gray-800 placeholder-gray-400 max-h-32"
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="p-2 bg-[#0f1e35] text-white rounded-xl hover:bg-[#1a3150] transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            O assistente pode acessar todos os módulos e conteúdos publicados na plataforma
          </p>
        </div>
      </div>
    </div>
  );
}