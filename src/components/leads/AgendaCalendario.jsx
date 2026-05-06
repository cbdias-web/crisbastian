import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Calendar, Phone, CheckCircle2, XCircle, Clock, RotateCcw,
  TrendingUp, ChevronLeft, ChevronRight, X, Plus, Video, Copy, ExternalLink, Link2
} from 'lucide-react';
import {
  format, isToday, isTomorrow, parseISO, startOfWeek,
  addDays, addWeeks, isSameDay, startOfMonth, endOfMonth,
  addMonths, subMonths, getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const CONNECTOR_ID = '69fb7ca02a88fc78b9e7694f';

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS = {
  pendente:    { label: 'Pendente',    dot: 'bg-amber-400',   pill: 'bg-amber-100 text-amber-700',   icon: Clock },
  realizado:   { label: 'Realizado',   dot: 'bg-emerald-400', pill: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  nao_atendeu: { label: 'Não atendeu', dot: 'bg-red-400',     pill: 'bg-red-100 text-red-600',       icon: XCircle },
  reagendado:  { label: 'Reagendado',  dot: 'bg-blue-400',    pill: 'bg-blue-100 text-blue-600',     icon: RotateCcw },
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const today = () => new Date();
const todayStr = () => new Date().toISOString().split('T')[0];

// ── Mini Calendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ selected, onSelect, dotDates = new Set() }) {
  const [viewDate, setViewDate] = useState(selected || new Date());
  const start = startOfMonth(viewDate);
  const end = endOfMonth(viewDate);
  const firstDow = getDay(start);

  const days = [];
  for (let i = 0; i < firstDow; i++) days.push(null);
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(new Date(d));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 select-none">
      {/* Nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(v => subMonths(v, 1))} className="p-1 rounded-lg hover:bg-gray-100 transition">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-800 capitalize">
          {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={() => setViewDate(v => addMonths(v, 1))} className="p-1 rounded-lg hover:bg-gray-100 transition">
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase">{d[0]}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const ds = format(day, 'yyyy-MM-dd');
          const isSelected = selected && isSameDay(day, selected);
          const isTod = isToday(day);
          const hasDot = dotDates.has(ds);
          return (
            <button
              key={ds}
              onClick={() => onSelect(day)}
              className={`relative flex flex-col items-center justify-center w-full aspect-square rounded-xl text-xs font-medium transition-all
                ${isSelected ? 'bg-[#0f1e35] text-white shadow-sm' : isTod ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-gray-100'}
              `}
            >
              {format(day, 'd')}
              {hasDot && (
                <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-400'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Hoje btn */}
      <button
        onClick={() => { setViewDate(new Date()); onSelect(new Date()); }}
        className="mt-3 w-full text-xs text-center text-[#1a3150] font-semibold hover:underline"
      >
        Ir para hoje
      </button>
    </div>
  );
}

// ── Google Meet Button ────────────────────────────────────────────────────────

function MeetButton({ item, onLinkGerado }) {
  const [loading, setLoading] = useState(false);
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [horarioInicio, setHorarioInicio] = useState('09:00');
  const [horarioFim, setHorarioFim] = useState('10:00');
  const [connected, setConnected] = useState(null);

  // Auto-ajusta horário fim ao mudar início (+1h)
  const handleInicioChange = (val) => {
    setHorarioInicio(val);
    const [h, m] = val.split(':').map(Number);
    const fimH = String(Math.min(h + 1, 23)).padStart(2, '0');
    setHorarioFim(`${fimH}:${String(m).padStart(2, '0')}`);
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) { setConnected(false); return; }
      try {
        await base44.functions.invoke('criarMeetAgenda', { agenda_id: '__test__', data_agendada: '__test__' });
        setConnected(true);
      } catch (e) {
        const msg = e?.response?.data?.error || e?.message || '';
        setConnected(!msg.toLowerCase().includes('connection') && !msg.toLowerCase().includes('not connected') && !msg.toLowerCase().includes('token'));
      }
    });
  }, []);

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const timer = setInterval(() => {
      if (!popup || popup.closed) { clearInterval(timer); setConnected(true); }
    }, 500);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setShowTimeForm(false);
    try {
      const res = await base44.functions.invoke('criarMeetAgenda', {
        agenda_id: item.id,
        lead_nome: item.lead_nome,
        data_agendada: item.data_agendada,
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
      });
      onLinkGerado(res.data.meet_link);
      toast.success('Link Meet criado!');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || '';
      if (msg.toLowerCase().includes('connection') || msg.toLowerCase().includes('not connected')) {
        setConnected(false);
        toast.error('Conecte sua conta Google primeiro');
      } else {
        toast.error('Erro ao gerar link Meet: ' + msg);
      }
    }
    setLoading(false);
  };

  // Already has a link
  if (item.meet_link) {
    return (
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <a href={item.meet_link} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[11px] font-semibold rounded-xl transition shadow-sm">
          <Video className="w-3 h-3" /> Entrar no Meet
        </a>
        <button onClick={() => { navigator.clipboard.writeText(item.meet_link); toast.success('Link copiado!'); }}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 text-[11px] font-semibold rounded-xl border border-blue-100 hover:bg-blue-100 transition">
          <Copy className="w-3 h-3" /> Copiar
        </button>
      </div>
    );
  }

  if (connected === false) {
    return (
      <button onClick={handleConnect}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#1a73e8] text-[#1a73e8] text-[11px] font-semibold rounded-xl hover:bg-blue-50 transition mt-2">
        <Link2 className="w-3 h-3" /> Conectar Google para Meet
      </button>
    );
  }

  if (showTimeForm) {
    return (
      <div className="mt-2 p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Horário da reunião</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-400">Início</label>
            <input type="time" value={horarioInicio} onChange={e => handleInicioChange(e.target.value)}
              className="text-xs px-2 py-1.5 border border-gray-200 bg-white rounded-xl focus:outline-none focus:border-[#1a73e8] w-28" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-400">Fim</label>
            <input type="time" value={horarioFim} onChange={e => setHorarioFim(e.target.value)}
              className="text-xs px-2 py-1.5 border border-gray-200 bg-white rounded-xl focus:outline-none focus:border-[#1a73e8] w-28" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleGenerate} disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#1a73e8] text-white text-[11px] font-semibold rounded-xl hover:bg-[#1557b0] transition">
              {loading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Video className="w-3 h-3" />}
              Gerar Link
            </button>
            <button onClick={() => setShowTimeForm(false)} className="text-[11px] text-gray-400 hover:text-gray-600 px-2">Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setShowTimeForm(true)}
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 hover:border-[#1a73e8] text-gray-600 hover:text-[#1a73e8] text-[11px] font-semibold rounded-xl transition mt-2">
      <Video className="w-3 h-3" /> Gerar Link Meet
    </button>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────

function EventCard({ item: itemProp, isToday: isTod, onAction, onPipeline, onClienteClick, updating }) {
  const [item, setItem] = useState(itemProp);
  const [reagendando, setReagendando] = useState(false);
  const [novaData, setNovaData] = useState('');
  const sc = STATUS[item.status] || STATUS.pendente;
  const Icon = sc.icon;

  React.useEffect(() => { setItem(itemProp); }, [itemProp]);

  return (
    <div className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden
      ${isTod ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100 bg-white'}
      hover:shadow-md hover:-translate-y-0.5
    `}>
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${sc.dot}`} />

      <div className="pl-4 pr-4 py-3.5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => onClienteClick && onClienteClick(item.lead_id)}
              className="text-sm font-semibold text-[#0f1e35] hover:text-blue-700 hover:underline transition truncate block text-left"
            >
              {item.lead_nome}
            </button>
            {item.lead_telefone && (
              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {item.lead_telefone}
              </p>
            )}
            {item.lead_cpf_cnpj && (
              <p className="text-[10px] text-gray-400 mt-0.5">{item.lead_cpf_cnpj}</p>
            )}
          </div>
          <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.pill}`}>
            <Icon className="w-2.5 h-2.5" /> {sc.label}
          </span>
        </div>

        {/* Reagendado info */}
        {item.status === 'reagendado' && item.nova_data && (
          <p className="text-[11px] text-blue-600 mt-1 flex items-center gap-1">
            <RotateCcw className="w-2.5 h-2.5" /> Reagendado para {format(parseISO(item.nova_data), 'dd/MM', { locale: ptBR })}
          </p>
        )}

        {/* Reagendar inline */}
        {reagendando && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={novaData}
              onChange={e => setNovaData(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
            />
            <button
              onClick={() => { onAction(item, 'reagendado', novaData); setReagendando(false); }}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-xl hover:bg-blue-700 transition"
            >Confirmar</button>
            <button onClick={() => setReagendando(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
          </div>
        )}

        {/* Actions */}
        {item.status === 'pendente' && (
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <button
              onClick={() => onAction(item, 'realizado')}
              disabled={updating === item.id}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-xl transition shadow-sm"
            >
              <CheckCircle2 className="w-3 h-3" /> Realizado
            </button>
            <button
              onClick={() => onAction(item, 'nao_atendeu')}
              disabled={updating === item.id}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-semibold rounded-xl border border-red-100 transition"
            >
              <XCircle className="w-3 h-3" /> Não atendeu
            </button>
            <button
              onClick={() => { setReagendando(true); setNovaData(''); }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-semibold rounded-xl border border-blue-100 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reagendar
            </button>
            <button
              onClick={() => onPipeline(item)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[11px] font-semibold rounded-xl border border-indigo-100 transition"
            >
              <TrendingUp className="w-3 h-3" /> Pipeline
            </button>
          </div>
        )}

        {/* Google Meet */}
        <MeetButton item={item} onLinkGerado={(link) => setItem(prev => ({ ...prev, meet_link: link }))} />
      </div>
    </div>
  );
}

// ── Pipeline Modal ────────────────────────────────────────────────────────────

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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Adicionar ao Pipeline</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.lead_nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Produto *</label>
            <input value={form.produto} onChange={e => setForm(p => ({ ...p, produto: e.target.value }))}
              placeholder="Ex: Conta Global"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Valor estimado</label>
              <input type="number" value={form.valor_estimado} onChange={e => setForm(p => ({ ...p, valor_estimado: e.target.value }))}
                placeholder="R$ 0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Temperatura</label>
              <select value={form.temperatura} onChange={e => setForm(p => ({ ...p, temperatura: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a3150]">
                {['Frio', 'Morno', 'Quente'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-[#0f1e35] text-white rounded-xl hover:bg-[#1a3150] transition flex items-center gap-2">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AgendaCalendario({ vendedorId, vendedor, user, onClienteClick }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState('semana'); // 'semana' | 'dia'
  const [updating, setUpdating] = useState(null);
  const [pipelineItem, setPipelineItem] = useState(null);
  const [showPast, setShowPast] = useState(false);
  const queryClient = useQueryClient();

  const { data: agenda = [], isLoading } = useQuery({
    queryKey: ['agenda-contatos', vendedorId],
    queryFn: () => base44.entities.AgendaContato.filter({ vendedor_id: vendedorId }, 'data_agendada'),
    enabled: !!vendedorId,
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AgendaContato.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agenda-contatos', vendedorId]);
      setUpdating(null);
    }
  });

  const handleAction = (item, status, nova_data) => {
    setUpdating(item.id);
    updateMutation.mutate({
      id: item.id,
      data: {
        status,
        realizado_em: new Date().toISOString(),
        ...(nova_data ? { nova_data } : {}),
      }
    });
    toast.success(STATUS[status]?.label || status);
  };

  // Build dot set for mini-cal
  const dotDates = useMemo(() => {
    return new Set(agenda.map(a => a.data_agendada));
  }, [agenda]);

  // Group by date
  const grouped = useMemo(() => {
    return agenda.reduce((acc, item) => {
      const d = item.data_agendada;
      if (!acc[d]) acc[d] = [];
      acc[d].push(item);
      return acc;
    }, {});
  }, [agenda]);

  // Week range
  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Stats for selected date
  const selStr = format(selectedDate, 'yyyy-MM-dd');
  const selItems = grouped[selStr] || [];
  const pendentes = selItems.filter(i => i.status === 'pendente').length;
  const realizados = selItems.filter(i => i.status === 'realizado').length;

  // All sorted dates for "Próximos" list when view = dia
  const tStr = todayStr();
  const sortedDates = Object.keys(grouped).sort().filter(d => showPast ? true : d >= tStr);

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (agenda.length === 0) return null;

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── LEFT: Mini Calendar + Stats ── */}
        <div className="flex flex-col gap-4 lg:w-56 flex-shrink-0">
          <MiniCalendar
            selected={selectedDate}
            onSelect={(d) => { setSelectedDate(d); setView('dia'); }}
            dotDates={dotDates}
          />

          {/* Stats card */}
          <div className="bg-gradient-to-br from-[#0f1e35] to-[#1a3150] rounded-2xl p-4 text-white shadow-lg">
            <p className="text-[10px] font-semibold text-blue-300/70 uppercase tracking-widest mb-3">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-200/80">Total</span>
                <span className="text-lg font-bold">{selItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-300/80">Pendentes</span>
                <span className="text-sm font-semibold text-amber-300">{pendentes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-300/80">Realizados</span>
                <span className="text-sm font-semibold text-emerald-300">{realizados}</span>
              </div>
            </div>
            {selItems.length > 0 && (
              <div className="mt-3 bg-white/10 rounded-xl h-1.5 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-xl transition-all"
                  style={{ width: `${selItems.length > 0 ? (realizados / selItems.length) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="bg-white border border-gray-100 rounded-2xl p-1 flex shadow-sm">
            {[{ key: 'semana', label: 'Semana' }, { key: 'dia', label: 'Dia' }].map(v => (
              <button key={v.key} onClick={() => setView(v.key)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition ${view === v.key ? 'bg-[#0f1e35] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Main Calendar View ── */}
        <div className="flex-1 min-w-0">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { setWeekOffset(w => w - 1); setView('semana'); }}
                className="p-2 rounded-xl bg-white border border-gray-100 hover:border-gray-300 shadow-sm transition">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {view === 'semana'
                    ? `${format(weekStart, "d MMM", { locale: ptBR })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: ptBR })}`
                    : format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h2>
                <p className="text-xs text-gray-400">Agenda de Contatos · {vendedor?.nome || 'Vendedor'}</p>
              </div>
              <button onClick={() => { setWeekOffset(w => w + 1); setView('semana'); }}
                className="p-2 rounded-xl bg-white border border-gray-100 hover:border-gray-300 shadow-sm transition">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <button
              onClick={() => { setWeekOffset(0); setSelectedDate(new Date()); setView('semana'); }}
              className="px-3 py-1.5 text-xs font-semibold bg-[#0f1e35] text-white rounded-xl hover:bg-[#1a3150] transition shadow-sm"
            >
              Hoje
            </button>
          </div>

          {/* ── SEMANA VIEW ── */}
          {view === 'semana' && (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => {
                const ds = format(day, 'yyyy-MM-dd');
                const items = grouped[ds] || [];
                const isTod = isToday(day);
                const isSelected = isSameDay(day, selectedDate);
                const pendCount = items.filter(i => i.status === 'pendente').length;

                return (
                  <div key={ds}
                    onClick={() => { setSelectedDate(day); setView('dia'); }}
                    className={`group cursor-pointer rounded-2xl border p-2 min-h-[120px] transition-all hover:shadow-md
                      ${isTod ? 'border-amber-300 bg-amber-50/30' : isSelected ? 'border-[#1a3150]/30 bg-blue-50/20' : 'border-gray-100 bg-white hover:border-gray-200'}
                    `}
                  >
                    {/* Day label */}
                    <div className={`flex items-center justify-between mb-2`}>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase">{WEEK_DAYS[getDay(day)]}</p>
                        <p className={`text-lg font-bold leading-none ${isTod ? 'text-amber-600' : 'text-gray-800'}`}>
                          {format(day, 'd')}
                        </p>
                      </div>
                      {pendCount > 0 && (
                        <span className="w-5 h-5 bg-amber-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                          {pendCount}
                        </span>
                      )}
                    </div>

                    {/* Event chips */}
                    <div className="space-y-1">
                      {items.slice(0, 3).map(item => {
                        const sc = STATUS[item.status] || STATUS.pendente;
                        return (
                          <div key={item.id}
                            className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-medium truncate ${sc.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                            <span className="truncate">{item.lead_nome}</span>
                          </div>
                        );
                      })}
                      {items.length > 3 && (
                        <p className="text-[10px] text-gray-400 text-center">+{items.length - 3} mais</p>
                      )}
                      {items.length === 0 && (
                        <p className="text-[10px] text-gray-300 text-center mt-3">—</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── DIA VIEW ── */}
          {view === 'dia' && (
            <div className="space-y-3">
              {selItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 text-center">
                  <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Nenhum contato para este dia</p>
                  <p className="text-gray-300 text-xs mt-1">Selecione outro dia no calendário</p>
                </div>
              ) : (
                selItems.map(item => (
                  <EventCard
                    key={item.id}
                    item={item}
                    isToday={isToday(selectedDate)}
                    onAction={handleAction}
                    onPipeline={setPipelineItem}
                    onClienteClick={onClienteClick}
                    updating={updating}
                  />
                ))
              )}

              {/* Próximas datas com eventos */}
              {sortedDates.filter(d => d !== selStr && (showPast || d >= tStr)).length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">Outros dias</p>
                  <div className="flex flex-wrap gap-2">
                    {sortedDates.filter(d => d !== selStr && d >= tStr).slice(0, 10).map(d => {
                      const count = (grouped[d] || []).length;
                      const pend = (grouped[d] || []).filter(i => i.status === 'pendente').length;
                      return (
                        <button
                          key={d}
                          onClick={() => setSelectedDate(parseISO(d))}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 hover:border-[#1a3150] rounded-xl text-xs font-medium text-gray-600 transition shadow-sm"
                        >
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {isToday(parseISO(d)) ? 'Hoje' : isTomorrow(parseISO(d)) ? 'Amanhã' : format(parseISO(d), 'dd/MM', { locale: ptBR })}
                          <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 rounded-full">{count}</span>
                          {pend > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 rounded-full">{pend}p</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline modal */}
      {pipelineItem && (
        <PipelineModal
          item={pipelineItem}
          vendedor={vendedor}
          user={user}
          onClose={() => setPipelineItem(null)}
          onSaved={() => setPipelineItem(null)}
        />
      )}
    </>
  );
}