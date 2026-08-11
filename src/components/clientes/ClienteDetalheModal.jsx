import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  X, Save, Star, Phone, Mail, MapPin, Clock, CheckCircle2, XCircle,
  MinusCircle, MessageSquare, Plus, TrendingUp, User, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const today = () => new Date().toISOString().split('T')[0];

const resultadoConfig = {
  'Positivo': { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
  'Neutro': { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: MinusCircle },
  'Negativo': { color: 'text-red-600 bg-red-50 border-red-100', icon: XCircle },
  'Sem resposta': { color: 'text-gray-500 bg-gray-100 border-gray-200', icon: Clock },
};

// ── Aba Dados ─────────────────────────────────────────────────────────────────
function AbaDados({ cliente, vendedores, clientes, isAdmin, vendedor, onSaved }) {
  const canEdit = isAdmin || (vendedor && cliente?.vendedor_id === vendedor.id);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    nome: cliente?.nome || '',
    cpf_cnpj: cliente?.cpf_cnpj || '',
    email: cliente?.email || '',
    telefone: cliente?.telefone || '',
    cidade: cliente?.cidade || '',
    estado: cliente?.estado || '',
    observacao: cliente?.observacao || '',
    vendedor_id: cliente?.vendedor_id || '',
    vendedor_nome: cliente?.vendedor_nome || '',
    subcarteira: cliente?.subcarteira || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const subcarteirasDisponiveis = [...new Set(
    (clientes || []).filter(c => c.vendedor_id === form.vendedor_id && c.subcarteira).map(c => c.subcarteira)
  )].sort();

  const handleVendedor = (id) => {
    const v = vendedores.find(x => x.id === id);
    setForm(f => ({ ...f, vendedor_id: id, vendedor_nome: v?.nome || '' }));
  };

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.update(cliente.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes']);
      queryClient.invalidateQueries(['cliente-modal', cliente.id]);
      toast.success('Cliente atualizado!');
      onSaved && onSaved();
    },
  });

  // O gerente responsável pode editar os dados do cliente, mas só admin pode trocar o gerente
  const canChangeGerente = isAdmin;
  const canSave = canEdit && form.nome.trim();

  return (
    <div className="p-5 space-y-4">
      <div>
        <Label className="text-xs text-gray-500">Nome *</Label>
        <Input value={form.nome} onChange={e => set('nome', e.target.value)} disabled={!canEdit} className="mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-500">CPF / CNPJ</Label>
          <Input value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} disabled={!canEdit} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Telefone</Label>
          <Input value={form.telefone} onChange={e => set('telefone', e.target.value)} disabled={!canEdit} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Email</Label>
          <Input value={form.email} onChange={e => set('email', e.target.value)} disabled={!canEdit} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Cidade</Label>
          <Input value={form.cidade} onChange={e => set('cidade', e.target.value)} disabled={!canEdit} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Estado (UF)</Label>
          <Input value={form.estado} maxLength={2} onChange={e => set('estado', e.target.value.toUpperCase())} disabled={!canEdit} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Gerente Responsável</Label>
          <select
            value={form.vendedor_id}
            onChange={e => handleVendedor(e.target.value)}
            disabled={!canChangeGerente}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#1a3150] disabled:opacity-60 disabled:bg-gray-50"
          >
            <option value="">— Sem vínculo —</option>
            {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs text-gray-500">Subcarteira</Label>
        {subcarteirasDisponiveis.length > 0 ? (
          <select
            value={form.subcarteira || ''}
            onChange={e => set('subcarteira', e.target.value === '__nova__' ? '' : e.target.value)}
            disabled={!canEdit}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#1a3150] disabled:opacity-60"
          >
            <option value="">— Nenhuma —</option>
            {subcarteirasDisponiveis.map(sc => <option key={sc} value={sc}>📁 {sc}</option>)}
            <option value="__nova__">+ Digitar nova...</option>
          </select>
        ) : (
          <Input value={form.subcarteira} onChange={e => set('subcarteira', e.target.value)} disabled={!canEdit} placeholder="Ex: Clientes Redes Sociais" className="mt-1" />
        )}
      </div>
      <div>
        <Label className="text-xs text-gray-500">Observação</Label>
        <Textarea value={form.observacao} onChange={e => set('observacao', e.target.value)} disabled={!canEdit} rows={2} className="mt-1" />
      </div>
      {canEdit && (
        <div className="flex justify-end pt-1">
          <Button
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending || !canSave}
            className="bg-[#1a3150] hover:bg-[#0f1e35] text-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Aba Interações ─────────────────────────────────────────────────────────────
function AbaInteracoes({ clienteId, cliente, vendedor, user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(true);
  const [form, setForm] = useState({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Neutro' });

  const { data: interacoes = [] } = useQuery({
    queryKey: ['interacoes-modal', clienteId],
    queryFn: () => base44.entities.InteracaoCliente.filter({ cliente_id: clienteId }, '-data_interacao'),
    enabled: !!clienteId,
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

  const handleSave = () => {
    if (!form.descricao.trim()) { toast.error('Descreva a interação'); return; }
    createMutation.mutate({
      ...form,
      cliente_id: clienteId,
      cliente_nome: cliente?.nome || '',
      vendedor_id: vendedor?.id || '',
      vendedor_nome: vendedor?.nome || user?.full_name || '',
    });
  };

  return (
    <div className="p-5 space-y-4">
      {/* Formulário */}
      {showForm ? (
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Registrar Interação</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                {['Ligação', 'WhatsApp', 'E-mail', 'Reunião', 'Visita', 'Outro'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Resultado</label>
              <select value={form.resultado} onChange={e => setForm(p => ({ ...p, resultado: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]">
                {['Positivo', 'Neutro', 'Negativo', 'Sem resposta'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data</label>
              <input type="date" value={form.data_interacao} onChange={e => setForm(p => ({ ...p, data_interacao: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Próximo contato</label>
              <input type="date" value={form.proximo_contato} disabled={form.resultado === 'Negativo'}
                onChange={e => setForm(p => ({ ...p, proximo_contato: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150] disabled:opacity-40" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Descrição *</label>
            <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              rows={3} placeholder="Descreva o que foi tratado..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a3150] resize-none" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={createMutation.isPending} className="bg-[#0f1e35] hover:bg-[#1a3150]">
              <Save className="w-3.5 h-3.5 mr-1.5" /> {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              <X className="w-3.5 h-3.5 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={() => setShowForm(true)} className="bg-[#0f1e35] hover:bg-[#1a3150] text-white">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Interação
        </Button>
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
                <div key={inter.id} className={`flex gap-3 p-3 rounded-xl border ${res.color.split(' ').slice(1).join(' ')}`}>
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
  );
}

// ── Modal Principal ────────────────────────────────────────────────────────────
export default function ClienteDetalheModal({ clienteId, vendedores, clientes, isAdmin, vendedor, user, onClose, initialTab = 'dados' }) {
  const [tab, setTab] = useState(initialTab);

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente-modal', clienteId],
    queryFn: async () => {
      const list = await base44.entities.Cliente.list('nome', 10000);
      return list.find(c => c.id === clienteId) || null;
    },
    enabled: !!clienteId,
  });

  const initials = cliente?.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #1a3150 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {isLoading ? '…' : initials}
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-tight">{isLoading ? 'Carregando...' : cliente?.nome}</h3>
                <div className="flex flex-wrap gap-2 mt-0.5 text-blue-200 text-[11px]">
                  {cliente?.vendedor_nome && <span>👤 {cliente.vendedor_nome}</span>}
                  {cliente?.cidade && <span>📍 {[cliente.cidade, cliente.estado].filter(Boolean).join('/')}</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition ml-3">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => setTab('dados')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === 'dados' ? 'bg-white text-[#1a3150]' : 'text-blue-200 hover:bg-white/10'}`}
            >
              <User className="w-3.5 h-3.5" /> Dados do Cliente
            </button>
            <button
              onClick={() => setTab('interacoes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === 'interacoes' ? 'bg-white text-[#1a3150]' : 'text-blue-200 hover:bg-white/10'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Interações
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tab === 'dados' ? (
            <AbaDados
              cliente={cliente}
              vendedores={vendedores}
              clientes={clientes}
              isAdmin={isAdmin}
              vendedor={vendedor}
              onSaved={() => {}}
            />
          ) : (
            <AbaInteracoes
              clienteId={clienteId}
              cliente={cliente}
              vendedor={vendedor}
              user={user}
            />
          )}
        </div>
      </div>
    </div>
  );
}