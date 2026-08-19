import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Envia um e-mail de convite ao Indicador com o link do portal exclusivo.
// Admin-only. Gera o link_token se ainda não existir e marca convite_enviado.
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

    // Gera token se não existir
    let token = ind.link_token;
    const agora = new Date().toISOString();
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
    }

    const origin = (() => { try { return new URL(req.url).origin; } catch (e) { return ''; } })();
    const link = `${origin}/portal-indicador/${token}`;

    await base44.entities.Parceiro.update(indicador_id, {
      link_token: token,
      link_gerado_em: ind.link_gerado_em || agora,
      convite_enviado: true,
      convite_enviado_em: agora,
      convite_enviado_por: user.email,
    });

    const body_html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0d1117, #1a1a2e 60%, #16213e); padding: 28px 24px; border-radius: 14px 14px 0 0;">
          <h2 style="color: #00D4AA; margin: 0; font-size: 22px;">Convite · Indicador Villela Exchange</h2>
          <p style="color: rgba(230,237,243,0.6); margin: 8px 0 0; font-size: 13px;">Portal exclusivo de Indicadores</p>
        </div>
        <div style="background: #f8fafc; padding: 28px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 14px 14px;">
          <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">Olá, <strong>${ind.nome}</strong>!</p>
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
            Você foi cadastrado como <strong>Indicador</strong> da Villela Exchange. A partir do portal exclusivo você poderá:
          </p>
          <ul style="color: #374151; font-size: 14px; line-height: 1.7; margin: 0 0 20px; padding-left: 20px;">
            <li>Cadastrar suas indicações (leads)</li>
            <li>Acompanhar o status e a jornada de cada lead</li>
            <li>Receber notificações sobre movimentações e conversões</li>
            <li>Visualizar suas comissões/espelhamentos</li>
          </ul>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${link}" style="display: inline-block; background: #00D4AA; color: #0d1117; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px; text-decoration: none;">Acessar o Portal do Indicador</a>
          </div>
          <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 16px 0 0;">
            No primeiro acesso você deverá formalizar seu cadastro aceitando o <strong>Termo de Uso</strong> da plataforma.
            Guarde este link — ele é o seu acesso pessoal ao portal.
          </p>
          <p style="margin: 20px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
            Villela Exchange – Gestão Comercial · Convite automático
          </p>
        </div>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: ind.email,
      subject: `Convite · Portal do Indicador · Villela Exchange`,
      body: body_html,
      from_name: 'Villela Exchange – Indicadores',
    });

    return Response.json({ success: true, link, enviado_para: ind.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}