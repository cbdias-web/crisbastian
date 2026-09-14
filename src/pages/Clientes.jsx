import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, X, Save, Search, Users, Download, RefreshCw, FileText, CalendarPlus, AlertTriangle, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isDiaUtil, mensagemNaoDiaUtil } from "@/lib/diaUtil";
import ClienteDetalheModal from "@/components/clientes/ClienteDetalheModal";

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

function AgendaModal({ cliente, vendedores, onClose }) {
  const [form, setForm] = useState({
    vendedor_id: cliente.vendedor_id || "",
    data_agendada: "",
    horario: "",
    observacao: "",
  });
  const [saving, setSaving] = useState(false);

  const vendedorSelecionado = vendedores.find(v => v.id === form.vendedor_id);

  const handleSave = async () => {
    if (!form.vendedor_id) { toast.error("Selecione o gerente responsável"); return; }
    if (!form.data_agendada) { toast.error("Informe a data do agendamento"); return; }
    if (!form.horario) { toast.error("Informe o horário do agendamento"); return; }
    const aviso = mensagemNaoDiaUtil(form.data_agendada);
    if (aviso) { toast.error(`Data inválida: ${aviso}`); return; }

    setSaving(true);
    try {
      await base44.entities.AgendaContato.create({
        lead_id: cliente.id,
        lead_nome: cliente.nome,
        lead_cpf_cnpj: cliente.cpf_cnpj || "",
        lead_telefone: cliente.telefone || "",
        cliente_id: cliente.id,
        vendedor_id: form.vendedor_id,
        vendedor_nome: vendedorSelecionado?.nome || "",
        data_agendada: form.data_agendada,
        horario: form.horario,
        posicao_dia: 0,
        lote_id: "",
        status: "pendente",
        resultado: form.observacao || "",
      });
      toast.success(`Agendamento criado para ${vendedorSelecionado?.nome} em ${form.data_agendada.split("-").reverse().join("/")}!`);
      onClose();
    } catch (e) {
      toast.error("Erro ao criar agendamento");
    }
    setSaving(false);
  };

  const avisoData = form.data_agendada ? mensagemNaoDiaUtil(form.data_agendada) : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: "linear-gradient(135deg, #0f1e35 0%, #1a3150 100%)" }}>
          <div>
            <h2 className="text-sm font-bold text-white">Agendar Contato</h2>
            <p className="text-blue-200 text-xs mt-0.5">{cliente.nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-medium">Gerente responsável *</label>
            <select
              value={form.vendedor_id}
              onChange={e => setForm(f => ({ ...f, vendedor_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a3150]"
            >
              <option value="">Selecione o gerente...</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block font-medium">Data *</label>
              <input
                type="date"
                value={form.data_agendada}
                onChange={e => setForm(f => ({ ...f, data_agendada: e.target.value }))}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:border-[#1a3150] ${avisoData ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
            </div>
            <div className="w-32">
              <label className="text-xs text-gray-500 mb-1 block font-medium">Horário *</label>
              <input
                type="time"
                value={form.horario}
                onChange={e => setForm(f => ({ ...f, horario: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
              />
            </div>
          </div>
          {avisoData && (
            <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {avisoData}
            </p>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-medium">Observação</label>
            <input
              type="text"
              value={form.observacao}
              onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
              placeholder="Contexto ou motivo do contato..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !!avisoData} className="bg-[#1a3150] hover:bg-[#0f1e35]">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <CalendarPlus className="w-4 h-4 mr-2" />}
            Agendar
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
  const [exportandoBase, setExportandoBase] = useState(false);
  const [agendaCliente, setAgendaCliente] = useState(null);
  const [detalheCliente, setDetalheCliente] = useState(null); // { id, tab }
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => base44.entities.Cliente.list("nome", 5000),
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

  // Exportar base de clientes por produto (Dolarize, Conta Global, Score, Rating, Conta Internacional, Canal Bancário)
  const exportarBaseProdutos = async () => {
    setExportandoBase(true);
    try {
      const tiposContrato = ["CONTA GLOBAL", "CONTA INTERNACIONAL", "DOLARIZE", "CANAL BANCÁRIO", "RATING"];
      const produtosVenda = ["DOLARIZE", "CONTA GLOBAL", "SCORE", "RATING", "CONTA INTERNACIONAL", "CANAL BANCÁRIO", "CANAL BANCARIO"];

      // 1. Contratos — têm todos os campos (nome, cpf_cnpj, responsavel_legal, telefone, email)
      const todosContratos = await base44.entities.Contrato.list("-created_date", 5000);
      const contratosFiltrados = todosContratos.filter(c => tiposContrato.includes(c.tipo));

      // 2. Vendas — para produtos que podem não ter contrato (ex: SCORE)
      const todasVendas = await base44.entities.Venda.list("-data", 5000);
      const vendasFiltradas = todasVendas.filter(v => v.produto && produtosVenda.includes(v.produto.toUpperCase()));

      // 3. Clientes — lookup por cpf_cnpj ou nome para telefone/email
      const todosClientes = await base44.entities.Cliente.list("nome", 5000);
      const clienteByCpf = {};
      const clienteByNome = {};
      for (const c of todosClientes) {
        if (c.cpf_cnpj) clienteByCpf[c.cpf_cnpj.trim()] = c;
        if (c.nome) clienteByNome[c.nome.trim().toLowerCase()] = c;
      }

      // 4. Monta registros deduplicados por cpf_cnpj (ou nome como fallback)
      const registrosMap = {};

      // Contratos primeiro (têm representante)
      for (const c of contratosFiltrados) {
        const key = c.cpf_cnpj?.trim() || c.nome?.trim().toLowerCase();
        if (!key || registrosMap[key]) continue;
        registrosMap[key] = {
          nome: c.nome || "",
          cpf_cnpj: c.cpf_cnpj || "",
          representante: c.responsavel_legal || "",
          telefone: c.telefone || "",
          email: c.email || "",
          produto: c.tipo || "",
        };
      }

      // Vendas — complementa com telefone/email do Cliente
      for (const v of vendasFiltradas) {
        const cpf = v.cpf_cnpj?.trim();
        const nomeLow = v.cliente?.trim().toLowerCase();
        const key = cpf || nomeLow;
        if (!key || registrosMap[key]) continue;
        const cli = (cpf && clienteByCpf[cpf]) || (nomeLow && clienteByNome[nomeLow]);
        registrosMap[key] = {
          nome: v.cliente || cli?.nome || "",
          cpf_cnpj: cpf || cli?.cpf_cnpj || "",
          representante: "",
          telefone: cli?.telefone || "",
          email: cli?.email || "",
          produto: v.produto || "",
        };
      }

      const registros = Object.values(registrosMap);
      if (registros.length === 0) {
        toast.info("Nenhum cliente encontrado para os produtos selecionados.");
        setExportandoBase(false);
        return;
      }

      const headers = ["Nome", "CPF/CNPJ", "Representante", "Telefone", "E-mail", "Produto"];
      const esc = (val) => {
        const s = String(val || "");
        return (s.includes(";") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows = [headers.join(";")];
      for (const r of registros) {
        rows.push([r.nome, r.cpf_cnpj, r.representante, r.telefone, r.email, r.produto].map(esc).join(";"));
      }
      const blob = new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "base_clientes_produtos.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${registros.length} cliente(s) exportado(s)!`);
    } catch (e) {
      toast.error("Erro ao exportar base: " + e.message);
    }
    setExportandoBase(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {filtered.length} de {clientes.length} clientes
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <Button variant="outline" onClick={handleImportar} disabled={importing} className="text-sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${importing ? "animate-spin" : ""}`} />
                {importing ? "Importando..." : "Importar"}
              </Button>
            )}
            <Button variant="outline" onClick={exportarBaseProdutos} disabled={exportandoBase} className="text-sm border-[#00D4AA] text-[#00D4AA] hover:bg-[rgba(0,212,170,0.08)]">
              {exportandoBase ? <div className="w-4 h-4 border-2 border-[#00D4AA] border-t-transparent rounded-full animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              {exportandoBase ? "Gerando..." : "Base Produtos"}
            </Button>
            <Button variant="outline" onClick={exportCSV} className="text-sm">
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
            {isAdmin && (
              <Button onClick={() => setModal("new")} className="bg-[#1a3150] hover:bg-[#0f1e35] text-sm">
                <Plus className="w-4 h-4 mr-2" /> Novo Cliente
              </Button>
            )}
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
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3150] bg-white min-w-[160px]"
          >
            <option value="">Todos os gerentes</option>
            {vendedores.map(v => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
        </div>

        {/* Grid de Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Users className="w-10 h-10 mb-2 text-gray-200" />
            <p className="text-sm">{search || filterVendedor ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(c => {
              const initials = c.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
              return (
                <div
                  key={c.id}
                  onClick={() => setDetalheCliente({ id: c.id, tab: 'dados' })}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group p-4 flex flex-col gap-3"
                >
                  {/* Topo: avatar + nome + gerente */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a3150] to-[#2d5a9e] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{c.nome}</p>
                      {c.vendedor_nome ? (
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                          {c.vendedor_nome}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300 mt-1 block">Sem gerente</span>
                      )}
                    </div>
                    {c.subcarteira && (
                      <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 max-w-[70px] truncate">
                        📁 {c.subcarteira}
                      </span>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="space-y-1 text-xs text-gray-500">
                    {c.cpf_cnpj && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-300 font-mono">CPF</span>
                        <span className="font-medium text-gray-700 truncate">{c.cpf_cnpj}</span>
                      </div>
                    )}
                    {c.telefone && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-300">📱</span>
                        <span className="truncate">{c.telefone}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-300">✉️</span>
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {(c.cidade || c.estado) && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-300">📍</span>
                        <span className="truncate">{[c.cidade, c.estado].filter(Boolean).join(' / ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Ações — sempre visíveis */}
                  <div className="flex items-center gap-1 pt-2 border-t border-gray-50" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setDetalheCliente({ id: c.id, tab: 'interacoes' })}
                      title="Interações"
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Interações
                    </button>
                    <button
                      onClick={() => setAgendaCliente(c)}
                      title="Agendar"
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                    >
                      <CalendarPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate('/Contratos', { state: { clientePreSelecionado: c } })}
                      title="Contrato"
                      className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setConfirmDelete(c)}
                        title="Excluir"
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

      {/* Modal Agendar Contato */}
      {agendaCliente && (
        <AgendaModal
          cliente={agendaCliente}
          vendedores={vendedores}
          onClose={() => setAgendaCliente(null)}
        />
      )}

      {/* Modal Detalhe Cliente (Dados + Interações) */}
      {detalheCliente && (
        <ClienteDetalheModal
          clienteId={detalheCliente.id}
          initialTab={detalheCliente.tab}
          vendedores={vendedores}
          clientes={clientes}
          isAdmin={isAdmin}
          vendedor={vendedores.find(v => v.email === user?.email) || null}
          user={user}
          onClose={() => setDetalheCliente(null)}
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