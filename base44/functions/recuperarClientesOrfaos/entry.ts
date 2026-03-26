import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.permissao_admin !== true) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todas as interações
    const interacoes = await base44.asServiceRole.entities.InteracaoCliente.list();
    
    // Buscar todos os clientes existentes
    const clientes = await base44.asServiceRole.entities.Cliente.list('nome', 10000);
    const clientesMap = new Map(clientes.map(c => [c.id, c]));

    let recuperados = 0;
    const orfaos = [];

    for (const inter of interacoes) {
      // Se a interação referencia um cliente_id que não existe em Clientes
      if (inter.cliente_id && !clientesMap.has(inter.cliente_id)) {
        orfaos.push({
          cliente_id: inter.cliente_id,
          cliente_nome: inter.cliente_nome,
          vendedor_id: inter.vendedor_id,
          vendedor_nome: inter.vendedor_nome,
          interacoes_count: interacoes.filter(i => i.cliente_id === inter.cliente_id).length
        });
      }
    }

    // Remover duplicatas
    const orfaosUnicos = Array.from(
      new Map(orfaos.map(o => [o.cliente_id, o])).values()
    );

    // Criar clientes órfãos na base de Clientes
    for (const orfao of orfaosUnicos) {
      try {
        await base44.asServiceRole.entities.Cliente.create({
          id: orfao.cliente_id,
          nome: orfao.cliente_nome || 'Cliente Sem Nome',
          vendedor_id: orfao.vendedor_id || '',
          vendedor_nome: orfao.vendedor_nome || '',
          origem: 'nativo'
        });
        recuperados++;
      } catch (e) {
        // Cliente pode já existir ou erro de duplicate
        console.log(`Não conseguiu criar ${orfao.cliente_id}:`, e.message);
      }
    }

    return Response.json({
      success: true,
      message: `${recuperados} cliente(s) órfão(s) recuperado(s) e vinculado(s) à carteira!`,
      recuperados,
      total_orfaos: orfaosUnicos.length
    });
  } catch (error) {
    console.error('Erro na recuperação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});