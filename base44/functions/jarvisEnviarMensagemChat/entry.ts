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

    const conteudo = remetente_nome
      ? `📢 *Mensagem de ${remetente_nome}:*\n\n${mensagem}`
      : `📢 *Mensagem do Administrador:*\n\n${mensagem}`;

    const resultados = [];

    for (const email of destinatarios_emails) {
      try {
        // Busca usuário pelo email para pegar o ID
        const usuarios = await base44.asServiceRole.entities.User.filter({ email });
        const destinatario = usuarios[0];

        if (!destinatario) {
          resultados.push({ email, status: 'erro', motivo: 'Usuário não encontrado' });
          continue;
        }

        // Lista conversas existentes do usuário com o agente
        const conversas = await base44.asServiceRole.agents.listConversations({
          agent_name: 'assistente_treinamentos',
          user_id: destinatario.id
        });

        let conversa;
        if (conversas && conversas.length > 0) {
          // Usa a conversa mais recente
          conversa = conversas[0];
        } else {
          // Cria nova conversa para o usuário
          conversa = await base44.asServiceRole.agents.createConversation({
            agent_name: 'assistente_treinamentos',
            user_id: destinatario.id,
            metadata: { name: 'Chat com Jarvis' }
          });
        }

        // Envia a mensagem como o assistente (role: assistant)
        await base44.asServiceRole.agents.addMessage(conversa, {
          role: 'assistant',
          content: conteudo
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