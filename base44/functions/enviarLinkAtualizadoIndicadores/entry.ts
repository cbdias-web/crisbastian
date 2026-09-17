import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Envia o link de acesso ATUALIZADO do Portal do Indicador para todos os
// indicadores cadastrados (com e-mail), informando que o link anterior
// foi substituído. Admin-only. dry_run=true apenas valida sem disparar e-mails.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin' && user.permissao_admin !== true) {
      return Response.json({ error: 'Apenas administradores podem executar esta ação' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const origin = ((body && body.app_origin) || `https://${req.headers.get('host') || ''}`).replace(/\/$/, '');
    const dryRun = body && body.dry_run === true;

    const parceiros = await base44.entities.Parceiro.list('nome', 500);
    const comEmail = parceiros.filter(p => p.email && p.email.trim());
    const semEmail = parceiros.filter(p => !p.email || !p.email.trim()).map(p => p.nome);

    if (dryRun) {
      return Response.json({
        dry_run: true,
        total: parceiros.length,
        com_email: comEmail.length,
        sem_email: semEmail,
      });
    }

    const agora = new Date().toISOString();
    const enviados = [];
    const falhas = [];

    for (const p of comEmail) {
      const email = p.email.trim();
      try {
        // Garante o token do portal (gera e persiste se ainda não existir)
        let token = p.link_token;
        if (!token) {
          token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
          await base44.entities.Parceiro.update(p.id, {
            link_token: token,
            link_gerado_em: p.link_gerado_em || agora,
          });
        }
        const portalUrl = `${origin}/portal-indicador/${token}`;
        const nome = p.nome || 'indicador';

        const html = `
          <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto;">
            <div style="background: #0d1b33; padding: 28px 24px; border-radius: 14px 14px 0 0; text-align: center;">
              <h1 style="color: #00f5b4; margin: 0; font-size: 22px; font-weight: 700;">Link de acesso atualizado</h1>
              <p style="color: #ffffff; margin: 8px 0 0; font-size: 14px; letter-spacing: 0.5px;">Portal do Indicador · Villela Exchange</p>
            </div>
            <div style="background: #f9f9f9; padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 14px 14px;">
              <p style="color: #1f2937; font-size: 15px; margin: 0 0 16px;">Olá, <strong>${nome}</strong>!</p>
              <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 14px;">
                Nosso Portal do Indicador passou por uma atualização de endereço e o <strong>link de acesso anterior não deve mais ser utilizado</strong>.
              </p>
              <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 22px;">
                A partir de agora, acesse o portal <strong>sempre pelo novo link abaixo</strong>. Recomendamos salvá-lo ou adicioná-lo aos favoritos do seu navegador.
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${portalUrl}" style="display: inline-block; background: #00f5b4; color: #0d1b33; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none;">Acessar o Portal do Indicador</a>
              </div>
              <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 16px 0 0; text-align: center; word-break: break-all;">
                Novo link: ${portalUrl}
              </p>
              <p style="color: #a0a0a0; font-size: 11px; text-align: center; margin: 22px 0 0;">Villela Exchange – Portal do Indicador</p>
            </div>
          </div>
        `;

        await base44.integrations.Core.SendEmail({
          to: email,
          subject: 'Link de acesso atualizado: Portal do Indicador · Villela Exchange',
          body: html,
          from_name: 'Villela Exchange – Indicadores',
        });
        enviados.push(nome);
      } catch (e) {
        falhas.push({ nome: p.nome, email, motivo: e?.message || String(e) });
      }
      // Pausa curta entre disparos para não estourar limites de envio
      await new Promise(r => setTimeout(r, 300));
    }

    return Response.json({
      total: parceiros.length,
      enviados,
      falhas,
      sem_email: semEmail,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}