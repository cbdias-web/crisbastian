import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { dadosRicosLeadIndicacao } from '../../shared/dadosLeadIndicacao.ts';

// Classifica um item da FilaContato, encaminhando o lead na sua jornada:
//  - 'qualificado': registra o lead (com todas as informações) no Pipeline.
//  - 'convertido':  gera Cliente + Contrato (preservando os dados da LeadIndicacao)
//                   e atualiza/marca o Pipeline como "Fechado".
//
// Payload: { fila_id, status, produto?, valor? }
//   - produto/valor: produto e valor em negociação informados pelo gerente
//     (para indicações já vêm preenchidos da fila).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    const { fila_id, status, produto, valor } = body;
    if (!fila_id) return Response.json({ error: 'fila_id obrigatório' }, { status: 400 });
    if (!['qualificado', 'convertido'].includes(status)) {
      return Response.json({ error: 'status inválido (use qualificado ou convertido)' }, { status: 400 });
    }

    const fila = await base44.asServiceRole.entities.FilaContato.get(fila_id);
    if (!fila) return Response.json({ error: 'Fila não encontrada' }, { status: 404 });

    // Valida o produto ANTES de alterar o status (evita fila em estado intermediário)
    const prodFinal = (produto || fila.produto || '').trim();
    if (!prodFinal) {
      return Response.json({ error: 'Informe o produto da negociação antes de classificar o lead.' }, { status: 400 });
    }

    const isInd = fila.tipo_origem === 'indicacao';
    const valorFinal = (valor !== undefined && valor !== null && valor !== '') ? Number(valor) : (fila.valor_estimado ?? null);
    const nome = fila.nome || '';
    const doc = fila.cpf_cnpj || '';
    const tel = fila.telefone || '';
    const vendedor_id = fila.vendedor_id || '';
    const vendedor_nome = fila.vendedor_nome || '';

    // Atualiza produto/valor/status informados pelo gerente
    const updateFila: any = { status, produto: prodFinal };
    if (valor !== undefined && valor !== null && valor !== '') updateFila.valor_estimado = Number(valor);
    updateFila.historico = [
      ...(Array.isArray(fila.historico) ? fila.historico : []),
      { status, observacao: `Lead classificado como ${status}`, data: new Date().toISOString() },
    ];
    await base44.asServiceRole.entities.FilaContato.update(fila_id, updateFila);
    const f = fila;

    // Resolve LeadIndicacao e dados ricos (endereço, dados pessoais/PJ)
    let leadIndicacao = null;
    if (f.lead_indicacao_id) {
      try { leadIndicacao = await base44.asServiceRole.entities.LeadIndicacao.get(f.lead_indicacao_id); } catch (e) {}
    }
    const ricos = dadosRicosLeadIndicacao(leadIndicacao) || {};
    const docFinal = doc || ricos.cpf_cnpj || '';
    const emailFinal = ricos.email || '';
    const telFinal = tel || ricos.whatsapp || '';
    const indicadorNome = leadIndicacao?.parceiro_nome || '';
    const indicadorPct = leadIndicacao?.parceiro_percentual ?? null;

    const origemPipe = isInd ? 'Indicação' : (f.tipo_origem === 'carteira' ? 'Carteira' : 'Lead');
    const descInd = isInd && indicadorNome
      ? `Indicação de ${indicadorNome}${indicadorPct != null ? ` (${indicadorPct}%)` : ''}`
      : '';

    // Localiza um pipeline já existente para este lead (mesmo nome + produto + vendedor)
    let pipelineExistente = null;
    try {
      const pipes = await base44.asServiceRole.entities.Pipeline.filter({ cliente_nome: nome, produto: prodFinal, vendedor_id });
      if (pipes && pipes.length > 0) pipelineExistente = pipes[0];
    } catch (e) {}

    // ──────────────────────────────────────────────────────────────
    // QUALIFICADO → registra no Pipeline com todas as informações
    // ──────────────────────────────────────────────────────────────
    if (status === 'qualificado') {
      const dadosPipe: any = {
        vendedor_id, vendedor_nome,
        cliente_id: f.cliente_id || '',
        cliente_nome: nome,
        cliente_cpf_cnpj: docFinal,
        cliente_telefone: telFinal,
        produto: prodFinal,
        valor_estimado: valorFinal ?? 0,
        temperatura: 'Quente',
        origem: origemPipe,
        descricao: descInd,
        observacao: leadIndicacao?.observacoes || '',
      };
      let pipeline_id = null;
      if (pipelineExistente) {
        await base44.asServiceRole.entities.Pipeline.update(pipelineExistente.id, dadosPipe);
        pipeline_id = pipelineExistente.id;
      } else {
        const pipe = await base44.asServiceRole.entities.Pipeline.create(dadosPipe);
        pipeline_id = pipe.id;
      }

      // Atualiza LeadIndicacao (jornada) e ConversaWhatsapp
      if (leadIndicacao && leadIndicacao.status === 'novo') {
        try { await base44.asServiceRole.entities.LeadIndicacao.update(leadIndicacao.id, { status: 'em_atendimento' }); } catch (e) {}
      }
      if (isInd) {
        try { await base44.asServiceRole.entities.ConversaWhatsapp.update(f.ref_id, { status: 'qualificado' }); } catch (e) {}
      }

      return Response.json({ ok: true, status, pipeline_id });
    }

    // ──────────────────────────────────────────────────────────────
    // CONVERTIDO → gera Cliente + Contrato e atualiza o Pipeline
    // ──────────────────────────────────────────────────────────────

    // Cliente (evita duplicar por CPF/CNPJ)
    let clienteId = f.cliente_id || '';
    if (!clienteId && docFinal) {
      try {
        const existentes = await base44.asServiceRole.entities.Cliente.filter({ cpf_cnpj: docFinal });
        if (existentes && existentes.length > 0) clienteId = existentes[0].id;
      } catch (e) {}
    }
    if (!clienteId) {
      const cliente = await base44.asServiceRole.entities.Cliente.create({
        nome,
        cpf_cnpj: docFinal || undefined,
        email: emailFinal || undefined,
        telefone: telFinal || undefined,
        responsavel_legal: ricos.responsavel_legal || undefined,
        cpf_responsavel: ricos.cpf_responsavel || undefined,
        nascimento: ricos.isPF ? (ricos.nascimento || undefined) : undefined,
        nacionalidade: ricos.isPF ? (ricos.nacionalidade || undefined) : undefined,
        profissao: ricos.isPF ? (ricos.profissao || undefined) : undefined,
        cep: ricos.cep || undefined,
        endereco: ricos.endereco || undefined,
        bairro: ricos.bairro || undefined,
        cidade: ricos.cidade || undefined,
        estado: ricos.estado || undefined,
        vendedor_id, vendedor_nome,
        origem: isInd ? 'lead_convertido' : 'nativo',
        lead_id: leadIndicacao?.id || '',
        subcarteira: indicadorNome || '',
        observacao: `Convertido da Fila de Contatos${isInd && indicadorNome ? '. Indicação de ' + indicadorNome : ''}.`,
      });
      clienteId = cliente.id;
    }

    const indicadoresArr = (isInd && leadIndicacao?.parceiro_id)
      ? [{ id: leadIndicacao.parceiro_id, nome: indicadorNome, percentual: indicadorPct ?? 0 }]
      : [];

    // Observações do contrato: preserva o texto do indicador do formulário do lead
    // (o que ele digitou em "observacoes" ao enviar a indicação).
    const obsIndicador = (leadIndicacao?.observacoes || '').trim();
    const obsContrato = obsIndicador
      ? `Convertido da Fila de Contatos${isInd && indicadorNome ? '. Indicação de ' + indicadorNome : ''}.\n\nObservações do indicador:\n${obsIndicador}`
      : `Convertido da Fila de Contatos${isInd && indicadorNome ? '. Indicação de ' + indicadorNome : ''}.`;

    // Contrato (tipo = produto em negociação, preserva dados da indicação)
    const contrato = await base44.asServiceRole.entities.Contrato.create({
      tipo: prodFinal,
      nome,
      cpf_cnpj: docFinal || undefined,
      email: emailFinal || undefined,
      telefone: telFinal || undefined,
      responsavel_legal: ricos.responsavel_legal || undefined,
      cpf_responsavel: ricos.cpf_responsavel || undefined,
      nascimento: ricos.isPF ? (ricos.nascimento || undefined) : undefined,
      nacionalidade: ricos.isPF ? (ricos.nacionalidade || undefined) : undefined,
      profissao: ricos.isPF ? (ricos.profissao || undefined) : undefined,
      cep: ricos.cep || undefined,
      endereco: ricos.endereco || undefined,
      bairro: ricos.bairro || undefined,
      cidade: ricos.cidade || undefined,
      estado: ricos.estado || undefined,
      vendedor_id, vendedor_nome,
      cliente_id: clienteId,
      valor_adesao: valorFinal ?? null,
      valor_total: valorFinal ?? null,
      status: 'rascunho',
      indicadores: indicadoresArr,
      observacoes: obsContrato,
    });

    // Atualiza/cria Pipeline marcando "Fechado" e vinculando cliente
    let pipeline_id = null;
    if (pipelineExistente) {
      await base44.asServiceRole.entities.Pipeline.update(pipelineExistente.id, {
        temperatura: 'Fechado',
        cliente_id: clienteId,
        valor_estimado: valorFinal ?? 0,
      });
      pipeline_id = pipelineExistente.id;
    } else {
      const pipe = await base44.asServiceRole.entities.Pipeline.create({
        vendedor_id, vendedor_nome,
        cliente_id: clienteId,
        cliente_nome: nome,
        cliente_cpf_cnpj: docFinal,
        cliente_telefone: telFinal,
        produto: prodFinal,
        valor_estimado: valorFinal ?? 0,
        temperatura: 'Fechado',
        origem: origemPipe,
        descricao: descInd,
      });
      pipeline_id = pipe.id;
    }

    // Vincula cliente + contrato na fila e atualiza entidades de origem
    try { await base44.asServiceRole.entities.FilaContato.update(fila_id, { cliente_id: clienteId }); } catch (e) {}
    if (leadIndicacao) {
      try {
        await base44.asServiceRole.entities.LeadIndicacao.update(leadIndicacao.id, {
          status: 'convertido_contrato',
          cliente_id: clienteId,
          contrato_id: contrato.id,
          convertido: true,
          convertido_em: new Date().toISOString(),
        });
      } catch (e) {}
    }
    if (isInd) {
      try { await base44.asServiceRole.entities.ConversaWhatsapp.update(f.ref_id, { status: 'convertido' }); } catch (e) {}
    }

    return Response.json({
      ok: true,
      status,
      cliente_id: clienteId,
      contrato_id: contrato.id,
      pipeline_id,
    });
  } catch (error) {
    console.error('classificarLeadFila:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}