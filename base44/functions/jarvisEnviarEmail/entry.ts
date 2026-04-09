import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destinatario_email, destinatario_nome, assunto, mensagem } = await req.json();

    if (!destinatario_email || !assunto || !mensagem) {
      return Response.json({ error: 'destinatario_email, assunto e mensagem são obrigatórios' }, { status: 400 });
    }

    // Formatar o corpo do e-mail com HTML simples
    const corpo = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f1e35, #1a3150); padding: 20px 24px; border-radius: 12px 12px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 18px;">Villela Exchange</h2>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 12px;">Mensagem enviada pelo Jarvis</p>
        </div>
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          ${destinatario_nome ? `<p style="color: #374151; margin-bottom: 16px;">Olá, <strong>${destinatario_nome}</strong>!</p>` : ''}
          <div style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${mensagem}</div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">Este e-mail foi enviado pelo Assistente Jarvis — Villela Exchange Gestão Comercial.</p>
        </div>
      </div>
    `;

    await base44.integrations.Core.SendEmail({
      to: destinatario_email,
      subject: assunto,
      body: corpo,
      from_name: 'Jarvis — Villela Exchange',
    });

    return Response.json({
      success: true,
      message: `E-mail enviado com sucesso para ${destinatario_email}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});