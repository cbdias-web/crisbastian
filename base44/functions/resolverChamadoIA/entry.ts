import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { resolverChamado } from '../../shared/resolverChamadoCore.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const chamadoId = body.chamado_id;
    if (!chamadoId) return Response.json({ error: 'chamado_id obrigatorio' }, { status: 400 });

    const admin = base44.asServiceRole;
    const chamado = await admin.entities.ChamadoSuporte.get(chamadoId);
    if (!chamado) return Response.json({ error: 'Chamado nao encontrado' }, { status: 404 });

    // Autorizacao: admin OU dono do chamado
    const isAdm = user.role === 'admin' || user.permissao_admin === true;
    const isOwner = chamado.usuario_id === user.id || chamado.usuario_email === user.email;
    if (!isAdm && !isOwner) {
      return Response.json({ error: 'Voce so pode resolver seus proprios chamados.' }, { status: 403 });
    }

    const resultado = await resolverChamado(admin, chamadoId, { automatico: false });
    return Response.json(resultado);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});