import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  MessageSquare, Send, Video, Copy, Hash, Plus,
  X, Check, ExternalLink, Users
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

function UserAvatar({ nome, size = 'sm' }) {
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500'];
  const idx = nome ? nome.charCodeAt(0) % colors.length : 0;
  const dim = size === 'lg' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';
  return (
    <div className={`${dim} ${colors[idx]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {(nome || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function MeetModal({ link, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-[#0f1e35]">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-[#1a73e8]" />
          <span className="text-white text-sm font-semibold">Reunião em andamento</span>
        </div>
        <div className="flex items-center gap-3">
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

export default function ChatPage() {
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
    try {
      const saved = localStorage.getItem('chat_canais_custom');
      if (saved) setCanaisCustom(JSON.parse(saved));
    } catch {}
  }, []);

  const todosCanais = [...CANAIS_PADRAO, ...canaisCustom];

  const { data: mensagens = [] } = useQuery({
    queryKey: ['chat-interno', canalAtivo],
    queryFn: () => base44.entities.MensagemChat.filter({ canal: canalAtivo }, 'created_date', 100),
    enabled: !!canalAtivo,
    refetchInterval: 3000,
  });

  const { data: todasMensagens = [] } = useQuery({
    queryKey: ['chat-all-unread'],
    queryFn: () => base44.entities.MensagemChat.list('-created_date', 50),
    enabled: !!user,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!user || !todasMensagens.length) return;
    let lastSeen = {};
    try { lastSeen = JSON.parse(localStorage.getItem('chat_last_seen') || '{}'); } catch {}
    const map = {};
    for (const msg of todasMensagens) {
      if (msg.remetente_email === user.email) continue;
      const canal = msg.canal;
      const msgTime = new Date(msg.created_date).getTime();
      const seenTime = lastSeen[canal] ? new Date(lastSeen[canal]).getTime() : 0;
      if (msgTime > seenTime) map[canal] = (map[canal] || 0) + 1;
    }
    setUnreadMap(map);
  }, [todasMensagens, user]);

  // Marcar canal como visto
  useEffect(() => {
    if (!canalAtivo) return;
    let lastSeen = {};
    try { lastSeen = JSON.parse(localStorage.getItem('chat_last_seen') || '{}'); } catch {}
    lastSeen[canalAtivo] = new Date().toISOString();
    localStorage.setItem('chat_last_seen', JSON.stringify(lastSeen));
    setUnreadMap(prev => ({ ...prev, [canalAtivo]: 0 }));
  }, [canalAtivo, mensagens]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [canalAtivo]);

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
        texto: meetLinkExtra ? `🎥 Reunião iniciada!` : msgTexto,
        meet_link: meetLinkExtra || undefined,
      });
      queryClient.invalidateQueries(['chat-interno', canalAtivo]);
    } catch {
      toast.error('Erro ao enviar mensagem');
      setTexto(msgTexto);
    }
    setEnviando(false);
  };

  const gerarMeet = async () => {
    setCriandoMeet(true);
    try {
      const dataHoje = new Date().toISOString().split('T')[0];
      const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const agendaTemp = await base44.entities.AgendaContato.create({
        lead_id: user.id,
        lead_nome: `Reunião — Chat ${canalAtivo}`,
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

      await base44.entities.AgendaContato.delete(agendaTemp.id);
      await enviarMensagem(link);
      setMeetModal(link);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || '';
      if (msg.toLowerCase().includes('connection') || msg.toLowerCase().includes('no active')) {
        toast.error('Conecte sua conta Google Calendar primeiro (Agenda do Dia → botão Google Calendar)');
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

  const grouped = groupByDate(mensagens);
  const canalInfo = todosCanais.find(c => c.id === canalAtivo);

  return (
    <div className="flex h-screen bg-gray-50">

      {/* ── SIDEBAR DE CANAIS ── */}
      <div className="w-64 flex flex-col flex-shrink-0 border-r border-gray-200 bg-white">
        {/* Header sidebar */}
        <div className="px-5 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #1a3150 100%)' }}>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-white font-bold text-sm">Chat Interno</h2>
              <p className="text-blue-300/70 text-[10px]">Villela Exchange</p>
            </div>
          </div>
        </div>

        {/* Canais */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">Canais</p>
          <div className="space-y-0.5">
            {todosCanais.map(canal => {
              const isActive = canalAtivo === canal.id;
              const unread = unreadMap[canal.id] || 0;
              return (
                <button
                  key={canal.id}
                  onClick={() => setCanalAtivo(canal.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-[#0f1e35] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-base flex-shrink-0">{canal.icone}</span>
                  <span className="text-sm font-medium flex-1 truncate">{canal.nome}</span>
                  {unread > 0 && !isActive && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Novo canal */}
          <div className="mt-4">
            {showNovoCanal ? (
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 rounded-xl border border-blue-100">
                <Hash className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <input
                  autoFocus
                  value={novoCanal}
                  onChange={e => setNovoCanal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') adicionarCanal(); if (e.key === 'Escape') setShowNovoCanal(false); }}
                  placeholder="nome-do-canal"
                  className="flex-1 text-xs bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 min-w-0"
                />
                <button onClick={adicionarCanal} disabled={!novoCanal.trim()} className="text-blue-600 hover:text-blue-800 disabled:opacity-40 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowNovoCanal(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNovoCanal(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition text-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Novo canal
              </button>
            )}
          </div>
        </div>

        {/* Info usuário */}
        {user && (
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-2 px-2">
              <UserAvatar nome={user.nome_tratamento || user.full_name} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{user.nome_tratamento || user.full_name}</p>
                <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Online
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ÁREA PRINCIPAL ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header canal */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white shadow-sm flex items-center gap-3 flex-shrink-0">
          <span className="text-2xl">{canalInfo?.icone || '💬'}</span>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900">{canalInfo?.nome || canalAtivo}</h1>
            {canalInfo?.descricao && <p className="text-xs text-gray-400">{canalInfo.descricao}</p>}
          </div>
          <button
            onClick={gerarMeet}
            disabled={criandoMeet}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-semibold rounded-xl transition shadow-sm disabled:opacity-50"
          >
            {criandoMeet
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Video className="w-4 h-4" />}
            {criandoMeet ? 'Criando reunião...' : 'Iniciar Meet'}
          </button>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-5xl mb-4">{canalInfo?.icone || '💬'}</span>
              <p className="text-lg font-bold text-gray-700">Bem-vindo ao #{canalInfo?.nome || canalAtivo}!</p>
              <p className="text-sm text-gray-400 mt-1">Este é o início do canal. Envie a primeira mensagem!</p>
            </div>
          ) : (
            grouped.map((item, i) => {
              if (item.type === 'date') {
                return (
                  <div key={item.key} className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium px-3 py-1 bg-gray-100 rounded-full">{item.label}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                );
              }
              const msg = item.data;
              const isOwn = msg.remetente_email === user?.email;

              return (
                <div key={msg.id} className={`flex gap-3 items-start group py-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  {!isOwn && <UserAvatar nome={msg.remetente_nome} />}
                  <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && (
                      <span className="text-xs text-gray-500 font-semibold mb-1 ml-1">{msg.remetente_nome}</span>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                      isOwn
                        ? 'bg-[#0f1e35] text-white rounded-br-sm'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      {msg.meet_link ? (
                        <div className="space-y-2">
                          <p className="text-sm">🎥 Reunião iniciada!</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setMeetModal(msg.meet_link)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] text-white text-xs font-semibold rounded-xl hover:bg-[#1557b0] transition"
                            >
                              <Video className="w-3.5 h-3.5" /> Entrar no Meet
                            </button>
                            <button
                              onClick={() => { navigator.clipboard.writeText(msg.meet_link); toast.success('Link copiado!'); }}
                              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition ${isOwn ? 'border-white/30 text-white/80 hover:bg-white/10' : 'border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                            >
                              <Copy className="w-3.5 h-3.5" /> Copiar link
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.texto}</p>
                      )}
                    </div>
                    <span className={`text-[10px] text-gray-400 mt-0.5 ${isOwn ? 'mr-1' : 'ml-1'}`}>
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
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-[#1a3150] transition">
            <textarea
              ref={inputRef}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
              placeholder={`Mensagem em #${canalInfo?.nome || canalAtivo}...`}
              rows={1}
              className="flex-1 text-sm bg-transparent resize-none focus:outline-none text-gray-800 placeholder-gray-400 max-h-32"
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={() => enviarMensagem()}
              disabled={!texto.trim() || enviando}
              className="p-2 bg-[#0f1e35] text-white rounded-xl hover:bg-[#1a3150] disabled:opacity-40 transition flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 px-1">Enter para enviar · Shift+Enter para nova linha</p>
        </div>
      </div>

      {/* Meet modal embedded */}
      {meetModal && <MeetModal link={meetModal} onClose={() => setMeetModal(null)} />}
    </div>
  );
}