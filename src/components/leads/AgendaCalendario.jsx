import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Calendar, Phone, CheckCircle2, XCircle, Clock, RotateCcw,
  TrendingUp, ChevronLeft, ChevronRight, X, Plus, Video, Copy, ExternalLink, Link2, UserPlus, AlertTriangle
} from 'lucide-react';
import { isDiaUtil, mensagemNaoDiaUtil } from '@/lib/diaUtil';
import {
  format, isToday, isTomorrow, parseISO, startOfWeek,
  addDays, addWeeks, isSameDay, startOfMonth, endOfMonth,
  addMonths, subMonths, getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const CONNECTOR_ID = '69fb9176f017da4e4ddd9ff8';

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
  const [horario, setHorario] = useState('09:00');
  const [needsConnect, setNeedsConnect] = useState(false);

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const timer = setInterval(() => {
      if (!popup || popup.closed) { clearInterval(timer); setNeedsConnect(false); }
    }, 500);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('criarMeetAgenda', {
        agenda_id: item.id,
        lead_nome: item.lead_nome,
        data_agendada: item.data_agendada,
        horario_inicio: horario,
        com_meet: true, // aqui sim gera o link Meet
      });
      onLinkGerado(res.data.meet_link);
      toast.success('Link Meet criado!');
      setShowTimeForm(false);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || '';
      if (msg.toLowerCase().includes('connection') || msg.toLowerCase().includes('not connected') || msg.toLowerCase().includes('no active')) {
        setNeedsConnect(true);
        setShowTimeForm(false);
        toast.error('Conecte sua conta Google primeiro');
      } else {
        toast.error('Erro ao gerar link: ' + msg);
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

  if (needsConnect) {
    return (
      <button onClick={handleConnect}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#1a73e8] text-[#1a73e8] text-[11px] font-semibold rounded-xl hover:bg-blue-50 transition mt-2">
        <Link2 className="w-3 h-3" /> Conectar Google Calendar
      </button>
    );
  }

  if (showTimeForm) {
    return (
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-[11px] text-gray-500 font-medium">Início:</span>
        <input type="time" value={horario} onChange={e => setHorario(e.target.value)}
          className="text-xs px-2 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a73e8]" />
        <button onClick={handleGenerate} disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#1a73e8] text-white text-[11px] font-semibold rounded-xl hover:bg-[#1557b0] transition">
          {loading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Video className="w-3 h-3" />}
          {loading ? 'Gerando...' : 'Gerar Link'}
        </button>
        <button onClick={() => setShowTimeForm(false)} className="text-[11px] text-gray-400 hover:text-gray-600">Cancelar</button>
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

function EventCard({ item: itemProp, isToday: isTod, onAction, onDelete, onPipeline, onClienteClick, updating }) {
  const [item, setItem] = useState(itemProp);
  const [reagendando, setReagendando] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [editando, setEditando] = useState(false);
  const [editData, setEditData] = useState(itemProp.data_agendada);
  const [editHorario, setEditHorario] = useState(itemProp.horario || '');
  const sc = STATUS[item.status] || STATUS.pendente;
  const Icon = sc.icon;

  React.useEffect(() => { setItem(itemProp); setEditData(itemProp.data_agendada); setEditHorario(itemProp.horario || ''); }, [itemProp]);

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
            {item.horario && (
              <p className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> {item.horario}
              </p>
            )}
            {item.lead_telefone && (
              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {item.lead_telefone}
              </p>
            )}
            {item.lead_cpf_cnpj && (
              <p className="text-[10px] text-gray-400 mt-0.5">{item.lead_cpf_cnpj}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.pill}`}>
              <Icon className="w-2.5 h-2.5" /> {sc.label}
            </span>
            <button
              onClick={() => { setEditando(e => !e); setReagendando(false); setEditData(item.data_agendada); }}
              title="Alterar data"
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#1a3150] transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button
              onClick={() => { if (confirm(`Excluir agendamento de "${item.lead_nome}"?`)) onDelete(item); }}
              title="Excluir agendamento"
              className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>

        {/* Reagendado info */}
        {item.status === 'reagendado' && item.nova_data && (
          <p className="text-[11px] text-blue-600 mt-1 flex items-center gap-1">
            <RotateCcw className="w-2.5 h-2.5" /> Reagendado para {format(parseISO(item.nova_data), 'dd/MM', { locale: ptBR })}
          </p>
        )}

        {/* Editar agendamento inline */}
        {editando && (
          <div className="mt-2 flex items-center gap-2 flex-wrap bg-gray-50 rounded-xl p-2.5 border border-gray-200">
            <span className="text-[11px] text-gray-500 font-medium">Data:</span>
            <input
              type="date"
              value={editData}
              onChange={e => setEditData(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
            />
            <span className="text-[11px] text-gray-500 font-medium">Horário:</span>
            <input
              type="time"
              value={editHorario}
              onChange={e => setEditHorario(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
            />
            {mensagemNaoDiaUtil(editData) && (
              <p className="text-[11px] text-red-500 flex items-center gap-1 w-full">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {mensagemNaoDiaUtil(editData)}
              </p>
            )}
            <button
              onClick={() => {
                const aviso = mensagemNaoDiaUtil(editData);
                if (aviso) { toast.error(`Não é possível agendar: ${aviso}`); return; }
                onAction(item, item.status, undefined, editData, editHorario);
                setEditando(false);
              }}
              disabled={!editData}
              className="text-xs bg-[#0f1e35] text-white px-3 py-1.5 rounded-xl hover:bg-[#1a3150] transition"
            >Salvar</button>
            <button onClick={() => setEditando(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
          </div>
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

// ── Novo Agendamento Modal ────────────────────────────────────────────────────

function NovoAgendamentoModal({ todosVendedores, clientes, todasAgendas = [], onClose, onSaved, currentUserEmail, todosVendedoresCompleto = [], user }) {
  const [form, setForm] = useState({
    vendedor_id: '',
    lead_id: '',
    data_agendada: new Date().toISOString().split('T')[0],
    horario: '',
    observacao: '',
  });
  const [saving, setSaving] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [conflito, setConflito] = useState(null); // { tipo, mensagem }

  const vendedorSelecionado = todosVendedores.find(v => v.id === form.vendedor_id);
  // Busca clientes de TODOS (não filtra por gerente) para permitir qualquer usuário agendar
  const clientesFiltrados = clientes
    .filter(c => !clienteSearch || c.nome?.toLowerCase().includes(clienteSearch.toLowerCase()))
    .slice(0, 20);

  const clienteSelecionado = clientes.find(c => c.id === form.lead_id);

  // Verificação de sobreposição em tempo real ao mudar gerente/data/horário
  const verificarConflito = (vendedor_id, lead_id, data_agendada, horario) => {
    if (!vendedor_id || !data_agendada) { setConflito(null); return; }

    const agendasDoDia = todasAgendas.filter(a =>
      a.vendedor_id === vendedor_id &&
      a.data_agendada === data_agendada &&
      a.status === 'pendente'
    );

    // 1. Mesmo lead no mesmo dia
    if (lead_id) {
      const mesmolead = agendasDoDia.find(a => a.lead_id === lead_id);
      if (mesmolead) {
        const v = todosVendedores.find(v => v.id === vendedor_id);
        setConflito({
          tipo: 'erro',
          mensagem: `${v?.nome || 'Este gerente'} já tem um agendamento pendente com ${clienteSelecionado?.nome || 'este cliente'} nesta data${mesmolead.horario ? ` às ${mesmolead.horario}` : ''}.`
        });
        return;
      }
    }

    // 2. Mesmo horário com outro cliente
    if (horario && agendasDoDia.length > 0) {
      const mesmoHorario = agendasDoDia.find(a => a.horario === horario);
      if (mesmoHorario) {
        const v = todosVendedores.find(v => v.id === vendedor_id);
        setConflito({
          tipo: 'aviso',
          mensagem: `⚠️ ${v?.nome || 'Este gerente'} já tem um compromisso às ${horario} com ${mesmoHorario.lead_nome}. Confirme se deseja sobrepor.`
        });
        return;
      }
    }

    setConflito(null);
  };

  const handleFieldChange = (updates) => {
    const newForm = { ...form, ...updates };
    setForm(newForm);
    verificarConflito(newForm.vendedor_id, newForm.lead_id, newForm.data_agendada, newForm.horario);
  };

  const handleSave = async () => {
    if (!form.vendedor_id) { toast.error('Selecione o gerente'); return; }
    if (!form.lead_id) { toast.error('Selecione o cliente/lead'); return; }
    if (!form.data_agendada) { toast.error('Informe a data'); return; }
    if (!form.horario) { toast.error('Informe o horário do agendamento'); return; }
    const aviso = mensagemNaoDiaUtil(form.data_agendada);
    if (aviso) { toast.error(`Não é possível agendar: ${aviso}`); return; }

    if (conflito?.tipo === 'erro') {
      toast.error(conflito.mensagem);
      return;
    }

    setSaving(true);
    try {
      const v = vendedorSelecionado;
      const c = clienteSelecionado;

      // Criar agendamento para o gerente destino
      const novoAgendamento = await base44.entities.AgendaContato.create({
        lead_id: c.id,
        lead_nome: c.nome,
        lead_cpf_cnpj: c.cpf_cnpj || '',
        lead_telefone: c.telefone || '',
        cliente_id: c.id,
        vendedor_id: v.id,
        vendedor_nome: v.nome,
        data_agendada: form.data_agendada,
        horario: form.horario,
        posicao_dia: 0,
        lote_id: '',
        status: 'pendente',
        resultado: form.observacao || '',
      });

      // Se quem criou é diferente do gerente destino, criar cópia na agenda de quem criou
      // Usa o user diretamente — funciona para qualquer usuário, não apenas vendedores
      const criadorId = user?.id;
      const criadorNome = user?.nome_tratamento || user?.full_name || user?.email || '';
      if (criadorId && criadorId !== v.id) {
        // Verificar sobreposição para o criador antes de criar
        const conflitoCriador = todasAgendas.filter(a =>
          a.vendedor_id === criadorId &&
          a.data_agendada === form.data_agendada &&
          a.lead_id === c.id &&
          a.status === 'pendente'
        );
        if (conflitoCriador.length === 0) {
          // Verificar conflito de horário para o criador
          const conflitHorarioCriador = todasAgendas.find(a =>
            a.vendedor_id === criadorId &&
            a.data_agendada === form.data_agendada &&
            a.horario === form.horario &&
            a.status === 'pendente'
          );
          if (conflitHorarioCriador) {
            toast.info(`Aviso: você já tem um compromisso às ${form.horario} com ${conflitHorarioCriador.lead_nome} — cópia não criada na sua agenda.`);
          } else {
            await base44.entities.AgendaContato.create({
              lead_id: c.id,
              lead_nome: c.nome,
              lead_cpf_cnpj: c.cpf_cnpj || '',
              lead_telefone: c.telefone || '',
              cliente_id: c.id,
              vendedor_id: criadorId,
              vendedor_nome: criadorNome,
              data_agendada: form.data_agendada,
              horario: form.horario,
              posicao_dia: 0,
              lote_id: '',
              status: 'pendente',
              resultado: form.observacao || '',
            });
          }
        }
      }

      // Tentar criar evento no Google Calendar do gerente
      if (novoAgendamento?.id) {
        try {
          await base44.functions.invoke('criarMeetAgenda', {
            agenda_id: novoAgendamento.id,
            lead_nome: c.nome,
            data_agendada: form.data_agendada,
            horario_inicio: form.horario,
            target_user_email: v.email || '',
            organizer_email: currentUserEmail,
            com_meet: false,
          });
          toast.success(`Agendamento criado para ${v.nome} em ${form.data_agendada.split('-').reverse().join('/')}! Evento no Google Calendar.`);
        } catch (e) {
          toast.success(`Agendamento criado para ${v.nome} em ${form.data_agendada.split('-').reverse().join('/')}!`);
        }
      }

      onSaved();
    } catch (e) {
      toast.error('Erro ao criar agendamento');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #1a3150 100%)' }}>
          <div>
            <p className="font-bold text-white text-sm">Novo Agendamento</p>
            <p className="text-blue-200 text-xs mt-0.5">Criar agendamento para qualquer gerente</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Gerente *</label>
            <select value={form.vendedor_id} onChange={e => handleFieldChange({ vendedor_id: e.target.value, lead_id: '' })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a3150]">
              <option value="">Selecione o gerente...</option>
              {todosVendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Cliente / Lead *</label>
            <input
              type="text"
              placeholder="Buscar cliente ou lead..."
              value={clienteSearch}
              onChange={e => { setClienteSearch(e.target.value); handleFieldChange({ lead_id: '' }); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] mb-1"
            />
            {clienteSelecionado ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-sm font-medium text-[#0f1e35] flex-1">{clienteSelecionado.nome}</span>
                {clienteSelecionado.vendedor_nome && (
                  <span className="text-[10px] text-blue-500">Gerente: {clienteSelecionado.vendedor_nome}</span>
                )}
                <button onClick={() => { handleFieldChange({ lead_id: '' }); setClienteSearch(''); }} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : clienteSearch.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {clientesFiltrados.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">Nenhum cliente encontrado</p>
                ) : clientesFiltrados.map(c => (
                  <button key={c.id} onClick={() => { handleFieldChange({ lead_id: c.id }); setClienteSearch(c.nome); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition">
                    <span className="font-medium">{c.nome}</span>
                    {c.cpf_cnpj && <span className="text-xs text-gray-400 ml-2">{c.cpf_cnpj}</span>}
                    {c.vendedor_nome && <span className="text-[10px] text-blue-500 ml-2">· {c.vendedor_nome}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Data do agendamento *</label>
              <input type="date" value={form.data_agendada} onChange={e => handleFieldChange({ data_agendada: e.target.value })}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#1a3150] ${mensagemNaoDiaUtil(form.data_agendada) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
              {mensagemNaoDiaUtil(form.data_agendada) && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {mensagemNaoDiaUtil(form.data_agendada)}
                </p>
              )}
            </div>
            <div className="w-36">
              <label className="text-xs text-gray-500 mb-1 block">Horário *</label>
              <input type="time" value={form.horario} onChange={e => handleFieldChange({ horario: e.target.value })}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#1a3150] ${!form.horario ? 'border-amber-300' : 'border-gray-200'}`} />
            </div>
          </div>

          {/* Alerta de sobreposição */}
          {conflito && (
            <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-medium ${
              conflito.tipo === 'erro' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{conflito.mensagem}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Observação / Contexto</label>
            <input type="text" value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
              placeholder="Motivo ou contexto da reunião..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving || conflito?.tipo === 'erro'}
            className="px-4 py-2 text-sm bg-[#0f1e35] text-white rounded-xl hover:bg-[#1a3150] transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Criar Agendamento
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AgendaCalendario({ vendedorId, vendedor, user, onClienteClick, isAdmin, todosVendedores = [], clientes = [] }) {
  const currentUserEmail = user?.email || '';
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState('semana'); // 'semana' | 'dia'
  const [updating, setUpdating] = useState(null);
  const [pipelineItem, setPipelineItem] = useState(null);
  const [showPast, setShowPast] = useState(false);
  const [showNovoAgendamento, setShowNovoAgendamento] = useState(false);
  const queryClient = useQueryClient();

  // ── Filtros globais (admin) ──
  const [filtroVendedorId, setFiltroVendedorId] = useState(''); // '' = todos
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useState('');
  const [filtroPeriodoFim, setFiltroPeriodoFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState(''); // '' = todos
  const [showFiltros, setShowFiltros] = useState(false);

  // Admin: carrega TODOS os agendamentos; gerente/SDR: só os seus
  // Mas para criação de agendamentos para outros, todos precisam da lista global
  const { data: agendaGlobal = [], isLoading } = useQuery({
    queryKey: ['agenda-contatos-global'],
    queryFn: () => base44.entities.AgendaContato.list('data_agendada', 5000),
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: agendaVendedor = [], isLoading: isLoadingVendedor } = useQuery({
    queryKey: ['agenda-contatos', vendedorId],
    queryFn: () => base44.entities.AgendaContato.filter({ vendedor_id: vendedorId }, 'data_agendada'),
    enabled: !isAdmin && !!vendedorId,
    refetchInterval: 30000,
  });

  // Lista completa de agendamentos (para verificar sobreposição ao criar para outros gerentes)
  const { data: todasAgendas = [] } = useQuery({
    queryKey: ['agenda-contatos-todos'],
    queryFn: () => base44.entities.AgendaContato.list('data_agendada', 5000),
    enabled: !isAdmin, // admin já tem agendaGlobal
    refetchInterval: 60000,
  });

  const agendaRaw = isAdmin ? agendaGlobal : agendaVendedor;
  const loading = isAdmin ? isLoading : isLoadingVendedor;
  const todasAgendasRef = isAdmin ? agendaGlobal : todasAgendas;

  // Aplica filtros
  const agenda = useMemo(() => {
    let items = agendaRaw;
    if (isAdmin && filtroVendedorId) items = items.filter(a => a.vendedor_id === filtroVendedorId);
    if (filtroPeriodoInicio) items = items.filter(a => a.data_agendada >= filtroPeriodoInicio);
    if (filtroPeriodoFim) items = items.filter(a => a.data_agendada <= filtroPeriodoFim);
    if (filtroStatus) items = items.filter(a => a.status === filtroStatus);
    return items;
  }, [agendaRaw, filtroVendedorId, filtroPeriodoInicio, filtroPeriodoFim, filtroStatus, isAdmin]);

  const filtroVendedorObj = todosVendedores.find(v => v.id === filtroVendedorId) || null;
  const vendedorEfetivo = isAdmin ? (filtroVendedorObj || vendedor) : vendedor;

  const invalidateAgenda = () => {
    if (isAdmin) queryClient.invalidateQueries(['agenda-contatos-global']);
    else queryClient.invalidateQueries(['agenda-contatos', vendedorId]);
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
      : {
          status,
          realizado_em: new Date().toISOString(),
          ...(nova_data ? { nova_data } : {}),
        };
    updateMutation.mutate({ id: item.id, data: updateData });
    toast.success(nova_data_agendada ? 'Agendamento atualizado!' : (STATUS[status]?.label || status));
  };

  const handleDelete = (item) => {
    deleteMutation.mutate(item.id);
    toast.success('Agendamento excluído!');
  };

  const temFiltroAtivo = !!(filtroVendedorId || filtroPeriodoInicio || filtroPeriodoFim || filtroStatus);

  // Build dot set for mini-cal
  const dotDates = useMemo(() => new Set(agenda.map(a => a.data_agendada)), [agenda]);

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

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Não ocultar o componente para não-admins sem agenda — eles podem querer criar agendamentos para outros
  // if (!isAdmin && agendaRaw.length === 0) return null;

  return (
    <>
      {/* ── Barra de filtros (admin) ── */}
      {isAdmin && (
        <div className="mb-4 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowFiltros(f => !f)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span>Filtros da Agenda Global</span>
              {temFiltroAtivo && (
                <span className="bg-[#0f1e35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {[filtroVendedorId, filtroPeriodoInicio, filtroPeriodoFim, filtroStatus].filter(Boolean).length} ativo(s)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {temFiltroAtivo && (
                <button
                  onClick={e => { e.stopPropagation(); setFiltroVendedorId(''); setFiltroPeriodoInicio(''); setFiltroPeriodoFim(''); setFiltroStatus(''); }}
                  className="text-xs text-red-500 hover:underline font-normal"
                >
                  Limpar
                </button>
              )}
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showFiltros ? 'rotate-90' : ''}`} />
            </div>
          </button>

          {showFiltros && (
            <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-gray-100">
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-medium">Gerente</label>
                <select
                  value={filtroVendedorId}
                  onChange={e => setFiltroVendedorId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a3150]"
                >
                  <option value="">Todos os gerentes</option>
                  {todosVendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-medium">Período — início</label>
                <input
                  type="date"
                  value={filtroPeriodoInicio}
                  onChange={e => setFiltroPeriodoInicio(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-medium">Período — fim</label>
                <input
                  type="date"
                  value={filtroPeriodoFim}
                  onChange={e => setFiltroPeriodoFim(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-medium">Status</label>
                <select
                  value={filtroStatus}
                  onChange={e => setFiltroStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a3150]"
                >
                  <option value="">Todos</option>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

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
                  style={{ width: `${(realizados / selItems.length) * 100}%` }}
                />
              </div>
            )}
            {/* Total global filtrado */}
            {isAdmin && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-blue-200/60">Total filtrado</span>
                  <span className="text-xs font-bold text-blue-200">{agenda.length}</span>
                </div>
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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
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
                <p className="text-xs text-gray-400">
                  {isAdmin
                    ? filtroVendedorObj ? `Agenda de ${filtroVendedorObj.nome}` : 'Agenda Global — todos os gerentes'
                    : `Agenda de Contatos · ${vendedor?.nome || 'Vendedor'}`}
                </p>
              </div>
              <button onClick={() => { setWeekOffset(w => w + 1); setView('semana'); }}
                className="p-2 rounded-xl bg-white border border-gray-100 hover:border-gray-300 shadow-sm transition">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNovoAgendamento(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" /> Agendar
              </button>
              <button
                onClick={() => { setWeekOffset(0); setSelectedDate(new Date()); setView('semana'); }}
                className="px-3 py-1.5 text-xs font-semibold bg-[#0f1e35] text-white rounded-xl hover:bg-[#1a3150] transition shadow-sm"
              >
                Hoje
              </button>
            </div>
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
                    <div className="flex items-center justify-between mb-2">
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

                    <div className="space-y-1">
                      {items.slice(0, 3).map(item => {
                        const sc = STATUS[item.status] || STATUS.pendente;
                        return (
                          <div key={item.id}
                            className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-medium truncate ${sc.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                            <span className="truncate">
                              {isAdmin && !filtroVendedorId ? `[${item.vendedor_nome?.split(' ')[0] || '?'}] ` : ''}
                              {item.horario ? `${item.horario} · ` : ''}{item.lead_nome}
                            </span>
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
                <>
                  {/* Agrupamento por gerente na visão global */}
                  {isAdmin && !filtroVendedorId ? (
                    (() => {
                      const porGerente = selItems.reduce((acc, it) => {
                        const key = it.vendedor_id || '_sem_gerente';
                        if (!acc[key]) acc[key] = { nome: it.vendedor_nome || 'Sem gerente', items: [] };
                        acc[key].items.push(it);
                        return acc;
                      }, {});
                      return Object.values(porGerente).map(grupo => (
                        <div key={grupo.nome}>
                          <p className="text-xs font-bold text-[#1a3150] uppercase tracking-wider mb-2 mt-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#1a3150]" />
                            {grupo.nome} · {grupo.items.length} contato{grupo.items.length !== 1 ? 's' : ''}
                          </p>
                          <div className="space-y-2 ml-3 pl-3 border-l-2 border-gray-100">
                            {grupo.items.map(item => (
                              <EventCard
                                key={item.id}
                                item={item}
                                isToday={isToday(selectedDate)}
                                onAction={handleAction}
                                onDelete={handleDelete}
                                onPipeline={setPipelineItem}
                                onClienteClick={onClienteClick}
                                updating={updating}
                              />
                            ))}
                          </div>
                        </div>
                      ));
                    })()
                  ) : (
                    selItems.map(item => (
                      <EventCard
                        key={item.id}
                        item={item}
                        isToday={isToday(selectedDate)}
                        onAction={handleAction}
                        onDelete={handleDelete}
                        onPipeline={setPipelineItem}
                        onClienteClick={onClienteClick}
                        updating={updating}
                      />
                    ))
                  )}
                </>
              )}

              {/* Próximas datas com eventos */}
              {sortedDates.filter(d => d !== selStr && d >= tStr).length > 0 && (
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
          vendedor={vendedorEfetivo}
          user={user}
          onClose={() => setPipelineItem(null)}
          onSaved={() => setPipelineItem(null)}
        />
      )}

      {/* Novo Agendamento modal (admin) */}
      {showNovoAgendamento && (
        <NovoAgendamentoModal
          todosVendedores={todosVendedores}
          clientes={clientes}
          todasAgendas={todasAgendasRef}
          currentUserEmail={currentUserEmail}
          todosVendedoresCompleto={todosVendedores}
          user={user}
          onClose={() => setShowNovoAgendamento(false)}
          onSaved={() => {
            setShowNovoAgendamento(false);
            invalidateAgenda();
            if (!isAdmin) queryClient.invalidateQueries(['agenda-contatos-todos']);
          }}
        />
      )}
    </>
  );
}