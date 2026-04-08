import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PARALLEL = 20;
async function runParallel(items, fn) {
  for (let i = 0; i < items.length; i += PARALLEL) {
    await Promise.all(items.slice(i, i + PARALLEL).map(fn));
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && !user.permissao_admin)) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { loteId, vendedorId } = await req.json();
    if (!loteId) return Response.json({ error: 'loteId obrigatório' }, { status: 400 });

    // Buscar leads do lote (filtrar por vendedor se informado)
    const leads = await base44.asServiceRole.entities.Lead.filter({ lote_id: loteId, status: 'distribuido' });
    const leadsFiltrados = vendedorId ? leads.filter(l => l.vendedor_id === vendedorId) : leads;

    let clientesExcluidos = 0;
    let leadsRevertidos = 0;

    // Para cada lead: excluir cliente vinculado + resetar lead para pendente
    await runParallel(leadsFiltrados, async (lead) => {
      // Excluir interações do cliente (se houver)
      if (lead.cliente_id) {
        const interacoes = await base44.asServiceRole.entities.InteracaoCliente.filter({ cliente_id: lead.cliente_id }).catch(() => []);
        await runParallel(interacoes, i => base44.asServiceRole.entities.InteracaoCliente.delete(i.id).catch(() => {}));
        // Excluir agendas vinculadas
        const agendas = await base44.asServiceRole.entities.AgendaContato.filter({ lead_id: lead.id }).catch(() => []);
        await runParallel(agendas, a => base44.asServiceRole.entities.AgendaContato.delete(a.id).catch(() => {}));
        // Excluir cliente
        await base44.asServiceRole.entities.Cliente.delete(lead.cliente_id).catch(() => {});
        clientesExcluidos++;
      }
      // Resetar lead para pendente
      await base44.asServiceRole.entities.Lead.update(lead.id, {
        status: 'pendente',
        vendedor_id: '',
        vendedor_nome: '',
        cliente_id: ''
      });
      leadsRevertidos++;
    });

    // Se todos os leads do lote foram revertidos, resetar status do lote
    const leadsRestantes = await base44.asServiceRole.entities.Lead.filter({ lote_id: loteId, status: 'distribuido' });
    if (leadsRestantes.length === 0) {
      await base44.asServiceRole.entities.LoteLead.update(loteId, { status: 'pendente' });
    }

    return Response.json({ success: true, clientesExcluidos, leadsRevertidos });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});