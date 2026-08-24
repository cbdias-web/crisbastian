import { Phone, Clock, ArrowRight, User, Zap, CheckCircle2, PhoneCall, XCircle, Trophy, BadgeCheck } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const STATUS_LABEL = {
  pendente: 'Pendente',
  atendeu: 'Em Contato',
  nao_atendeu: 'Não Atendeu',
  qualificado: 'Qualificado',
  convertido: 'Convertido',
  descartado: 'Desqualificado',
};

const COLUNAS = [
  { key: 'indicacao', label: 'Indicações', icon: Zap, color: '#00D4AA', bg: 'rgba(0,212,170,0.08)', statuses: ['pendente'], origem: 'indicacao' },
  { key: 'carteira', label: 'Agenda do Dia', icon: Clock, color: '#818cf8', bg: 'rgba(99,102,241,0.08)', statuses: ['pendente'], origem: 'carteira' },
  { key: 'em_contato', label: 'Em Contato', icon: PhoneCall, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', statuses: ['atendeu'] },
  { key: 'desqualificado', label: 'Desqualificado', icon: XCircle, color: '#f87171', bg: 'rgba(248,113,113,0.08)', statuses: ['descartado'] },
  { key: 'qualificado', label: 'Qualificado', icon: BadgeCheck, color: '#60a5fa', bg: 'rgba(59,130,249,0.08)', statuses: ['qualificado'] },
  { key: 'convertido', label: 'Convertido', icon: Trophy, color: '#34d399', bg: 'rgba(52,211,153,0.08)', statuses: ['convertido'] },
];

export default function FilaContatoKanban({ itens, onSelectItem }) {
  const colunas = {};
  for (const col of COLUNAS) {
    let lista = itens.filter(i => col.statuses.includes(i.status));
    if (col.origem) lista = lista.filter(i => i.tipo_origem === col.origem);
    if (col.key === 'indicacao' || col.key === 'carteira') {
      lista = lista.sort((a, b) => a.prioridade - b.prioridade || a.posicao - b.posicao);
    }
    colunas[col.key] = lista;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 pb-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
      {COLUNAS.map(col => {
        const lista = colunas[col.key] || [];
        const isPendenteCol = col.key === 'indicacao' || col.key === 'carteira';
        return (
          <div key={col.key} className="flex flex-col rounded-2xl min-w-0" style={{ background: col.bg, border: `1px solid ${col.color}33` }}>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-t-2xl flex-shrink-0" style={{ borderBottom: `1px solid ${col.color}33` }}>
              <div className="flex items-center gap-1.5 min-w-0">
                <col.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: col.color }} />
                <p className="text-xs font-bold truncate" style={{ color: col.color }}>{col.label}</p>
              </div>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${col.color}22`, color: col.color }}>{lista.length}</span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[140px]">
              {lista.length === 0 && (
                <p className="text-center text-[11px] py-6" style={{ color: AURORA.textMuted }}>
                  {isPendenteCol ? 'Sem itens' : '—'}
                </p>
              )}
              {lista.map(item => (
                <button key={item.id} onClick={() => onSelectItem(item)}
                  className="w-full text-left rounded-xl p-2.5 transition"
                  style={{
                    background: isPendenteCol ? AURORA.surface : `${col.color}0d`,
                    border: `1px solid ${isPendenteCol ? AURORA.border : `${col.color}33`}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = col.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = isPendenteCol ? AURORA.border : `${col.color}33`}>
                  <div className="flex items-start gap-2 mb-1.5">
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
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    {item.vendedor_nome && <span className="text-[9px] flex items-center gap-0.5 truncate" style={{ color: AURORA.textMuted }}><User className="w-2.5 h-2.5 flex-shrink-0" />{item.vendedor_nome.split(' ')[0]}</span>}
                    {item.tentativas > 0 && <span className="text-[9px] flex items-center gap-0.5" style={{ color: '#fbbf24' }}><ArrowRight className="w-2.5 h-2.5" />{item.tentativas}x</span>}
                    {!isPendenteCol && (
                      <span className="text-[9px] font-semibold flex items-center gap-0.5" style={{ color: col.color }}>
                        <CheckCircle2 className="w-2.5 h-2.5" />{STATUS_LABEL[item.status] || item.status}
                      </span>
                    )}
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