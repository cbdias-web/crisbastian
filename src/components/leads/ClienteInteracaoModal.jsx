import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Save, Star, Phone, Mail, MapPin, Clock, CheckCircle2, XCircle, MinusCircle, MessageSquare, Users, Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const today = () => new Date().toISOString().split('T')[0];

const resultadoConfig = {
  'Positivo': { color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
  'Neutro': { color: 'text-blue-600 bg-blue-50', icon: MinusCircle },
  'Negativo': { color: 'text-red-600 bg-red-50', icon: XCircle },
  'Sem resposta': { color: 'text-gray-500 bg-gray-100', icon: Clock },
};

export default function ClienteInteracaoModal({ clienteId, vendedor, user, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro' });
  const [salvando, setSalvando] = useState(false);
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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InteracaoCliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['interacoes-modal', clienteId]);
      queryClient.invalidateQueries(['interacoes-crm']);
      setShowForm(false);
      setForm({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro' });
      toast.success('Interação registrada!');
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-lg">{isLoading ? 'Carregando...' : cliente?.nome}</h3>
              {cliente?.origem === 'lead' && (
                <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">🎯 Lead</span>
              )}
              {cliente?.origem === 'lead_convertido' && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-2.5 h-2.5" /> Convertido
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              {cliente?.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cliente.telefone}</span>}
              {cliente?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{cliente.email}</span>}
              {cliente?.cpf_cnpj && <span className="text-gray-400">{cliente.cpf_cnpj}</span>}
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
          <div className="flex items-center gap-2">
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)} className="bg-[#0f1e35] hover:bg-[#1a3150] text-white">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Interação
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

          {/* Formulário de interação */}
          {showForm && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
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
                  <input type="date" value={form.proximo_contato} onChange={e => setForm(p => ({ ...p, proximo_contato: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]" />
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
                    <div key={inter.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-semibold text-gray-700">{inter.tipo}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${res.color}`}>
                            <ResIcon className="w-2.5 h-2.5" />{inter.resultado}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {inter.data_interacao ? format(parseISO(inter.data_interacao), 'dd/MM/yyyy') : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{inter.descricao}</p>
                        {inter.proximo_contato && (
                          <p className="text-[10px] text-blue-500 mt-1 flex items-center gap-1">
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