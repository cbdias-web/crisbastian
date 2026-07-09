import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, RefreshCw, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const A = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.5)',
};

function fmt(value, prefix) {
  if (value === undefined || value === null) return '—';
  return `${prefix ? prefix + ' ' : ''}${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const RANGES = [
  { key: '1d', label: '1D' },
  { key: '5d', label: '5D' },
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1a', label: '1A' },
];

// Format chart X-axis labels based on range
function formatAxisLabel(ts, rangeKey) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  if (rangeKey === '1d') return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (rangeKey === '5d') return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Format tooltip label with full date/time
function formatTooltipLabel(ts, rangeKey) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  if (rangeKey === '1d') return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  if (rangeKey === '5d') return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Mini sparkline com SVG puro
function MiniSpark({ data = [], color = '#00D4AA', width = 80, height = 28 }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => ({ x: i * stepX, y: height - ((v - min) / range) * (height - 4) - 2 }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  const gid = `mini-${color.replace('#', '')}`;
  return (
    <svg width={width} height={height}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={areaD} fill={`url(#${gid})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

const GROUPS = ['Destaque', 'B3', 'Commodities', 'Câmbio', 'Bolsas'];

export default function MarketDashboard() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tab, setTab] = useState('Destaque');
  const [range, setRange] = useState('5d');
  const timerRef = useRef(null);

  const fetchData = async (rangeKey = range) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('buscarDadosMercado', { range: rangeKey });
      if (res.data?.quotes) {
        const newQuotes = res.data.quotes;
        setQuotes(newQuotes);
        // Keep selected key when changing range, update with new series
        if (selected) {
          const updated = newQuotes.find(q => q.key === selected.key);
          if (updated) setSelected(updated);
        } else if (newQuotes.length > 0) {
          setSelected(newQuotes[0]);
        }
        setLastUpdate(new Date());
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData(range);
    timerRef.current = setInterval(() => fetchData(range), 5 * 60 * 1000);
    return () => clearInterval(timerRef.current);
  }, [range]);

  const handleRangeChange = (newRange) => {
    if (newRange === range) return;
    setRange(newRange);
  };

  const destaques = ['dolar', 'brent', 'ouro', 'minerio', 'ibovespa', 'petr4', 'vale3', 'euro'];
  const filterByGroup = (g) => {
    if (g === 'Destaque') return quotes.filter(q => destaques.includes(q.key));
    return quotes.filter(q => q.group === g);
  };

  const visibleQuotes = filterByGroup(tab);

  // Build chart data from selected's series (includes timestamps)
  const chartData = selected?.series?.map(pt => ({ ts: pt.timestamp, value: pt.value })).filter(pt => pt.value != null) || [];

  const CustomChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const ts = payload[0]?.payload?.ts;
    return (
      <div className="rounded-lg px-3 py-2 text-xs shadow-2xl" style={{ background: '#0d1117', border: `1px solid ${A.accent}55`, color: A.text }}>
        <p className="text-[10px] mb-1" style={{ color: A.textMuted }}>{formatTooltipLabel(ts, range)}</p>
        <p className="font-bold">{fmt(payload[0].value, selected?.prefix)}</p>
      </div>
    );
  };

  // Determine x-axis tick interval to avoid clutter
  const tickInterval = chartData.length > 20 ? Math.floor(chartData.length / 6) - 1 : 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${A.border}`, background: 'linear-gradient(135deg, #0d2137 0%, #0a3d2e 100%)' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <h3 className="text-sm font-bold" style={{ color: A.text }}>Cotações em Tempo Real</h3>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: A.textMuted }}>
              <Clock className="w-2.5 h-2.5" /> {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button onClick={() => fetchData(range)} disabled={loading}
            className="p-1.5 rounded-lg transition disabled:opacity-50"
            style={{ background: A.surface2, border: `1px solid ${A.border}`, color: A.accent }}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main chart */}
      {selected && (
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${A.border}` }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: A.textMuted }}>{selected.group}</p>
              <div className="flex items-baseline gap-2">
                <h4 className="text-lg font-bold" style={{ color: A.text }}>{selected.label}</h4>
                <p className="text-xl font-bold" style={{ color: A.text }}>{fmt(selected.price, selected.prefix)}</p>
                <span className="flex items-center gap-0.5 text-sm font-semibold px-2 py-0.5 rounded-lg"
                  style={{ background: selected.changePct >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: selected.changePct >= 0 ? '#34d399' : '#f87171' }}>
                  {selected.changePct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {selected.changePct >= 0 ? '+' : ''}{selected.changePct.toFixed(2)}%
                </span>
              </div>
            </div>
            {/* Period selector */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: A.bg, border: `1px solid ${A.border}` }}>
              {RANGES.map(r => {
                const isActive = range === r.key;
                return (
                  <button key={r.key} onClick={() => handleRangeChange(r.key)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold transition"
                    style={{
                      background: isActive ? A.accent : 'transparent',
                      color: isActive ? A.bg : A.textMuted,
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = A.text; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = A.textMuted; }}>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={selected.changePct >= 0 ? '#34d399' : '#f87171'} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={selected.changePct >= 0 ? '#34d399' : '#f87171'} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="ts"
                  tickFormatter={(ts) => formatAxisLabel(ts, range)}
                  tick={{ fontSize: 9, fill: 'rgba(230,237,243,0.4)' }}
                  axisLine={false} tickLine={false}
                  interval={tickInterval}
                  minTickGap={20} />
                <YAxis domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 9, fill: 'rgba(230,237,243,0.4)' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(2)}
                  width={50} orientation="right" />
                <Tooltip content={<CustomChartTooltip />} />
                <Area type="monotone" dataKey="value" stroke={selected.changePct >= 0 ? '#34d399' : '#f87171'} strokeWidth={2} fill="url(#chart-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-xs" style={{ color: A.textMuted }}>Sem dados de histórico</div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pt-3 flex-wrap">
        {GROUPS.map(g => {
          const isActive = tab === g;
          return (
            <button key={g} onClick={() => setTab(g)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              style={{
                background: isActive ? 'rgba(0,212,170,0.12)' : 'transparent',
                color: isActive ? A.accent : A.textMuted,
                border: isActive ? `1px solid ${A.border}` : '1px solid transparent',
              }}>
              {g}
            </button>
          );
        })}
      </div>

      {/* Quote grid */}
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {visibleQuotes.map(q => {
          const up = q.changePct >= 0;
          const isSel = selected?.key === q.key;
          const sparkData = q.series?.map(pt => pt.value).filter(v => v != null) || [];
          return (
            <button key={q.key} onClick={() => setSelected(q)}
              className="rounded-xl p-3 text-left transition-all duration-150"
              style={{
                background: isSel ? 'rgba(0,212,170,0.08)' : A.surface2,
                border: `1px solid ${isSel ? A.accent + '44' : A.border}`,
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.borderColor = `${A.accent}33`; }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.borderColor = A.border; }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: A.textMuted }}>{q.label}</span>
                <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: up ? '#34d399' : '#f87171' }}>
                  {up ? '+' : ''}{q.changePct.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-sm font-bold" style={{ color: A.text }}>{fmt(q.price, q.prefix)}</span>
                {sparkData.length > 1 && <MiniSpark data={sparkData} color={up ? '#34d399' : '#f87171'} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}