import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function isoNowBrasilia() {
  const d = new Date();
  const tzDate = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const diff = d.getTime() - tzDate.getTime();
  return new Date(d.getTime() - diff).toISOString().replace('Z', '-03:00');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { event, data } = body;

    // Só processa criação
    if (event?.type !== 'create') {
      return Response.json({ ok: true, skipped: true });
    }

    const contrato = data;
    if (!contrato) return Response.json({ error: 'Dados do contrato não encontrados' }, { status: 400 });

    // Buscar todos os admins
    const usuarios = await base44.asServiceRole.entities.User.list();
    const admins = usuarios.filter(u => (u.role === 'admin' || u.permissao_admin === true) && u.email);

    if (admins.length === 0) {
      console.log('Nenhum admin encontrado para notificar.');
      return Response.json({ ok: true, admins_notificados: 0 });
    }

    const fmtVal = (v) => v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
    const nomeTipo = contrato.tipo || '—';
    const nomeCliente = contrato.nome || '—';
    const cpfCnpj = contrato.cpf_cnpj || '—';
    const vendedor = contrato.vendedor_nome || '—';
    const valorTotal = fmtVal(contrato.valor_total || contrato.valor_adesao);

    // Mensagem para o Jarvis
    const mensagemJarvis = `📄 *Novo Contrato Criado*\n\n` +
      `**Tipo:** ${nomeTipo}\n` +
      `**Cliente:** ${nomeCliente}\n` +
      `**CPF/CNPJ:** ${cpfCnpj}\n` +
      `**Gerente:** ${vendedor}\n` +
      `**Valor Total:** ${valorTotal}\n\n` +
      `⚠️ *Ação necessária:* Acesse a plataforma, abra este contrato e adicione o **link de assinatura online** para que o gerente possa enviar ao cliente.`;

    // Criar registro na aba Notificações
    await base44.asServiceRole.entities.NotificacaoAutorizacao.create({
      tipo: 'novo_contrato',
      vendedor_nome: vendedor,
      cliente: nomeCliente,
      valor_venda: contrato.valor_total || contrato.valor_adesao || 0,
      total_espelhamento: 0,
      contrato_id: contrato.id || '',
      contrato_tipo: nomeTipo,
      status: 'pendente',
      lida: false,
    });

    // Enviar via Jarvis (JarvisMensagem) apenas — sem e-mail
    let enviados = 0;
    for (const admin of admins) {
      try {
        // Jarvis
        await base44.asServiceRole.entities.JarvisMensagem.create({
          destinatario_email: admin.email,
          remetente_nome: 'Sistema',
          remetente_email: '',
          mensagem: mensagemJarvis,
          lida: false,
        });

        // Sem e-mail — notificação apenas interna (Jarvis + aba Notificações),
        // conforme combinado com a equipe.
        enviados++;
      } catch (e) {
        console.log(`Erro ao notificar ${admin.email}: ${e.message}`);
      }
    }

    console.log(`Notificação de novo contrato enviada para ${enviados} admin(s) via Jarvis e aba Notificações (sem e-mail).`);
    return Response.json({ ok: true, admins_notificados: enviados });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});