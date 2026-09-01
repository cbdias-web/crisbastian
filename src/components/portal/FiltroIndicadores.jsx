import { Calendar, Users, Filter } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

export const PERIODO_OPCOES = [
  { key: '7d', label: 'Últimos 7 dias' },
  { key: '30d', label: 'Últimos 30 dias' },
  { key: '90d', label: 'Últimos 90 dias' },
  { key: 'mes', label: 'Este mês' },
  { key: 'ano', label: 'Este ano' },
  { key: 'tudo', label: 'Todo o período' },
  { key: 'personalizado', label: 'Personalizado' },
];

// `periodo` pode ser uma string (key predefinida) OU um objeto
// { key: 'personalizado', start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }.
export function periodoKey(p) {
  if (!p) return 'tudo';
  return typeof p === 'string' ? p : (p.key || 'tudo');
}

// Inicializa um período personalizado com o mês corrente (default amigável).
export function periodoPersonalizadoInicial() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { key: 'personalizado', start: fmt(start), end: fmt(now) };
}

// Retorna { start, end } ISO para um determinado período (ou null = sem filtro)
export function periodoRange(periodo) {
  if (!periodo) return null;
  // Período personalizado (objeto com datas)
  if (typeof periodo === 'object' && periodo.key === 'personalizado') {
    if (!periodo.start || !periodo.end) return null;
    return { start: periodo.start + 'T00:00:00', end: periodo.end + 'T23:59:59' };
  }
  if (periodo === 'tudo') return null;
  const now = new Date();
  let start = new Date();
  start.setHours(0, 0, 0, 0);
  switch (periodo) {
    case '7d': start.setDate(now.getDate() - 6); break;
    case '30d': start.setDate(now.getDate() - 29); break;
    case '90d': start.setDate(now.getDate() - 89); break;
    case 'mes': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'ano': start = new Date(now.getFullYear(), 0, 1); break;
    default: return null;
  }
  return { start: start.toISOString(), end: now.toISOString() };
}

// Verifica se uma data está dentro do range (null = sem restrição)
// Strings de data (YYYY-MM-DD, ex: venda.data) são interpretadas pelo JS como
// meia-noite UTC — o que as deixa atrás do início LOCAL do mês na virada, fazendo
// uma venda de 01/09 "sumir" de Setembro. Tratamos data-only como início do dia
// local para o filtro bater com o mês civil do usuário.
export function dentroPeriodo(dataStr, range) {
  if (!range) return true;
  if (!dataStr) return false;
  let str = dataStr;
  if (typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str)) str = str + 'T00:00:00';
  const t = new Date(str).getTime();
  return t >= new Date(range.start).getTime() && t <= new Date(range.end).getTime();
}

function PeriodoInputs({ periodo, setPeriodo }) {
  const isCustom = periodoKey(periodo) === 'personalizado';
  const start = isCustom ? (periodo.start || '') : '';
  const end = isCustom ? (periodo.end || '') : '';
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
      <input
        type="date"
        value={start}
        max={end || undefined}
        onChange={e => setPeriodo({ key: 'personalizado', start: e.target.value, end })}
        className="bg-transparent text-xs focus:outline-none"
        style={{ color: AURORA.text }}
      />
      <span className="text-[10px]" style={{ color: AURORA.textMuted }}>até</span>
      <input
        type="date"
        value={end}
        min={start || undefined}
        onChange={e => setPeriodo({ key: 'personalizado', start, end: e.target.value })}
        className="bg-transparent text-xs focus:outline-none"
        style={{ color: AURORA.text }}
      />
    </div>
  );
}

export function PeriodoSelector({ periodo, setPeriodo, compact }) {
  const key = periodoKey(periodo);
  return (
    <>
      <div className={compact ? "flex items-center gap-2 px-3 py-1.5 rounded-xl" : "flex items-center gap-2 px-3 py-2 rounded-xl"}
        style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
        <Calendar className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />
        <select
          value={key}
          onChange={e => {
            if (e.target.value === 'personalizado') {
              if (periodoKey(periodo) !== 'personalizado') setPeriodo(periodoPersonalizadoInicial());
            } else {
              setPeriodo(e.target.value);
            }
          }}
          className="bg-transparent text-xs focus:outline-none"
          style={{ color: AURORA.text }}>
          {PERIODO_OPCOES.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>
      {periodoKey(periodo) === 'personalizado' && (
        <PeriodoInputs periodo={periodo} setPeriodo={setPeriodo} />
      )}
    </>
  );
}

export default function FiltroIndicadores({ periodo, setPeriodo, parceiroId, setParceiroId, parceiros }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-2xl"
      style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mr-1" style={{ color: AURORA.accent }}>
        <Filter className="w-3.5 h-3.5" /> Filtros
      </div>

      <PeriodoSelector periodo={periodo} setPeriodo={setPeriodo} />

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
        <Users className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />
        <select value={parceiroId} onChange={e => setParceiroId(e.target.value)} className="bg-transparent text-xs focus:outline-none" style={{ color: AURORA.text }}>
          <option value="todos">Todos indicadores</option>
          {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>
    </div>
  );
}