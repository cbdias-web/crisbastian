import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// CORREÇÃO ÚNICA (temporária): vincula as vendas de RECORRÊNCIA antigas à parcela e à venda original,
// usando o vínculo que já existia na ParcelaVenda (venda_gerada_id). Só preenche campos novos e corrige
// valor_total_contrato (que estava com o valor da parcela). NÃO altera valor, data, comissão nem vendedor.
// Guarda o estado anterior em AuditoriaVendas.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Acesso negado' }, { status: 403 });
    const sr = base44.asServiceRole.entities;
    const parcelas: any[] = [];
    for (let skip = 0; skip < 5000; skip += 500) {
      const lote = await sr.ParcelaVenda.filter({ status: 'recebida' }, '-created_date', 500, skip);
      if (!lote?.length) break;
      parcelas.push(...lote);
      skip += lote.length - 500;
    }
    let vinculadas = 0, puladas = 0, semVenda = 0;
    for (const p of parcelas) {
      if (!p.venda_gerada_id) { puladas++; continue; }
      const v = await sr.Venda.get(p.venda_gerada_id).catch(() => null);
      if (!v) { semVenda++; continue; }
      if (v.tipo_venda !== 'recorrencia' || v.parcela_id) { puladas++; continue; }
      const origem = p.venda_id ? await sr.Venda.get(p.venda_id).catch(() => null) : null;
      const upd: any = { parcela_id: p.id, venda_origem_id: p.venda_id || '', numero_parcela: p.numero_parcela, total_parcelas: p.total_parcelas, estrutura_pagamento: 'parcela' };
      if (!v.contrato_id && origem?.contrato_id) upd.contrato_id = origem.contrato_id;
      if (origem?.valor_total_contrato && Number(origem.valor_total_contrato) > Number(v.valor_total_contrato || 0)) upd.valor_total_contrato = origem.valor_total_contrato;
      await sr.AuditoriaVendas.create({
        acao: 'vinculo_recorrencia', entidade: 'Venda', registro_id: v.id,
        motivo: `Recorrência antiga vinculada à parcela ${p.numero_parcela}/${p.total_parcelas} e à venda original`,
        dados_originais: { contrato_id: v.contrato_id || null, valor_total_contrato: v.valor_total_contrato ?? null, estrutura_pagamento: v.estrutura_pagamento || null },
        executado_em: new Date().toISOString(),
      });
      await sr.Venda.update(v.id, upd);
      vinculadas++;
    }
    return Response.json({ success: true, parcelas_recebidas: parcelas.length, vinculadas, puladas, sem_venda: semVenda });
  } catch (error: any) {
    return Response.json({ error: String(error?.message || error).slice(0, 300) }, { status: 500 });
  }
});
