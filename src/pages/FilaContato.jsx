import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getImpersonatedVendedor } from '@/lib/impersonation';
import { Loader2, RefreshCw, Zap, Lock, Phone, Users } from 'lucide-react';
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
    queryKey: ['fila-contato', user?.id, vendedor?.id, isAdmin],
    queryFn: async () => {
      if (!user) return [];
      const hojeStr = hoje();
      if (isAdmin && !getImpersonatedVendedor() && !vendedor) {
        return base44.entities.FilaContato.filter({ data_fila: hojeStr }, 'prioridade');
      }
      const vid = vendedor?.id;
      if (!vid) return [];
      const todos = await base44.entities.FilaContato.filter({ data_fila: hojeStr }, 'prioridade');
      return todos.filter(f => f.vendedor_id === vid);
    },
    enabled: !!user && (isAdmin || !!vendedor),
    refetchInterval: 30000,
  });

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
              {isAdmin && !getImpersonatedVendedor() ? 'Visão geral · Admin' : vendedor?.nome || '—'} · {hoje().split('-').reverse().join('/')}
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
        ) : fila.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
            <Zap className="w-10 h-10 mx-auto mb-3" style={{ color: AURORA.textMuted, opacity: 0.4 }} />
            <p className="font-semibold" style={{ color: AURORA.text }}>Fila vazia para hoje</p>
            <p className="text-sm mt-1 mb-4" style={{ color: AURORA.textMuted }}>Clique em "Montar Fila do Dia" para sincronizar indicações e carteira.</p>
            <button onClick={montarFila} disabled={montando}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-40" style={{ background: AURORA.accent, color: '#0d1117' }}>
              {montando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Montar agora
            </button>
          </div>
        ) : (
          <FilaContatoKanban itens={fila} onSelectItem={setPopup} />
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