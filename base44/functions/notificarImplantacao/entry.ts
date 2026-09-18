import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STATUS_LABELS = {
  aguardando_documentacao: 'Aguardando Documentação',
  em_andamento: 'Em Andamento',
  aguardando_cliente: 'Aguardando Cliente',
  concluido: 'Concluído',
  rejeitado_compliance: 'Rejeitado por Compliance',
  cancelado: 'Cancelado',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { tipo, implantacao_id, status_anterior, status_novo, observacao } = body;

    if (!implantacao_id) return Response.json({ error: 'implantacao_id é obrigatório' }, { status: 400 });

    const implantacao = await base44.asServiceRole.entities.Implantacao.get(implantacao_id);
    if (!implantacao) return Response.json({ error: 'Implantação não encontrada' }, { status: 404 });

    // Destinatários: admins + vendedor da venda
    const usuarios = await base44.asServiceRole.entities.User.list();
    const admins = usuarios.filter(u => (u.role === 'admin' || u.permissao_admin === true) && u.email);

    // Buscar email do vendedor
    let vendedorEmail = null;
    if (implantacao.vendedor_id) {
      const vendedores = await base44.asServiceRole.entities.Vendedor.filter({ id: implantacao.vendedor_id });
      if (vendedores.length > 0 && vendedores[0].email) vendedorEmail = vendedores[0].email;
    }

    // Lista única de destinatários
    const destinatarios = [...admins];
    if (vendedorEmail && !destinatarios.find(d => d.email === vendedorEmail)) {
      const vendedorUser = usuarios.find(u => u.email?.toLowerCase() === vendedorEmail.toLowerCase());
      if (vendedorUser) destinatarios.push(vendedorUser);
    }

    // Padrinho do produto (responsável pela gestão da implantação do produto)
    let padrinhoNome = implantacao.padrinho_nome || '';
    let padrinhoEmail = implantacao.padrinho_email || '';
    if (!padrinhoEmail && implantacao.produto) {
      try {
        const padrinhos = await base44.asServiceRole.entities.PadrinhoProduto.filter({ produto: implantacao.produto, ativo: true });
        if (padrinhos.length > 0) {
          padrinhoNome = padrinhos[0].user_nome || '';
          padrinhoEmail = padrinhos[0].user_email || '';
        }
      } catch (e) {}
    }
    if (padrinhoEmail && !destinatarios.find(d => d.email?.toLowerCase() === padrinhoEmail.toLowerCase())) {
      const padrinhoUser = usuarios.find(u => u.email?.toLowerCase() === padrinhoEmail.toLowerCase());
      if (padrinhoUser) destinatarios.push(padrinhoUser);
    }

    if (destinatarios.length === 0) {
      return Response.json({ ok: true, notificados: 0 });
    }

    const fmtVal = (v) => v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
    const nomeCliente = implantacao.cliente_nome || '—';
    const produto = implantacao.produto || '—';
    const vendedor = implantacao.vendedor_nome || '—';
    const valor = fmtVal(implantacao.valor_contrato);
    const responsavel = implantacao.responsavel_implantacao || 'Não definido';
    const statusLabel = STATUS_LABELS[implantacao.status] || implantacao.status;

    const ehNovo = tipo === 'novo';

    // Mensagem Jarvis
    const titulo = ehNovo ? '🚀 Nova Implantação Iniciada' : '🔄 Atualização de Implantação';
    let mensagemJarvis = `${titulo}\n\n` +
      `**Cliente:** ${nomeCliente}\n` +
      `**Produto:** ${produto}\n` +
      `**Vendedor:** ${vendedor}\n` +
      `**Responsável:** ${responsavel}\n` +
      `**Padrinho:** ${padrinhoNome || 'Não definido'}\n` +
      `**Valor:** ${valor}\n` +
      `**Status:** ${statusLabel}\n`;

    if (!ehNovo && status_anterior && status_novo) {
      mensagemJarvis += `**Alteração:** ${STATUS_LABELS[status_anterior] || status_anterior} → ${STATUS_LABELS[status_novo] || status_novo}\n`;
    }
    if (observacao) {
      mensagemJarvis += `**Observação:** ${observacao}\n`;
    }
    mensagemJarvis += `\n📌 Acompanhe o processo na página de *Implantações* na plataforma.`;

    // NOTIFICAÇÃO DE AUTORIZAÇÃO REMOVIDA:
    // A notificação na entidade NotificacaoAutorizacao (status: pendente) era criada
    // para TODA venda nova, poluindo a fila de aprovações dos administradores.
    // Implantações são informativas (apenas Jarvis, sem e-mail), não requerem autorização.
    // NotificacaoAutorizacao deve ser reservada para casos que exigem aprovação
    // (ex: espelhamento acima de 30%, novo contrato para link de assinatura).

    // Enviar via Jarvis + e-mail para cada destinatário
    let enviados = 0;
    for (const dest of destinatarios) {
      try {
        // Jarvis
        await base44.asServiceRole.entities.JarvisMensagem.create({
          destinatario_email: dest.email,
          remetente_nome: 'Sistema',
          remetente_email: '',
          mensagem: mensagemJarvis,
          lida: false,
        });

        // Sem e-mail — notificação apenas interna (Jarvis), conforme combinado.
        enviados++;
      } catch (e) {
        console.log(`Erro ao notificar ${dest.email}: ${e.message}`);
      }
    }

    return Response.json({ ok: true, notificados: enviados });
  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});