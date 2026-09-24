import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, ShieldCheck, PartyPopper, Plus, Bell, BellOff, RefreshCw, Phone, Mail,
  TrendingUp, Clock, CheckCircle2, XCircle, FileText, UserCheck, ArrowRight, LogOut,
  DollarSign, Trophy, History, MessageSquare, X, Eye,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import JornadaCliente from '@/components/portal/JornadaCliente';

const WATERMARK_IMG = 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/ed94a18f2_generated_image.png';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  warning: '#fbbf24',
  green: '#34d399',
  purple: '#a78bfa',
  danger: '#f87171',
};

const STATUS_CFG = {
  novo: { label: 'Nova', color: AURORA.accent, bg: 'rgba(0,212,170,0.12)' },
  em_atendimento: { label: 'Em Atendimento', color: AURORA.warning, bg: 'rgba(251,191,36,0.12)' },
  convertido_cliente: { label: '→ Cliente', color: AURORA.green, bg: 'rgba(52,211,153,0.12)' },
  convertido_contrato: { label: '→ Contrato', color: AURORA.purple, bg: 'rgba(167,139,250,0.12)' },
  convertido_venda: { label: '→ Venda', color: AURORA.green, bg: 'rgba(52,211,153,0.18)' },
  descartado: { label: 'Descartado', color: '#9ca3af', bg: 'rgba(100,100,100,0.2)' },
};

const fmtMoeda = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const TERMOS = `
Este Termo de Uso regula o acesso e a utilização do Portal do Indicador da Villela Exchange ("Plataforma").

1. CADASTRO E ACESSO
O acesso ao portal é pessoal e intransferível, vinculado ao e-mail e link de convite fornecidos pela Villela Exchange. O Indicador compromete-se a manter sigilo sobre seu link de acesso.

2. INDICAÇÕES
O Indicador poderá cadastrar indicações (leads) de pessoas físicas ou jurídicas, comprometendo-se a informar dados verdadeiros e a possuir consentimento do indicado para compartilhamento de seus dados de contato.

3. COMISSÕES E ESPELHAMENTO
O percentual de comissão/espelhamento é definido no cadastro do indicador e aplicado sobre as vendas geradas a partir de suas indicações, conforme política comercial vigente.

4. NOTIFICAÇÕES
O Indicador receberá notificações por e-mail sobre movimentações dos seus leads, podendo desabilitar essa opção a qualquer momento no portal.

5. CONFIDENCIALIDADE E LGPD
Os dados dos leads indicados serão tratados conforme a LGPD, utilizados exclusivamente para fins comerciais relacionados aos produtos da Villela Exchange.

6. ENCERRAMENTO
A Villela Exchange poderá bloquear o acesso em caso de uso indevido, informações falsas ou descumprimento deste termo.

Ao aceitar, o Indicador concorda integralmente com os termos acima.
`;

export default function PortalIndicador() {
  const { token } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [indicador, setIndicador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [aceitando, setAceitando] = useState(false);
  const [showTermo, setShowTermo] = useState(false);
  const [togglingNotif, setTogglingNotif] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCapa, setShowCapa] = useState(false);
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const [detalheLead, setDetalheLead] = useState(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  const WELCOME_IMG = 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/0eb350833_generated_image.png';

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.style.background = AURORA.bg;
  }, []);

  useEffect(() => {
    if (!token) { setErro('Token inválido'); setLoading(false); return; }
    base44.functions.invoke('portalIndicador', { action: 'buscar', token })
      .then(res => {
        setIndicador(res.data.indicador);
        // Capa de "Bom retorno" — apenas em retorno real (nova sessão do navegador),
        // não na navegação dentro do portal (ex.: enviar lead e voltar ao painel).
        const sessaoKey = `portal_indicador_sessao_${token}`;
        const jaViuNestaSessao = sessionStorage.getItem(sessaoKey) === '1';
        if (res.data.indicador?.era_retorno && !jaViuNestaSessao) setShowCapa(true);
        sessionStorage.setItem(sessaoKey, '1');
      })
      .catch(e => { setErro(e?.response?.data?.error || e?.message || 'Link inválido'); })
      .finally(() => setLoading(false));
  }, [token]);

  const { data: leads = [], isLoading: loadingLeads, refetch } = useQuery({
    queryKey: ['portal-indicador-leads', token],
    queryFn: async () => {
      const res = await base44.functions.invoke('portalIndicador', { action: 'listar', token });
      return res.data.leads || [];
    },
    enabled: !!indicador?.termo_aceito,
  });

  const aceitarTermo = async () => {
    setAceitando(true);
    try {
      await base44.functions.invoke('portalIndicador', { action: 'aceitar_termo', token, versao: '1.0' });
      toast.success('Termo aceito! Bem-vindo ao portal.');
      setIndicador({ ...indicador, termo_aceito: true, termo_aceito_em: new Date().toISOString() });
      setShowWelcome(true);
    } catch (e) { toast.error('Erro: ' + (e?.response?.data?.error || e.message)); }
    setAceitando(false);
  };

  const toggleNotificacoes = async () => {
    setTogglingNotif(true);
    try {
      const res = await base44.functions.invoke('portalIndicador', {
        action: 'toggle_notificacoes', token, receber: !indicador.receber_notificacoes,
      });
      setIndicador({ ...indicador, receber_notificacoes: res.data.receber_notificacoes });
      toast.success(res.data.receber_notificacoes ? 'Notificações ativadas' : 'Notificações desativadas');
    } catch (e) { toast.error('Erro: ' + e.message); }
    setTogglingNotif(false);
  };

  const verLead = async (lead) => {
    setLeadSelecionado(lead);
    setDetalheLead(null);
    setLoadingDetalhe(true);
    try {
      const res = await base44.functions.invoke('portalIndicador', { action: 'ver_lead', token, lead_id: lead.id });
      setDetalheLead(res.data);
    } catch (e) { toast.error('Erro ao carregar histórico: ' + e.message); }
    setLoadingDetalhe(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: AURORA.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: AURORA.accent }} />
      </div>
    );
  }

  if (erro || !indicador) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: AURORA.bg }}>
        <div className="max-w-sm w-full rounded-2xl p-8 text-center" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <XCircle className="w-14 h-14 mx-auto mb-4" style={{ color: AURORA.danger }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: AURORA.text }}>Link inválido</h2>
          <p className="text-sm mb-6" style={{ color: AURORA.textMuted }}>{erro || 'Não foi possível localizar seu acesso. Solicite um novo convite à Villela Exchange.'}</p>
        </div>
      </div>
    );
  }

  // ─── Aceite do Termo de Uso ───
  if (!indicador.termo_aceito) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: AURORA.bg }}>
        <div className="max-w-xl w-full rounded-2xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <div className="px-6 py-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #0d1117, #16213e)', borderBottom: `1px solid ${AURORA.border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.12)' }}>
              <ShieldCheck className="w-5 h-5" style={{ color: AURORA.accent }} />
            </div>
            <div>
              <p className="font-bold" style={{ color: AURORA.text }}>Formalização do Cadastro</p>
              <p className="text-xs" style={{ color: AURORA.textMuted }}>Termo de Uso · Portal do Indicador</p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm mb-4" style={{ color: AURORA.text }}>Olá, <strong style={{ color: AURORA.accent }}>{indicador.nome}</strong>! Para acessar o portal, leia e aceite o Termo de Uso:</p>
            <div className="rounded-xl p-4 max-h-64 overflow-y-auto text-xs leading-relaxed whitespace-pre-line" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.textMuted }}>
              {TERMOS}
            </div>
            <label className="flex items-center gap-2.5 mt-4 cursor-pointer">
              <input type="checkbox" checked={showTermo} onChange={e => setShowTermo(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm" style={{ color: AURORA.text }}>Li e concordo com o <strong>Termo de Uso (v1.0)</strong></span>
            </label>
            <button onClick={aceitarTermo} disabled={!showTermo || aceitando}
              className="w-full mt-5 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition disabled:opacity-40"
              style={{ background: AURORA.accent, color: '#0d1117' }}>
              {aceitando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Aceitar e Acessar o Portal
            </button>
            <p className="text-[10px] text-center mt-3" style={{ color: AURORA.textMuted }}>
              Você receberá um e-mail de boas-vindas confirmando o aceite.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Dashboard do Indicador ───
  const total = leads.length;
  const novos = leads.filter(l => l.status === 'novo').length;
  const emAtend = leads.filter(l => l.status === 'em_atendimento').length;
  const convertidos = leads.filter(l => ['convertido_cliente', 'convertido_contrato', 'convertido_venda'].includes(l.status)).length;
  const vendasEfetivas = leads.filter(l => l.status === 'convertido_venda').length;
  const volumeIndicado = leads.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);
  const pctPadrao = indicador.percentual_comissao ?? 0;
  const comissaoGerada = leads.filter(l => l.status === 'convertido_venda').reduce((s, l) => {
    const pctLead = Number(l.comissao_pct ?? pctPadrao);
    const base = Number(l.valor_venda) || Number(l.valor_estimado) || 0;
    return s + (base * pctLead / 100);
  }, 0);
  const vendasConvertidasValor = leads.filter(l => l.status === 'convertido_venda').reduce((s, l) => s + (Number(l.valor_venda) || Number(l.valor_estimado) || 0), 0);

  const statusData = [
    { name: 'Novas', value: novos, color: AURORA.accent },
    { name: 'Em Atendimento', value: emAtend, color: AURORA.warning },
    { name: 'Convertidas', value: convertidos, color: AURORA.green },
    { name: 'Descartadas', value: leads.filter(l => l.status === 'descartado').length, color: '#9ca3af' },
  ].filter(d => d.value > 0);

  const getNome = (l) => l.tipo === 'PF' ? l.pf_nome : l.pj_razao_social;
  const getDoc = (l) => l.tipo === 'PF' ? l.pf_cpf : l.pj_cnpj;
  const getContato = (l) => l.tipo === 'PF' ? (l.pf_whatsapp || l.pf_telefone) : (l.pj_whatsapp || l.pj_telefone);

  return (
    <div className="min-h-screen relative" style={{ background: AURORA.bg, color: AURORA.text }}>
      {/* ─── Marca d'água (mesma do portal interno) ─── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, backgroundImage: `url("${WATERMARK_IMG}")`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.45, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, background: 'linear-gradient(180deg, rgba(13,17,23,0.55) 0%, rgba(13,17,23,0.45) 40%, rgba(13,17,23,0.60) 100%)', pointerEvents: 'none' }} />

      {/* ─── Overlay de boas-vindas (após aceite do termo) ─── */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(13,17,23,0.92)' }}>
          <div className="max-w-md w-full rounded-3xl overflow-hidden text-center" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.12), rgba(0,102,204,0.10))' }}>
              <img src={WELCOME_IMG} alt="Boas-vindas" className="w-full h-44 object-cover" style={{ mixBlendMode: 'screen' }} />
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
                <PartyPopper className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-1.5" style={{ color: AURORA.text }}>Bem-vindo, {indicador.nome.split(' ')[0]}! 🎉</h2>
              <p className="text-sm leading-relaxed mb-1" style={{ color: AURORA.textMuted }}>
                Seu cadastro foi formalizado com sucesso. Agora você pode cadastrar indicações e acompanhar a jornada de cada lead em tempo real.
              </p>
              <p className="text-xs mb-5" style={{ color: AURORA.accent }}>Comissão padrão: <strong>{indicador.percentual_comissao ?? 0}%</strong></p>
              <button onClick={() => setShowWelcome(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition"
                style={{ background: AURORA.accent, color: '#0d1117' }}>
                <ArrowRight className="w-4 h-4" /> Começar a indicar
              </button>
              <p className="text-[10px] mt-3" style={{ color: AURORA.textMuted }}>Enviamos também um e-mail de boas-vindas para {indicador.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Capa de "Bom retorno" — apenas em retorno real (nova sessão do navegador) ─── */}
      {showCapa && indicador?.termo_aceito && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: 'rgba(13,17,23,0.92)' }}>
          <div className="max-w-md w-full rounded-3xl overflow-hidden text-center" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.12), rgba(0,102,204,0.10))' }}>
              <img src={WELCOME_IMG} alt="Boas-vindas" className="w-full h-44 object-cover" style={{ mixBlendMode: 'screen' }} />
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
                <PartyPopper className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-1.5" style={{ color: AURORA.text }}>Bom retorno, {indicador.nome.split(' ')[0]}! 👋</h2>
              <p className="text-sm leading-relaxed mb-1" style={{ color: AURORA.textMuted }}>
                Que bom te ver de volta no Portal do Indicador. Acompanhe a jornada dos seus leads e cadastre novas indicações a qualquer momento.
              </p>
              <p className="text-xs mb-5" style={{ color: AURORA.accent }}>Comissão padrão: <strong>{indicador.percentual_comissao ?? 0}%</strong></p>
              <button onClick={() => setShowCapa(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition"
                style={{ background: AURORA.accent, color: '#0d1117' }}>
                <ArrowRight className="w-4 h-4" /> Acessar meu painel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0d1117, #16213e)', borderBottom: `1px solid ${AURORA.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>VX</div>
          <div>
            <p className="font-bold text-sm" style={{ color: AURORA.text }}>Portal do Indicador</p>
            <p className="text-[11px]" style={{ color: AURORA.textMuted }}>{indicador.nome} · {indicador.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleNotificacoes} disabled={togglingNotif}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
            style={{ background: indicador.receber_notificacoes ? 'rgba(0,212,170,0.12)' : AURORA.surface2, color: indicador.receber_notificacoes ? AURORA.accent : AURORA.textMuted, border: `1px solid ${AURORA.border}` }}>
            {togglingNotif ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : indicador.receber_notificacoes ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{indicador.receber_notificacoes ? 'Notif. ativas' : 'Notif. desligadas'}</span>
          </button>
          <button onClick={async () => {
            if (!confirm('Sair do portal?')) return;
            try {
              const auth = await base44.auth.isAuthenticated();
              if (auth) { await base44.auth.logout(); }
              else { navigate('/'); }
            } catch { navigate('/'); }
          }}
            className="p-2 rounded-xl" style={{ background: AURORA.surface2, color: AURORA.textMuted }}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 relative" style={{ zIndex: 1 }}>
        {/* Welcome banner */}
        <div className="rounded-2xl p-5 mb-6 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.10), rgba(0,102,204,0.08))', border: `1px solid ${AURORA.border}` }}>
          <PartyPopper className="w-6 h-6 flex-shrink-0" style={{ color: AURORA.accent }} />
          <div>
            <p className="font-bold text-sm" style={{ color: AURORA.text }}>Bem-vindo, {indicador.nome.split(' ')[0]}!</p>
            <p className="text-xs" style={{ color: AURORA.textMuted }}>Cadastre indicações e acompanhe a jornada de cada lead. Comissão padrão: <strong style={{ color: AURORA.accent }}>{indicador.percentual_comissao ?? 0}%</strong></p>
          </div>
        </div>

        {/* KPIs de gestão */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <Kpi label="Volume indicado" value={fmtMoeda(volumeIndicado)} icon={TrendingUp} color={AURORA.accent} />
          <Kpi label="Total de indicações" value={total} icon={FileText} color={AURORA.text} />
          <Kpi label="Vendas convertidas" value={fmtMoeda(vendasConvertidasValor)} icon={DollarSign} color={AURORA.accent} />
          <Kpi label="Vendas efetivas" value={vendasEfetivas} icon={Trophy} color={AURORA.green} />
          <Kpi label="Comissão gerada" value={fmtMoeda(comissaoGerada)} icon={CheckCircle2} color={AURORA.green} />
        </div>

        {/* Gráfico de distribuição por status */}
        {total > 0 && (
          <div className="rounded-2xl p-4 mb-6 flex items-center gap-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <div className="flex-1">
              <p className="text-xs font-bold mb-2" style={{ color: AURORA.text }}>Distribuição por status</p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2}>
                      {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {statusData.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-xs" style={{ color: AURORA.textMuted }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}: <strong style={{ color: AURORA.text }}>{d.value}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold" style={{ color: AURORA.text }}>Suas Indicações</p>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="p-2 rounded-xl" style={{ background: AURORA.surface2, color: AURORA.textMuted }}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => navigate(`/indicacao/${token}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition"
              style={{ background: AURORA.accent, color: '#0d1117' }}>
              <Plus className="w-4 h-4" /> Nova Indicação
            </button>
          </div>
        </div>

        {loadingLeads ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: AURORA.accent }} /></div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <UserCheck className="w-12 h-12 mx-auto mb-3" style={{ color: AURORA.textMuted }} />
            <p className="font-semibold" style={{ color: AURORA.text }}>Você ainda não cadastrou indicações</p>
            <p className="text-sm mt-1 mb-4" style={{ color: AURORA.textMuted }}>Cadastre seu primeiro lead e acompanhe a jornada aqui</p>
            <button onClick={() => navigate(`/indicacao/${token}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: AURORA.accent, color: '#0d1117' }}>
              <Plus className="w-4 h-4" /> Cadastrar Indicação
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map(lead => {
             const st = STATUS_CFG[lead.status] || STATUS_CFG.novo;
             return (
               <div key={lead.id} onClick={() => verLead(lead)} className="rounded-2xl p-4 cursor-pointer transition"
                 style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}
                 onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,212,170,0.35)'}
                 onMouseLeave={e => e.currentTarget.style.borderColor = AURORA.border}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00D4AA22, #0066cc22)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                      {getNome(lead)?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate" style={{ color: AURORA.text }}>{getNome(lead)}</p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: AURORA.textMuted }}>
                        {lead.tipo === 'PF' ? '👤 PF' : '🏢 PJ'} · {getDoc(lead) || '—'} · {getContato(lead) || '—'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent }}>{lead.produto}</span>
                        {lead.valor_estimado != null && <span className="text-[9px]" style={{ color: AURORA.textMuted }}>{fmtMoeda(lead.valor_estimado)}</span>}
                        <span className="text-[9px]" style={{ color: AURORA.textMuted }}>· {fmtData(lead.created_date)}</span>
                      </div>
                      {(lead.cliente_id || lead.contrato_id) && (
                        <div className="flex items-center gap-2 mt-2">
                          {lead.cliente_id && <span className="text-[10px] flex items-center gap-1" style={{ color: AURORA.green }}><CheckCircle2 className="w-3 h-3" /> Cliente criado</span>}
                          {lead.contrato_id && <span className="text-[10px] flex items-center gap-1" style={{ color: AURORA.purple }}><FileText className="w-3 h-3" /> Contrato gerado</span>}
                        </div>
                      )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 self-center" style={{ color: AURORA.textMuted }}>
                      <Eye className="w-4 h-4" />
                      </div>
                      </div>
                      </div>
                      );
                      })}
                      </div>
                      )}

                      {/* ─── Modal: histórico de interações do lead ─── */}
                      {leadSelecionado && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => { setLeadSelecionado(null); setDetalheLead(null); }}>
                      <div className="w-full max-w-xl rounded-2xl overflow-hidden max-h-[88vh] flex flex-col" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between px-5 py-3" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
                      <div>
                      <p className="font-bold text-sm" style={{ color: AURORA.text }}>{getNome(leadSelecionado)}</p>
                      <p className="text-[11px]" style={{ color: AURORA.textMuted }}>Histórico de interações · {leadSelecionado.produto}</p>
                      </div>
                      <button onClick={() => { setLeadSelecionado(null); setDetalheLead(null); }} className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
                      </div>
                      <div className="p-5 overflow-y-auto">
                      {loadingDetalhe ? (
                      <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: AURORA.accent }} /></div>
                      ) : detalheLead ? (
                      <>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                      <Info label="Status atual" value={STATUS_CFG[detalheLead.lead.status]?.label || detalheLead.lead.status} />
                      <Info label="Valor estimado" value={fmtMoeda(detalheLead.lead.valor_estimado)} />
                      <Info label="Tipo" value={detalheLead.lead.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'} />
                      <Info label="Contato" value={getContato(detalheLead.lead)} />
                      {(() => {
                        const pctLead = detalheLead.lead.comissao_pct
                          ?? (Array.isArray(detalheLead.contrato?.indicadores)
                            ? (detalheLead.contrato.indicadores.find(i => i.id === indicador.id || i.nome === indicador.nome)?.percentual)
                            : null)
                          ?? pctPadrao;
                        const base = Number(detalheLead.venda?.valor_total_contrato) || Number(detalheLead.venda?.valor) || Number(detalheLead.lead.valor_estimado) || 0;
                        return <Info label={`Comissão (${Number(pctLead)}%)`} value={fmtMoeda(base * Number(pctLead) / 100)} />;
                      })()}
                      </div>

                      <JornadaCliente detalhe={detalheLead} />

                      <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: AURORA.accent }}><History className="w-3.5 h-3.5" /> Interações registradas</p>
                      {detalheLead.interacoes?.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        {detalheLead.interacoes.map((it, i) => (
                          <div key={i} className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold" style={{ color: AURORA.text }}>{it.tipo} · {it.resultado || '—'}</span>
                              <span className="text-[10px]" style={{ color: AURORA.textMuted }}>{fmtData(it.data_interacao)}</span>
                            </div>
                            <p className="text-xs" style={{ color: AURORA.textMuted }}>{it.descricao}</p>
                            {it.vendedor_nome && <p className="text-[10px] mt-1" style={{ color: AURORA.purple }}>por {it.vendedor_nome}</p>}
                          </div>
                        ))}
                      </div>
                      ) : (
                      <div className="rounded-xl p-4 mb-4 text-center" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                        <MessageSquare className="w-6 h-6 mx-auto mb-2" style={{ color: AURORA.textMuted }} />
                        <p className="text-xs" style={{ color: AURORA.textMuted }}>Nenhuma interação registrada ainda</p>
                      </div>
                      )}

                      {detalheLead.conversa && detalheLead.conversa.mensagens?.length > 0 && (
                      <>
                        <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: AURORA.accent }}><MessageSquare className="w-3.5 h-3.5" /> Conversa WhatsApp ({detalheLead.conversa.mensagens.length} msgs)</p>
                        <div className="rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                          {detalheLead.conversa.mensagens.slice(-30).map((m, i) => (
                            <div key={i} className="text-[11px]" style={{ color: m.de === 'lead' ? AURORA.text : AURORA.accent }}>
                              <span style={{ color: AURORA.textMuted }}>{new Date(m.timestamp).toLocaleString('pt-BR')}</span> · {m.texto}
                            </div>
                          ))}
                        </div>
                      </>
                      )}
                      </>
                      ) : (
                      <p className="text-sm text-center py-8" style={{ color: AURORA.textMuted }}>Não foi possível carregar o histórico.</p>
                      )}
                      </div>
                      </div>
                      </div>
                      )}

        <p className="text-center text-[10px] mt-8" style={{ color: AURORA.textMuted }}>
          Villela Exchange · Portal do Indicador · {indicador.receber_notificacoes ? 'Você recebe notificações por e-mail' : 'Notificações desativadas'}
        </p>
      </main>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <p className="text-[11px]" style={{ color: AURORA.textMuted }}>{label}</p>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: AURORA.textMuted }}>{label}</p>
      <p className="text-sm" style={{ color: AURORA.text }}>{value || '—'}</p>
    </div>
  );
}