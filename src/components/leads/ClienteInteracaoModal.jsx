import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Save, Star, Phone, Mail, MapPin, Clock, CheckCircle2, XCircle, MinusCircle, MessageSquare, Users, Calendar, Plus, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const today = () => new Date().toISOString().split('T')[0];

const resultadoConfig = {
  'Positivo': { style: { background: 'rgba(16,185,129,0.15)', color: '#10b981' }, icon: CheckCircle2 },
  'Neutro': { style: { background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }, icon: MinusCircle },
  'Negativo': { style: { background: 'rgba(239,68,68,0.15)', color: '#f87171' }, icon: XCircle },
  'Sem resposta': { style: { background: 'rgba(100,116,139,0.15)', color: '#94a3b8' }, icon: Clock },
};

export default function ClienteInteracaoModal({ clienteId, vendedor, user, onClose }) {
  const [showForm, setShowForm] = useState(false);
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

  const removeAgendaFutura = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const agendas = await base44.entities.AgendaContato.filter({ lead_id: clienteId });
    const futuras = agendas.filter(a => a.status === 'pendente' && a.data_agendada >= todayStr);
    for (const a of futuras) await base44.entities.AgendaContato.delete(a.id);
    queryClient.invalidateQueries(['agenda-contatos']);
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InteracaoCliente.create(data),
    onSuccess: async (_, variables) => {
      if (variables.resultado === 'Negativo') await removeAgendaFutura();
      queryClient.invalidateQueries(['interacoes-modal', clienteId]);
      queryClient.invalidateQueries(['interacoes-crm']);
      setShowForm(false);
      setForm({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro' });
      toast.success('Interação registrada!' + (variables.resultado === 'Negativo' ? ' Agenda futura removida.' : ''));
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
    createMutation.mutate({
      ...form,
      cliente_id: clienteId,
      cliente_nome: cliente?.nome || '',
      vendedor_id: vendedor?.id || '',
      vendedor_nome: vendedor?.nome || user?.full_name || '',
    });
    setSalvando(false);
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
              <Button size="sm" onClick={() => setShowForm(true)} className="bg-[#0f1e35] hover:bg-[#1a3150] text-white">
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
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Nova Interação</p>
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
                <Button size="sm" onClick={handleSave} disabled={createMutation.isPending} className="bg-[#0f1e35] hover:bg-[#1a3150]">
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar
                </Button>
                {cliente?.origem === 'lead' && (
                  <Button size="sm" variant="outline" onClick={() => {
                    if (!form.descricao.trim()) { toast.error('Salve a interação antes de converter'); return; }
                    handleSave();
                    setTimeout(() => {
                      if (confirm(`Converter ${cliente.nome} em cliente cativo?`)) converterMutation.mutate();
                    }, 500);
                  }} disabled={createMutation.isPending} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <Star className="w-3.5 h-3.5 mr-1.5" /> Salvar e Converter
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                  <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Histórico */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Histórico ({interacoes.length})
            </p>
            {interacoes.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhuma interação registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {interacoes.map(inter => {
                  const res = resultadoConfig[inter.resultado] || resultadoConfig['Neutro'];
                  const ResIcon = res.icon;
                  return (
                    <div key={inter.id} className="flex gap-3 p-3 rounded-xl" style={{ background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.1)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: '#e6edf3' }}>{inter.tipo}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={res.style}>
                            <ResIcon className="w-2.5 h-2.5" />{inter.resultado}
                          </span>
                          <span className="text-[10px] ml-auto" style={{ color: 'rgba(230,237,243,0.4)' }}>
                            {inter.data_interacao ? format(parseISO(inter.data_interacao), 'dd/MM/yyyy') : ''}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: 'rgba(230,237,243,0.65)' }}>{inter.descricao}</p>
                        {inter.proximo_contato && (
                          <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: '#00D4AA' }}>
                            <Clock className="w-2.5 h-2.5" />
                            Próximo: {format(parseISO(inter.proximo_contato), 'dd/MM/yyyy')}
                          </p>
                        )}
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