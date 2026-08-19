import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Convida um Indicador como USUÁRIO real do app.
// 1. inviteUser aceita apenas 'user'/'admin' → convidamos como 'user'
//    (a plataforma envia o e-mail de convite — dispensa domínio customizado).
// 2. Em seguida promovemos o role para 'indicador' via User.update
//    (validado contra o enum da entidade User, que inclui 'indicador').
// Mantém o link_token do portal público como acesso alternativo (sem login).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin' && user.permissao_admin !== true) {
      return Response.json({ error: 'Apenas administradores podem enviar convites' }, { status: 403 });
    }

    const body = await req.json();
    const { indicador_id } = body;
    if (!indicador_id) return Response.json({ error: 'indicador_id é obrigatório' }, { status: 400 });

    const ind = await base44.entities.Parceiro.get(indicador_id);
    if (!ind) return Response.json({ error: 'Indicador não encontrado' }, { status: 404 });
    if (!ind.email || !ind.email.trim()) {
      return Response.json({ error: 'Cadastre um e-mail válido no indicador antes de enviar o convite' }, { status: 400 });
    }

    const email = ind.email.trim();
    const agora = new Date().toISOString();

    // Gera/mantém o token do portal público (acesso alternativo sem login)
    let token = ind.link_token;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
      await base44.entities.Parceiro.update(indicador_id, {
        link_token: token,
        link_gerado_em: ind.link_gerado_em || agora,
      });
    }

    // 1) Convida como usuário (role 'user') — e-mail disparado pela plataforma
    let jaExistia = false;
    try {
      await base44.users.inviteUser(email, 'user');
    } catch (e) {
      const msg = String(e?.message || e || '').toLowerCase();
      if (msg.includes('already') || msg.includes('exist') || msg.includes('invited') || msg.includes('registered')) {
        jaExistia = true;
      } else {
        return Response.json({ error: 'Falha ao enviar convite: ' + (e?.message || String(e)) }, { status: 500 });
      }
    }

    // 2) Promove o role para 'indicador' (busca o User pelo e-mail)
    let rolePromovido = false;
    try {
      const users = await base44.entities.User.filter({ email });
      if (users.length > 0) {
        // Sinal robusto (boolean sempre setável) + role 'indicador' (best-effort)
        await base44.entities.User.update(users[0].id, { indicador: true, role: 'indicador' });
        rolePromovido = true;
      }
    } catch (e) {
      // Se a plataforma bloquear role custom no update, o usuário permanece 'user'.
      // O admin pode ajustar manualmente em Usuários.
      console.log('role promotion skipped:', e?.message || e);
    }

    await base44.entities.Parceiro.update(indicador_id, {
      convite_enviado: true,
      convite_enviado_em: agora,
      convite_enviado_por: user.email,
    });

    return Response.json({
      success: true,
      enviado_para: email,
      usuario_existia: jaExistia,
      role_indicador: rolePromovido,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}