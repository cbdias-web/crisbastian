import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mes, vendedor_nome, resumo_por_vendedor } = await req.json().catch(() => ({}));

    // Busca todas as vendas via service role sem limite
    const todasVendas = await base44.asServiceRole.entities.Venda.list('-data', 10000);
    const totalGeral = todasVendas.length;

    // Filtra por mês se informado (ex: "2026-03")
    const vendasFiltradas = mes
      ? todasVendas.filter(v => v.data && v.data.startsWith(mes))
      : todasVendas;

    // Filtra por vendedor se informado
    const vendasVendedor = vendedor_nome
      ? vendasFiltradas.filter(v =>
          v.assessor_comercial &&
          v.assessor_comercial.toLowerCase().includes(vendedor_nome.toLowerCase())
        )
      : vendasFiltradas;

    const totalFiltrado = vendasVendedor.length;
    const valorTotal = vendasVendedor.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);

    // Resumo por vendedor (agregado) — retorna apenas stats, não registros brutos
    const porVendedor = {};
    for (const v of vendasVendedor) {
      const nome = v.assessor_comercial || 'Sem vendedor';
      if (!porVendedor[nome]) porVendedor[nome] = { vendas: 0, volume: 0 };
      porVendedor[nome].vendas++;
      porVendedor[nome].volume += parseFloat(v.valor) || 0;
    }

    const rankingVendedores = Object.entries(porVendedor)
      .map(([nome, stats]) => ({ nome, vendas: stats.vendas, volume: stats.volume }))
      .sort((a, b) => b.volume - a.volume);

    // Resumo por produto
    const porProduto = {};
    for (const v of vendasVendedor) {
      const prod = v.produto || 'Sem produto';
      if (!porProduto[prod]) porProduto[prod] = { vendas: 0, volume: 0 };
      porProduto[prod].vendas++;
      porProduto[prod].volume += parseFloat(v.valor) || 0;
    }
    const rankingProdutos = Object.entries(porProduto)
      .map(([nome, stats]) => ({ nome, vendas: stats.vendas, volume: stats.volume }))
      .sort((a, b) => b.volume - a.volume);

    // Lista compacta de vendas (apenas campos essenciais)
    const listaCompacta = vendasVendedor.map(v => ({
      data: v.data,
      cliente: v.cliente,
      produto: v.produto,
      vendedor: v.assessor_comercial,
      valor: parseFloat(v.valor) || 0,
      forma_pagamento: v.forma_pagamento,
      cpf_cnpj: v.cpf_cnpj
    }));

    return Response.json({
      success: true,
      filtros_aplicados: { mes: mes || 'todos', vendedor_nome: vendedor_nome || 'todos' },
      total_geral_plataforma: totalGeral,
      total_filtrado: totalFiltrado,
      valor_total: valorTotal,
      ticket_medio: totalFiltrado > 0 ? valorTotal / totalFiltrado : 0,
      ranking_vendedores: rankingVendedores,
      ranking_produtos: rankingProdutos,
      vendas: listaCompacta
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});