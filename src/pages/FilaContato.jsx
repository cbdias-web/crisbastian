import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getImpersonatedVendedor } from '@/lib/impersonation';
import { Loader2, RefreshCw, Zap, Lock, Phone, Users, Search, Calendar, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import FilaContatoKanban from '@/components/fila/FilaContatoKanban';
import CapaContatoPopup from '@/components/fila/CapaContatoPopup';

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
  const [modo, setModo] = useState('fila'); // 'fila' (data_fila) | 'agendados' (proximo_contato)
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
  const temPermissao = isAdmin || (user?.menus_acesso || []).includes('FilaContato') || (user?.menus_acesso || []).includes('CentralLeads');

  const { data: fila = [], isLoading, refetch } = useQuery({
    queryKey: ['fila-contato', user?.id, vendedor?.id, isAdmin, dataFiltro, modo],
    queryFn: async () => {
      if (!user) return [];
      const filtro = modo === 'agendados'
        ? { proximo_contato: dataFiltro, status: 'pendente' }
        : { data_fila: dataFiltro };
      if (isAdmin && !getImpersonatedVendedor() && !vendedor) {
        return base44.entities.FilaContato.filter(filtro, 'prioridade');
      }
      const vid = vendedor?.id;
      if (!vid) return [];
      const todos = await base44.entities.FilaContato.filter(filtro, 'prioridade');
      return todos.filter(f => f.vendedor_id === vid);
    },
    enabled: !!user && (isAdmin || !!vendedor),
    refetchInterval: 30000,
  });

  // Filtro local por nome/telefone (aplicado sobre o resultado da query)
  const filaFiltrada = busca.trim()
    ? fila.filter(f => (f.nome || '').toLowerCase().includes(busca.trim().toLowerCase()) || (f.telefone || '').includes(busca.trim()))
    : fila;

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
              {isAdmin && !getImpersonatedVendedor() ? 'Visão geral · Admin' : vendedor?.nome || '—'} · {dataFiltro.split('-').reverse().join('/')}
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
          {/* Data */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <Calendar className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />
            <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)}
              className="bg-transparent text-xs focus:outline-none" style={{ color: AURORA.text }} />
            {dataFiltro !== hoje() && (
              <button onClick={() => setDataFiltro(hoje())} className="text-[10px] font-semibold" style={{ color: AURORA.accent }}>Hoje</button>
            )}
          </div>
          {/* Busca */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-1 min-w-[200px]" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: AURORA.textMuted }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone..."
              className="bg-transparent text-xs flex-1 focus:outline-none" style={{ color: AURORA.text }} />
            {busca && <button onClick={() => setBusca('')} className="flex-shrink-0"><X className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} /></button>}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Indicações na fila', value: totalIndicacao, icon: Zap, color: AURORA.accent },
            { label: 'Carteira do dia', value: totalCarteira, icon: Users, color: '#818cf8' },
            { label: 'Concluídos hoje', value: totalConcluidos, icon: Phone, color: '#34d399' },
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
          <FilaContatoKanban itens={filaFiltrada} onSelectItem={setPopup} />
        )}
      </div>

      {popup && (
        <CapaContatoPopup
          fila={popup}
          user={user}
          vendedor={vendedor}
          onAtualizado={() => queryClient.invalidateQueries({ queryKey: ['fila-contato'] })}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}