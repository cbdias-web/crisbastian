import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, X, Save, Search, Users } from "lucide-react";
import { toast } from "sonner";

function ClienteModal({ cliente, onClose, onSave, isLoading }) {
  const [form, setForm] = useState(cliente || {
    nome: "", cpf_cnpj: "", email: "", telefone: "", cidade: "", estado: "", observacao: ""
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
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
              <Label>CPF / CNPJ</Label>
              <Input value={form.cpf_cnpj || ""} onChange={e => set("cpf_cnpj", e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone || ""} onChange={e => set("telefone", e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email || ""} onChange={e => set("email", e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.cidade || ""} onChange={e => set("cidade", e.target.value)} placeholder="Cidade" />
            </div>
            <div>
              <Label>Estado (UF)</Label>
              <Input value={form.estado || ""} maxLength={2} onChange={e => set("estado", e.target.value.toUpperCase())} placeholder="SP" />
            </div>
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea value={form.observacao || ""} onChange={e => set("observacao", e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={isLoading}><X className="w-4 h-4 mr-2" />Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={isLoading || !form.nome.trim()} className="bg-[#1a3150] hover:bg-[#0f1e35]">
            <Save className="w-4 h-4 mr-2" />Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Clientes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | "new" | clienteObj
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => base44.entities.Cliente.list("nome"),
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

  const filtered = clientes.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf_cnpj?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.telefone?.includes(search)
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
            <p className="text-gray-400 text-sm mt-0.5">Cadastro e gestão de clientes</p>
          </div>
          <Button onClick={() => setModal("new")} className="bg-[#1a3150] hover:bg-[#0f1e35]">
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </Button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ, email ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3150] bg-white"
          />
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
              <p className="text-sm">{search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p>
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
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
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