import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Rocket, Search, FileText, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Clock, TrendingUp, Link2, FileWarning, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ImplantacaoModal from '@/components/implantacoes/ImplantacaoModal';
import KanbanImplantacoes from '@/components/implantacoes/KanbanImplantacoes';
import PadrinhosModal from '@/components/implantacoes/PadrinhosModal';
import { TIPOS_CONTRATO } from '@/lib/tiposContrato';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.1)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const STATUS_CONFIG = {
  aguardando_documentacao: { label: 'Aguard. Documentação', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  em_andamento: { label: 'Em Andamento', color: '#00D4AA', bg: 'rgba(0,212,170,0.15)' },
  aguardando_cliente: { label: 'Aguard. Cliente', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  concluido: { label: 'Concluído', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  concluido_feedback: { label: 'Concluído - Feedback Enviado', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  rejeitado_compliance: { label: 'Rejeitado por Compliance', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  cancelado: { label: 'Cancelado', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
};

const PRIORIDADE_CONFIG = {
  baixa: { color: '#6b7280' },
  media: { color: '#fbbf24' },
  alta: { color: '#f97316' },
  urgente: { color: '#ef4444' },
};

// Grupos de status disponíveis no filtro da esteira
const STATUS_FILTROS = [
  { value: 'Todos', label: 'Todos os status' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Concluídos' },
  { value: 'atrasado', label: 'Atrasados' },
  { value: 'aguardando_cliente', label: 'Aguard. Cliente' },
  { value: 'rejeitado_compliance', label: 'Rejeitado por Compliance' },
  { value: 'cancelado', label: 'Cancelados' },
];

const estaAtrasada = (i) => {
  if (['concluido', 'concluido_feedback', 'cancelado', 'rejeitado_compliance'].includes(i.status)) return false;
  if (!i.data_prevista_conclusao) return false;
  return new Date(i.data_prevista_conclusao) < new Date();
};

const fmtVal = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const fmtDate = (d) => d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy') : '—';

export default function Implantacoes() {
  const [user, setUser] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroProduto, setFiltroProduto] = useState('Todos');
  const [filtroVendedor, setFiltroVendedor] = useState('Todos');
  const [filtroPadrinho, setFiltroPadrinho] = useState('Todos');
  const [filtroTipoContrato, setFiltroTipoContrato] = useState('Todos');
  const [filtroValorMin, setFiltroValorMin] = useState('');
  const [filtroValorMax, setFiltroValorMax] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [implantacaoAtiva, setImplantacaoAtiva] = useState(null);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [showPadrinhos, setShowPadrinhos] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: implantacoes = [], isLoading } = useQuery({
    queryKey: ['implantacoes'],
    queryFn: () => base44.entities.Implantacao.list('-data_entrada', 500),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: meusProdutosPadrinho = [] } = useQuery({
    queryKey: ['meus-produtos-padrinho', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const ps = await base44.entities.PadrinhoProduto.filter({ user_email: user.email, ativo: true });
      return ps.map(p => p.produto);
    },
    enabled: !!user?.email,
  });

  const { data: meuPadrinhoNome } = useQuery({
    queryKey: ['meu-padrinho-nome', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const ps = await base44.entities.PadrinhoProduto.filter({ user_email: user.email, ativo: true });
      return ps.length > 0 ? ps[0].user_nome : null;
    },
    enabled: !!user?.email,
  });

  // Vendedor vinculado ao usuário logado (para que gerentes acompanhem suas próprias vendas)
  const { data: meuVendedor } = useQuery({
    queryKey: ['meu-vendedor-implantacoes', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const vs = await base44.entities.Vendedor.filter({ email: user.email });
      return vs[0] || null;
    },
    enabled: !!user?.email,
  });

  // Visibilidade (não-admin): padrinho vê seus produtos (todos os vendedores);
  // gerente/vendedor vê suas próprias vendas (todos os padrinhos). União dos dois.
  const visiveis = isAdmin ? implantacoes : implantacoes.filter(imp => {
    // Padrinho padrão vem do cadastro por produto (PadrinhoProduto). Exceção pontual:
    // implantação pode ter padrinho próprio (padrinho_email) — nesse caso, ela é visível
    // para quem está gravado na implantação, não para o padrinho padrão do produto.
    const excecaoPontual = imp.padrinho_email && imp.padrinho_email === user?.email;
    const souPadrinhoDeste = excecaoPontual || (
      meusProdutosPadrinho.includes(imp.produto) &&
      (!imp.padrinho_email || !imp.padrinho_nome || imp.padrinho_nome.toLowerCase() === (meuPadrinhoNome || '').toLowerCase())
    );
    const souVendedorDeste =
      (meuVendedor && (imp.vendedor_id === meuVendedor.id || imp.vendedor_nome === meuVendedor.nome)) ||
      (user?.full_name && imp.vendedor_nome === user.full_name);
    return souPadrinhoDeste || souVendedorDeste;
  });

  const produtosDisponiveis = [...new Set(visiveis.map(i => i.produto).filter(Boolean))].sort();
  const vendedoresDisponiveis = [...new Set(visiveis.map(i => i.vendedor_nome).filter(Boolean))].sort();
  const padrinhosDisponiveis = [...new Set(visiveis.map(i => i.padrinho_nome).filter(Boolean))].sort();

  const filtradas = visiveis.filter(imp => {
    const matchBusca = !busca || imp.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) || imp.cpf_cnpj?.includes(busca) || imp.produto?.toLowerCase().includes(busca.toLowerCase());
    const matchProduto = filtroProduto === 'Todos' || imp.produto === filtroProduto;
    const matchVendedor = filtroVendedor === 'Todos' || imp.vendedor_nome === filtroVendedor;
    const matchPadrinho = filtroPadrinho === 'Todos' || imp.padrinho_nome === filtroPadrinho;
    const tipoContrato = imp.tipo_contrato || 'contrato';
    const matchTipoContrato = filtroTipoContrato === 'Todos' || tipoContrato === filtroTipoContrato;
    const valor = Number(imp.valor_contrato) || 0;
    const matchValorMin = filtroValorMin === '' || valor >= Number(filtroValorMin);
    const matchValorMax = filtroValorMax === '' || valor <= Number(filtroValorMax);
    const dataRef = imp.data_entrada || imp.created_date?.split('T')[0] || '';
    const matchDataIni = !filtroDataInicio || dataRef >= filtroDataInicio;
    const matchDataFim = !filtroDataFim || dataRef <= filtroDataFim;
    const matchStatus = filtroStatus === 'Todos' || (
      filtroStatus === 'em_andamento'
        ? ['em_andamento', 'aguardando_documentacao'].includes(imp.status)
        : filtroStatus === 'concluido'
          ? ['concluido', 'concluido_feedback'].includes(imp.status)
          : filtroStatus === 'atrasado'
            ? estaAtrasada(imp)
            : imp.status === filtroStatus
    );
    return matchBusca && matchProduto && matchVendedor && matchPadrinho && matchTipoContrato && matchValorMin && matchValorMax && matchDataIni && matchDataFim && matchStatus;
  });

  const total = filtradas.length;
  const totalConcluidas = filtradas.filter(i => i.status === 'concluido' || i.status === 'concluido_feedback').length;
  const totalAndamento = filtradas.filter(i => i.status === 'em_andamento' || i.status === 'aguardando_documentacao').length;
  const totalAtrasadas = filtradas.filter(estaAtrasada).length;

  const gerarRelatorioPDF = async () => {
    setGerandoPDF(true);
    try {
      const response = await base44.functions.invoke('gerarRelatorioImplantacoesPDF', {
        dataInicio: filtroDataInicio || null,
        dataFim: filtroDataFim || null,
        produtoFiltro: filtroProduto !== 'Todos' ? filtroProduto : null,
        statusFiltro: null,
        padrinhoFiltro: filtroPadrinho !== 'Todos' ? filtroPadrinho : null,
        tipoContratoFiltro: filtroTipoContrato !== 'Todos' ? filtroTipoContrato : null,
        valorMin: filtroValorMin !== '' ? Number(filtroValorMin) : null,
        valorMax: filtroValorMax !== '' ? Number(filtroValorMax) : null,
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-implantacoes-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório gerado!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao gerar relatório');
    }
    setGerandoPDF(false);
  };

  const handleUpdate = (updated) => {
    setImplantacaoAtiva(updated);
    queryClient.invalidateQueries(['implantacoes']);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: AURORA.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: AURORA.accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: AURORA.bg }}>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: AURORA.accentDim }}>
            <Rocket className="w-6 h-6" style={{ color: AURORA.accent }} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: AURORA.accent }}>Operacional</p>
            <h1 className="text-2xl font-bold" style={{ color: AURORA.text }}>Implantações</h1>
            <p className="text-sm mt-0.5" style={{ color: AURORA.textMuted }}>Acompanhe o status de implantação de produtos e contratos vendidos</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowPadrinhos(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition flex-shrink-0"
              style={{ background: 'rgba(168,85,247,0.12)', color: '#a78bfa', border: '1px solid rgba(168,85,247,0.3)' }}>
              <Crown className="w-3.5 h-3.5" />
              Padrinhos
            </button>
          )}
          {isAdmin && (
            <button onClick={gerarRelatorioPDF} disabled={gerandoPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition flex-shrink-0"
              style={{ background: AURORA.accentDim, color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
              {gerandoPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Relatório PDF
            </button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total de Processos', value: total, icon: Rocket, color: AURORA.accent, statusKey: 'Todos' },
            { label: 'Em Andamento', value: totalAndamento, icon: Clock, color: '#fbbf24', statusKey: 'em_andamento' },
            { label: 'Concluídos', value: totalConcluidas, icon: CheckCircle2, color: '#22c55e', statusKey: 'concluido' },
            { label: 'Atrasados', value: totalAtrasadas, icon: AlertTriangle, color: '#f87171', statusKey: 'atrasado' },
          ].map(kpi => {
            const ativo = filtroStatus === kpi.statusKey;
            return (
              <button key={kpi.label} onClick={() => setFiltroStatus(ativo ? 'Todos' : kpi.statusKey)}
                className="rounded-2xl p-4 text-left transition"
                style={{
                  background: ativo ? `${kpi.color}18` : AURORA.surface,
                  border: `1px solid ${ativo ? kpi.color : AURORA.border}`,
                  boxShadow: ativo ? `0 0 20px ${kpi.color}33` : 'none',
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                  <p className="text-xs" style={{ color: AURORA.textMuted }}>{kpi.label}</p>
                </div>
                <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              </button>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="rounded-2xl p-4 flex flex-wrap gap-3 items-center" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: AURORA.textMuted }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por cliente, produto ou CPF/CNPJ..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
          </div>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl focus:outline-none font-medium" style={{ background: filtroStatus !== 'Todos' ? AURORA.accentDim : AURORA.surface2, border: `1px solid ${filtroStatus !== 'Todos' ? AURORA.accent : AURORA.border}`, color: filtroStatus !== 'Todos' ? AURORA.accent : AURORA.text }}>
            {STATUS_FILTROS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
            <option value="Todos">Todos os produtos</option>
            {produtosDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
            <option value="Todos">Todos os gerentes</option>
            {vendedoresDisponiveis.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filtroPadrinho} onChange={e => setFiltroPadrinho(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
            <option value="Todos">Todos os padrinhos</option>
            {padrinhosDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filtroTipoContrato} onChange={e => setFiltroTipoContrato(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
            <option value="Todos">Todos os tipos de contrato</option>
            {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium" style={{ color: AURORA.textMuted }}>Valor:</span>
            <input type="number" min="0" step="0.01" value={filtroValorMin} onChange={e => setFiltroValorMin(e.target.value)}
              placeholder="mín." className="w-24 px-2 py-1.5 text-xs rounded-lg focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            <span className="text-xs" style={{ color: AURORA.textMuted }}>até</span>
            <input type="number" min="0" step="0.01" value={filtroValorMax} onChange={e => setFiltroValorMax(e.target.value)}
              placeholder="máx." className="w-24 px-2 py-1.5 text-xs rounded-lg focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            {(filtroValorMin !== '' || filtroValorMax !== '') && (
              <button onClick={() => { setFiltroValorMin(''); setFiltroValorMax(''); }}
                className="text-xs font-semibold px-1.5 py-1 rounded-lg transition" style={{ color: '#f87171' }}>✕</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: AURORA.textMuted }}>Período:</span>
            <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            <span className="text-xs" style={{ color: AURORA.textMuted }}>até</span>
            <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            {(filtroDataInicio || filtroDataFim) && (
              <button onClick={() => { setFiltroDataInicio(''); setFiltroDataFim(''); }}
                className="text-xs font-semibold px-1.5 py-1 rounded-lg transition" style={{ color: '#f87171' }}>✕</button>
            )}
          </div>
          <button onClick={() => queryClient.invalidateQueries(['implantacoes'])}
            className="ml-auto p-2 rounded-xl transition" style={{ background: AURORA.surface2, color: AURORA.textMuted }} title="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Kanban */}
        {filtradas.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <Rocket className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(230,237,243,0.2)' }} />
            <p className="text-sm" style={{ color: AURORA.textMuted }}>Nenhuma implantação encontrada</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(230,237,243,0.35)' }}>Os processos são criados automaticamente ao formalizar vendas</p>
          </div>
        ) : (
          <KanbanImplantacoes
            implantacoes={filtradas}
            onSelectImplantacao={setImplantacaoAtiva}
            isAdmin={isAdmin}
            onRefresh={() => queryClient.invalidateQueries(['implantacoes'])}
          />
        )}
      </div>

      {implantacaoAtiva && (() => {
        const souPadrinho = (implantacaoAtiva.padrinho_email && implantacaoAtiva.padrinho_email === user?.email) || (
          meusProdutosPadrinho.includes(implantacaoAtiva.produto) &&
          (!implantacaoAtiva.padrinho_email || !implantacaoAtiva.padrinho_nome || implantacaoAtiva.padrinho_nome.toLowerCase() === (meuPadrinhoNome || '').toLowerCase())
        );
        const souVendedor =
          (meuVendedor && (implantacaoAtiva.vendedor_id === meuVendedor.id || implantacaoAtiva.vendedor_nome === meuVendedor.nome)) ||
          (user?.full_name && implantacaoAtiva.vendedor_nome === user.full_name);
        const canEdit = isAdmin || souPadrinho || souVendedor;
        return (
          <ImplantacaoModal
            implantacao={implantacaoAtiva}
            isAdmin={isAdmin}
            canEdit={canEdit}
            user={user}
            onClose={() => setImplantacaoAtiva(null)}
            onUpdate={handleUpdate}
          />
        );
      })()}

      {showPadrinhos && <PadrinhosModal onClose={() => setShowPadrinhos(false)} />}
    </div>
  );
}