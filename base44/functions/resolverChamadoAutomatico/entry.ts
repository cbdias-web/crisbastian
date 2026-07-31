// Auto-resolução automática de chamados pelo Jarvis, disparada por automação de entidade
// (evento de criação de ChamadoSuporte). Roda em contexto de service role — sem usuário
// logado — por isso NÃO faz checagem de propriedade. A automação só dispara na criação,
// garantindo que apenas chamados novos sejam processados.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { resolverChamado } from '../../shared/resolverChamadoCore.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = base44.asServiceRole;

    let body = {};
    try { body = await req.json(); } catch {}

    // Payload da automação de entidade: { event: { type, entity_name, entity_id }, data }
    const chamadoId = body.chamado_id || body.event?.entity_id || body.data?.id;
    if (!chamadoId) return Response.json({ error: 'chamado_id obrigatorio' }, { status: 400 });

    const resultado = await resolverChamado(admin, chamadoId, { automatico: true });
    return Response.json(resultado);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});