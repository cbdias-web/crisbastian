import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, Edit2, Trash2, UserCheck, Download, FileText, DollarSign, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const EMPTY = { nome: "", email: "", time: "", percentual_comissao: 10, ativo: true };

const exportCSV = (vendedores) => {
  const headers = ["Nome", "E-mail", "Time", "Comissão (%)", "Status"];
  const rows = vendedores.map(v => [v.nome || "", v.email || "", v.time || "", v.percentual_comissao ?? "", v.ativo ? "Ativo" : "Inativo"]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "vendedores.csv"; a.click();
  URL.revokeObjectURL(url);
};

export default function Vendedores() {
  const [modal, setModal] = useState(null); // null | "create" | vendedor object
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ativo");
  const [mesFiltro, setMesFiltro] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [geratingPDF, setGeratingPDF] = useState(null);
  const [modalBonus, setModalBonus] = useState(null); // {vendedor_id, vendedor_nome, valor_atual}
  const [valorBonus, setValorBonus] = useState("");
  const [sendingEmail, setSendingEmail] = useState(null);

  const queryClient = useQueryClient();

  const { data: vendedores = [], isLoading } = useQuery({
    queryKey: ["vendedores"],
    queryFn: () => base44.entities.Vendedor.list("nome"),
  });

  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin" || user?.permissao_admin === true;

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas"],
    queryFn: () => base44.entities.Venda.list(),
  });

  const { data: metas = [] } = useQuery({
    queryKey: ["metas"],
    queryFn: () => base44.entities.Meta.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, permissao_admin }) => base44.entities.User.update(id, { permissao_admin }),
    onSuccess: () => { queryClient.invalidateQueries(["usuarios"]); toast.success("Permissão atualizada!"); },
  });

  const openCreate = () => { setForm(EMPTY); setModal("create"); };
  const openEdit = (v) => { setForm({ ...v }); setModal(v); };

  const save = async () => {
    setSaving(true);
    if (modal === "create") {
      await base44.entities.Vendedor.create(form);
      toast.success("Vendedor criado!");
    } else {
      await base44.entities.Vendedor.update(modal.id, form);
      toast.success("Vendedor atualizado!");
    }
    setSaving(false);
    setModal(null);
    queryClient.invalidateQueries(["vendedores"]);
  };

  const remove = async (id) => {
    await base44.entities.Vendedor.delete(id);
    setDeleteConfirm(null);
    queryClient.invalidateQueries(["vendedores"]);
    toast.success("Vendedor excluído!");
  };

  const gerarRelatorio = async (vendedor) => {
    setGeratingPDF(vendedor.id);
    try {
      const response = await base44.functions.invoke('gerarRelatorioPDF', {
        tipo: 'vendedor',
        vendedor_id: vendedor.id,
        vendedor_nome: vendedor.nome,
        dataInicio: dateFrom,
        dataFim: dateTo
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${vendedor.nome.replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório gerado!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao gerar relatório');
    }
    setGeratingPDF(null);
  };

  const enviarRelatorioPorEmail = async (vendedor) => {
    if (!vendedor.email) {
      toast.error('Vendedor não possui e-mail cadastrado');
      return;
    }
    if (!confirm(`Enviar relatório do período para ${vendedor.email}?`)) return;
    
    setSendingEmail(vendedor.id);
    try {
      await base44.functions.invoke('enviarRelatorioPorEmail', {
        tipo: 'vendedor',
        vendedor_id: vendedor.id,
        vendedor_nome: vendedor.nome,
        vendedor_email: vendedor.email,
        dataInicio: dateFrom,
        dataFim: dateTo
      });
      toast.success(`Relatório enviado para ${vendedor.email}!`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao enviar e-mail');
    }
    setSendingEmail(null);
  };

  const abrirModalBonus = async (vendedor) => {
    // Buscar apenas bônus MANUAL existente do mês
    const bonusExistente = await base44.entities.Comissao.filter({
      vendedor_id: vendedor.id,
      mes_referencia: mesFiltro,
      tipo: 'bonus',
      venda_id: `BONUS_MANUAL_${mesFiltro}_${vendedor.id}`
    });
    
    const valorAtual = bonusExistente.length > 0 ? bonusExistente[0].valor_comissao : 0;
    setValorBonus(valorAtual.toString());
    setModalBonus({ 
      vendedor_id: vendedor.id, 
      vendedor_nome: vendedor.nome,
      bonus_existente_id: bonusExistente.length > 0 ? bonusExistente[0].id : null
    });
  };

  const salvarBonus = async () => {
    if (!valorBonus || parseFloat(valorBonus) < 0) {
      toast.error('Valor inválido');
      return;
    }

    try {
      const valor = parseFloat(valorBonus);
      
      if (valor === 0 && modalBonus.bonus_existente_id) {
        // Remover bônus se valor for zero
        await base44.entities.Comissao.delete(modalBonus.bonus_existente_id);
        toast.success('Bônus removido!');
      } else if (modalBonus.bonus_existente_id) {
        // Atualizar bônus existente
        await base44.entities.Comissao.update(modalBonus.bonus_existente_id, {
          valor_comissao: valor
        });
        toast.success('Bônus atualizado!');
      } else if (valor > 0) {
        // Criar novo bônus manual
        await base44.entities.Comissao.create({
          venda_id: `BONUS_MANUAL_${mesFiltro}_${modalBonus.vendedor_id}`,
          vendedor_id: modalBonus.vendedor_id,
          vendedor_nome: modalBonus.vendedor_nome,
          valor_venda: 0,
          percentual: 0,
          valor_comissao: valor,
          data_venda: new Date().toISOString().split('T')[0],
          pago: false,
          tipo: 'bonus',
          mes_referencia: mesFiltro
        });
        toast.success('Bônus concedido!');
      }
      
      setModalBonus(null);
      queryClient.invalidateQueries(['vendedores', 'vendas', 'metas']);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao salvar bônus');
    }
  };

  // Month range for volume calc
  const [anoFiltro, mesFiltroNum] = mesFiltro.split("-");
  const dateFrom = `${mesFiltro}-01`;
  const lastDay = new Date(parseInt(anoFiltro), parseInt(mesFiltroNum), 0).getDate();
  const dateTo = `${mesFiltro}-${String(lastDay).padStart(2, "0")}`;

  // Filtrar e organizar vendedores
  const vendedoresFiltrados = vendedores.filter(v => {
    // Filtro de permissão
    if (!isAdmin && user?.email && v.email !== user.email) return false;
    // Filtro de status
    if (statusFilter === "todos") return true;
    if (statusFilter === "ativo") return v.ativo !== false;
    return v.ativo === false;
  });

  // Classificar vendedores
  const vendedoresComDados = [];
  const vendedoresSemDados = [];

  vendedoresFiltrados.forEach(v => {
    const vendasV = vendas.filter(vd =>
      (vd.vendedor_id ? vd.vendedor_id === v.id : vd.assessor_comercial === v.nome) &&
      vd.data && vd.data >= dateFrom && vd.data <= dateTo
    );
    const temVenda = vendasV.length > 0;
    
    // Verificar se tem comissões no período
    const comissoesV = (async () => {
      const todasComissoes = await base44.entities.Comissao.filter({ vendedor_id: v.id });
      return todasComissoes.filter(c => 
        c.data_venda && c.data_venda >= dateFrom && c.data_venda <= dateTo
      );
    });
    
    if (temVenda) {
      vendedoresComDados.push({ ...v, _prioridade: 1 });
    } else {
      // Assumir que tem comissão se não tem venda mas está ativo
      vendedoresComDados.push({ ...v, _prioridade: 2 });
    }
  });

  // Verificar quais realmente não têm dados
  const visibleVendedores = vendedoresFiltrados.map(v => {
    const vendasV = vendas.filter(vd =>
      (vd.vendedor_id ? vd.vendedor_id === v.id : vd.assessor_comercial === v.nome) &&
      vd.data && vd.data >= dateFrom && vd.data <= dateTo
    );
    return { ...v, _temDados: vendasV.length > 0 };
  }).sort((a, b) => {
    // Primeiro: com dados
    if (a._temDados && !b._temDados) return -1;
    if (!a._temDados && b._temDados) return 1;
    // Depois: alfabética
    return a.nome.localeCompare(b.nome);
  });

  const comDados = visibleVendedores.filter(v => v._temDados);
  const semDados = visibleVendedores.filter(v => !v._temDados);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Vendedores</h2>
            <p className="text-gray-400 text-sm">{vendedores.length} vendedores na equipe</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={() => exportCSV(visibleVendedores)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
                <Download className="w-4 h-4" /> Exportar
              </button>
              <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0f1e35] to-[#1a3150] text-white text-sm font-medium rounded-xl hover:opacity-90 transition shadow-sm">
                <Plus className="w-4 h-4" /> Novo Vendedor
              </button>
            </div>
          )}
        </div>

        {/* Filter */}
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

        {/* Cards grid - Com dados */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visibleVendedores.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center text-gray-400">
            <UserCheck className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">Nenhum vendedor encontrado</p>
          </div>
        ) : (
          <>
            {comDados.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {comDados.map(v => {
              const vendasDoMes = vendas.filter(vd =>
                (vd.vendedor_id ? vd.vendedor_id === v.id : vd.assessor_comercial === v.nome) &&
                vd.data && vd.data >= dateFrom && vd.data <= dateTo
              );
              const volume = vendasDoMes.reduce((s, vd) => s + (parseFloat(vd.valor) || 0), 0);
              const usuario = usuarios.find(u => u.email === v.email);
              const temPermissao = usuario?.permissao_admin || false;

              // Meta individual do mês
              const metaIndividual = metas.find(m =>
                m.mes === mesFiltro && m.tipo === "individual" && m.vendedor_id === v.id
              );
              const valorMeta = metaIndividual?.valor_meta || 0;
              const progresso = valorMeta > 0 ? (volume / valorMeta) * 100 : 0;
              const atingiu = valorMeta > 0 && volume >= valorMeta;
              const cor = progresso > 100 ? "bg-gradient-to-r from-yellow-400 to-yellow-500" : progresso >= 100 ? "bg-emerald-500" : progresso >= 70 ? "bg-blue-500" : progresso >= 40 ? "bg-yellow-400" : "bg-red-400";

              return (
                <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0f1e35] to-[#1a3150] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {v.nome?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{v.nome}</p>
                        <p className="text-xs text-gray-400">{v.email || "—"}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.ativo !== false ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                      {v.ativo !== false ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded-xl">
                      <p className="text-lg font-bold text-gray-900">{vendasDoMes.length}</p>
                      <p className="text-[10px] text-gray-400">Vendas</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-xl">
                      <p className="text-xs font-bold text-gray-900">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(volume)}</p>
                      <p className="text-[10px] text-gray-400">Volume/mês</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-xl">
                      <p className="text-xs font-bold text-blue-700">{v.percentual_comissao ?? 0}%</p>
                      <p className="text-[10px] text-blue-400">Comissão</p>
                    </div>
                  </div>

                  {/* Barra de progresso da meta */}
                  {valorMeta > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Meta: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorMeta)}</span>
                        <span className={`font-semibold ${progresso > 100 ? "text-yellow-600" : progresso >= 100 ? "text-emerald-600" : progresso >= 70 ? "text-blue-600" : "text-gray-500"}`}>
                          {progresso > 100 ? `🏆 ${progresso.toFixed(0)}%` : `${progresso.toFixed(0)}%`}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${cor} h-2 rounded-full transition-all duration-500`} style={{ width: `${Math.min(progresso, 100)}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      {v.time && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px] font-medium">{v.time}</span>}
                      {/* Admin permission toggle */}
                      {isAdmin && v.email && usuario && (
                        <div className="flex items-center gap-1">
                          <input type="checkbox" checked={temPermissao}
                            onChange={e => updateUserMutation.mutate({ id: usuario.id, permissao_admin: e.target.checked })}
                            className="w-3.5 h-3.5 accent-[#1a3150] cursor-pointer" />
                          <span className="text-[10px] text-gray-400">Admin</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => gerarRelatorio(v)} 
                        disabled={geratingPDF === v.id}
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                        title="Gerar relatório PDF"
                      >
                        {geratingPDF === v.id ? (
                          <div className="w-3.5 h-3.5 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                        )}
                      </button>
                      {isAdmin && v.email && (
                        <button
                          onClick={() => enviarRelatorioPorEmail(v)}
                          disabled={sendingEmail === v.id}
                          className="p-1.5 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                          title="Enviar relatório por e-mail"
                        >
                          {sendingEmail === v.id ? (
                            <div className="w-3.5 h-3.5 border border-green-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5 text-green-600" />
                          )}
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => abrirModalBonus(v)}
                            className="p-1.5 hover:bg-amber-50 rounded-lg transition"
                            title="Gerenciar bônus"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                          </button>
                          <button onClick={() => openEdit(v)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                            <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <button onClick={() => setDeleteConfirm(v)} className="p-1.5 hover:bg-red-50 rounded-lg transition">
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

        {/* Vendedores sem dados - Separado */}
        {!isLoading && semDados.length > 0 && (
          <>
            <div className="pt-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">
                Sem vendas ou comissões no período
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
              {semDados.map(v => {
                const vendasDoMes = vendas.filter(vd =>
                  (vd.vendedor_id ? vd.vendedor_id === v.id : vd.assessor_comercial === v.nome) &&
                  vd.data && vd.data >= dateFrom && vd.data <= dateTo
                );
                const volume = vendasDoMes.reduce((s, vd) => s + (parseFloat(vd.valor) || 0), 0);
                const usuario = usuarios.find(u => u.email === v.email);
                const temPermissao = usuario?.permissao_admin || false;

                const metaIndividual = metas.find(m =>
                  m.mes === mesFiltro && m.tipo === "individual" && m.vendedor_id === v.id
                );
                const valorMeta = metaIndividual?.valor_meta || 0;

                return (
                  <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {v.nome?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{v.nome}</p>
                          <p className="text-xs text-gray-400">{v.email || "—"}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.ativo !== false ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                        {v.ativo !== false ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded-xl">
                        <p className="text-lg font-bold text-gray-400">0</p>
                        <p className="text-[10px] text-gray-400">Vendas</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-xl">
                        <p className="text-xs font-bold text-gray-400">R$ 0,00</p>
                        <p className="text-[10px] text-gray-400">Volume/mês</p>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded-xl">
                        <p className="text-xs font-bold text-blue-300">{v.percentual_comissao ?? 0}%</p>
                        <p className="text-[10px] text-blue-300">Comissão</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        {v.time && <span className="bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full text-[10px] font-medium">{v.time}</span>}
                        {isAdmin && v.email && usuario && (
                          <div className="flex items-center gap-1">
                            <input type="checkbox" checked={temPermissao}
                              onChange={e => updateUserMutation.mutate({ id: usuario.id, permissao_admin: e.target.checked })}
                              className="w-3.5 h-3.5 accent-[#1a3150] cursor-pointer" />
                            <span className="text-[10px] text-gray-400">Admin</span>
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(v)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                            <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <button onClick={() => setDeleteConfirm(v)} className="p-1.5 hover:bg-red-50 rounded-lg transition">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </>
        )}

        {/* Modal create/edit */}
        {modal !== null && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{modal === "create" ? "Novo Vendedor" : "Editar Vendedor"}</h3>
                <button onClick={() => setModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nome completo *</label>
                  <input value={form.nome || ""} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">E-mail</label>
                  <input type="email" value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Time</label>
                  <input value={form.time || ""} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Comissão (%)</label>
                  <input type="number" step="0.1" value={form.percentual_comissao || ""} onChange={e => setForm(p => ({ ...p, percentual_comissao: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                  <select value={form.ativo === false ? "inativo" : "ativo"} onChange={e => setForm(p => ({ ...p, ativo: e.target.value === "ativo" }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150] bg-white">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                <button onClick={save} disabled={saving || !form.nome}
                  className="px-5 py-2 text-sm bg-gradient-to-r from-[#0f1e35] to-[#1a3150] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 font-medium">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Bônus */}
        {modalBonus && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Gerenciar Bônus</h3>
                  <p className="text-sm text-gray-400">{modalBonus.vendedor_nome}</p>
                </div>
                <button onClick={() => setModalBonus(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Valor do Bônus (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorBonus}
                  onChange={(e) => setValorBonus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Mês de referência: {new Date(mesFiltro + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
                {parseFloat(valorBonus) === 0 && modalBonus.bonus_existente_id && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Valor zero irá remover o bônus existente
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => setModalBonus(null)} 
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={salvarBonus}
                  className="px-5 py-2 text-sm bg-gradient-to-r from-[#0f1e35] to-[#1a3150] text-white rounded-lg hover:opacity-90 transition font-medium"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
              <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Excluir vendedor?</h3>
              <p className="text-sm text-gray-400 mb-5"><strong>{deleteConfirm.nome}</strong> será removido permanentemente.</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                <button onClick={() => remove(deleteConfirm.id)} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium">Excluir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}