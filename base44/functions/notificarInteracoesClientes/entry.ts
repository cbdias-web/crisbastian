import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const hoje = new Date().toISOString().split('T')[0];

    // Busca todos os usuários ativos
    const usuarios = await base44.asServiceRole.entities.User.list();
    const vendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true });

    // Contagem de interações de hoje por vendedor
    const interacoesHoje = await base44.asServiceRole.entities.InteracaoCliente.list('-data_interacao');
    const interacoesDeHoje = interacoesHoje.filter(i => i.data_interacao === hoje);

    let enviados = 0;
    let erros = 0;

    for (const usuario of usuarios) {
      if (!usuario.email) continue;

      // Encontra o vendedor vinculado ao usuário
      const vendedor = vendedores.find(v => v.email?.toLowerCase() === usuario.email?.toLowerCase());
      const nomeVendedor = vendedor?.nome || usuario.full_name || usuario.email;

      // Conta interações de hoje deste vendedor
      const contagemHoje = vendedor
        ? interacoesDeHoje.filter(i => i.vendedor_id === vendedor.id).length
        : 0;

      if (contagemHoje >= 3) continue; // Já atingiu a meta, não precisa notificar

      const restantes = 3 - contagemHoje;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 0;">
          <div style="background: linear-gradient(135deg, #0f1e35 0%, #1a3150 100%); padding: 30px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">Villela Exchange</h1>
            <p style="color: rgba(147,197,253,0.8); margin: 4px 0 0; font-size: 13px;">Gestao Comercial</p>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">Ola, <strong>${nomeVendedor}</strong>!</p>

            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px;">
              <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">
                📋 Lembrete Diario - Interacoes com Clientes
              </p>
              <p style="color: #78350f; font-size: 13px; margin: 8px 0 0;">
                Voce registrou <strong>${contagemHoje} interacao${contagemHoje !== 1 ? 'oes' : ''}</strong> hoje.
                Ainda ${restantes > 1 ? 'faltam' : 'falta'} <strong>${restantes} interacao${restantes !== 1 ? 'oes'  : ''}</strong> para atingir a meta diaria de 3.
              </p>
            </div>

            <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
              Mantenha o relacionamento com sua carteira de clientes em dia.
              Acesse o sistema e registre suas interacoes de hoje.
            </p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="#"
                style="background: #0f1e35; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                Acessar Meus Clientes
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
              Villela Exchange - Gestao Comercial &bull; Este e um lembrete automatico diario
            </p>
          </div>
        </div>
      `;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: usuario.email,
          subject: `[Lembrete] Interacoes com clientes - ${contagemHoje}/3 realizadas hoje`,
          body: htmlBody,
          from_name: 'Villela Exchange'
        });
        enviados++;
      } catch (e) {
        erros++;
      }
    }

    return Response.json({ success: true, enviados, erros, data: hoje });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});