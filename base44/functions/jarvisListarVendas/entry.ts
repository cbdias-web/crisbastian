import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Busca todas as vendas sem limite via service role
    const vendas = await base44.asServiceRole.entities.Venda.list('-data', 10000);

    return Response.json({
      success: true,
      total: vendas.length,
      vendas: vendas
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});