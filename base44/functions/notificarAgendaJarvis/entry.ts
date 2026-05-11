import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Esta função é chamada por automação agendada — usa service role
    const agora = new Date();
    const hojeStr = agora.toISOString().split('T')[0];

    // Busca todos os agendamentos pendentes de hoje com horário definido
    const agendas = await base44.asServiceRole.entities.AgendaContato.filter({
      data_agendada: hojeStr,
      status: 'pendente',
    });

    const agendasComHorario = agendas.filter(a => a.horario);

    if (agendasComHorario.length === 0) {
      return Response.json({ mensagens_enviadas: 0, motivo: 'Nenhum agendamento com horário hoje' });
    }

    // Busca todos os usuários para mapear vendedor_id → email
    const users = await base44.asServiceRole.entities.User.list();
    const vendedores = await base44.asServiceRole.entities.Vendedor.list();

    // Map: vendedor_id → user email
    const vendedorEmailMap = {};
    for (const v of vendedores) {
      if (v.email) vendedorEmailMap[v.id] = v.email;
    }

    // Map: email → user (para obter ID do destinatário)
    const userEmailMap = {};
    for (const u of users) {
      if (u.email) userEmailMap[u.email] = u;
    }

    let enviadas = 0;
    const jaNotificadas = new Set();

    for (const agenda of agendasComHorario) {
      const [hh, mm] = agenda.horario.split(':').map(Number);
      const horarioCompromisso = new Date(agora);
      horarioCompromisso.setHours(hh, mm, 0, 0);

      const diffMs = horarioCompromisso - agora;
      const diffMin = diffMs / 60000;

      // Janela: entre 9 e 11 minutos (para a execução da automação a cada 5 min pegar a janela de 10 min)
      if (diffMin >= 9 && diffMin <= 11) {
        const chave = `${agenda.id}`;
        if (jaNotificadas.has(chave)) continue;
        jaNotificadas.add(chave);

        const emailVendedor = vendedorEmailMap[agenda.vendedor_id];
        if (!emailVendedor) continue;

        const destinatario = userEmailMap[emailVendedor];
        if (!destinatario) continue;

        const msgTexto = `⏰ Lembrete: você tem um compromisso com *${agenda.lead_nome}* às *${agenda.horario}* — em aproximadamente 10 minutos!\n\n${agenda.lead_telefone ? `📱 Telefone: ${agenda.lead_telefone}` : ''}\n\nAcesse a Agenda do Dia para registrar o contato.`;

        await base44.asServiceRole.entities.JarvisMensagem.create({
          destinatario_email: emailVendedor,
          remetente_nome: 'Jarvis',
          remetente_email: 'jarvis@villelaexchange.com',
          mensagem: msgTexto,
          lida: false,
        });

        enviadas++;
      }
    }

    return Response.json({ mensagens_enviadas: enviadas, verificados: agendasComHorario.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});