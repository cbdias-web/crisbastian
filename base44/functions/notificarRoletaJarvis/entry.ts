import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { usuarios, tipo } = await req.json();

    if (!usuarios || !Array.isArray(usuarios) || usuarios.length === 0) {
      return Response.json({ error: 'usuarios (array) é obrigatório' }, { status: 400 });
    }

    const tipoRoleta = tipo || 'default';
    const tipoLabel = tipoRoleta === 'brincadeira' ? 'Roleta da Brincadeira 🎉' : 'Roleta de Prêmios 🎁';

    let enviados = 0;
    const resultados = [];

    for (const u of usuarios) {
      if (!u.email) {
        resultados.push({ id: u.id, status: 'erro', motivo: 'Sem e-mail' });
        continue;
      }

      const nome = u.nome || u.full_name || u.email.split('@')[0];
      const primeiroNome = nome.split(' ')[0];

      const mensagem = `🎁 *Roleta Liberada!*\n\n` +
        `Olá, ${primeiroNome}! O administrador liberou uma rodada da *${tipoLabel}* para você.\n\n` +
        `Acesse o Dashboard e clique na roleta para girar e descobrir seu prêmio! 🎯`;

      try {
        await base44.asServiceRole.entities.JarvisMensagem.create({
          destinatario_email: u.email,
          remetente_nome: 'Jarvis',
          remetente_email: 'jarvis@villelaexchange.com',
          mensagem,
          lida: false,
        });
        enviados++;
        resultados.push({ id: u.id, email: u.email, status: 'enviado' });
      } catch (err) {
        resultados.push({ id: u.id, status: 'erro', motivo: err.message });
      }
    }

    return Response.json({
      success: true,
      enviados,
      total: usuarios.length,
      resultados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});