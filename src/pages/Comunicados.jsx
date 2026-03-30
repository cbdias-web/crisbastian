import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Megaphone, Plus, Trash2, Eye, EyeOff, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Comunicados() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ titulo: '', mensagem: '', ativo: true });
  const [viewingLeituras, setViewingLeituras] = useState(null);
  const queryClient = useQueryClient();

  const { data: comunicados = [], isLoading } = useQuery({
    queryKey: ['comunicados'],
    queryFn: () => base44.entities.Comunicado.list('-created_date'),
  });

  const { data: leituras = [] } = useQuery({
    queryKey: ['comunicado-leituras'],
    queryFn: () => base44.entities.ComunicadoLeitura.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comunicado.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['comunicados']);
      toast.success('Comunicado atualizado!');
      setForm({ titulo: '', mensagem: '', ativo: true });
      setEditingId(null);
      setShowForm(false);
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Comunicado.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['comunicados']);
      toast.success('Comunicado publicado!');
      setForm({ titulo: '', mensagem: '', ativo: true });
      setShowForm(false);
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativo }) => base44.entities.Comunicado.update(id, { ativo }),
    onSuccess: () => queryClient.invalidateQueries(['comunicados'])
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const leits = leituras.filter(l => l.comunicado_id === id);
      for (const l of leits) await base44.entities.ComunicadoLeitura.delete(l.id);
      return base44.entities.Comunicado.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['comunicados']);
      queryClient.invalidateQueries(['comunicado-leituras']);
      toast.success('Comunicado removido!');
    }
  });

  const handleEdit = (c) => {
    setEditingId(c.id);
    setForm({ titulo: c.titulo, mensagem: c.mensagem, ativo: c.ativo });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.mensagem.trim()) {
      toast.error('Preencha título e mensagem');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Comunicados</h2>
            <p className="text-sm text-gray-400 mt-0.5">Mensagens exibidas aos usuários ao acessar a plataforma</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ titulo: '', mensagem: '', ativo: true }); }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition shadow-sm hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #0f1e35 0%, #1a3150 100%)' }}
          >
            <Plus className="w-4 h-4" /> Novo Comunicado
          </button>
        </div>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{editingId ? 'Editar Comunicado' : 'Novo Comunicado'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                <input
                  value={form.titulo}
                  onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ex: Atualização do sistema"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Mensagem *</label>
                <textarea
                  value={form.mensagem}
                  onChange={e => setForm(p => ({ ...p, mensagem: e.target.value }))}
                  rows={5}
                  placeholder="Digite o conteúdo do comunicado..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150] resize-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  Cancelar
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-5 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 hover:opacity-90" style={{ background: 'linear-gradient(90deg, #0f1e35 0%, #1a3150 100%)' }}>
                  {editingId ? (updateMutation.isPending ? 'Salvando...' : 'Salvar') : (createMutation.isPending ? 'Publicando...' : 'Publicar')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comunicados.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center text-gray-400">
            <Megaphone className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">Nenhum comunicado cadastrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comunicados.map(c => {
              const leiturasC = leituras.filter(l => l.comunicado_id === c.id);
              return (
                <div key={c.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${c.ativo ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${c.ativo ? 'bg-blue-50' : 'bg-gray-100'}`}>
                      <Megaphone className={`w-5 h-5 ${c.ativo ? 'text-[#1a3150]' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm">{c.titulo}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                          {c.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{c.mensagem}</p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span>Publicado em {new Date(c.created_date).toLocaleDateString('pt-BR')}</span>
                        <span>·</span>
                        <button
                          onClick={() => setViewingLeituras(viewingLeituras === c.id ? null : c.id)}
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-700 transition font-medium"
                        >
                          <Users className="w-3 h-3" /> {leiturasC.length} leitura(s)
                        </button>
                      </div>

                      {/* Lista de quem leu */}
                      {viewingLeituras === c.id && leiturasC.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-1">
                          {leiturasC.map(l => (
                            <div key={l.id} className="flex items-center justify-between text-xs text-gray-600">
                              <span>{l.user_email}</span>
                              <span className="text-gray-400">{new Date(l.lido_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(c)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                        title="Editar comunicado"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate({ id: c.id, ativo: !c.ativo })}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                        title={c.ativo ? 'Desativar' : 'Reativar'}
                      >
                        {c.ativo ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-emerald-500" />}
                      </button>
                      <button
                        onClick={() => { if (confirm('Remover este comunicado?')) deleteMutation.mutate(c.id); }}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
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