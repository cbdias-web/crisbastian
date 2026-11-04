import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, CalendarPlus, Video, Phone, Clock, Loader2 } from 'lucide-react';
import AgendaMeetModal from '@/components/agenda/AgendaMeetModal';
import { hojeBrasilia, somaDiasData, brasiliaParts } from '@/lib/leadUtils';

const A = { surface: '#161b22', surface2: '#1c2333', border: 'rgba(0,212,170,0.15)', accent: '#00D4AA', text: '#e6edf3', muted: 'rgba(230,237,243,0.55)' };
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const segundaDa = (data) => { const [a, m, d] = data.split('-').map(Number); const w = new Date(a, m - 1, d).getDay(); return somaDiasData(data, w === 0 ? -6 : 1 - w); };

// Agenda do gerente (semana): retornos, reuniões (Meet) e compromissos com horário.
export default function AgendaGerente({ vendedor, user, adminTudo, onSelectFila }) {
  const hoje = hojeBrasilia();
  const [ini, setIni] = useState(segundaDa(hoje));
  const [novo, setNovo] = useState(false);
  const fim = somaDiasData(ini, 6);
  const dias = Array.from({ length: 7 }, (_, i) => somaDiasData(ini, i));
  const vid = adminTudo ? null : vendedor?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agenda-semana', ini, vid], enabled: adminTudo || !!vid, refetchInterval: 60000,
    queryFn: async () => {
      const base = vid ? { vendedor_id: vid } : {};
      const [ret, reu, ags] = await Promise.all([
        base44.entities.FilaContato.filter({ ...base, status: 'atendeu', proximo_contato: { $gte: ini, $lte: fim } }, 'proximo_contato', 300),
        base44.entities.FilaContato.filter({ ...base, status: 'reuniao_marcada', reuniao_em: { $gte: new Date(`${ini}T00:00:00-03:00`).toISOString(), $lte: new Date(`${fim}T23:59:59-03:00`).toISOString() } }, 'reuniao_em', 300),
        base44.entities.AgendaContato.filter({ ...base, status: 'pendente', data_agendada: { $gte: ini, $lte: fim } }, 'data_agendada', 500),
      ]);
      const items = [];
      for (const f of ret) items.push({ id: `r${f.id}`, dia: f.proximo_contato, hora: f.proximo_contato_hora || '', tipo: 'retorno', titulo: f.nome, sub: 'Retorno', fila: f });
      for (const f of reu) { const p = brasiliaParts(new Date(f.reuniao_em)); items.push({ id: `m${f.id}`, dia: p.data, hora: `${String(p.hora).padStart(2, '0')}:${String(p.minuto).padStart(2, '0')}`, tipo: 'reuniao', titulo: f.nome, sub: 'Reunião', link: f.meet_link, fila: f }); }
      for (const a of ags) if (a.horario) items.push({ id: `a${a.id}`, dia: a.data_agendada, hora: a.horario, tipo: 'agenda', titulo: a.lead_nome, sub: a.resultado?.startsWith('Tarefa') ? 'Tarefa' : 'Compromisso', link: a.meet_link });
      return items;
    },
  });
  const itens = data || [];
  const cor = { retorno: '#fbbf24', reuniao: '#2dd4bf', agenda: '#818cf8' };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setIni(somaDiasData(ini, -7))} className="p-2 rounded-lg" style={{ background: A.surface, color: A.muted }}><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setIni(segundaDa(hoje))} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: A.surface, color: A.accent }}>Hoje</button>
          <button onClick={() => setIni(somaDiasData(ini, 7))} className="p-2 rounded-lg" style={{ background: A.surface, color: A.muted }}><ChevronRight className="w-4 h-4" /></button>
          <span className="text-xs ml-2" style={{ color: A.muted }}>{ini.split('-').reverse().slice(0, 2).join('/')} – {fim.split('-').reverse().slice(0, 2).join('/')}</span>
        </div>
        {vendedor && <button onClick={() => setNovo(true)} className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5" style={{ background: A.accent, color: '#0d1117' }}><CalendarPlus className="w-4 h-4" /> Nova reunião (Meet)</button>}
      </div>
      {isLoading ? <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: A.accent }} /></div> : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {dias.map(d => {
            const lista = itens.filter(i => i.dia === d).sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
            const w = new Date(`${d}T12:00:00`).getDay();
            return (
              <div key={d} className="rounded-xl p-2 min-h-[140px]" style={{ background: A.surface, border: `1px solid ${d === hoje ? A.accent : A.border}` }}>
                <p className="text-[11px] font-bold mb-1.5" style={{ color: d === hoje ? A.accent : A.muted }}>{DIAS[w]} {d.split('-').reverse().slice(0, 2).join('/')}</p>
                <div className="space-y-1.5">
                  {lista.length === 0 && <p className="text-[10px]" style={{ color: A.muted }}>—</p>}
                  {lista.map(i => (
                    <div key={i.id} onClick={() => i.fila && onSelectFila?.(i.fila)} className={`rounded-lg px-2 py-1.5 ${i.fila ? 'cursor-pointer hover:brightness-125' : ''}`} style={{ background: `${cor[i.tipo]}18`, borderLeft: `3px solid ${cor[i.tipo]}` }}>
                      <p className="text-[10px] flex items-center gap-1" style={{ color: cor[i.tipo] }}>{i.tipo === 'reuniao' ? <Video className="w-3 h-3" /> : i.tipo === 'retorno' ? <Phone className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{i.hora || 'dia todo'} · {i.sub}</p>
                      <p className="text-[11px] font-semibold truncate" style={{ color: A.text }}>{i.titulo}</p>
                      {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] underline" style={{ color: A.accent }}>Abrir Meet</a>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {novo && <AgendaMeetModal user={user} vendedorId={vendedor.id} vendedorNome={vendedor.nome} onClose={() => setNovo(false)} onSaved={() => { setNovo(false); refetch(); }} />}
    </div>
  );
}
