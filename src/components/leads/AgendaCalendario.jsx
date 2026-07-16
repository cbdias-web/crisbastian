import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AgendaMeetModal from '@/components/agenda/AgendaMeetModal';
import KanbanBoard from '@/components/agenda/KanbanBoard';
import GerenteMultiSelect from '@/components/leads/GerenteMultiSelect';
import {
  Calendar, Clock, ChevronLeft, ChevronRight, X, Plus, Video,
  TrendingUp, Filter, AlertTriangle, CalendarDays
} from 'lucide-react';
import {
  format, isToday, isTomorrow, parseISO, startOfWeek,
  addDays, addWeeks, isSameDay, startOfMonth, endOfMonth,
  addMonths, subMonths, getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const todayStr = () => new Date().toISOString().split('T')[0];

// ── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ selected, onSelect, dotDates = new Set() }) {
  const [viewDate, setViewDate] = useState(selected || new Date());
  const start = startOfMonth(viewDate);
  const end = endOfMonth(viewDate);
  const firstDow = getDay(start);
  const days = [];
  for (let i = 0; i < firstDow; i++) days.push(null);
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(new Date(d));

  return (
    <div className="rounded-xl p-3 select-none" style={{ background: 'rgba(28,35,51,0.6)', border: '1px solid rgba(0,212,170,0.1)' }}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setViewDate(v => subMonths(v, 1))} className="p-0.5 rounded transition hover:bg-white/5">
          <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'rgba(230,237,243,0.4)' }} />
        </button>
        <span className="text-[11px] font-bold capitalize" style={{ color: '#e6edf3' }}>
          {format(viewDate, 'MMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={() => setViewDate(v => addMonths(v, 1))} className="p-0.5 rounded transition hover:bg-white/5">
          <ChevronRight className="w-3.5 h-3.5" style={{ color: 'rgba(230,237,243,0.4)' }} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-0.5">
        {WEEK_DAYS.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-bold" style={{ color: 'rgba(230,237,243,0.3)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const ds = format(day, 'yyyy-MM-dd');
          const isSelected = selected && isSameDay(day, selected);
          const isTod = isToday(day);
          const hasDot = dotDates.has(ds);
          return (
            <button key={ds} onClick={() => onSelect(day)}
              className="relative flex items-center justify-center w-full aspect-square rounded-lg text-[11px] font-medium transition-all"
              style={isSelected
                ? { background: '#00D4AA', color: '#0d1117', fontWeight: 700 }
                : isTod
                ? { background: 'rgba(0,212,170,0.15)', color: '#00D4AA', fontWeight: 700 }
                : { color: 'rgba(230,237,243,0.6)' }}>
              {format(day, 'd')}
              {hasDot && !isSelected && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{ background: '#f59e0b' }} />
              )}
            </button>
          );
        })}
      </div>
      <button onClick={() => { setViewDate(new Date()); onSelect(new Date()); }}
        className="mt-2 w-full text-[10px] font-semibold rounded-md py-1 transition"
        style={{ color: '#00D4AA', background: 'rgba(0,212,170,0.08)' }}>
        Hoje
      </button>
    </div>
  );
}

// ── Pipeline Modal ───────────────────────────────────────────────────────────

function PipelineModal({ item, vendedor, user, onClose, onSaved }) {
  const [form, setForm] = useState({ produto: '', valor_estimado: '', temperatura: 'Morno' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.produto.trim()) { toast.error('Informe o produto'); return; }
    setSaving(true);
    try {
      await base44.entities.Pipeline.create({
        cliente_id: item.cliente_id || item.lead_id,
        cliente_nome: item.lead_nome || '',
        cliente_cpf_cnpj: item.lead_cpf_cnpj || '',
        cliente_telefone: item.lead_telefone || '',
        produto: form.produto,
        valor_estimado: parseFloat(form.valor_estimado) || 0,
        temperatura: form.temperatura,
        vendedor_id: vendedor?.id || '',
        vendedor_nome: vendedor?.nome || user?.full_name || '',
        origem: 'Carteira',
      });
      toast.success(`${item.lead_nome} adicionado ao Pipeline!`);
      onSaved();
    } catch { toast.error('Erro ao adicionar ao Pipeline'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-sm" style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.2)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,212,170,0.12)' }}>
          <div>
            <p className="font-bold text-sm" style={{ color: '#e6edf3' }}>Adicionar ao Pipeline</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(230,237,243,0.4)' }}>{item.lead_nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition hover:bg-white/5"><X className="w-4 h-4" style={{ color: 'rgba(230,237,243,0.5)' }} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs mb-1 block font-medium" style={{ color: 'rgba(230,237,243,0.5)' }}>Produto *</label>
            <input value={form.produto} onChange={e => setForm(p => ({ ...p, produto: e.target.value }))}
              placeholder="Ex: Conta Global"
              className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ background: '#0d1117', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs mb-1 block font-medium" style={{ color: 'rgba(230,237,243,0.5)' }}>Valor estimado</label>
              <input type="number" value={form.valor_estimado} onChange={e => setForm(p => ({ ...p, valor_estimado: e.target.value }))}
                placeholder="R$ 0"
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ background: '#0d1117', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }} />
            </div>
            <div className="flex-1">
              <label className="text-xs mb-1 block font-medium" style={{ color: 'rgba(230,237,243,0.5)' }}>Temperatura</label>
              <select value={form.temperatura} onChange={e => setForm(p => ({ ...p, temperatura: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ background: '#0d1117', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }}>
                {['Frio', 'Morno', 'Quente'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: '1px solid rgba(0,212,170,0.12)' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl transition" style={{ color: 'rgba(230,237,243,0.6)', border: '1px solid rgba(0,212,170,0.15)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm rounded-xl transition flex items-center gap-2 font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
            {saving ? <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <TrendingUp className="w-3.5 h-3.5" />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgendaCalendario({ vendedorId, vendedor, user, onClienteClick, isAdmin, todosVendedores = [], clientes = [] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [updating, setUpdating] = useState(null);
  const [pipelineItem, setPipelineItem] = useState(null);
  const [showMeetModal, setShowMeetModal] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const queryClient = useQueryClient();

  // Filters
  const [filtroVendedoresIds, setFiltroVendedoresIds] = useState([]);
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useState('');
  const [filtroPeriodoFim, setFiltroPeriodoFim] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: agendaGlobal = [], isLoading } = useQuery({
    queryKey: ['agenda-contatos-global'],
    queryFn: () => base44.entities.AgendaContato.list('-data_agendada', 5000),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: agendaVendedor = [], isLoading: isLoadingVendedor } = useQuery({
    queryKey: ['agenda-contatos', vendedorId],
    queryFn: () => base44.entities.AgendaContato.filter({ vendedor_id: vendedorId }, '-data_agendada', 2000),
    enabled: !isAdmin && !!vendedorId,
    refetchInterval: 30000,
  });

  const useGlobal = isAdmin || filtroVendedoresIds.length > 0;
  const agendaRaw = useGlobal ? agendaGlobal : agendaVendedor;
  const loading = useGlobal ? isLoading : isLoadingVendedor;

  const agenda = useMemo(() => {
    let items = agendaRaw;
    if (filtroVendedoresIds.length > 0) items = items.filter(a => filtroVendedoresIds.includes(a.vendedor_id));
    if (filtroPeriodoInicio) items = items.filter(a => a.data_agendada >= filtroPeriodoInicio);
    if (filtroPeriodoFim) items = items.filter(a => a.data_agendada <= filtroPeriodoFim);
    return items;
  }, [agendaRaw, filtroVendedoresIds, filtroPeriodoInicio, filtroPeriodoFim]);

  const filtroVendedorObj = filtroVendedoresIds.length === 1 ? (todosVendedores.find(v => v.id === filtroVendedoresIds[0]) || null) : null;
  const vendedorEfetivo = filtroVendedorObj || vendedor;

  const invalidateAgenda = () => {
    queryClient.invalidateQueries({ queryKey: ['agenda-contatos-global'] });
    if (vendedorId) queryClient.invalidateQueries({ queryKey: ['agenda-contatos', vendedorId] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AgendaContato.update(id, data),
    onSuccess: () => { invalidateAgenda(); setUpdating(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AgendaContato.delete(id),
    onSuccess: () => invalidateAgenda(),
  });

  const handleAction = (item, status, nova_data, nova_data_agendada, novo_horario) => {
    setUpdating(item.id);
    const updateData = nova_data_agendada
      ? { data_agendada: nova_data_agendada, ...(novo_horario !== undefined ? { horario: novo_horario } : {}) }
      : { status, realizado_em: new Date().toISOString(), ...(nova_data ? { nova_data } : {}) };
    updateMutation.mutate({ id: item.id, data: updateData });
    toast.success(nova_data_agendada ? 'Agendamento atualizado!' : status);
  };

  const handleDelete = (item) => {
    deleteMutation.mutate(item.id);
    toast.success('Agendamento excluído!');
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    const item = agenda.find(i => i.id === draggableId);
    if (!item) return;
    const newStatus = destination.droppableId;
    handleAction(item, newStatus);
  };

  const dotDates = useMemo(() => new Set(agenda.map(a => a.data_agendada)), [agenda]);

  // Items for kanban: selected date OR all upcoming
  const selStr = format(selectedDate, 'yyyy-MM-dd');
  const tStr = todayStr();
  const kanbanItems = showAllUpcoming
    ? agenda.filter(a => a.data_agendada >= tStr)
    : agenda.filter(a => a.data_agendada === selStr);

  // Stats
  const pendentes = kanbanItems.filter(i => i.status === 'pendente').length;
  const realizados = kanbanItems.filter(i => i.status === 'realizado').length;
  const total = kanbanItems.length;

  // Other dates for quick nav
  const sortedDates = [...new Set(agenda.filter(a => a.data_agendada >= tStr).map(a => a.data_agendada))].sort()
    .filter(d => d !== selStr);

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,212,170,0.2)', borderTopColor: '#00D4AA' }} />
    </div>
  );

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-3">
        {/* LEFT RAIL */}
        <div className="flex flex-col gap-3 lg:w-52 flex-shrink-0">
          <MiniCalendar
            selected={selectedDate}
            onSelect={(d) => { setSelectedDate(d); setShowAllUpcoming(false); }}
            dotDates={dotDates}
          />

          {/* Stats */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(28,35,51,0.6)', border: '1px solid rgba(0,212,170,0.1)' }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(230,237,243,0.35)' }}>
              {showAllUpcoming ? 'Próximos' : format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </p>
            <div className="grid grid-cols-3 gap-1">
              <div className="text-center rounded-lg py-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-base font-bold leading-none" style={{ color: '#e6edf3' }}>{total}</p>
                <p className="text-[8px] mt-0.5" style={{ color: 'rgba(230,237,243,0.35)' }}>Total</p>
              </div>
              <div className="text-center rounded-lg py-1.5" style={{ background: 'rgba(245,158,11,0.08)' }}>
                <p className="text-base font-bold leading-none" style={{ color: '#fbbf24' }}>{pendentes}</p>
                <p className="text-[8px] mt-0.5" style={{ color: 'rgba(251,191,36,0.5)' }}>Pend.</p>
              </div>
              <div className="text-center rounded-lg py-1.5" style={{ background: 'rgba(16,185,129,0.08)' }}>
                <p className="text-base font-bold leading-none" style={{ color: '#34d399' }}>{realizados}</p>
                <p className="text-[8px] mt-0.5" style={{ color: 'rgba(52,211,153,0.5)' }}>Feitos</p>
              </div>
            </div>
            {total > 0 && (
              <div className="mt-2 rounded-full h-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${total > 0 ? (realizados / total) * 100 : 0}%`, background: '#00D4AA' }} />
              </div>
            )}
          </div>

          {/* Advanced filters toggle */}
          <button onClick={() => setShowFilters(p => !p)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition w-full"
            style={{
              background: showFilters || filtroPeriodoInicio || filtroPeriodoFim ? 'rgba(0,212,170,0.1)' : 'transparent',
              color: showFilters || filtroPeriodoInicio || filtroPeriodoFim ? '#00D4AA' : 'rgba(230,237,243,0.4)',
              border: `1px solid ${showFilters || filtroPeriodoInicio || filtroPeriodoFim ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.06)'}`,
            }}>
            <Filter className="w-3 h-3" /> Período
            {(filtroPeriodoInicio || filtroPeriodoFim) && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#00D4AA' }} />}
          </button>
          {showFilters && (
            <div className="space-y-1.5 p-2 rounded-lg" style={{ background: 'rgba(28,35,51,0.6)', border: '1px solid rgba(0,212,170,0.1)' }}>
              <input type="date" value={filtroPeriodoInicio} onChange={e => setFiltroPeriodoInicio(e.target.value)}
                className="w-full px-2 py-1 text-[10px] rounded focus:outline-none"
                style={{ background: '#0d1117', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }} />
              <input type="date" value={filtroPeriodoFim} onChange={e => setFiltroPeriodoFim(e.target.value)}
                className="w-full px-2 py-1 text-[10px] rounded focus:outline-none"
                style={{ background: '#0d1117', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }} />
              {(filtroPeriodoInicio || filtroPeriodoFim) && (
                <button onClick={() => { setFiltroPeriodoInicio(''); setFiltroPeriodoFim(''); }}
                  className="text-[10px] font-semibold" style={{ color: '#f87171' }}>Limpar período</button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Toolbar + Kanban */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl"
            style={{ background: 'rgba(28,35,51,0.6)', border: '1px solid rgba(0,212,170,0.1)' }}>
            <div className="flex items-center gap-2">
              <button onClick={() => { setSelectedDate(d => addDays(d, -1)); setShowAllUpcoming(false); }}
                className="p-1 rounded-lg transition" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'rgba(230,237,243,0.6)' }} />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight" style={{ color: '#e6edf3' }}>
                  {showAllUpcoming ? 'Próximos contatos' : format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-[9px]" style={{ color: 'rgba(230,237,243,0.35)' }}>
                  {filtroVendedorObj ? `Agenda de ${filtroVendedorObj.nome}` : (isAdmin || filtroVendedoresIds.length === 0) ? 'Agenda Global' : `${filtroVendedoresIds.length} gerentes`}
                </p>
              </div>
              <button onClick={() => { setSelectedDate(d => addDays(d, 1)); setShowAllUpcoming(false); }}
                className="p-1 rounded-lg transition" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'rgba(230,237,243,0.6)' }} />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={() => { setSelectedDate(new Date()); setShowAllUpcoming(false); }}
                className="px-2.5 py-1 text-[10px] font-semibold rounded-lg transition"
                style={{ background: !showAllUpcoming && isToday(selectedDate) ? 'rgba(0,212,170,0.15)' : 'transparent', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.2)' }}>
                Hoje
              </button>
              <button onClick={() => setShowAllUpcoming(p => !p)}
                className="px-2.5 py-1 text-[10px] font-semibold rounded-lg transition flex items-center gap-1"
                style={{
                  background: showAllUpcoming ? 'rgba(0,212,170,0.15)' : 'transparent',
                  color: showAllUpcoming ? '#00D4AA' : 'rgba(230,237,243,0.4)',
                  border: `1px solid ${showAllUpcoming ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                <CalendarDays className="w-3 h-3" /> Próximos
              </button>
              <button onClick={() => setShowMeetModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg transition"
                style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                <Video className="w-3 h-3" /> Meet
              </button>
            </div>
          </div>

          {/* Gerente filter */}
          {todosVendedores.length > 0 && (
            <div className="mb-2">
              <GerenteMultiSelect
                vendedores={todosVendedores}
                selected={filtroVendedoresIds}
                onChange={setFiltroVendedoresIds}
              />
            </div>
          )}

          {/* Kanban */}
          <KanbanBoard
            items={kanbanItems}
            onAction={handleAction}
            onDelete={handleDelete}
            onPipeline={setPipelineItem}
            onClienteClick={onClienteClick}
            updating={updating}
            showGerente={isAdmin || filtroVendedoresIds.length === 0}
            onDragEnd={handleDragEnd}
          />

          {/* Other dates quick nav */}
          {!showAllUpcoming && sortedDates.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sortedDates.slice(0, 8).map(d => {
                const count = agenda.filter(a => a.data_agendada === d).length;
                const pend = agenda.filter(a => a.data_agendada === d && a.status === 'pendente').length;
                return (
                  <button key={d} onClick={() => { setSelectedDate(parseISO(d)); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition"
                    style={{ background: 'rgba(28,35,51,0.6)', border: '1px solid rgba(0,212,170,0.1)', color: 'rgba(230,237,243,0.6)' }}>
                    <Calendar className="w-2.5 h-2.5" style={{ color: 'rgba(230,237,243,0.3)' }} />
                    {isToday(parseISO(d)) ? 'Hoje' : isTomorrow(parseISO(d)) ? 'Amanhã' : format(parseISO(d), 'dd/MM', { locale: ptBR })}
                    <span className="text-[9px] font-bold px-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(230,237,243,0.4)' }}>{count}</span>
                    {pend > 0 && <span className="text-[9px] font-bold px-1 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>{pend}p</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {pipelineItem && (
        <PipelineModal
          item={pipelineItem}
          vendedor={vendedorEfetivo}
          user={user}
          onClose={() => setPipelineItem(null)}
          onSaved={() => setPipelineItem(null)}
        />
      )}

      {showMeetModal && (
        <AgendaMeetModal
          user={user}
          vendedorId={vendedorEfetivo?.id || vendedorId || ''}
          vendedorNome={vendedorEfetivo?.nome || vendedor?.nome || ''}
          dataInicial={format(selectedDate, 'yyyy-MM-dd')}
          clientes={clientes}
          todosVendedores={todosVendedores}
          onClose={() => setShowMeetModal(false)}
          onSaved={() => { setShowMeetModal(false); invalidateAgenda(); }}
        />
      )}
    </>
  );
}