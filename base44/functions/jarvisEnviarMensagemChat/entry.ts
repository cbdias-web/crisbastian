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
    const conteudoAssistente = `📢 *Mensagem de ${remetente}:*\n\n${mensagem}`;

    const resultados = [];

    for (const email of destinatarios_emails) {
      try {
        // Busca usuário pelo email
        const usuarios = await base44.asServiceRole.entities.User.filter({ email });
        const destinatario = usuarios[0];

        if (!destinatario) {
          resultados.push({ email, status: 'erro', motivo: 'Usuário não encontrado' });
          continue;
        }

        // Sempre cria uma nova conversa para a notificação
        const conversa = await base44.asServiceRole.agents.createConversation({
          agent_name: 'assistente_treinamentos',
          user_id: destinatario.id,
          metadata: { name: `Notificação - ${new Date().toLocaleDateString('pt-BR')}` }
        });

        // A API exige uma mensagem de usuário antes de uma mensagem de assistente
        // Enviamos uma mensagem "gatilho" oculta para o agente processar
        await base44.asServiceRole.agents.addMessage(conversa, {
          role: 'user',
          content: `[NOTIFICAÇÃO INTERNA - NÃO RESPONDER AUTOMATICAMENTE] ${conteudoAssistente}`
        });

        resultados.push({ email, status: 'enviado', nome: destinatario.full_name });
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