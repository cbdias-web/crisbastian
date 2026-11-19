import { useState } from 'react';
import { WandSparkles, Loader2, MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';

const A = {
  surface: '#161b22', surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)', borderActive: 'rgba(0,212,170,0.35)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', muted: 'rgba(230,237,243,0.55)',
};
const inputStyle = { background: A.surface2, border: `1px solid ${A.border}`, color: A.text };
const label = { color: A.muted, fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' };

/**
 * Campo de ajustes da análise gerada: o consultor escreve informações novas e
 * sugestões, e a IA gera uma NOVA versão da proposta considerando o texto.
 * A versão atual permanece preservada no histórico.
 */
export default function SugestoesAjuste({ versao, onGerar, rodando }) {
  const [texto, setTexto] = useState('');
  const [gerando, setGerando] = useState(false);
  const ocupado = gerando || rodando;

  const gerar = async () => {
    if (ocupado) return;
    if (!texto.trim()) return toast.error('Escreva as informações e os ajustes que a nova versão deve considerar.');
    setGerando(true);
    const ok = await onGerar(texto.trim());
    setGerando(false);
    if (ok) setTexto('');
  };

  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: A.surface, border: `1px solid ${A.borderActive}` }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: A.accent }}>
            <MessageSquarePlus className="w-4 h-4" /> Informações e ajustes sugeridos
          </h3>
          <p className="text-[11px] mt-1" style={{ color: A.muted }}>
            Escreva o que deve ser incluído ou corrigido na análise gerada. A IA gera uma nova versão
            (v{(versao || 0) + 1}) considerando suas observações; a v{versao} continua no histórico.
          </p>
        </div>
      </div>
      <div>
        <p className="mb-1.5" style={label}>O que a nova versão deve considerar?</p>
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={4} disabled={ocupado}
          placeholder="Ex.: considerar a renda de aluguéis de R$ 18.000/mês informada depois; excluir a Fase de governança; reduzir a faixa de honorários da Fase 2 em 15% e incluir a opção de parcelamento em 3x."
          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-y leading-relaxed disabled:opacity-60" style={inputStyle} />
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px]" style={{ color: A.muted }}>Seja específico: valores, prazos, etapas e o que deve sair da proposta.</p>
        <button onClick={gerar} disabled={ocupado}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-60" style={{ background: A.accent, color: '#0d1117' }}>
          {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <WandSparkles className="w-3.5 h-3.5" />}
          {ocupado ? 'Gerando nova versão…' : 'Gerar nova versão com os ajustes'}
        </button>
      </div>
    </div>
  );
}