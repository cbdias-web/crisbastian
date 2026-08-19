import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, ShieldCheck, PartyPopper, Plus, Bell, BellOff, RefreshCw, Phone, Mail,
  TrendingUp, Clock, CheckCircle2, XCircle, FileText, UserCheck, ArrowRight, LogOut,
} from 'lucide-react';
import { toast } from 'sonner';

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

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.style.background = AURORA.bg;
  }, []);

  useEffect(() => {
    if (!token) { setErro('Token inválido'); setLoading(false); return; }
    base44.functions.invoke('portalIndicador', { action: 'buscar', token })
      .then(res => { setIndicador(res.data.indicador); })
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

  const getNome = (l) => l.tipo === 'PF' ? l.pf_nome : l.pj_razao_social;
  const getDoc = (l) => l.tipo === 'PF' ? l.pf_cpf : l.pj_cnpj;
  const getContato = (l) => l.tipo === 'PF' ? (l.pf_whatsapp || l.pf_telefone) : (l.pj_whatsapp || l.pj_telefone);

  return (
    <div className="min-h-screen" style={{ background: AURORA.bg, color: AURORA.text }}>
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
          <button onClick={() => { if (confirm('Sair do portal?')) navigate('/'); }}
            className="p-2 rounded-xl" style={{ background: AURORA.surface2, color: AURORA.textMuted }}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Welcome banner */}
        <div className="rounded-2xl p-5 mb-6 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.10), rgba(0,102,204,0.08))', border: `1px solid ${AURORA.border}` }}>
          <PartyPopper className="w-6 h-6 flex-shrink-0" style={{ color: AURORA.accent }} />
          <div>
            <p className="font-bold text-sm" style={{ color: AURORA.text }}>Bem-vindo, {indicador.nome.split(' ')[0]}!</p>
            <p className="text-xs" style={{ color: AURORA.textMuted }}>Cadastre indicações e acompanhe a jornada de cada lead. Comissão padrão: <strong style={{ color: AURORA.accent }}>{indicador.percentual_comissao ?? 0}%</strong></p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Kpi label="Total de indicações" value={total} icon={TrendingUp} color={AURORA.accent} />
          <Kpi label="Novas" value={novos} icon={Clock} color={AURORA.warning} />
          <Kpi label="Em atendimento" value={emAtend} icon={FileText} color={AURORA.purple} />
          <Kpi label="Convertidas" value={convertidos} icon={CheckCircle2} color={AURORA.green} />
        </div>

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
                <div key={lead.id} className="rounded-2xl p-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
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
                  </div>
                </div>
              );
            })}
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
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}