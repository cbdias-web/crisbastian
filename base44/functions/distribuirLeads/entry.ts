import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { addDays, format } from 'npm:date-fns@3.6.0';

const PARALLEL = 100;

async function runParallel(items, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += PARALLEL) {
    const batch = await Promise.all(items.slice(i, i + PARALLEL).map(fn));
    results.push(...batch);
  }
  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && !user.permissao_admin)) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { loteId, loteNome, vendedoresIds, modo } = await req.json();

    const todosVendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true });
    const vendedoresSelecionados = todosVendedores.filter(v => vendedoresIds.includes(v.id));
    if (vendedoresSelecionados.length === 0) {
      return Response.json({ error: 'Nenhum vendedor selecionado' }, { status: 400 });
    }

    // Buscar leads do lote
    const todosLeads = await base44.asServiceRole.entities.Lead.filter({ lote_id: loteId }, 'nome', 10000);
    let leadsParaDistribuir = modo === 'distribuir'
      ? todosLeads.filter(l => l.status === 'pendente')
      : todosLeads.filter(l => l.status === 'distribuido' && !l.convertido);

    if (leadsParaDistribuir.length === 0) {
      return Response.json({ message: 'Nenhum lead disponível para distribuição', total: 0 });
    }

    // Para redistribuição: limpar clientes e agenda anteriores em paralelo
    if (modo === 'redistribuir') {
      const idsLeads = new Set(leadsParaDistribuir.map(l => l.id));
      const [agendaAntiga] = await Promise.all([
        base44.asServiceRole.entities.AgendaContato.list('data_agendada', 10000),
      ]);
      const agendaParaExcluir = agendaAntiga.filter(a => idsLeads.has(a.lead_id) && a.status === 'pendente');
      const clientesParaExcluir = leadsParaDistribuir.filter(l => l.cliente_id && !l.convertido).map(l => l.cliente_id);

      await Promise.all([
        runParallel(agendaParaExcluir, a => base44.asServiceRole.entities.AgendaContato.delete(a.id).catch(() => {})),
        runParallel(clientesParaExcluir, cid => base44.asServiceRole.entities.Cliente.delete(cid).catch(() => {})),
      ]);
    }

    // Embaralhar e atribuir vendedor a cada lead
    const embaralhados = [...leadsParaDistribuir].sort(() => Math.random() - 0.5);
    const atribuicoes = embaralhados.map((lead, i) => ({
      lead,
      vendedor: vendedoresSelecionados[i % vendedoresSelecionados.length],
    }));

    // FASE 1: Criar todos os Clientes em paralelo
    const clientesCriados = await runParallel(atribuicoes, async ({ lead, vendedor }) => {
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
      return { lead, vendedor, clienteId: cliente.id };
    });

    // FASE 2: Atualizar todos os Leads em paralelo
    await runParallel(clientesCriados, ({ lead, vendedor, clienteId }) =>
      base44.asServiceRole.entities.Lead.update(lead.id, {
        status: 'distribuido',
        vendedor_id: vendedor.id,
        vendedor_nome: vendedor.nome,
        cliente_id: clienteId
      })
    );

    // Atualizar status do lote
    if (modo === 'distribuir') {
      await base44.asServiceRole.entities.LoteLead.update(loteId, {
        status: 'distribuido',
        distribuido_em: new Date().toISOString(),
        distribuido_por: user.email
      });
    }

    // FASE 3: Gerar agenda automática (5 leads por dia por gerente)
    const LEADS_POR_DIA = 5;
    const hoje = new Date();
    const leadsPorVendedor = {};
    clientesCriados.forEach(({ lead, vendedor, clienteId }) => {
      if (!leadsPorVendedor[vendedor.id]) leadsPorVendedor[vendedor.id] = { vendedor, items: [] };
      leadsPorVendedor[vendedor.id].items.push({ lead, clienteId });
    });

    const agendaRecords = [];
    for (const { vendedor, items } of Object.values(leadsPorVendedor)) {
      items.forEach((item, i) => {
        agendaRecords.push({
          lead_id: item.lead.id,
          lead_nome: item.lead.nome,
          lead_cpf_cnpj: item.lead.cpf_cnpj || '',
          lead_telefone: item.lead.telefone || '',
          cliente_id: item.clienteId,
          vendedor_id: vendedor.id,
          vendedor_nome: vendedor.nome,
          data_agendada: format(addDays(hoje, Math.floor(i / LEADS_POR_DIA)), 'yyyy-MM-dd'),
          posicao_dia: (i % LEADS_POR_DIA) + 1,
          lote_id: loteId,
          status: 'pendente'
        });
      });
    }

    // bulkCreate agenda em lotes de 100
    for (let i = 0; i < agendaRecords.length; i += 100) {
      await base44.asServiceRole.entities.AgendaContato.bulkCreate(agendaRecords.slice(i, i + 100));
    }

    return Response.json({
      success: true,
      total: clientesCriados.length,
      message: `${clientesCriados.length} leads distribuídos entre ${vendedoresSelecionados.length} gerente(s). Agenda gerada.`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});