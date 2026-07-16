import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Clock, Phone, CheckCircle2, XCircle, RotateCcw, TrendingUp,
  Video, X, MoreVertical, ExternalLink, Calendar
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { mensagemNaoDiaUtil } from '@/lib/diaUtil';

const CONNECTOR_ID = '69fb9176f017da4e4ddd9ff8';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #00D4AA, #0066cc)',
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
  'linear-gradient(135deg, #f43f5e, #f59e0b)',
];

function avatarGradient(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function MeetButton({ item }) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await base44.functions.invoke('criarMeetAgenda', {
        agenda_id: item.id,
        lead_nome: item.lead_nome,
        data_agendada: item.data_agendada,
        horario_inicio: item.horario || '09:00',
        com_meet: true,
      });
      if (res.data?.meet_link) {
        toast.success('Link Meet gerado!');
        window.open(res.data.meet_link, '_blank');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || '';
      if (msg.toLowerCase().includes('connection') || msg.toLowerCase().includes('no active')) {
        const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
        window.open(url, '_blank');
        toast.info('Conecte sua conta Google e tente novamente');
      } else {
        toast.error('Erro ao gerar Meet: ' + msg);
      }
    }
    setLoading(false);
  };

  if (item.meet_link) {
    return (
      <a href={item.meet_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
        className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-semibold transition flex-shrink-0"
        style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
        <Video className="w-2.5 h-2.5" /> Meet <ExternalLink className="w-2 h-2" />
      </a>
    );
  }

  return (
    <button onClick={handleGenerate} disabled={loading}
      className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-semibold transition flex-shrink-0"
      style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
      {loading
        ? <div className="w-2.5 h-2.5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#818cf8' }} />
        : <Video className="w-2.5 h-2.5" />}
      Meet
    </button>
  );
}

export default function AgendaCard({ item, onAction, onDelete, onPipeline, onClienteClick, updating, showGerente, isDragging }) {
  const [reagendando, setReagendando] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [editando, setEditando] = useState(false);
  const [editData, setEditData] = useState(item.data_agendada);
  const [editHorario, setEditHorario] = useState(item.horario || '');
  const [menuOpen, setMenuOpen] = useState(false);

  const inicial = (item.lead_nome || '?').charAt(0).toUpperCase();
  const avatarBg = avatarGradient(item.lead_nome || '');
  const isPending = item.status === 'pendente';

  return (
    <div className="group relative rounded-xl p-2.5 transition-all cursor-grab active:cursor-grabbing"
      style={{
        background: isDragging ? 'rgba(0,212,170,0.08)' : '#1c2333',
        border: `1px solid ${isDragging ? 'rgba(0,212,170,0.4)' : 'rgba(0,212,170,0.12)'}`,
        opacity: updating === item.id ? 0.5 : 1,
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
      }}
      onMouseEnter={e => { if (!isDragging) e.currentTarget.style.borderColor = 'rgba(0,212,170,0.25)'; }}
      onMouseLeave={e => { if (!isDragging) e.currentTarget.style.borderColor = 'rgba(0,212,170,0.12)'; }}>

      {/* Top: avatar + name + menu */}
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0"
          style={{ background: avatarBg }}>
          {inicial}
        </div>
        <div className="flex-1 min-w-0">
          <button onClick={(e) => { e.stopPropagation(); onClienteClick?.(item.lead_id); }}
            className="text-xs font-bold text-left hover:underline truncate block w-full leading-tight"
            style={{ color: '#e6edf3' }}>
            {item.lead_nome}
          </button>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {item.horario && (
              <span className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: '#00D4AA' }}>
                <Clock className="w-2.5 h-2.5" /> {item.horario}
              </span>
            )}
            {item.lead_telefone && (
              <span className="text-[10px] flex items-center gap-0.5 truncate" style={{ color: 'rgba(230,237,243,0.45)' }}>
                <Phone className="w-2.5 h-2.5 flex-shrink-0" /> {item.lead_telefone}
              </span>
            )}
          </div>
          {showGerente && item.vendedor_nome && (
            <span className="inline-block text-[9px] mt-1 px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'rgba(0,212,170,0.1)', color: '#00D4AA' }}>
              {item.vendedor_nome.split(' ')[0]}
            </span>
          )}
        </div>

        {/* Menu / delete */}
        {!isPending && (
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(p => !p); }}
            className="p-1 rounded transition opacity-0 group-hover:opacity-100 flex-shrink-0"
            style={{ color: 'rgba(230,237,243,0.3)' }}>
            <MoreVertical className="w-3 h-3" />
          </button>
        )}
      </div>

      {menuOpen && (
        <div className="absolute top-7 right-1 z-10 rounded-lg shadow-2xl py-1 w-28"
          style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.2)' }}>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setEditando(true); }}
            className="w-full text-left px-2.5 py-1.5 text-[10px] transition flex items-center gap-1.5"
            style={{ color: 'rgba(230,237,243,0.7)' }}>
            <Calendar className="w-2.5 h-2.5" /> Editar data
          </button>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); if (confirm(`Excluir agendamento de "${item.lead_nome}"?`)) onDelete(item); }}
            className="w-full text-left px-2.5 py-1.5 text-[10px] transition flex items-center gap-1.5"
            style={{ color: '#f87171' }}>
            <X className="w-2.5 h-2.5" /> Excluir
          </button>
        </div>
      )}

      {/* Reagendado info */}
      {item.status === 'reagendado' && item.nova_data && (
        <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: '#60a5fa' }}>
          <RotateCcw className="w-2.5 h-2.5" /> {format(parseISO(item.nova_data), 'dd/MM', { locale: ptBR })}
        </p>
      )}

      {/* Inline edit */}
      {editando && (
        <div className="mt-2 flex items-center gap-1 flex-wrap p-1.5 rounded-lg"
          style={{ background: 'rgba(0,212,170,0.06)' }}>
          <input type="date" value={editData} onChange={e => setEditData(e.target.value)}
            className="text-[10px] px-1.5 py-0.5 rounded focus:outline-none"
            style={{ background: '#0d1117', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }} />
          <input type="time" value={editHorario} onChange={e => setEditHorario(e.target.value)}
            className="text-[10px] px-1.5 py-0.5 rounded focus:outline-none"
            style={{ background: '#0d1117', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }} />
          <button onClick={(e) => { e.stopPropagation(); const aviso = mensagemNaoDiaUtil(editData); if (aviso) { toast.error(aviso); return; } onAction(item, item.status, undefined, editData, editHorario); setEditando(false); }}
            className="text-[10px] px-2 py-0.5 rounded font-semibold" style={{ background: '#00D4AA', color: '#0d1117' }}>OK</button>
          <button onClick={(e) => { e.stopPropagation(); setEditando(false); }} className="text-[10px]" style={{ color: 'rgba(230,237,243,0.4)' }}>✕</button>
        </div>
      )}

      {/* Reagendar form */}
      {reagendando && (
        <div className="mt-2 flex items-center gap-1 p-1.5 rounded-lg"
          style={{ background: 'rgba(59,130,246,0.1)' }}>
          <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)}
            className="text-[10px] px-1.5 py-0.5 rounded focus:outline-none"
            style={{ background: '#0d1117', border: '1px solid rgba(59,130,246,0.3)', color: '#e6edf3' }} />
          <button onClick={(e) => { e.stopPropagation(); if (!novaData) return; onAction(item, 'reagendado', novaData); setReagendando(false); }}
            className="text-[10px] px-2 py-0.5 rounded font-semibold text-white" style={{ background: '#2563eb' }}>OK</button>
          <button onClick={(e) => { e.stopPropagation(); setReagendando(false); }} className="text-[10px]" style={{ color: 'rgba(230,237,243,0.4)' }}>✕</button>
        </div>
      )}

      {/* Quick actions — pending only */}
      {isPending && !editando && !reagendando && (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          <MeetButton item={item} />
          <button onClick={(e) => { e.stopPropagation(); onAction(item, 'realizado'); }} disabled={updating === item.id}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] font-semibold text-white transition flex-shrink-0"
            style={{ background: '#059669' }}>
            <CheckCircle2 className="w-2.5 h-2.5" /> Feito
          </button>
          <button onClick={(e) => { e.stopPropagation(); onAction(item, 'nao_atendeu'); }} disabled={updating === item.id}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] font-semibold transition flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
            <XCircle className="w-2.5 h-2.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setReagendando(true); setNovaData(''); }}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] font-semibold transition flex-shrink-0"
            style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onPipeline(item); }}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] font-semibold transition flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
            <TrendingUp className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}