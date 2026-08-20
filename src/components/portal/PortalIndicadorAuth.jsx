import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck, PartyPopper, Plus, ArrowRight, Loader2, Send, LayoutDashboard,
  TrendingUp, FileText, DollarSign, Trophy, CheckCircle2, UserCircle, Handshake, LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import NovaIndicacaoModal from '@/components/central/NovaIndicacaoModal';
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

export default function PortalIndicadorAuth({ user, parceiro }) {
  const [indicador, setIndicador] = useState(parceiro);
  const [aceitando, setAceitando] = useState(false);
  const [concordo, setConcordo] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [aba, setAba] = useState('indicar');
  const [showNova, setShowNova] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['indicador-leads-auth', parceiro?.id],
    queryFn: () => base44.entities.LeadIndicacao.filter({ parceiro_id: parceiro.id }, '-created_date', 200),
    enabled: !!parceiro?.id && !!parceiro?.termo_aceito,
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
      // 1) Marca o termo como aceito DIRETAMENTE via SDK (instantâneo — não bloqueia em e-mail).
      const agora = new Date().toISOString();
      await base44.entities.Parceiro.update(parceiro.id, {
        termo_aceito: true,
        termo_aceito_em: agora,
        termo_versao: '1.0',
      });
      setIndicador({ ...parceiro, termo_aceito: true, termo_aceito_em: agora });
      setShowWelcome(true);
      toast.success('Termo aceito! Bem-vindo ao portal.');
      // 2) Dispara o e-mail de boas-vindas em BACKGROUND (fire-and-forget) — não trava a UI.
      base44.functions.invoke('enviarBoasVindasIndicador', {}).catch(() => {});
    } catch (e) { toast.error('Erro: ' + (e?.message || 'não foi possível aceitar o termo')); }
    setAceitando(false);
  };

  const nomePrimeiro = (indicador.nome || user?.full_name || 'Indicador').split(' ')[0];

  // ─── 1) Aceite do Termo de Uso ───
  if (!indicador.termo_aceito) {
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

  // KPIs do dash
  const total = leads.length;
  const convertidos = leads.filter(l => ['convertido_cliente', 'convertido_contrato', 'convertido_venda'].includes(l.status)).length;
  const vendasEfetivas = leads.filter(l => l.status === 'convertido_venda').length;
  const volumeIndicado = leads.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);

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
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.15)' }}>
                <Handshake className="w-4 h-4" style={{ color: AURORA.accent }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: AURORA.text }}>Portal do Indicador</h1>
            </div>
            <p className="text-sm" style={{ color: AURORA.textMuted }}>
              Olá, <strong style={{ color: AURORA.accent }}>{indicador.nome}</strong> — cadastro formalizado · comissão <strong>{indicador.percentual_comissao ?? 0}%</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
              <UserCircle className="w-4 h-4" style={{ color: AURORA.accent }} />
              <span className="text-xs" style={{ color: AURORA.textMuted }}>{indicador.email}</span>
            </div>
            <button onClick={() => { if (confirm('Deseja realmente sair?')) base44.auth.logout(); }}
              className="p-2 rounded-xl transition" style={{ background: AURORA.surface, color: AURORA.textMuted, border: `1px solid ${AURORA.border}` }}
              title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2 menus: Indicar + Dash */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
          {[
            { key: 'indicar', label: 'Indicar', icon: Send },
            { key: 'dash', label: 'Dash (acompanhar)', icon: LayoutDashboard },
          ].map(t => (
            <button key={t.key} onClick={() => setAba(t.key)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition"
              style={{ background: aba === t.key ? AURORA.accent : 'transparent', color: aba === t.key ? '#0d1117' : AURORA.textMuted }}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {aba === 'indicar' ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
              <Plus className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: AURORA.text }}>Cadastre uma nova indicação</h2>
            <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: AURORA.textMuted }}>
              Informe os dados do lead (PF ou PJ). Após o cadastro, ele entra na esteira comercial da Villela Exchange e você acompanha o status no Dash.
            </p>
            <button onClick={() => setShowNova(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition"
              style={{ background: AURORA.accent, color: '#0d1117' }}>
              <Plus className="w-4 h-4" /> Nova Indicação
            </button>
          </div>
        ) : (
          <div>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Kpi label="Volume indicado" value={fmtMoeda(volumeIndicado)} icon={TrendingUp} color={AURORA.accent} />
              <Kpi label="Total de indicações" value={total} icon={FileText} color={AURORA.text} />
              <Kpi label="Convertidas" value={convertidos} icon={CheckCircle2} color={AURORA.green} />
              <Kpi label="Vendas efetivas" value={vendasEfetivas} icon={Trophy} color={AURORA.green} />
            </div>
            {isLoading ? (
              <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: AURORA.accent }} /></div>
            ) : (
              <IndicacoesTab parceiroIdFixo={indicador.id} modoIndicador parceiro={indicador} />
            )}
          </div>
        )}
      </div>

      {showNova && <NovaIndicacaoModal parceiro={indicador} onClose={() => setShowNova(false)} />}
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