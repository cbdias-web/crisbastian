import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { event, data } = body;

    // Só processa criação
    if (event?.type !== 'create') {
      return Response.json({ ok: true, skipped: true });
    }

    const contrato = data;
    if (!contrato) return Response.json({ error: 'Dados do contrato não encontrados' }, { status: 400 });

    // Buscar todos os admins
    const usuarios = await base44.asServiceRole.entities.User.list();
    const admins = usuarios.filter(u => u.role === 'admin' && u.email);

    if (admins.length === 0) {
      console.log('Nenhum admin encontrado para notificar.');
      return Response.json({ ok: true, admins_notificados: 0 });
    }

    const fmtVal = (v) => v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
    const nomeTipo = contrato.tipo || '—';
    const nomeCliente = contrato.nome || '—';
    const cpfCnpj = contrato.cpf_cnpj || '—';
    const vendedor = contrato.vendedor_nome || '—';
    const valorTotal = fmtVal(contrato.valor_total || contrato.valor_adesao);

    const subject = `📄 Novo Contrato — ${nomeTipo} · ${nomeCliente}`;

    const body_html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0f1e35, #1a3150); padding: 24px; border-radius: 12px 12px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 20px;">📄 Novo Contrato Gerado</h2>
          <p style="color: rgba(255,255,255,0.6); margin: 6px 0 0; font-size: 13px;">Villela Exchange – Gestão Comercial</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">Um novo contrato foi criado na plataforma e precisa de atenção:</p>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="background: white; border: 1px solid #e5e7eb;">
              <td style="padding: 10px 14px; color: #6b7280; font-weight: 600; width: 40%;">Tipo</td>
              <td style="padding: 10px 14px; color: #111827; font-weight: 700;">${nomeTipo}</td>
            </tr>
            <tr style="background: #f9fafb; border: 1px solid #e5e7eb;">
              <td style="padding: 10px 14px; color: #6b7280; font-weight: 600;">Cliente</td>
              <td style="padding: 10px 14px; color: #111827;">${nomeCliente}</td>
            </tr>
            <tr style="background: white; border: 1px solid #e5e7eb;">
              <td style="padding: 10px 14px; color: #6b7280; font-weight: 600;">CPF / CNPJ</td>
              <td style="padding: 10px 14px; color: #111827;">${cpfCnpj}</td>
            </tr>
            <tr style="background: #f9fafb; border: 1px solid #e5e7eb;">
              <td style="padding: 10px 14px; color: #6b7280; font-weight: 600;">Gerente</td>
              <td style="padding: 10px 14px; color: #111827;">${vendedor}</td>
            </tr>
            <tr style="background: white; border: 1px solid #e5e7eb;">
              <td style="padding: 10px 14px; color: #6b7280; font-weight: 600;">Valor Total</td>
              <td style="padding: 10px 14px; color: #1a3150; font-weight: 700; font-size: 15px;">${valorTotal}</td>
            </tr>
          </table>

          <div style="margin-top: 20px; padding: 14px 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
            <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 600;">⚠️ Ação necessária</p>
            <p style="margin: 6px 0 0; color: #78350f; font-size: 13px;">
              Acesse a plataforma, abra este contrato e adicione o <strong>link de assinatura online</strong> para que o gerente possa enviar ao cliente.
            </p>
          </div>

          <p style="margin: 20px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
            Villela Exchange – Gestão Comercial · Notificação automática
          </p>
        </div>
      </div>
    `;

    let enviados = 0;
    for (const admin of admins) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject,
          body: body_html,
        });
        enviados++;
      } catch (e) {
        console.log(`Erro ao enviar para ${admin.email}: ${e.message}`);
      }
    }

    console.log(`Notificação de novo contrato enviada para ${enviados} admin(s).`);
    return Response.json({ ok: true, admins_notificados: enviados });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});