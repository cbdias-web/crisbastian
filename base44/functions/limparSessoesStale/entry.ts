import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = base44.asServiceRole;

    // Buscar todas as sessoes marcadas como ativas
    const sessoes = await admin.entities.SessaoUsuario.filter({ ativa: true });
    const staleThresholdMs = Date.now() - 10 * 60 * 1000; // 10 minutos sem heartbeat = stale
    let closed = 0;

    for (const s of sessoes) {
      const hbMs = s.ultimo_heartbeat
        ? new Date(s.ultimo_heartbeat).getTime()
        : (s.inicio ? new Date(s.inicio).getTime() : 0);

      if (hbMs < staleThresholdMs) {
        // Sessao stale: fechar com fim = ultimo heartbeat
        const fim = s.ultimo_heartbeat || s.inicio || new Date().toISOString();
        const inicioMs = s.inicio ? new Date(s.inicio).getTime() : hbMs;
        const duracaoMin = Math.max(0, Math.round((new Date(fim).getTime() - inicioMs) / 1000 / 60));
        try {
          await admin.entities.SessaoUsuario.update(s.id, {
            fim,
            ativa: false,
            duracao_min: duracaoMin,
          });
          closed++;
        } catch (e) {}
      }
    }

    return Response.json({ success: true, closed, totalChecked: sessoes.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});