import { Phone, MessageSquare, Clock, ArrowRight, User, Zap, Inbox, CheckCircle2 } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const COLUNAS = [
  { key: 'indicacao', label: 'Indicações', icon: Zap, color: '#00D4AA', bg: 'rgba(0,212,170,0.10)' },
  { key: 'carteira', label: 'Agenda do Dia', icon: Clock, color: '#818cf8', bg: 'rgba(99,102,241,0.10)' },
  { key: 'concluidos', label: 'Concluídos hoje', icon: CheckCircle2, color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
];

export default function FilaContatoKanban({ itens, onSelectItem }) {
  const pendentes = itens.filter(i => i.status === 'pendente');
  const concluidos = itens.filter(i => i.status !== 'pendente');

  const colunas = {
    indicacao: pendentes.filter(i => i.tipo_origem === 'indicacao').sort((a, b) => a.prioridade - b.prioridade || a.posicao - b.posicao),
    carteira: pendentes.filter(i => i.tipo_origem === 'carteira').sort((a, b) => a.prioridade - b.prioridade || a.posicao - b.posicao),
    concluidos,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pb-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
      {COLUNAS.map(col => {
        const lista = colunas[col.key] || [];
        return (
          <div key={col.key} className="flex flex-col rounded-2xl min-w-0" style={{ background: col.bg, border: `1px solid ${col.color}33` }}>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-t-2xl" style={{ borderBottom: `1px solid ${col.color}33` }}>
              <div className="flex items-center gap-2">
                <col.icon className="w-3.5 h-3.5" style={{ color: col.color }} />
                <p className="text-sm font-bold" style={{ color: col.color }}>{col.label}</p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${col.color}22`, color: col.color }}>{lista.length}</span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px]">
              {lista.length === 0 && (
                <p className="text-center text-[11px] py-6" style={{ color: AURORA.textMuted }}>
                  {col.key === 'concluidos' ? 'Nada concluído ainda hoje' : 'Sem itens'}
                </p>
              )}
              {lista.map(item => (
                <button key={item.id} onClick={() => onSelectItem(item)}
                  className="w-full text-left rounded-xl p-3 transition"
                  style={{
                    background: item.status !== 'pendente' ? 'rgba(52,211,153,0.06)' : AURORA.surface,
                    border: `1px solid ${item.status !== 'pendente' ? 'rgba(52,211,153,0.25)' : AURORA.border}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = col.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = item.status !== 'pendente' ? 'rgba(52,211,153,0.25)' : AURORA.border}>
                  <div className="flex items-start gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: `${col.color}22`, color: col.color }}>
                      {item.nome?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: AURORA.text }}>{item.nome}</p>
                      <p className="text-[10px] flex items-center gap-1" style={{ color: AURORA.textMuted }}>
                        <Phone className="w-2.5 h-2.5" />{item.telefone || '—'}
                      </p>
                    </div>
                  </div>
                  {item.produto && (
                    <p className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-block mb-1" style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent }}>{item.produto}</p>
                  )}
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    {item.vendedor_nome && <span className="text-[9px] flex items-center gap-0.5" style={{ color: AURORA.textMuted }}><User className="w-2.5 h-2.5" />{item.vendedor_nome.split(' ')[0]}</span>}
                    {item.tentativas > 0 && <span className="text-[9px] flex items-center gap-0.5" style={{ color: '#fbbf24' }}><ArrowRight className="w-2.5 h-2.5" />{item.tentativas}x</span>}
                    {item.status !== 'pendente' && <span className="text-[9px] font-semibold" style={{ color: AURORA.green }}>{item.status === 'atendeu' ? 'Atendeu' : 'Não atendeu'}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}