/**
 * Widget de taxa de câmbio — exibe a cotação atual com opção de usar a taxa de mercado (+0,15)
 */
import { useState } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fmtNum } from './usePrecificacaoConfig';

export default function CambioWidget({ value, onChange }) {
  const [loading, setLoading] = useState(false);
  const [modoMercado, setModoMercado] = useState(false);

  async function usarCotacaoMercado() {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('buscarDadosMercado', {});
      const dolar = res.data?.quotes?.find(q => q.key === 'dolar');
      if (dolar?.price) {
        const novoValor = parseFloat((dolar.price + 0.15).toFixed(4));
        onChange(novoValor);
        setModoMercado(true);
      }
    } catch (e) {
      console.error('Erro ao buscar cotação:', e);
    }
    setLoading(false);
  }

  function handleManual(v) {
    setModoMercado(false);
    onChange(v);
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium whitespace-nowrap">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        USD / BRL
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400">R$</span>
        <input
          type="number"
          value={value}
          onChange={e => handleManual(parseFloat(e.target.value) || 0)}
          step={0.01}
          className="w-20 text-sm font-bold text-gray-900 border-0 bg-transparent focus:outline-none text-center"
        />
      </div>
      {modoMercado && (
        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
          Mercado +0,15
        </span>
      )}
      <button
        onClick={usarCotacaoMercado}
        disabled={loading}
        title="Usar cotação real do mercado + R$ 0,15"
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition disabled:opacity-50 whitespace-nowrap border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg px-2 py-1"
      >
        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Buscando...' : 'Cotação real'}
      </button>
    </div>
  );
}