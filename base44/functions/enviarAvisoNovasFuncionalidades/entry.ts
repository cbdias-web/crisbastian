import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MENSAGEM_JARVIS = `🚀 *Novidades na plataforma Villela Exchange!*

Implantamos novas funcionalidades que vão facilitar muito o seu dia a dia:

📄 *Módulo de Contratos*
• Gere contratos digitais (Conta Global, Conta Internacional e Dolarize Aqui) direto pela plataforma.
• Assine, registre pagamento e envie para Vendas com apenas alguns cliques.
• Todo o fluxo: criação → PDF → assinatura → pagamento → venda, tudo integrado.

🔄 *Pipeline integrado aos Contratos*
• Prospecções com produtos de contrato agora criam o contrato automaticamente ao converter.
• Parcelas vincendas continuam sendo gerenciadas no Pipeline normalmente.

👥 *Meus Clientes*
• Clientes de contratos são cadastrados automaticamente na sua carteira ao salvar o contrato.

🔔 *Notificações aprimoradas*
• Administradores recebem alerta automático (Jarvis + e-mail) sempre que um novo contrato é criado, para adicionar o link de assinatura online.

📖 *Manual atualizado*
• O Manual da plataforma foi atualizado com todas as instruções detalhadas sobre os novos fluxos. Acesse pelo menu lateral em Apoio > Manual.

Qualquer dúvida, consulte o Manual ou fale com o administrador. Bons negócios! 💼`;

const TITULO_COMUNICADO = '🚀 Novidades na Plataforma — Contratos, Pipeline e muito mais!';

const MENSAGEM_COMUNICADO = `Olá, time! 👋

Temos novidades importantes que vão transformar o seu fluxo de trabalho:

📄 MÓDULO DE CONTRATOS
Agora você pode gerar, gerenciar e acompanhar contratos de clientes diretamente na plataforma. Disponível para: Conta Global, Conta Internacional e Dolarize Aqui.

• Acesse pelo menu lateral em Apoio → Contratos
• Gere o PDF automaticamente com dados do cliente
• Acompanhe todo o ciclo: assinatura → pagamento → venda

🔄 PIPELINE INTEGRADO
Prospecções com produtos de contrato agora convertem diretamente para Contratos (em vez de Vendas), criando o contrato automaticamente com os dados já preenchidos.

👥 MEUS CLIENTES
Clientes de contratos são cadastrados automaticamente na sua carteira ao salvar o contrato — sem trabalho duplicado.

📖 MANUAL ATUALIZADO
Todas as instruções dos novos fluxos estão documentadas no Manual da Plataforma (Apoio → Manual). Recomendamos a leitura!

Fique à vontade para tirar dúvidas com o administrador. Boas vendas! 🏆`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem executar esta ação.' }, { status: 403 });
    }

    // 1. Criar o Comunicado
    const comunicado = await base44.asServiceRole.entities.Comunicado.create({
      titulo: TITULO_COMUNICADO,
      mensagem: MENSAGEM_COMUNICADO,
      ativo: true,
    });

    // 2. Buscar todos os usuários ativos
    const usuarios = await base44.asServiceRole.entities.User.list();

    const resultados = [];

    // 3. Enviar mensagem no Jarvis para cada usuário
    for (const u of usuarios) {
      if (!u.email) continue;
      try {
        const nomeCompleto = u.data?.nome_tratamento || u.full_name || u.email.split('@')[0];
        const primeiroNome = nomeCompleto.split(' ')[0];
        const mensagemPersonalizada = `Olá, ${primeiroNome}! 👋\n\n${MENSAGEM_JARVIS}`;

        await base44.asServiceRole.entities.JarvisMensagem.create({
          destinatario_email: u.email,
          remetente_nome: 'Administração Villela Exchange',
          remetente_email: user.email,
          mensagem: mensagemPersonalizada,
          lida: false,
        });

        resultados.push({ email: u.email, status: 'enviado' });
      } catch (err) {
        resultados.push({ email: u.email, status: 'erro', motivo: err.message });
      }
    }

    const enviados = resultados.filter(r => r.status === 'enviado').length;
    const erros = resultados.filter(r => r.status === 'erro').length;

    return Response.json({
      success: true,
      comunicado_id: comunicado.id,
      mensagens_jarvis: `${enviados} enviada(s), ${erros} erro(s)`,
      total_usuarios: usuarios.length,
      resultados,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});