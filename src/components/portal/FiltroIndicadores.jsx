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
];

// Retorna { start, end } ISO para um determinado período (ou null = sem filtro)
export function periodoRange(periodo) {
  if (!periodo || periodo === 'tudo') return null;
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

// Verifica se uma data ISO está dentro do range (null = sem restrição)
export function dentroPeriodo(dataStr, range) {
  if (!range) return true;
  if (!dataStr) return false;
  const t = new Date(dataStr).getTime();
  return t >= new Date(range.start).getTime() && t <= new Date(range.end).getTime();
}

export default function FiltroIndicadores({ periodo, setPeriodo, parceiroId, setParceiroId, parceiros }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-2xl"
      style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mr-1" style={{ color: AURORA.accent }}>
        <Filter className="w-3.5 h-3.5" /> Filtros
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
        <Calendar className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />
        <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="bg-transparent text-xs focus:outline-none" style={{ color: AURORA.text }}>
          {PERIODO_OPCOES.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

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