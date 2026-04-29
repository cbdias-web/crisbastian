import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { addDays, format } from 'npm:date-fns@3.6.0';

const PARALLEL = 5;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function withRetry(fn, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const isRateLimit = e?.message?.includes('429') || e?.message?.includes('Rate limit');
      if (isRateLimit && attempt < retries - 1) {
        await sleep(1000 * Math.pow(2, attempt));
      } else {
        throw e;
      }
    }
  }
}

async function runParallel(items, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += PARALLEL) {
    const batch = await Promise.all(items.slice(i, i + PARALLEL).map(fn));
    results.push(...batch);
    if (i + PARALLEL < items.length) await sleep(300);
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

    const { mode, assignments, loteId, loteNome, agendaRecords, modo, subcarteira } = await req.json();

    // MODE: processar lote de assignments [{leadId, leadNome, leadCpfCnpj, leadTelefone, leadClienteId, vendedorId, vendedorNome}]
    if (mode === 'batch') {
      const resultados = await runParallel(assignments, async (a) => {
        // Validar que o lead ainda está pendente (evitar duplicação)
        const lead = await withRetry(() => base44.asServiceRole.entities.Lead.filter({ id: a.leadId, status: 'pendente' }));
        if (lead.length === 0) {
          return null;
        }
        
        // Se redistribuindo, excluir cliente anterior
        if (modo === 'redistribuir' && a.leadClienteId) {
          await base44.asServiceRole.entities.Cliente.delete(a.leadClienteId).catch(() => {});
        }
        const clienteData = {
          nome: a.leadNome,
          cpf_cnpj: a.leadCpfCnpj || '',
          telefone: a.leadTelefone || '',
          vendedor_id: a.vendedorId,
          vendedor_nome: a.vendedorNome,
          origem: 'lead',
          lead_id: a.leadId,
          observacao: `Lead importado — lote: ${loteNome}`
        };
        if (subcarteira) clienteData.subcarteira = subcarteira;
        const cliente = await withRetry(() => base44.asServiceRole.entities.Cliente.create(clienteData));
        await withRetry(() => base44.asServiceRole.entities.Lead.update(a.leadId, {
          status: 'distribuido',
          vendedor_id: a.vendedorId,
          vendedor_nome: a.vendedorNome,
          cliente_id: cliente.id
        }));
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