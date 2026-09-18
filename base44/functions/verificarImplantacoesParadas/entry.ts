import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.permissao_admin !== true) {
      return Response.json({ error: 'Apenas administradores podem executar esta operação' }, { status: 403 });
    }

    // Buscar todas as implantações não concluídas/canceladas
    const todasImplantacoes = await base44.asServiceRole.entities.Implantacao.list('-updated_date', 500);
    const ativas = todasImplantacoes.filter(imp =>
      imp.status !== 'concluido' && imp.status !== 'cancelado' && imp.status !== 'rejeitado_compliance'
    );

    const agora = new Date();
    const DOIS_DIAS_MS = 2 * 24 * 60 * 60 * 1000;

    // Identificar processos parados há mais de 2 dias
    const paradas = [];
    for (const imp of ativas) {
      // Data de referência: última atualização do registro
      const dataRef = imp.updated_date ? new Date(imp.updated_date) : null;
      if (!dataRef) continue;

      const tempoParado = agora.getTime() - dataRef.getTime();
      if (tempoParado > DOIS_DIAS_MS) {
        paradas.push({
          id: imp.id,
          cliente_nome: imp.cliente_nome,
          produto: imp.produto,
          vendedor_nome: imp.vendedor_nome,
          responsavel_implantacao: imp.responsavel_implantacao,
          status: imp.status,
          data_entrada: imp.data_entrada,
          ultima_atualizacao: imp.updated_date,
          dias_parado: Math.floor(tempoParado / (24 * 60 * 60 * 1000)),
        });
      }
    }

    if (paradas.length === 0) {
      return Response.json({
        success: true,
        message: 'Nenhuma implantação parada há mais de 2 dias.',
        paradas: [],
      });
    }

    // Buscar administradores para notificar
    const admins = await base44.asServiceRole.entities.User.list();
    const adminEmails = admins.filter(u => u.role === 'admin' || u.permissao_admin === true).map(u => u.email).filter(Boolean);

    // Montar lista para o corpo do e-mail/notificação
    const listaHtml = paradas.map(p =>
      `• ${p.cliente_nome} — ${p.produto || '—'} | Responsável: ${p.responsavel_implantacao || p.vendedor_nome || '—'} | Parado há ${p.dias_parado} dia(s) | Status: ${p.status}`
    ).join('\n');

    // Notificar admins apenas via Jarvis (in-app) — disparos de e-mail desativados
    for (const email of adminEmails) {
      try {
        await base44.asServiceRole.entities.JarvisMensagem.create({
          destinatario_email: email,
          remetente_nome: 'Sistema',
          remetente_email: '',
          mensagem: `⚠️ *Implantações Paradas*\n\n${paradas.length} implantação(ões) sem atualização há mais de 2 dias:\n\n${listaHtml}\n\nAcesse a página de *Implantações* para regularizar os processos.`,
          lida: false,
        });
      } catch (e) {
        console.log('Erro ao notificar', email, ':', e.message);
      }
    }

    // Criar notificações no sistema para os administradores
    for (const p of paradas) {
      try {
        await base44.asServiceRole.entities.NotificacaoAutorizacao.create({
          tipo: 'implantacao',
          vendedor_nome: p.vendedor_nome || '',
          cliente: p.cliente_nome || '',
          status: 'pendente',
          lida: false,
        });
      } catch (e) {
        console.log('Erro ao criar notificação:', e.message);
      }
    }

    return Response.json({
      success: true,
      message: `${paradas.length} implantação(ões) parada(s) identificada(s). Admins notificados.`,
      paradas,
      admins_notificados: adminEmails.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});