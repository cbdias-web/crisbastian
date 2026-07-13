import React from 'react';
import { X, Mail, Shield, Clock, Wifi, Activity, TrendingUp, Calendar, Users, LogIn, LogOut } from 'lucide-react';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  textDim: 'rgba(230,237,243,0.35)',
};

const statusColors = {
  online: { dot: '#10b981', bg: 'rgba(16,185,129,0.12)', text: '#34d399', label: 'Online' },
  ausente: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', label: 'Ausente' },
  offline: { dot: '#6b7280', bg: 'rgba(107,114,128,0.12)', text: '#9ca3af', label: 'Offline' },
};

export default function UserDetailPopup({ usuario, onClose }) {
  if (!usuario) return null;
  const sc = statusColors[usuario.status] || statusColors.offline;
  const initials = (usuario.full_name || usuario.email || 'U').charAt(0).toUpperCase();

  const atuaItems = [
    { label: 'Vendas', value: usuario.atua.vendas, color: '#00D4AA', icon: TrendingUp },
    { label: 'Mensagens Chat', value: usuario.atua.mensagens, color: '#60a5fa', icon: Activity },
    { label: 'Chamados', value: usuario.atua.chamados, color: '#fbbf24', icon: Shield },
    { label: 'Interacoes', value: usuario.atua.interacoes, color: '#a78bfa', icon: Users },
    { label: 'Agenda', value: usuario.atua.agendas, color: '#34d399', icon: Calendar },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="rounded-2xl w-full max-w-sm overflow-hidden"
        style={{
          background: AURORA.surface,
          border: `1px solid ${AURORA.border}`,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,170,0.1)',
        }}>

        {/* Header com gradiente */}
        <div className="relative px-5 pt-5 pb-4"
          style={{ background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 60%, #16213e 100%)' }}>
          <button onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg transition hover:bg-[rgba(0,212,170,0.1)]"
            style={{ color: AURORA.textMuted }}>
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', boxShadow: '0 4px 16px rgba(0,212,170,0.3)' }}>
              {initials}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-base truncate" style={{ color: AURORA.text }}>
                {usuario.nome_tratamento || usuario.full_name || '—'}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full" style={{ background: sc.dot }} />
                <span className="text-xs font-medium" style={{ color: sc.text }}>{sc.label}</span>
                {usuario.ativo === false && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">Bloqueado</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info basica */}
        <div className="px-5 py-3 space-y-2" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: AURORA.textMuted }}>
            <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: AURORA.accent }} />
            <span className="truncate" style={{ color: AURORA.text }}>{usuario.email || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: usuario.isAdminUser ? '#fbbf24' : '#60a5fa' }} />
            <span style={{ color: usuario.isAdminUser ? '#fbbf24' : '#60a5fa' }}>
              {usuario.isAdminUser ? 'Administrador' : 'Usuario'}
              {!usuario.isAdminUser && usuario.menus_acesso && (
                <span style={{ color: AURORA.textMuted }}> ({usuario.menus_acesso.length} menus)</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: AURORA.accent }} />
            <span style={{ color: AURORA.text }}>
              {usuario.acesso.data === 'Nunca acessou' ? (
                <span style={{ color: AURORA.textDim }}>Nunca acessou</span>
              ) : (
                <>Ultimo: {usuario.acesso.data} as {usuario.acesso.hora} <span style={{ color: AURORA.textMuted }}>({usuario.acesso.relativo})</span></>
              )}
            </span>
          </div>
        </div>

        {/* Sessao resumo: inicio, fim, duracao total */}
        <div className="px-5 py-3 grid grid-cols-3 gap-2" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="text-center rounded-lg py-2" style={{ background: AURORA.surface2 }}>
            <LogIn className="w-3 h-3 mx-auto mb-1" style={{ color: AURORA.accent }} />
            <p className="text-[9px] uppercase tracking-wide" style={{ color: AURORA.textMuted }}>Primeiro Acesso</p>
            <p className="text-xs font-bold" style={{ color: AURORA.text }}>{usuario.sessao?.inicio || '—'}</p>
          </div>
          <div className="text-center rounded-lg py-2" style={{ background: AURORA.surface2 }}>
            <LogOut className="w-3 h-3 mx-auto mb-1" style={{ color: usuario.sessao?.fim === 'Em sessão' ? '#34d399' : AURORA.textMuted }} />
            <p className="text-[9px] uppercase tracking-wide" style={{ color: AURORA.textMuted }}>Ultima Saida</p>
            <p className="text-xs font-bold" style={{ color: usuario.sessao?.fim === 'Em sessão' ? '#34d399' : AURORA.text }}>{usuario.sessao?.fim || '—'}</p>
          </div>
          <div className="text-center rounded-lg py-2" style={{ background: AURORA.surface2 }}>
            <Activity className="w-3 h-3 mx-auto mb-1" style={{ color: AURORA.accent }} />
            <p className="text-[9px] uppercase tracking-wide" style={{ color: AURORA.textMuted }}>Tempo Total</p>
            <p className="text-xs font-bold" style={{ color: AURORA.accent }}>{usuario.sessao?.duracao || '—'}</p>
          </div>
        </div>

        {/* Lista de sessoes individuais */}
        {usuario.sessao?.sessoes?.length > 0 && (
          <div className="px-5 py-3" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: AURORA.accent }}>
                Sessoes do Periodo
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                {usuario.sessao.sessoes.length} sessao(oes)
              </span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {usuario.sessao.sessoes.map((s, i) => {
                const sInicio = new Date(s.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const sFim = s.ativa && usuario.status === 'online'
                  ? 'Em sessão'
                  : (s.fim
                    ? new Date(s.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : (s.ultimo_heartbeat
                      ? new Date(s.ultimo_heartbeat).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '*'
                      : '—'));
                const sFimMs = s.fim ? new Date(s.fim).getTime() : (s.ultimo_heartbeat ? new Date(s.ultimo_heartbeat).getTime() : Date.now());
                const sDurMin = Math.max(0, Math.round((sFimMs - new Date(s.inicio).getTime()) / 1000 / 60));
                const sDur = sDurMin < 60 ? `${sDurMin} min` : `${Math.floor(sDurMin / 60)}h ${sDurMin % 60}min`;
                const dataSessao = new Date(s.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                return (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(0,212,170,0.1)', color: AURORA.accent }}>
                      {dataSessao}
                    </span>
                    <span style={{ color: AURORA.textMuted }}>de</span>
                    <span className="font-semibold" style={{ color: AURORA.text }}>{sInicio}</span>
                    <span style={{ color: AURORA.textMuted }}>as</span>
                    <span className="font-semibold" style={{ color: sFim === 'Em sessão' ? '#34d399' : AURORA.text }}>{sFim}</span>
                    <span className="ml-auto font-bold" style={{ color: AURORA.accent }}>{sDur}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] mt-1.5" style={{ color: AURORA.textDim }}>* horario aproximado (ultimo sinal de vida)</p>
          </div>
        )}

        {/* Atuacoes */}
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-wide font-bold mb-2" style={{ color: AURORA.accent }}>Atuacoes no Periodo</p>
          <div className="grid grid-cols-1 gap-1.5">
            {atuaItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: item.color }} />
                  <span className="text-xs flex-1" style={{ color: AURORA.textMuted }}>{item.label}</span>
                  <span className="text-sm font-bold" style={{ color: item.value > 0 ? item.color : AURORA.textDim }}>
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mt-3 flex items-center justify-between px-3 py-2.5 rounded-lg"
            style={{ background: 'rgba(0,212,170,0.08)', border: `1px solid ${AURORA.border}` }}>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: AURORA.accent }}>Total de Atuacoes</span>
            <span className="text-lg font-bold" style={{ color: AURORA.accent }}>{usuario.totalAtua}</span>
          </div>
        </div>
      </div>
    </div>
  );
}