import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.permissao_admin !== true) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { vendedor_origem_id, vendedor_destino_id } = await req.json();

    if (!vendedor_origem_id || !vendedor_destino_id) {
      return Response.json({ error: 'IDs de vendedores obrigatórios' }, { status: 400 });
    }

    const clientesOrigem = await base44.asServiceRole.entities.Cliente.filter({ vendedor_id: vendedor_origem_id });

    const vendedorDestino = await base44.asServiceRole.entities.Vendedor.filter({ id: vendedor_destino_id });
    const nomeDestino = vendedorDestino[0]?.nome || 'Vendedor';

    let migrados = 0;
    for (const cliente of clientesOrigem) {
      await base44.asServiceRole.entities.Cliente.update(cliente.id, {
        vendedor_id: vendedor_destino_id,
        vendedor_nome: nomeDestino,
      });
      migrados++;
    }

    return Response.json({
      success: true,
      message: `${migrados} cliente(s) transferido(s) com sucesso para ${nomeDestino}!`,
      migrados
    });
  } catch (error) {
    console.error('Erro na migração:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});