import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { addDays, format } from 'npm:date-fns@3.6.0';

const PARALLEL = 30;

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

    const { mode, assignments, loteId, loteNome, agendaRecords, modo } = await req.json();

    // MODE: processar lote de assignments [{leadId, leadNome, leadCpfCnpj, leadTelefone, leadClienteId, vendedorId, vendedorNome}]
    if (mode === 'batch') {
      const resultados = await runParallel(assignments, async (a) => {
        // Validar que o lead ainda está pendente (evitar duplicação)
        const lead = await base44.asServiceRole.entities.Lead.filter({ id: a.leadId, status: 'pendente' });
        if (lead.length === 0) {
          // Lead já foi distribuído, pular
          return null;
        }
        
        // Se redistribuindo, excluir cliente anterior
        if (modo === 'redistribuir' && a.leadClienteId) {
          await base44.asServiceRole.entities.Cliente.delete(a.leadClienteId).catch(() => {});
        }
        const cliente = await base44.asServiceRole.entities.Cliente.create({
          nome: a.leadNome,
          cpf_cnpj: a.leadCpfCnpj || '',
          telefone: a.leadTelefone || '',
          vendedor_id: a.vendedorId,
          vendedor_nome: a.vendedorNome,
          origem: 'lead',
          lead_id: a.leadId,
          observacao: `Lead importado — lote: ${loteNome}`
        });
        await base44.asServiceRole.entities.Lead.update(a.leadId, {
          status: 'distribuido',
          vendedor_id: a.vendedorId,
          vendedor_nome: a.vendedorNome,
          cliente_id: cliente.id
        });
        return { ...a, clienteId: cliente.id };
      });
      const processados = resultados.filter(r => r !== null);
      return Response.json({ success: true, processed: processados.length, skipped: resultados.length - processados.length
      });
      return Response.json({ success: true, processed: resultados.length });
    }

    // MODE: finalizar — atualizar lote + criar agenda
    if (mode === 'finalizar') {
      // Limpar agenda pendente anterior se redistribuindo
      if (modo === 'redistribuir' && agendaRecords?.length > 0) {
        const leadIds = new Set(agendaRecords.map(r => r.lead_id));
        const agendaAntiga = await base44.asServiceRole.entities.AgendaContato.list('data_agendada', 10000);
        const paraExcluir = agendaAntiga.filter(a => leadIds.has(a.lead_id) && a.status === 'pendente');
        await runParallel(paraExcluir, a => base44.asServiceRole.entities.AgendaContato.delete(a.id).catch(() => {}));
      }

      // Criar agenda em lotes de 100
      if (agendaRecords?.length > 0) {
        for (let i = 0; i < agendaRecords.length; i += 100) {
          await base44.asServiceRole.entities.AgendaContato.bulkCreate(agendaRecords.slice(i, i + 100));
        }
      }

      // Atualizar status do lote
      if (modo === 'distribuir') {
        await base44.asServiceRole.entities.LoteLead.update(loteId, {
          status: 'distribuido',
          distribuido_em: new Date().toISOString(),
          distribuido_por: user.email
        });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'mode inválido' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});