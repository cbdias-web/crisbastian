import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, X, Save, Search, Users, Download, RefreshCw, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function ClienteModal({ cliente, vendedores, clientes, onClose, onSave, isLoading }) {
  const [form, setForm] = useState(cliente || {
    nome: "", cpf_cnpj: "", email: "", telefone: "", cidade: "", estado: "", observacao: "", vendedor_id: "", vendedor_nome: "", subcarteira: ""
  });

  // Subcarteiras disponíveis com base nos clientes do mesmo vendedor
  const subcarteirasDisponiveis = [...new Set(
    clientes.filter(c => c.vendedor_id === form.vendedor_id && c.subcarteira).map(c => c.subcarteira)
  )].sort();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleVendedor = (id) => {
    const v = vendedores.find(x => x.id === id);
    setForm(f => ({ ...f, vendedor_id: id, vendedor_nome: v?.nome || "" }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{cliente ? "Editar Cliente" : "Novo Cliente"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Nome completo" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CPF / CNPJ *</Label>
              <Input value={form.cpf_cnpj || ""} onChange={e => set("cpf_cnpj", e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input value={form.telefone || ""} onChange={e => set("telefone", e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input value={form.email || ""} onChange={e => set("email", e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Cidade *</Label>
              <Input value={form.cidade || ""} onChange={e => set("cidade", e.target.value)} placeholder="Cidade" />
            </div>
            <div>
              <Label>Estado (UF) *</Label>
              <Input value={form.estado || ""} maxLength={2} onChange={e => set("estado", e.target.value.toUpperCase())} placeholder="SP" />
            </div>
            <div>
              <Label>Vendedor Responsável *</Label>
              <select
                value={form.vendedor_id || ""}
                onChange={e => handleVendedor(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#1a3150]"
              >
                <option value="">— Sem vínculo —</option>
                {vendedores.map(v => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>Subcarteira (opcional)</Label>
            {subcarteirasDisponiveis.length > 0 ? (
              <select
                value={form.subcarteira || ""}
                onChange={e => set("subcarteira", e.target.value === "__nova__" ? "" : e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#1a3150]"
              >
                <option value="">— Nenhuma —</option>
                {subcarteirasDisponiveis.map(sc => (
                  <option key={sc} value={sc}>📁 {sc}</option>
                ))}
                <option value="__nova__">+ Digitar nova subcarteira...</option>
              </select>
            ) : null}
            {(subcarteirasDisponiveis.length === 0 || !subcarteirasDisponiveis.includes(form.subcarteira)) && (
              <Input
                value={subcarteirasDisponiveis.includes(form.subcarteira) ? "" : (form.subcarteira || "")}
                onChange={e => set("subcarteira", e.target.value)}
                placeholder="Nome da subcarteira (ex: Clientes Redes Sociais)"
                className="mt-1"
              />
            )}
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea value={form.observacao || ""} onChange={e => set("observacao", e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={isLoading}><X className="w-4 h-4 mr-2" />Cancelar</Button>
          <Button
            onClick={() => onSave(form)}
            disabled={isLoading || !form.nome.trim() || !form.cpf_cnpj?.trim() || !form.email?.trim() || !form.telefone?.trim() || !form.cidade?.trim() || !form.estado?.trim() || !form.vendedor_id}
            className="bg-[#1a3150] hover:bg-[#0f1e35]"
          >
            <Save className="w-4 h-4 mr-2" />Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Clientes() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterVendedor, setFilterVendedor] = useState("");
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [importing, setImporting] = useState(false);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => base44.entities.Cliente.list("nome"),
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores"],
    queryFn: () => base44.entities.Vendedor.list("nome"),
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas-all"],
    queryFn: () => base44.entities.Venda.list("-data", 2000),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: () => { queryClient.invalidateQueries(["clientes"]); toast.success("Cliente cadastrado!"); setModal(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["clientes"]); toast.success("Cliente atualizado!"); setModal(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cliente.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(["clientes"]); toast.success("Cliente removido!"); setConfirmDelete(null); },
  });

  const handleSave = (form) => {
    if (modal?.id) {
      updateMutation.mutate({ id: modal.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  // Importar clientes das vendas (deduplicando por CPF/CNPJ ou nome)
  const handleImportar = async () => {
    setImporting(true);
    try {
      const nomesSalvos = new Set(clientes.map(c => c.nome?.trim().toLowerCase()));
      const cpfsSalvos = new Set(clientes.map(c => c.cpf_cnpj?.trim()).filter(Boolean));

      // Agrupar vendas por cliente (nome ou CPF), pegar último vendedor associado
      const mapaClientes = {};
      for (const v of vendas) {
        if (!v.cliente) continue;
        const key = v.cpf_cnpj?.trim() || v.cliente.trim().toLowerCase();
        if (!mapaClientes[key]) {
          mapaClientes[key] = {
            nome: v.cliente,
            cpf_cnpj: v.cpf_cnpj || "",
            vendedor_id: v.vendedor_id || "",
            vendedor_nome: v.assessor_comercial || "",
          };
        }
      }

      const novos = [];
      for (const entry of Object.values(mapaClientes)) {
        const nomeLow = entry.nome.trim().toLowerCase();
        const cpf = entry.cpf_cnpj?.trim();
        const jaExiste = nomesSalvos.has(nomeLow) || (cpf && cpfsSalvos.has(cpf));
        if (!jaExiste) {
          novos.push(entry);
        }
      }

      if (novos.length === 0) {
        toast.info("Nenhum cliente novo encontrado nas vendas.");
        setImporting(false);
        return;
      }

      for (const c of novos) {
        await base44.entities.Cliente.create(c);
      }

      queryClient.invalidateQueries(["clientes"]);
      toast.success(`${novos.length} cliente(s) importado(s) com sucesso!`);
    } catch (e) {
      toast.error("Erro ao importar clientes: " + e.message);
    }
    setImporting(false);
  };

  const filtered = clientes.filter(c => {
    const matchSearch =
      c.nome?.toLowerCase().includes(search.toLowerCase()) ||
      c.cpf_cnpj?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone?.includes(search);
    const matchVendedor = !filterVendedor || c.vendedor_id === filterVendedor;
    return matchSearch && matchVendedor;
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const exportCSV = () => {
    const rows = [["Nome", "CPF/CNPJ", "Telefone", "Email", "Cidade", "UF", "Vendedor"]];
    filtered.forEach(c => rows.push([c.nome, c.cpf_cnpj || "", c.telefone || "", c.email || "", c.cidade || "", c.estado || "", c.vendedor_nome || ""]));
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "clientes.csv"; a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
            <p className="text-gray-400 text-sm mt-0.5">{clientes.length} clientes cadastrados</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleImportar} disabled={importing} className="text-sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${importing ? "animate-spin" : ""}`} />
              {importing ? "Importando..." : "Importar das Vendas"}
            </Button>
            <Button variant="outline" onClick={exportCSV} className="text-sm">
              <Download className="w-4 h-4 mr-2" /> Exportar CSV
            </Button>
            <Button onClick={() => setModal("new")} className="bg-[#1a3150] hover:bg-[#0f1e35] text-sm">
              <Plus className="w-4 h-4 mr-2" /> Novo Cliente
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF/CNPJ, email ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3150] bg-white"
            />
          </div>
          <select
            value={filterVendedor}
            onChange={e => setFilterVendedor(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3150] bg-white min-w-[180px]"
          >
            <option value="">Todos os vendedores</option>
            {vendedores.map(v => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Users className="w-10 h-10 mb-2 text-gray-200" />
              <p className="text-sm">{search || filterVendedor ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p>
              {!search && !filterVendedor && clientes.length === 0 && (
                <p className="text-xs mt-1 text-gray-300">Clique em "Importar das Vendas" para carregar os clientes existentes</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">CPF/CNPJ</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Telefone</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Cidade/UF</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Vendedor</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3 font-medium text-gray-900">{c.nome}</td>
                      <td className="px-5 py-3 text-gray-600">{c.cpf_cnpj || "—"}</td>
                      <td className="px-5 py-3 text-gray-600">{c.telefone || "—"}</td>
                      <td className="px-5 py-3 text-gray-600">{c.email || "—"}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {[c.cidade, c.estado].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="px-5 py-3">
                        {c.vendedor_nome ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {c.vendedor_nome}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => navigate('/Contratos', { state: { clientePreSelecionado: c } })} 
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition" title="Criar contrato">
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                          <button onClick={() => setModal(c)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <button onClick={() => setConfirmDelete(c)} className="p-1.5 hover:bg-red-50 rounded-lg transition">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal cadastro/edição */}
      {modal && (
        <ClienteModal
          cliente={modal === "new" ? null : modal}
          vendedores={vendedores}
          clientes={clientes}
          onClose={() => setModal(null)}
          onSave={handleSave}
          isLoading={isSaving}
        />
      )}

      {/* Modal confirmação exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Remover cliente?</h3>
            <p className="text-sm text-gray-500 mb-4">Tem certeza que deseja remover <strong>{confirmDelete.nome}</strong>? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending}>Remover</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}