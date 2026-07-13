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
    const { chamado_id, acao } = body;
    if (!chamado_id || !acao || !acao.tipo) {
      return Response.json({ error: 'chamado_id e acao.tipo sao obrigatorios' }, { status: 400 });
    }

    const admin = base44.asServiceRole;
    const tipo = acao.tipo;
    const dados = acao.dados || {};

    // Buscar o chamado para contexto
    let chamado = null;
    try { chamado = await admin.entities.ChamadoSuporte.get(chamado_id); } catch (_) {}

    if (tipo === 'criar_contrato') {
      // Validar campos obrigatorios
      if (!dados.tipo || !dados.nome || !dados.cpf_cnpj) {
        return Response.json({
          success: false,
          error: 'Dados insuficientes para criar contrato. Campos obrigatorios: tipo, nome, cpf_cnpj.'
        }, { status: 400 });
      }

      // Garantir que o vendedor esteja vinculado se possivel
      if (!dados.vendedor_id && chamado?.usuario_email) {
        try {
          const vendedores = await admin.entities.Vendedor.list();
          const vendedor = vendedores.find(v => v.email === chamado.usuario_email);
          if (vendedor) {
            dados.vendedor_id = vendedor.id;
            dados.vendedor_nome = vendedor.nome;
          }
        } catch (_) {}
      }

      const contrato = await admin.entities.Contrato.create({
        ...dados,
        status: 'gerado',
        data_contrato: dados.data_contrato || new Date().toISOString().slice(0, 10),
      });

      // Notificacao de novo contrato
      try {
        await admin.functions.invoke('notificarNovoContrato', { contrato_id: contrato.id });
      } catch (_) {}

      return Response.json({
        success: true,
        tipo: 'criar_contrato',
        contrato_id: contrato.id,
        mensagem: `Contrato ${dados.tipo} criado para ${dados.nome}.`,
      });
    }

    if (tipo === 'criar_venda') {
      if (!dados.produto || !dados.assessor_comercial || dados.valor === undefined || !dados.data || !dados.tipo_venda) {
        return Response.json({
          success: false,
          error: 'Dados insuficientes para criar venda. Campos obrigatorios: produto, assessor_comercial, valor, data, tipo_venda.'
        }, { status: 400 });
      }

      const venda = await admin.entities.Venda.create({
        ...dados,
        considerar_acumulado: dados.considerar_acumulado !== false,
      });

      // Criar parcelas se aplicavel
      if (dados.num_parcelas && dados.num_parcelas > 0) {
        try {
          await admin.functions.invoke('criarParcelasVenda', { venda_id: venda.id });
        } catch (_) {}
      }

      return Response.json({
        success: true,
        tipo: 'criar_venda',
        venda_id: venda.id,
        mensagem: `Venda de ${dados.produto} registrada para ${dados.cliente || dados.assessor_comercial}.`,
      });
    }

    if (tipo === 'atualizar_contrato') {
      const contratoId = dados.contrato_id;
      if (!contratoId) {
        return Response.json({
          success: false,
          error: 'contrato_id e obrigatorio para atualizar_contrato.'
        }, { status: 400 });
      }
      const updateData = { ...dados };
      delete updateData.contrato_id;

      const contrato = await admin.entities.Contrato.update(contratoId, updateData);

      return Response.json({
        success: true,
        tipo: 'atualizar_contrato',
        contrato_id: contratoId,
        mensagem: `Contrato atualizado.`,
      });
    }

    return Response.json({
      success: true,
      tipo: 'nenhuma',
      mensagem: 'Nenhuma acao executavel necessaria.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});