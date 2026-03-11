import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, CheckCircle, Download, ChevronDown, Check, Pencil, X, Save, Trash2, Calendar } from "lucide-react";
import { format, parseISO, startOfMonth } from "date-fns";
import { toast } from "sonner";

const formatCurrency = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const toDateStr = (d) => d.toISOString().split("T")[0];

function MultiSelect({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const lbl = selected.length === 0 || selected.length === options.length ? "Todos" : `${selected.length} selecionado${selected.length > 1 ? "s" : ""}`;
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(i => i !== v) : [...selected, v]);
  const toggleAll = () => onChange(selected.length === options.length ? [] : [...options]);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 hover:bg-gray-50 transition min-w-[140px] justify-between">
        <span className="truncate">{lbl}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 max-h-60 overflow-y-auto">
            <button onClick={toggleAll} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700 border-b border-gray-50">
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.length === options.length ? "bg-[#1a3150] border-[#1a3150]" : "border-gray-300"}`}>
                {selected.length === options.length && <Check className="w-3 h-3 text-white" />}
              </div>
              Todos
            </button>
            {options.map(o => (
              <button key={o} onClick={() => toggle(o)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-600">
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(o) ? "bg-[#1a3150] border-[#1a3150]" : "border-gray-300"}`}>
                  {selected.includes(o) && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="truncate">{o}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function KPICards({ lista }) {
  const total = lista.reduce((s, c) => s + (c.valor_comissao || 0), 0);
  const totalPago = lista.filter(c => c.pago).reduce((s, c) => s + (c.valor_comissao || 0), 0);
  const totalPendente = total - totalPago;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[
        { label: "Total", value: total, icon: DollarSign, bg: "bg-blue-50", text: "text-[#1a3150]", iconBg: "bg-blue-100" },
        { label: "Pagas", value: totalPago, icon: CheckCircle, bg: "bg-emerald-50", text: "text-emerald-700", iconBg: "bg-emerald-100" },
        { label: "Pendentes", value: totalPendente, icon: DollarSign, bg: "bg-amber-50", text: "text-amber-700", iconBg: "bg-amber-100" },
      ].map(card => (
        <div key={card.label} className={`${card.bg} rounded-2xl p-4 flex items-center justify-between`}>
          <div>
            <p className="text-xs text-gray-500 font-medium">{card.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${card.text}`}>{formatCurrency(card.value)}</p>
          </div>
          <div className={`${card.iconBg} p-2.5 rounded-xl`}>
            <card.icon className={`w-5 h-5 ${card.text}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TabelaComissoes({ comissoes, entity, queryKey, isAdmin, tipo }) {
  const [filtroNomes, setFiltroNomes] = useState([]);
  const [filtroPago, setFiltroPago] = useState("todos");
  const [editingId, setEditingId] = useState(null);
  const [editPercentual, setEditPercentual] = useState("");
  const [editingBonusId, setEditingBonusId] = useState(null);
  const [editBonusValue, setEditBonusValue] = useState("");
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entity.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries([queryKey]); toast.success("Comissão atualizada!"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entity.delete(id),
    onSuccess: () => { queryClient.invalidateQueries([queryKey]); toast.success("Comissão removida!"); },
  });

  const nomesUnicos = [...new Set(comissoes.map(c => c.vendedor_nome).filter(Boolean))];

  useEffect(() => { setFiltroNomes(nomesUnicos); }, [comissoes.length]);

  const filtradas = comissoes.filter(c => {
    if (filtroNomes.length > 0 && filtroNomes.length < nomesUnicos.length && !filtroNomes.includes(c.vendedor_nome)) return false;
    if (filtroPago === "pago" && !c.pago) return false;
    if (filtroPago === "pendente" && c.pago) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ["Data", tipo === "espelhamento" ? "Indicador" : "Vendedor", "Valor Venda", "%", "Comissão", "Status"];
    const rows = filtradas.map(c => [
      c.data_venda ? format(parseISO(c.data_venda), "dd/MM/yyyy") : "-",
      c.vendedor_nome || "-", c.valor_venda || 0, c.percentual || 0, c.valor_comissao || 0,
      c.pago ? "Paga" : "Pendente",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `comissoes_${tipo}_${format(new Date(), "dd-MM-yyyy")}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <KPICards lista={filtradas} />
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex flex-wrap items-center gap-2 justify-between">
          <span className="text-sm font-semibold text-gray-700">{filtradas.length} registro{filtradas.length !== 1 ? "s" : ""}</span>
          <div className="flex flex-wrap gap-2 items-center">
            <MultiSelect options={nomesUnicos} selected={filtroNomes} onChange={setFiltroNomes} />
            <select value={filtroPago} onChange={e => setFiltroPago(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white text-gray-700">
              <option value="todos">Todos</option>
              <option value="pago">Pagas</option>
              <option value="pendente">Pendentes</option>
            </select>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
              <Download className="w-4 h-4" /> Exportar
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{tipo === "espelhamento" ? "Indicador" : "Vendedor"}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor Venda</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">%</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Comissão</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                {isAdmin && <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} className="px-5 py-10 text-center text-gray-400 text-sm">Nenhum registro encontrado</td></tr>
              ) : filtradas.map(c => (
                <tr key={c.id} className={`hover:bg-gray-50/50 transition ${c.tipo === 'bonus' ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-5 py-3 text-gray-600">{c.data_venda ? format(parseISO(c.data_venda), "dd/MM/yyyy") : "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{c.vendedor_nome || "—"}</span>
                      {c.tipo === 'bonus' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">BÔNUS</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.tipo === 'bonus' ? '—' : formatCurrency(c.valor_venda)}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {c.tipo === 'bonus' ? '—' : (editingId === c.id
                      ? <input type="number" step="0.1" value={editPercentual} onChange={e => setEditPercentual(e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]" />
                      : `${c.percentual}%`)}
                  </td>
                  <td className="px-5 py-3 font-semibold text-emerald-600">
                    {editingId === c.id
                      ? formatCurrency((c.valor_venda * parseFloat(editPercentual || 0)) / 100)
                      : editingBonusId === c.id
                      ? <input type="number" step="0.01" value={editBonusValue} onChange={e => setEditBonusValue(e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]" />
                      : formatCurrency(c.valor_comissao)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${c.pago ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {c.pago ? "Paga" : "Pendente"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {editingId === c.id ? (
                          <>
                            <button onClick={() => { const p = parseFloat(editPercentual); updateMutation.mutate({ id: c.id, data: { percentual: p, valor_comissao: (c.valor_venda * p) / 100 } }); setEditingId(null); }}
                              className="p-1.5 hover:bg-emerald-50 rounded-lg transition"><Save className="w-3.5 h-3.5 text-emerald-600" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-red-50 rounded-lg transition"><X className="w-3.5 h-3.5 text-red-400" /></button>
                          </>
                        ) : editingBonusId === c.id ? (
                          <>
                            <button onClick={() => { const val = parseFloat(editBonusValue); updateMutation.mutate({ id: c.id, data: { valor_comissao: val } }); setEditingBonusId(null); }}
                              className="p-1.5 hover:bg-emerald-50 rounded-lg transition"><Save className="w-3.5 h-3.5 text-emerald-600" /></button>
                            <button onClick={() => setEditingBonusId(null)} className="p-1.5 hover:bg-red-50 rounded-lg transition"><X className="w-3.5 h-3.5 text-red-400" /></button>
                          </>
                        ) : (
                          <>
                            {c.tipo !== 'bonus' ? (
                              <button onClick={() => { setEditingId(c.id); setEditPercentual(String(c.percentual)); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                                <Pencil className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            ) : (
                              <button onClick={() => { setEditingBonusId(c.id); setEditBonusValue(String(c.valor_comissao)); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                                <Pencil className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            )}
                            <button onClick={() => updateMutation.mutate({ id: c.id, data: { pago: !c.pago } })}
                              className={`px-2 py-1 text-[11px] rounded-lg font-medium transition ${c.pago ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}>
                              {c.pago ? "Pend." : "Pago"}
                            </button>
                            {c.tipo === 'bonus' && (
                              <button onClick={() => { if (confirm("Remover este bônus?")) deleteMutation.mutate(c.id); }} className="p-1.5 hover:bg-red-50 rounded-lg transition">
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConsolidadoView({ comissoes, comissoesEsp, isAdmin }) {
  const [filtroPago, setFiltroPago] = useState("todos");
  const queryClient = useQueryClient();

  const updateVendedor = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comissao.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["comissoes"]); toast.success("Atualizado!"); },
  });
  const updateEsp = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComissaoEspelhamento.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["comissoesEspelhamento"]); toast.success("Atualizado!"); },
  });

  // Junta vendedores + indicadores com tag de tipo
  const todos = [
    ...comissoes.map(c => ({ ...c, _tipo: "Vendedor" })),
    ...comissoesEsp.map(c => ({ ...c, _tipo: "Indicador" })),
  ].sort((a, b) => (b.data_venda || "").localeCompare(a.data_venda || ""));

  const filtrados = todos.filter(c => {
    if (filtroPago === "pago" && !c.pago) return false;
    if (filtroPago === "pendente" && c.pago) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ["Data", "Tipo", "Nome", "Valor Venda", "%", "Comissão", "Status"];
    const rows = filtrados.map(c => [
      c.data_venda ? format(parseISO(c.data_venda), "dd/MM/yyyy") : "-",
      c._tipo, c.vendedor_nome || "-", c.valor_venda || 0, c.percentual || 0, c.valor_comissao || 0,
      c.pago ? "Paga" : "Pendente",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `comissoes_consolidado_${format(new Date(), "dd-MM-yyyy")}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <KPICards lista={filtrados} />
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex flex-wrap items-center gap-2 justify-between">
          <span className="text-sm font-semibold text-gray-700">{filtrados.length} registro{filtrados.length !== 1 ? "s" : ""}</span>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={filtroPago} onChange={e => setFiltroPago(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white text-gray-700">
              <option value="todos">Todos</option>
              <option value="pago">Pagas</option>
              <option value="pendente">Pendentes</option>
            </select>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
              <Download className="w-4 h-4" /> Exportar
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor Venda</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">%</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Comissão</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                {isAdmin && <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.length === 0 ? (
                <tr><td colSpan={isAdmin ? 8 : 7} className="px-5 py-10 text-center text-gray-400 text-sm">Nenhum registro encontrado</td></tr>
              ) : filtrados.map((c, i) => (
                <tr key={`${c._tipo}-${c.id}-${i}`} className={`hover:bg-gray-50/50 transition ${c.tipo === 'bonus' ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-5 py-3 text-gray-600">{c.data_venda ? format(parseISO(c.data_venda), "dd/MM/yyyy") : "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${c._tipo === "Vendedor" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                        {c._tipo}
                      </span>
                      {c.tipo === 'bonus' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">BÔNUS</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">{c.vendedor_nome || "—"}</td>
                  <td className="px-5 py-3 text-gray-600">{c.tipo === 'bonus' ? '—' : formatCurrency(c.valor_venda)}</td>
                  <td className="px-5 py-3 text-gray-600">{c.tipo === 'bonus' ? '—' : `${c.percentual}%`}</td>
                  <td className="px-5 py-3 font-semibold text-emerald-600">{formatCurrency(c.valor_comissao)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${c.pago ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {c.pago ? "Paga" : "Pendente"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => {
                          const mutation = c._tipo === "Vendedor" ? updateVendedor : updateEsp;
                          mutation.mutate({ id: c.id, data: { pago: !c.pago } });
                        }}
                        className={`px-2 py-1 text-[11px] rounded-lg font-medium transition ${c.pago ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}>
                        {c.pago ? "Pend." : "Pago"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Comissoes() {
  const [aba, setAba] = useState("vendedores");
  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const now = new Date();
  const [dataInicio, setDataInicio] = useState(toDateStr(startOfMonth(now)));
  const [dataFim, setDataFim] = useState(toDateStr(now));

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setUserLoaded(true); }).catch(() => setUserLoaded(true));
  }, []);

  const isAdmin = user?.role === "admin" || user?.permissao_admin === true;

  const { data: comissoesRaw = [], isLoading: loadingV } = useQuery({
    queryKey: ["comissoes"],
    queryFn: () => base44.entities.Comissao.list("-data_venda"),
  });

  const { data: comissoesEspRaw = [], isLoading: loadingE } = useQuery({
    queryKey: ["comissoesEspelhamento"],
    queryFn: () => base44.entities.ComissaoEspelhamento.list("-data_venda"),
  });

  // Filtra por período
  const filterByPeriod = (lista) => lista.filter(c => {
    const d = c.data_venda || "";
    return (!dataInicio || d >= dataInicio) && (!dataFim || d <= dataFim);
  });

  const comissoes = filterByPeriod(comissoesRaw);
  const comissoesEsp = filterByPeriod(comissoesEspRaw);

  const loading = loadingV || loadingE || !userLoaded;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: "vendedores", label: `Vendedores (${comissoes.length})` },
    { key: "espelhamento", label: `Indicadores (${comissoesEsp.length})` },
    { key: "consolidado", label: `Consolidado (${comissoes.length + comissoesEsp.length})` },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Comissões</h2>
          <p className="text-gray-400 text-sm mt-0.5">Gestão de comissões de vendedores e indicadores</p>
        </div>

        {/* Filtro de período */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Calendar className="w-4 h-4 text-gray-400 ml-1" />
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white" />
          <span className="text-gray-400 text-sm">até</span>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white" />
        </div>

        {/* Abas */}
        <div className="flex gap-1 p-1 bg-white rounded-2xl border border-gray-100 shadow-sm w-fit">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setAba(tab.key)}
              className={`px-5 py-2 text-sm font-medium rounded-xl transition ${aba === tab.key ? "bg-[#1a3150] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {aba === "vendedores" && (
          <TabelaComissoes comissoes={comissoes} entity={base44.entities.Comissao} queryKey="comissoes" isAdmin={isAdmin} tipo="vendedor" />
        )}
        {aba === "espelhamento" && (
          <TabelaComissoes comissoes={comissoesEsp} entity={base44.entities.ComissaoEspelhamento} queryKey="comissoesEspelhamento" isAdmin={isAdmin} tipo="espelhamento" />
        )}
        {aba === "consolidado" && (
          <ConsolidadoView comissoes={comissoes} comissoesEsp={comissoesEsp} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}