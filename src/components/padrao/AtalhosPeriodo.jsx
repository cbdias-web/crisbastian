import { todayBrasilia } from '@/lib/dateUtils';

// Atalhos de período padrão do portal (mesmos em todas as páginas com filtro de datas).
// onChange(inicio, fim) recebe datas 'AAAA-MM-DD' ('' em "Tudo").
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function intervaloPeriodo(chave) {
  const hoje = todayBrasilia();
  const h = new Date(hoje + 'T12:00:00');
  switch (chave) {
    case 'hoje': return [hoje, hoje];
    case '7d': { const d = new Date(h); d.setDate(d.getDate() - 6); return [iso(d), hoje]; }
    case 'mes': return [iso(new Date(h.getFullYear(), h.getMonth(), 1)), hoje];
    case 'mes_ant': return [iso(new Date(h.getFullYear(), h.getMonth() - 1, 1)), iso(new Date(h.getFullYear(), h.getMonth(), 0))];
    case 'ano': return [iso(new Date(h.getFullYear(), 0, 1)), hoje];
    default: return ['', ''];
  }
}

const OPCOES = [['hoje', 'Hoje'], ['7d', '7 dias'], ['mes', 'Este mês'], ['mes_ant', 'Mês passado'], ['ano', 'Este ano'], ['tudo', 'Tudo']];

export default function AtalhosPeriodo({ inicio = '', fim = '', onChange, semTudo = false }) {
  const ativo = OPCOES.find(([k]) => { const [a, b] = intervaloPeriodo(k); return a === (inicio || '') && b === (fim || ''); })?.[0];
  return (
    <div role="group" aria-label="Atalhos de período" className="vx-periodo">
      {OPCOES.filter(([k]) => !(semTudo && k === 'tudo')).map(([k, l]) => (
        <button key={k} type="button" aria-pressed={ativo === k} onClick={() => { const [a, b] = intervaloPeriodo(k); onChange?.(a, b); }}
          className={`vx-periodo-op${ativo === k ? ' ativo' : ''}`}>{l}</button>
      ))}
    </div>
  );
}
