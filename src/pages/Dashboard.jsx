import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getImpersonatedVendedor } from "@/lib/impersonation";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  TrendingUp, Users, FileText, DollarSign,
  ArrowUpRight, ChevronDown, Check, Calendar, X, Upload,
  Briefcase, BarChart2, Target, BookOpen, MessageSquare, CalendarClock,
  Clock, Zap, Award
} from "lucide-react";
import ParcelasVincendasModal from "@/components/parcelas/ParcelasVincendasModal";
import AvatarPickerModal from "@/components/vendedores/AvatarPickerModal";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";
import { differenceInDays, startOfMonth, endOfMonth } from "date-fns";

// ─── Aurora tokens ──────────────────────────────────────────────────────────
const A = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.10)',
  accentGlow: '0 0 20px rgba(0,212,170,0.2)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.5)',
  gold: '#D4AF37',
};

const formatCurrency = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function toDateStr(d) { return d.toISOString().split("T")[0]; }

// ─── Multi-select Aurora ────────────────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const lbl = selected.length === 0 || selected.length === options.length
    ? `Todos ${label}`
    : `${selected.length} selecionado${selected.length > 1 ? "s" : ""}`;
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(i => i !== v) : [...selected, v]);
  const toggleAll = () => onChange(selected.length === options.length ? [] : options.map(o => o.value));

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition justify-between min-w-[140px]"
        style={{
          background: A.accentDim,
          border: `1px solid ${A.border}`,
          color: A.text,
        }}>
        <span className="truncate">{lbl}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: A.accent }} />
      </button>
      {open && <>
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
        <div className="absolute left-0 mt-1 w-56 rounded-xl shadow-2xl z-20 py-1 max-h-56 overflow-y-auto"
          style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
          <button onClick={toggleAll}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition"
            style={{ color: A.text, borderBottom: `1px solid ${A.border}` }}
            onMouseEnter={e => e.currentTarget.style.background = A.accentDim}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
              style={{ background: selected.length === options.length ? A.accent : 'transparent', borderColor: A.accent }}>
              {selected.length === options.length && <Check className="w-3 h-3" style={{ color: A.bg }} />}
            </div>
            Todos
          </button>
          {options.map(o => (
            <button key={o.value} onClick={() => toggle(o.value)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition"
              style={{ color: A.textMuted }}
              onMouseEnter={e => e.currentTarget.style.background = A.accentDim}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                style={{ background: selected.includes(o.value) ? A.accent : 'transparent', borderColor: selected.includes(o.value) ? A.accent : 'rgba(0,212,170,0.4)' }}>
                {selected.includes(o.value) && <Check className="w-3 h-3" style={{ color: A.bg }} />}
              </div>
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        </div>
      </>}
    </div>
  );
}

// ─── Relógio de Meta (inline, aurora style) ─────────────────────────────────
function RelogioMeta({ producao, meta, periodoMesLabel, periodoMes }) {
  if (!meta || meta <= 0) return null;

  const now = new Date();
  const inicioMes = startOfMonth(new Date(`${periodoMes}-15`));
  const fimMes = endOfMonth(new Date(`${periodoMes}-15`));
  const diasTotais = differenceInDays(fimMes, inicioMes) + 1;
  const diasDecorridos = Math.min(differenceInDays(now, inicioMes) + 1, diasTotais);
  const diasRestantes = diasTotais - diasDecorridos;

  const pctRealizado = Math.min((producao / meta) * 100, 100);
  const metaEsperada = (meta * diasDecorridos) / diasTotais;
  const pctEsperado = Math.min((metaEsperada / meta) * 100, 100);
  const diferenca = producao - metaEsperada;
  const adiantado = diferenca >= 0;
  const atingida = producao >= meta;

  // Circular gauge
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashRealizado = (pctRealizado / 100) * circumference;
  const dashEsperado = (pctEsperado / 100) * circumference;

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: A.surface, border: `1px solid ${A.border}` }}>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" style={{ color: A.accent }} />
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: A.accent }}>
          Relógio da Meta — {periodoMesLabel}
        </p>
      </div>

      <div className="flex items-center gap-5">
        {/* Circular gauge */}
        <div className="relative flex-shrink-0 w-32 h-32">
          <svg width="128" height="128" viewBox="0 0 128 128">
            {/* Track */}
            <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(0,212,170,0.08)" strokeWidth="10" />
            {/* Expected (dim) */}
            <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(0,212,170,0.25)" strokeWidth="10"
              strokeDasharray={`${dashEsperado} ${circumference - dashEsperado}`}
              strokeLinecap="round"
              transform="rotate(-90 64 64)" />
            {/* Realizado */}
            <circle cx="64" cy="64" r={radius} fill="none"
              stroke={atingida ? '#10b981' : adiantado ? A.accent : '#f59e0b'}
              strokeWidth="10"
              strokeDasharray={`${dashRealizado} ${circumference - dashRealizado}`}
              strokeLinecap="round"
              transform="rotate(-90 64 64)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: atingida ? '#10b981' : A.text }}>
              {Math.round(pctRealizado)}%
            </span>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: A.textMuted }}>da meta</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: A.textMuted }}>Realizado</p>
            <p className="text-lg font-bold" style={{ color: A.text }}>{formatCurrency(producao)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: A.textMuted }}>Meta Total</p>
            <p className="text-sm font-semibold" style={{ color: A.textMuted }}>{formatCurrency(meta)}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: adiantado ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              color: adiantado ? '#10b981' : '#f59e0b',
              border: `1px solid ${adiantado ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
            }}>
            {adiantado ? '▲' : '▼'} {adiantado ? '+' : ''}{formatCurrency(diferenca)} vs esperado
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-2" style={{ borderTop: `1px solid ${A.border}`, color: A.textMuted }}>
        <span>📅 {diasDecorridos}/{diasTotais} dias</span>
        <span>⏳ {diasRestantes} dias restantes</span>
        <span>🎯 Falta {formatCurrency(Math.max(0, meta - producao))}</span>
        <span style={{ color: A.accent }}>
          ⚡ Falta/dia: {diasRestantes > 0 ? formatCurrency(Math.max(0, meta - producao) / diasRestantes) : '—'}
        </span>
      </div>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accentColor = A.accent }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? A.surface2 : A.surface,
        border: `1px solid ${hovered ? accentColor + '55' : A.border}`,
        boxShadow: hovered ? `0 0 20px ${accentColor}22, 0 4px 16px rgba(0,0,0,0.4)` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: A.textMuted }}>{label}</p>
        <div className="p-2 rounded-xl" style={{ background: `${accentColor}18` }}>
          <Icon className="w-4 h-4" style={{ color: accentColor }} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: A.text }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: A.textMuted }}>{sub}</p>}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const now = new Date();

  const [vendas, setVendas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [metas, setMetas] = useState([]);
  const [comissoes, setComissoes] = useState([]);
  const [parcelasMes, setParcelasMes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", email: "", nome_tratamento: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [vendedor, setVendedor] = useState(null);
  const [showParcelasModal, setShowParcelasModal] = useState(false);
  const [impersonadoUser, setImpersonadoUser] = useState(null);
  const [agendaPopupDismissed, setAgendaPopupDismissed] = useState(false);
  const [agendaPendentes, setAgendaPendentes] = useState(0);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const navigate = useNavigate();

  const [dataInicio, setDataInicio] = useState(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [dataFim, setDataFim] = useState(toDateStr(now));
  const [selectedVendedores, setSelectedVendedores] = useState([]);
  const [selectedProdutos, setSelectedProdutos] = useState([]);

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
              lead_id: inter.cliente_id, lead_nome: inter.cliente_nome,
              lead_cpf_cnpj: inter.cliente_nome || '', lead_telefone: '',
              cliente_id: '', vendedor_id: vendedorId, vendedor_nome: inter.vendedor_nome,
              data_agendada: inter.proximo_contato, posicao_dia: 0, lote_id: '',
              status: 'pendente', resultado: ''
            });
          }
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    const imp = getImpersonatedVendedor();
    if (!imp?.email) { setImpersonadoUser(null); return; }
    base44.entities.User.filter({ email: imp.email })
      .then(users => setImpersonadoUser(users[0] || null))
      .catch(() => setImpersonadoUser(null));
  }, [vendedor?.id]);

  useEffect(() => {
    Promise.allSettled([
      base44.entities.Venda.list("-data", 500),
      base44.entities.Vendedor.list(),
      base44.entities.Meta.list(),
      base44.entities.Comissao.list(),
      base44.auth.me(),
      base44.entities.ParcelaVenda.filter({ status: 'pendente' })
    ]).then(async ([v, vend, m, com, u, parc]) => {
      const vendas = v.status === 'fulfilled' ? v.value : [];
      const vends = vend.status === 'fulfilled' ? vend.value : [];
      const mts = m.status === 'fulfilled' ? m.value : [];
      const coms = com.status === 'fulfilled' ? com.value : [];
      const usr = u.status === 'fulfilled' ? u.value : null;
      const parcelas = parc.status === 'fulfilled' ? parc.value : [];
      setVendas(vendas); setVendedores(vends); setMetas(mts);
      setComissoes(coms); setParcelasMes(parcelas); setUser(usr);
      setSelectedVendedores(vends.map(vv => vv.id));
      const prods = [...new Set(vendas.map(vv => vv.produto).filter(Boolean))];
      setSelectedProdutos(prods);
      if (usr) {
        const isAdm = usr.role === 'admin' || usr.permissao_admin === true;
        const impersonado = isAdm ? getImpersonatedVendedor() : null;
        const vendedorAtivo = impersonado || vends.find(v => v.email === usr.email) || null;
        if (vendedorAtivo) {
          setVendedor(vendedorAtivo);
          setTimeout(() => sincronizarAgenda(vendedorAtivo.id), 500);
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

  useEffect(() => {
    const handleChange = () => {
      const impersonado = getImpersonatedVendedor();
      if (impersonado) { setVendedor(impersonado); }
      else if (user) { setVendedor(vendedores.find(vv => vv.email === user.email) || null); }
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

  // Vendas que contam no acumulado do time (flag considerar_acumulado)
  const vendasAcumulado = vendasFiltradas.filter(v => v.considerar_acumulado !== false);

  const totalVendas = vendasAcumulado.length;
  const valorTotal = vendasAcumulado.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
  const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
  const vendedoresAtivos = new Set(vendasAcumulado.map(v => v.vendedor_id || v.assessor_comercial).filter(Boolean)).size;

  const vendasFiltradasIds = new Set(vendasAcumulado.map(v => v.id));
  const comissaoGerada = comissoes
    .filter(c => vendasFiltradasIds.has(c.venda_id))
    .reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);

  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const periodoMes = dataInicio ? dataInicio.substring(0, 7) : mesAtual;
  const periodoMesLabel = new Date(`${periodoMes}-15`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const periodoMesIni = `${periodoMes}-01`;
  const periodoMesFimDia = new Date(parseInt(periodoMes.split('-')[0]), parseInt(periodoMes.split('-')[1]), 0).getDate();
  const periodoMesFim = `${periodoMes}-${String(periodoMesFimDia).padStart(2, '0')}`;
  const mesIni = `${mesAtual}-01`;
  const mesUltDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const mesFim = `${mesAtual}-${String(mesUltDia).padStart(2, "0")}`;

  // Vendedores excluídos da meta do time
  const EXCLUIDOS_META_TIME = ['Eduardo Cunha', 'Kauana Ferreira Nardes'];
  const isExcluidoMeta = (nome) => {
    if (!nome) return false;
    const n = nome.toUpperCase().trim();
    return EXCLUIDOS_META_TIME.some(ex => n.includes(ex.toUpperCase()));
  };

  const metaEquipe = metas.find(m => m.mes === periodoMes && m.tipo === "equipe");
  const metaTimeSoma = vendedores
    .filter(v => !isExcluidoMeta(v.nome))
    .reduce((s, v) => {
    const m = metas.find(m => m.mes === periodoMes && m.tipo === "individual" && m.vendedor_id === v.id);
    return s + (m?.valor_meta || 0);
  }, 0);
  const metaTimeMes = metaEquipe?.valor_meta || metaTimeSoma;
  const metaTimePct = metaTimeMes > 0 ? Math.min(Math.round(valorTotal / metaTimeMes * 100), 100) : null;
  const metaTimeAtingida = metaTimeMes > 0 && valorTotal >= metaTimeMes;

  const metaIndividual = vendedor
    ? metas.find(m => m.mes === periodoMes && m.tipo === "individual" && m.vendedor_id === vendedor.id && (m.valor_bonus || 0) > 0)
    : null;
  const producaoIndividualMes = vendedor
    ? vendas.filter(v => v.data && v.data >= periodoMesIni && v.data <= periodoMesFim &&
        (v.vendedor_id === vendedor.id || v.assessor_comercial === vendedor.nome))
        .reduce((s, v) => s + (parseFloat(v.valor) || 0), 0)
    : 0;
  const faltaParaBonus = metaIndividual ? Math.max(0, metaIndividual.valor_meta - producaoIndividualMes) : 0;
  const bonusAtingido = metaIndividual && producaoIndividualMes >= metaIndividual.valor_meta;

  const rankingData = vendedores.map(v => {
    const vol = vendasAcumulado
      .filter(vd => vd.vendedor_id === v.id || vd.assessor_comercial === v.nome)
      .reduce((s, vd) => s + (parseFloat(vd.valor) || 0), 0);
    const metaRecord = metas.find(m => m.vendedor_id === v.id && m.mes === periodoMes && m.tipo === "individual");
    const temComissaoMes = comissoes.some(c => c.vendedor_id === v.id && c.data_venda && c.data_venda >= periodoMesIni && c.data_venda <= periodoMesFim);
    return { nome: v.nome.split(" ")[0], volume: vol, meta: metaRecord?.valor_meta || 0, temComissaoMes };
  }).filter(r => r.volume > 0 || r.meta > 0 || r.temComissaoMes).sort((a, b) => b.volume - a.volume);

  const recentes = vendasAcumulado.slice(0, 8);

  const parcelasPorVendedor = (vendedorId) =>
    parcelasMes.filter(p => p.vendedor_id === vendedorId && p.data_vencimento >= mesIni && p.data_vencimento <= mesFim)
      .reduce((s, p) => s + (parseFloat(p.valor_parcela) || 0), 0);

  const ranking = vendedores
    .filter(v => v.nome?.toUpperCase() !== 'CONSÓRCIO')
    .map(v => {
      const vs = vendasAcumulado.filter(vd => vd.vendedor_id === v.id || vd.assessor_comercial === v.nome);
      const vol = vs.reduce((s, vd) => s + (parseFloat(vd.valor) || 0), 0);
      const vincendas = parcelasPorVendedor(v.id);
      return { ...v, qtd: vs.length, vol, vincendas };
    }).sort((a, b) => b.vol - a.vol);

  const impersonado = getImpersonatedVendedor();
  const displayName = impersonado ? impersonado.nome : user?.nome_tratamento || user?.full_name || user?.email || '?';
  const avatarUrl = impersonado ? impersonadoUser?.avatar_url : user?.avatar_url;

  const openProfileModal = () => {
    setProfileForm({ full_name: user?.full_name || "", email: user?.email || "", nome_tratamento: user?.nome_tratamento || "" });
    setShowProfileModal(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await base44.auth.updateMe({ nome_tratamento: profileForm.nome_tratamento });
      const updatedUser = await base44.auth.me();
      setUser(updatedUser); setShowProfileModal(false);
      toast.success('Perfil atualizado!');
    } catch { toast.error('Erro ao atualizar perfil'); }
    setSavingProfile(false);
  };

  const applyAvatar = async (url) => {
    const imp = getImpersonatedVendedor();
    if (imp) {
      await base44.entities.Vendedor.update(imp.id, { avatar_url: url });
      setVendedores(prev => prev.map(v => v.id === imp.id ? { ...v, avatar_url: url } : v));
      setImpersonadoUser(prev => prev ? { ...prev, avatar_url: url } : prev);
      toast.success('Avatar de ' + imp.nome.split(' ')[0] + ' atualizado!');
    } else {
      if (!user?.email) { toast.error('Usuário sem e-mail vinculado'); return; }
      const vinculados = await base44.entities.Vendedor.filter({ email: user.email });
      if (vinculados.length > 0) {
        await base44.entities.Vendedor.update(vinculados[0].id, { avatar_url: url });
        setVendedores(prev => prev.map(v => v.id === vinculados[0].id ? { ...v, avatar_url: url } : v));
      }
      await base44.auth.updateMe({ avatar_url: url });
      setUser(prev => prev ? { ...prev, avatar_url: url } : prev);
      toast.success('Avatar atualizado!');
    }
  };

  const uploadAvatar = async (file) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await applyAvatar(file_url);
    } catch { toast.error('Erro ao atualizar avatar'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: A.accent, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl px-4 py-3 text-xs shadow-2xl"
        style={{
          background: '#0d1117',
          border: `1px solid ${A.accent}55`,
          color: A.text,
          boxShadow: `0 0 24px rgba(0,212,170,0.2), 0 8px 32px rgba(0,0,0,0.6)`,
        }}>
        <p className="font-bold mb-2" style={{ color: A.accent }}>{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill || p.color }} />
            <span style={{ color: A.textMuted }}>{p.name === 'volume' ? 'Volume' : 'Meta'}:</span>
            <span className="font-semibold ml-auto pl-3" style={{ color: A.text }}>{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: A.bg, color: A.text }} className="p-4 sm:p-6">
      <div className="space-y-5 max-w-[1400px] mx-auto">

        {/* ─── Header row ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: A.text }}>Visão Geral</h2>
            <p className="text-sm mt-0.5" style={{ color: A.textMuted }}>Acompanhe o desempenho da sua operação</p>
          </div>
          {user && (
            <button onClick={openProfileModal}
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl transition self-start sm:self-auto"
              style={{ background: A.surface, border: `1px solid ${A.border}` }}>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider" style={{ color: A.textMuted }}>{impersonado ? 'Espelhando' : 'Bem-vindo'}</p>
                <p className="text-sm font-semibold" style={{ color: A.text }}>{displayName}</p>
              </div>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${A.accent}, #0066cc)`, color: A.bg }}>
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : displayName.charAt(0).toUpperCase()}
              </div>
            </button>
          )}
        </div>

        {/* ─── Bonus banner ─────────────────────────────────────────────── */}
        {bonusAtingido && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
            🎉 Parabéns! Você bateu a meta e garantiu o bônus de <strong>{formatCurrency(metaIndividual.valor_bonus)}</strong>!
          </div>
        )}
        {!bonusAtingido && metaIndividual && faltaParaBonus > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
            🎯 Faltam <strong>{formatCurrency(faltaParaBonus)}</strong> para você levar <strong>{formatCurrency(metaIndividual.valor_bonus)}</strong> de bônus!
          </div>
        )}

        {/* ─── Filtros ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl"
          style={{ background: A.surface, border: `1px solid ${A.border}` }}>
          <Calendar className="w-4 h-4 ml-1 flex-shrink-0" style={{ color: A.accent }} />
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ background: A.accentDim, border: `1px solid ${A.border}`, color: A.text }} />
          <span className="text-sm" style={{ color: A.textMuted }}>até</span>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ background: A.accentDim, border: `1px solid ${A.border}`, color: A.text }} />
          <div className="w-px h-4" style={{ background: A.border }} />
          <MultiSelect label="Vendedores" options={vendedorOptions} selected={selectedVendedores} onChange={setSelectedVendedores} />
          {produtoOptions.length > 0 && (
            <MultiSelect label="Produtos" options={produtoOptions} selected={selectedProdutos} onChange={setSelectedProdutos} />
          )}
          <span className="ml-auto text-xs" style={{ color: A.textMuted }}>
            <span style={{ color: A.accent }}>{vendasAcumulado.length}</span> venda{vendasAcumulado.length !== 1 ? "s" : ""} no período
            <span className="mx-1" style={{ color: A.border }}>·</span>
            {vendas.length} total
          </span>
        </div>

        {/* ─── Hero + KPIs ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Hero card */}
          <div className="lg:col-span-1 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 cursor-default"
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 32px rgba(0,212,170,0.35), 0 8px 32px rgba(0,0,0,0.5)`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = A.accentGlow; e.currentTarget.style.transform = 'none'; }}
            style={{ background: 'linear-gradient(135deg, #0d2137 0%, #0a3d2e 100%)', border: `1px solid ${A.border}`, boxShadow: A.accentGlow }}>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'rgba(0,212,170,0.7)' }}>Total Vendido no Período</p>
              <p className="text-3xl font-bold" style={{ color: A.text }}>{formatCurrency(valorTotal)}</p>
              <p className="text-sm mt-1" style={{ color: A.textMuted }}>
                {totalVendas} venda{totalVendas !== 1 ? "s" : ""} · ticket {formatCurrency(ticketMedio)}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(0,212,170,0.1)', border: `1px solid ${A.border}` }}>
              <TrendingUp className="w-4 h-4" style={{ color: A.accent }} />
              <span className="text-xs font-medium" style={{ color: A.accent }}>Período selecionado</span>
            </div>
          </div>

          {/* KPI grid 2x2 */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Vendas no Período" value={totalVendas} sub={`${vendas.length} total`} icon={FileText} accentColor="#60a5fa" />
            <KpiCard label="Comissão Gerada" value={formatCurrency(comissaoGerada)} icon={DollarSign} accentColor={A.gold} />
            <KpiCard label="Ticket Médio" value={formatCurrency(ticketMedio)} icon={BarChart2} accentColor="#a78bfa" />
            <KpiCard label="Vendedores Ativos" value={vendedoresAtivos} icon={Users} accentColor={A.accent} />
          </div>
        </div>

        {/* ─── Meta do Time + Relógio ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Meta barra */}
          {metaTimeMes > 0 && (
            <div className="rounded-2xl p-5 transition-all duration-200 cursor-default"
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 20px rgba(0,212,170,0.18), 0 4px 16px rgba(0,0,0,0.4)`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `${A.accent}55`; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = A.border; }}
              style={{ background: A.surface, border: `1px solid ${A.border}` }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: A.accent }}>
                Meta do Time — {periodoMesLabel}
              </p>
              <div className="flex items-end gap-3 mb-3">
                <p className="text-2xl font-bold" style={{ color: A.text }}>{formatCurrency(valorTotal)}</p>
                <p className="text-sm mb-0.5" style={{ color: A.textMuted }}>de {formatCurrency(metaTimeMes)}</p>
                <span className="ml-auto text-lg font-bold" style={{ color: metaTimeAtingida ? '#10b981' : A.accent }}>
                  {metaTimePct}%
                </span>
              </div>
              {/* Double bar */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: A.textMuted }}>
                    <span>Realizado</span><span style={{ color: A.text }}>{formatCurrency(valorTotal)}</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,212,170,0.1)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${metaTimePct}%`, background: metaTimeAtingida ? '#10b981' : `linear-gradient(90deg, ${A.accent}, #0066cc)` }} />
                  </div>
                </div>
              </div>
              <p className="text-xs mt-2 font-medium" style={{ color: metaTimeAtingida ? '#10b981' : '#f59e0b' }}>
                {metaTimeAtingida ? '✓ Meta do time atingida!' : `Faltando ${formatCurrency(metaTimeMes - valorTotal)}`}
              </p>
            </div>
          )}

          {/* Relógio de Meta */}
          <RelogioMeta producao={valorTotal} meta={metaTimeMes} periodoMesLabel={periodoMesLabel} periodoMes={periodoMes} />
        </div>

        {/* ─── Chart + Recentes ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl p-5 transition-all duration-200"
          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 20px rgba(0,212,170,0.15), 0 4px 16px rgba(0,0,0,0.4)`; e.currentTarget.style.borderColor = `${A.accent}55`; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = A.border; }}
          style={{ background: A.surface, border: `1px solid ${A.border}` }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: A.text }}>Volume de Vendas vs Meta</h3>
            {rankingData.length === 0
              ? <div className="flex items-center justify-center h-48 text-sm" style={{ color: A.textMuted }}>Nenhuma venda no período</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rankingData} barGap={4} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,170,0.08)" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 11, fill: A.textMuted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: A.textMuted }} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="volume" name="volume" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {rankingData.map((entry, i) => (
                        <Cell key={i} fill={entry.volume >= entry.meta && entry.meta > 0 ? '#10b981' : A.accent} />
                      ))}
                    </Bar>
                    <Bar dataKey="meta" name="meta" fill={A.gold} radius={[6, 6, 0, 0]} maxBarSize={40} opacity={0.4} />
                  </BarChart>
                </ResponsiveContainer>
            }
            <div className="flex gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: A.textMuted }}>
                <div className="w-3 h-3 rounded-sm" style={{ background: A.accent }} />Volume
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: A.textMuted }}>
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />Meta Atingida
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: A.textMuted }}>
                <div className="w-3 h-3 rounded-sm" style={{ background: A.gold, opacity: 0.7 }} />Meta
              </div>
            </div>
          </div>

          {/* Últimas Vendas */}
          <div className="rounded-2xl overflow-hidden transition-all duration-200"
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 20px rgba(0,212,170,0.15), 0 4px 16px rgba(0,0,0,0.4)`; e.currentTarget.style.borderColor = `${A.accent}55`; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = A.border; }}
            style={{ background: A.surface, border: `1px solid ${A.border}` }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${A.border}` }}>
              <h3 className="font-semibold text-sm" style={{ color: A.text }}>Últimas Vendas</h3>
              <Link to={createPageUrl("Vendas")} className="text-xs flex items-center gap-1 transition"
                style={{ color: A.accent }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                Ver todas <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-y-auto max-h-[270px]">
              {recentes.length === 0
                ? <div className="px-5 py-10 text-center text-sm" style={{ color: A.textMuted }}>Nenhuma venda no período</div>
                : recentes.map(v => (
                  <div key={v.id} className="px-5 py-3 flex items-center justify-between transition"
                    style={{ borderBottom: `1px solid ${A.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = A.accentDim}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: A.text }}>{v.cliente || "—"}</p>
                      <p className="text-xs" style={{ color: A.textMuted }}>{v.assessor_comercial || "—"} · {v.data || ""}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-sm font-semibold" style={{ color: A.text }}>{formatCurrency(v.valor)}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: A.accentDim, color: A.accent }}>
                        {v.produto || "—"}
                      </span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* ─── Ranking ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden transition-all duration-200"
          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 20px rgba(212,175,55,0.15), 0 4px 16px rgba(0,0,0,0.4)`; e.currentTarget.style.borderColor = `${A.gold}55`; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = A.border; }}
          style={{ background: A.surface, border: `1px solid ${A.border}` }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${A.border}` }}>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" style={{ color: A.gold }} />
              <h3 className="font-semibold text-sm" style={{ color: A.text }}>Ranking de Vendedores</h3>
            </div>
            <div className="flex items-center gap-3">
              {parcelasMes.length > 0 && (
                <button onClick={() => setShowParcelasModal(true)}
                  className="flex items-center gap-1.5 text-xs font-medium transition"
                  style={{ color: A.gold }}>
                  <CalendarClock className="w-3.5 h-3.5" />
                  Gerenciar Parcelas ({parcelasMes.filter(p => p.status === 'pendente').length})
                </button>
              )}
              <Link to={createPageUrl("Vendedores")} className="text-xs flex items-center gap-1"
                style={{ color: A.accent }}>
                Ver equipe <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <div className="p-5">
            {ranking.filter(v => v.vol > 0 || v.vincendas > 0).length === 0
              ? <p className="text-sm text-center py-4" style={{ color: A.textMuted }}>Nenhuma venda no período</p>
              : <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-2" style={{ borderBottom: `1px solid ${A.border}` }}>
                    <div className="w-8" />
                    <div className="flex-1 flex justify-between text-[10px] uppercase tracking-wider" style={{ color: A.textMuted }}>
                      <span>Gerente</span>
                      <div className="flex gap-6">
                        <span>Realizado</span>
                        <span style={{ color: A.gold }}>Vincendas/mês</span>
                      </div>
                    </div>
                  </div>
                  {ranking.filter(v => v.vol > 0 || v.vincendas > 0).map((v, i) => {
                    const maxVol = ranking.filter(r => r.vol > 0)[0]?.vol || 1;
                    const pct = Math.round(v.vol / maxVol * 100);
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <div key={v.id} className="flex items-center gap-3">
                        <div className="w-8 text-center text-lg flex-shrink-0">
                          {i < 3 && v.vol > 0 ? medals[i] : <span className="text-sm font-bold" style={{ color: A.textMuted }}>{v.vol > 0 ? i + 1 : '—'}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1.5 gap-2">
                            <span className="font-medium truncate" style={{ color: A.text }}>{v.nome}</span>
                            <div className="flex gap-4 flex-shrink-0">
                              <span className="font-semibold" style={{ color: A.text }}>{formatCurrency(v.vol)}</span>
                              {v.vincendas > 0 && (
                                <span className="font-semibold" style={{ color: A.gold }}>+{formatCurrency(v.vincendas)}</span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,212,170,0.08)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: i === 0 ? A.gold : `linear-gradient(90deg, ${A.accent}, #0066cc)` }} />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs" style={{ color: A.textMuted }}>{v.qtd} venda{v.qtd !== 1 ? "s" : ""}</p>
                            {v.vincendas > 0 && (
                              <p className="text-[10px]" style={{ color: A.gold }}>
                                · {parcelasMes.filter(p => p.vendedor_id === v.id && p.data_vencimento >= mesIni && p.data_vencimento <= mesFim).length} parcela(s) vincendo
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {parcelasMes.filter(p => p.data_vencimento >= mesIni && p.data_vencimento <= mesFim).length > 0 && (
                    <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: `1px solid ${A.border}` }}>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: A.textMuted }}>Total Vincendas do Time</span>
                      <span className="text-sm font-bold" style={{ color: A.gold }}>
                        {formatCurrency(parcelasMes.filter(p => p.data_vencimento >= mesIni && p.data_vencimento <= mesFim).reduce((s, p) => s + (parseFloat(p.valor_parcela) || 0), 0))}
                      </span>
                    </div>
                  )}
                </div>
            }
          </div>
        </div>

        {/* ─── Acesso Rápido ────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: A.text }}>Acesso Rápido</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Agenda do Dia', icon: CalendarClock, page: 'MeusClientes', color: '#60a5fa', desc: 'Contatos e carteira' },
              { label: 'Contratos', icon: FileText, page: 'Contratos', color: '#a78bfa', desc: 'Gestão de contratos' },
              { label: 'Vendas', icon: TrendingUp, page: 'Vendas', color: A.accent, desc: 'Registrar vendas' },
              { label: 'Clientes', icon: Users, page: 'Clientes', color: '#34d399', desc: 'Base de clientes' },
              { label: 'Capacitação', icon: BookOpen, page: 'Treinamento', color: A.gold, desc: 'Treinamentos' },
            ].map(item => (
              <Link key={item.page} to={createPageUrl(item.page)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition cursor-pointer group"
                style={{ background: A.surface2, border: `1px solid ${A.border}` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.background = `${item.color}10`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = A.border; e.currentTarget.style.background = A.surface2; }}>
                <div className="p-3 rounded-xl transition-transform group-hover:scale-105"
                  style={{ background: `${item.color}18` }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <p className="text-xs font-semibold text-center" style={{ color: A.text }}>{item.label}</p>
                <p className="text-[10px] text-center leading-tight" style={{ color: A.textMuted }}>{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ─── Modals & Popups ──────────────────────────────────────────── */}
        {!agendaPopupDismissed && agendaPendentes > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
              <div className="px-6 py-5 text-center"
                style={{ background: 'linear-gradient(135deg, #0d2137, #0a3d2e)', borderBottom: `1px solid ${A.border}` }}>
                <span className="text-4xl">📅</span>
                <h3 className="text-lg font-bold mt-2" style={{ color: A.text }}>Agenda do Dia</h3>
              </div>
              <div className="p-6 text-center space-y-3">
                <p className="font-medium" style={{ color: A.text }}>
                  Você tem <strong style={{ color: '#f59e0b' }}>{agendaPendentes} contato{agendaPendentes > 1 ? 's' : ''} pendente{agendaPendentes > 1 ? 's' : ''}</strong> para hoje!
                </p>
                <p className="text-sm" style={{ color: A.textMuted }}>Acesse <strong>Meus Clientes</strong> para ver e registrar seus contatos do dia.</p>
              </div>
              <div className="px-6 pb-6 flex gap-2">
                <button onClick={() => setAgendaPopupDismissed(true)}
                  className="flex-1 px-4 py-2 text-sm rounded-xl transition"
                  style={{ border: `1px solid ${A.border}`, color: A.textMuted, background: 'transparent' }}>
                  Agora não
                </button>
                <button onClick={() => { setAgendaPopupDismissed(true); navigate('/MeusClientes'); }}
                  className="flex-1 px-4 py-2 text-sm rounded-xl font-semibold transition"
                  style={{ background: `linear-gradient(135deg, ${A.accent}, #0066cc)`, color: A.bg }}>
                  Ver Agenda
                </button>
              </div>
            </div>
          </div>
        )}

        {showParcelasModal && <ParcelasVincendasModal user={user} onClose={() => setShowParcelasModal(false)} />}

        {showAvatarPicker && (
          <AvatarPickerModal
            onSelect={url => { applyAvatar(url); setShowAvatarPicker(false); }}
            onClose={() => setShowAvatarPicker(false)} />
        )}

        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="rounded-2xl shadow-2xl w-full max-w-md" style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${A.border}` }}>
                <h3 className="font-semibold" style={{ color: A.text }}>Meu Perfil</h3>
                <button onClick={() => setShowProfileModal(false)}
                  className="p-1.5 rounded-lg transition"
                  style={{ color: A.textMuted }}
                  onMouseEnter={e => e.currentTarget.style.background = A.accentDim}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex flex-col items-center gap-3 pb-4" style={{ borderBottom: `1px solid ${A.border}` }}>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${A.accent}, #0066cc)`, color: A.bg }}>
                      {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : displayName.charAt(0).toUpperCase()}
                    </div>
                    <label className="absolute bottom-0 right-0 p-1.5 rounded-full cursor-pointer shadow-lg"
                      style={{ background: A.accent, color: A.bg }}>
                      <Upload className="w-3.5 h-3.5" />
                      <input type="file" accept="image/*" onChange={e => e.target.files[0] && uploadAvatar(e.target.files[0])} className="hidden" />
                    </label>
                  </div>
                  <p className="text-xs" style={{ color: A.textMuted }}>Clique no ícone para enviar sua foto</p>
                  <button type="button" onClick={() => setShowAvatarPicker(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition"
                    style={{ background: A.accentDim, border: `1px solid ${A.border}`, color: A.accent }}>
                    🎭 Escolher Personagem
                  </button>
                  {user?.avatar_url && (
                    <button type="button" onClick={() => applyAvatar('')} className="text-xs" style={{ color: '#f87171' }}>Remover foto</button>
                  )}
                </div>
                {[
                  { label: 'Nome completo', key: 'full_name', disabled: true },
                  { label: 'E-mail', key: 'email', disabled: true, type: 'email' },
                  { label: 'Nome de tratamento (como aparece no sistema)', key: 'nome_tratamento', disabled: false },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium mb-1 block" style={{ color: A.textMuted }}>{f.label}</label>
                    <input type={f.type || 'text'} value={profileForm[f.key]} disabled={f.disabled}
                      onChange={e => setProfileForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ background: f.disabled ? 'rgba(0,0,0,0.2)' : A.accentDim, border: `1px solid ${A.border}`, color: f.disabled ? A.textMuted : A.text, cursor: f.disabled ? 'not-allowed' : 'text' }} />
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 flex justify-end gap-2" style={{ borderTop: `1px solid ${A.border}` }}>
                <button onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-sm rounded-lg transition"
                  style={{ color: A.textMuted, border: `1px solid ${A.border}` }}>
                  Cancelar
                </button>
                <button onClick={saveProfile} disabled={savingProfile}
                  className="px-5 py-2 text-sm rounded-lg font-medium transition disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${A.accent}, #0066cc)`, color: A.bg }}>
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