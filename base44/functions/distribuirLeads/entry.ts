import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { addDays, format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && !user.permissao_admin)) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { loteId, loteNome, vendedoresIds, modo } = await req.json();

    // Buscar vendedores selecionados
    const todosVendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true });
    const vendedoresSelecionados = todosVendedores.filter(v => vendedoresIds.includes(v.id));
    if (vendedoresSelecionados.length === 0) {
      return Response.json({ error: 'Nenhum vendedor selecionado' }, { status: 400 });
    }

    // Buscar leads do lote
    const todosLeads = await base44.asServiceRole.entities.Lead.filter({ lote_id: loteId }, 'nome', 10000);
    let leadsParaDistribuir;
    if (modo === 'distribuir') {
      leadsParaDistribuir = todosLeads.filter(l => l.status === 'pendente');
    } else {
      leadsParaDistribuir = todosLeads.filter(l => l.status === 'distribuido' && !l.convertido);
    }

    if (leadsParaDistribuir.length === 0) {
      return Response.json({ message: 'Nenhum lead disponível para distribuição', total: 0 });
    }

    // Embaralhar leads
    const embaralhados = [...leadsParaDistribuir].sort(() => Math.random() - 0.5);

    // Para redistribuição, excluir clientes anteriores
    if (modo === 'redistribuir') {
      const idsLeads = embaralhados.map(l => l.id);
      const agendaAntiga = await base44.asServiceRole.entities.AgendaContato.list('data_agendada', 10000);
      const paraExcluir = agendaAntiga.filter(a => idsLeads.includes(a.lead_id) && a.status === 'pendente');

      const clientesParaExcluir = embaralhados
        .filter(l => l.cliente_id && !l.convertido)
        .map(l => l.cliente_id);

      // Excluir em paralelo com lotes
      const PARALLEL = 20;
      for (let i = 0; i < paraExcluir.length; i += PARALLEL) {
        await Promise.all(paraExcluir.slice(i, i + PARALLEL).map(a =>
          base44.asServiceRole.entities.AgendaContato.delete(a.id).catch(() => {})
        ));
      }
      for (let i = 0; i < clientesParaExcluir.length; i += PARALLEL) {
        await Promise.all(clientesParaExcluir.slice(i, i + PARALLEL).map(cid =>
          base44.asServiceRole.entities.Cliente.delete(cid).catch(() => {})
        ));
      }
    }

    // Distribuir em paralelo — lotes de 20 simultâneos
    const PARALLEL = 20;
    const resultados = []; // { lead, vendedor, clienteId }

    for (let i = 0; i < embaralhados.length; i += PARALLEL) {
      const batch = embaralhados.slice(i, i + PARALLEL);
      const batchResults = await Promise.all(batch.map(async (lead, bIdx) => {
        const vendedor = vendedoresSelecionados[(i + bIdx) % vendedoresSelecionados.length];
        const cliente = await base44.asServiceRole.entities.Cliente.create({
          nome: lead.nome,
          cpf_cnpj: lead.cpf_cnpj,
          telefone: lead.telefone,
          vendedor_id: vendedor.id,
          vendedor_nome: vendedor.nome,
          origem: 'lead',
          lead_id: lead.id,
          observacao: `Lead importado — lote: ${loteNome}`
        });
        await base44.asServiceRole.entities.Lead.update(lead.id, {
          status: 'distribuido',
          vendedor_id: vendedor.id,
          vendedor_nome: vendedor.nome,
          cliente_id: cliente.id
        });
        return { lead, vendedor, clienteId: cliente.id };
      }));
      resultados.push(...batchResults);
    }

    // Atualizar status do lote
    if (modo === 'distribuir') {
      await base44.asServiceRole.entities.LoteLead.update(loteId, {
        status: 'distribuido',
        distribuido_em: new Date().toISOString(),
        distribuido_por: user.email
      });
    }

    // Gerar agenda automática: 5 leads por dia por gerente
    const LEADS_POR_DIA = 5;
    const hoje = new Date();
    const leadsPorVendedor = {};
    resultados.forEach(({ lead, vendedor, clienteId }) => {
      if (!leadsPorVendedor[vendedor.id]) leadsPorVendedor[vendedor.id] = { vendedor, items: [] };
      leadsPorVendedor[vendedor.id].items.push({ lead, clienteId });
    });

    const agendaRecords = [];
    for (const { vendedor, items } of Object.values(leadsPorVendedor)) {
      items.forEach((item, i) => {
        const diaOffset = Math.floor(i / LEADS_POR_DIA);
        agendaRecords.push({
          lead_id: item.lead.id,
          lead_nome: item.lead.nome,
          lead_cpf_cnpj: item.lead.cpf_cnpj || '',
          lead_telefone: item.lead.telefone || '',
          cliente_id: item.clienteId,
          vendedor_id: vendedor.id,
          vendedor_nome: vendedor.nome,
          data_agendada: format(addDays(hoje, diaOffset), 'yyyy-MM-dd'),
          posicao_dia: (i % LEADS_POR_DIA) + 1,
          lote_id: loteId,
          status: 'pendente'
        });
      });
    }

    // Salvar agenda em lotes de 50
    for (let i = 0; i < agendaRecords.length; i += 50) {
      await base44.asServiceRole.entities.AgendaContato.bulkCreate(agendaRecords.slice(i, i + 50));
    }

    return Response.json({
      success: true,
      total: resultados.length,
      message: `${resultados.length} leads distribuídos entre ${vendedoresSelecionados.length} gerente(s)`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});