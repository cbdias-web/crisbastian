import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { RefreshCw, Loader2 } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
};

// Botão "Atualizar": faz a leitura completa das indicações, reconciliando a
// jornada de cada lead (status, conversões, conversão em venda, histórico)
// contra as vendas registradas no backend — e então recarrega todos os dados
// do dash: indicações, vendas convertidas, comissões e volume indicado.
export default function AtualizarDashButton({ compact = false }) {
  const queryClient = useQueryClient();
  const [atualizando, setAtualizando] = useState(false);

  const atualizar = async () => {
    if (atualizando) return;
    setAtualizando(true);
    let msg = 'Dash atualizado.';
    try {
      const resp = await base44.functions.invoke('sincronizarJornadaIndicacaoVenda', { reconcile_all: true });
      const r = resp?.data || resp;
      if (r?.indicacoes_atualizadas > 0) {
        msg = `Jornada sincronizada — ${r.indicacoes_atualizadas} indicação(ões) atualizada(s).`;
      }
    } catch (e) {
      msg = 'Dados recarregados (sincronização momentaneamente indisponível).';
    }
    // Recarrega tudo que alimenta o dash: indicações, conversões, comissões, volume
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consolidado'] }),
        queryClient.invalidateQueries({ queryKey: ['lead-indicacoes'] }),
        queryClient.invalidateQueries({ queryKey: ['indicador'] }),
        queryClient.invalidateQueries({ queryKey: ['vendas-status-indicacoes'] }),
        queryClient.invalidateQueries({ queryKey: ['parceiros'] }),
        queryClient.invalidateQueries({ queryKey: ['indicacoes-novas-badge'] }),
      ]);
    } catch (e) {}
    toast.success(msg);
    setAtualizando(false);
  };

  return (
    <button onClick={atualizar} disabled={atualizando}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50 flex-shrink-0"
      style={{ background: AURORA.surface, color: AURORA.accent, border: `1px solid ${AURORA.border}` }}
      title="Reler indicações, conversões, vendas convertidas e comissões">
      {atualizando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
      {!compact && (atualizando ? 'Atualizando...' : 'Atualizar')}
    </button>
  );
}