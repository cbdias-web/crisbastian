import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  MessageSquare, Send, Video, Copy, Hash, Plus,
  X, Check, ExternalLink, Lock, ChevronDown, ChevronRight,
  Settings, Trash2, UserPlus, UserMinus, Users, Paperclip, FileText, Download
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// Canais fixos (não podem ser removidos)
const CANAIS_FIXOS = [
  { id: 'geral', nome: 'Geral', icone: '🏢', descricao: 'Canal geral da equipe', fixo: true, membros: [] },
  { id: 'comercial', nome: 'Comercial', icone: '💼', descricao: 'Time comercial', fixo: true, membros: [] },
  { id: 'avisos', nome: 'Avisos', icone: '📢', descricao: 'Comunicados importantes', fixo: true, membros: [] },
];

function getDmKey(emailA, emailB) {
  return [emailA, emailB].sort().join('__dm__');
}
function formatDateLabel(dateStr) {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Hoje';
    if (isYesterday(d)) return 'Ontem';
    return format(d, "d 'de' MMMM", { locale: ptBR });
  } catch { return ''; }
}
function formatTime(dateStr) {
  try { return format(parseISO(dateStr), 'HH:mm'); } catch { return ''; }
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
          <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-300 hover:text-white transition">
            <ExternalLink className="w-3.5 h-3.5" /> Abrir em nova aba
          </a>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <iframe src={link} allow="camera; microphone; fullscreen; display-capture; autoplay" className="flex-1 w-full border-0" title="Google Meet" />
    </div>
  );
}

// Modal: Criar novo canal com seleção de membros
function NovoCanalModal({ usuarios, userEmail, onSave, onClose }) {
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState('💬');
  const [membros, setMembros] = useState([userEmail]); // criador sempre incluído
  const [saving, setSaving] = useState(false);

  const toggleMembro = (email) => {
    if (email === userEmail) return; // criador não pode se remover
    setMembros(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error('Informe o nome do canal'); return; }
    setSaving(true);
    await onSave({ nome: nome.trim(), icone, membros });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #1a3150 100%)' }}>
          <div>
            <p className="font-bold text-white text-sm">Novo Canal</p>
            <p className="text-blue-200 text-xs mt-0.5">Configure o canal e seus membros</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-3">
            <div className="w-20">
              <label className="text-xs text-gray-500 mb-1 block">Ícone</label>
              <input value={icone} onChange={e => setIcone(e.target.value)} maxLength={2}
                className="w-full text-center text-2xl border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#1a3150]" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Nome do canal *</label>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="ex: time-vendas"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-2 block font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Membros ({membros.length} selecionados)
            </label>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {usuarios.map(u => {
                const email = u.email;
                const isMe = email === userEmail;
                const selected = membros.includes(email);
                const nome = u.nome_tratamento || u.full_name || email;
                return (
                  <button key={email} onClick={() => toggleMembro(email)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition ${selected ? 'border-[#1a3150] bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#0f1e35] border-[#0f1e35]' : 'border-gray-300'}`}>
                      {selected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <UserAvatar nome={nome} size="sm" />
                    <span className="text-sm text-gray-700 flex-1 text-left truncate">{nome}</span>
                    {isMe && <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium">Você</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !nome.trim()}
            className="px-4 py-2 text-sm bg-[#0f1e35] text-white rounded-xl hover:bg-[#1a3150] transition flex items-center gap-2 disabled:opacity-50">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Hash className="w-3.5 h-3.5" />}
            Criar Canal
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal: Gerenciar membros de um canal
function GerenciarMembrosModal({ canal, usuarios, isAdmin, userEmail, onUpdate, onDelete, onClose, membrosIniciais }) {
  const [membros, setMembros] = useState(membrosIniciais ?? canal.membros ?? []);
  const [saving, setSaving] = useState(false);
  const podeGerenciar = isAdmin || canal.criador_email === userEmail;
  const ehCanalFixo = canal.fixo === true;

  const toggleMembro = (email) => {
    if (!podeGerenciar) return;
    setMembros(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(canal.id, { membros });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Remover o canal "${canal.nome}"? As mensagens serão mantidas no histórico.`)) return;
    await onDelete(canal.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{canal.icone}</span>
            <div>
              <p className="font-bold text-gray-900 text-sm">{canal.nome}</p>
              <p className="text-xs text-gray-400">Gerenciar membros</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Membros ({membros.length})
            {!podeGerenciar && <span className="text-amber-500 ml-2">— Somente leitura</span>}
          </p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {usuarios.map(u => {
              const email = u.email;
              const selected = membros.includes(email);
              const nome = u.nome_tratamento || u.full_name || email;
              return (
                <button key={email} onClick={() => toggleMembro(email)} disabled={!podeGerenciar}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition ${selected ? 'border-[#1a3150] bg-blue-50' : 'border-gray-100 hover:bg-gray-50'} ${!podeGerenciar ? 'cursor-default' : ''}`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#0f1e35] border-[#0f1e35]' : 'border-gray-300'}`}>
                    {selected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <UserAvatar nome={nome} size="sm" />
                  <span className="text-sm text-gray-700 flex-1 text-left truncate">{nome}</span>
                  {canal.criador_email === email && <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded font-medium">Criador</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between gap-2">
          {(isAdmin || canal.criador_email === userEmail) && (
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition">
              <Trash2 className="w-3.5 h-3.5" /> Remover Canal
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Fechar</button>
            {podeGerenciar && (
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-[#0f1e35] text-white rounded-xl hover:bg-[#1a3150] transition flex items-center gap-2 disabled:opacity-50">
                {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [active, setActive] = useState({ type: 'canal', id: 'geral' });
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fileInputRef = useRef(null);
  const [criandoMeet, setCriandoMeet] = useState(false);
  const [meetModal, setMeetModal] = useState(null);
  const [showNovoCanalModal, setShowNovoCanalModal] = useState(false);
  const [gerenciarCanal, setGerenciarCanal] = useState(null);
  const [unreadMap, setUnreadMap] = useState({});
  const [showCanais, setShowCanais] = useState(true);
  const [showDMs, setShowDMs] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  // Canais customizados do banco
  const { data: canaisDB = [] } = useQuery({
    queryKey: ['canais-chat'],
    queryFn: () => base44.entities.CanalChat.list('nome', 500),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Todos os usuários ativos
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-chat'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
    refetchInterval: 60000,
  });
  const outrosUsuarios = usuarios.filter(u => u.email !== user?.email && u.ativo !== false && u.visivel_no_chat !== false);
  const todosUsuariosAtivos = usuarios.filter(u => u.ativo !== false);

  // Canais visíveis: fixos + canais do banco onde o usuário é membro (ou admin vê todos)
  const canaisCustom = canaisDB.filter(c => c.ativo !== false && !CANAIS_FIXOS.some(cf => cf.nome.toLowerCase() === c.nome?.toLowerCase())).map(c => ({
    id: c.id,
    nome: c.nome,
    icone: c.icone || '💬',
    descricao: c.descricao || '',
    membros: c.membros || [],
    criador_email: c.criador_email || '',
    fixo: false,
    dbId: c.id,
  }));

  // Enriquecer canais fixos com membros persistidos no banco (se existirem)
  // Filtra fixos que foram desativados no banco (removidos pelo admin)
  const canaisFixosEnriquecidos = CANAIS_FIXOS
    .filter(cf => {
      const dbEntry = canaisDB.find(c => c.nome?.toLowerCase() === cf.nome.toLowerCase());
      // Se existe no banco e está inativo, não mostrar
      if (dbEntry && dbEntry.ativo === false) return false;
      return true;
    })
    .map(cf => {
      const dbEntry = canaisDB.find(c => c.nome?.toLowerCase() === cf.nome.toLowerCase());
      return dbEntry ? { ...cf, membros: dbEntry.membros || [], _dbId: dbEntry.id } : cf;
    });

  const todosCanais = [
    ...canaisFixosEnriquecidos,
    ...canaisCustom.filter(c => isAdmin || (c.membros || []).includes(user?.email)),
  ];

  // Mensagens
  const canalQuery = active.type === 'canal'
    ? { canal: active.id }
    : { canal: getDmKey(user?.email, active.email), tipo_canal: 'direto' };

  const { data: mensagens = [] } = useQuery({
    queryKey: ['chat-msgs', active.type, active.id],
    queryFn: () => base44.entities.MensagemChat.filter(canalQuery, 'created_date', 100),
    enabled: !!user && !!active.id,
    refetchInterval: 3000,
  });

  const { data: todasMensagens = [] } = useQuery({
    queryKey: ['chat-all-unread'],
    queryFn: () => base44.entities.MensagemChat.list('-created_date', 100),
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

  useEffect(() => {
    if (!active.id || !user) return;
    const key = active.type === 'canal' ? active.id : getDmKey(user.email, active.email);
    let lastSeen = {};
    try { lastSeen = JSON.parse(localStorage.getItem('chat_last_seen') || '{}'); } catch {}
    lastSeen[key] = new Date().toISOString();
    localStorage.setItem('chat_last_seen', JSON.stringify(lastSeen));
    setUnreadMap(prev => ({ ...prev, [key]: 0 }));
  }, [active, mensagens, user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, [active]);

  const enviarMensagem = async (meetLinkExtra, arquivoExtra) => {
    const msgTexto = texto.trim();
    if (!msgTexto && !meetLinkExtra && !arquivoExtra) return;
    if (!user) return;
    setEnviando(true);
    setTexto('');
    try {
      const payload = {
        canal: active.type === 'canal' ? active.id : getDmKey(user.email, active.email),
        tipo_canal: active.type === 'canal' ? 'canal' : 'direto',
        remetente_id: user.id,
        remetente_nome: user.nome_tratamento || user.full_name || user.email,
        remetente_email: user.email,
        texto: meetLinkExtra ? '🎥 Reunião iniciada!' : (arquivoExtra ? (msgTexto || '') : msgTexto),
        meet_link: meetLinkExtra || undefined,
        arquivo_url: arquivoExtra?.url || undefined,
        arquivo_nome: arquivoExtra?.nome || undefined,
        arquivo_tipo: arquivoExtra?.tipo || undefined,
      };
      if (active.type === 'dm') payload.destinatario_email = active.email;
      await base44.entities.MensagemChat.create(payload);
      queryClient.invalidateQueries(['chat-msgs', active.type, active.id]);
    } catch {
      toast.error('Erro ao enviar mensagem');
      setTexto(msgTexto);
    }
    setEnviando(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Limite de 20MB
    if (file.size > 20 * 1024 * 1024) { toast.error('Arquivo muito grande (máx. 20MB)'); return; }
    setEnviando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await enviarMensagem(null, { url: file_url, nome: file.name, tipo: file.type });
      toast.success('Arquivo enviado!');
    } catch {
      toast.error('Erro ao enviar arquivo');
    }
    setEnviando(false);
    e.target.value = '';
  };

  const gerarMeet = async () => {
    setCriandoMeet(true);
    try {
      const dataHoje = new Date().toISOString().split('T')[0];
      const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const nomeLocal = active.type === 'canal' ? `Chat #${active.id}` : `DM com ${active.nome}`;
      const agendaTemp = await base44.entities.AgendaContato.create({
        lead_id: user.id, lead_nome: `Reunião — ${nomeLocal}`,
        vendedor_id: user.id, vendedor_nome: user.nome_tratamento || user.full_name || user.email,
        data_agendada: dataHoje, horario: horaAgora, status: 'pendente',
      });
      const res = await base44.functions.invoke('criarMeetAgenda', {
        agenda_id: agendaTemp.id, lead_nome: nomeLocal,
        data_agendada: dataHoje, horario_inicio: horaAgora, com_meet: true,
      });
      const link = res.data?.meet_link;
      if (!link) throw new Error('Link não gerado');
      await base44.entities.AgendaContato.delete(agendaTemp.id);
      await enviarMensagem(link);
      setMeetModal(link);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || '';
      if (msg.toLowerCase().includes('connection') || msg.toLowerCase().includes('no active')) {
        toast.error('Conecte sua conta Google Calendar primeiro');
      } else {
        toast.error('Erro ao criar reunião: ' + msg);
      }
    }
    setCriandoMeet(false);
  };

  const criarCanal = async ({ nome, icone, membros }) => {
    const canal = await base44.entities.CanalChat.create({
      nome,
      icone,
      descricao: '',
      ativo: true,
      membros,
      criador_email: user.email,
    });
    queryClient.invalidateQueries(['canais-chat']);
    setActive({ type: 'canal', id: canal.id });
    setShowNovoCanalModal(false);
    toast.success(`Canal #${nome} criado!`);
  };

  const atualizarCanal = async (id, data) => {
    const canalFixo = canaisFixosEnriquecidos.find(c => c.id === id);
    if (canalFixo) {
      // Canal fixo: cria ou atualiza registro no banco para persistir membros
      const existente = canalFixo._dbId ? canaisDB.find(c => c.id === canalFixo._dbId) : canaisDB.find(c => c.nome?.toLowerCase() === canalFixo.nome.toLowerCase());
      if (existente) {
        await base44.entities.CanalChat.update(existente.id, data);
      } else {
        await base44.entities.CanalChat.create({
          nome: canalFixo.nome,
          icone: canalFixo.icone,
          descricao: canalFixo.descricao,
          ativo: true,
          criador_email: user?.email || '',
          ...data,
        });
      }
      queryClient.invalidateQueries(['canais-chat']);
      setGerenciarCanal(null);
      toast.success('Membros do canal atualizados!');
      return;
    }
    await base44.entities.CanalChat.update(id, data);
    queryClient.invalidateQueries(['canais-chat']);
    setGerenciarCanal(null);
    toast.success('Canal atualizado!');
  };

  const removerCanal = async (id) => {
    // Canal fixo: o id local é string como 'geral', 'comercial' etc.
    // Precisa encontrar o registro real no banco pelo nome
    const canalFixo = CANAIS_FIXOS.find(c => c.id === id);
    if (canalFixo) {
      const dbEntry = canaisDB.find(c => c.nome?.toLowerCase() === canalFixo.nome.toLowerCase());
      if (dbEntry) {
        await base44.entities.CanalChat.update(dbEntry.id, { ativo: false });
      }
      // Se não existe no banco, só remove localmente (sem registro persistido)
    } else {
      await base44.entities.CanalChat.update(id, { ativo: false });
    }
    queryClient.invalidateQueries(['canais-chat']);
    // Se removeu o canal fixo ativo, vai para geral (ou primeiro disponível)
    if (active.id === id) {
      const outroCanal = CANAIS_FIXOS.find(c => c.id !== id);
      setActive({ type: 'canal', id: outroCanal?.id || 'geral' });
    }
    toast.success('Canal removido!');
  };

  const isOnline = (u) => {
    if (!u.ultimo_acesso) return false;
    return (Date.now() - new Date(u.ultimo_acesso).getTime()) < 3 * 60 * 1000;
  };

  const grouped = groupByDate(mensagens);
  const activeCanal = todosCanais.find(c => c.id === active.id);
  const headerSub = active.type === 'canal'
    ? activeCanal?.descricao
    : `Conversa privada com ${active.nome || active.email}`;
  const podeGerenciarCanal = activeCanal && !activeCanal.fixo && (isAdmin || activeCanal.criador_email === user?.email);

  return (
    <div className="flex bg-gray-50" style={{ height: 'calc(100vh - 40px)' }}>

      {/* ── SIDEBAR ── */}
      <div className="w-64 flex flex-col flex-shrink-0 border-r border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #1a3150 100%)' }}>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-white font-bold text-sm">Chat Interno</h2>
              <p className="text-blue-300/70 text-[10px]">Villela Exchange</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* CANAIS */}
          <button onClick={() => setShowCanais(p => !p)}
            className="w-full flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition">
            {showCanais ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Canais
          </button>
          {showCanais && (
            <div className="space-y-0.5">
              {todosCanais.map(canal => {
                const isActive = active.type === 'canal' && active.id === canal.id;
                const unread = unreadMap[canal.id] || 0;
                const podeConfig = isAdmin || (!canal.fixo && canal.criador_email === user?.email);
                return (
                  <div key={canal.id} className="group relative">
                    <button onClick={() => setActive({ type: 'canal', id: canal.id })}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${isActive ? 'bg-[#0f1e35] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <span className="text-base flex-shrink-0">{canal.icone}</span>
                      <span className="text-sm font-medium flex-1 truncate">{canal.nome}</span>
                      {unread > 0 && !isActive && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>
                    {/* Engrenagem de configuração */}
                    {(podeConfig || isAdmin) && (
                      <button
                        onClick={() => setGerenciarCanal(canal)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition ${isActive ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'}`}
                        title="Gerenciar canal"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              {/* Botão novo canal */}
              <button onClick={() => setShowNovoCanalModal(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition text-xs mt-1">
                <Plus className="w-3 h-3" /> Novo canal
              </button>
            </div>
          )}

          {/* MENSAGENS DIRETAS */}
          <div className="mt-3">
            <button onClick={() => setShowDMs(p => !p)}
              className="w-full flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition">
              {showDMs ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Mensagens Diretas
            </button>
            {showDMs && (
              <div className="space-y-0.5">
                {outrosUsuarios.map(u => {
                  const dmKey = getDmKey(user?.email, u.email);
                  const isActive = active.type === 'dm' && active.email === u.email;
                  const unread = unreadMap[dmKey] || 0;
                  const online = isOnline(u);
                  const nome = u.nome_tratamento || u.full_name || u.email;
                  return (
                    <button key={u.email}
                      onClick={() => setActive({ type: 'dm', id: u.id, email: u.email, nome })}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all ${isActive ? 'bg-[#0f1e35] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <div className="relative flex-shrink-0">
                        <UserAvatar nome={nome} size="sm" />
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${isActive ? 'border-[#0f1e35]' : 'border-white'} ${online ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                      </div>
                      <span className="text-sm font-medium flex-1 truncate">{nome}</span>
                      {unread > 0 && !isActive && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>
                  );
                })}
                {outrosUsuarios.length === 0 && <p className="text-xs text-gray-400 px-3 py-2 italic">Nenhum outro usuário</p>}
              </div>
            )}
          </div>
        </div>

        {user && (
          <div className="p-3 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 px-2">
              <div className="relative flex-shrink-0">
                <UserAvatar nome={user.nome_tratamento || user.full_name} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{user.nome_tratamento || user.full_name}</p>
                <p className="text-[10px] text-emerald-500">● Online</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ÁREA PRINCIPAL ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white shadow-sm flex items-center gap-3 flex-shrink-0">
          {active.type === 'canal'
            ? <span className="text-2xl">{activeCanal?.icone || '💬'}</span>
            : <div className="relative"><UserAvatar nome={active.nome} size="lg" /></div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-gray-900">
                {active.type === 'canal' ? (activeCanal?.nome || active.id) : (active.nome || active.email)}
              </h1>
              {active.type === 'dm' && (
                <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  <Lock className="w-2.5 h-2.5" /> Privado
                </span>
              )}
              {active.type === 'canal' && activeCanal && !activeCanal.fixo && (
                <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                  {(activeCanal.membros || []).length} membro(s)
                </span>
              )}
            </div>
            {headerSub && <p className="text-xs text-gray-400">{headerSub}</p>}
          </div>
          <div className="flex items-center gap-2">
            {podeGerenciarCanal && (
              <button onClick={() => setGerenciarCanal(activeCanal)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-xl transition">
                <Settings className="w-4 h-4" /> Membros
              </button>
            )}
            <button onClick={gerarMeet} disabled={criandoMeet}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-semibold rounded-xl transition shadow-sm disabled:opacity-50">
              {criandoMeet ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Video className="w-4 h-4" />}
              {criandoMeet ? 'Criando...' : 'Iniciar Meet'}
            </button>
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              {active.type === 'canal'
                ? <><span className="text-5xl mb-4">{activeCanal?.icone || '💬'}</span>
                    <p className="text-lg font-bold text-gray-700">Bem-vindo ao #{activeCanal?.nome || active.id}!</p>
                    <p className="text-sm text-gray-400 mt-1">Este é o início do canal. Envie a primeira mensagem!</p></>
                : <><Lock className="w-12 h-12 text-gray-200 mb-4" />
                    <p className="text-lg font-bold text-gray-700">Conversa privada com {active.nome}</p>
                    <p className="text-sm text-gray-400 mt-1">Apenas vocês dois podem ver estas mensagens.</p></>
              }
            </div>
          ) : grouped.map((item, i) => {
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
                  {!isOwn && <span className="text-xs text-gray-500 font-semibold mb-1 ml-1">{msg.remetente_nome}</span>}
                  <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${isOwn ? 'bg-[#0f1e35] text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                    {msg.meet_link ? (
                      <div className="space-y-2">
                        <p className="text-sm">🎥 Reunião iniciada!</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => setMeetModal(msg.meet_link)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] text-white text-xs font-semibold rounded-xl hover:bg-[#1557b0] transition">
                            <Video className="w-3.5 h-3.5" /> Entrar no Meet
                          </button>
                          <button onClick={() => { navigator.clipboard.writeText(msg.meet_link); toast.success('Copiado!'); }}
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition ${isOwn ? 'border-white/30 text-white/80 hover:bg-white/10' : 'border-blue-200 text-blue-600 hover:bg-blue-50'}`}>
                            <Copy className="w-3.5 h-3.5" /> Copiar
                          </button>
                        </div>
                      </div>
                    ) : msg.arquivo_url ? (
                      <div className="space-y-1.5">
                        {msg.texto && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-1">{msg.texto}</p>}
                        {msg.arquivo_tipo?.startsWith('image/') ? (
                          <a href={msg.arquivo_url} target="_blank" rel="noopener noreferrer">
                            <img src={msg.arquivo_url} alt={msg.arquivo_nome} className="max-w-xs max-h-60 rounded-xl object-cover border border-white/20" />
                          </a>
                        ) : msg.arquivo_tipo?.startsWith('video/') ? (
                          <video src={msg.arquivo_url} controls className="max-w-xs rounded-xl border border-white/20" style={{ maxHeight: '200px' }} />
                        ) : msg.arquivo_tipo?.startsWith('audio/') ? (
                          <audio src={msg.arquivo_url} controls className="w-full max-w-xs" />
                        ) : (
                          <a href={msg.arquivo_url} target="_blank" rel="noopener noreferrer" download={msg.arquivo_nome}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${isOwn ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'}`}>
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{msg.arquivo_nome}</span>
                            <Download className="w-3.5 h-3.5 flex-shrink-0 ml-auto" />
                          </a>
                        )}
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
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-[#1a3150] transition">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={enviando}
              className="p-1.5 text-gray-400 hover:text-[#1a3150] hover:bg-gray-200 rounded-lg transition flex-shrink-0"
              title="Enviar arquivo (imagem, documento, áudio, vídeo)"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <textarea ref={inputRef} value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
              placeholder={active.type === 'canal' ? `Mensagem em #${activeCanal?.nome || active.id}...` : `Mensagem privada para ${active.nome || active.email}...`}
              rows={1}
              className="flex-1 text-sm bg-transparent resize-none focus:outline-none text-gray-800 placeholder-gray-400 max-h-32"
              style={{ minHeight: '24px' }}
            />
            <button onClick={() => enviarMensagem()} disabled={(!texto.trim() && !enviando) || enviando}
              className="p-2 bg-[#0f1e35] text-white rounded-xl hover:bg-[#1a3150] disabled:opacity-40 transition flex-shrink-0">
              {enviando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 px-1">
            {active.type === 'dm' && <><Lock className="w-2.5 h-2.5 inline mr-1" />Conversa privada · </>}
            Enter para enviar · Shift+Enter para nova linha · 📎 Clipe para anexos (máx. 20MB)
          </p>
        </div>
      </div>

      {meetModal && <MeetModal link={meetModal} onClose={() => setMeetModal(null)} />}

      {showNovoCanalModal && (
        <NovoCanalModal
          usuarios={todosUsuariosAtivos}
          userEmail={user?.email}
          onSave={criarCanal}
          onClose={() => setShowNovoCanalModal(false)}
        />
      )}

      {gerenciarCanal && (
        <GerenciarMembrosModal
          canal={gerenciarCanal}
          usuarios={todosUsuariosAtivos}
          isAdmin={isAdmin}
          userEmail={user?.email}
          onUpdate={atualizarCanal}
          onDelete={removerCanal}
          onClose={() => setGerenciarCanal(null)}
          membrosIniciais={todosCanais.find(c => c.id === gerenciarCanal.id)?.membros ?? gerenciarCanal.membros ?? []}
        />
      )}
    </div>
  );
}