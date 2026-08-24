import { Package, DollarSign, Save, Loader2 } from 'lucide-react';

const AURORA = {
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  inputBg: '#0d1117',
};

const PRODUTOS = [
  'CONTA GLOBAL', 'CONTA INTERNACIONAL', 'DOLARIZE', 'ROF', 'CANAL BANCÁRIO',
  'OFFSHORE', 'GARANTIAS', 'HORA TÉCNICA', 'RATING',
];

// Bloco de "Negociação em andamento" — onde o gerente informa o produto e o
// valor que está sendo negociado com o lead. Para indicações já vem preenchido.
export default function NegociacaoLeadBlock({ produto, valor, onProdutoChange, onValorChange, onSave, saving, readOnly }) {
  return (
    <div className="w-full rounded-2xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
      <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: AURORA.accent, opacity: 0.7 }}>Negociação em andamento</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
        <div>
          <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: AURORA.textMuted }}>Produto</label>
          <div className="relative">
            <Package className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: AURORA.textMuted }} />
            <select
              value={produto}
              onChange={(e) => onProdutoChange(e.target.value)}
              disabled={readOnly}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm appearance-none"
              style={{ background: AURORA.inputBg, color: AURORA.text, border: `1px solid ${AURORA.border}` }}
            >
              <option value="">Selecione…</option>
              {PRODUTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: AURORA.textMuted }}>Valor (R$)</label>
          <div className="relative">
            <DollarSign className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: AURORA.textMuted }} />
            <input
              type="number"
              value={valor}
              onChange={(e) => onValorChange(e.target.value)}
              disabled={readOnly}
              placeholder="0,00"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
              style={{ background: AURORA.inputBg, color: AURORA.text, border: `1px solid ${AURORA.border}` }}
            />
          </div>
        </div>
      </div>
      {!readOnly && (
        <button
          onClick={onSave}
          disabled={saving}
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition hover:brightness-110 disabled:opacity-50"
          style={{ background: AURORA.accent, color: '#0d1117' }}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar negociação
        </button>
      )}
    </div>
  );
}