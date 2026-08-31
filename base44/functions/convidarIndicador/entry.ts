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

    const appOrigin = (body && body.app_origin) || `https://${req.headers.get('host') || ''}`;
    const portalUrl = `${appOrigin.replace(/\/$/, '')}/portal-indicador/${token}`;

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

    // 2) Promove o role para 'indicador' (busca o User pelo e-mail).
    //    Logo após inviteUser o User pode ainda não estar propagado — fazemos
    //    retry com delay. Setamos `indicador: true` PRIMEIRO (boolean sempre
    //    permitido e é o sinal que o Layout usa para redirecionar ao DashParceiro),
    //    e só depois tentamos `role: 'indicador'` (best-effort).
    let rolePromovido = false;
    let userEncontrado = null;
    for (let tentativa = 1; tentativa <= 4 && !userEncontrado; tentativa++) {
      try {
        const users = await base44.entities.User.filter({ email });
        if (users.length > 0) userEncontrado = users[0];
      } catch (e) {}
      if (!userEncontrado) await new Promise(r => setTimeout(r, 600 * tentativa));
    }
    if (userEncontrado) {
      // Usa asServiceRole para garantir a escrita mesmo se houver restrição de RLS
      // e seta TODOS os sinais de restrição de uma vez: flag indicador, role e
      // menus_acesso vazio (cinto de segurança — se o redirect falhar, ela não
      // herda os menus padrão do Layout).
      try {
        await base44.asServiceRole.entities.User.update(userEncontrado.id, {
          indicador: true,
          role: 'indicador',
          menus_acesso: [],
        });
        rolePromovido = true;
      } catch (e) {
        console.log('indicador promotion failed (service role):', e?.message || e);
        // Fallback: client comum (admin logado)
        try {
          await base44.entities.User.update(userEncontrado.id, { indicador: true, menus_acesso: [] });
          rolePromovido = true;
        } catch (e2) {
          console.log('indicador flag set failed (client):', e2?.message || e2);
        }
        try {
          await base44.entities.User.update(userEncontrado.id, { role: 'indicador' });
        } catch (e2) {
          console.log('role promotion skipped:', e2?.message || e2);
        }
      }
    }

    await base44.entities.Parceiro.update(indicador_id, {
      convite_enviado: true,
      convite_enviado_em: agora,
      convite_enviado_por: user.email,
    });

    // E-mail de CONVITE em HTML (diferente do "boas-vindas" enviado no aceite do termo).
    // Este e-mail explica como acessar; o boas-vindas só dispara após o aceite do Termo
    // no PortalIndicadorAuth, evitando duplicidade/confusão para qualquer cadastro.
    let emailPersonalizado = false;
    try {
      const nome = ind.nome || 'indicador';
      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto;">
          <div style="background: #0d1b33; padding: 28px 24px; border-radius: 14px 14px 0 0; text-align: center;">
            <h1 style="color: #00f5b4; margin: 0; font-size: 22px; font-weight: 700;">Convite: Portal do Indicador</h1>
            <p style="color: #ffffff; margin: 8px 0 0; font-size: 14px; letter-spacing: 0.5px;">Villela Exchange</p>
          </div>
          <div style="background: #f9f9f9; padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 14px 14px;">
            <p style="color: #1f2937; font-size: 15px; margin: 0 0 16px;">Olá, <strong>${nome}</strong>!</p>
            <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 14px;">Você foi cadastrado(a) como Indicador(a) da Villela Exchange. Este é o seu convite de acesso.</p>
            <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 14px;">
              Para começar, acesse o portal e homologue seu token aceitando o <strong>Termo de Uso (v1.0)</strong>. Em seguida você verá as opções de indicação e acompanhamento.
            </p>
            <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 14px;">
              Agora você pode cadastrar novas indicações e acompanhar o status de cada lead em tempo real, direto pelo seu portal.
            </p>
            <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 22px;">
              Você receberá notificações por e-mail sempre que houver movimentações nos seus leads.
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${portalUrl}" style="display: inline-block; background: #00f5b4; color: #0d1b33; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none;">Acessar Portal do Indicador</a>
            </div>
            <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 16px 0 0; text-align: center;">
              Seu acesso está vinculado ao e-mail ${email}. Para definir sua senha no primeiro acesso, clique no link de convite enviado pela plataforma (verifique também o spam/promoções). Em acessos posteriores, use este e-mail com sua senha — e o link "Esqueci minha senha" caso precise redefini-la.
            </p>
            <p style="color: #a0a0a0; font-size: 11px; text-align: center; margin: 22px 0 0;">Villela Exchange – Portal do Indicador</p>
          </div>
        </div>
      `;

      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'Convite: Portal do Indicador · Villela Exchange',
        body: html,
        from_name: 'Villela Exchange – Indicadores',
      });
      emailPersonalizado = true;
    } catch (e) {
      console.log('email personalizado falhou (convite nativo já foi enviado):', e?.message || e);
    }

    return Response.json({
      success: true,
      enviado_para: email,
      usuario_existia: jaExistia,
      role_indicador: rolePromovido,
      email_personalizado: emailPersonalizado,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}