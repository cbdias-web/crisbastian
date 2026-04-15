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

    const { venda_id, parcelas, venda_data } = await req.json();

    if (!venda_id || !parcelas || parcelas.length === 0) {
      return Response.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    // Buscar parcelas já existentes para esta venda (evitar duplicidade)
    const existentes = await base44.asServiceRole.entities.ParcelaVenda.filter({ venda_id });
    const numerosExistentes = new Set(existentes.map(p => p.numero_parcela));

    const criadas = [];
    const puladas = [];

    for (let idx = 0; idx < parcelas.length; idx++) {
      const p = parcelas[idx];
      const numeroParcela = idx + 1;

      // Pular se já existe parcela com este número para esta venda
      if (numerosExistentes.has(numeroParcela)) {
        puladas.push(numeroParcela);
        continue;
      }

      if (criadas.length > 0) await sleep(600);

      // Criar ParcelaVenda com retry
      const registro = await createWithRetry(() =>
        base44.asServiceRole.entities.ParcelaVenda.create({
          venda_id,
          numero_parcela: numeroParcela,
          total_parcelas: parcelas.length,
          valor_parcela: p.valor,
          data_vencimento: p.vencimento,
          status: 'pendente',
          pipeline_id: '',
          cliente_nome: venda_data.cliente || '',
          cliente_cpf_cnpj: venda_data.cpf_cnpj || '',
          produto: venda_data.produto || '',
          vendedor_id: venda_data.vendedor_id || '',
          vendedor_nome: venda_data.assessor_comercial || '',
          percentual_comissao: venda_data.percentual_comissao || 0,
          indicadores: venda_data.indicadores || [],
          forma_pagamento: venda_data.forma_pagamento || '',
        })
      );
      criadas.push(registro);

      await sleep(400);

      // Criar entrada na AgendaContato do gerente para o dia do vencimento
      if (venda_data.vendedor_id && p.vencimento) {
        try {
          await createWithRetry(() =>
            base44.asServiceRole.entities.AgendaContato.create({
              lead_id: venda_id,
              lead_nome: `${venda_data.cliente || 'Cliente'} — Parcela ${numeroParcela}/${parcelas.length}`,
              lead_cpf_cnpj: venda_data.cpf_cnpj || '',
              lead_telefone: '',
              cliente_id: '',
              vendedor_id: venda_data.vendedor_id,
              vendedor_nome: venda_data.assessor_comercial || '',
              data_agendada: p.vencimento,
              posicao_dia: numeroParcela,
              lote_id: '',
              status: 'pendente',
              resultado: `Vencimento parcela ${numeroParcela}/${parcelas.length} — ${venda_data.produto || ''} — ${(p.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
            })
          );
        } catch (e) {
          console.error('Erro ao criar agenda para parcela:', e.message);
        }
      }
    }

    return Response.json({ success: true, criadas: criadas.length, puladas: puladas.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});