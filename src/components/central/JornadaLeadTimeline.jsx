import {
  Inbox, UserCheck, FileText, DollarSign, Clock, XCircle, Circle,
} from 'lucide-react';

const AURORA = {
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  green: '#34d399',
  purple: '#a78bfa',
  warning: '#fbbf24',
  danger: '#f87171',
};

const fmt = (v) => v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

// Reconstrói a linha do tempo da jornada a partir dos campos do LeadIndicacao,
// usando o array `historico` (quando presente) para datas precisas.
function buildMilestones(lead) {
  const hist = Array.isArray(lead.historico) ? lead.historico : [];
  const find = (status) => hist.find((h) => h.status === status);

  const reached = (status) => {
    // statuses em ordem — se o lead passou por um estágio mais avançado, os anteriores também foram
    const ord = ['novo', 'em_atendimento', 'convertido_cliente', 'convertido_contrato', 'convertido_venda'];
    const cur = ord.indexOf(lead.status);
    const tgt = ord.indexOf(status);
    if (cur < 0 || tgt < 0) return false;
    return cur >= tgt;
  };

  return [
    {
      key: 'recebida',
      label: 'Indicação recebida',
      icon: Inbox,
      done: true,
      data: lead.created_date,
      color: AURORA.accent,
    },
    {
      key: 'em_atendimento',
      label: 'Em atendimento',
      icon: Clock,
      done: lead.status === 'em_atendimento' || (lead.status !== 'novo' && lead.status !== 'descartado' && !!lead.cliente_id) || reached('em_atendimento'),
      data: find('em_atendimento')?.data || null,
      color: AURORA.warning,
    },
    {
      key: 'convertido_cliente',
      label: 'Cliente criado',
      icon: UserCheck,
      done: !!lead.cliente_id,
      data: find('convertido_cliente')?.data || (lead.cliente_id ? lead.convertido_em : null),
      color: AURORA.green,
      ref: lead.cliente_id,
    },
    {
      key: 'convertido_contrato',
      label: 'Contrato gerado',
      icon: FileText,
      done: !!lead.contrato_id,
      data: find('convertido_contrato')?.data || (lead.contrato_id ? lead.convertido_em : null),
      color: AURORA.purple,
      ref: lead.contrato_id,
    },
    {
      key: 'convertido_venda',
      label: 'Venda gerada',
      icon: DollarSign,
      done: !!lead.venda_id || lead.status === 'convertido_venda',
      data: find('convertido_venda')?.data || ((lead.venda_id || lead.status === 'convertido_venda') ? lead.convertido_em : null),
      color: AURORA.green,
      ref: lead.venda_id,
    },
    {
      key: 'descartado',
      label: 'Descartado',
      icon: XCircle,
      done: lead.status === 'descartado',
      data: find('descartado')?.data || (lead.status === 'descartado' ? lead.convertido_em : null),
      color: AURORA.danger,
    },
  ].filter((m) => m.key !== 'descartado' || m.done);
}

export default function JornadaLeadTimeline({ lead }) {
  const milestones = buildMilestones(lead);

  return (
    <div className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: AURORA.accent }}>
        Histórico da Jornada do Lead
      </p>
      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: AURORA.border }} />
        <div className="space-y-3 relative">
          {milestones.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.key} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                  style={{
                    background: m.done ? `${m.color}22` : AURORA.surface2,
                    border: `2px solid ${m.done ? m.color : AURORA.border}`,
                  }}>
                  {m.done
                    ? <Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                    : <Circle className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold" style={{ color: m.done ? AURORA.text : AURORA.textMuted }}>{m.label}</p>
                    {m.done && m.ref && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${m.color}15`, color: m.color }}>
                        #{String(m.ref).slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px]" style={{ color: AURORA.textMuted }}>
                    {m.done ? (fmt(m.data) || 'concluído') : 'aguardando'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}