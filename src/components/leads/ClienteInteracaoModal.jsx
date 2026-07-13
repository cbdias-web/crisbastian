import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Save, Star, Phone, Mail, MapPin, Clock, CheckCircle2, XCircle, MinusCircle, MessageSquare, Users, Calendar, Plus, TrendingUp, AlertCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isToday, isPast } from 'date-fns';

const today = () => new Date().toISOString().split('T')[0];

const resultadoConfig = {
  'Positivo': { style: { background: 'rgba(16,185,129,0.15)', color: '#10b981' }, icon: CheckCircle2 },
  'Neutro': { style: { background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }, icon: MinusCircle },
  'Negativo': { style: { background: 'rgba(239,68,68,0.15)', color: '#f87171' }, icon: XCircle },
  'Sem resposta': { style: { background: 'rgba(100,116,139,0.15)', color: '#94a3b8' }, icon: Clock },
};

const tipoIconMap = {
  'Ligação': Phone,
  'WhatsApp': MessageSquare,
  'E-mail': Mail,
  'Reunião': Users,
  'Visita': MapPin,
  'Outro': MessageSquare,
};

export default function ClienteInteracaoModal({ clienteId, vendedor, user, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [interacaoAgendada, setInteracaoAgendada] = useState(null);
  const [form, setForm] = useState({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro' });
  const [salvando, setSalvando] = useState(false);
  const [showPipelineForm, setShowPipelineForm] = useState(false);
  const [pipelineForm, setPipelineForm] = useState({ produto: '', valor_estimado: '', temperatura: 'Morno', descricao: '' });
  const [salvandoPipeline, setSalvandoPipeline] = useState(false);
  const queryClient = useQueryClient();

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente-modal', clienteId],
    queryFn: async () => {
      const list = await base44.entities.Cliente.list('nome', 10000);
      return list.find(c => c.id === clienteId) || null;
    },
    enabled: !!clienteId,
  });

  const { data: interacoes = [] } = useQuery({
    queryKey: ['interacoes-modal', clienteId],
    queryFn: () => base44.entities.InteracaoCliente.filter({ cliente_id: clienteId }, '-data_interacao'),
    enabled: !!clienteId,
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-modal'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }, 'nome'),
  });

  // Split interactions: agendadas (pending) vs realizadas (history)
  const { agendadas, realizadas } = useMemo(() => {
    const ag = interacoes.filter(i => i.status === 'agendada');
    const re = interacoes.filter(i => i.status !== 'agendada');
    // Agendadas: closest date first
    ag.sort((a, b) => new Date(a.data_interacao) - new Date(b.data_interacao));
    return { agendadas: ag, realizadas: re };
  }, [interacoes]);

  const removeAgendaFutura = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const agendas = await base44.entities.AgendaContato.filter({ lead_id: clienteId });
    const futuras = agendas.filter(a => a.status === 'pendente' && a.data_agendada >= todayStr);
    for (const a of futuras) await base44.entities.AgendaContato.delete(a.id);
    queryClient.invalidateQueries(['agenda-contatos']);
  };

  // Helper: auto-create a scheduled interaction for the next contact
  const criarInteracaoAgendada = async (data) => {
    if (!data.proximo_contato || data.resultado === 'Negativo') return;
    // Avoid duplicate scheduled interactions for the same date
    const existe = agendadas.some(a => a.data_interacao === data.proximo_contato);
    if (existe) return;
    await base44.entities.InteracaoCliente.create({
      cliente_id: data.cliente_id,
      cliente_nome: data.cliente_nome,
      vendedor_id: data.vendedor_id,
      vendedor_nome: data.vendedor_nome,
      tipo: data.tipo,
      data_interacao: data.proximo_contato,
      descricao: '',
      resultado: 'Sem resposta',
      status: 'agendada',
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const created = await base44.entities.InteracaoCliente.create({ ...data, status: 'realizada' });
      await criarInteracaoAgendada(data);
      return created;
    },
    onSuccess: async (_, variables) => {
      if (variables.resultado === 'Negativo') await removeAgendaFutura();
      queryClient.invalidateQueries(['interacoes-modal', clienteId]);
      queryClient.invalidateQueries(['interacoes-crm']);
      setShowForm(false);
      setInteracaoAgendada(null);
      setForm({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro' });
      const msg = 'Interação registrada!' + (variables.proximo_contato && variables.resultado !== 'Negativo' ? ' Próximo contato agendado para ' + format(parseISO(variables.proximo_contato), 'dd/MM/yyyy') + '.' : '');
      toast.success(msg);
    }
  });

  const updateScheduledMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.InteracaoCliente.update(id, { ...data, status: 'realizada' });
      await criarInteracaoAgendada(data);
    },
    onSuccess: async (_, variables) => {
      if (variables.data.resultado === 'Negativo') await removeAgendaFutura();
      queryClient.invalidateQueries(['interacoes-modal', clienteId]);
      queryClient.invalidateQueries(['interacoes-crm']);
      setShowForm(false);
      setInteracaoAgendada(null);
      setForm({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro' });
      const msg = 'Interação registrada!' + (variables.data.proximo_contato && variables.data.resultado !== 'Negativo' ? ' Próximo contato agendado para ' + format(parseISO(variables.data.proximo_contato), 'dd/MM/yyyy') + '.' : '');
      toast.success(msg);
    }
  });

  const converterMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Cliente.update(clienteId, { origem: 'lead_convertido' });
      if (cliente?.lead_id) {
        await base44.entities.Lead.update(cliente.lead_id, { convertido: true, convertido_em: new Date().toISOString() });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes-crm']);
      queryClient.invalidateQueries(['cliente-modal', clienteId]);
      toast.success('Lead convertido em cliente cativo!');
    }
  });

  const handleSave = async () => {
    if (!form.descricao.trim()) { toast.error('Descreva a interação'); return; }
    setSalvando(true);
    const payload = {
      ...form,
      cliente_id: clienteId,
      cliente_nome: cliente?.nome || '',
      vendedor_id: vendedor?.id || '',
      vendedor_nome: vendedor?.nome || user?.full_name || '',
    };
    if (interacaoAgendada) {
      updateScheduledMutation.mutate({ id: interacaoAgendada.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
    setSalvando(false);
  };

  const abrirFormAgendada = (inter) => {
    setInteracaoAgendada(inter);
    setForm({
      tipo: inter.tipo || 'Ligação',
      descricao: '',
      data_interacao: inter.data_interacao || today(),
      proximo_contato: '',
      resultado: 'Neutro',
    });
    setShowForm(true);
  };

  const abrirFormNova = () => {
    setInteracaoAgendada(null);
    setForm({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro' });
    setShowForm(true);
  };

  const descartarAgendada = async (inter) => {
    if (!confirm('Descartar este contato agendado?')) return;
    try {
      await base44.entities.InteracaoCliente.delete(inter.id);
      queryClient.invalidateQueries(['interacoes-modal', clienteId]);
      toast.success('Contato agendado descartado.');
    } catch (e) {
      toast.error('Erro ao descartar.');
    }
  };

  const handleEnviarPipeline = async () => {
    if (!pipelineForm.produto.trim()) { toast.error('Informe o produto'); return; }
    setSalvandoPipeline(true);
    try {
      await base44.entities.Pipeline.create({
        cliente_id: clienteId,
        cliente_nome: cliente?.nome || '',
        cliente_cpf_cnpj: cliente?.cpf_cnpj || '',
        cliente_telefone: cliente?.telefone || '',
        produto: pipelineForm.produto,
        valor_estimado: parseFloat(pipelineForm.valor_estimado) || 0,
        temperatura: pipelineForm.temperatura,
        descricao: pipelineForm.descricao,
        vendedor_id: vendedor?.id || '',
        vendedor_nome: vendedor?.nome || user?.full_name || '',
        origem: 'Carteira',
      });
      toast.success('Adicionado ao Pipeline!');
      setShowPipelineForm(false);
      setPipelineForm({ produto: '', valor_estimado: '', temperatura: 'Morno', descricao: '' });
    } catch (e) {
      toast.error('Erro ao adicionar ao Pipeline');
    }
    setSalvandoPipeline(false);
  };

  const isPending = createMutation.isPending || updateScheduledMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.2)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 flex items-start justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(0,212,170,0.15)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg" style={{ color: '#e6edf3' }}>{isLoading ? 'Carregando...' : cliente?.nome}</h3>
              {cliente?.origem === 'lead' && (
                <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">🎯 Lead</span>
              )}
              {cliente?.origem === 'lead_convertido' && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-2.5 h-2.5" /> Convertido
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'rgba(230,237,243,0.55)' }}>
              {cliente?.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cliente.telefone}</span>}
              {cliente?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{cliente.email}</span>}
              {cliente?.cpf_cnpj && <span style={{ color: 'rgba(230,237,243,0.4)' }}>{cliente.cpf_cnpj}</span>}
              {(cliente?.cidade || cliente?.estado) && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[cliente.cidade, cliente.estado].filter(Boolean).join(', ')}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg ml-4 flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Ações */}
          <div className="flex items-center gap-2 flex-wrap">
            {!showForm && (
              <Button size="sm" onClick={abrirFormNova} className="bg-[#0f1e35] hover:bg-[#1a3150] text-white">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Interação
              </Button>
            )}
            {!showForm && !showPipelineForm && (
              <Button size="sm" variant="outline" onClick={() => setShowPipelineForm(true)} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Enviar ao Pipeline
              </Button>
            )}
            {cliente?.origem === 'lead' && !showForm && (
              <Button size="sm" variant="outline" onClick={() => {
                if (!cliente.cpf_cnpj?.trim() || !cliente.telefone?.trim()) {
                  toast.error('Cadastro incompleto. Preencha CPF/CNPJ e telefone antes de converter.');
                  return;
                }
                if (confirm(`Converter ${cliente.nome} em cliente cativo?`)) converterMutation.mutate();
              }} disabled={converterMutation.isPending} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Star className="w-3.5 h-3.5 mr-1.5" /> Converter em Cliente
              </Button>
            )}
          </div>

          {/* Formulário Pipeline */}
          {showPipelineForm && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Adicionar ao Pipeline</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Produto *</label>
                  <input value={pipelineForm.produto} onChange={e => setPipelineForm(p => ({ ...p, produto: e.target.value }))}
                    placeholder="Produto em negociação"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Valor Estimado</label>
                  <input type="number" value={pipelineForm.valor_estimado} onChange={e => setPipelineForm(p => ({ ...p, valor_estimado: e.target.value }))}
                    placeholder="0,00" min="0" step="0.01"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Temperatura</label>
                  <select value={pipelineForm.temperatura} onChange={e => setPipelineForm(p => ({ ...p, temperatura: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                    {['Frio','Morno','Quente','Fechado','Perdido'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Observação</label>
                  <input value={pipelineForm.descricao} onChange={e => setPipelineForm(p => ({ ...p, descricao: e.target.value }))}
                    placeholder="Próximos passos, contexto..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEnviarPipeline} disabled={salvandoPipeline} className="bg-indigo-700 hover:bg-indigo-800 text-white">
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> {salvandoPipeline ? 'Salvando...' : 'Adicionar ao Pipeline'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowPipelineForm(false)}>
                  <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Formulário de interação */}
          {showForm && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.2)' }}>
              <div className="flex items-center gap-2">
                {interacaoAgendada ? (
                  <>
                    <Clock className="w-4 h-4" style={{ color: '#00D4AA' }} />
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#00D4AA' }}>
                      Registrar Contato Agendado — {format(parseISO(interacaoAgendada.data_interacao), 'dd/MM/yyyy')}
                    </p>
                  </>
                ) : (
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Nova Interação</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                    {['Ligação','WhatsApp','E-mail','Reunião','Visita','Outro'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Resultado</label>
                  <select value={form.resultado} onChange={e => setForm(p => ({ ...p, resultado: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                    {['Positivo','Neutro','Negativo','Sem resposta'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Data</label>
                  <input type="date" value={form.data_interacao} onChange={e => setForm(p => ({ ...p, data_interacao: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Próximo contato</label>
                  <input type="date" value={form.proximo_contato} disabled={form.resultado === 'Negativo'} onChange={e => setForm(p => ({ ...p, proximo_contato: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150] disabled:opacity-40 disabled:cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descrição *</label>
                <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                  rows={3} placeholder="Descreva o que foi tratado..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150] resize-none" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={handleSave} disabled={isPending} className="bg-[#0f1e35] hover:bg-[#1a3150]">
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar
                </Button>
                {cliente?.origem === 'lead' && (
                  <Button size="sm" variant="outline" onClick={() => {
                    if (!form.descricao.trim()) { toast.error('Salve a interação antes de converter'); return; }
                    handleSave();
                    setTimeout(() => {
                      if (confirm(`Converter ${cliente.nome} em cliente cativo?`)) converterMutation.mutate();
                    }, 500);
                  }} disabled={isPending} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <Star className="w-3.5 h-3.5 mr-1.5" /> Salvar e Converter
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setInteracaoAgendada(null); }}>
                  <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* ─── CONTATOS AGENDADOS (próximos follow-ups) ─── */}
          {agendadas.length > 0 && !showForm && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5" style={{ color: '#00D4AA' }} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#00D4AA' }}>
                  Contatos Agendados ({agendadas.length})
                </p>
              </div>
              <div className="space-y-2">
                {agendadas.map(inter => {
                  const TipoIcon = tipoIconMap[inter.tipo] || MessageSquare;
                  const dataObj = inter.data_interacao ? parseISO(inter.data_interacao) : null;
                  const vencido = dataObj && isPast(dataObj) && !isToday(dataObj);
                  const eHoje = dataObj && isToday(dataObj);
                  return (
                    <div key={inter.id} className="flex gap-3 p-3 rounded-xl transition"
                      style={{
                        background: eHoje || vencido ? 'rgba(245,158,11,0.08)' : 'rgba(0,212,170,0.06)',
                        border: eHoje || vencido ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(0,212,170,0.15)',
                      }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: eHoje || vencido ? 'rgba(245,158,11,0.15)' : 'rgba(0,212,170,0.12)' }}>
                        <TipoIcon className="w-3.5 h-3.5" style={{ color: eHoje || vencido ? '#fbbf24' : '#00D4AA' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: '#e6edf3' }}>{inter.tipo}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                            style={{
                              background: eHoje ? 'rgba(245,158,11,0.2)' : vencido ? 'rgba(239,68,68,0.15)' : 'rgba(0,212,170,0.15)',
                              color: eHoje ? '#fbbf24' : vencido ? '#f87171' : '#00D4AA',
                            }}>
                            <Calendar className="w-2.5 h-2.5" />
                            {dataObj ? format(dataObj, 'dd/MM/yyyy') : '—'}
                          </span>
                          {eHoje && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>Hoje</span>}
                          {vencido && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>Atrasado</span>}
                        </div>
                        <p className="text-[11px]" style={{ color: 'rgba(230,237,243,0.45)' }}>
                          {vencido ? 'Contato atrasado — registre a conversa agora.' : eHoje ? 'Contato agendado para hoje.' : 'Contato futuro agendado.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button size="sm" onClick={() => abrirFormAgendada(inter)}
                          className="text-xs" style={{ background: '#00D4AA', color: '#0d1117' }}>
                          Registrar <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                        <button onClick={() => descartarAgendada(inter)}
                          className="p-1.5 rounded-lg transition hover:bg-red-500/10"
                          style={{ color: 'rgba(230,237,243,0.35)' }} title="Descartar">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── HISTÓRICO (interações realizadas) ─── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'rgba(230,237,243,0.4)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.4)' }}>
                Histórico de Interações ({realizadas.length})
              </p>
            </div>
            {realizadas.length === 0 ? (
              <p className="text-xs italic" style={{ color: 'rgba(230,237,243,0.35)' }}>
                {agendadas.length > 0 ? 'Nenhuma interação realizada ainda. Registre o primeiro contato.' : 'Nenhuma interação registrada ainda.'}
              </p>
            ) : (
              <div className="space-y-2 relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: 'rgba(0,212,170,0.15)' }} />
                {realizadas.map((inter, idx) => {
                  const res = resultadoConfig[inter.resultado] || resultadoConfig['Neutro'];
                  const ResIcon = res.icon;
                  const TipoIcon = tipoIconMap[inter.tipo] || MessageSquare;
                  return (
                    <div key={inter.id} className="flex gap-3 relative">
                      {/* Timeline dot */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                        style={{ background: '#161b22', border: `2px solid ${res.style.color}` }}>
                        <TipoIcon className="w-3.5 h-3.5" style={{ color: res.style.color }} />
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.1)' }}>
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-xs font-semibold" style={{ color: '#e6edf3' }}>{inter.tipo}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={res.style}>
                              <ResIcon className="w-2.5 h-2.5" />{inter.resultado}
                            </span>
                            <span className="text-[10px] ml-auto flex items-center gap-1" style={{ color: 'rgba(230,237,243,0.4)' }}>
                              <Calendar className="w-2.5 h-2.5" />
                              {inter.data_interacao ? format(parseISO(inter.data_interacao), 'dd/MM/yyyy') : ''}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: 'rgba(230,237,243,0.65)' }}>{inter.descricao}</p>
                          {inter.proximo_contato && (
                            <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: '#00D4AA' }}>
                              <Clock className="w-2.5 h-2.5" />
                              Agendou próximo: {format(parseISO(inter.proximo_contato), 'dd/MM/yyyy')}
                            </p>
                          )}
                          {inter.vendedor_nome && (
                            <p className="text-[10px] mt-1" style={{ color: 'rgba(230,237,243,0.3)' }}>
                              por {inter.vendedor_nome}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}