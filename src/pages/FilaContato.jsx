import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getImpersonatedVendedor } from '@/lib/impersonation';
import { Loader2, RefreshCw, Zap, Lock, Phone, Users, Search, Calendar, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import FilaContatoKanban from '@/components/fila/FilaContatoKanban';
import CapaContatoPopup from '@/components/fila/CapaContatoPopup';
import GerenteMultiSelect from '@/components/leads/GerenteMultiSelect';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const hoje = () => {
  const brasilia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return `${brasilia.getFullYear()}-${String(brasilia.getMonth() + 1).padStart(2, '0')}-${String(brasilia.getDate()).padStart(2, '0')}`;
};

export default function FilaContato() {
  const [user, setUser] = useState(null);
  const [vendedor, setVendedor] = useState(null);
  const [popup, setPopup] = useState(null);
  const [montando, setMontando] = useState(false);
  const [busca, setBusca] = useState('');
  const [dataFiltro, setDataFiltro] = useState(hoje());
  const [dataInicio, setDataInicio] = useState(hoje());
  const [modo, setModo] = useState('fila'); // 'fila' (data_fila) | 'agendados' (proximo_contato)
  const [gerentesSel, setGerentesSel] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const isAdm = u.role === 'admin' || u.permissao_admin === true;
      const impersonado = isAdm ? getImpersonatedVendedor() : null;
      if (impersonado) setVendedor(impersonado);
      else {
        const vends = await base44.entities.Vendedor.filter({ email: u.email });
        if (vends.length) setVendedor(vends[0]);
      }
    }).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;
  // O menu "Fila de Contatos" é alwaysVisible no Layout (visível a todos os
  // gerentes), então a página libera qualquer usuário autenticado.
  const temPermissao = !!user;

  const { data: fila = [], isLoading, refetch } = useQuery({
    queryKey: ['fila-contato', user?.id, vendedor?.id, isAdmin, dataInicio, dataFiltro, modo],
    queryFn: async () => {
      if (!user) return [];
      const vid = vendedor?.id;
      const isAdminAll = isAdmin && !getImpersonatedVendedor() && !vendedor;
      const filtrarVendedor = (lista) => isAdminAll ? lista : lista.filter(f => f.vendedor_id === vid);

      if (modo === 'agendados') {
        // Modo agendados: pendentes reagendados para o período (proximo_contato)
        const todos = await base44.entities.FilaContato.filter({ status: 'pendente' }, 'prioridade', 500);
        return filtrarVendedor(todos.filter(f => (f.proximo_contato || '') >= dataInicio && (f.proximo_contato || '') <= dataFiltro));
      }

      // Modo fila:
      // - Indicações: TODOS os pendentes de indicação, independente do dia
      //   (a esteira acumula até o lead ser tratado).
      // - Agenda do Dia (carteira): pendentes com data_fila <= data selecionada,
      //   carregando os dias anteriores não resolvidos (carry-over) + os novos
      //   promovidos diariamente pela automação distribuirContatosDiarios.
      // - Tratados (atendeu/qualificado/convertido/descartado/nao_atendeu):
      //   persistem na esteira independente da data.
      const [indicacoes, carteira, tratados] = await Promise.all([
        base44.entities.FilaContato.filter({ status: 'pendente', tipo_origem: 'indicacao' }, 'prioridade', 500),
        base44.entities.FilaContato.filter({ status: 'pendente', tipo_origem: 'carteira' }, 'prioridade', 500),
        base44.entities.FilaContato.filter({ status: 'atendeu' }, '-updated_date', 300),
      ]);
      const outrosStatus = ['qualificado', 'convertido', 'descartado', 'nao_atendeu'];
      const outros = [];
      for (const s of outrosStatus) {
        const items = await base44.entities.FilaContato.filter({ status: s }, '-updated_date', 300);
        outros.push(...items);
      }
      const carteiraCarry = carteira.filter(c => (c.data_fila || '') <= dataFiltro);
      // Tratados: dentro do período selecionado (pela última atualização — o
      // momento em que o lead foi movido na esteira)
      const iniTrat = dataInicio + 'T00:00:00';
      const fimTrat = dataFiltro + 'T23:59:59';
      const todosTratados = [...tratados, ...outros].filter(t => {
        const u = t.updated_date || t.created_date || '';
        return u >= iniTrat && u <= fimTrat;
      });
      const combinados = [...indicacoes, ...carteiraCarry, ...todosTratados];
      // Dedup por (tipo_origem, ref_id, vendedor_id) mantendo o mais recente:
      // montarFilaContatoDia cria um novo item pendente por dia para leads ainda
      // pendentes, então sem dedup o mesmo lead apareceria várias vezes ao exibir
      // todos os dias. A guarda de oxigenação impede recriar pendente de lead já
      // trabalhado, mas o acúmulo diário de leads ainda pendentes precisa do dedup.
      combinados.sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());
      const vistos = new Set();
      const deduped = [];
      for (const f of combinados) {
        const ref = f.ref_id || '';
        const k = ref ? `${f.tipo_origem}|${ref}|${f.vendedor_id || ''}` : `id|${f.id}`;
        if (vistos.has(k)) continue;
        vistos.add(k);
        deduped.push(f);
      }
      // Dedup por PESSOA (mesmo gerente + mesmo nome): evita que o mesmo lead
      // apareça ramificado em duas esteiras (ex.: indicação + carteira).
      const porPessoa = new Set();
      const semRamificados = [];
      for (const f of deduped) {
        const nm = (f.nome || '').toLowerCase().trim().replace(/\s+/g, ' ');
        const k = `${nm}|${f.vendedor_id || ''}`;
        if (nm && porPessoa.has(k)) continue;
        if (nm) porPessoa.add(k);
        semRamificados.push(f);
      }
      return filtrarVendedor(semRamificados);
    },
    enabled: !!user && (isAdmin || !!vendedor),
    refetchInterval: 30000,
  });

  // Sincronização automática ao abrir a página: repara qualquer indicação que
  // tenha ficado fora da esteira por falha transitória na inclusão imediata
  // (redeploy/congestionamento). Roda uma única vez por acesso à página.
  const sincronizadoRef = useRef(false);
  useEffect(() => {
    if (!user || sincronizadoRef.current) return;
    if (!isAdmin && !vendedor) return;
    sincronizadoRef.current = true;
    (async () => {
      try {
        const payload = (isAdmin && !getImpersonatedVendedor() && !vendedor) ? {} : { vendedor_id: vendedor.id };
        const res = await base44.functions.invoke('montarFilaContatoDia', payload);
        const data = res?.data || res;
        if (data?.itens_criados > 0) queryClient.invalidateQueries({ queryKey: ['fila-contato'] });
      } catch (e) {}
    })();
  }, [user, vendedor, isAdmin]);

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-ativos-fila'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
  });

  // Filtro local por nome/telefone e gerentes selecionados (aplicado sobre o resultado da query)
  const filaFiltrada = fila
    .filter(f => !gerentesSel.length || gerentesSel.includes(f.vendedor_id))
    .filter(f => !busca.trim() || (f.nome || '').toLowerCase().includes(busca.trim().toLowerCase()) || (f.telefone || '').includes(busca.trim()));

  const montarFila = async () => {
    setMontando(true);
    try {
      const payload = (isAdmin && !getImpersonatedVendedor() && !vendedor) ? {} : { vendedor_id: vendedor.id };
      const res = await base44.functions.invoke('montarFilaContatoDia', payload);
      const data = res?.data || res;
      toast.success(`Fila montada: ${data.itens_criados} item(ns) criados para ${data.vendedores_processados} gerente(s).`);
      queryClient.invalidateQueries({ queryKey: ['fila-contato'] });
    } catch (e) {
      toast.error('Erro ao montar fila: ' + (e?.response?.data?.error || e.message));
    }
    setMontando(false);
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: AURORA.bg }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: AURORA.accent }} />
    </div>
  );

  if (!temPermissao) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: AURORA.bg }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Lock className="w-8 h-8" style={{ color: '#f87171' }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: AURORA.text }}>Acesso Restrito</h2>
          <p className="text-sm" style={{ color: AURORA.textMuted }}>Solicite liberação ao administrador.</p>
        </div>
      </div>
    );
  }

  const pendentes = fila.filter(f => f.status === 'pendente');
  const totalIndicacao = pendentes.filter(f => f.tipo_origem === 'indicacao').length;
  const totalCarteira = pendentes.filter(f => f.tipo_origem === 'carteira').length;
  const totalConcluidos = fila.filter(f => f.status !== 'pendente').length;

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: AURORA.bg, color: AURORA.text }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.15)' }}>
                <Zap className="w-4 h-4" style={{ color: AURORA.accent }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: AURORA.text }}>Fila de Contatos</h1>
            </div>
            <p className="text-sm" style={{ color: AURORA.textMuted }}>
              {isAdmin && !getImpersonatedVendedor() ? 'Visão geral · Admin' : vendedor?.nome || '—'} · {dataInicio !== dataFiltro
                ? `${dataInicio.split('-').reverse().join('/')} a ${dataFiltro.split('-').reverse().join('/')}`
                : dataFiltro.split('-').reverse().join('/')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={montarFila} disabled={montando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition disabled:opacity-40"
              style={{ background: AURORA.accent, color: '#0d1117' }}>
              {montando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Montar Fila do Dia
            </button>
            <button onClick={() => refetch()} className="p-2 rounded-xl transition" style={{ background: AURORA.surface2, color: AURORA.textMuted }}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de filtros */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* Modo */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${AURORA.border}` }}>
            <button onClick={() => setModo('fila')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition"
              style={{ background: modo === 'fila' ? 'rgba(0,212,170,0.18)' : AURORA.surface, color: modo === 'fila' ? AURORA.accent : AURORA.textMuted }}>
              <Calendar className="w-3.5 h-3.5" /> Fila do dia
            </button>
            <button onClick={() => setModo('agendados')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition"
              style={{ background: modo === 'agendados' ? 'rgba(251,191,36,0.18)' : AURORA.surface, color: modo === 'agendados' ? '#fbbf24' : AURORA.textMuted }}>
              <Clock className="w-3.5 h-3.5" /> Agendados
            </button>
          </div>
          {/* Período */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <Calendar className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />
            <input type="date" value={dataInicio} max={dataFiltro} onChange={e => setDataInicio(e.target.value)}
              className="bg-transparent text-xs focus:outline-none" style={{ color: AURORA.text }} />
            <span className="text-[10px]" style={{ color: AURORA.textMuted }}>até</span>
            <input type="date" value={dataFiltro} min={dataInicio} onChange={e => setDataFiltro(e.target.value)}
              className="bg-transparent text-xs focus:outline-none" style={{ color: AURORA.text }} />
            {(dataInicio !== hoje() || dataFiltro !== hoje()) && (
              <button onClick={() => { setDataInicio(hoje()); setDataFiltro(hoje()); }} className="text-[10px] font-semibold" style={{ color: AURORA.accent }}>Hoje</button>
            )}
          </div>
          {/* Busca */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-1 min-w-[200px]" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: AURORA.textMuted }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone..."
              className="bg-transparent text-xs flex-1 focus:outline-none" style={{ color: AURORA.text }} />
            {busca && <button onClick={() => setBusca('')} className="flex-shrink-0"><X className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} /></button>}
          </div>
          {isAdmin && (
            <div className="min-w-[220px] max-w-[300px]">
              <GerenteMultiSelect vendedores={vendedores} selected={gerentesSel} onChange={setGerentesSel} />
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Indicações na fila', value: totalIndicacao, icon: Zap, color: AURORA.accent },
            { label: 'Carteira pendente', value: totalCarteira, icon: Users, color: '#818cf8' },
            { label: dataInicio === dataFiltro ? 'Concluídos no dia' : 'Concluídos no período', value: totalConcluidos, icon: Phone, color: '#34d399' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
              <div className="flex items-center gap-2 mb-1">
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
                <p className="text-xs" style={{ color: AURORA.textMuted }}>{k.label}</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: AURORA.accent }} /></div>
        ) : filaFiltrada.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            {modo === 'fila' && !busca && dataFiltro === hoje() ? (
              <>
                <Zap className="w-10 h-10 mx-auto mb-3" style={{ color: AURORA.textMuted, opacity: 0.4 }} />
                <p className="font-semibold" style={{ color: AURORA.text }}>Fila vazia para hoje</p>
                <p className="text-sm mt-1 mb-4" style={{ color: AURORA.textMuted }}>Clique em "Montar Fila do Dia" para sincronizar indicações e carteira.</p>
                <button onClick={montarFila} disabled={montando}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-40" style={{ background: AURORA.accent, color: '#0d1117' }}>
                  {montando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Montar agora
                </button>
              </>
            ) : (
              <>
                <Search className="w-10 h-10 mx-auto mb-3" style={{ color: AURORA.textMuted, opacity: 0.4 }} />
                <p className="font-semibold" style={{ color: AURORA.text }}>Nenhum contato encontrado</p>
                <p className="text-sm mt-1" style={{ color: AURORA.textMuted }}>
                  {modo === 'agendados' ? `Sem agendamentos para ${dataFiltro.split('-').reverse().join('/')}` : 'Ajuste a busca ou a data selecionada.'}
                </p>
              </>
            )}
          </div>
        ) : (
          <FilaContatoKanban itens={filaFiltrada} isAdmin={isAdmin} onSelectItem={setPopup} onAtualizado={() => queryClient.invalidateQueries({ queryKey: ['fila-contato'] })} />
        )}
      </div>

      {popup && (
        <CapaContatoPopup
          key={popup.id}
          fila={popup}
          user={user}
          vendedor={vendedor}
          onAtualizado={() => queryClient.invalidateQueries({ queryKey: ['fila-contato'] })}
          onClose={() => setPopup(null)}
          onProximo={(atual) => {
            const proximos = filaFiltrada
              .filter(f => f.status === 'pendente' && f.id !== atual.id)
              .sort((a, b) => (a.prioridade || 1) - (b.prioridade || 1) || (a.posicao || 1) - (b.posicao || 1));
            if (proximos.length) {
              setPopup(proximos[0]);
            } else {
              setPopup(null);
            }
          }}
        />
      )}
    </div>
  );
}