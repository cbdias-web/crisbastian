import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, PartyPopper, Plus, ArrowRight, Loader2, Send, RefreshCw,
  TrendingUp, FileText, DollarSign, Trophy, CheckCircle2, UserCircle, Handshake, LogOut, Mail, Bell, BellOff, Eye,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import FormularioIndicacao from '@/components/portal/FormularioIndicacao';
import IndicacoesTab from '@/components/central/IndicacoesTab';

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
  red: '#f87171',
};

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

const fmtMoeda = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

const STATUS_CHART = {
  novo: { label: 'Novo', color: '#00D4AA' },
  em_atendimento: { label: 'Em Atendimento', color: '#fbbf24' },
  convertido_cliente: { label: '→ Cliente', color: '#34d399' },
  convertido_contrato: { label: '→ Contrato', color: '#a78bfa' },
  convertido_venda: { label: '→ Venda', color: '#22c55e' },
  descartado: { label: 'Descartado', color: '#6b7280' },
};

export default function PortalIndicadorAuth({ user, parceiro, modoAdmin = false, onSairAdmin }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [indicador, setIndicador] = useState(parceiro);
  const [aceitando, setAceitando] = useState(false);
  const [concordo, setConcordo] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [view, setView] = useState('dash');

  const sairPortal = () => {
    if (onSairAdmin) onSairAdmin();
    else navigate('/DashParceiro');
  };

  // Consulta geral: indicador liberado pelo admin vê TODAS as indicações (consolidado),
  // não apenas as suas. Admin em modo visualização sempre filtra pelo parceiro específico.
  const consultaGeral = !!parceiro?.acesso_consulta_geral && !modoAdmin;

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['indicador-leads-auth', parceiro?.id, consultaGeral],
    queryFn: () => consultaGeral
      ? base44.entities.LeadIndicacao.list('-created_date', 500)
      : base44.entities.LeadIndicacao.filter({ parceiro_id: parceiro.id }, '-created_date', 200),
    enabled: !!parceiro?.id && (modoAdmin || !!parceiro?.termo_aceito),
  });

  if (!parceiro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: AURORA.bg }}>
        <div className="text-center max-w-sm rounded-2xl p-8" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <UserCircle className="w-12 h-12 mx-auto mb-3" style={{ color: AURORA.textMuted }} />
          <p className="font-bold mb-1" style={{ color: AURORA.text }}>Cadastro de indicador não encontrado</p>
          <p className="text-sm" style={{ color: AURORA.textMuted }}>Contate o administrador para vincular seu usuário ao cadastro de indicador.</p>
        </div>
      </div>
    );
  }

  const aceitarTermo = async () => {
    setAceitando(true);
    try {
      const agora = new Date().toISOString();
      await base44.entities.Parceiro.update(parceiro.id, {
        termo_aceito: true,
        termo_aceito_em: agora,
        termo_versao: '1.0',
      });
      setIndicador({ ...parceiro, termo_aceito: true, termo_aceito_em: agora });
      setShowWelcome(true);
      toast.success('Termo aceito! Bem-vindo ao portal.');
      if (!modoAdmin) base44.functions.invoke('enviarBoasVindasIndicador', {}).catch(() => {});
    } catch (e) { toast.error('Erro: ' + (e?.message || 'não foi possível aceitar o termo')); }
    setAceitando(false);
  };

  const toggleNotificacoes = async () => {
    try {
      const novo = !indicador.receber_notificacoes;
      await base44.entities.Parceiro.update(parceiro.id, { receber_notificacoes: novo });
      setIndicador({ ...indicador, receber_notificacoes: novo });
      toast.success(novo ? 'Notificações por e-mail ativadas' : 'Notificações por e-mail desativadas');
    } catch (e) { toast.error('Erro: ' + e.message); }
  };

  const nomePrimeiro = (indicador.nome || user?.full_name || 'Indicador').split(' ')[0];

  // ─── 1) Aceite do Termo de Uso ─── (admin pula esta etapa — apenas visualiza o portal)
  if (!modoAdmin && !indicador.termo_aceito) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: AURORA.bg }}>
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
              <input type="checkbox" checked={concordo} onChange={e => setConcordo(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm" style={{ color: AURORA.text }}>Li e concordo com o <strong>Termo de Uso (v1.0)</strong></span>
            </label>
            <button onClick={aceitarTermo} disabled={!concordo || aceitando}
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

  // ─── KPIs ───
  const total = leads.length;
  const volumeIndicado = leads.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);
  const convertidos = leads.filter(l => ['convertido_cliente', 'convertido_contrato', 'convertido_venda'].includes(l.status));
  const vendasConvertidasValor = convertidos.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);
  const vendasEfetivas = leads.filter(l => l.status === 'convertido_venda');
  const vendasEfetivasValor = vendasEfetivas.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);
  const comissaoGerada = vendasEfetivasValor * ((indicador.percentual_comissao ?? 0) / 100);

  // ─── Dados do gráfico de rosca ───
  const chartData = Object.entries(STATUS_CHART)
    .map(([key, cfg]) => ({ key, name: cfg.label, value: leads.filter(l => l.status === key).length, color: cfg.color }))
    .filter(d => d.value > 0);

  if (view === 'formulario') {
    return <FormularioIndicacao parceiro={indicador} onVoltar={() => setView('dash')} />;
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: AURORA.bg, color: AURORA.text }}>
      {/* ─── Overlay de boas-vindas (após aceite do termo) ─── */}
      {showWelcome && (
        <div className="fixed left-0 right-0 bottom-0 z-[80] flex items-center justify-center p-6" style={{ top: '140px', background: 'rgba(13,17,23,0.92)' }}>
          <div className="max-w-md w-full rounded-3xl overflow-hidden text-center" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
                <PartyPopper className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-1.5" style={{ color: AURORA.text }}>Bem-vindo, {nomePrimeiro}! 🎉</h2>
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

      <div className="max-w-5xl mx-auto">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
              VX
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight" style={{ color: AURORA.text }}>Portal do Indicador</h1>
              <p className="text-xs" style={{ color: AURORA.textMuted }}>{indicador.nome} · {indicador.email}</p>
            </div>
          </div>
          {modoAdmin ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                Modo Admin · Visualizando
              </span>
              <button onClick={sairPortal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition"
                style={{ background: AURORA.accent, color: '#0d1117' }}
                title="Voltar para o Dash Parceiro">
                <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Voltar
              </button>
            </div>
          ) : consultaGeral ? (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Eye className="w-3 h-3" /> Consulta Geral · Todas as Indicações
            </span>
          ) : (
            <button onClick={() => { if (confirm('Deseja realmente sair?')) base44.auth.logout(); }}
              className="p-2 rounded-xl transition" style={{ background: AURORA.surface, color: AURORA.textMuted, border: `1px solid ${AURORA.border}` }}
              title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ─── Banner de boas-vindas ─── */}
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.10), rgba(0,102,204,0.08))', border: `1px solid ${AURORA.border}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
            <PartyPopper className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: AURORA.text }}>Bem-vindo, {nomePrimeiro}!</p>
            <p className="text-xs" style={{ color: AURORA.textMuted }}>
              {consultaGeral
                ? 'Você tem acesso à consulta geral: visualize e acompanhe todas as indicações da plataforma. Suas novas indicações continuam vinculadas ao seu cadastro.'
                : <>Cadastre indicações e acompanhe a jornada de cada lead. Comissão padrão: <strong style={{ color: AURORA.accent }}>{indicador.percentual_comissao ?? 0}%</strong></>}
            </p>
          </div>
        </div>

        {/* ─── KPIs ─── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Kpi label="Volume indicado" value={fmtMoeda(volumeIndicado)} icon={TrendingUp} color={AURORA.accent} />
          <Kpi label="Total de indicações" value={total} icon={FileText} color={AURORA.text} />
          <Kpi label="Vendas convertidas" value={fmtMoeda(vendasConvertidasValor)} icon={DollarSign} color={AURORA.green} />
          <Kpi label="Vendas efetivas" value={vendasEfetivas.length} icon={Trophy} color={AURORA.green} />
          <Kpi label="Comissão gerada" value={fmtMoeda(comissaoGerada)} icon={DollarSign} color={AURORA.accent} />
        </div>

        {/* ─── Gráfico de distribuição por status ─── */}
        <div className="rounded-2xl p-5 mb-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <p className="text-sm font-bold mb-3" style={{ color: AURORA.text }}>Distribuição por status</p>
          {total === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: AURORA.textMuted }}>Nenhuma indicação ainda</p>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-5">
              <div className="relative" style={{ width: 180, height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                      {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-bold" style={{ color: AURORA.text }}>{total}</p>
                  <p className="text-[10px]" style={{ color: AURORA.textMuted }}>indicações</p>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                {chartData.map(d => (
                  <div key={d.key} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs flex-1" style={{ color: AURORA.textMuted }}>{d.name}</span>
                    <span className="text-xs font-bold" style={{ color: AURORA.text }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Suas Indicações ─── */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.text }}>
            <Send className="w-4 h-4" style={{ color: AURORA.accent }} /> {consultaGeral ? 'Todas as Indicações' : 'Suas Indicações'}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ['indicador-leads-auth', indicador.id] })}
              className="p-2 rounded-xl transition" style={{ background: AURORA.surface, color: AURORA.textMuted, border: `1px solid ${AURORA.border}` }} title="Atualizar">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {!modoAdmin && (
              <button onClick={() => setView('formulario')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition"
                style={{ background: AURORA.accent, color: '#0d1117' }}>
                <Plus className="w-3.5 h-3.5" /> Nova Indicação
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: AURORA.accent }} /></div>
        ) : (
          <IndicacoesTab
            parceiroIdFixo={consultaGeral ? null : indicador.id}
            modoIndicador
            parceiro={indicador}
            hideNovaButton={false}
          />
        )}

        {/* ─── Footer ─── */}
        <div className="mt-6 pt-4 flex flex-col md:flex-row items-center justify-between gap-2" style={{ borderTop: `1px solid ${AURORA.border}` }}>
          <p className="text-[11px]" style={{ color: AURORA.textMuted }}>Villela Exchange · Portal do Indicador</p>
          <button onClick={toggleNotificacoes}
            className="flex items-center gap-1.5 text-[11px] font-medium transition"
            style={{ color: indicador.receber_notificacoes ? AURORA.accent : AURORA.textMuted }}
            title="Alternar notificações por e-mail">
            {indicador.receber_notificacoes ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            {indicador.receber_notificacoes ? 'Você recebe notificações por e-mail' : 'Notificações por e-mail desativadas'}
          </button>
        </div>
      </div>

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
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}