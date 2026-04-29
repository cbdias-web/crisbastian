import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Normaliza qualquer variação de "DOLARIZE" para "DOLARIZE"
const normalizeDolarize = (val) => {
  if (!val) return val;
  const upper = val.toUpperCase();
  if (upper.includes('DOLARIZE')) return 'DOLARIZE';
  return val;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const results = { Contrato: 0, Pipeline: 0, Venda: 0, ParcelaVenda: 0, NotificacaoAutorizacao: 0 };

    // ── Contratos ──────────────────────────────────────────────
    const contratos = await base44.asServiceRole.entities.Contrato.list('created_date', 5000);
    for (const c of contratos) {
      const novo = normalizeDolarize(c.tipo);
      if (novo !== c.tipo) {
        await base44.asServiceRole.entities.Contrato.update(c.id, { tipo: novo });
        results.Contrato++;
      }
    }

    // ── Pipeline ───────────────────────────────────────────────
    const pipelines = await base44.asServiceRole.entities.Pipeline.list('created_date', 5000);
    for (const p of pipelines) {
      const novo = normalizeDolarize(p.produto);
      if (novo !== p.produto) {
        await base44.asServiceRole.entities.Pipeline.update(p.id, { produto: novo });
        results.Pipeline++;
      }
    }

    // ── Vendas ─────────────────────────────────────────────────
    const vendas = await base44.asServiceRole.entities.Venda.list('created_date', 5000);
    for (const v of vendas) {
      const novo = normalizeDolarize(v.produto);
      if (novo !== v.produto) {
        await base44.asServiceRole.entities.Venda.update(v.id, { produto: novo });
        results.Venda++;
      }
    }

    // ── ParcelaVenda ───────────────────────────────────────────
    const parcelas = await base44.asServiceRole.entities.ParcelaVenda.list('created_date', 2000);
    for (const p of parcelas) {
      const novo = normalizeDolarize(p.produto);
      if (novo !== p.produto) {
        await base44.asServiceRole.entities.ParcelaVenda.update(p.id, { produto: novo });
        results.ParcelaVenda++;
      }
    }

    // ── NotificacaoAutorizacao ─────────────────────────────────
    const notifs = await base44.asServiceRole.entities.NotificacaoAutorizacao.list('created_date', 2000);
    for (const n of notifs) {
      const novo = normalizeDolarize(n.contrato_tipo);
      if (novo !== n.contrato_tipo) {
        await base44.asServiceRole.entities.NotificacaoAutorizacao.update(n.id, { contrato_tipo: novo });
        results.NotificacaoAutorizacao++;
      }
    }

    return Response.json({ success: true, migrated: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});