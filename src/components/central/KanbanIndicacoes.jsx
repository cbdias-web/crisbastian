import { Trophy, UserCheck, RefreshCw } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  purple: '#a78bfa',
  green: '#34d399',
};

// Esteiras mais relevantes da jornada do lead indicado
const COLUNAS = [
  { key: 'novo', label: 'Novo', color: '#00D4AA', bg: 'rgba(0,212,170,0.12)' },
  { key: 'em_atendimento', label: 'Em Atendimento', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { key: 'convertido_cliente', label: '→ Cliente', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  { key: 'convertido_contrato', label: '→ Contrato', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  { key: 'convertido_venda', label: 'Venda Convertida', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  { key: 'rejeitado_compliance', label: 'Rejeitado Compliance', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  { key: 'descartado', label: 'Descartado', color: '#9ca3af', bg: 'rgba(100,100,100,0.2)' },
];

const fmtMoeda = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
const fmtData = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Kanban espelho da jornada das indicações: os cards movem sozinhos conforme
// o lead avança nas esteiras de origem (Fila de Contatos → Cliente → Contrato →
// Venda → Implantação). Somente leitura — a movimentação continua sendo feita
// nas esteiras; aqui é a visão consolidada da jornada para o Dash Parceiro.
export default function KanbanIndicacoes({ leads = [], getNome, getDoc, getGerente, onSelect, vendaPorId = {}, vendaPorDoc = {}, paidDocs = new Set() }) {
  const colunaDe = (lead) => {
    const docNorm = (getDoc(lead) || '').replace(/\D/g, '');
    const venda = lead.venda_id ? vendaPorId[lead.venda_id] : vendaPorDoc[docNorm];
    const rejeitada = lead.status === 'rejeitado_compliance';
    const vendaEfetivada = !rejeitada && (lead.status === 'convertido_venda' || !!venda || (docNorm && paidDocs.has(docNorm)));
    return rejeitada ? 'rejeitado_compliance' : (vendaEfetivada ? 'convertido_venda' : lead.status);
  };

  const porColuna = {};
  COLUNAS.forEach(c => { porColuna[c.key] = []; });
  leads.forEach(l => {
    const key = colunaDe(l);
    if (porColuna[key]) porColuna[key].push(l);
  });

  return (
    <div>
      {/* Aviso de espelho automático */}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" style={{ color: AURORA.accent }} />
        <p className="text-[11px]" style={{ color: AURORA.textMuted }}>
          Espelho automático da jornada — os cards movem sozinhos conforme o lead avança nas esteiras (Fila de Contatos, Conversões e Implantações). Clique em um card para ver o detalhe.
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUNAS.map(col => (
          <div key={col.key} className="flex-shrink-0 w-[240px]">
            {/* Header da coluna */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl mb-2" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.color }} />
                <p className="text-[11px] font-bold truncate" style={{ color: col.color }}>{col.label}</p>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: col.bg, color: col.color }}>
                {porColuna[col.key].length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[80px]">
              {porColuna[col.key].map(lead => {
                const efetivada = col.key === 'convertido_venda';
                const docNorm = (getDoc(lead) || '').replace(/\D/g, '');
                const venda = lead.venda_id ? vendaPorId[lead.venda_id] : vendaPorDoc[docNorm];
                const dataExibicao = venda?.data || lead.link_preenchido_em || lead.created_date;
                return (
                  <div key={lead.id} onClick={() => onSelect(lead)}
                    className="rounded-xl p-2.5 cursor-pointer transition"
                    style={{ background: AURORA.surface, border: `1px solid ${efetivada ? 'rgba(52,211,153,0.35)' : AURORA.border}` }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,212,170,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0"
                        style={{
                          background: efetivada ? 'linear-gradient(135deg, rgba(52,211,153,0.25), rgba(0,212,170,0.25))' : 'rgba(0,212,170,0.12)',
                          color: efetivada ? AURORA.green : AURORA.accent,
                        }}>
                        {efetivada ? <Trophy className="w-3.5 h-3.5" /> : getNome(lead)?.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs font-semibold truncate" style={{ color: AURORA.text }}>{getNome(lead)}</p>
                    </div>
                    <p className="text-[10px] mb-1.5 truncate" style={{ color: AURORA.textMuted }}>
                      {lead.tipo === 'PF' ? '👤 PF' : '🏢 PJ'} · {getDoc(lead) || '—'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent }}>{lead.produto}</span>
                      {lead.valor_estimado != null && <span className="text-[9px] font-semibold" style={{ color: AURORA.text }}>{fmtMoeda(lead.valor_estimado)}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {getGerente(lead) && (
                        <span className="text-[9px] flex items-center gap-0.5" style={{ color: AURORA.accent }} title="Gerente que está atendendo o lead">
                          <UserCheck className="w-2.5 h-2.5" /> {getGerente(lead)}
                        </span>
                      )}
                      <span className="text-[9px] flex items-center gap-0.5 truncate" style={{ color: AURORA.purple }}>🔗 {lead.parceiro_nome}</span>
                    </div>
                    <p className="text-[9px] mt-1.5" style={{ color: AURORA.textMuted }}>🗓 {fmtData(dataExibicao)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}