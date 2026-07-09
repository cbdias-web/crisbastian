import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SYMBOLS = [
  { key: 'ibovespa', symbol: '%5EBVSP', label: 'Ibovespa', prefix: '', group: 'Bolsas' },
  { key: 'dolar', symbol: 'USDBRL%3DX', label: 'Dólar', prefix: 'R$', group: 'Câmbio' },
  { key: 'euro', symbol: 'EURBRL%3=X', label: 'Euro', prefix: 'R$', group: 'Câmbio' },
  { key: 'dowjones', symbol: '%5EDJI', label: 'Dow Jones', prefix: '', group: 'Bolsas' },
  { key: 'nasdaq', symbol: '%5EIXIC', label: 'Nasdaq', prefix: '', group: 'Bolsas' },
  { key: 'sp500', symbol: '%5EGSPC', label: 'S&P 500', prefix: '', group: 'Bolsas' },
  { key: 'brent', symbol: 'BZ%3DF', label: 'Brent', prefix: 'US$', group: 'Commodities' },
  { key: 'petroleo', symbol: 'CL%3DF', label: 'WTI', prefix: 'US$', group: 'Commodities' },
  { key: 'ouro', symbol: 'GC%3DF', label: 'Ouro', prefix: 'US$', group: 'Commodities' },
  { key: 'minerio', symbol: '%5EIRON', label: 'Minério', prefix: 'US$', group: 'Commodities' },
  { key: 'petr4', symbol: 'PETR4.SA', label: 'PETR4', prefix: 'R$', group: 'B3' },
  { key: 'vale3', symbol: 'VALE3.SA', label: 'VALE3', prefix: 'R$', group: 'B3' },
  { key: 'itub4', symbol: 'ITUB4.SA', label: 'ITUB4', prefix: 'R$', group: 'B3' },
  { key: 'bbdc4', symbol: 'BBDC4.SA', label: 'BBDC4', prefix: 'R$', group: 'B3' },
  { key: 'wege3', symbol: 'WEGE3.SA', label: 'WEGE3', prefix: 'R$', group: 'B3' },
];

// Map user-friendly ranges to Yahoo Finance range params
const RANGE_MAP = {
  '1d': { range: '1d', interval: '5m' },
  '5d': { range: '5d', interval: '15m' },
  '1m': { range: '1mo', interval: '1d' },
  '3m': { range: '3mo', interval: '1d' },
  '6m': { range: '6mo', interval: '1d' },
  '1a': { range: '1y', interval: '1d' },
};

async function fetchQuote(symbol, rangeKey) {
  const { range, interval } = RANGE_MAP[rangeKey] || RANGE_MAP['5d'];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!res.ok) return null;
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return null;
  const meta = result.meta;
  if (!meta) return null;

  // Build sparkline with timestamps
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const series = timestamps.map((ts, i) => ({
    timestamp: ts,
    value: closes[i],
  })).filter(pt => pt.value != null);

  return {
    price: meta.regularMarketPrice,
    prevClose: meta.chartPreviousClose || meta.previousClose,
    currency: meta.currency,
    series,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Parse range from request body
    let rangeKey = '5d';
    try {
      const body = await req.json();
      if (body?.range && RANGE_MAP[body.range]) rangeKey = body.range;
    } catch (e) {}

    const results = await Promise.allSettled(
      SYMBOLS.map(async (item) => {
        const data = await fetchQuote(item.symbol, rangeKey);
        if (!data || !data.price) return null;
        const change = data.prevClose ? data.price - data.prevClose : 0;
        const changePct = data.prevClose ? (change / data.prevClose) * 100 : 0;
        return {
          key: item.key,
          label: item.label,
          prefix: item.prefix,
          group: item.group,
          price: data.price,
          change,
          changePct,
          series: data.series,
          range: rangeKey,
        };
      })
    );

    const quotes = results
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter(Boolean);

    return Response.json({ success: true, quotes, range: rangeKey, updatedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});