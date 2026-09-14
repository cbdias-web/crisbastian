import { Phone, ArrowRight, User, CheckCircle2, MoreVertical, Pencil, RotateCcw, Calendar, Mail, AlertTriangle, BadgeCheck, PhoneMissed, Ghost, Clock } from 'lucide-react';
import { waLink } from './QrCodeContato';
import { STATUS_LABEL, STATUS_MENU, STALE_HORAS, LIMITE_TENTATIVAS_GHOSTING, horasParadoItem, fmtDataLead } from './filaContatoUtils';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

// Card de lead da esteira de Fila de Contatos: contador de dias parado,
// alerta de inércia (>48h), tentativas/ghosting, retorno agendado e ações rápidas.
export default function FilaContatoCard({ item, col, isPendenteCol, movendo, menuAberto, isAdmin,
  innerRef, draggableProps, dragHandleProps, isDragging, style,
  onMenuToggle, onSelect, onMover, onQualificar, onTentativa, onExcluir }) {
  const horas = horasParadoItem(item);
  const dias = Math.floor(horas / 24);
  const stale = item.status === 'atendeu' && horas >= STALE_HORAS;
  const tentativas = item.tentativas_contato || 0;
  const ghosting = item.status === 'atendeu' && tentativas >= LIMITE_TENTATIVAS_GHOSTING;

  return (
    <div ref={innerRef} {...draggableProps} {...dragHandleProps}
      onClick={() => !menuAberto && onSelect(item)}
      className={`rounded-xl p-2.5 transition cursor-grab active:cursor-grabbing relative ${stale ? 'stale-card' : ''}`}
      style={{
        background: isPendenteCol ? AURORA.surface : `${col.color}0d`,
        border: `1px solid ${isDragging ? col.color : (isPendenteCol ? AURORA.border : `${col.color}33`)}`,
        ...style,
      }}>
      <button onClick={(e) => { e.stopPropagation(); onMenuToggle(item); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-1.5 right-1.5 p-1 rounded-md transition z-10"
        style={{ color: AURORA.textMuted, background: 'rgba(255,255,255,0.04)' }}
        onMouseEnter={e => e.currentTarget.style.color = AURORA.accent}
        onMouseLeave={e => e.currentTarget.style.color = AURORA.textMuted}>
        <MoreVertical className="w-3 h-3" />
      </button>
      {menuAberto && (
        <div className="absolute top-7 right-1 z-50 rounded-xl py-1 shadow-2xl min-w-[170px]"
          style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}
          onClick={e => e.stopPropagation()}>
          <button onClick={(e) => { e.stopPropagation(); onMenuToggle(null); onSelect(item); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition"
            style={{ color: AURORA.text }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Pencil className="w-3 h-3" /> Editar / Manutenção
          </button>
          <div style={{ borderTop: `1px solid ${AURORA.border}`, margin: '2px 0' }} />
          <p className="px-3 py-1 text-[9px] uppercase tracking-wider" style={{ color: AURORA.textMuted }}>Mover para</p>
          {STATUS_MENU.map(sm => (
            <button key={sm.key} disabled={movendo} onClick={(e) => { e.stopPropagation(); onMover(item, sm.key); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition disabled:opacity-40"
              style={{ color: AURORA.text }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <ArrowRight className="w-3 h-3" /> {sm.label}
            </button>
          ))}
          {item.status === 'atendeu' && (
            <>
              <div style={{ borderTop: `1px solid ${AURORA.border}`, margin: '2px 0' }} />
              <button disabled={movendo} onClick={(e) => { e.stopPropagation(); onTentativa(item); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition disabled:opacity-40"
                style={{ color: '#fbbf24' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <PhoneMissed className="w-3 h-3" /> Tentativa sem retorno
              </button>
              {ghosting && (
                <button disabled={movendo} onClick={(e) => { e.stopPropagation(); onMover(item, 'nutricao'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition disabled:opacity-40"
                  style={{ color: '#c084fc' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,132,252,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Ghost className="w-3 h-3" /> Mover p/ Nutrição (sugestão)
                </button>
              )}
            </>
          )}
          {!isPendenteCol && (
            <button disabled={movendo} onClick={(e) => { e.stopPropagation(); onMover(item, item.tipo_origem === 'indicacao' ? 'indicacao' : 'carteira'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition disabled:opacity-40"
              style={{ color: AURORA.text }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <RotateCcw className="w-3 h-3" /> Voltar à fila
            </button>
          )}
          {isAdmin && (
            <>
              <div style={{ borderTop: `1px solid ${AURORA.border}`, margin: '2px 0' }} />
              <button onClick={(e) => { e.stopPropagation(); onExcluir(item); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition"
                style={{ color: '#f87171' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Excluir da esteira
              </button>
            </>
          )}
        </div>
      )}
      <div className="flex items-start gap-2 mb-1.5 pr-5">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `${col.color}22`, color: col.color }}>
          {item.nome?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: AURORA.text }}>{item.nome}</p>
          <p className="text-[10px] flex items-center gap-1 truncate" style={{ color: AURORA.textMuted }}>
            <Phone className="w-2.5 h-2.5 flex-shrink-0" />{item.telefone || '—'}
          </p>
        </div>
      </div>
      {item.produto && (
        <p className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-block mb-1" style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent }}>{item.produto}</p>
      )}
      {item.tipo_origem === 'indicacao' && (item.parceiro_nome || item.parceiro_telefone || item.parceiro_email) && (
        <div className="rounded-lg px-1.5 py-1 mb-1" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.18)' }}>
          <p className="text-[9px] font-semibold truncate" style={{ color: AURORA.accent }}>🔗 {item.parceiro_nome || 'Indicador'}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {item.parceiro_telefone && (
              <a href={waLink(item.parceiro_telefone) || undefined} target="_blank" rel="noopener noreferrer"
                className="text-[9px] flex items-center gap-0.5 font-semibold underline" style={{ color: AURORA.textMuted }}>
                <Phone className="w-2.5 h-2.5" /> {item.parceiro_telefone}
              </a>
            )}
            {item.parceiro_email && (
              <a href={`mailto:${item.parceiro_email}`}
                className="text-[9px] flex items-center gap-0.5 font-semibold underline" style={{ color: AURORA.textMuted }}>
                <Mail className="w-2.5 h-2.5" /> e-mail
              </a>
            )}
          </div>
        </div>
      )}
      {(item.data_fila || item.created_date) && (
        <p className="text-[9px] flex items-center gap-0.5 mb-1" style={{ color: AURORA.textMuted }} title="Data do lead">
          <Calendar className="w-2.5 h-2.5 flex-shrink-0" />{fmtDataLead(item.created_date)}
        </p>
      )}
      {/* Contadores de tempo parado + retorno agendado (esteiras críticas) */}
      {!isPendenteCol && (
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {stale && (
            <span className="text-[9px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }}>
              <AlertTriangle className="w-2.5 h-2.5" /> {dias > 0 ? `${dias}d` : `${Math.floor(horas)}h`} sem interação
            </span>
          )}
          {!stale && horas >= 1 && (
            <span className="text-[9px] flex items-center gap-0.5" style={{ color: dias >= 1 ? '#fbbf24' : AURORA.textMuted }} title="Tempo parado nesta esteira">
              <Clock className="w-2.5 h-2.5" /> {dias > 0 ? `${dias}d parado` : `${Math.floor(horas)}h parado`}
            </span>
          )}
          {item.status === 'atendeu' && item.proximo_contato && (
            <span className="text-[9px] flex items-center gap-0.5 font-semibold" style={{ color: AURORA.accent }}
              title="Retorno obrigatório agendado">
              📅 {item.proximo_contato.split('-').reverse().join('/')}{item.proximo_contato_hora ? ` ${item.proximo_contato_hora}` : ''}
            </span>
          )}
          {item.status === 'atendeu' && tentativas > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
              style={ghosting
                ? { background: 'rgba(192,132,252,0.15)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.4)' }
                : { background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
              {ghosting ? <Ghost className="w-2.5 h-2.5" /> : null} {ghosting ? 'Sem retorno' : `T${tentativas}`}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        {item.vendedor_nome && <span className="text-[9px] flex items-center gap-0.5 truncate" style={{ color: AURORA.textMuted }}><User className="w-2.5 h-2.5 flex-shrink-0" />{item.vendedor_nome.split(' ')[0]}</span>}
        {item.tentativas > 0 && <span className="text-[9px] flex items-center gap-0.5" style={{ color: '#fbbf24' }}><ArrowRight className="w-2.5 h-2.5" />{item.tentativas}x</span>}
        {!isPendenteCol && (
          <span className="text-[9px] font-semibold flex items-center gap-0.5" style={{ color: col.color }}>
            <CheckCircle2 className="w-2.5 h-2.5" />{STATUS_LABEL[item.status] || item.status}
          </span>
        )}
      </div>
      {/* Ações rápidas (Em Contato): qualificar + tentativa sem retorno */}
      {item.status === 'atendeu' && (
        <div className="flex gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
          <button onClick={() => onQualificar(item)} disabled={movendo}
            title="Ação rápida: qualificar o lead e criar tarefa de proposta comercial (prazo 24h)"
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold transition disabled:opacity-40"
            style={{ background: 'rgba(59,130,249,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,249,0.35)' }}>
            <BadgeCheck className="w-3 h-3" /> Qualificar
          </button>
          <button onClick={() => onTentativa(item)} disabled={movendo}
            title="Registrar tentativa de contato sem retorno do cliente"
            className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition disabled:opacity-40"
            style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
            <PhoneMissed className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}