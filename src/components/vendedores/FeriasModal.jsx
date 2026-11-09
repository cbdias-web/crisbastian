import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Plane, ArrowRightLeft, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { estaDeFerias, formatarPeriodoFerias } from "@/lib/ferias";

export default function FeriasModal({ vendedor, vendedores = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    em_ferias: vendedor.em_ferias === true,
    ferias_inicio: vendedor.ferias_inicio || "",
    ferias_fim: vendedor.ferias_fim || "",
    ferias_observacao: vendedor.ferias_observacao || "",
  });
  const [salvando, setSalvando] = useState(false);
  const [destinoId, setDestinoId] = useState("");
  const [incluir, setIncluir] = useState({ fila: true, agenda: true, carteira: false });
  const [redirecionando, setRedirecionando] = useState(false);

  const destinos = vendedores.filter(v => v.id !== vendedor.id && v.ativo !== false);

  const salvar = async () => {
    if (form.em_ferias && form.ferias_inicio && form.ferias_fim && form.ferias_fim < form.ferias_inicio) {
      toast.error("A data final não pode ser anterior à data inicial");
      return;
    }
    setSalvando(true);
    await base44.entities.Vendedor.update(vendedor.id, form);
    setSalvando(false);
    toast.success(form.em_ferias ? "Férias registradas — o gerente sai da roleta de leads" : "Férias encerradas — gerente volta à roleta");
    onSaved();
    onClose();
  };

  const redirecionar = async () => {
    if (!destinoId) {
      toast.error("Selecione o gerente que vai receber os leads");
      return;
    }
    if (!incluir.fila && !incluir.agenda && !incluir.carteira) {
      toast.error("Selecione ao menos um grupo para redirecionar");
      return;
    }
    setRedirecionando(true);
    try {
      const { data } = await base44.functions.invoke("redirecionarLeadsFerias", {
        vendedor_origem_id: vendedor.id,
        vendedor_destino_id: destinoId,
        incluir_fila: incluir.fila,
        incluir_agenda: incluir.agenda,
        incluir_carteira: incluir.carteira,
      });
      const total = (data?.fila || 0) + (data?.agenda || 0) + (data?.carteira || 0);
      toast.success(
        total > 0
          ? `${total} registro(s) redirecionado(s) para ${data?.destino}`
          : `Nenhum lead em aberto para redirecionar — novos leads já vão para ${data?.destino}`
      );
      onSaved();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao redirecionar leads");
    }
    setRedirecionando(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Plane className="w-4 h-4 text-amber-500" /> Férias do gerente
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{vendedor.nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-800">Gerente ausente (em férias)</p>
              <p className="text-xs text-gray-400">Enquanto ativo, o sistema não envia novos leads para este gerente</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input type="checkbox" checked={form.em_ferias}
                onChange={e => setForm(p => ({ ...p, em_ferias: e.target.checked }))}
                className="sr-only peer" />
              <div className="w-10 h-5 rounded-full transition" style={{ background: form.em_ferias ? "#f59e0b" : "#d1d5db" }}>
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: form.em_ferias ? "translateX(20px)" : "translateX(0)" }} />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Início da ausência</label>
              <input type="date" value={form.ferias_inicio}
                onChange={e => setForm(p => ({ ...p, ferias_inicio: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Retorno (último dia ausente)</label>
              <input type="date" value={form.ferias_fim}
                onChange={e => setForm(p => ({ ...p, ferias_fim: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {form.em_ferias
              ? `Ausente de ${formatarPeriodoFerias(form)} — volta automaticamente à roleta no dia seguinte`
              : "Sem período definido, a marcação vale até ser desativada"}
          </p>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Observação</label>
            <textarea value={form.ferias_observacao} rows={2}
              onChange={e => setForm(p => ({ ...p, ferias_observacao: e.target.value }))}
              placeholder="Ex.: férias aprovadas, leads com a Ana no período"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150] resize-none" />
          </div>

          {form.em_ferias && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">Redirecionar leads em aberto</p>
              </div>
              <select value={destinoId} onChange={e => setDestinoId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white focus:outline-none focus:border-amber-400">
                <option value="">Selecione o gerente que vai atender...</option>
                {destinos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.nome}{estaDeFerias(v) ? " (também em férias)" : ""}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-3 text-xs text-amber-800">
                {[
                  { key: "fila", label: "Fila de contatos e conversas" },
                  { key: "agenda", label: "Agenda pendente" },
                  { key: "carteira", label: "Carteira de clientes" },
                ].map(op => (
                  <label key={op.key} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={incluir[op.key]}
                      onChange={e => setIncluir(p => ({ ...p, [op.key]: e.target.checked }))}
                      className="w-3.5 h-3.5 accent-amber-600 cursor-pointer" />
                    {op.label}
                  </label>
                ))}
              </div>
              <button type="button" onClick={redirecionar} disabled={redirecionando}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 font-medium">
                {redirecionando ? "Redirecionando..." : "Redirecionar agora"}
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            className="px-5 py-2 text-sm bg-gradient-to-r from-[#0f1e35] to-[#1a3150] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 font-medium">
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}