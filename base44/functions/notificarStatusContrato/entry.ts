import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Envia notificações (apenas JarvisMensagem, sem e-mail) para as partes envolvidas quando
 * o status de um contrato muda ou uma ação relevante ocorre.
 *
 * Payload esperado:
 * {
 *   contrato_id: string,
 *   evento: string,   // chave do evento (ver EVENTOS abaixo)
 *   destinatarios: 'admins' | 'gerente' | 'todos'
 * }
 */

const EVENTOS = {
  pdf_anexado: {
    titulo: '📄 PDF do contrato anexado',
    mensagem: (c) => `O gerente ${c.vendedor_nome || 'N/A'} anexou o PDF do contrato de ${c.tipo} para o cliente ${c.nome}. Por favor, gere o link de assinatura.`,
    paraAdmin: true,
  },
  pdf_gerado: {
    titulo: '📄 PDF do contrato gerado',
    mensagem: (c) => `O PDF do contrato de ${c.tipo} para o cliente ${c.nome} foi gerado pelo gerente ${c.vendedor_nome || 'N/A'}. Por favor, gere o link de assinatura.`,
    paraAdmin: true,
  },
  link_assinatura_adicionado: {
    titulo: '🔗 Link de assinatura disponível',
    mensagem: (c) => `O administrador adicionou o link de assinatura do contrato ${c.tipo} do cliente ${c.nome}. Envie o link ao cliente para coletar a assinatura.`,
    paraAdmin: false,
  },
  contrato_assinado: {
    titulo: '✅ Contrato assinado',
    mensagem: (c) => `O contrato de ${c.tipo} do cliente ${c.nome} foi marcado como assinado pelo gerente ${c.vendedor_nome || 'N/A'}. Providencie a cobrança ao cliente.`,
    paraAdmin: true,
  },
  cobranca_enviada: {
    titulo: '💳 Cobrança enviada ao cliente',
    mensagem: (c) => `O administrador enviou a cobrança (link de pagamento ou boleto) para o contrato ${c.tipo} do cliente ${c.nome}. Envie ao cliente e aguarde o pagamento.`,
    paraAdmin: false,
  },
  comprovante_anexado: {
    titulo: '🧾 Comprovante de pagamento anexado',
    mensagem: (c) => `O gerente ${c.vendedor_nome || 'N/A'} anexou o comprovante de pagamento do contrato ${c.tipo} do cliente ${c.nome}. Confirme o recebimento e avance para o pipeline.`,
    paraAdmin: true,
  },
  contrato_pago: {
    titulo: '💰 Pagamento confirmado',
    mensagem: (c) => `O pagamento do contrato ${c.tipo} do cliente ${c.nome} foi confirmado. O contrato está pronto para ser enviado ao pipeline.`,
    paraAdmin: false,
  },
  no_pipeline: {
    titulo: '🚀 Contrato enviado ao pipeline',
    mensagem: (c) => `O contrato ${c.tipo} do cliente ${c.nome} foi enviado ao pipeline. Uma venda foi gerada para finalização.`,
    paraAdmin: false,
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { contrato_id, evento, destinatarios } = await req.json();

    if (!contrato_id || !evento) {
      return Response.json({ error: 'contrato_id e evento são obrigatórios' }, { status: 400 });
    }

    const eventoConfig = EVENTOS[evento];
    if (!eventoConfig) {
      return Response.json({ error: `Evento desconhecido: ${evento}` }, { status: 400 });
    }

    // Buscar contrato
    const contrato = await base44.asServiceRole.entities.Contrato.get(contrato_id);
    if (!contrato) return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });

    const mensagem = eventoConfig.mensagem(contrato);
    const titulo = eventoConfig.titulo;
    const paraAdmin = eventoConfig.paraAdmin;

    // Buscar todos os usuários
    const todosUsuarios = await base44.asServiceRole.entities.User.list();

    // Determinar destinatários
    let alvos = [];

    if (destinatarios === 'admins' || paraAdmin) {
      const admins = todosUsuarios.filter(u => u.role === 'admin' || u.permissao_admin === true);
      alvos.push(...admins);
    }

    if (destinatarios === 'gerente' || !paraAdmin || destinatarios === 'todos') {
      // Adicionar o gerente que gerou o contrato (pelo vendedor_id ou created_by)
      const gerente = todosUsuarios.find(u =>
        u.id === contrato.vendedor_id || u.email === contrato.created_by
      );
      if (gerente && !alvos.find(a => a.id === gerente.id)) {
        alvos.push(gerente);
      }
    }

    if (destinatarios === 'todos') {
      const admins = todosUsuarios.filter(u => u.role === 'admin' || u.permissao_admin === true);
      admins.forEach(a => { if (!alvos.find(x => x.id === a.id)) alvos.push(a); });
    }

    // Remover duplicatas e garantir que tem email
    alvos = alvos.filter((u, i, arr) => u.email && arr.findIndex(x => x.id === u.id) === i);

    let enviados = 0;
    for (const alvo of alvos) {
      try {
        // JarvisMensagem (notificação interna)
        await base44.asServiceRole.entities.JarvisMensagem.create({
          destinatario_email: alvo.email,
          remetente_nome: 'Sistema de Contratos',
          remetente_email: user.email,
          mensagem: `**${titulo}**\n\n${mensagem}`,
          lida: false,
        });

        // Sem e-mail — notificação apenas interna (Jarvis), conforme combinado.
        enviados++;
      } catch (e) {
        console.error(`Erro ao notificar ${alvo.email}:`, e.message);
      }
    }

    return Response.json({ ok: true, enviados, evento, destinatarios: alvos.map(a => a.email) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});