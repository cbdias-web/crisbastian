import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hojeBrasilia } from '../../shared/diaUtil.ts';

// ÚNICO caminho para receber (baixar) uma parcela. Substitui os 3 caminhos que existiam no front
// (Parcelas Vincendas, Pipeline "receber" e Pipeline com data/valor). Garante:
//  - 1 parcela = 1 venda de recorrência (idempotente: segunda chamada devolve a venda já criada)
//  - a venda de recorrência nasce VINCULADA (venda_origem_id, parcela_id, numero/total, contrato_id)
//  - valor_total_contrato = total do contrato (não o valor da parcela)
//  - data no fuso de Brasília
//  - comissão do vendedor sobre a parcela (mesma regra de antes)
//
// Body: { parcela_id, data_recebimento?, valor_recebido?, contrato_id?, comprovantes?, contrato_assinado_url?, contrato_assinado_nome?, boleto_url?, boleto_nome?, observacao? }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({})) || {};
    if (!body.parcela_id) return Response.json({ error: 'parcela_id é obrigatório' }, { status: 400 });

    const sr = base44.asServiceRole.entities;
    const parcela = await sr.ParcelaVenda.get(body.parcela_id).catch(() => null);
    if (!parcela) return Response.json({ error: 'Parcela não encontrada' }, { status: 404 });

    // Idempotência: já recebida, ou já existe venda gerada por esta parcela
    if (parcela.status === 'recebida' && parcela.venda_gerada_id) {
      return Response.json({ success: true, ja_recebida: true, venda_id: parcela.venda_gerada_id });
    }
    const ja = await sr.Venda.filter({ parcela_id: parcela.id }, '-created_date', 1);
    if (ja[0]) {
      await sr.ParcelaVenda.update(parcela.id, { status: 'recebida', data_recebimento: parcela.data_recebimento || ja[0].data, venda_gerada_id: ja[0].id });
      return Response.json({ success: true, ja_recebida: true, venda_id: ja[0].id });
    }

    const origem = parcela.venda_id ? await sr.Venda.get(parcela.venda_id).catch(() => null) : null;
    const hoje = hojeBrasilia();
    const dataRec = /^\d{4}-\d{2}-\d{2}$/.test(body.data_recebimento || '') ? body.data_recebimento : hoje;
    const valor = Number(body.valor_recebido) > 0 ? Number(body.valor_recebido) : Number(parcela.valor_parcela) || 0;
    const contratoId = body.contrato_id || origem?.contrato_id || '';

    const vendaData: any = {
      produto: parcela.produto || origem?.produto || '',
      assessor_comercial: parcela.vendedor_nome || origem?.assessor_comercial || '',
      vendedor_id: parcela.vendedor_id || origem?.vendedor_id || '',
      time: origem?.time || '',
      cliente: parcela.cliente_nome || origem?.cliente || '',
      cpf_cnpj: parcela.cliente_cpf_cnpj || origem?.cpf_cnpj || '',
      valor,
      valor_total_contrato: origem?.valor_total_contrato || valor,
      num_parcelas: parcela.total_parcelas || 1,
      data: dataRec,
      forma_pagamento: parcela.forma_pagamento || origem?.forma_pagamento || '',
      percentual_comissao: parcela.percentual_comissao || 0,
      indicadores: parcela.indicadores || origem?.indicadores || [],
      tipo_venda: 'recorrencia',
      estrutura_pagamento: 'parcela',
      venda_origem_id: parcela.venda_id || '',
      parcela_id: parcela.id,
      numero_parcela: parcela.numero_parcela,
      total_parcelas: parcela.total_parcelas,
      observacao: body.observacao || `Parcela ${parcela.numero_parcela}/${parcela.total_parcelas} recebida`,
    };
    if (contratoId) vendaData.contrato_id = contratoId;
    if (Array.isArray(body.comprovantes) && body.comprovantes.length) vendaData.comprovantes = body.comprovantes;
    for (const k of ['contrato_assinado_url', 'contrato_assinado_nome', 'boleto_url', 'boleto_nome']) if (body[k]) vendaData[k] = body[k];
    if (body.contrato_id) { vendaData.origem_registro = 'contrato'; vendaData.autorizacao_status = 'autorizada'; }

    const venda = await sr.Venda.create(vendaData);

    if (parcela.vendedor_id && parcela.percentual_comissao) {
      await sr.Comissao.create({
        venda_id: venda.id,
        vendedor_id: parcela.vendedor_id,
        vendedor_nome: parcela.vendedor_nome,
        valor_venda: valor,
        percentual: parcela.percentual_comissao,
        valor_comissao: (valor * parcela.percentual_comissao) / 100,
        data_venda: dataRec,
        pago: false,
      }).catch(() => {});
    }
    await sr.ParcelaVenda.update(parcela.id, { status: 'recebida', data_recebimento: dataRec, venda_gerada_id: venda.id });
    if (parcela.pipeline_id) await sr.Pipeline.update(parcela.pipeline_id, { temperatura: 'Fechado' }).catch(() => {});

    return Response.json({ success: true, venda_id: venda.id });
  } catch (error: any) {
    console.error('receberParcelaVenda:', error?.message);
    return Response.json({ error: String(error?.message || error).slice(0, 300) }, { status: 500 });
  }
});
