// Núcleo compartilhado da auto-resolução de chamados pelo Jarvis.
// Usado tanto pela função manual (resolverChamadoIA — com auth do usuário)
// quanto pela automação (resolverChamadoAutomatico — service role, sem usuário).
//
// Recebe o cliente base44 já em contexto de service role (admin) e o id do chamado.

import {
  sanitizeDados, NUMERICOS_CONTRATO, NUMERICOS_VENDA,
} from './chamadoSanitizers.ts';

const SYSTEM_CONTEXT = `Voce e o assistente de suporte tecnico (Jarvis) do Villela Exchange CRM — plataforma de gestao comercial para uma empresa de servicos financeiros (cambio, contas internacionais, dolarizacao, offshore, etc.).
PRINCIPAIS MODULOS: Dashboard, Vendas, Contratos, Pipeline, Precificacao, Clientes, Central de Leads, Implantacoes, Comissoes, Vendedores, Chat Interno, Capacitacao, Suporte.
CATEGORIAS: Acesso, Vendas e Comissoes, Contratos e Pipeline, Analise de Documentos, Precificacao, Chat Interno, Capacitacao, Sugestao de Melhoria, Bug / Erro, Outro.

DIRETRIZES:
1. Analise titulo, descricao, categoria, respostas anteriores e DOCUMENTOS ANEXADOS.
2. Se houver documentos anexados, LEIA-OS e extraia informacoes relevantes.
3. Forneça uma resposta final, acionavel e cordial em portugues brasileiro (markdown). Esta resposta sera entregue DIRETAMENTE ao usuario, sem revisao humana — seja claro e completo.
4. Para Bugs/Erros de interface, oriente o usuario com workarounds ou confirme que foi registrado. Para duvidas, explique o passo a passo.

ACAO EXECUTAVEL (auto-resolucao):
Identifique se ha uma acao concreta para resolver o problema automaticamente:
- contrato ausente → "criar_contrato" (preencha campos dos documentos anexados)
- venda nao registrada → "criar_venda"
- atualizar status de contrato → "atualizar_contrato" (inclua contrato_id)
- apenas orientacao/duvida → "nenhuma"
So proponha uma acao se tiver dados suficientes. Se faltar informacao, use "nenhuma" e solicite os dados na resposta.

SCHEMA CONTRATO (criar_contrato.dados): tipo (OBRIG: um de ["CONTA GLOBAL","CONTA INTERNACIONAL","DOLARIZE","ROF","CANAL BANCARIO","OFFSHORE","GARANTIAS","HORA TECNICA","RATING"]), nome (OBRIG), cpf_cnpj (OBRIG), responsavel_legal, cpf_responsavel, nascimento, nacionalidade, profissao, estado_civil (um de ["Solteiro(a)","Casado(a)","Divorciado(a)","Viuvo(a)","Uniao Estavel"]), email, telefone, cep, endereco, bairro, cidade, estado, valor_adesao, valor_parcela, num_parcelas, valor_total, forma_pagamento (um de ["PIX","TED/DOC","DEBITO EM CONTA","BOLETO","CARTAO DE CREDITO"]), data_contrato, data_primeiro_pagamento, dia_vencimento, banco, agencia, conta, moeda, cotacao, valor_em_moeda, prazo_meses, observacoes, vendedor_id, vendedor_nome, mensalidade, valor_divida, percentual_montante.
SCHEMA VENDA (criar_venda.dados): produto (OBRIG), assessor_comercial (OBRIG), valor (OBRIG), data (OBRIG), tipo_venda (OBRIG: "nova"|"recorrencia"), forma_pagamento, cpf_cnpj, cliente, valor_total_contrato, num_parcelas, vendedor_id, vendedor_nome, time, observacao.`;

function buildTicketInfo(chamado: any, anexosNomes: string[]): string {
  return `DETALHES DO CHAMADO:
- Numero: ${chamado.numero || chamado.id.slice(-4)}
- Titulo: ${chamado.titulo}
- Categoria: ${chamado.categoria}
- Prioridade: ${chamado.prioridade}
- Status atual: ${chamado.status}
- Aberto por: ${chamado.usuario_nome} (${chamado.usuario_email})
- Abertura: ${new Date(chamado.created_date).toLocaleString('pt-BR')}

DESCRICAO:
${chamado.descricao}

${chamado.respostas && chamado.respostas.length > 0 ? `RESPOSTAS ANTERIORES:\n${chamado.respostas.map((r: any) => `[${r.is_suporte ? 'Suporte' : r.autor_nome}] ${r.texto}`).join('\\n---\\n')}` : 'Sem respostas anteriores.'}

${anexosNomes.length > 0 ? `DOCUMENTOS ANEXADOS (${anexosNomes.length}):\n${anexosNomes.map((n: string, i: number) => `${i + 1}. ${n}`).join('\\n')}` : 'Sem documentos anexados.'}`;
}

export async function resolverChamado(admin: any, chamadoId: string, opts?: { automatico?: boolean }) {
  const automatico = !!opts?.automatico;
  const chamado = await admin.entities.ChamadoSuporte.get(chamadoId);
  if (!chamado) throw new Error('Chamado nao encontrado');
  if (chamado.status === 'fechado') {
    return { success: false, skipped: true, error: 'Chamado fechado nao pode ser resolvido pela IA.' };
  }

  // Coletar anexos
  const anexosUrls: string[] = [];
  const anexosNomes: string[] = [];
  if (chamado.anexos) for (const a of chamado.anexos) if (a.url) { anexosUrls.push(a.url); anexosNomes.push(a.nome || 'documento'); }
  if (chamado.respostas) for (const r of chamado.respostas) if (r.anexos) for (const a of r.anexos) if (a.url) { anexosUrls.push(a.url); anexosNomes.push(a.nome || 'documento'); }

  const prompt = `${SYSTEM_CONTEXT}\n\n${buildTicketInfo(chamado, anexosNomes)}\n\nGere: 1) resposta final para o usuario; 2) acao recomendada de status; 3) acao executavel se aplicavel.`;

  const llmResponse = await admin.integrations.Core.InvokeLLM({
    prompt,
    file_urls: anexosUrls.length > 0 ? anexosUrls : undefined,
    response_json_schema: {
      type: 'object',
      properties: {
        resposta: { type: 'string', description: 'Resposta final em portugues, markdown, entregue direto ao usuario' },
        acao_recomendada: { type: 'string', enum: ['resolvido', 'aguardando_usuario', 'em_andamento'] },
        resumo_interno: { type: 'string' },
        acao_executar: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: ['criar_contrato', 'criar_venda', 'atualizar_contrato', 'nenhuma'] },
            justificativa: { type: 'string' },
            dados: { type: 'object', additionalProperties: true },
          },
          required: ['tipo'],
        },
      },
      required: ['resposta', 'acao_recomendada', 'resumo_interno', 'acao_executar'],
    },
  });

  const { resposta, acao_recomendada, resumo_interno, acao_executar } = llmResponse as any;

  let novoStatus = chamado.status;
  if (acao_recomendada === 'resolvido') novoStatus = 'resolvido';
  else if (acao_recomendada === 'aguardando_usuario') novoStatus = 'aguardando_usuario';
  else if (acao_recomendada === 'em_andamento') novoStatus = 'em_andamento';

  // ── Executar acao automaticamente se aplicavel ──
  let acaoResultado: any = null;
  const acao = acao_executar || { tipo: 'nenhuma' };
  if (acao.tipo && acao.tipo !== 'nenhuma' && acao.dados) {
    try {
      const tipo = acao.tipo;
      const dadosRaw = acao.dados;
      if (tipo === 'criar_contrato' && (!dadosRaw.tipo || !dadosRaw.nome || !dadosRaw.cpf_cnpj)) {
        acaoResultado = { success: false, tipo, error: 'Dados insuficientes para criar contrato.' };
      } else if (tipo === 'criar_venda' && (!dadosRaw.produto || !dadosRaw.assessor_comercial || dadosRaw.valor === undefined || !dadosRaw.data || !dadosRaw.tipo_venda)) {
        acaoResultado = { success: false, tipo, error: 'Dados insuficientes para criar venda.' };
      } else if (tipo === 'atualizar_contrato' && !dadosRaw.contrato_id) {
        acaoResultado = { success: false, tipo, error: 'contrato_id obrigatorio.' };
      } else {
        const camposNumericos = tipo === 'criar_venda' ? NUMERICOS_VENDA : NUMERICOS_CONTRATO;
        const dados = sanitizeDados(dadosRaw, camposNumericos);

        if (tipo === 'criar_contrato') {
          if (!dados.vendedor_id && chamado.usuario_email) {
            try {
              const vendedores = await admin.entities.Vendedor.list();
              const vendedor = vendedores.find((v: any) => v.email === chamado.usuario_email);
              if (vendedor) { dados.vendedor_id = vendedor.id; dados.vendedor_nome = vendedor.nome; }
            } catch (_) {}
          }
          const contrato = await admin.entities.Contrato.create({
            ...dados, status: 'gerado',
            data_contrato: dados.data_contrato || new Date().toISOString().slice(0, 10),
          });
          try { await admin.functions.invoke('notificarNovoContrato', { contrato_id: contrato.id }); } catch (_) {}
          acaoResultado = { success: true, tipo, mensagem: `Contrato ${dados.tipo} criado para ${dados.nome}.` };
        } else if (tipo === 'criar_venda') {
          const venda = await admin.entities.Venda.create({ ...dados, considerar_acumulado: dados.considerar_acumulado !== false });
          if (dados.num_parcelas && dados.num_parcelas > 0) {
            try { await admin.functions.invoke('criarParcelasVenda', { venda_id: venda.id }); } catch (_) {}
          }
          acaoResultado = { success: true, tipo, mensagem: `Venda de ${dados.produto} registrada para ${dados.cliente || dados.assessor_comercial}.` };
        } else if (tipo === 'atualizar_contrato') {
          const contratoId = dadosRaw.contrato_id;
          const updateData = { ...dados }; delete updateData.contrato_id;
          await admin.entities.Contrato.update(contratoId, updateData);
          acaoResultado = { success: true, tipo, mensagem: 'Contrato atualizado.' };
        }
      }
    } catch (e) {
      acaoResultado = { success: false, tipo: acao.tipo, error: (e as Error).message };
    }
  }

  // ── Montar texto da resposta ──
  let textoResposta = resposta;
  if (acaoResultado && acaoResultado.success) {
    textoResposta += `\n\n---\n✅ **Ação aplicada automaticamente:** ${acaoResultado.mensagem}`;
    novoStatus = 'resolvido';
  } else if (acaoResultado && !acaoResultado.success) {
    textoResposta += `\n\n---\n⚠️ Não foi possível aplicar a ação automaticamente (${acaoResultado.error}). Nossa equipe será acionada para concluir.`;
  }

  // ── Postar resposta no chamado ──
  const autorNome = automatico ? 'Jarvis — Suporte Automático' : 'Assistente IA (Auto-Resolução)';
  const novaResposta = {
    autor_nome: autorNome,
    texto: textoResposta,
    data_hora: new Date().toISOString(),
    is_suporte: true,
  };
  const respostasAtualizadas = [...(chamado.respostas || []), novaResposta];
  await admin.entities.ChamadoSuporte.update(chamadoId, {
    respostas: respostasAtualizadas,
    status: novoStatus,
  });

  // ── Notificar usuario via Jarvis ──
  try {
    if (chamado.usuario_email) {
      await admin.entities.JarvisMensagem.create({
        destinatario_email: chamado.usuario_email,
        remetente_nome: 'Jarvis — Suporte Automático',
        remetente_email: 'suporte@villelaexchange.com.br',
        mensagem: `📋 **Chamado #${chamado.numero || chamado.id.slice(-4)} — ${chamado.titulo}**\n\nSua solicitação foi analisada e ${acaoResultado?.success ? 'resolvida automaticamente' : 'respondida'} pelo assistente IA.\n\nAcesse a Central de Suporte para visualizar a resposta.`,
      });
    }
  } catch (_) {}

  return {
    success: true,
    resposta: textoResposta,
    novo_status: novoStatus,
    resumo_interno,
    acao_executada: acaoResultado,
  };
}