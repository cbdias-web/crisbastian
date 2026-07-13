import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = base44.asServiceRole;

    let body = {};
    try { body = await req.json(); } catch {}

    const nowIso = new Date().toISOString();

    // Fechar sessao especifica por ID
    if (body.session_id && !body.close_all) {
      try {
        const session = await admin.entities.SessaoUsuario.get(body.session_id);
        if (session && session.ativa) {
          const fim = body.fim || nowIso;
          const inicioMs = new Date(session.inicio).getTime();
          const duracaoMin = Math.max(0, Math.round((new Date(fim).getTime() - inicioMs) / 1000 / 60));
          await admin.entities.SessaoUsuario.update(body.session_id, {
            fim,
            ativa: false,
            duracao_min: duracaoMin,
            ultimo_heartbeat: fim,
          });
        }
      } catch (e) {
        // Sessao pode nao existir mais
      }
      return Response.json({ success: true, action: 'closed' });
    }

    // Fechar todas as sessoes ativas de um usuario (cleanup no login)
    if (body.user_id && body.close_all) {
      const sessions = await admin.entities.SessaoUsuario.filter({ user_id: body.user_id, ativa: true });
      let closed = 0;
      for (const s of sessions) {
        const fim = s.ultimo_heartbeat || nowIso;
        const duracaoMin = Math.max(0, Math.round((new Date(fim).getTime() - new Date(s.inicio).getTime()) / 1000 / 60));
        try {
          await admin.entities.SessaoUsuario.update(s.id, {
            fim,
            ativa: false,
            duracao_min: duracaoMin,
          });
          closed++;
        } catch (e) {}
      }
      return Response.json({ success: true, action: 'cleanup', closed });
    }

    return Response.json({ error: 'No action specified' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});