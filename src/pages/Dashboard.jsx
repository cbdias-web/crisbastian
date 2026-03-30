import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getImpersonatedVendedor } from "@/lib/impersonation";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  TrendingUp, Users, FileText, DollarSign,
  ArrowUpRight, ChevronDown, Check, Calendar, X, Upload,
  Briefcase, BarChart2, Target, BookOpen, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const formatCurrency = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function toDateStr(d) {
  return d.toISOString().split("T")[0];
}

function firstWorkingDay(year, month) {
  let d = new Date(year, month, 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const lbl =
    selected.length === 0 || selected.length === options.length
      ? `Todos ${label}`
      : `${selected.length} selecionado${selected.length > 1 ? "s" : ""}`;
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(i => i !== v) : [...selected, v]);
  const toggleAll = () => onChange(selected.length === options.length ? [] : options.map(o => o.value));
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 hover:bg-gray-50 transition justify-between min-w-[150px]"
      >
        <span className="truncate">{lbl}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 max-h-56 overflow-y-auto">
            <button onClick={toggleAll} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700 border-b border-gray-50">
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.length === options.length ? "bg-[#1a3150] border-[#1a3150]" : "border-gray-300"}`}>
                {selected.length === options.length && <Check className="w-3 h-3 text-white" />}
              </div>
              Todos
            </button>
            {options.map(o => (
              <button key={o.value} onClick={() => toggle(o.value)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-600">
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(o.value) ? "bg-[#1a3150] border-[#1a3150]" : "border-gray-300"}`}>
                  {selected.includes(o.value) && <Check className="w-3 h-3 text-white" />}
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

export default function Dashboard() {
  const now = new Date();

  const [vendas, setVendas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [metas, setMetas] = useState([]);
  const [comissoes, setComissoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", email: "", nome_tratamento: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [vendedor, setVendedor] = useState(null);

  const [agendaPopupDismissed, setAgendaPopupDismissed] = useState(false);
  const [agendaPendentes, setAgendaPendentes] = useState(0);
  const navigate = useNavigate();

  const [dataInicio, setDataInicio] = useState(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [dataFim, setDataFim] = useState(toDateStr(now));
  const [selectedVendedores, setSelectedVendedores] = useState([]);
  const [selectedProdutos, setSelectedProdutos] = useState([]);

  // Sincronizar agenda ao entrar na página
  const sincronizarAgenda = async (vendedorId) => {
    try {
      if (!vendedorId) return;
      
      const interacoes = await base44.entities.InteracaoCliente.filter({ vendedor_id: vendedorId }, '-data_interacao');
      const hoje = new Date().toISOString().split('T')[0];
      
      const agendas = await base44.entities.AgendaContato.filter({ vendedor_id: vendedorId });
      const agendaMap = new Set(agendas.map(a => `${a.lead_id}-${a.data_agendada}`));
      
      for (const inter of interacoes) {
        if (inter.proximo_contato && inter.proximo_contato >= hoje) {
          const key = `${inter.cliente_id}-${inter.proximo_contato}`;
          if (!agendaMap.has(key)) {
            await base44.entities.AgendaContato.create({
              lead_id: inter.cliente_id,
              lead_nome: inter.cliente_nome,
              lead_cpf_cnpj: inter.cliente_nome || '',
              lead_telefone: '',
              cliente_id: '',
              vendedor_id: vendedorId,
              vendedor_nome: inter.vendedor_nome,
              data_agendada: inter.proximo_contato,
              posicao_dia: 0,
              lote_id: '',
              status: 'pendente',
              resultado: ''
            });
          }
        }
      }
    } catch (e) {
      console.error('Erro ao sincronizar agenda:', e);
    }
  };

  useEffect(() => {
    Promise.allSettled([
      base44.entities.Venda.list("-data", 500),
      base44.entities.Vendedor.list(),
      base44.entities.Meta.list(),
      base44.entities.Comissao.list(),
      base44.auth.me(),
    ]).then(async ([v, vend, m, com, u]) => {
      const vendas = v.status === 'fulfilled' ? v.value : [];
      const vends = vend.status === 'fulfilled' ? vend.value : [];
      const mts = m.status === 'fulfilled' ? m.value : [];
      const coms = com.status === 'fulfilled' ? com.value : [];
      const usr = u.status === 'fulfilled' ? u.value : null;
      setVendas(vendas);
      setVendedores(vends);
      setMetas(mts);
      setComissoes(coms);
      setUser(usr);
      setSelectedVendedores(vends.map(vv => vv.id));
      const prods = [...new Set(vendas.map(vv => vv.produto).filter(Boolean))];
      setSelectedProdutos(prods);
      
      // Sincronizar agenda se o usuário tiver vendedor vinculado (ou impersonado)
      if (usr) {
        const isAdm = usr.role === 'admin' || usr.permissao_admin === true;
        const impersonado = isAdm ? getImpersonatedVendedor() : null;
        const vendedorAtivo = impersonado || vends.find(v => v.email === usr.email) || null;
        if (vendedorAtivo) {
          setVendedor(vendedorAtivo);
          setTimeout(() => sincronizarAgenda(vendedorAtivo.id), 500);
          // Verificar agenda pendente de hoje
          const hoje = new Date().toISOString().split('T')[0];
          base44.entities.AgendaContato.filter({ vendedor_id: vendedorAtivo.id })
            .then(agenda => {
              const pendentes = agenda.filter(a => a.data_agendada === hoje && a.status === 'pendente').length;
              if (pendentes > 0) setAgendaPendentes(pendentes);
            }).catch(() => {});
        }
      }
      
      setLoading(false);
    });
  }, []);

  // Reagir a mudanças de impersonação
  useEffect(() => {
    const handleChange = () => {
      const impersonado = getImpersonatedVendedor();
      if (impersonado) {
        setVendedor(impersonado);
      } else {
        // Voltar para o vendedor do usuário logado
        if (user) {
          const v = vendedores.find(vv => vv.email === user.email) || null;
          setVendedor(v);
        }
      }
    };
    window.addEventListener('impersonation-change', handleChange);
    return () => window.removeEventListener('impersonation-change', handleChange);
  }, [user, vendedores]);

  const produtoOptions = [...new Set(vendas.map(v => v.produto).filter(Boolean))].map(p => ({ value: p, label: p }));
  const vendedorOptions = vendedores.map(v => ({ value: v.id, label: v.nome }));

  const vendasFiltradas = vendas.filter(v => {
    const d = v.data || "";
    const inDate = (!dataInicio || d >= dataInicio) && (!dataFim || d <= dataFim);
    const inVend = selectedVendedores.length === 0 || selectedVendedores.length === vendedores.length ||
      selectedVendedores.includes(v.vendedor_id) || selectedVendedores.some(id => vendedores.find(vv => vv.id === id)?.nome === v.assessor_comercial);
    const inProd = selectedProdutos.length === 0 || selectedProdutos.length === produtoOptions.length || selectedProdutos.includes(v.produto);
    return inDate && inVend && inProd;
  });

  // KPIs
  const totalVendas = vendasFiltradas.length;
  const valorTotal = vendasFiltradas.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
  const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
  const vendedoresAtivos = new Set(vendasFiltradas.map(v => v.vendedor_id || v.assessor_comercial).filter(Boolean)).size;

  // Comissão gerada (somente vendas do período filtrado)
  const vendasFiltradasIds = new Set(vendasFiltradas.map(v => v.id));
  const comissaoGerada = comissoes
    .filter(c => vendasFiltradasIds.has(c.venda_id))
    .reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);

  // Meta do time do mês atual
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const mesIni = `${mesAtual}-01`;
  const mesUltDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const mesFim = `${mesAtual}-${String(mesUltDia).padStart(2, "0")}`;

  const metaEquipe = metas.find(m => m.mes === mesAtual && m.tipo === "equipe");
  const metaTimeSoma = vendedores.reduce((s, v) => {
    const m = metas.find(m => m.mes === mesAtual && m.tipo === "individual" && m.vendedor_id === v.id);
    return s + (m?.valor_meta || 0);
  }, 0);
  const metaTimeMes = metaEquipe?.valor_meta || metaTimeSoma;

  const producaoTimeMes = vendas
    .filter(v => v.data && v.data >= mesIni && v.data <= mesFim)
    .reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);

  const metaTimePct = metaTimeMes > 0 ? Math.min(Math.round((producaoTimeMes / metaTimeMes) * 100), 100) : null;
  const metaTimeAtingida = metaTimeMes > 0 && producaoTimeMes >= metaTimeMes;

  // Meta individual do usuário logado com bônus
  const metaIndividual = vendedor
    ? metas.find(m => m.mes === mesAtual && m.tipo === "individual" && m.vendedor_id === vendedor.id && (m.valor_bonus || 0) > 0)
    : null;
  const producaoIndividualMes = vendedor
    ? vendas
        .filter(v => v.data && v.data >= mesIni && v.data <= mesFim && (v.vendedor_id === vendedor.id || v.assessor_comercial === vendedor.nome))
        .reduce((s, v) => s + (parseFloat(v.valor) || 0), 0)
    : 0;
  const faltaParaBonus = metaIndividual ? Math.max(0, metaIndividual.valor_meta - producaoIndividualMes) : 0;
  const bonusAtingido = metaIndividual && producaoIndividualMes >= metaIndividual.valor_meta;

  // Gráfico ranking
  const rankingData = vendedores
    .map(v => {
      const vol = vendasFiltradas
        .filter(vd => vd.vendedor_id === v.id || vd.assessor_comercial === v.nome)
        .reduce((s, vd) => s + (parseFloat(vd.valor) || 0), 0);
      const metaRecord = metas.find(m => m.vendedor_id === v.id && m.mes === mesAtual && m.tipo === "individual");
      
      // Verifica se tem comissões no mês atual
      const temComissaoMes = comissoes.some(c => 
        c.vendedor_id === v.id && 
        c.data_venda && 
        c.data_venda >= mesIni && 
        c.data_venda <= mesFim
      );
      
      return { nome: v.nome.split(" ")[0], volume: vol, meta: metaRecord?.valor_meta || 0, temComissaoMes };
    })
    .filter(r => r.volume > 0 || r.meta > 0 || r.temComissaoMes)
    .sort((a, b) => b.volume - a.volume);

  // Últimas vendas
  const recentes = vendasFiltradas.slice(0, 8);

  // Ranking
  const ranking = vendedores
    .filter(v => v.nome?.toUpperCase() !== 'CONSÓRCIO')
    .map(v => {
      const vs = vendasFiltradas.filter(vd => vd.vendedor_id === v.id || vd.assessor_comercial === v.nome);
      const vol = vs.reduce((s, vd) => s + (parseFloat(vd.valor) || 0), 0);
      return { ...v, qtd: vs.length, vol };
    })
    .sort((a, b) => b.vol - a.vol);

  const cards = [
    { label: "Vendas no Período", value: totalVendas, sub: `${vendas.length} total cadastradas`, icon: FileText, light: "bg-blue-50", text: "text-[#1a3150]" },
    { label: "Comissão Gerada", value: formatCurrency(comissaoGerada), icon: DollarSign, light: "bg-amber-50", text: "text-amber-700" },
    { label: "Ticket Médio", value: formatCurrency(ticketMedio), icon: DollarSign, light: "bg-orange-50", text: "text-orange-600" },
    { label: "Vendedores Ativos", value: vendedoresAtivos, icon: Users, light: "bg-violet-50", text: "text-violet-700" },
  ];

  const impersonado = getImpersonatedVendedor();
  const displayName = impersonado ? impersonado.nome : (user?.nome_tratamento || user?.full_name || user?.email || '?');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const openProfileModal = () => {
    setProfileForm({
      full_name: user?.full_name || "",
      email: user?.email || "",
      nome_tratamento: user?.nome_tratamento || ""
    });
    setShowProfileModal(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await base44.auth.updateMe({
        nome_tratamento: profileForm.nome_tratamento
      });
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      setShowProfileModal(false);
      toast.success('Perfil atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    }
    setSavingProfile(false);
  };

  const uploadAvatar = async (file) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ avatar_url: file_url });
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      setProfileForm(prev => ({ ...prev }));
      toast.success('Avatar atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar avatar');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-5 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Visão Geral</h2>
            <p className="text-gray-400 text-sm mt-0.5">Acompanhe o desempenho da sua operação</p>
          </div>
          
          {/* User Profile */}
          {user && (
            <div className="flex flex-col items-end gap-1.5">
              <button
                onClick={openProfileModal}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{impersonado ? 'Espelhando' : 'Bem-vindo'}</p>
                  <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0f1e35] to-[#1a3150] flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                  {!impersonado && user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </button>
              {bonusAtingido && (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-medium max-w-xs text-right">
                  <span>🎉</span>
                  <span>Parabéns! Você bateu a meta e garantiu o bônus de <strong>{formatCurrency(metaIndividual.valor_bonus)}</strong>!</span>
                </div>
              )}
              {!bonusAtingido && metaIndividual && faltaParaBonus > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-medium max-w-xs text-right">
                  <span>🎯</span>
                  <span>Mais um pouquinho! Faltam <strong>{formatCurrency(faltaParaBonus)}</strong> para você levar <strong>{formatCurrency(metaIndividual.valor_bonus)}</strong> de bônus!</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400 ml-1" />
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white" />
            <span className="text-gray-400 text-sm">até</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white" />
            <div className="h-4 w-px bg-gray-200" />
            <MultiSelect label="Vendedores" options={vendedorOptions} selected={selectedVendedores} onChange={setSelectedVendedores} />
            {produtoOptions.length > 0 && (
              <MultiSelect label="Produtos" options={produtoOptions} selected={selectedProdutos} onChange={setSelectedProdutos} />
            )}
            <span className="ml-auto text-xs text-gray-400">
              {vendasFiltradas.length} venda{vendasFiltradas.length !== 1 ? "s" : ""} no período
              <span className="mx-1 text-gray-300">·</span>
              <span className="font-semibold text-gray-500">{vendas.length} total cadastradas</span>
            </span>
          </div>
        </div>

        {/* Total Vendido - Destaque */}
        <div className="bg-gradient-to-br from-[#0f1e35] to-[#1a3150] rounded-2xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-200/70 font-medium uppercase tracking-wider mb-2">Total Vendido no Período</p>
              <p className="text-4xl font-bold text-white">{formatCurrency(valorTotal)}</p>
              <p className="text-sm text-blue-200/60 mt-2">
                {totalVendas} venda{totalVendas !== 1 ? "s" : ""} · Ticket médio de {formatCurrency(ticketMedio)}
              </p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
                  {card.sub && <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>}
                </div>
                <div className={`p-2.5 rounded-xl ${card.light}`}>
                  <card.icon className={`w-5 h-5 ${card.text}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Meta do Time */}
        {metaTimeMes > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                  Meta do Time — {new Date(`${mesAtual}-15`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </p>
                <div className="flex items-end gap-3">
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(producaoTimeMes)}</p>
                  <p className="text-sm text-gray-400 mb-0.5">de {formatCurrency(metaTimeMes)}</p>
                </div>
                <p className={`text-xs mt-1 font-medium ${metaTimeAtingida ? "text-emerald-600" : "text-amber-600"}`}>
                  {metaTimeAtingida ? "✓ Meta do time atingida!" : `Faltando ${formatCurrency(metaTimeMes - producaoTimeMes)}`}
                </p>
              </div>
              <div className="sm:w-72">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Progresso do mês</span>
                  <span className="font-semibold">{metaTimePct}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${metaTimeAtingida ? "bg-emerald-500" : metaTimePct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${metaTimePct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gráfico + Últimas Vendas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Volume de Vendas vs Meta</h3>
            {rankingData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Nenhuma venda no período</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rankingData} barGap={4} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    formatter={(val, name) => [formatCurrency(val), name === "volume" ? "Volume Vendido" : "Meta"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #f3f4f6", fontSize: 12 }}
                  />
                  <Bar dataKey="volume" name="volume" fill="#1a3150" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {rankingData.map((entry, i) => (
                      <Cell key={i} fill={entry.volume >= entry.meta && entry.meta > 0 ? "#10b981" : "#1a3150"} />
                    ))}
                  </Bar>
                  <Bar dataKey="meta" name="meta" fill="#D4AF37" radius={[6, 6, 0, 0]} maxBarSize={40} opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-3 rounded-sm bg-[#1a3150]" />Volume Vendido</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-3 rounded-sm bg-emerald-500" />Meta Atingida</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-3 rounded-sm bg-[#D4AF37] opacity-70" />Meta</div>
            </div>
          </div>

          {/* Últimas Vendas */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Últimas Vendas</h3>
              <Link to={createPageUrl("Vendas")} className="text-xs text-[#1a3150] font-medium flex items-center gap-1 hover:underline">
                Ver todas <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50 overflow-y-auto max-h-[280px]">
              {recentes.length === 0 ? (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  Nenhuma venda no período
                </div>
              ) : recentes.map((v) => (
                <div key={v.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{v.cliente || "—"}</p>
                    <p className="text-xs text-gray-400">{v.assessor_comercial || "—"} · {v.data || ""}</p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(v.valor)}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">{v.produto || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ranking Vendedores */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Ranking de Vendedores</h3>
            <Link to={createPageUrl("Vendedores")} className="text-xs text-[#1a3150] font-medium flex items-center gap-1 hover:underline">
              Ver equipe <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-5">
            {ranking.filter(v => v.vol > 0).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma venda no período</p>
            ) : (
              <div className="space-y-3">
                {ranking.filter(v => v.vol > 0).map((v, i) => {
                  const maxVol = ranking[0]?.vol || 1;
                  const pct = Math.round((v.vol / maxVol) * 100);
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={v.id} className="flex items-center gap-3">
                      <div className="w-8 text-center text-lg flex-shrink-0">
                        {i < 3 ? medals[i] : <span className="text-sm font-bold text-gray-400">{i + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-900 truncate">{v.nome}</span>
                          <span className="font-semibold text-gray-900 ml-2 flex-shrink-0">{formatCurrency(v.vol)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${i === 0 ? "bg-[#D4AF37]" : "bg-[#1a3150]"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{v.qtd} venda{v.qtd !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Navegação Rápida */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Acesso Rápido</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Meus Clientes', icon: Briefcase, page: 'MeusClientes', color: 'bg-blue-50 text-[#1a3150]', desc: 'Carteira e agenda' },
              { label: 'Vendas', icon: FileText, page: 'Vendas', color: 'bg-green-50 text-green-700', desc: 'Registrar vendas' },
              { label: 'Comissões', icon: DollarSign, page: 'Comissoes', color: 'bg-amber-50 text-amber-700', desc: 'Meus ganhos' },
              { label: 'Rel. Interações', icon: MessageSquare, page: 'RelatorioInteracoes', color: 'bg-purple-50 text-purple-700', desc: 'Histórico de contatos' },
              { label: 'Manual', icon: BookOpen, page: 'Manual', color: 'bg-gray-50 text-gray-700', desc: 'Como usar o sistema' },
            ].map(item => (
              <Link key={item.page} to={createPageUrl(item.page)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-[#1a3150]/30 hover:shadow-md transition cursor-pointer group">
                <div className={`p-3 rounded-xl ${item.color} group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-gray-800 text-center">{item.label}</p>
                <p className="text-[10px] text-gray-400 text-center leading-tight">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Popup Agenda do Dia */}
        {!agendaPopupDismissed && agendaPendentes > 0 && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-gradient-to-br from-[#0f1e35] to-[#1a3150] px-6 py-5 text-center">
                <span className="text-4xl">📅</span>
                <h3 className="text-lg font-bold text-white mt-2">Agenda do Dia</h3>
              </div>
              <div className="p-6 text-center space-y-3">
                <p className="text-gray-700 font-medium">
                  Você tem <strong className="text-amber-600">{agendaPendentes} contato{agendaPendentes > 1 ? 's' : ''} pendente{agendaPendentes > 1 ? 's' : ''}</strong> para hoje!
                </p>
                <p className="text-sm text-gray-500">Acesse <strong>Meus Clientes</strong> para ver e registrar seus contatos do dia.</p>
              </div>
              <div className="px-6 pb-6 flex gap-2">
                <button
                  onClick={() => setAgendaPopupDismissed(true)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition"
                >
                  Agora não
                </button>
                <button
                  onClick={() => { setAgendaPopupDismissed(true); navigate('/MeusClientes'); }}
                  className="flex-1 px-4 py-2 text-sm bg-[#0f1e35] text-white rounded-xl hover:bg-[#1a3150] font-semibold transition"
                >
                  Ver Agenda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Perfil */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Meu Perfil</h3>
                <button onClick={() => setShowProfileModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0f1e35] to-[#1a3150] flex items-center justify-center text-white font-bold text-2xl overflow-hidden">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{(user?.nome_tratamento || user?.full_name || user?.email || '?').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-700 transition shadow-lg">
                      <Upload className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files[0] && uploadAvatar(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400">Clique no ícone para alterar o avatar</p>
                </div>

                {/* Nome completo (read-only) */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nome completo</label>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>

                {/* E-mail (read-only) */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">E-mail</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>

                {/* Nome de tratamento (editável) */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Nome de tratamento (como aparece no sistema)
                  </label>
                  <input
                    type="text"
                    value={profileForm.nome_tratamento}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, nome_tratamento: e.target.value }))}
                    placeholder="Ex: João Silva"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="px-5 py-2 text-sm bg-gradient-to-r from-[#0f1e35] to-[#1a3150] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 font-medium"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}