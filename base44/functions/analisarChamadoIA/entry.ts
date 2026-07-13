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

    // Buscar contexto adicional do usuario
    let usuarioInfo = '';
    let usuarioNomeTratamento = '';
    try {
      if (chamado.usuario_email) {
        const users = await admin.entities.User.list();
        const u = users.find(x => x.email === chamado.usuario_email);
        if (u) {
          usuarioNomeTratamento = u.full_name || u.nome_tratamento || '';
          // Buscar vendedor vinculado se existir
          let vendedorInfo = '';
          try {
            const vendedores = await admin.entities.Vendedor.list();
            const vendedor = vendedores.find(v => v.email === chamado.usuario_email || v.nome === usuarioNomeTratamento);
            if (vendedor) {
              vendedorInfo = `\nVENDEDOR VINCULADO:\n- Nome: ${vendedor.nome}\n- ID: ${vendedor.id}\n- Time: ${vendedor.time || 'N/A'}\n- Comissao: ${vendedor.percentual_comissao || 10}%`;
            }
          } catch (_) {}
          usuarioInfo = `
INFORMACOES DO USUARIO:
- Nome: ${usuarioNomeTratamento || 'N/A'}
- Email: ${u.email}
- Papel: ${u.role || 'user'}
${vendedorInfo}
`;
        }
      }
    } catch (_) {}

    // Coletar URLs dos anexos para analise visual/documental
    const anexosUrls = [];
    const anexosNomes = [];
    if (chamado.anexos && chamado.anexos.length > 0) {
      for (const a of chamado.anexos) {
        if (a.url) { anexosUrls.push(a.url); anexosNomes.push(a.nome || 'documento'); }
      }
    }
    if (chamado.respostas) {
      for (const r of chamado.respostas) {
        if (r.anexos) {
          for (const a of r.anexos) {
            if (a.url) { anexosUrls.push(a.url); anexosNomes.push(a.nome || 'documento'); }
          }
        }
      }
    }

    const systemContext = `Voce e o assistente de suporte tecnico do Villela Exchange CRM — uma plataforma de gestao comercial para uma empresa de servicos financeiros (cambio, contas internacionais, dolarizacao, offshore, etc.).

PRINCIPAIS MODULOS DO SISTEMA:
- Dashboard, Vendas, Contratos, Pipeline, Precificacao, Clientes, Central de Leads, Implantacoes, Comissoes, Vendedores, Chat Interno, Capacitacao, Suporte

CATEGORIAS DE CHAMADO:
- Acesso, Vendas e Comissoes, Contratos e Pipeline, Analise de Documentos, Precificacao, Chat Interno, Capacitacao, Sugestao de Melhoria, Bug / Erro, Outro

DIRETRIZES PARA SUA RESPOSTA:
1. Analise o chamado considerando titulo, descricao, categoria, respostas anteriores e DOCUMENTOS ANEXADOS
2. Se houver documentos anexados (contratos, comprovantes, etc.), LEIA-OS e extraia as informacoes relevantes
3. Forneça uma resposta util e acionavel em portugues brasileiro
4. Seja profissional, cordial e conciso
5. Use markdown para formatar a resposta

CRITICO — ACAO EXECUTAVEL:
Alem de responder, voce DEVE identificar se ha uma acao concreta que pode ser executada automaticamente no sistema para resolver o problema. Por exemplo:
- Se o chamado e sobre um contrato que nao existe no sistema → proponha "criar_contrato" com os dados extraidos do documento anexado ou da descricao
- Se o chamado e sobre uma venda que nao foi registrada → proponha "criar_venda" com os dados
- Se o chamado e sobre atualizar o status de um contrato → proponha "atualizar_contrato"
- Se for apenas uma duvida ou orientacao → use "nenhuma"

Para "criar_contrato", preencha o maximo de campos possivel com os dados extraidos dos documentos anexados ou da descricao do chamado.

SCHEMA DE CONTRATO (campos disponiveis para criar_contrato.dados):
- tipo (OBRIGATORIO): um de ["CONTA GLOBAL", "CONTA INTERNACIONAL", "DOLARIZE", "ROF", "CANAL BANCARIO", "OFFSHORE", "GARANTIAS", "HORA TECNICA"]
- nome (OBRIGATORIO): Nome completo ou Razao Social do cliente
- cpf_cnpj (OBRIGATORIO): CPF ou CNPJ
- responsavel_legal: Nome do responsavel legal (se PJ)
- cpf_responsavel: CPF do responsavel legal (se PJ)
- nascimento: Data de nascimento (YYYY-MM-DD)
- nacionalidade, profissao
- estado_civil: um de ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viuvo(a)", "Uniao Estavel"]
- email, telefone
- cep, endereco, bairro, cidade, estado (UF)
- valor_adesao: Valor da adesao/entrada (numero)
- valor_parcela: Valor de cada parcela (numero)
- num_parcelas: Numero de parcelas (numero)
- valor_total: Valor total do contrato (numero)
- forma_pagamento: um de ["PIX", "TED/DOC", "DEBITO EM CONTA", "BOLETO", "CARTAO DE CREDITO"]
- data_contrato: Data do contrato (YYYY-MM-DD)
- data_primeiro_pagamento: Data do primeiro pagamento (YYYY-MM-DD)
- dia_vencimento: Dia de vencimento das parcelas (numero)
- banco, agencia, conta
- moeda: Moeda do contrato (USD, EUR, etc.)
- cotacao: Cotacao da moeda no momento (numero)
- valor_em_moeda: Valor em moeda estrangeira (numero)
- prazo_meses: Prazo total em meses (numero)
- observacoes: Observacoes adicionais
- vendedor_id: ID do vendedor (se conhecido do contexto do usuario)
- vendedor_nome: Nome do vendedor
- mensalidade: Mensalidade (para GARANTIAS)
- valor_divida: Valor da divida (para GARANTIAS)
- percentual_montante: Percentual sobre montante (para GARANTIAS)

SCHEMA DE VENDA (campos para criar_venda.dados):
- produto (OBRIGATORIO): Nome do produto vendido
- assessor_comercial (OBRIGATORIO): Nome do vendedor
- valor (OBRIGATORIO): Valor da entrada/adesao (numero)
- data (OBRIGATORIO): Data da venda (YYYY-MM-DD)
- tipo_venda (OBRIGATORIO): "nova" ou "recorrencia"
- forma_pagamento: um de ["DEBITO EM CONTA", "CARTAO DE CREDITO", "BOLETO", "PIX", "TRANSFERENCIA", "DINHEIRO"]
- cpf_cnpj, cliente
- valor_total_contrato, num_parcelas
- vendedor_id, vendedor_nome, time
- observacao

IMPORTANTE: So proponha uma acao se tiver dados suficientes. Se faltar informacao, use "nenhuma" e solicite mais dados na resposta.`;

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
${chamado.respostas.map((r, i) => `[${r.is_suporte ? 'Suporte' : r.autor_nome}] ${r.texto}`).join('\\n---\\n')}
` : 'Sem respostas anteriores.'}

${anexosNomes.length > 0 ? `
DOCUMENTOS ANEXADOS PARA ANALISE (${anexosNomes.length}):
${anexosNomes.map((n, i) => `${i + 1}. ${n}`).join('\\n')}
` : 'Sem documentos anexados.'}
`;

    const prompt = `${systemContext}

${ticketInfo}

Com base nas informacoes acima e nos documentos anexados, gere:
1. Uma resposta de suporte para o chamado
2. A acao recomendada para o status do ticket
3. Se aplicavel, uma ACAO EXECUTAVEL (criar_contrato, criar_venda, etc.) com os dados extraidos`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: anexosUrls.length > 0 ? anexosUrls : undefined,
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
            description: 'Acao recomendada para o status do ticket'
          },
          resumo_interno: {
            type: 'string',
            description: 'Resumo breve para o administrador sobre o que foi analisado'
          },
          acao_executar: {
            type: 'object',
            description: 'Acao concreta a ser executada no sistema para resolver o problema. Use tipo "nenhuma" se for apenas orientacao.',
            properties: {
              tipo: {
                type: 'string',
                enum: ['criar_contrato', 'criar_venda', 'atualizar_contrato', 'nenhuma'],
                description: 'Tipo de acao a executar'
              },
              justificativa: {
                type: 'string',
                description: 'Por que esta acao resolve o problema'
              },
              dados: {
                type: 'object',
                description: 'Dados para executar a acao (campos da entidade). Para atualizar_contrato, incluir contrato_id.',
                additionalProperties: true
              }
            },
            required: ['tipo']
          }
        },
        required: ['resposta', 'acao_recomendada', 'resumo_interno', 'acao_executar']
      }
    });

    const { resposta, acao_recomendada, resumo_interno, acao_executar } = llmResponse;

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
      acao_executar: acao_executar || { tipo: 'nenhuma' },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});