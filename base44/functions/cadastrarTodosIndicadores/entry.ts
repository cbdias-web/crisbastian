import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Cadastra (convita) TODOS os indicadores ativos que ainda não receberam convite,
// para que a plataforma os reconheça como usuários (pendentes até aceitarem).
// Após o aceite do convite e primeiro login, o e-mail de boas-vindas é disparado
// por enviarBoasVindasIndicador (quando já são usuários registrados).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin' && user.permissao_admin !== true) {
      return Response.json({ error: 'Apenas administradores podem cadastrar indicadores em massa' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const appOrigin = (body && body.app_origin) || `https://${req.headers.get('host') || ''}`;

    const todos = await base44.asServiceRole.entities.Parceiro.list('nome', 500);
    const agora = new Date().toISOString();

    const convidados: any[] = [];
    const jaCadastrados: any[] = [];
    const semEmail: any[] = [];
    const falhas: any[] = [];

    for (const p of todos) {
      if (p.ativo === false) continue;
      if (!p.email || !String(p.email).trim()) { semEmail.push({ id: p.id, nome: p.nome }); continue; }
      if (p.convite_enviado === true) { jaCadastrados.push({ id: p.id, nome: p.nome, email: p.email }); continue; }

      // Gera token do portal público se ainda não existir
      let token = p.link_token;
      if (!token) {
        token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
        try {
          await base44.asServiceRole.entities.Parceiro.update(p.id, {
            link_token: token,
            link_gerado_em: p.link_gerado_em || agora,
          });
        } catch (e) {}
      }

      try {
        await base44.users.inviteUser(p.email.trim(), 'user');
      } catch (e) {
        const msg = String(e?.message || e || '').toLowerCase();
        // Usuário já existe/foi convidado — consideramos como já cadastrado
        if (msg.includes('already') || msg.includes('exist') || msg.includes('invited') || msg.includes('registered')) {
          try {
            const users = await base44.asServiceRole.entities.User.filter({ email: p.email });
            if (users.length > 0) {
              await base44.asServiceRole.entities.User.update(users[0].id, { indicador: true, role: 'indicador' });
            }
          } catch (e2) {}
          await base44.asServiceRole.entities.Parceiro.update(p.id, {
            convite_enviado: true,
            convite_enviado_em: agora,
            convite_enviado_por: user.email,
          });
          jaCadastrados.push({ id: p.id, nome: p.nome, email: p.email });
          continue;
        }
        falhas.push({ id: p.id, nome: p.nome, email: p.email, erro: e?.message || String(e) });
        continue;
      }

      // Promove role para 'indicador' (best-effort)
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email: p.email });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, { indicador: true, role: 'indicador' });
        }
      } catch (e) {}

      await base44.asServiceRole.entities.Parceiro.update(p.id, {
        convite_enviado: true,
        convite_enviado_em: agora,
        convite_enviado_por: user.email,
      });
      convidados.push({ id: p.id, nome: p.nome, email: p.email, portal_url: `${appOrigin.replace(/\/$/, '')}/portal-indicador/${token}` });
    }

    return Response.json({
      success: true,
      total: todos.length,
      convidados: convidados.length,
      ja_cadastrados: jaCadastrados.length,
      sem_email: semEmail.length,
      falhas: falhas.length,
      convidados_lista: convidados,
      ja_cadastrados_lista: jaCadastrados,
      sem_email_lista: semEmail,
      falhas_lista: falhas,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}