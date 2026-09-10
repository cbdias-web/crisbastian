import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Normaliza CPF/CNPJ removendo não-dígitos
const normDoc = (s) => (s || '').toString().replace(/\D/g, '');

// Sincroniza a jornada das LeadIndicacao de origem portal a partir de uma Venda.
// É disparada pela automação de entidade (Venda create/update) — reconcilia pelo
// CPF/CNPJ, sem depender de contrato_id (que pode estar ausente/obsoleto), tornando
// o vínculo robusto a qualquer origem da venda (migração de contrato, cadastro
// manual em Vendas, API, etc.). Idempotente.
//
// Aceita:
//  - payload de automação: { event, data, old_data, changed_fields, payload_too_large }
//  - chamada manual: { venda_id }  |  { reconcile_all: true }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;
    let body = {};
    try { body = await req.json(); } catch (e) {}

    // Modo reconciliação total (uso pontual/manual)
    if (body.reconcile_all) {
      const vendas = await b.entities.Venda.list('-created_date', 500);
      let total = 0;
      for (const v of vendas) {
        try { const r = await sincronizar(b, v); if (r.atualizadas) total += r.atualizadas; } catch (e) {}
      }
      return Response.json({ ok: true, mode: 'reconcile_all', vendas: vendas.length, indicacoes_atualizadas: total });
    }

    // Resolve a venda alvo
    let venda = null;
    if (body.data && body.data.id) venda = body.data;
    else if (body.venda_id) {
      try { venda = await b.entities.Venda.get(body.venda_id); } catch (e) {}
    } else if (body.event && body.event.entity_id && !body.data) {
      try { venda = await b.entities.Venda.get(body.event.entity_id); } catch (e) {}
    }

    if (!venda || !venda.id) return Response.json({ ok: true, skipped: 'sem venda' });

    const res = await sincronizar(b, venda);
    return Response.json({ ok: true, venda_id: venda.id, ...res });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function sincronizar(b, venda) {
  const doc = normDoc(venda.cpf_cnpj);
  if (!doc) return { matched: 0, atualizadas: 0, skipped: 'sem cpf/cnpj' };

  const temComprovante = Array.isArray(venda.comprovantes) && venda.comprovantes.length > 0;

  // Busca indicações de portal pelo CPF/CNPJ (PF ou PJ) que ainda não foram descartadas
  // e que tenham parceiro_id (origem portal). A reconciliação é pelo documento, o que
  // garante o vínculo mesmo quando o contrato_id não foi propagado.
  const leads = await b.entities.LeadIndicacao.list('-created_date', 500);
  const matches = leads.filter(l => {
    if (!l || !l.parceiro_id) return false;
    // Rejeitado por Compliance: o lead não volta a contar como convertido
    if (l.status === 'descartado' || l.status === 'rejeitado_compliance') return false;
    const lDoc = normDoc(l.tipo === 'PF' ? l.pf_cpf : l.pj_cnpj);
    return lDoc && lDoc === doc;
  });

  if (matches.length === 0) return { matched: 0, atualizadas: 0 };

  let atualizadas = 0;
  for (const li of matches) {
    const historico = Array.isArray(li.historico) ? [...li.historico] : [];
    const jaTemHist = historico.some(h => h && h.venda_id === venda.id);
    const vendaIdAtual = li.venda_id;

    // Status: com comprovante → convertido_venda; sem comprovante → convertido_contrato
    // (não regride de convertido_venda para convertido_contrato).
    let novoStatus = li.status;
    if (temComprovante) novoStatus = 'convertido_venda';
    else if (li.status !== 'convertido_venda') novoStatus = 'convertido_contrato';

    const statusMuda = novoStatus !== li.status;
    const vendaIdMuda = vendaIdAtual !== venda.id;

    if (!statusMuda && !vendaIdMuda && jaTemHist) continue; // já sincronizado

    const payload = {};
    if (vendaIdMuda) payload.venda_id = venda.id;
    if (statusMuda) payload.status = novoStatus;
    if (!jaTemHist) {
      historico.push({
        status: novoStatus,
        label: temComprovante ? 'Venda convertida (paga)' : 'Venda criada (aguardando comprovante)',
        data: new Date().toISOString(),
        venda_id: venda.id,
      });
      payload.historico = historico;
    }
    if (Object.keys(payload).length === 0) continue;

    await b.entities.LeadIndicacao.update(li.id, payload);
    atualizadas++;
  }
  return { matched: matches.length, atualizadas };
}