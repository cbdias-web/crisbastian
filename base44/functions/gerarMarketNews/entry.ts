import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ASSETS = [
  { nome: 'Dólar (USD/BRL)', simbolo: 'USDBRL=X', categoria: 'forex', moeda: 'BRL' },
  { nome: 'Euro (EUR/BRL)', simbolo: 'EURBRL=X', categoria: 'forex', moeda: 'BRL' },
  { nome: 'Petróleo Brent', simbolo: 'BZ=F', categoria: 'commodities', moeda: 'USD' },
  { nome: 'Petróleo WTI', simbolo: 'CL=F', categoria: 'commodities', moeda: 'USD' },
  { nome: 'Ouro', simbolo: 'GC=F', categoria: 'commodities', moeda: 'USD' },
  { nome: 'Prata', simbolo: 'SI=F', categoria: 'commodities', moeda: 'USD' },
  { nome: 'Cobre', simbolo: 'HG=F', categoria: 'commodities', moeda: 'USD' },
  { nome: 'Soja', simbolo: 'ZS=F', categoria: 'commodities', moeda: 'USD' },
  { nome: 'Milho', simbolo: 'ZC=F', categoria: 'commodities', moeda: 'USD' },
  { nome: 'Café', simbolo: 'KC=F', categoria: 'commodities', moeda: 'USD' },
  { nome: 'Açúcar', simbolo: 'SB=F', categoria: 'commodities', moeda: 'USD' },
  { nome: 'Ibovespa', simbolo: '^BVSP', categoria: 'acoes', moeda: 'BRL' },
  { nome: 'S&P 500', simbolo: '^GSPC', categoria: 'acoes', moeda: 'USD' },
  { nome: 'Nasdaq', simbolo: '^IXIC', categoria: 'acoes', moeda: 'USD' },
  { nome: 'Dow Jones', simbolo: '^DJI', categoria: 'acoes', moeda: 'USD' },
  { nome: 'Bitcoin', simbolo: 'BTC-USD', categoria: 'cripto', moeda: 'USD' },
  { nome: 'Ethereum', simbolo: 'ETH-USD', categoria: 'cripto', moeda: 'USD' },
];

async function fetchYahooData(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const prices = (result.indicators?.quote?.[0]?.close || []).filter(v => v != null);
    const sparkline = prices.slice(-7);
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
    return { price, changePct, sparkline, prevClose };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Buscar cotações
    const cotacoes = await Promise.allSettled(
      ASSETS.map(async (asset) => {
        const data = await fetchYahooData(asset.simbolo);
        if (!data) return null;
        return { ...asset, ...data };
      })
    );
    const ativosComDados = cotacoes
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter(Boolean);

    if (ativosComDados.length === 0) {
      return Response.json({ error: 'Não foi possível obter cotações' }, { status: 500 });
    }

    // Preparar resumo de cotações para o LLM
    const cotacoesStr = ativosComDados.map(a =>
      `${a.nome} (${a.simbolo}): ${a.price?.toFixed(2)} ${a.moeda} (${a.changePct >= 0 ? '+' : ''}${a.changePct?.toFixed(2)}%)`
    ).join('\n');

    // Gerar análise via LLM com contexto da internet
    const prompt = `Você é um analista financeiro especializado no mercado brasileiro e global.
Abaixo estão as cotações atuais de diversos ativos:

${cotacoesStr}

Com base nessas cotações e no contexto atual do mercado (use seu conhecimento de internet), gere um relatório JSON com 6 a 10 notícias/insights que sejam RELEVANTES para tomadas de decisão diárias de um profissional de câmbio/investimentos no Brasil.

Para cada notícia, inclua:
- titulo: título conciso e impactante
- resumo: 1-2 frases com o ponto principal
- conteudo: análise detalhada em markdown (2-3 parágrafos) com contexto, motivos do movimento e o que observar
- categoria: uma de [commodities, forex, acoes, cripto, economia, renda_fixa]
- ativo_nome: nome do atvo principal relacionado
- ativo_simbolo: símbolo/ticker
- preco_atual: preço atual (número)
- variacao_pct: variação percentual (número)
- moeda: moeda do preço
- sparkline: array de números com os pontos do mini-gráfico (use os dados disponíveis ou gere pontos plausíveis)
- tendencia: "alta", "baixa" ou "lateral"
- impacto: "positivo", "negativo" ou "neutro" (impacto no mercado/câmbio brasileiro)
- relevancia: "alta", "media" ou "baixa"
- tags: array de strings (2-4 tags)
- fonte: nome da fonte (ex: Bloomberg, Reuters, Investing, B3)
- fonte_url: URL da fonte (se aplicável)

Foque em:
1. Movimentos relevantes em commodities (petróleo, ouro, metais, agrícolas)
2. Câmbio (dólar, euro vs real)
3. Bolsas globais e Ibovespa
4. Criptomoedas quando houver movimento relevante
5. Eventos macroeconômicos (juros, inflação, geopolítica)

Responda APENAS com o JSON, sem texto adicional.`;

    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          noticias: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                titulo: { type: 'string' },
                resumo: { type: 'string' },
                conteudo: { type: 'string' },
                categoria: { type: 'string', enum: ['commodities', 'forex', 'acoes', 'cripto', 'economia', 'renda_fixa'] },
                ativo_nome: { type: 'string' },
                ativo_simbolo: { type: 'string' },
                preco_atual: { type: 'number' },
                variacao_pct: { type: 'number' },
                moeda: { type: 'string' },
                sparkline: { type: 'array', items: { type: 'number' } },
                tendencia: { type: 'string', enum: ['alta', 'baixa', 'lateral'] },
                impacto: { type: 'string', enum: ['positivo', 'negativo', 'neutro'] },
                relevancia: { type: 'string', enum: ['alta', 'media', 'baixa'] },
                tags: { type: 'array', items: { type: 'string' } },
                fonte: { type: 'string' },
                fonte_url: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const noticias = (llmRes as any)?.noticias || [];

    // Salvar no banco
    const agora = new Date().toISOString();
    const registros = noticias.map(n => ({
      titulo: n.titulo,
      resumo: n.resumo,
      conteudo: n.conteudo,
      categoria: n.categoria,
      ativo_nome: n.ativo_nome || '',
      ativo_simbolo: n.ativo_simbolo || '',
      preco_atual: n.preco_atual || 0,
      variacao_pct: n.variacao_pct || 0,
      moeda: n.moeda || 'BRL',
      sparkline: n.sparkline || [],
      tendencia: n.tendencia || 'lateral',
      impacto: n.impacto || 'neutro',
      relevancia: n.relevancia || 'media',
      tags: n.tags || [],
      fonte: n.fonte || '',
      fonte_url: n.fonte_url || '',
      publicado_em: agora,
      ativo: true,
    }));

    if (registros.length > 0) {
      await base44.asServiceRole.entities.MarketNews.bulkCreate(registros);
    }

    return Response.json({ success: true, criadas: registros.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});