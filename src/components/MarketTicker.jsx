import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

function fmt(value, prefix) {
  if (value === undefined || value === null) return '—';
  const abs = Math.abs(value);
  let str;
  if (abs >= 1000) {
    str = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    str = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return `${prefix ? prefix + ' ' : ''}${str}`;
}

function QuoteItem({ item }) {
  const up = item.changePct >= 0;
  return (
    <span className="inline-flex items-center gap-2 px-4 border-r border-white/10 whitespace-nowrap">
      <span className="font-semibold text-white text-xs">{item.label}</span>
      <span className="text-white/90 text-xs">{fmt(item.price, item.prefix)}</span>
      <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {up ? '+' : ''}{item.changePct.toFixed(2)}%
      </span>
    </span>
  );
}

export default function MarketTicker() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await base44.functions.invoke('buscarDadosMercado', {});
      if (res.data?.quotes) {
        setQuotes(res.data.quotes);
        setLastUpdate(new Date());
      }
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60 * 60 * 1000); // atualiza a cada hora
    return () => clearInterval(intervalRef.current);
  }, []);

  if (loading && quotes.length === 0) return null;
  if (quotes.length === 0) return null;

  const doubled = [...quotes, ...quotes]; // duplica para loop contínuo

  return (
    <div style={{ background: 'linear-gradient(90deg, #0a1628 0%, #0f1e35 50%, #0a1628 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', display: 'block' }}>
      <div className="flex items-center">
        {/* Label fixo */}
        <div className="flex-shrink-0 px-3 py-1.5 flex items-center gap-1.5 border-r border-white/10 bg-white/5">
          <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest whitespace-nowrap">Mercado</span>
        </div>

        {/* Ticker scrolling */}
        <div className="flex-1 overflow-hidden relative" style={{ minWidth: 0 }}
          onMouseEnter={e => e.currentTarget.querySelector('.animate-ticker-scroll').style.animationPlayState = 'paused'}
          onMouseLeave={e => e.currentTarget.querySelector('.animate-ticker-scroll').style.animationPlayState = 'running'}
        >
          <div
            className="flex animate-ticker-scroll"
            style={{ width: 'max-content' }}
          >
            {doubled.map((item, i) => (
              <QuoteItem key={`${item.key}-${i}`} item={item} />
            ))}
          </div>
        </div>

        {/* Hora da atualização */}
        {lastUpdate && (
          <div className="flex-shrink-0 px-3 flex items-center gap-1 border-l border-white/10 bg-white/5">
            <RefreshCw className="w-2.5 h-2.5 text-blue-300/60" />
            <span className="text-[9px] text-blue-300/60 whitespace-nowrap">
              {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}