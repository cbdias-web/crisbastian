import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  MessageSquare, X, Send, Video, Copy, Hash, Plus,
  ChevronLeft, Users, Settings, Check, ExternalLink
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const CANAIS_PADRAO = [
  { id: 'geral', nome: 'Geral', icone: '🏢', descricao: 'Canal geral da equipe' },
  { id: 'comercial', nome: 'Comercial', icone: '💼', descricao: 'Time comercial' },
  { id: 'avisos', nome: 'Avisos', icone: '📢', descricao: 'Comunicados importantes' },
];

function formatDateLabel(dateStr) {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Hoje';
  if (isYesterday(d)) return 'Ontem';
  return format(d, "d 'de' MMMM", { locale: ptBR });
}

function formatTime(dateStr) {
  return format(parseISO(dateStr), 'HH:mm');
}

function groupByDate(messages) {
  const groups = [];
  let currentDate = null;
  for (const msg of messages) {
    const date = msg.created_date?.split('T')[0];
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ type: 'date', label: formatDateLabel(msg.created_date), key: date });
    }
    groups.push({ type: 'msg', data: msg });
  }
  return groups;
}

// Avatar colorido baseado no nome
function UserAvatar({ nome, size = 'sm' }) {
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500'];
  const idx = nome ? nome.charCodeAt(0) % colors.length : 0;
  const dim = size === 'lg' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-xs';
  return (
    <div className={`${dim} ${colors[idx]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {(nome || '?').charAt(0).toUpperCase()}
    </div>
  );
}

// Modal de videochamada embed
function MeetModal({ link, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-[#0f1e35]">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-[#1a73e8]" />
          <span className="text-white text-sm font-semibold">Reunião em andamento</span>
        </div>
        <div className="flex items-center gap-2">
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-300 hover:text-white transition">
            <ExternalLink className="w-3.5 h-3.5" /> Abrir em nova aba
          </a>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <iframe
        src={link}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="flex-1 w-full border-0"
        title="Google Meet"
      />
    </div>
  );
}

export default function ChatInterno() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [canalAtivo, setCanalAtivo] = useState('geral');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [criandoMeet, setCriandoMeet] = useState(false);
  const [meetModal, setMeetModal] = useState(null);
  const [novoCanal, setNovoCanal] = useState('');
  const [showNovoCanal, setShowNovoCanal] = useState(false);
  const [canaisCustom, setCanaisCustom] = useState([]);
  const [unreadMap, setUnreadMap] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    // Carregar canais custom do localStorage
    const saved = localStorage.getItem('chat_canais_custom');
    if (saved) setCanaisCustom(JSON.parse(saved));
  }, []);

  const todosCanais = [...CANAIS_PADRAO, ...canaisCustom];

  // Buscar mensagens do canal ativo
  const { data: mensagens = [] } = useQuery({
    queryKey: ['chat-interno', canalAtivo],
    queryFn: () => base44.entities.MensagemChat.filter({ canal: canalAtivo }, 'created_date', 100),
    enabled: open && !!canalAtivo,
    refetchInterval: open ? 3000 : false,
  });

  // Contagem de não lidas por canal (simplificado: mensagens recentes não suas)
  const { data: todasMensagens = [] } = useQuery({
    queryKey: ['chat-all-unread'],
    queryFn: () => base44.entities.MensagemChat.list('-created_date', 50),
    enabled: !!user,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!user || !todasMensagens.length) return;
    const lastSeenKey = 'chat_last_seen';
    let lastSeen = {};
    try { lastSeen = JSON.parse(localStorage.getItem(lastSeenKey) || '{}'); } catch {}

    const map = {};
    for (const msg of todasMensagens) {
      if (msg.remetente_email === user.email) continue;
      const canal = msg.canal;
      const msgTime = new Date(msg.created_date).getTime();
      const seenTime = lastSeen[canal] ? new Date(lastSeen[canal]).getTime() : 0;
      if (msgTime > seenTime) {
        map[canal] = (map[canal] || 0) + 1;
      }
    }
    setUnreadMap(map);
  }, [todasMensagens, user]);

  // Marcar canal como visto ao abrir
  useEffect(() => {
    if (!open || !canalAtivo) return;
    const lastSeenKey = 'chat_last_seen';
    let lastSeen = {};
    try { lastSeen = JSON.parse(localStorage.getItem(lastSeenKey) || '{}'); } catch {}
    lastSeen[canalAtivo] = new Date().toISOString();
    localStorage.setItem(lastSeenKey, JSON.stringify(lastSeen));
    setUnreadMap(prev => ({ ...prev, [canalAtivo]: 0 }));
  }, [open, canalAtivo, mensagens]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open, canalAtivo]);

  const enviarMensagem = async (meetLinkExtra) => {
    const msgTexto = texto.trim();
    if (!msgTexto && !meetLinkExtra) return;
    if (!user) return;
    setEnviando(true);
    setTexto('');
    try {
      await base44.entities.MensagemChat.create({
        canal: canalAtivo,
        tipo_canal: 'canal',
        remetente_id: user.id,
        remetente_nome: user.nome_tratamento || user.full_name || user.email,
        remetente_email: user.email,
        texto: meetLinkExtra ? `🎥 Reunião iniciada! [Entrar no Meet](${meetLinkExtra})` : msgTexto,
        meet_link: meetLinkExtra || undefined,
      });
      queryClient.invalidateQueries(['chat-interno', canalAtivo]);
    } catch (e) {
      toast.error('Erro ao enviar mensagem');
      setTexto(msgTexto);
    }
    setEnviando(false);
  };

  const gerarMeet = async () => {
    setCriandoMeet(true);
    try {
      // Cria evento simples no Google Calendar com Meet
      const dataHoje = new Date().toISOString().split('T')[0];
      const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      // Usa um ID temporário para o agendamento
      const tempId = `chat-meet-${Date.now()}`;
      
      // Cria uma entrada temporária na AgendaContato para poder usar a função existente
      const agendaTemp = await base44.entities.AgendaContato.create({
        lead_id: user.id,
        lead_nome: `Reunião do Chat — Canal ${canalAtivo}`,
        vendedor_id: user.id,
        vendedor_nome: user.nome_tratamento || user.full_name || user.email,
        data_agendada: dataHoje,
        horario: horaAgora,
        status: 'pendente',
      });

      const res = await base44.functions.invoke('criarMeetAgenda', {
        agenda_id: agendaTemp.id,
        lead_nome: `Chat — Canal ${canalAtivo}`,
        data_agendada: dataHoje,
        horario_inicio: horaAgora,
        com_meet: true,
      });

      const link = res.data?.meet_link;
      if (!link) throw new Error('Link não gerado');

      // Remove a agenda temporária
      await base44.entities.AgendaContato.delete(agendaTemp.id);

      // Envia mensagem no chat com o link
      await enviarMensagem(link);
      
      // Abre a reunião embedded
      setMeetModal(link);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || '';
      if (msg.toLowerCase().includes('connection') || msg.toLowerCase().includes('no active')) {
        toast.error('Conecte sua conta Google Calendar primeiro (botão Google Calendar na Agenda do Dia)');
      } else {
        toast.error('Erro ao criar reunião: ' + msg);
      }
    }
    setCriandoMeet(false);
  };

  const adicionarCanal = () => {
    const nome = novoCanal.trim().toLowerCase().replace(/\s+/g, '-');
    if (!nome) return;
    const novo = { id: nome, nome: novoCanal.trim(), icone: '💬' };
    const novos = [...canaisCustom, novo];
    setCanaisCustom(novos);
    localStorage.setItem('chat_canais_custom', JSON.stringify(novos));
    setCanalAtivo(nome);
    setNovoCanal('');
    setShowNovoCanal(false);
  };

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);
  const grouped = groupByDate(mensagens);

  return (
    <>
      {/* Botão flutuante do chat */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-32 right-6 z-[9990] w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #1a3150 0%, #0f1e35 100%)' }}
        title="Chat Interno"
      >
        <MessageSquare className="w-5 h-5 text-white" />
        {totalUnread > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* Painel lateral */}
      {open && (
        <div className="fixed right-0 top-0 bottom-0 z-[9995] flex shadow-2xl" style={{ width: '380px', maxWidth: '100vw' }}>
          
          {/* Sidebar de canais */}
          <div className="w-16 flex flex-col items-center py-4 gap-2 flex-shrink-0" style={{ background: '#0f1e35' }}>
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-2">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            
            {todosCanais.map(canal => {
              const isActive = canalAtivo === canal.id;
              const unread = unreadMap[canal.id] || 0;
              return (
                <button
                  key={canal.id}
                  onClick={() => setCanalAtivo(canal.id)}
                  title={canal.nome}
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                    isActive ? 'bg-white/20 shadow-lg scale-105' : 'hover:bg-white/10 opacity-60 hover:opacity-100'
                  }`}
                >
                  {canal.icone}
                  {unread > 0 && !isActive && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              onClick={() => setShowNovoCanal(p => !p)}
              title="Novo canal"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition mt-1"
            >
              <Plus className="w-4 h-4" />
            </button>

            <div className="flex-1" />
            <button onClick={() => setOpen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Área principal do chat */}
          <div className="flex-1 flex flex-col bg-white border-l border-gray-200 min-w-0">
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5 flex-shrink-0 bg-white shadow-sm">
              <span className="text-xl">{todosCanais.find(c => c.id === canalAtivo)?.icone || '💬'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{todosCanais.find(c => c.id === canalAtivo)?.nome || canalAtivo}</p>
                <p className="text-[10px] text-gray-400">Chat interno · Equipe Villela Exchange</p>
              </div>
              <button
                onClick={gerarMeet}
                disabled={criandoMeet}
                title="Iniciar reunião com vídeo"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {criandoMeet
                  ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Video className="w-3.5 h-3.5" />}
                {criandoMeet ? 'Criando...' : 'Meet'}
              </button>
            </div>

            {/* Novo canal form */}
            {showNovoCanal && (
              <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <input
                  autoFocus
                  value={novoCanal}
                  onChange={e => setNovoCanal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarCanal()}
                  placeholder="nome-do-canal"
                  className="flex-1 text-xs bg-transparent border-none outline-none text-gray-700 placeholder-gray-400"
                />
                <button onClick={adicionarCanal} disabled={!novoCanal.trim()}
                  className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-40">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowNovoCanal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-gray-50">
              {mensagens.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <span className="text-4xl mb-3">{todosCanais.find(c => c.id === canalAtivo)?.icone || '💬'}</span>
                  <p className="text-sm font-semibold text-gray-700">Canal {todosCanais.find(c => c.id === canalAtivo)?.nome || canalAtivo}</p>
                  <p className="text-xs text-gray-400 mt-1">Seja o primeiro a enviar uma mensagem!</p>
                </div>
              ) : (
                grouped.map((item, i) => {
                  if (item.type === 'date') {
                    return (
                      <div key={item.key} className="flex items-center gap-2 py-2">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[10px] text-gray-400 font-medium px-2">{item.label}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    );
                  }
                  const msg = item.data;
                  const isOwn = msg.remetente_email === user?.email;
                  const hasMeet = msg.meet_link;

                  return (
                    <div key={msg.id} className={`flex gap-2 items-start group ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {!isOwn && <UserAvatar nome={msg.remetente_nome} />}
                      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isOwn && (
                          <span className="text-[10px] text-gray-500 font-semibold mb-0.5 ml-1">{msg.remetente_nome}</span>
                        )}
                        <div className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          isOwn
                            ? 'bg-[#0f1e35] text-white rounded-br-sm'
                            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                        }`}>
                          {hasMeet ? (
                            <div className="space-y-1.5">
                              <p className="text-xs opacity-80">🎥 Reunião iniciada!</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => setMeetModal(msg.meet_link)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] text-white text-xs font-semibold rounded-xl hover:bg-[#1557b0] transition"
                                >
                                  <Video className="w-3 h-3" /> Entrar no Meet
                                </button>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(msg.meet_link); toast.success('Link copiado!'); }}
                                  className={`flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-xl border transition ${isOwn ? 'border-white/30 text-white/80 hover:bg-white/10' : 'border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                                >
                                  <Copy className="w-3 h-3" /> Copiar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.texto}</p>
                          )}
                        </div>
                        <span className={`text-[9px] text-gray-400 mt-0.5 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                          {msg.created_date ? formatTime(msg.created_date) : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-[#1a3150] transition">
                <textarea
                  ref={inputRef}
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); }
                  }}
                  placeholder={`Mensagem em #${canalAtivo}...`}
                  rows={1}
                  className="flex-1 text-sm bg-transparent resize-none focus:outline-none text-gray-800 placeholder-gray-400 max-h-24"
                  style={{ minHeight: '22px' }}
                />
                <button
                  onClick={() => enviarMensagem()}
                  disabled={!texto.trim() || enviando}
                  className="p-1.5 bg-[#0f1e35] text-white rounded-lg hover:bg-[#1a3150] disabled:opacity-40 transition flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 px-1">Enter para enviar · Shift+Enter para nova linha</p>
            </div>
          </div>
        </div>
      )}

      {/* Meet modal embedded */}
      {meetModal && <MeetModal link={meetModal} onClose={() => setMeetModal(null)} />}
    </>
  );
}