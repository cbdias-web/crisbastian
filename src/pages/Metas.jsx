import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Target, ChevronDown, Check, Edit2, Save, X, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const toMonthInput = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const label = selected.length === 0 ? placeholder
    : selected.length === options.length ? "Todos"
    : `${selected.length} selecionado${selected.length > 1 ? "s" : ""}`;

  const toggle = (id) => onChange(selected.includes(id) ? selected.filter(i => i !== id) : [...selected, id]);
  const toggleAll = () => onChange(selected.length === options.length ? [] : options.map(o => o.id));

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 hover:bg-gray-50 transition min-w-[200px] justify-between">
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 max-h-64 overflow-y-auto">
            <button onClick={toggleAll} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700 border-b border-gray-50">
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.length === options.length ? "bg-[#1a3150] border-[#1a3150]" : "border-gray-300"}`}>
                {selected.length === options.length && <Check className="w-3 h-3 text-white" />}
              </div>
              Todos
            </button>
            {options.map(o => (
              <button key={o.id} onClick={() => toggle(o.id)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-600">
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(o.id) ? "bg-[#1a3150] border-[#1a3150]" : "border-gray-300"}`}>
                  {selected.includes(o.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Modal form for creating/editing metas (individual, equipe, time)
function MetaFormModal({ vendedores, onSave, onClose, editingMeta }) {
  const [formData, setFormData] = useState(
    editingMeta || { mes: toMonthInput(new Date()), tipo: "individual", vendedor_id: "", vendedor_nome: "", time: "", valor_meta: "" }
  );

  const handleVendedorChange = (id) => {
    const v = vendedores.find(v => v.id === id);
    setFormData(f => ({ ...f, vendedor_id: id, vendedor_nome: v?.nome || "" }));
  };

  const handleSave = () => {
    onSave({ ...formData, valor_meta: parseFloat(formData.valor_meta) || 0 });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{editingMeta ? "Editar Meta" : "Nova Meta"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mês</label>
            <input type="month" value={formData.mes} onChange={e => setFormData(f => ({ ...f, mes: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</label>
            <select value={formData.tipo} onChange={e => setFormData(f => ({ ...f, tipo: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white">
              <option value="individual">Individual</option>
              <option value="equipe">Equipe</option>
              <option value="time">Time</option>
            </select>
          </div>
          {formData.tipo === "individual" && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</label>
              <select value={formData.vendedor_id} onChange={e => handleVendedorChange(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white">
                <option value="">Selecione...</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </div>
          )}
          {formData.tipo === "time" && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Time</label>
              <input value={formData.time} onChange={e => setFormData(f => ({ ...f, time: e.target.value }))}
                placeholder="Ex: TIME 1"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Valor da Meta</label>
            <input type="number" step="0.01" value={formData.valor_meta} onChange={e => setFormData(f => ({ ...f, valor_meta: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={handleSave}
            className="flex-1 px-4 py-2 text-sm bg-[#1a3150] text-white rounded-xl hover:bg-[#0f1e35] transition font-medium">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Metas() {
  const today = new Date();
  const currentMonth = toMonthInput(today);

  const [vendedores, setVendedores] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [user, setUser] = useState(null);
  const [mes, setMes] = useState(currentMonth);
  const [inlineEditing, setInlineEditing] = useState(null); // { vendedor_id, value }
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalEditing, setModalEditing] = useState(null);

  const load = () => {
    Promise.all([
      base44.entities.Vendedor.list(),
      base44.entities.Venda.list(),
      base44.entities.Meta.list(),
      base44.auth.me(),
    ]).then(([v, vd, m, u]) => {
      setVendedores(v);
      setVendas(vd);
      setMetas(m);
      setUser(u);
      setSelectedIds(v.filter(vv => vv.ativo !== false).map(vv => vv.id));
      setLoading(false);
    });
  };

  useEffect(load, []);

  const isAdmin = user?.role === "admin" || user?.permissao_admin === true;

  // Get meta record for a vendedor in selected month (individual)
  const getMetaRecord = (vendedor_id) =>
    metas.find(m => m.vendedor_id === vendedor_id && m.mes === mes && m.tipo === "individual");

  const saveInlineMeta = async () => {
    if (!inlineEditing) return;
    setSaving(true);
    const valor = parseFloat(inlineEditing.value) || 0;
    const existing = getMetaRecord(inlineEditing.vendedor_id);
    const vend = vendedores.find(v => v.id === inlineEditing.vendedor_id);
    if (existing) {
      await base44.entities.Meta.update(existing.id, { valor_meta: valor });
    } else {
      await base44.entities.Meta.create({
        vendedor_id: inlineEditing.vendedor_id,
        vendedor_nome: vend?.nome || "",
        mes,
        valor_meta: valor,
        tipo: "individual",
      });
    }
    setSaving(false);
    setInlineEditing(null);
    load();
    toast.success("Meta salva!");
  };

  const handleModalSave = async (data) => {
    if (modalEditing) {
      await base44.entities.Meta.update(modalEditing.id, data);
      toast.success("Meta atualizada!");
    } else {
      await base44.entities.Meta.create(data);
      toast.success("Meta criada!");
    }
    setShowModal(false);
    setModalEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta meta?")) return;
    await base44.entities.Meta.delete(id);
    toast.success("Meta excluída!");
    load();
  };

  // Date range helpers
  const dateFrom = `${mes}-01`;
  const lastDay = new Date(parseInt(mes.split("-")[0]), parseInt(mes.split("-")[1]), 0).getDate();
  const dateTo = `${mes}-${String(lastDay).padStart(2, "0")}`;

  // Calculate realizado for any meta
  const calcularRealizado = (meta) => {
    return vendas.filter(v => {
      if (!v.data) return false;
      const [ano, m] = meta.mes.split("-");
      const dFrom = `${ano}-${m}-01`;
      const ld = new Date(parseInt(ano), parseInt(m), 0).getDate();
      const dTo = `${ano}-${m}-${String(ld).padStart(2, "0")}`;
      const dentroDoMes = v.data >= dFrom && v.data <= dTo;
      if (!dentroDoMes) return false;
      if (meta.tipo === "equipe") return true;
      if (meta.tipo === "time") return v.time === meta.time;
      if (v.vendedor_id && meta.vendedor_id) return v.vendedor_id === meta.vendedor_id;
      return v.assessor_comercial === meta.vendedor_nome;
    }).reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
  };

  const options = vendedores.map(v => ({ id: v.id, label: v.nome }));
  const vendedoresFiltrados = vendedores.filter(v => selectedIds.includes(v.id));

  const rows = vendedoresFiltrados.map(v => {
    const vendasV = vendas.filter(vd =>
      (vd.vendedor_id ? vd.vendedor_id === v.id : vd.assessor_comercial === v.nome) &&
      vd.data && vd.data >= dateFrom && vd.data <= dateTo
    );
    const volumeVendido = vendasV.reduce((s, vd) => s + (parseFloat(vd.valor) || 0), 0);
    const metaRecord = getMetaRecord(v.id);
    const meta = metaRecord?.valor_meta || 0;
    const faltando = Math.max(meta - volumeVendido, 0);
    const pct = meta > 0 ? Math.min(Math.round((volumeVendido / meta) * 100), 100) : null;
    const atingiu = meta > 0 && volumeVendido >= meta;
    return { ...v, volumeVendido, meta, faltando, pct, atingiu, qtdVendas: vendasV.length };
  });

  // Time totals
  const metaTime = vendedores.reduce((s, v) => {
    const r = metas.find(m => m.vendedor_id === v.id && m.mes === mes && m.tipo === "individual");
    return s + (r?.valor_meta || 0);
  }, 0);
  const producaoTime = vendas.filter(v => v.data && v.data >= dateFrom && v.data <= dateTo)
    .reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
  const metaTimePct = metaTime > 0 ? Math.min(Math.round((producaoTime / metaTime) * 100), 100) : null;
  const metaTimeAtingida = metaTime > 0 && producaoTime >= metaTime;

  const totalVolume = rows.reduce((s, r) => s + r.volumeVendido, 0);
  const totalMeta = rows.reduce((s, r) => s + r.meta, 0);
  const totalFaltando = rows.reduce((s, r) => s + r.faltando, 0);

  const mesLabel = new Date(`${mes}-15`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Non-individual metas for the bottom table
  const outrasMetasDoMes = metas.filter(m => m.mes === mes && m.tipo !== "individual");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Metas</h2>
            <p className="text-gray-400 text-sm capitalize">Desempenho de {mesLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white text-gray-600"
            />
            <MultiSelect
              options={options}
              selected={selectedIds}
              onChange={setSelectedIds}
              placeholder="Selecionar vendedores"
            />
            {isAdmin && (
              <button onClick={() => { setModalEditing(null); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3150] text-white text-sm rounded-xl hover:bg-[#0f1e35] transition font-medium">
                <Plus className="w-4 h-4" />
                Nova Meta
              </button>
            )}
          </div>
        </div>

        {/* Meta do Time */}
        {!loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Meta do Time — <span className="capitalize">{mesLabel}</span></p>
                <div className="flex items-end gap-3 mt-1">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(producaoTime)}</p>
                  <p className="text-sm text-gray-400 mb-0.5">de {metaTime > 0 ? formatCurrency(metaTime) : <span className="text-gray-300">não definida</span>}</p>
                </div>
                {metaTime > 0 && (
                  <p className={`text-xs mt-1 font-medium ${metaTimeAtingida ? "text-emerald-600" : "text-amber-600"}`}>
                    {metaTimeAtingida ? "✓ Meta do time atingida!" : `Faltando ${formatCurrency(metaTime - producaoTime)}`}
                  </p>
                )}
              </div>
              {metaTime > 0 && (
                <div className="sm:w-64">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Progresso geral</span>
                    <span className="font-semibold">{metaTimePct}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${metaTimeAtingida ? "bg-emerald-500" : metaTimePct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${metaTimePct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary cards */}
        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Volume Vendido</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalVolume)}</p>
              <p className="text-xs text-gray-400 mt-1">{rows.reduce((s, r) => s + r.qtdVendas, 0)} vendas no total</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Meta Total</p>
              <p className="text-2xl font-bold text-[#1a3150]">{formatCurrency(totalMeta)}</p>
              <p className="text-xs text-gray-400 mt-1">{rows.filter(r => r.meta > 0).length} vendedores com meta definida</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Faltando para Meta</p>
              <p className={`text-2xl font-bold ${totalFaltando === 0 && totalMeta > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {formatCurrency(totalFaltando)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{rows.filter(r => r.atingiu).length} vendedores atingiram a meta</p>
            </div>
          </div>
        )}

        {/* Individual metas table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Target className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">Nenhum vendedor selecionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    {["Vendedor", "Qtd Vendas", "Volume Vendido", "Meta do Mês", "Faltando para Meta", "Progresso", "Status"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50/40 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0f1e35] to-[#1a3150] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {v.nome?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{v.nome}</p>
                            <p className="text-xs text-gray-400">{v.percentual_comissao}% comissão</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 font-medium">{v.qtdVendas}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">{formatCurrency(v.volumeVendido)}</td>
                      <td className="px-5 py-4">
                        {inlineEditing?.vendedor_id === v.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={inlineEditing.value}
                              onChange={e => setInlineEditing(p => ({ ...p, value: e.target.value }))}
                              className="w-28 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]"
                              autoFocus
                            />
                            <button onClick={saveInlineMeta} disabled={saving} className="p-1 hover:bg-emerald-50 rounded-lg transition">
                              <Save className="w-4 h-4 text-emerald-600" />
                            </button>
                            <button onClick={() => setInlineEditing(null)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                              <X className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="text-sm text-gray-600">
                              {v.meta > 0 ? formatCurrency(v.meta) : <span className="text-gray-300">Não definida</span>}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => setInlineEditing({ vendedor_id: v.id, value: v.meta || "" })}
                                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded-lg transition"
                              >
                                {v.meta > 0 ? <Edit2 className="w-3.5 h-3.5 text-gray-400" /> : <Plus className="w-3.5 h-3.5 text-blue-400" />}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {v.meta > 0 ? (
                          v.atingiu
                            ? <span className="text-sm font-semibold text-emerald-600">Meta atingida!</span>
                            : <span className="text-sm font-semibold text-amber-600">{formatCurrency(v.faltando)}</span>
                        ) : <span className="text-sm text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4 min-w-[160px]">
                        {v.meta > 0 ? (
                          <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>{v.pct}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${v.atingiu ? "bg-emerald-500" : v.pct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                                style={{ width: `${v.pct}%` }}
                              />
                            </div>
                          </div>
                        ) : <span className="text-gray-300 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${v.ativo !== false ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                          {v.ativo !== false ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Equipe/Time metas */}
        {outrasMetasDoMes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Metas de Equipe / Time — <span className="capitalize">{mesLabel}</span></h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    {["Tipo", "Identificação", "Meta", "Realizado", "Gap / Superação", "Atingimento"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                    {isAdmin && <th className="px-5 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {outrasMetasDoMes.map(meta => {
                    const realizado = calcularRealizado(meta);
                    const pct = meta.valor_meta > 0 ? Math.min(Math.round((realizado / meta.valor_meta) * 100), 100) : 0;
                    const gap = realizado - meta.valor_meta;
                    return (
                      <tr key={meta.id} className="hover:bg-gray-50/40 transition">
                        <td className="px-5 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${meta.tipo === "equipe" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                            {meta.tipo}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">
                          {meta.tipo === "equipe" ? "Toda a equipe" : meta.time}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900">{formatCurrency(meta.valor_meta)}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-blue-600">{formatCurrency(realizado)}</td>
                        <td className="px-5 py-4">
                          <span className={`text-sm font-semibold ${gap >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {gap >= 0 ? "+" : ""}{formatCurrency(gap)}
                          </span>
                        </td>
                        <td className="px-5 py-4 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600">{pct}%</span>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setModalEditing(meta); setShowModal(true); }}
                                className="p-1 hover:bg-gray-100 rounded-lg transition">
                                <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              <button onClick={() => handleDelete(meta.id)}
                                className="p-1 hover:bg-red-50 rounded-lg transition">
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isAdmin && <p className="text-xs text-gray-400 text-right">Passe o mouse sobre a meta de um vendedor para editá-la.</p>}
      </div>

      {showModal && (
        <MetaFormModal
          vendedores={vendedores}
          onSave={handleModalSave}
          onClose={() => { setShowModal(false); setModalEditing(null); }}
          editingMeta={modalEditing}
        />
      )}
    </div>
  );
}