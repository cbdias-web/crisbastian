import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.permissao_admin !== true) {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch {}
    const chamadoId = body.chamado_id;
    if (!chamadoId) return Response.json({ error: 'chamado_id obrigatorio' }, { status: 400 });

    const admin = base44.asServiceRole;
    const chamado = await admin.entities.ChamadoSuporte.get(chamadoId);
    if (!chamado) return Response.json({ error: 'Chamado nao encontrado' }, { status: 404 });

    // Buscar contexto adicional do usuario se possivel
    let usuarioInfo = '';
    try {
      if (chamado.usuario_email) {
        const users = await admin.entities.User.list();
        const u = users.find(x => x.email === chamado.usuario_email);
        if (u) {
          usuarioInfo = `
INFORMACOES DO USUARIO:
- Nome: ${u.full_name || u.nome_tratamento || 'N/A'}
- Email: ${u.email}
- Papel: ${u.role || 'user'}
- Ultimo acesso: ${u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleString('pt-BR') : 'N/A'}
`;
        }
      }
    } catch (_) {}

    const systemContext = `Voce e o assistente de suporte tecnico do Villela Exchange CRM — uma plataforma de gestao comercial para uma empresa de servicos financeiros (cambio, contas internacionais, dolarizacao, offshore, etc.).

PRINCIPAIS MODULOS DO SISTEMA:
- Dashboard: Indicadores de vendas, metas e comissoes
- Vendas: Registro e gestao de vendas (produto, valor, vendedor, forma de pagamento, indicadores/espelhamentos)
- Contratos: Geracao de contratos PDF (CONTA GLOBAL, CONTA INTERNACIONAL, DOLARIZE, ROF, CANAL BANCARIO, OFFSHORE, GARANTIAS, HORA TECNICA)
- Pipeline: Gestao de oportunidades em negociacao
- Precificacao: Simuladores de propostas (Dolarize, Offshore, Conta Internacional, Canal Bancario, Seguro Garantia)
- Clientes: Carteira de clientes e interacoes cronologicas
- Central de Leads: Distribuicao round-robin, chat WhatsApp, controle de SLA
- Implantacoes: Pos-venda em formato Kanban
- Comissoes: Calculo automatico de comissoes por venda
- Vendedores: Cadastro de vendedores, times, percentuais de comissao
- Chat Interno: Comunicacao entre usuarios (canais e direto)
- Capacitacao: Modulos e aulas de treinamento
- Suporte: Sistema de chamados

CATEGORIAS DE CHAMADO:
- Acesso: Problemas de login, convites, permissoes, senhas
- Vendas e Comissoes: Duvidas sobre vendas, calculo de comissoes, correcoes
- Contratos e Pipeline: Geracao de contratos, status, encaminhamento para vendas
- Precificacao: Simuladores, parametros, cotacoes de cambio
- Chat Interno: Mensagens, canais, Google Meet
- Capacitacao: Treinamentos, modulos, aulas
- Sugestao de Melhoria: Ideias para melhorar o sistema
- Bug / Erro: Erros, comportamentos inesperados
- Outro: Qualquer outro assunto

DIRETRIZES PARA SUA RESPOSTA:
1. Analise o chamado considerando o titulo, descricao, categoria e respostas anteriores
2. Forneça uma resposta util e acionavel em portugues brasileiro
3. Para problemas de acesso: oriente sobre como verificar permissoes, reenviar convites, etc.
4. Para duvidas de vendas/comissoes: explique como o sistema funciona e onde encontrar a informacao
5. Para bugs: forneça passos de solucao de problemas (limpar cache, tentar novamente, etc.) e se for um bug real, reconheca e informe que sera investigado
6. Para sugestoes: analise a viabilidade, agradeça a sugestao e informe se e algo que pode ser implementado
7. Seja profissional, cordial e conciso
8. Se o chamado ja tiver respostas anteriores, leve isso em consideracao (nao repita o que ja foi dito)
9. Use markdown para formatar a resposta (negrito, listas, etc.)`;

    const ticketInfo = `
DETALHES DO CHAMADO:
- Numero: ${chamado.numero || chamado.id.slice(-4)}
- Titulo: ${chamado.titulo}
- Categoria: ${chamado.categoria}
- Prioridade: ${chamado.prioridade}
- Status atual: ${chamado.status}
- Aberto por: ${chamado.usuario_nome} (${chamado.usuario_email})
- Data de abertura: ${new Date(chamado.created_date).toLocaleString('pt-BR')}

${usuarioInfo}

DESCRICAO:
${chamado.descricao}

${chamado.respostas && chamado.respostas.length > 0 ? `
RESPOSTAS ANTERIORES:
${chamado.respostas.map((r, i) => `[${r.is_suporte ? 'Suporte' : r.autor_nome}] ${r.texto}`).join('\n---\n')}
` : 'Sem respostas anteriores.'}
`;

    const prompt = `${systemContext}

${ticketInfo}

Com base nas informacoes acima, gere uma resposta de suporte para este chamado. Determine tambem qual acao deve ser tomada com o status do ticket.`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          resposta: {
            type: 'string',
            description: 'Texto completo da resposta para o chamado, em portugues, formatado em markdown'
          },
          acao_recomendada: {
            type: 'string',
            enum: ['resolvido', 'aguardando_usuario', 'em_andamento'],
            description: 'Acao recomendada: resolvido se o problema foi solucionado, aguardando_usuario se precisa de mais informacoes do usuario, em_andamento se esta sendo investigado'
          },
          resumo_interno: {
            type: 'string',
            description: 'Resumo breve para o administrador sobre o que foi analisado e respondido'
          }
        },
        required: ['resposta', 'acao_recomendada', 'resumo_interno']
      }
    });

    const { resposta, acao_recomendada, resumo_interno } = llmResponse;

    // NAO aplicar automaticamente — retornar sugestao para validacao do administrador
    let novoStatus = chamado.status;
    if (acao_recomendada === 'resolvido') novoStatus = 'resolvido';
    else if (acao_recomendada === 'aguardando_usuario') novoStatus = 'aguardando_usuario';
    else if (acao_recomendada === 'em_andamento') novoStatus = 'em_andamento';

    return Response.json({
      success: true,
      resumo_interno,
      acao_recomendada,
      novo_status: novoStatus,
      resposta,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});