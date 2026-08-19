import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, parseISO, isToday, isPast } from 'date-fns';
import {
  X, Phone, MessageSquare, Calendar, Plus, Save, Clock, CheckCircle2,
  ChevronRight, User, Package, MapPin, Users, Mail, Loader2, Settings, DollarSign,
} from 'lucide-react';
import ConverterLeadVendaModal from './ConverterLeadVendaModal';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  danger: '#f87171',
};

const STATUS_CFG = {
  ativa: { label: 'Ativo', color: '#00D4AA' },
  aguardando: { label: 'Aguardando', color: '#fbbf24' },
  qualificado: { label: 'Qualificado', color: '#a78bfa' },
  desqualificado: { label: 'Desqualificado', color: '#f87171' },
  convertido: { label: 'Convertido', color: '#22c55e' },
  encerrada: { label: 'Encerrada', color: '#9ca3af' },
};

const TIPO_ICON = {
  'Ligação': Phone,
  'WhatsApp': MessageSquare,
  'E-mail': Mail,
  'Reunião': Users,
  'Visita': MapPin,
  'Outro': MessageSquare,
};

const today = () => new Date().toISOString().split('T')[0];

export default function LeadAbordagemModal({ conversa, user, vendedor, isAdmin, onAbrirChat, onGerenciar, onClose, onAtualizado }) {
  const leadKey = conversa.lead_id || conversa.id;
  const queryClient = useQueryClient();
  const [showFormInteracao, setShowFormInteracao] = useState(false);
  const [showFormAgenda, setShowFormAgenda] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [formInteracao, setFormInteracao] = useState({
    tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro',
  });
  const [formAgenda, setFormAgenda] = useState({
    data_agendada: today(), horario: '09:00', resultado: '',
  });

  const vendRef = vendedor || { id: conversa.vendedor_id || '', nome: conversa.vendedor_nome || user?.full_name || '' };

  const { data: interacoes = [] } = useQuery({
    queryKey: ['interacoes-lead', leadKey],
    queryFn: () => base44.entities.InteracaoCliente.filter({ cliente_id: leadKey }, '-data_interacao'),
  });

  const { data: agendas = [] } = useQuery({
    queryKey: ['agenda-lead', leadKey],
    queryFn: () => base44.entities.AgendaContato.filter({ lead_id: leadKey }, 'data_agendada'),
  });

  const agendadas = interacoes.filter(i => i.status === 'agendada')
    .sort((a, b) => new Date(a.data_interacao) - new Date(b.data_interacao));
  const realizadas = interacoes.filter(i => i.status !== 'agendada');

  const salvarInteracao = async () => {
    if (!formInteracao.descricao.trim()) { toast.error('Descreva a interação'); return; }
    setSalvando(true);
    try {
      await base44.entities.InteracaoCliente.create({
        cliente_id: leadKey,
        cliente_nome: conversa.lead_nome || '',
        vendedor_id: vendRef.id || '',
        vendedor_nome: vendRef.nome || '',
        tipo: formInteracao.tipo,
        descricao: formInteracao.descricao.trim(),
        data_interacao: formInteracao.data_interacao,
        proximo_contato: formInteracao.proximo_contato || null,
        resultado: formInteracao.resultado,
        status: 'realizada',
      });
      // Cria próxima interação agendada automaticamente
      if (formInteracao.proximo_contato && formInteracao.resultado !== 'Negativo') {
        const existe = agendadas.some(a => a.data_interacao === formInteracao.proximo_contato);
        if (!existe) {
          await base44.entities.InteracaoCliente.create({
            cliente_id: leadKey,
            cliente_nome: conversa.lead_nome || '',
            vendedor_id: vendRef.id || '',
            vendedor_nome: vendRef.nome || '',
            tipo: formInteracao.tipo,
            data_interacao: formInteracao.proximo_contato,
            descricao: '',
            resultado: 'Sem resposta',
            status: 'agendada',
          });
        }
      }
      toast.success('Interação registrada!');
      setShowFormInteracao(false);
      setFormInteracao({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro' });
      queryClient.invalidateQueries({ queryKey: ['interacoes-lead', leadKey] });
      onAtualizado?.();
    } catch (e) {
      toast.error('Erro ao salvar: ' + e.message);
    }
    setSalvando(false);
  };

  const salvarAgenda = async () => {
    if (!formAgenda.data_agendada) { toast.error('Informe a data'); return; }
    setSalvando(true);
    try {
      await base44.entities.AgendaContato.create({
        lead_id: leadKey,
        lead_nome: conversa.lead_nome || '',
        lead_telefone: conversa.telefone || '',
        vendedor_id: vendRef.id || '',
        vendedor_nome: vendRef.nome || '',
        data_agendada: formAgenda.data_agendada,
        horario: formAgenda.horario || '',
        status: 'pendente',
        resultado: formAgenda.resultado || '',
      });
      toast.success('Compromisso agendado!');
      setShowFormAgenda(false);
      setFormAgenda({ data_agendada: today(), horario: '09:00', resultado: '' });
      queryClient.invalidateQueries({ queryKey: ['agenda-lead', leadKey] });
      onAtualizado?.();
    } catch (e) {
      toast.error('Erro ao agendar: ' + e.message);
    }
    setSalvando(false);
  };

  const descartarAgendada = async (inter) => {
    if (!confirm('Descartar este contato agendado?')) return;
    try {
      await base44.entities.InteracaoCliente.delete(inter.id);
      queryClient.invalidateQueries({ queryKey: ['interacoes-lead', leadKey] });
      toast.success('Contato agendado descartado.');
    } catch (e) { toast.error('Erro ao descartar.'); }
  };

  const stCfg = STATUS_CFG[conversa.status] || STATUS_CFG.ativa;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[calc(100vh-140px)] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${AURORA.border}`, background: AURORA.surface2 }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-base" style={{ color: AURORA.text }}>{conversa.lead_nome}</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${stCfg.color}22`, color: stCfg.color }}>{stCfg.label}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs" style={{ color: AURORA.textMuted }}>
              {conversa.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{conversa.telefone}</span>}
              {conversa.vendedor_nome && <span className="flex items-center gap-1"><User className="w-3 h-3" />{conversa.vendedor_nome}</span>}
              {conversa.produto_interesse && <span className="flex items-center gap-1"><Package className="w-3 h-3" />{conversa.produto_interesse}</span>}
              {conversa.origem && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{conversa.origem}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: AURORA.textMuted }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ações */}
        <div className="px-5 py-3 flex items-center gap-2 flex-wrap flex-shrink-0" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
          {!showFormInteracao && !showFormAgenda && (
            <>
              <button onClick={() => setShowFormInteracao(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                style={{ background: AURORA.accent, color: '#0d1117' }}>
                <Plus className="w-3.5 h-3.5" /> Nova Interação
              </button>
              <button onClick={() => setShowFormAgenda(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                <Calendar className="w-3.5 h-3.5" /> Agendar Compromisso
              </button>
              <button onClick={onAbrirChat}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition"
                style={{ background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
                <MessageSquare className="w-3.5 h-3.5" /> Abrir Chat
              </button>
              <button onClick={() => setShowConverter(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                <DollarSign className="w-3.5 h-3.5" /> Converter em Venda
              </button>
              <button onClick={onGerenciar}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition"
                style={{ background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
                <Settings className="w-3.5 h-3.5" /> Gerenciar
              </button>
            </>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Form Nova Interação */}
          {showFormInteracao && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: AURORA.accent }}>Nova Interação · Abordagem Comercial</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Tipo</label>
                  <select value={formInteracao.tipo} onChange={e => setFormInteracao(p => ({ ...p, tipo: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                    {['Ligação', 'WhatsApp', 'E-mail', 'Reunião', 'Visita', 'Outro'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Resultado</label>
                  <select value={formInteracao.resultado} onChange={e => setFormInteracao(p => ({ ...p, resultado: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                    {['Positivo', 'Neutro', 'Negativo', 'Sem resposta'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Data</label>
                  <input type="date" value={formInteracao.data_interacao} onChange={e => setFormInteracao(p => ({ ...p, data_interacao: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
                </div>
                <div>
                  <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Próximo contato</label>
                  <input type="date" value={formInteracao.proximo_contato} disabled={formInteracao.resultado === 'Negativo'}
                    onChange={e => setFormInteracao(p => ({ ...p, proximo_contato: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none disabled:opacity-40"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
                </div>
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Descrição *</label>
                <textarea value={formInteracao.descricao} onChange={e => setFormInteracao(p => ({ ...p, descricao: e.target.value }))}
                  rows={3} placeholder="Descreva a abordagem, o que foi tratado, próximos passos..."
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
              </div>
              <div className="flex gap-2">
                <button onClick={salvarInteracao} disabled={salvando}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-40"
                  style={{ background: AURORA.accent, color: '#0d1117' }}>
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Interação
                </button>
                <button onClick={() => setShowFormInteracao(false)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
                  <X className="w-4 h-4" /> Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Form Agendar Compromisso */}
          {showFormAgenda && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#a78bfa' }}>Agendar Compromisso</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Data *</label>
                  <input type="date" value={formAgenda.data_agendada} onChange={e => setFormAgenda(p => ({ ...p, data_agendada: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
                </div>
                <div>
                  <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Horário</label>
                  <input type="time" value={formAgenda.horario} onChange={e => setFormAgenda(p => ({ ...p, horario: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
                </div>
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Observação</label>
                <input value={formAgenda.resultado} onChange={e => setFormAgenda(p => ({ ...p, resultado: e.target.value }))}
                  placeholder="Pauta do compromisso, objetivos..."
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
              </div>
              <div className="flex gap-2">
                <button onClick={salvarAgenda} disabled={salvando}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-40"
                  style={{ background: '#a78bfa', color: '#0d1117' }}>
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />} Agendar
                </button>
                <button onClick={() => setShowFormAgenda(false)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
                  <X className="w-4 h-4" /> Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Compromissos agendados (AgendaContato) */}
          {!showFormInteracao && !showFormAgenda && agendas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#a78bfa' }}>
                  Compromissos Agendados ({agendas.filter(a => a.status === 'pendente').length})
                </p>
              </div>
              <div className="space-y-2">
                {agendas.filter(a => a.status === 'pendente').map(ag => {
                  const dataObj = ag.data_agendada ? parseISO(ag.data_agendada) : null;
                  const vencido = dataObj && isPast(dataObj) && !isToday(dataObj);
                  const eHoje = dataObj && isToday(dataObj);
                  return (
                    <div key={ag.id} className="flex gap-3 p-3 rounded-xl"
                      style={{
                        background: eHoje || vencido ? 'rgba(245,158,11,0.08)' : 'rgba(139,92,246,0.06)',
                        border: eHoje || vencido ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(139,92,246,0.2)',
                      }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
                        <Calendar className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: AURORA.text }}>
                          {dataObj ? format(dataObj, 'dd/MM/yyyy') : '—'} {ag.horario && `às ${ag.horario}`}
                        </p>
                        {ag.resultado && <p className="text-[11px]" style={{ color: AURORA.textMuted }}>{ag.resultado}</p>}
                      </div>
                      {eHoje && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full h-fit" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>Hoje</span>}
                      {vencido && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full h-fit" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>Atrasado</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contatos agendados (próximos follow-ups) */}
          {!showFormInteracao && !showFormAgenda && agendadas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5" style={{ color: AURORA.accent }} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: AURORA.accent }}>
                  Próximos Follow-ups ({agendadas.length})
                </p>
              </div>
              <div className="space-y-2">
                {agendadas.map(inter => {
                  const TipoIcon = TIPO_ICON[inter.tipo] || MessageSquare;
                  const dataObj = inter.data_interacao ? parseISO(inter.data_interacao) : null;
                  const vencido = dataObj && isPast(dataObj) && !isToday(dataObj);
                  const eHoje = dataObj && isToday(dataObj);
                  return (
                    <div key={inter.id} className="flex gap-3 p-3 rounded-xl items-center"
                      style={{
                        background: eHoje || vencido ? 'rgba(245,158,11,0.08)' : 'rgba(0,212,170,0.06)',
                        border: eHoje || vencido ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(0,212,170,0.15)',
                      }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: eHoje || vencido ? 'rgba(245,158,11,0.15)' : 'rgba(0,212,170,0.12)' }}>
                        <TipoIcon className="w-3.5 h-3.5" style={{ color: eHoje || vencido ? '#fbbf24' : AURORA.accent }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold" style={{ color: AURORA.text }}>{inter.tipo}</span>
                        <span className="text-[10px] ml-2" style={{ color: AURORA.textMuted }}>
                          {dataObj ? format(dataObj, 'dd/MM/yyyy') : '—'}
                        </span>
                        {eHoje && <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>Hoje</span>}
                        {vencido && <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>Atrasado</span>}
                      </div>
                      <button onClick={() => descartarAgendada(inter)} className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }} title="Descartar">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Histórico de interações */}
          {!showFormInteracao && !showFormAgenda && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: AURORA.textMuted }}>
                  Histórico de Interações ({realizadas.length})
                </p>
              </div>
              {realizadas.length === 0 ? (
                <p className="text-xs italic" style={{ color: AURORA.textMuted }}>
                  {agendadas.length > 0 || agendas.length > 0 ? 'Nenhuma interação realizada ainda. Registre o primeiro contato.' : 'Nenhuma interação registrada ainda.'}
                </p>
              ) : (
                <div className="space-y-2 relative">
                  <div className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: AURORA.border }} />
                  {realizadas.map(inter => {
                    const TipoIcon = TIPO_ICON[inter.tipo] || MessageSquare;
                    const resColor = { 'Positivo': '#34d399', 'Neutro': '#60a5fa', 'Negativo': '#f87171', 'Sem resposta': '#94a3b8' }[inter.resultado] || '#60a5fa';
                    return (
                      <div key={inter.id} className="flex gap-3 relative">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                          style={{ background: AURORA.surface, border: `2px solid ${resColor}` }}>
                          <TipoIcon className="w-3.5 h-3.5" style={{ color: resColor }} />
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="p-3 rounded-xl" style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.1)' }}>
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="text-xs font-semibold" style={{ color: AURORA.text }}>{inter.tipo}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${resColor}22`, color: resColor }}>{inter.resultado}</span>
                              <span className="text-[10px] ml-auto flex items-center gap-1" style={{ color: AURORA.textMuted }}>
                                <Calendar className="w-2.5 h-2.5" />
                                {inter.data_interacao ? format(parseISO(inter.data_interacao), 'dd/MM/yyyy') : ''}
                              </span>
                            </div>
                            <p className="text-xs" style={{ color: 'rgba(230,237,243,0.65)' }}>{inter.descricao}</p>
                            {inter.proximo_contato && (
                              <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: AURORA.accent }}>
                                <Clock className="w-2.5 h-2.5" /> Agendou próximo: {format(parseISO(inter.proximo_contato), 'dd/MM/yyyy')}
                              </p>
                            )}
                            {inter.vendedor_nome && <p className="text-[10px] mt-1" style={{ color: AURORA.textMuted }}>por {inter.vendedor_nome}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showConverter && (
        <ConverterLeadVendaModal
          conversa={conversa}
          onClose={() => setShowConverter(false)}
          onConcluido={() => { queryClient.invalidateQueries({ queryKey: ['interacoes-lead', leadKey] }); onAtualizado?.(); }}
        />
      )}
    </div>
  );
}