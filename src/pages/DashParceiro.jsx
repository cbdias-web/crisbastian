import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Handshake, Send, Users, Lock, UserCircle } from 'lucide-react';
import ParceirosTab from '@/components/central/ParceirosTab';
import IndicacoesTab from '@/components/central/IndicacoesTab';

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
  const [abaAtiva, setAbaAtiva] = useState('parceiros');
  const [parceiroLogado, setParceiroLogado] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      // Indicador logado: localiza seu cadastro de Parceiro pelo e-mail
      // (vale para role 'indicador', flag indicador, ou casamento por e-mail)
      if (u && u.role !== 'admin' && u.email) {
        try {
          const ps = await base44.entities.Parceiro.filter({ email: u.email });
          const parceiro = ps[0] || null;
          setParceiroLogado(parceiro);
          // Cadastro validado pelo login → dispara e-mail de boas-vindas (uma única vez).
          // Só dispara para indicadores (não admin) que ainda não receberam o e-mail.
          if (parceiro && parceiro.boas_vindas_enviada !== true) {
            base44.functions.invoke('enviarBoasVindasIndicador', { app_origin: window.location.origin })
              .then(() => {
                setParceiroLogado({ ...parceiro, boas_vindas_enviada: true });
              })
              .catch(() => {});
          }
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

  if (user && checked && !isAdmin && !isIndicador) {
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

  // ─── Visão do INDICADOR (logado como usuário) ───
  if (isIndicador) {
    return (
      <div className="min-h-screen p-4 md:p-6" style={{ background: AURORA.bg, color: AURORA.text }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.15)' }}>
                  <Handshake className="w-4 h-4" style={{ color: AURORA.accent }} />
                </div>
                <h1 className="text-xl font-bold" style={{ color: AURORA.text }}>Meu Painel · Indicador</h1>
              </div>
              <p className="text-sm" style={{ color: AURORA.textMuted }}>
                Olá, <strong style={{ color: AURORA.accent }}>{parceiroLogado?.nome || user?.nome_tratamento || user?.full_name || 'Indicador'}</strong> — acompanhe suas indicações abaixo.
              </p>
            </div>
            {parceiroLogado && (
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
                <UserCircle className="w-4 h-4" style={{ color: AURORA.accent }} />
                <span className="text-xs" style={{ color: AURORA.textMuted }}>Comissão padrão</span>
                <span className="text-sm font-bold" style={{ color: AURORA.accent }}>{parceiroLogado.percentual_comissao ?? 0}%</span>
              </div>
            )}
          </div>

          {parceiroLogado ? (
            <IndicacoesTab parceiroIdFixo={parceiroLogado.id} modoIndicador />
          ) : (
            <div className="text-center py-12 rounded-2xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
              <UserCircle className="w-10 h-10 mx-auto mb-3" style={{ color: AURORA.textMuted }} />
              <p className="font-semibold" style={{ color: AURORA.text }}>Cadastro de indicador não encontrado</p>
              <p className="text-sm mt-1" style={{ color: AURORA.textMuted }}>Contate o administrador para vincular seu usuário ao cadastro de indicador.</p>
            </div>
          )}
        </div>
      </div>
    );
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
        {abaAtiva === 'indicacoes' && <IndicacoesTab vendedores={vendedores} />}
      </div>
    </div>
  );
}