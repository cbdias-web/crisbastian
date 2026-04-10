import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destinatarios_emails, mensagem, remetente_nome } = await req.json();

    if (!destinatarios_emails || !Array.isArray(destinatarios_emails) || destinatarios_emails.length === 0) {
      return Response.json({ error: 'destinatarios_emails (array) e mensagem são obrigatórios' }, { status: 400 });
    }

    if (!mensagem) {
      return Response.json({ error: 'mensagem é obrigatória' }, { status: 400 });
    }

    const remetente = remetente_nome || user.full_name || 'Administrador';
    const resultados = [];

    for (const email of destinatarios_emails) {
      try {
        // Verifica se o usuário existe
        const usuarios = await base44.asServiceRole.entities.User.filter({ email });
        const destinatario = usuarios[0];

        if (!destinatario) {
          resultados.push({ email, status: 'erro', motivo: 'Usuário não encontrado' });
          continue;
        }

        // Monta saudação personalizada com o primeiro nome do destinatário
        const nomeCompleto = destinatario.data?.nome_tratamento || destinatario.full_name || email.split('@')[0];
        const primeiroNome = nomeCompleto.split(' ')[0];
        const mensagemPersonalizada = `Bom dia, ${primeiroNome}! 👋\n\n${mensagem}`;

        // Salva a mensagem na entidade JarvisMensagem
        await base44.asServiceRole.entities.JarvisMensagem.create({
          destinatario_email: email,
          remetente_nome: remetente,
          mensagem: mensagemPersonalizada,
          lida: false
        });

        resultados.push({ email, status: 'enviado', nome: nomeCompleto });
      } catch (err) {
        resultados.push({ email, status: 'erro', motivo: err.message });
      }
    }

    const enviados = resultados.filter(r => r.status === 'enviado').length;
    const erros = resultados.filter(r => r.status === 'erro').length;

    return Response.json({
      success: true,
      resumo: `${enviados} mensagem(ns) enviada(s) no chat, ${erros} erro(s).`,
      resultados
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});