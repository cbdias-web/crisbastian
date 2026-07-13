import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { venda_id, venda_data, event_type } = body;

    // Se veio de automação de entidade, o payload trará event + data
    const venda = venda_data || body.data || null;
    const vId = venda_id || body.entity_id || null;

    if (!venda || !vId) {
      return Response.json({ error: 'Dados da venda não fornecidos' }, { status: 400 });
    }

    // Skip vendas de recorrência (parcelas — não geram implantação)
    if (venda.tipo_venda === 'recorrencia') {
      return Response.json({ skipped: true, reason: 'recorrencia' });
    }

    // Idempotência: verifica se já existe implantação para esta venda
    const existentes = await base44.asServiceRole.entities.Implantacao.filter({ venda_id: vId });
    if (existentes.length > 0) {
      return Response.json({ skipped: true, reason: 'ja_existe', implantacao_id: existentes[0].id });
    }

    // Buscar contrato relacionado (por CPF/CNPJ ou nome)
    let contratoVinculado = null;
    let contratoEncontrado = false;
    try {
      if (venda.cpf_cnpj) {
        const contratos = await base44.asServiceRole.entities.Contrato.filter({ cpf_cnpj: venda.cpf_cnpj });
        if (contratos.length > 0) {
          contratoVinculado = contratos[0];
          contratoEncontrado = true;
        }
      }
      if (!contratoVinculado && venda.cliente) {
        const contratosPorNome = await base44.asServiceRole.entities.Contrato.filter({ nome: venda.cliente.trim() });
        if (contratosPorNome.length > 0) {
          contratoVinculado = contratosPorNome[0];
          contratoEncontrado = true;
        }
      }
    } catch (e) {
      console.log('Erro ao buscar contrato:', e.message);
    }

    const etapasImplantacao = [
      { fase: 'Contratos & Compliance', descricao: 'Revisão e validação do contrato assinado', concluida: false, concluida_em: '' },
      { fase: 'Contratos & Compliance', descricao: 'KYC (Know Your Customer) — verificação de identidade', concluida: false, concluida_em: '' },
      { fase: 'Contratos & Compliance', descricao: 'Due diligence e checagem em listas restritivas (PLD/FT)', concluida: false, concluida_em: '' },
      { fase: 'Contratos & Compliance', descricao: 'Aprovação de compliance e risco', concluida: false, concluida_em: '' },
      { fase: 'Documentação', descricao: 'Coleta de documentos pessoais/empresariais (RG, CNH, contrato social)', concluida: false, concluida_em: '' },
      { fase: 'Documentação', descricao: 'Comprovante de residência e renda', concluida: false, concluida_em: '' },
      { fase: 'Documentação', descricao: 'Validação e organização da documentação', concluida: false, concluida_em: '' },
      { fase: 'Onboarding', descricao: 'Abertura de conta / cadastro em plataformas', concluida: false, concluida_em: '' },
      { fase: 'Onboarding', descricao: 'Setup técnico e parametrização do produto', concluida: false, concluida_em: '' },
      { fase: 'Onboarding', descricao: 'Configuração de credenciais e acessos', concluida: false, concluida_em: '' },
      { fase: 'Configuração & Liberação', descricao: 'Testes de funcionamento e conectividade', concluida: false, concluida_em: '' },
      { fase: 'Configuração & Liberação', descricao: 'Ativação e liberação de acesso ao cliente', concluida: false, concluida_em: '' },
      { fase: 'Configuração & Liberação', descricao: 'Confirmação de operação ativa', concluida: false, concluida_em: '' },
      { fase: 'Treinamento & Handover', descricao: 'Treinamento do cliente sobre uso do produto', concluida: false, concluida_em: '' },
      { fase: 'Treinamento & Handover', descricao: 'Entrega de manuais e credenciais', concluida: false, concluida_em: '' },
      { fase: 'Treinamento & Handover', descricao: 'Apresentação do suporte pós-venda', concluida: false, concluida_em: '' },
    ];

    const observacaoHistorico = contratoEncontrado
      ? `Implantação criada automaticamente via formalização de venda. Contrato vinculado: ${contratoVinculado.tipo || '—'}`
      : 'Implantação criada automaticamente via formalização de venda. Contrato não localizado no sistema — aguardando anexamento manual.';

    const implantacao = await base44.asServiceRole.entities.Implantacao.create({
      venda_id: vId,
      contrato_id: contratoVinculado?.id || '',
      contrato_encontrado: contratoEncontrado,
      cliente_nome: venda.cliente || '',
      cpf_cnpj: venda.cpf_cnpj || '',
      produto: venda.produto || '',
      vendedor_id: venda.vendedor_id || '',
      vendedor_nome: venda.assessor_comercial || '',
      valor_contrato: venda.valor_total_contrato || venda.valor || 0,
      data_entrada: venda.data || new Date().toISOString().split('T')[0],
      status: 'aguardando_documentacao',
      prioridade: 'media',
      etapas: etapasImplantacao,
      historico: [{
        status_anterior: '',
        status_novo: 'aguardando_documentacao',
        observacao: observacaoHistorico,
        atualizado_por: venda.assessor_comercial || 'Sistema',
        data: new Date().toISOString(),
      }],
    });

    // Notificar envolvidos
    try {
      await base44.asServiceRole.functions.invoke('notificarImplantacao', {
        tipo: 'novo',
        implantacao_id: implantacao.id,
      });
    } catch (e) {
      console.log('Erro ao notificar implantação:', e.message);
    }

    return Response.json({ success: true, implantacao_id: implantacao.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});