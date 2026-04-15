import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function createWithRetry(fn, retries = 3, delay = 800) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i < retries - 1 && (e.message?.includes('429') || e.message?.includes('Rate limit'))) {
        await sleep(delay * (i + 1));
      } else {
        throw e;
      }
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todas as vendas com num_parcelas > 1
    const todasVendas = await base44.asServiceRole.entities.Venda.list('-data', 1000);
    const vendasParceladas = todasVendas.filter(v => v.num_parcelas > 1 && v.valor_total_contrato > v.valor);

    // Buscar todas as parcelas existentes
    const todasParcelas = await base44.asServiceRole.entities.ParcelaVenda.list('-created_date', 5000);
    
    // Agrupar parcelas por venda_id
    const parcelasPorVenda = {};
    for (const p of todasParcelas) {
      if (!parcelasPorVenda[p.venda_id]) parcelasPorVenda[p.venda_id] = new Set();
      parcelasPorVenda[p.venda_id].add(p.numero_parcela);
    }

    let totalCriadas = 0;
    let vendasSincronizadas = 0;

    for (const venda of vendasParceladas) {
      const numerosExistentes = parcelasPorVenda[venda.id] || new Set();
      const numParcelas = Math.round(venda.num_parcelas);
      const valorRestante = (venda.valor_total_contrato || 0) - (venda.valor || 0);
      const valorPorParcela = numParcelas > 0 ? valorRestante / numParcelas : 0;

      // Verificar quais parcelas faltam
      const faltando = [];
      for (let i = 1; i <= numParcelas; i++) {
        if (!numerosExistentes.has(i)) {
          faltando.push(i);
        }
      }

      if (faltando.length === 0) continue; // Venda já completa

      vendasSincronizadas++;

      // Gerar datas de vencimento (mensalmente a partir da data da venda)
      const dataBase = venda.data ? new Date(venda.data + 'T00:00:00') : new Date();

      for (const numeroParcela of faltando) {
        const dtVenc = new Date(dataBase);
        dtVenc.setMonth(dtVenc.getMonth() + numeroParcela);
        const dataVencimento = dtVenc.toISOString().split('T')[0];

        await sleep(400);

        await createWithRetry(() =>
          base44.asServiceRole.entities.ParcelaVenda.create({
            venda_id: venda.id,
            numero_parcela: numeroParcela,
            total_parcelas: numParcelas,
            valor_parcela: valorPorParcela,
            data_vencimento: dataVencimento,
            status: 'pendente',
            pipeline_id: '',
            cliente_nome: venda.cliente || '',
            cliente_cpf_cnpj: venda.cpf_cnpj || '',
            produto: venda.produto || '',
            vendedor_id: venda.vendedor_id || '',
            vendedor_nome: venda.assessor_comercial || '',
            percentual_comissao: venda.percentual_comissao || 0,
            indicadores: venda.indicadores || [],
            forma_pagamento: venda.forma_pagamento || '',
          })
        );

        totalCriadas++;
      }
    }

    return Response.json({
      success: true,
      vendasSincronizadas,
      totalCriadas,
      message: `${totalCriadas} parcela(s) criadas em ${vendasSincronizadas} venda(s).`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});