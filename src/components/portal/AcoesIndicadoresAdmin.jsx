import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Link2, UserX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
};

// Ações em massa do admin no Dash Parceiro:
// - Inativar todos os indicadores cadastrados
// - Copiar o link genérico de indicação (compartilhável com vários colaboradores)
export default function AcoesIndicadoresAdmin({ parceiros = [] }) {
  const queryClient = useQueryClient();
  const [inativando, setInativando] = useState(false);

  const ativos = parceiros.filter(p => p.ativo !== false);
  // Sempre o domínio oficial publicado (nunca o endereço de preview) — mais confiança para os indicadores
  const linkGenerico = 'https://villelaexchange.base44.app/indicar';

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkGenerico);
      toast.success('Link genérico copiado! Compartilhe com os colaboradores.');
    } catch {
      window.prompt('Copie o link genérico:', linkGenerico);
    }
  };

  const inativarTodos = async () => {
    if (ativos.length === 0) { toast.info('Todos os indicadores já estão inativos.'); return; }
    if (!confirm(`Inativar ${ativos.length} indicador(es) ativo(s)?\n\nEles deixam de poder enviar indicações pelos links atuais. Quem se cadastrar novamente pelo link genérico será reativado automaticamente.`)) return;
    setInativando(true);
    try {
      await base44.entities.Parceiro.updateMany({ ativo: { $ne: false } }, { $set: { ativo: false } });
      await queryClient.invalidateQueries({ queryKey: ['parceiros-dash-parceiro'] });
      await queryClient.invalidateQueries({ queryKey: ['parceiros-indicacao'] });
      toast.success(`${ativos.length} indicador(es) inativado(s).`);
    } catch (e) {
      toast.error('Erro ao inativar: ' + (e?.message || ''));
    }
    setInativando(false);
  };

  const btn = "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button onClick={copiarLink} className={btn}
        style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
        <Link2 className="w-3.5 h-3.5" /> Copiar link genérico de indicação
      </button>
      <button onClick={inativarTodos} disabled={inativando} className={btn}
        style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
        {inativando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
        Inativar todos os indicadores ({ativos.length})
      </button>
      <span className="text-[11px]" style={{ color: 'rgba(230,237,243,0.55)' }}>{linkGenerico}</span>
    </div>
  );
}