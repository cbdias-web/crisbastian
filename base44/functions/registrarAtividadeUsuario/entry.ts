import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = base44.asServiceRole;
    let body = {};
    try { body = await req.json(); } catch {}

    const pagina = body.pagina || null;
    const agora = new Date().toISOString();
    const sessionIdStored = body.session_id || null;

    // ─── 1. Criar ou reusar sessão (service role) ───
    let sessaoId = sessionIdStored;
    let sessaoReused = false;

    // Tentar reusar sessão existente
    if (sessaoId) {
      try {
        const existing = await admin.entities.SessaoUsuario.get(sessaoId);
        if (existing && existing.user_id === user.id) {
          const heartbeatAge = existing.ultimo_heartbeat
            ? (Date.now() - new Date(existing.ultimo_heartbeat).getTime()) / 1000 / 60
            : 999;
          if (existing.ativa || heartbeatAge <= 10) {
            await admin.entities.SessaoUsuario.update(sessaoId, {
              ativa: true,
              fim: null,
              ultimo_heartbeat: agora,
            });
            sessaoReused = true;
          }
        }
      } catch (e) {
        // Sessão não existe mais
      }
    }

    // Se não reusou, tentar buscar sessão ativa do usuário
    if (!sessaoReused && !sessaoId) {
      try {
        const ativas = await admin.entities.SessaoUsuario.filter({ user_id: user.id, ativa: true });
        if (ativas.length > 0) {
          const existing = ativas[0];
          const heartbeatAge = existing.ultimo_heartbeat
            ? (Date.now() - new Date(existing.ultimo_heartbeat).getTime()) / 1000 / 60
            : 999;
          if (heartbeatAge <= 10) {
            await admin.entities.SessaoUsuario.update(existing.id, {
              fim: null,
              ultimo_heartbeat: agora,
            });
            sessaoId = existing.id;
            sessaoReused = true;
          }
        }
      } catch (e) {}
    }

    // Criar nova sessão se necessário
    if (!sessaoReused) {
      // Fechar sessões antigas ativas
      try {
        const ativas = await admin.entities.SessaoUsuario.filter({ user_id: user.id, ativa: true });
        for (const s of ativas) {
          const fim = s.ultimo_heartbeat || agora;
          const duracaoMin = Math.max(0, Math.round((new Date(fim).getTime() - new Date(s.inicio).getTime()) / 1000 / 60));
          try {
            await admin.entities.SessaoUsuario.update(s.id, { fim, ativa: false, duracao_min: duracaoMin });
          } catch (e) {}
        }
      } catch (e) {}

      // Criar nova sessão
      try {
        const sessao = await admin.entities.SessaoUsuario.create({
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name || user.nome_tratamento || '',
          inicio: agora,
          ativa: true,
          ultimo_heartbeat: agora,
          duracao_min: 0,
        });
        sessaoId = sessao.id;
      } catch (e) {
        return Response.json({ error: 'Falha ao criar sessão: ' + e.message }, { status: 500 });
      }
    }

    // ─── 2. Registrar navegação (se pagina fornecida) ───
    if (pagina) {
      try {
        await admin.entities.NavegacaoUsuario.create({
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name || user.nome_tratamento || '',
          pagina,
          acessado_em: agora,
        });
      } catch (e) {
        // Navegação é best-effort
      }
    }

    // ─── 3. Atualizar ultimo_acesso no User ───
    try {
      await admin.entities.User.update(user.id, { ultimo_acesso: agora });
    } catch (e) {}

    return Response.json({ success: true, session_id: sessaoId, sessao_reused: sessaoReused });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});