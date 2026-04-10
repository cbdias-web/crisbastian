import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SYMBOLS = [
  { key: 'ibovespa', symbol: '%5EBVSP', label: 'Ibovespa', prefix: '' },
  { key: 'dolar', symbol: 'USDBRL%3DX', label: 'Dólar', prefix: 'R$' },
  { key: 'dowjones', symbol: '%5EDJI', label: 'Dow Jones', prefix: '' },
  { key: 'nasdaq', symbol: '%5EIXIC', label: 'Nasdaq', prefix: '' },
  { key: 'sp500', symbol: '%5EGSPC', label: 'S&P 500', prefix: '' },
  { key: 'petroleo', symbol: 'CL%3DF', label: 'Petróleo', prefix: 'US$' },
  { key: 'ouro', symbol: 'GC%3DF', label: 'Ouro', prefix: 'US$' },
  { key: 'petr4', symbol: 'PETR4.SA', label: 'PETR4', prefix: 'R$' },
  { key: 'vale3', symbol: 'VALE3.SA', label: 'VALE3', prefix: 'R$' },
  { key: 'itub4', symbol: 'ITUB4.SA', label: 'ITUB4', prefix: 'R$' },
  { key: 'bbdc4', symbol: 'BBDC4.SA', label: 'BBDC4', prefix: 'R$' },
  { key: 'wege3', symbol: 'WEGE3.SA', label: 'WEGE3', prefix: 'R$' },
];

async function fetchQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!res.ok) return null;
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) return null;
  return {
    price: meta.regularMarketPrice,
    prevClose: meta.chartPreviousClose || meta.previousClose,
    currency: meta.currency,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const results = await Promise.allSettled(
      SYMBOLS.map(async (item) => {
        const data = await fetchQuote(item.symbol);
        if (!data || !data.price) return null;
        const change = data.prevClose ? data.price - data.prevClose : 0;
        const changePct = data.prevClose ? (change / data.prevClose) * 100 : 0;
        return {
          key: item.key,
          label: item.label,
          prefix: item.prefix,
          price: data.price,
          change,
          changePct,
        };
      })
    );

    const quotes = results
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter(Boolean);

    return Response.json({ success: true, quotes, updatedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});