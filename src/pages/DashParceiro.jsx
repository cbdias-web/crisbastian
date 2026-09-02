import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Handshake, Send, Users, Lock } from 'lucide-react';
import ParceirosTab from '@/components/central/ParceirosTab';
import IndicacoesTab from '@/components/central/IndicacoesTab';
import PortalIndicadorAuth from '@/components/portal/PortalIndicadorAuth';
import ConsolidadoIndicadores from '@/components/portal/ConsolidadoIndicadores';
import FiltroIndicadores from '@/components/portal/FiltroIndicadores';
import DashParceiroSomenteLeitura from '@/components/portal/DashParceiroSomenteLeitura';
import { useAcessoDashParceiro } from '@/hooks/useAcessoDashParceiro';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

export default function DashParceiro() {
  const [user, setUser] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('aba');
      return p === 'indicacoes' || p === 'parceiros' ? p : 'parceiros';
    } catch { return 'parceiros'; }
  });
  const [parceiroLogado, setParceiroLogado] = useState(null);
  const [checked, setChecked] = useState(false);
  const [periodo, setPeriodo] = useState('mes');
  const [parceiroFiltro, setParceiroFiltro] = useState('todos');
  // Acesso somente leitura: gerentes/SDRs atuando na esteira (Fila de Contatos)
  const { data: podeVerDash = false, isLoading: carregandoAcesso } = useAcessoDashParceiro(user);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      // Indicador logado: localiza seu cadastro de Parceiro pelo e-mail.
      // O e-mail de boas-vindas é disparado no aceite do termo (PortalIndicadorAuth),
      // não aqui — para respeitar a sequência termo → boas-vindas.
      if (u && u.role !== 'admin' && u.email) {
        try {
          const ps = await base44.entities.Parceiro.filter({ email: u.email });
          setParceiroLogado(ps[0] || null);
        } catch (e) {}
      }
      setChecked(true);
    }).catch(() => setChecked(true));
  }, []);

  const isAdmin = user?.role === 'admin';
  const isIndicador = user?.role === 'indicador' || user?.indicador === true || !!parceiroLogado;

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-dash-parceiro'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    enabled: !!user && isAdmin,
  });

  // Lista de indicadores para o filtro (compartilhado entre consolação e lista)
  const { data: parceiros = [] } = useQuery({
    queryKey: ['parceiros-dash-parceiro'],
    queryFn: () => base44.entities.Parceiro.list('nome'),
    enabled: !!user && isAdmin,
  });

  // Gateia até user + parceiroLogado estarem resolvidos (evita flash de "Acesso Restrito"
  // ou "Cadastro não encontrado" antes do filtro assíncrono concluir).
  if (!user || !checked || (!isAdmin && !isIndicador && carregandoAcesso)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: AURORA.bg }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(0,212,170,0.2)', borderTopColor: AURORA.accent }} />
      </div>
    );
  }

  if (!isAdmin && !isIndicador && !podeVerDash) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: AURORA.bg }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Lock className="w-8 h-8" style={{ color: '#f87171' }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: AURORA.text }}>Acesso Restrito</h2>
          <p className="text-sm" style={{ color: AURORA.textMuted }}>O Dash Parceiro é exclusivo para administradores e indicadores.</p>
        </div>
      </div>
    );
  }

  // ─── Visão do INDICADOR (logado como usuário) — experiência completa do portal ───
  // termo de uso → boas-vindas → 2 menus (Indicar + Dash/acompanhar)
  if (isIndicador) {
    return <PortalIndicadorAuth user={user} parceiro={parceiroLogado} />;
  }

  // ─── Visão SOMENTE LEITURA (gerentes/SDRs atuando na esteira de contatos) ───
  if (!isAdmin) {
    return <DashParceiroSomenteLeitura />;
  }

  // ─── Visão do ADMIN ───
  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: AURORA.bg, color: AURORA.text }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.15)' }}>
                <Handshake className="w-4 h-4" style={{ color: AURORA.accent }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: AURORA.text }}>Dash Parceiro</h1>
            </div>
            <p className="text-sm" style={{ color: AURORA.textMuted }}>
              Gestão de Indicadores e suas indicações — indicações viram usuários do app (role "indicador")
            </p>
          </div>
        </div>

        <FiltroIndicadores
          periodo={periodo}
          setPeriodo={setPeriodo}
          parceiroId={parceiroFiltro}
          setParceiroId={setParceiroFiltro}
          parceiros={parceiros}
        />

        <ConsolidadoIndicadores periodo={periodo} parceiroId={parceiroFiltro} parceiros={parceiros} />

        <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
          {[
            { key: 'parceiros', label: 'Indicadores', icon: Users },
            { key: 'indicacoes', label: 'Indicações', icon: Send },
          ].map(aba => (
            <button key={aba.key} onClick={() => setAbaAtiva(aba.key)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition"
              style={{
                background: abaAtiva === aba.key ? AURORA.accent : 'transparent',
                color: abaAtiva === aba.key ? '#0d1117' : AURORA.textMuted,
              }}>
              <aba.icon className="w-3.5 h-3.5" /> {aba.label}
            </button>
          ))}
        </div>

        {abaAtiva === 'parceiros' && <ParceirosTab />}
        {abaAtiva === 'indicacoes' && <IndicacoesTab vendedores={vendedores} periodo={periodo} parceiroIdFiltro={parceiroFiltro} />}
      </div>
    </div>
  );
}