import { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const fmtFull = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtK = (v) => v >= 1000000 ? `R$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : fmtFull(v);
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function VendedorPerformancePopup({ vendedor, vendas, metas, mesFiltro, dateFrom, dateTo, style, className }) {
  const data = useMemo(() => {
    // Últimos 6 meses
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const ini = `${mes}-01`;
      const fim = `${mes}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
      const vs = vendas.filter(vd =>
        (vd.vendedor_id ? vd.vendedor_id === vendedor.id : vd.assessor_comercial === vendedor.nome) &&
        vd.data && vd.data >= ini && vd.data <= fim
      );
      return {
        mes: MONTH_LABELS[d.getMonth()],
        volume: vs.reduce((s, vd) => s + (parseFloat(vd.valor) || 0), 0),
        isCurrent: mes === mesFiltro
      };
    });

    // Período filtrado
    const vendasPeriodo = vendas.filter(vd =>
      (vd.vendedor_id ? vd.vendedor_id === vendedor.id : vd.assessor_comercial === vendedor.nome) &&
      vd.data && vd.data >= dateFrom && vd.data <= dateTo
    );
    const volume = vendasPeriodo.reduce((s, vd) => s + (parseFloat(vd.valor) || 0), 0);
    const volumeTotal = vendasPeriodo.reduce((s, vd) => s + (parseFloat(vd.valor_total_contrato) || parseFloat(vd.valor) || 0), 0);

    // Produtos
    const byProd = {};
    vendasPeriodo.forEach(vd => {
      const prod = (vd.produto || 'Outros').split(',')[0].trim();
      if (!byProd[prod]) byProd[prod] = { qtd: 0, valor: 0 };
      byProd[prod].qtd++;
      byProd[prod].valor += parseFloat(vd.valor) || 0;
    });
    const produtos = Object.entries(byProd).sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);

    const meta = metas.find(m => m.mes === mesFiltro && m.tipo === 'individual' && m.vendedor_id === vendedor.id);
    const pctMeta = meta?.valor_meta > 0 ? (volume / meta.valor_meta) * 100 : null;
    const comissao = volume * ((vendedor.percentual_comissao || 0) / 100);
    const ticketMedio = vendasPeriodo.length > 0 ? volume / vendasPeriodo.length : 0;

    return { months, volume, volumeTotal, qtd: vendasPeriodo.length, produtos, meta, pctMeta, comissao, ticketMedio };
  }, [vendedor, vendas, metas, mesFiltro, dateFrom, dateTo]);

  const metaColor = data.pctMeta == null ? 'text-gray-400'
    : data.pctMeta >= 100 ? 'text-yellow-600'
    : data.pctMeta >= 70 ? 'text-blue-600'
    : 'text-red-500';

  const barBg = data.pctMeta == null ? '#1a3150'
    : data.pctMeta >= 100 ? '#eab308'
    : data.pctMeta >= 70 ? '#3b82f6'
    : '#ef4444';

  return (
    <div style={style} className={className || "fixed z-[200] bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 pointer-events-none overflow-hidden"}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #1a3150 100%)' }}>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {vendedor.nome?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-bold text-sm truncate">{vendedor.nome}</p>
          <p className="text-blue-200/60 text-[10px]">{vendedor.time || 'Sem time'} · {vendedor.percentual_comissao || 0}% comissão</p>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${vendedor.ativo !== false ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
          {vendedor.ativo !== false ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 rounded-xl p-2.5">
            <p className="text-[9px] text-blue-400 font-semibold uppercase tracking-wider">Volume Entrada</p>
            <p className="text-sm font-bold text-blue-900 truncate">{fmtFull(data.volume)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Nº Vendas</p>
            <p className="text-sm font-bold text-gray-900">{data.qtd}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-2.5">
            <p className="text-[9px] text-emerald-500 font-semibold uppercase tracking-wider">Comissão Est.</p>
            <p className="text-sm font-bold text-emerald-800 truncate">{fmtFull(data.comissao)}</p>
          </div>
          <div className={`rounded-xl p-2.5 ${data.pctMeta == null ? 'bg-gray-50' : data.pctMeta >= 100 ? 'bg-yellow-50' : data.pctMeta >= 70 ? 'bg-blue-50' : 'bg-red-50'}`}>
            <p className={`text-[9px] font-semibold uppercase tracking-wider ${data.pctMeta == null ? 'text-gray-400' : data.pctMeta >= 100 ? 'text-yellow-500' : data.pctMeta >= 70 ? 'text-blue-500' : 'text-red-400'}`}>
              Meta {mesFiltro && new Date(mesFiltro + '-15').toLocaleDateString('pt-BR', { month: 'short' })}
            </p>
            <p className={`text-sm font-bold ${metaColor}`}>
              {data.pctMeta == null ? '—' : `${data.pctMeta >= 100 ? '🏆 ' : ''}${data.pctMeta.toFixed(0)}%`}
            </p>
          </div>
        </div>

        {/* Ticket médio */}
        {data.qtd > 0 && (
          <div className="flex items-center justify-between text-[10px] text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
            <span>Ticket médio</span>
            <span className="font-semibold text-gray-700">{fmtFull(data.ticketMedio)}</span>
            {data.volumeTotal > data.volume && (
              <>
                <span>Vol. total contratos</span>
                <span className="font-semibold text-gray-700">{fmtK(data.volumeTotal)}</span>
              </>
            )}
          </div>
        )}

        {/* Barra de meta */}
        {data.meta && (
          <div>
            <div className="flex justify-between text-[9px] text-gray-400 mb-1">
              <span>Meta: {fmtFull(data.meta.valor_meta)}</span>
              <span className="font-medium">{fmtK(data.volume)} / {fmtK(data.meta.valor_meta)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(data.pctMeta || 0, 100)}%`, backgroundColor: barBg }} />
            </div>
          </div>
        )}

        {/* Gráfico de tendência */}
        <div>
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Tendência — 6 meses</p>
          <div className="h-[72px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.months} margin={{ top: 8, right: 4, left: -32, bottom: 0 }}>
                <XAxis dataKey="mes" tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [fmtFull(v), 'Volume']}
                  contentStyle={{ fontSize: 10, borderRadius: 8, border: '1px solid #e2e8f0', padding: '4px 8px' }}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />
                <Bar dataKey="volume" radius={[3, 3, 0, 0]}>
                  {data.months.map((m, i) => (
                    <Cell key={i} fill={m.isCurrent ? '#1a3150' : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Produtos */}
        {data.produtos.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Produtos no período</p>
            <div className="space-y-1">
              {data.produtos.map(([prod, info], i) => {
                const pct = data.volume > 0 ? (info.valor / data.volume) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ['#1a3150', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i % 5] }} />
                    <span className="text-[10px] text-gray-700 truncate flex-1 font-medium">{prod}</span>
                    <span className="text-[9px] text-gray-400 flex-shrink-0">{info.qtd}x</span>
                    <div className="w-12 bg-gray-100 rounded-full h-1 flex-shrink-0">
                      <div className="h-1 rounded-full" style={{ width: `${pct}%`, backgroundColor: ['#1a3150', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i % 5] }} />
                    </div>
                    <span className="text-[9px] text-gray-500 flex-shrink-0 w-6 text-right">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}