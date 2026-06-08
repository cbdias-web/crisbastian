import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calculator, Globe, Shield, Settings, Anchor, Building2, ChevronRight, FileText, BarChart3 } from 'lucide-react';
import PropostasGeradas from '@/components/precificacao/PropostasGeradas';
import RelatorioPrecificacao from '@/components/precificacao/RelatorioPrecificacao';
import SimuladorProposta from '@/components/precificacao/SimuladorProposta';
import SimuladorContaInternacional from '@/components/precificacao/SimuladorContaInternacional';
import SimuladorSeguroGarantia from '@/components/precificacao/SimuladorSeguroGarantia';
import SimuladorOffshore from '@/components/precificacao/SimuladorOffshore';
import SimuladorCanalBancario from '@/components/precificacao/SimuladorCanalBancario';
import ConfigPrecificacao from '@/components/precificacao/ConfigPrecificacao';
import PrecificacaoBloqueada from '@/components/precificacao/PrecificacaoBloqueada';

const PRODUTOS = [
  {
    id: 'dolarize',
    label: 'Dolarize',
    icon: Calculator,
    cor: '#b45309',
    gradient: 'from-amber-600 to-amber-500',
    desc: 'Reestruturação de dívidas com proteção cambial',
    tag: 'Reestruturação',
  },
  {
    id: 'offshore',
    label: 'Offshore',
    icon: Anchor,
    cor: '#0e7490',
    gradient: 'from-cyan-700 to-cyan-500',
    desc: 'Gestão de patrimônio em estruturas internacionais',
    tag: 'Patrimônio',
  },
  {
    id: 'canal-bancario',
    label: 'Canal Bancário',
    icon: Building2,
    cor: '#6d28d9',
    gradient: 'from-violet-700 to-violet-500',
    desc: 'Abertura e operação de contas no exterior',
    tag: 'Operações',
  },
  {
    id: 'conta-internacional',
    label: 'Conta Internacional',
    icon: Globe,
    cor: '#1a3a6b',
    gradient: 'from-blue-700 to-blue-500',
    desc: 'Conta corrente internacional em USD/EUR',
    tag: 'Conta',
  },
  {
    id: 'seguro-garantia',
    label: 'Garantia',
    icon: Shield,
    cor: '#be123c',
    gradient: 'from-rose-700 to-rose-500',
    desc: 'Garantias para operações comerciais e judiciais',
    tag: 'Garantia',
  },
];

export default function Precificacao() {
  const [tab, setTab] = useState('dolarize');
  const [configOpen, setConfigOpen] = useState(false);
  const [mainTab, setMainTab] = useState('simulador'); // 'simulador' | 'propostas' | 'relatorios'
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [acesso, setAcesso] = useState(null); // null=loading, true=tem acesso, false=bloqueado

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const isAdmin = u?.role === 'admin' || u?.permissao_admin === true;
      if (isAdmin) { setAcesso(true); setLoadingUser(false); return; }
      // Verifica se tem solicitação aprovada
      try {
        const solic = await base44.entities.NotificacaoAutorizacao.filter({
          tipo: 'solicitacao_precificacao',
          user_id: u.id,
          status: 'aprovado',
        });
        setAcesso(solic.length > 0);
      } catch { setAcesso(false); }
      setLoadingUser(false);
    }).catch(() => { setLoadingUser(false); setAcesso(false); });
  }, []);

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#1a3150] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!acesso) {
    return <PrecificacaoBloqueada user={user} />;
  }

  const ativo = PRODUTOS.find(p => p.id === tab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <span>Comercial</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Precificação</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Precificação</h1>
          </div>
          <button
            onClick={() => setConfigOpen(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              configOpen ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Parâmetros
          </button>
        </div>
        {/* Main tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button onClick={() => setMainTab('simulador')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              mainTab === 'simulador' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Calculator className="w-4 h-4" /> Simulador
          </button>
          <button onClick={() => setMainTab('propostas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              mainTab === 'propostas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <FileText className="w-4 h-4" /> Propostas Geradas
          </button>
          <button onClick={() => setMainTab('relatorios')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              mainTab === 'relatorios' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <BarChart3 className="w-4 h-4" /> Relatórios
          </button>
        </div>
      </div>

      {mainTab === 'relatorios' ? (
        <div className="p-6 max-w-6xl mx-auto">
          <RelatorioPrecificacao />
        </div>
      ) : mainTab === 'propostas' ? (
        <div className="p-6 max-w-6xl mx-auto">
          <PropostasGeradas />
        </div>
      ) : configOpen ? (
        <div className="p-6 max-w-6xl mx-auto">
          <ConfigPrecificacao />
        </div>
      ) : (
        <div className="p-6 max-w-5xl mx-auto">
          {/* Seletor de Produtos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {PRODUTOS.map(p => {
              const Icon = p.icon;
              const isActive = tab === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setTab(p.id)}
                  className={`relative rounded-2xl p-4 text-left transition-all border-2 group ${
                    isActive
                      ? 'border-transparent text-white shadow-lg scale-[1.02]'
                      : 'bg-white border-gray-100 hover:border-gray-200 text-gray-700 shadow-sm hover:shadow-md'
                  }`}
                  style={isActive ? { background: `linear-gradient(135deg, ${p.cor}ee, ${p.cor}bb)` } : {}}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-all ${
                    isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-gray-200'
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className={`text-xs font-bold mb-0.5 ${isActive ? 'text-white' : 'text-gray-800'}`}>
                    {p.label}
                  </div>
                  <div className={`text-[10px] leading-tight ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                    {p.tag}
                  </div>
                  {isActive && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full opacity-70" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Banner do produto ativo */}
          {ativo && (
            <div
              className="rounded-2xl p-5 mb-6 text-white relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${ativo.cor}f0, ${ativo.cor}99)` }}
            >
              <div className="absolute right-0 top-0 w-48 h-full opacity-10">
                {(() => { const Icon = ativo.icon; return <Icon className="absolute right-4 top-4 w-36 h-36" />; })()}
              </div>
              <div className="relative">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">{ativo.tag}</span>
                <h2 className="text-2xl font-bold mt-1">{ativo.label}</h2>
                <p className="text-sm opacity-75 mt-1">{ativo.desc}</p>
              </div>
            </div>
          )}

          {tab === 'dolarize' && <SimuladorProposta configKey="dolarize" productName="Dolarize" />}
          {tab === 'offshore' && <SimuladorOffshore />}
          {tab === 'canal-bancario' && <SimuladorCanalBancario />}
          {tab === 'conta-internacional' && <SimuladorContaInternacional />}
          {tab === 'seguro-garantia' && <SimuladorSeguroGarantia />}
        </div>
      )}
    </div>
  );
}