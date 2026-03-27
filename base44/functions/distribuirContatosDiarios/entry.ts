import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      .split('/').reverse().join('-'); // YYYY-MM-DD

    // Buscar todos os vendedores ativos
    const vendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true });

    // Buscar todas as agendas de hoje
    const todasAgendas = await base44.asServiceRole.entities.AgendaContato.list();
    const agendasHoje = todasAgendas.filter(a => a.data_agendada === hoje);

    // Buscar todos os clientes
    const todosClientes = await base44.asServiceRole.entities.Cliente.list('nome', 50000);

    let totalCriados = 0;

    for (const vendedor of vendedores) {
      // Contar agendas de hoje deste vendedor
      const agendasVendedorHoje = agendasHoje.filter(a => a.vendedor_id === vendedor.id);
      const faltam = 5 - agendasVendedorHoje.length;

      if (faltam <= 0) continue;

      // Buscar clientes da carteira deste vendedor
      const clientesVendedor = todosClientes.filter(c => c.vendedor_id === vendedor.id);

      if (clientesVendedor.length === 0) continue;

      // IDs já agendados hoje para não repetir
      const jaAgendadosHoje = new Set(agendasVendedorHoje.map(a => a.lead_id));

      // Candidatos: clientes não agendados hoje
      const candidatos = clientesVendedor.filter(c => !jaAgendadosHoje.has(c.id));

      if (candidatos.length === 0) continue;

      // Embaralhar aleatoriamente
      const embaralhados = candidatos.sort(() => Math.random() - 0.5);

      // Pegar os primeiros N necessários
      const selecionados = embaralhados.slice(0, faltam);

      // Determinar posição inicial (após os já agendados)
      let posicao = agendasVendedorHoje.length + 1;

      for (const cliente of selecionados) {
        await base44.asServiceRole.entities.AgendaContato.create({
          lead_id: cliente.id,
          lead_nome: cliente.nome,
          lead_cpf_cnpj: cliente.cpf_cnpj || '',
          lead_telefone: cliente.telefone || '',
          cliente_id: cliente.id,
          vendedor_id: vendedor.id,
          vendedor_nome: vendedor.nome,
          data_agendada: hoje,
          posicao_dia: posicao++,
          lote_id: '',
          status: 'pendente',
          resultado: ''
        });
        totalCriados++;
      }
    }

    return Response.json({
      success: true,
      data: hoje,
      total_criados: totalCriados,
      vendedores_processados: vendedores.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});