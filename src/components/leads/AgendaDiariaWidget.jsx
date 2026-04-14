import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Phone, CheckCircle2, XCircle, Clock, RotateCcw, ChevronDown, ChevronRight, TrendingUp, X } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const statusConfig = {
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  realizado: { label: 'Realizado', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  nao_atendeu: { label: 'Não atendeu', color: 'bg-red-100 text-red-600', icon: XCircle },
  reagendado: { label: 'Reagendado', color: 'bg-blue-100 text-blue-600', icon: RotateCcw },
};

const today = () => new Date().toISOString().split('T')[0];

function getLabelData(dateStr) {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Hoje';
    if (isTomorrow(d)) return 'Amanhã';
    return format(d, 'dd/MM/yyyy');
  } catch { return dateStr; }
}

export default function AgendaDiariaWidget({ vendedorId, vendedor, user, onClienteClick }) {
  const [expanded, setExpanded] = useState(true);
  const [showAllDates, setShowAllDates] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [reagendandoId, setReagendandoId] = useState(null);
  const [novaData, setNovaData] = useState('');
  const [pipelineItemId, setPipelineItemId] = useState(null); // id do item de agenda com form pipeline aberto
  const [pipelineForm, setPipelineForm] = useState({ produto: '', valor_estimado: '', temperatura: 'Morno' });
  const [salvandoPipeline, setSalvandoPipeline] = useState(false);
  const queryClient = useQueryClient();

  const handleEnviarPipeline = async (item) => {
    if (!pipelineForm.produto.trim()) { toast.error('Informe o produto'); return; }
    setSalvandoPipeline(true);
    try {
      await base44.entities.Pipeline.create({
        cliente_id: item.cliente_id || item.lead_id,
        cliente_nome: item.lead_nome || '',
        cliente_cpf_cnpj: item.lead_cpf_cnpj || '',
        cliente_telefone: item.lead_telefone || '',
        produto: pipelineForm.produto,
        valor_estimado: parseFloat(pipelineForm.valor_estimado) || 0,
        temperatura: pipelineForm.temperatura,
        vendedor_id: vendedor?.id || vendedorId || '',
        vendedor_nome: vendedor?.nome || user?.full_name || '',
        origem: 'Carteira',
      });
      toast.success(`${item.lead_nome} adicionado ao Pipeline!`);
      setPipelineItemId(null);
      setPipelineForm({ produto: '', valor_estimado: '', temperatura: 'Morno' });
    } catch (e) {
      toast.error('Erro ao adicionar ao Pipeline');
    }
    setSalvandoPipeline(false);
  };

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
      setReagendandoId(null);
    }
  });

  const marcarStatus = async (item, status) => {
    setUpdating(item.id);
    updateMutation.mutate({
      id: item.id,
      data: { status, realizado_em: new Date().toISOString() }
    });
    toast.success(statusConfig[status]?.label || status);
  };

  const confirmarReagendamento = (item) => {
    if (!novaData) { toast.error('Informe a nova data'); return; }
    updateMutation.mutate({
      id: item.id,
      data: { status: 'reagendado', nova_data: novaData, realizado_em: new Date().toISOString() }
    });
    setNovaData('');
    toast.success('Reagendado!');
  };

  // Agrupar por data
  const grouped = agenda.reduce((acc, item) => {
    const d = item.data_agendada;
    if (!acc[d]) acc[d] = [];
    acc[d].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();
  const todayStr = today();
  const hasTodayAgenda = !!grouped[todayStr];

  // Mostrar apenas datas de hoje em diante por padrão, ou todas se showAllDates
  const visibleDates = showAllDates
    ? sortedDates
    : sortedDates.filter(d => d >= todayStr);

  const totalHoje = (grouped[todayStr] || []).length;
  const realizadosHoje = (grouped[todayStr] || []).filter(i => i.status === 'realizado').length;
  const pendentesHoje = (grouped[todayStr] || []).filter(i => i.status === 'pendente').length;

  // Agenda de hoje concluída = sem pendentes (ou não há agenda hoje)
  const agendaHojeConcluida = totalHoje === 0 || pendentesHoje === 0;

  if (isLoading) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="w-6 h-6 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );

  if (agenda.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0f1e35]/5 rounded-xl">
            <Calendar className="w-5 h-5 text-[#1a3150]" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">Agenda de Contatos — Leads</p>
            {hasTodayAgenda && (
              <p className="text-xs text-gray-500 mt-0.5">
                Hoje: {realizadosHoje}/{totalHoje} realizados
                {pendentesHoje > 0 && <span className="text-amber-600 font-medium"> · {pendentesHoje} pendente{pendentesHoje > 1 ? 's' : ''}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendentesHoje > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">{pendentesHoje}</span>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {visibleDates.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">Nenhum contato agendado a partir de hoje.</div>
          ) : (
            visibleDates.map(dateStr => {
              const items = grouped[dateStr];
              const isHoje = dateStr === todayStr;
              return (
                <div key={dateStr} className={`border-b border-gray-50 last:border-0 ${isHoje ? 'bg-amber-50/30' : ''}`}>
                  <div className={`px-5 py-2 flex items-center gap-2 border-b border-gray-50 ${isHoje ? 'bg-amber-50' : 'bg-gray-50'}`}>
                    <Calendar className={`w-3.5 h-3.5 ${isHoje ? 'text-amber-600' : 'text-gray-400'}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isHoje ? 'text-amber-700' : 'text-gray-500'}`}>
                      {getLabelData(dateStr)}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{items.length} contato{items.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items.map((item, idx) => {
                      const sc = statusConfig[item.status] || statusConfig.pendente;
                      const StatusIcon = sc.icon;
                      const isReagendando = reagendandoId === item.id;
                      return (
                        <div key={item.id} className="px-5 py-3 flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-[#0f1e35]/10 text-[#1a3150] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {item.posicao_dia || idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className={`text-sm font-medium truncate ${onClienteClick ? 'text-blue-700 underline cursor-pointer hover:text-blue-900' : 'text-gray-900'}`}
                                onClick={() => onClienteClick && onClienteClick(item.lead_id)}
                              >{item.lead_nome}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${sc.color}`}>
                                <StatusIcon className="w-2.5 h-2.5" />{sc.label}
                              </span>
                            </div>
                            {item.lead_telefone && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" /> {item.lead_telefone}
                              </p>
                            )}
                            {item.lead_cpf_cnpj && (
                              <p className="text-xs text-gray-400 mt-0.5">{item.lead_cpf_cnpj}</p>
                            )}
                            {item.status === 'reagendado' && item.nova_data && (
                              <p className="text-xs text-blue-600 mt-0.5">Reagendado para: {getLabelData(item.nova_data)}</p>
                            )}
                            {isReagendando && (
                              <div className="mt-2 flex items-center gap-2">
                                <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)}
                                  className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
                                <button onClick={() => confirmarReagendamento(item)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700">Confirmar</button>
                                <button onClick={() => setReagendandoId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                              </div>
                            )}
                            {/* Mini-form Pipeline inline */}
                            {pipelineItemId === item.id && (
                              <div className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                                <p className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">Adicionar ao Pipeline</p>
                                <input value={pipelineForm.produto} onChange={e => setPipelineForm(p => ({ ...p, produto: e.target.value }))}
                                  placeholder="Produto *"
                                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white" />
                                <div className="flex gap-2">
                                  <input type="number" value={pipelineForm.valor_estimado} onChange={e => setPipelineForm(p => ({ ...p, valor_estimado: e.target.value }))}
                                    placeholder="Valor estimado" min="0"
                                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white" />
                                  <select value={pipelineForm.temperatura} onChange={e => setPipelineForm(p => ({ ...p, temperatura: e.target.value }))}
                                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400">
                                    {['Frio','Morno','Quente'].map(t => <option key={t}>{t}</option>)}
                                  </select>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => handleEnviarPipeline(item)} disabled={salvandoPipeline}
                                    className="flex-1 text-xs bg-indigo-700 hover:bg-indigo-800 text-white px-2 py-1.5 rounded-lg transition flex items-center justify-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> {salvandoPipeline ? '...' : 'Adicionar'}
                                  </button>
                                  <button onClick={() => setPipelineItemId(null)}
                                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg border border-gray-200">
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
                            {item.status === 'pendente' && (isHoje || agendaHojeConcluida) && (<>
                              <button onClick={() => marcarStatus(item, 'realizado')} disabled={updating === item.id} title="Realizado"
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => marcarStatus(item, 'nao_atendeu')} disabled={updating === item.id} title="Não atendeu"
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition">
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => { setReagendandoId(item.id); setNovaData(''); }} title="Reagendar"
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-lg transition">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </>)}
                            <button onClick={() => { setPipelineItemId(pipelineItemId === item.id ? null : item.id); setPipelineForm({ produto: '', valor_estimado: '', temperatura: 'Morno' }); }} title="Enviar ao Pipeline"
                              className={`p-1.5 rounded-lg transition ${pipelineItemId === item.id ? 'bg-indigo-200 text-indigo-800' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-500'}`}>
                              <TrendingUp className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          {sortedDates.some(d => d < todayStr) && (
            <div className="px-5 py-2 border-t border-gray-100">
              <button onClick={() => setShowAllDates(s => !s)} className="text-xs text-blue-600 hover:underline">
                {showAllDates ? 'Ocultar datas passadas' : 'Ver datas passadas também'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}