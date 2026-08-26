import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Search, Loader2, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  warning: '#fbbf24',
  danger: '#f87171',
  purple: '#a78bfa',
};

// Editor inline de espelhamentos/indicadores no visualizador do contrato.
// Salva imediatamente no Contrato (update do array `indicadores`) — evita a
// perda de dados que ocorria quando o usuário adicionava indicadores no
// formulário completo e esquecia de salvar.
export default function IndicadoresEditor({ contrato, onUpdate }) {
  const queryClient = useQueryClient();
  const [indicadores, setIndicadores] = useState(contrato.indicadores || []);
  const [salvando, setSalvando] = useState(false);
  const [showBusca, setShowBusca] = useState(false);
  const [novoPct, setNovoPct] = useState(10);
  const [busca, setBusca] = useState('');

  const { data: vendedoresList = [] } = useQuery({
    queryKey: ['vendedores-contrato-viewer'],
    queryFn: () => base44.entities.Vendedor.filter({ ativo: true }, 'nome'),
    staleTime: 5 * 60 * 1000,
  });
  const { data: espelhamentosList = [] } = useQuery({
    queryKey: ['espelhamentos-contrato-viewer'],
    queryFn: async () => {
      const all = await base44.entities.Espelhamento.list('nome', 500);
      return all.filter(e => e.ativo !== false);
    },
    staleTime: 5 * 60 * 1000,
  });

  const disponiveis = [
    ...vendedoresList.map(v => ({ id: v.id, nome: v.nome, tipo: 'vendedor', percentual_comissao: v.percentual_comissao || 10 })),
    ...espelhamentosList.map(e => ({ id: e.id, nome: e.nome, tipo: 'indicador', percentual_comissao: e.percentual_comissao || 10 })),
  ].sort((a, b) => a.nome.localeCompare(b.nome));

  const idsAtuais = new Set(indicadores.map(i => i.id).filter(Boolean));
  const filtrados = disponiveis.filter(p =>
    !idsAtuais.has(p.id) &&
    (busca.length === 0 || p.nome.toLowerCase().includes(busca.toLowerCase()))
  );

  const totalPct = indicadores.reduce((s, i) => s + (parseFloat(i.percentual) || 0), 0);
  const limiteExcedido = totalPct > 50;

  const persistir = async (novos) => {
    setSalvando(true);
    try {
      const atualizado = await base44.entities.Contrato.update(contrato.id, { indicadores: novos });
      setIndicadores(novos);
      queryClient.invalidateQueries(['contratos']);
      onUpdate({ ...contrato, indicadores: novos });
      toast.success('Espelhamentos atualizados!');
    } catch (err) {
      toast.error('Erro ao salvar espelhamentos: ' + err.message);
    }
    setSalvando(false);
  };

  const adicionar = (pessoa) => {
    const pct = novoPct || pessoa.percentual_comissao || 10;
    const novos = [...indicadores, { id: pessoa.id, nome: pessoa.nome, percentual: pct, tipo: pessoa.tipo }];
    setShowBusca(false);
    setBusca('');
    setNovoPct(10);
    persistir(novos);
  };

  const remover = (idx) => {
    const novos = indicadores.filter((_, i) => i !== idx);
    persistir(novos);
  };

  const alterarPct = (idx, valor) => {
    const novos = indicadores.map((ind, i) => i === idx ? { ...ind, percentual: parseFloat(valor) || 0 } : ind);
    setIndicadores(novos);
  };

  const salvarPct = (idx) => {
    persistir(indicadores);
  };

  return (
    <div className="space-y-2">
      {indicadores.length === 0 ? (
        <div className="px-4 py-2.5 rounded-xl" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
          <p className="text-xs italic" style={{ color: AURORA.textMuted }}>Nenhum indicador/espelhamento cadastrado</p>
        </div>
      ) : (
        indicadores.map((ind, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl px-4 py-2.5 gap-2" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: AURORA.text }}>{ind.nome}</p>
              <p className="text-[10px] capitalize" style={{ color: AURORA.textMuted }}>{ind.tipo || 'indicador'}</p>
            </div>
            <div className="flex items-center gap-1">
              <input type="number" step="0.1" min="0" max="50" value={ind.percentual}
                onChange={e => alterarPct(i, e.target.value)}
                onBlur={() => salvarPct(i)}
                className="w-14 px-2 py-1 text-xs text-center font-semibold rounded-lg"
                style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
              <span className="text-xs" style={{ color: AURORA.warning }}>%</span>
            </div>
            <button onClick={() => remover(i)} disabled={salvando}
              className="p-1.5 rounded-lg transition hover:bg-red-500/10"
              style={{ color: AURORA.danger }} title="Remover espelhamento">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))
      )}

      {limiteExcedido && (
        <p className="text-[10px] font-semibold" style={{ color: AURORA.danger }}>
          Total: {totalPct.toFixed(1)}% — o limite é 50%
        </p>
      )}

      {/* Adicionar novo espelhamento */}
      {showBusca ? (
        <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar indicador ou vendedor..."
                autoFocus
                className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg"
                style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}`, color: AURORA.text }}
              />
            </div>
            <div className="flex items-center gap-1">
              <input type="number" step="0.1" min="0" max="50" value={novoPct}
                onChange={e => setNovoPct(parseFloat(e.target.value) || 10)}
                className="w-14 px-2 py-1.5 text-xs text-center font-semibold rounded-lg"
                style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
              <span className="text-xs" style={{ color: AURORA.warning }}>%</span>
            </div>
            <button onClick={() => { setShowBusca(false); setBusca(''); }}
              className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto rounded-lg" style={{ background: AURORA.surface }}>
            {filtrados.length === 0 ? (
              <p className="px-3 py-2 text-xs" style={{ color: AURORA.textMuted }}>
                {busca.length >= 2 ? `Nenhum resultado para "${busca}"` : 'Digite para buscar...'}
              </p>
            ) : filtrados.map(p => (
              <button key={p.id} type="button" onClick={() => adicionar(p)}
                className="w-full text-left px-3 py-2 transition flex items-center gap-2 border-b"
                style={{ borderColor: AURORA.border, color: AURORA.text }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={p.tipo === 'vendedor'
                    ? { background: 'rgba(59,130,249,0.15)', color: '#60a5fa' }
                    : { background: 'rgba(245,158,11,0.15)', color: AURORA.warning }}>
                  {p.tipo === 'vendedor' ? 'Vend.' : 'Ind.'}
                </span>
                <span className="text-xs font-medium flex-1 truncate">{p.nome}</span>
                <span className="text-[10px]" style={{ color: AURORA.textMuted }}>{p.percentual_comissao}%</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowBusca(true)}
          disabled={salvando}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition"
          style={{ background: 'rgba(0,212,170,0.12)', border: `1px solid ${AURORA.border}`, color: AURORA.accent }}>
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {salvando ? 'Salvando...' : 'Adicionar espelhamento'}
        </button>
      )}
    </div>
  );
}