import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.permissao_admin !== true) {
      return Response.json({ error: 'Apenas administradores podem executar esta operação' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dataInicio = body.dataInicio || '2026-06-01';
    const dataFim = body.dataFim || '2026-06-30';

    // 1. Buscar todas as vendas do período
    const todasVendas = await base44.asServiceRole.entities.Venda.list('-data', 500);
    const vendasPeriodo = todasVendas.filter(v => {
      const d = v.data || '';
      return d >= dataInicio && d <= dataFim;
    });

    // 2. Buscar implantações existentes para evitar duplicatas
    const implantacoesExistentes = await base44.asServiceRole.entities.Implantacao.list('-created_date', 500);
    const vendaIdsComImplantacao = new Set(
      implantacoesExistentes.map(imp => imp.venda_id).filter(Boolean)
    );

    // 3. Identificar vendas que são recorrência (parcelas)
    //    Critério: tipo_venda === 'recorrencia' OU observacao contém "Parcela" e "recebida"
    const isRecorrencia = (venda) => {
      if (venda.tipo_venda === 'recorrencia') return true;
      const obs = (venda.observacao || '').toLowerCase();
      if (obs.includes('parcela') && obs.includes('recebida')) return true;
      return false;
    };

    // 4. Filtrar vendas novas que ainda não têm implantação
    const vendasParaMigrar = vendasPeriodo.filter(v => {
      if (vendaIdsComImplantacao.has(v.id)) return false;
      if (isRecorrencia(v)) return false;
      return true;
    });

    // 5. Fases de implantação padrão
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

    // 6. Para cada venda, buscar contrato e criar implantação
    const resultados = {
      total_vendas_periodo: vendasPeriodo.length,
      recorrencias_ignoradas: vendasPeriodo.filter(v => isRecorrencia(v)).length,
      ja_migradas: vendasPeriodo.filter(v => vendaIdsComImplantacao.has(v.id)).length,
      migradas_agora: 0,
      erros: [],
    };

    for (const venda of vendasParaMigrar) {
      try {
        // Buscar contrato por CPF/CNPJ ou nome
        let contratoVinculado = null;
        let contratoEncontrado = false;

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

        const observacaoHistorico = contratoEncontrado
          ? `Implantação criada via migração de vendas (${dataInicio} a ${dataFim}). Contrato vinculado: ${contratoVinculado.tipo || '—'}`
          : `Implantação criada via migração de vendas (${dataInicio} a ${dataFim}). Contrato não localizado — aguardando anexamento manual.`;

        await base44.asServiceRole.entities.Implantacao.create({
          venda_id: venda.id,
          contrato_id: contratoVinculado?.id || '',
          contrato_encontrado: contratoEncontrado,
          cliente_nome: venda.cliente || '',
          cpf_cnpj: venda.cpf_cnpj || '',
          produto: venda.produto || '',
          vendedor_id: venda.vendedor_id || '',
          vendedor_nome: venda.assessor_comercial || '',
          valor_contrato: venda.valor_total_contrato || venda.valor || 0,
          data_entrada: venda.data,
          status: 'aguardando_documentacao',
          prioridade: 'media',
          etapas: etapasImplantacao,
          historico: [{
            status_anterior: '',
            status_novo: 'aguardando_documentacao',
            observacao: observacaoHistorico,
            atualizado_por: user.full_name || user.email || 'Sistema (Migração)',
            data: new Date().toISOString(),
          }],
        });

        // Atualiza a venda com tipo_venda = 'nova' se estiver em branco
        if (!venda.tipo_venda) {
          await base44.asServiceRole.entities.Venda.update(venda.id, { tipo_venda: 'nova' });
        }

        // Notificar
        try {
          await base44.functions.invoke('notificarImplantacao', {
            tipo: 'novo',
            implantacao_id: '',
          });
        } catch (e) {}

        resultados.migradas_agora++;
      } catch (e) {
        resultados.erros.push({ venda_id: venda.id, cliente: venda.cliente, erro: e.message });
      }
    }

    return Response.json({
      success: true,
      periodo: `${dataInicio} a ${dataFim}`,
      ...resultados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});