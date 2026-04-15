import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    const criadas = [];
    for (let idx = 0; idx < parcelas.length; idx++) {
      const p = parcelas[idx];
      const numeroParcela = idx + 1;

      // Criar ParcelaVenda
      const registro = await base44.asServiceRole.entities.ParcelaVenda.create({
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
      });
      criadas.push(registro);

      // Criar entrada na AgendaContato do gerente para o dia do vencimento
      if (venda_data.vendedor_id && p.vencimento) {
        try {
          await base44.asServiceRole.entities.AgendaContato.create({
            lead_id: venda_id, // usa o id da venda como referência
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
          });
        } catch (e) {
          // Não bloqueia se agenda falhar
          console.error('Erro ao criar agenda para parcela:', e.message);
        }
      }
    }

    return Response.json({ success: true, criadas: criadas.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});