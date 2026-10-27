import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { KeyRound, Plus, Copy, X, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { gerarCodigoLiberacao } from '@/lib/codigoLiberacao';

const A = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  muted: 'rgba(230,237,243,0.55)',
  green: '#34d399',
};

export default function GerenciarCodigosModal({ user, onClose }) {
  const queryClient = useQueryClient();
  const [observacao, setObservacao] = useState('');
  const [gerando, setGerando] = useState(false);

  const { data: codigos = [], isLoading } = useQuery({
    queryKey: ['codigos-liberacao-venda'],
    queryFn: () => base44.entities.CodigoLiberacaoVenda.list('-created_date', 200),
  });

  const gerar = async () => {
    setGerando(true);
    try {
      const codigo = gerarCodigoLiberacao();
      await base44.entities.CodigoLiberacaoVenda.create({
        codigo,
        ativo: true,
        usado: false,
        criado_por: user?.email || '',
        observacao: observacao.trim(),
      });
      navigator.clipboard.writeText(codigo).catch(() => {});
      toast.success(`Código ${codigo} gerado e copiado — válido para uma venda manual.`);
      setObservacao('');
      queryClient.invalidateQueries(['codigos-liberacao-venda']);
    } catch (e) {
      toast.error('Erro ao gerar o código: ' + e.message);
    }
    setGerando(false);
  };

  const copiar = (codigo) => {
    navigator.clipboard.writeText(codigo);
    toast.success('Código copiado!');
  };

  const disponiveis = codigos.filter(c => c.ativo !== false && !c.usado).length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden max-h-[85vh] flex flex-col" style={{ background: A.surface, border: `1px solid ${A.border}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: A.surface2, borderBottom: `1px solid ${A.border}` }}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" style={{ color: A.accent }} />
            <div>
              <p className="font-bold text-sm" style={{ color: A.text }}>Códigos de liberação de venda manual</p>
              <p className="text-[10px]" style={{ color: A.muted }}>{disponiveis} código(s) disponível(is) — cada um libera um único lançamento</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: A.muted }}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-3" style={{ borderBottom: `1px solid ${A.border}` }}>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Observação (cliente, motivo da liberação...)"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ background: A.surface2, border: `1px solid ${A.border}`, color: A.text }}
            />
            <button onClick={gerar} disabled={gerando}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
              style={{ background: A.accent, color: '#0d1117' }}>
              {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Gerar código
            </button>
          </div>
          <p className="text-[10px]" style={{ color: A.muted }}>
            Envie o código ao responsável pela venda. Ele será consumido no momento em que a venda for salva.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {isLoading ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: A.muted }} /></div>
          ) : codigos.length === 0 ? (
            <p className="py-8 text-center text-xs" style={{ color: A.muted }}>Nenhum código gerado ainda</p>
          ) : codigos.map(c => {
            const disponivel = c.ativo !== false && !c.usado;
            return (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: A.surface2, border: `1px solid ${disponivel ? 'rgba(0,212,170,0.25)' : 'rgba(230,237,243,0.1)'}` }}>
                <span className="font-mono text-sm font-bold tracking-wider flex-shrink-0"
                  style={{ color: disponivel ? A.accent : 'rgba(230,237,243,0.35)' }}>{c.codigo}</span>
                <div className="min-w-0 flex-1">
                  {disponivel ? (
                    <p className="text-[10px] flex items-center gap-1" style={{ color: A.green }}>
                      <CheckCircle2 className="w-2.5 h-2.5" /> Disponível
                    </p>
                  ) : (
                    <p className="text-[10px] flex items-center gap-1" style={{ color: A.muted }}>
                      <Clock className="w-2.5 h-2.5" /> Usado por {c.usado_por_nome || c.usado_por || '—'}
                    </p>
                  )}
                  {c.observacao && <p className="text-[10px] truncate" style={{ color: A.muted }}>{c.observacao}</p>}
                </div>
                {disponivel && (
                  <button onClick={() => copiar(c.codigo)} className="p-1.5 rounded-lg flex-shrink-0"
                    style={{ color: A.accent, background: 'rgba(0,212,170,0.1)' }} title="Copiar código">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}