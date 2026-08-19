import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Reverte o status de LeadIndicacao quando a Venda, o Contrato ou o Cliente
// vinculado é excluído — evita que o Portal do Indicador exiba conversões
// (e gere expectativa de comissão) para contratos/vendas que não existem mais.
// Disparado por automações de entidade (event_types=["delete"]).
//
// Payload: { event: { type, entity_name, entity_id }, data, payload_too_large }
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const event = body?.event || {};
    const data = body?.data;
    const eventType = event.type;
    const entityName = event.entity_name;
    const entityId = event.entity_id || data?.id;

    if (eventType !== 'delete' || !entityId || !entityName) {
      return Response.json({ skipped: true, reason: 'not a delete event' });
    }

    const campoRef =
      entityName === 'Venda' ? 'venda_id'
      : entityName === 'Contrato' ? 'contrato_id'
      : entityName === 'Cliente' ? 'cliente_id'
      : null;

    if (!campoRef) return Response.json({ skipped: true, reason: 'entity not relevant' });

    // Encontra todas as LeadIndicacao que referenciam o registro excluído
    const leads = await base44.asServiceRole.entities.LeadIndicacao.filter({ [campoRef]: entityId });

    let revertidas = 0;
    for (const li of leads as any[]) {
      const newVendaId = entityName === 'Venda' ? null : li.venda_id;
      const newContratoId = entityName === 'Contrato' ? null : li.contrato_id;
      const newClienteId = entityName === 'Cliente' ? null : li.cliente_id;

      // Revalida as relações que NÃO foram excluídas (podem ter sido removidas antes)
      const vendaOk = !!newVendaId && await existe(base44, 'Venda', newVendaId);
      const contratoOk = !!newContratoId && await existe(base44, 'Contrato', newContratoId);
      const clienteOk = !!newClienteId && await existe(base44, 'Cliente', newClienteId);

      // Prioridade: venda > contrato > cliente > atendimento
      let novoStatus = 'em_atendimento';
      let convertido = false;
      if (vendaOk) { novoStatus = 'convertido_venda'; convertido = true; }
      else if (contratoOk) { novoStatus = 'convertido_contrato'; convertido = true; }
      else if (clienteOk) { novoStatus = 'convertido_cliente'; convertido = true; }

      const update: any = {
        [campoRef]: null,
        status: novoStatus,
        convertido,
      };

      try {
        await base44.asServiceRole.entities.LeadIndicacao.update(li.id, update);
        revertidas++;
      } catch (e) {
        console.log('Falha ao reverter LeadIndicacao', li.id, e.message);
      }
    }

    return Response.json({ ok: true, entity: entityName, entityId, revertidas });
  } catch (error) {
    console.error('Erro reverterIndicacaoExclusao:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function existe(base44: any, entity: string, id: string): Promise<boolean> {
  try {
    const rec = await base44.asServiceRole.entities[entity].get(id);
    return !!rec;
  } catch {
    return false;
  }
}