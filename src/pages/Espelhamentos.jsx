import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, X, Edit2, Trash2, UserCheck, Download, FileText, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Espelhamentos() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nome: '', email: '', telefone: '', percentual_comissao: 10, ativo: true
  });
  const [geratingPDF, setGeratingPDF] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [mesFiltro, setMesFiltro] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [statusFilter, setStatusFilter] = useState("ativo");
  const [selectedForEmail, setSelectedForEmail] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [enviosRealizados, setEnviosRealizados] = useState([]);
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: indicadores = [], isLoading } = useQuery({
    queryKey: ['espelhamentos'],
    queryFn: () => base44.entities.Espelhamento.list('nome'),
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Espelhamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['espelhamentos']);
      toast.success('Indicador criado!');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Espelhamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['espelhamentos']);
      toast.success('Indicador atualizado!');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Espelhamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['espelhamentos']);
      toast.success('Indicador removido!');
    },
  });

  const resetForm = () => {
    setFormData({ nome: '', email: '', telefone: '', percentual_comissao: 10, ativo: true });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = { ...formData, percentual_comissao: parseFloat(formData.percentual_comissao) || 10 };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja remover este indicador?')) {
      deleteMutation.mutate(id);
    }
  };

  const [anoFiltro, mesFiltroNum] = mesFiltro.split("-");
  const dateFrom = `${mesFiltro}-01`;
  const lastDay = new Date(parseInt(anoFiltro), parseInt(mesFiltroNum), 0).getDate();
  const dateTo = `${mesFiltro}-${String(lastDay).padStart(2, "0")}`;

  const gerarRelatorio = async (indicador) => {
    setGeratingPDF(indicador.id);
    try {
      const response = await base44.functions.invoke('gerarRelatorioPDF', {
        tipo: 'indicador',
        vendedor_id: indicador.id,
        vendedor_nome: indicador.nome,
        dataInicio: dateFrom,
        dataFim: dateTo
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${indicador.nome.replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório gerado!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao gerar relatório');
    }
    setGeratingPDF(null);
  };

  const gerarRelatorioGeral = async () => {
    if (comDados.length === 0) {
      toast.error('Nenhum indicador com comissão no período');
      return;
    }
    
    setGeratingPDF('geral');
    try {
      const indicadoresIds = comDados.map(e => e.id);
      const indicadoresNomes = comDados.map(e => e.nome);
      
      const response = await base44.functions.invoke('gerarRelatorioComissoesPDF', {
        indicadores_ids: indicadoresIds,
        indicadores_nomes: indicadoresNomes,
        dataInicio: dateFrom,
        dataFim: dateTo
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-indicadores-${mesFiltro}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório geral gerado!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao gerar relatório');
    }
    setGeratingPDF(null);
  };

  const enviarRelatorioPorEmail = async (indicador) => {
    if (!indicador.email) {
      toast.error('Indicador não possui e-mail cadastrado');
      return;
    }
    if (!confirm(`Enviar relatório do período para ${indicador.email}?`)) return;
    
    setSendingEmail(indicador.id);
    try {
      await base44.functions.invoke('enviarRelatorioPorEmail', {
        tipo: 'indicador',
        vendedor_id: indicador.id,
        vendedor_nome: indicador.nome,
        vendedor_email: indicador.email,
        dataInicio: dateFrom,
        dataFim: dateTo
      });
      toast.success(`Relatório enviado para ${indicador.email}!`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao enviar e-mail');
    }
    setSendingEmail(null);
  };

  const toggleSelectForEmail = (id) => {
    setSelectedForEmail(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const abrirModalEnvio = () => {
    const comEmail = comDados.filter(i => i.email);
    if (comEmail.length === 0) {
      toast.error('Nenhum indicador com e-mail cadastrado');
      return;
    }
    const historicoKey = `envios_relatorios_indicadores_${mesFiltro}`;
    const historico = JSON.parse(localStorage.getItem(historicoKey) || '[]');
    setEnviosRealizados(historico);
    setShowEmailModal(true);
  };

  const enviarRelatoriosEmMassa = async () => {
    const selecionados = comDados.filter(i => selectedForEmail.includes(i.id) && i.email);
    
    setSendingBulk(true);
    let sucessos = 0;
    let erros = 0;
    const novosEnvios = [];
    
    for (const i of selecionados) {
      try {
        await base44.functions.invoke('enviarRelatorioPorEmail', {
          tipo: 'indicador',
          vendedor_id: i.id,
          vendedor_nome: i.nome,
          vendedor_email: i.email,
          dataInicio: dateFrom,
          dataFim: dateTo
        });
        sucessos++;
        novosEnvios.push({
          vendedor_id: i.id,
          vendedor_nome: i.nome,
          vendedor_email: i.email,
          data_envio: new Date().toISOString(),
          periodo: `${dateFrom} a ${dateTo}`
        });
      } catch (error) {
        erros++;
      }
    }
    
    const historicoKey = `envios_relatorios_indicadores_${mesFiltro}`;
    const historicoAtual = JSON.parse(localStorage.getItem(historicoKey) || '[]');
    localStorage.setItem(historicoKey, JSON.stringify([...historicoAtual, ...novosEnvios]));
    
    setSendingBulk(false);
    setShowEmailModal(false);
    setSelectedForEmail([]);
    
    if (erros === 0) {
      toast.success(`${sucessos} relatório(s) enviado(s) com sucesso!`);
    } else {
      toast.warning(`${sucessos} enviado(s), ${erros} erro(s)`);
    }
  };

  const indicadoresFiltrados = indicadores.filter(i => {
    if (!isAdmin && user?.email && i.email !== user.email) return false;
    if (statusFilter === "todos") return true;
    if (statusFilter === "ativo") return i.ativo !== false;
    return i.ativo === false;
  });

  const visibleIndicadores = indicadoresFiltrados.map(i => {
    const vendasI = vendas.filter(v =>
      (v.indicadores?.some(ind => ind.id === i.id) || v.espelhamento_id === i.id || v.espelhamento === i.nome) &&
      v.data && v.data >= dateFrom && v.data <= dateTo
    );
    return { ...i, _temDados: vendasI.length > 0 };
  }).sort((a, b) => {
    if (a._temDados && !b._temDados) return -1;
    if (!a._temDados && b._temDados) return 1;
    return a.nome.localeCompare(b.nome);
  });

  const comDados = visibleIndicadores.filter(i => i._temDados);
  const semDados = visibleIndicadores.filter(i => !i._temDados);

  const exportCSV = (items) => {
    const headers = ["Nome", "E-mail", "Telefone", "Comissão (%)", "Status"];
    const rows = items.map(i => [i.nome || "", i.email || "", i.telefone || "", i.percentual_comissao ?? "", i.ativo ? "Ativo" : "Inativo"]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "indicadores.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Indicadores</h2>
            <p className="text-gray-400 text-sm">{indicadores.length} indicadores cadastrados</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={() => exportCSV(visibleIndicadores)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
                <Download className="w-4 h-4" /> Exportar
              </button>
              <button 
                onClick={gerarRelatorioGeral}
                disabled={geratingPDF === 'geral'}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50">
                {geratingPDF === 'geral' ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Relatório Geral
              </button>
              <button 
                onClick={abrirModalEnvio}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow-sm">
                <Send className="w-4 h-4" /> Enviar Relatórios
              </button>
              <button onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0f1e35] to-[#1a3150] text-white text-sm font-medium rounded-xl hover:opacity-90 transition shadow-sm">
                <Plus className="w-4 h-4" /> Novo Indicador
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={mesFiltro}
            onChange={e => setMesFiltro(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white text-gray-600"
          />
          {isAdmin && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white text-gray-600">
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
              <option value="todos">Todos</option>
            </select>
          )}
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{editingItem ? 'Editar Indicador' : 'Novo Indicador'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nome *</label>
                <input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">E-mail</label>
                <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
                <input value={formData.telefone || ''} onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Comissão (%)</label>
                <input type="number" step="0.1" value={formData.percentual_comissao} onChange={e => setFormData({ ...formData, percentual_comissao: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                <select value={formData.ativo === false ? "inativo" : "ativo"} onChange={e => setFormData({ ...formData, ativo: e.target.value === "ativo" })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150] bg-white">
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 text-sm bg-gradient-to-r from-[#0f1e35] to-[#1a3150] text-white rounded-lg hover:opacity-90 transition font-medium">Salvar</button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visibleIndicadores.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center text-gray-400">
            <UserCheck className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">Nenhum indicador encontrado</p>
          </div>
        ) : (
          <>
            {comDados.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {comDados.map(i => {
                  const vendasDoMes = vendas.filter(v =>
                    (v.indicadores?.some(ind => ind.id === i.id) || v.espelhamento_id === i.id || v.espelhamento === i.nome) &&
                    v.data && v.data >= dateFrom && v.data <= dateTo
                  );
                  const volume = vendasDoMes.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);

                  return (
                    <div key={i.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0f1e35] to-[#1a3150] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {i.nome?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{i.nome}</p>
                            <p className="text-xs text-gray-400">{i.email || "—"}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${i.ativo !== false ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                          {i.ativo !== false ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="text-center p-2 bg-gray-50 rounded-xl">
                          <p className="text-lg font-bold text-gray-900">{vendasDoMes.length}</p>
                          <p className="text-[10px] text-gray-400">Vendas</p>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded-xl">
                          <p className="text-xs font-bold text-blue-700">{i.percentual_comissao ?? 0}%</p>
                          <p className="text-[10px] text-blue-400">Comissão</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end text-xs text-gray-400">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => gerarRelatorio(i)} 
                            disabled={geratingPDF === i.id}
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                            title="Gerar relatório PDF"
                          >
                            {geratingPDF === i.id ? (
                              <div className="w-3.5 h-3.5 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-blue-500" />
                            )}
                          </button>
                          {isAdmin && i.email && (
                            <button
                              onClick={() => enviarRelatorioPorEmail(i)}
                              disabled={sendingEmail === i.id}
                              className="p-1.5 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                              title="Enviar relatório por e-mail"
                            >
                              {sendingEmail === i.id ? (
                                <div className="w-3.5 h-3.5 border border-green-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5 text-green-600" />
                              )}
                            </button>
                          )}
                          {isAdmin && (
                            <>
                              <button onClick={() => handleEdit(i)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                                <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              <button onClick={() => handleDelete(i.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition">
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isLoading && semDados.length > 0 && (
              <>
                <div className="pt-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">
                    Sem vendas no período
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
                  {semDados.map(i => (
                    <div key={i.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {i.nome?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{i.nome}</p>
                            <p className="text-xs text-gray-400">{i.email || "—"}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${i.ativo !== false ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                          {i.ativo !== false ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="text-center p-2 bg-gray-50 rounded-xl">
                          <p className="text-lg font-bold text-gray-400">0</p>
                          <p className="text-[10px] text-gray-400">Vendas</p>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded-xl">
                          <p className="text-xs font-bold text-blue-300">{i.percentual_comissao ?? 0}%</p>
                          <p className="text-[10px] text-blue-300">Comissão</p>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center justify-end text-xs text-gray-400">
                          <div className="flex gap-1">
                            <button onClick={() => handleEdit(i)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                              <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <button onClick={() => handleDelete(i.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Modal de Envio em Massa */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Enviar Relatórios por E-mail</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Selecione os indicadores que receberão o relatório do período</p>
                </div>
                <button onClick={() => setShowEmailModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
                <div className="bg-blue-50 rounded-xl p-4 mb-5">
                  <p className="text-xs text-gray-500 mb-1">Período do Relatório:</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(dateFrom).toLocaleDateString('pt-BR')} até {new Date(dateTo).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Indicadores (com e-mail cadastrado)</p>
                    <button onClick={() => setSelectedForEmail([])} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                      Desmarcar Todos
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {comDados.filter(i => i.email).map(i => {
                      const vendasDoMes = vendas.filter(v =>
                        (v.indicadores?.some(ind => ind.id === i.id) || v.espelhamento_id === i.id || v.espelhamento === i.nome) &&
                        v.data && v.data >= dateFrom && v.data <= dateTo
                      );
                      const volume = vendasDoMes.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
                      const foiEnviado = enviosRealizados.find(e => e.vendedor_id === i.id);
                      
                      return (
                        <div key={i.id} className={`flex items-center gap-3 p-3 rounded-lg ${foiEnviado ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            checked={selectedForEmail.includes(i.id)}
                            onChange={() => toggleSelectForEmail(i.id)}
                            className="w-4 h-4 accent-blue-600 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{i.nome}</p>
                              {foiEnviado && (
                                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Enviado
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{i.email}</p>
                            {foiEnviado && (
                              <p className="text-[10px] text-green-600 mt-0.5">
                                Enviado em {new Date(foiEnviado.data_envio).toLocaleDateString('pt-BR')} às {new Date(foiEnviado.data_envio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{vendasDoMes.length} vendas</p>
                            <p className="text-xs font-semibold text-gray-700">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(volume)} pendente
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Mensagem do E-mail:</p>
                  <p className="text-xs text-gray-600 italic leading-relaxed">
                    "Relatório para conferência e acompanhamento da comissão gerada no período especificado. Caso haja alguma divergência ou necessidade de ajuste, falar com a gestão do produto.
                    <br /><br />
                    Atenciosamente!<br />
                    <strong>VILLELA EXCHANGE</strong>"
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {selectedForEmail.length} indicador(es) selecionado(s)
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
                    Cancelar
                  </button>
                  <button
                    onClick={enviarRelatoriosEmMassa}
                    disabled={sendingBulk || selectedForEmail.length === 0}
                    className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
                  >
                    {sendingBulk ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar Relatórios
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}