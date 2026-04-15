import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Pencil, Trash2, Save, Check, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const fmtVal = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00';
const fmtDate = (d) => d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy') : '—';

export default function ParcelasVincendasModal({ onClose, user }) {
  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filtroVendedor, setFiltroVendedor] = useState('Todos');
  const [filtroStatus, setFiltroStatus] = useState('pendente');
  const [recebendoId, setRecebendoId] = useState(null);

  const { data: parcelas = [], isLoading } = useQuery({
    queryKey: ['parcelas-modal'],
    queryFn: () => base44.entities.ParcelaVenda.list('-data_vencimento', 500),
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-parcelas'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: isAdmin,
  });

  // Filtrar parcelas por permissão do usuário
  const parcelasFiltradas = parcelas.filter(p => {
    // Usuário não-admin só vê suas próprias parcelas
    if (!isAdmin) {
      const vendedorDoUsuario = p.vendedor_id === user?.id ||
        p.created_by === user?.email ||
        p.vendedor_nome?.toLowerCase() === (user?.nome_tratamento || user?.full_name || '').toLowerCase();
      if (!vendedorDoUsuario) return false;
    }

    const statusOk = filtroStatus === 'todos' || p.status === filtroStatus;
    const vendedorOk = !isAdmin || filtroVendedor === 'Todos' || p.vendedor_nome === filtroVendedor;
    return statusOk && vendedorOk;
  }).sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''));

  const totalFiltrado = parcelasFiltradas.reduce((s, p) => s + (parseFloat(p.valor_parcela) || 0), 0);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ParcelaVenda.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['parcelas-modal']);
      queryClient.invalidateQueries(['parcelas-venda-pipeline']);
      setEditingId(null);
      toast.success('Parcela atualizada!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (parcela) => {
      // Remove do Pipeline se vinculado
      if (parcela.pipeline_id) {
        await base44.entities.Pipeline.delete(parcela.pipeline_id).catch(() => {});
      }
      // Remove AgendaContato vinculada
      const agendas = await base44.entities.AgendaContato.filter({ lead_id: parcela.venda_id });
      await Promise.all(agendas.map(a => base44.entities.AgendaContato.delete(a.id)));
      return base44.entities.ParcelaVenda.delete(parcela.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['parcelas-modal']);
      queryClient.invalidateQueries(['parcelas-venda-pipeline']);
      queryClient.invalidateQueries(['pipeline']);
      toast.success('Parcela excluída!');
    },
  });

  const receberMutation = useMutation({
    mutationFn: async (parcela) => {
      const hoje = new Date().toISOString().split('T')[0];
      const novaVenda = await base44.entities.Venda.create({
        produto: parcela.produto || '',
        assessor_comercial: parcela.vendedor_nome || '',
        vendedor_id: parcela.vendedor_id || '',
        cliente: parcela.cliente_nome || '',
        cpf_cnpj: parcela.cliente_cpf_cnpj || '',
        valor: parcela.valor_parcela || 0,
        data: hoje,
        forma_pagamento: parcela.forma_pagamento || '',
        percentual_comissao: parcela.percentual_comissao || 0,
        indicadores: parcela.indicadores || [],
        observacao: `Parcela ${parcela.numero_parcela}/${parcela.total_parcelas} recebida`,
        num_parcelas: 1,
        valor_total_contrato: parcela.valor_parcela,
      });
      if (parcela.vendedor_id && parcela.percentual_comissao) {
        await base44.entities.Comissao.create({
          venda_id: novaVenda.id,
          vendedor_id: parcela.vendedor_id,
          vendedor_nome: parcela.vendedor_nome,
          valor_venda: parcela.valor_parcela,
          percentual: parcela.percentual_comissao,
          valor_comissao: (parcela.valor_parcela * parcela.percentual_comissao) / 100,
          data_venda: hoje,
          pago: false,
        });
      }
      await base44.entities.ParcelaVenda.update(parcela.id, {
        status: 'recebida',
        data_recebimento: hoje,
        venda_gerada_id: novaVenda.id,
      });
      if (parcela.pipeline_id) {
        await base44.entities.Pipeline.update(parcela.pipeline_id, { temperatura: 'Fechado' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['parcelas-modal']);
      queryClient.invalidateQueries(['parcelas-venda-pipeline']);
      queryClient.invalidateQueries(['pipeline']);
      queryClient.invalidateQueries(['vendas']);
      queryClient.invalidateQueries(['comissoes']);
      toast.success('Parcela recebida! Venda registrada.');
    },
  });

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({
      cliente_nome: p.cliente_nome || '',
      cliente_cpf_cnpj: p.cliente_cpf_cnpj || '',
      produto: p.produto || '',
      numero_parcela: p.numero_parcela || 1,
      total_parcelas: p.total_parcelas || 1,
      valor_parcela: p.valor_parcela || 0,
      data_vencimento: p.data_vencimento || '',
      status: p.status || 'pendente',
      vendedor_nome: p.vendedor_nome || '',
      forma_pagamento: p.forma_pagamento || '',
      percentual_comissao: p.percentual_comissao || 0,
    });
  };

  const saveEdit = () => {
    updateMutation.mutate({ id: editingId, data: { ...editForm, valor_parcela: parseFloat(editForm.valor_parcela) || 0 } });
  };

  const handleDelete = (parcela) => {
    if (!confirm(`Excluir a parcela ${parcela.numero_parcela}/${parcela.total_parcelas} de "${parcela.cliente_nome}"? Esta ação não pode ser desfeita.`)) return;
    deleteMutation.mutate(parcela);
  };

  const handleReceber = (parcela) => {
    if (!confirm(`Confirmar recebimento de ${fmtVal(parcela.valor_parcela)} — Parcela ${parcela.numero_parcela}/${parcela.total_parcelas} de "${parcela.cliente_nome}"?`)) return;
    receberMutation.mutate(parcela);
  };

  const statusBadge = (s) => {
    const map = {
      pendente: 'bg-amber-100 text-amber-700',
      recebida: 'bg-emerald-100 text-emerald-700',
      inadimplente: 'bg-red-100 text-red-700',
    };
    return map[s] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Parcelas Vincendas</h2>
            <p className="text-xs text-gray-400 mt-0.5">{parcelasFiltradas.length} parcela(s) · Total: {fmtVal(totalFiltrado)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-6 py-3 border-b border-gray-50 flex flex-wrap gap-3 flex-shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Status:</span>
            {['todos', 'pendente', 'recebida', 'inadimplente'].map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition capitalize ${filtroStatus === s ? 'bg-[#0f1e35] text-white border-[#0f1e35]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                {s === 'todos' ? 'Todos' : s}
              </button>
            ))}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Vendedor:</span>
              <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
                className="px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150] bg-white">
                <option value="Todos">Todos</option>
                {vendedores.map(v => <option key={v.id} value={v.nome}>{v.nome}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : parcelasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <DollarSign className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma parcela encontrada</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Parcela</th>
                  <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold">Produto</th>
                  {isAdmin && <th className="px-4 py-3 text-left font-semibold">Vendedor</th>}
                  <th className="px-4 py-3 text-left font-semibold">Vencimento</th>
                  <th className="px-4 py-3 text-right font-semibold">Valor</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parcelasFiltradas.map(p => {
                  const vencida = p.data_vencimento && p.data_vencimento < new Date().toISOString().split('T')[0] && p.status === 'pendente';
                  const isEditing = editingId === p.id;

                  return (
                    <tr key={p.id} className={`transition ${vencida ? 'bg-red-50/50' : 'hover:bg-gray-50/60'}`}>
                      {isEditing ? (
                        <>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <input type="number" value={editForm.numero_parcela}
                                onChange={e => setEditForm(f => ({ ...f, numero_parcela: parseInt(e.target.value) || 1 }))}
                                className="w-12 text-xs border border-gray-200 rounded px-1.5 py-1 text-center" />
                              <span className="text-gray-400 text-xs">/</span>
                              <input type="number" value={editForm.total_parcelas}
                                onChange={e => setEditForm(f => ({ ...f, total_parcelas: parseInt(e.target.value) || 1 }))}
                                className="w-12 text-xs border border-gray-200 rounded px-1.5 py-1 text-center" />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <input value={editForm.cliente_nome}
                              onChange={e => setEditForm(f => ({ ...f, cliente_nome: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#1a3150]" />
                          </td>
                          <td className="px-4 py-2">
                            <input value={editForm.produto}
                              onChange={e => setEditForm(f => ({ ...f, produto: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#1a3150]" />
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-2">
                              <input value={editForm.vendedor_nome}
                                onChange={e => setEditForm(f => ({ ...f, vendedor_nome: e.target.value }))}
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#1a3150]" />
                            </td>
                          )}
                          <td className="px-4 py-2">
                            <input type="date" value={editForm.data_vencimento}
                              onChange={e => setEditForm(f => ({ ...f, data_vencimento: e.target.value }))}
                              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#1a3150]" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" step="0.01" value={editForm.valor_parcela}
                              onChange={e => setEditForm(f => ({ ...f, valor_parcela: e.target.value }))}
                              className="w-28 text-xs border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:border-[#1a3150]" />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <select value={editForm.status}
                              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#1a3150]">
                              <option value="pendente">pendente</option>
                              <option value="recebida">recebida</option>
                              <option value="inadimplente">inadimplente</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={saveEdit} disabled={updateMutation.isPending}
                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition disabled:opacity-50"
                                title="Salvar">
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="p-1.5 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-lg transition"
                                title="Cancelar">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold text-[#1a3150]">{p.numero_parcela}</span>
                            <span className="text-xs text-gray-400">/{p.total_parcelas}</span>
                            {vencida && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">Vencida</span>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800 text-xs">{p.cliente_nome || '—'}</p>
                            {p.cliente_cpf_cnpj && <p className="text-[10px] text-gray-400">{p.cliente_cpf_cnpj}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{p.produto || '—'}</td>
                          {isAdmin && <td className="px-4 py-3 text-xs text-gray-600">{p.vendedor_nome || '—'}</td>}
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${vencida ? 'text-red-600' : 'text-gray-700'}`}>
                              {fmtDate(p.data_vencimento)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-bold text-[#1a3150]">{fmtVal(p.valor_parcela)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${statusBadge(p.status)}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {p.status === 'pendente' && (
                                <button onClick={() => handleReceber(p)}
                                  disabled={receberMutation.isPending && recebendoId === p.id}
                                  className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition disabled:opacity-50"
                                  title="Marcar como recebida">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => startEdit(p)}
                                className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                                title="Editar">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {isAdmin && (
                                <button onClick={() => handleDelete(p)}
                                  disabled={deleteMutation.isPending}
                                  className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                                  title="Excluir">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer com totais */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
          <span className="text-xs text-gray-500">{parcelasFiltradas.length} parcela(s) exibida(s)</span>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">Total exibido:</span>
            <span className="font-bold text-[#1a3150] text-sm">{fmtVal(totalFiltrado)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}