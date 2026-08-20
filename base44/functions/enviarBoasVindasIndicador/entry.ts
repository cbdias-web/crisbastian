import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Envia o e-mail de boas-vindas ao indicador APÓS seu primeiro login (cadastro validado).
// Neste momento ele já é um usuário registrado da plataforma, então o SendEmail
// consegue entregar para o endereço dele (restrito a usuários registrados sem domínio próprio).
// Marca Parceiro.boas_vindas_enviada para não disparar duas vezes.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'Usuário sem e-mail' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const appOrigin = (body && body.app_origin) || `https://${req.headers.get('host') || ''}`;

    // Localiza o cadastro de Parceiro pelo e-mail do usuário logado
    const inds = await base44.asServiceRole.entities.Parceiro.filter({ email: user.email });
    if (inds.length === 0) {
      return Response.json({ error: 'Cadastro de indicador não encontrado para este e-mail' }, { status: 404 });
    }
    const ind = inds[0];

    if (ind.boas_vindas_enviada === true) {
      return Response.json({ success: true, already_sent: true });
    }

    // Garante token do portal
    let token = ind.link_token;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
      try {
        await base44.asServiceRole.entities.Parceiro.update(ind.id, {
          link_token: token,
          link_gerado_em: ind.link_gerado_em || new Date().toISOString(),
        });
      } catch (e) {}
    }
    const portalUrl = `${appOrigin.replace(/\/$/, '')}/portal-indicador/${token}`;

    const nome = ind.nome || user.full_name || 'indicador';
    const termoAceito = ind.termo_aceito === true;

    // Parágrafo 1 condicional: se já aceitou o termo, confirma; se não, orienta a homologar o token.
    const paragrafo1 = termoAceito
      ? `Seu cadastro foi formalizado com sucesso. Você aceitou o <strong>Termo de Uso (v1.0)</strong> da plataforma e já pode acompanhar suas indicações.`
      : `Seu cadastro foi formalizado com sucesso. Para ativar seu acesso, acesse o portal e homologue seu token aceitando o <strong>Termo de Uso (v1.0)</strong>.`;

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="background: #0d1b33; padding: 28px 24px; border-radius: 14px 14px 0 0; text-align: center;">
          <h1 style="color: #00f5b4; margin: 0; font-size: 22px; font-weight: 700;">Bem-vindo ao Portal do Indicador 🎉</h1>
          <p style="color: #ffffff; margin: 8px 0 0; font-size: 14px; letter-spacing: 0.5px;">Villela Exchange</p>
        </div>
        <div style="background: #f9f9f9; padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 14px 14px;">
          <p style="color: #1f2937; font-size: 15px; margin: 0 0 16px;">Olá, <strong>${nome}</strong>!</p>
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 14px;">${paragrafo1}</p>
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 14px;">
            Agora você pode cadastrar novas indicações e acompanhar o status de cada lead em tempo real, direto pelo seu portal.
          </p>
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 22px;">
            Você receberá notificações por e-mail sempre que houver movimentações nos seus leads.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${portalUrl}" style="display: inline-block; background: #00f5b4; color: #0d1b33; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none;">Acessar Portal do Indicador</a>
          </div>
          <p style="color: #a0a0a0; font-size: 11px; text-align: center; margin: 22px 0 0;">Villela Exchange – Portal do Indicador</p>
        </div>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: 'Bem-vindo ao Portal do Indicador · Villela Exchange',
      body: html,
      from_name: 'Villela Exchange – Indicadores',
    });

    const agora = new Date().toISOString();
    await base44.asServiceRole.entities.Parceiro.update(ind.id, {
      boas_vindas_enviada: true,
      boas_vindas_enviada_em: agora,
      cadastro_validado: true,
    });

    return Response.json({ success: true, enviado_para: user.email, portal_url: portalUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}