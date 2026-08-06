import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = '69fb9176f017da4e4ddd9ff8';

const norm = (s) => (s || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Check-only mode: just verify if connection exists
    if (body.__check_only) {
      await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      return Response.json({ connected: true });
    }

    const {
      agenda_id, lead_nome, data_agendada, horario_inicio, horario_fim,
      target_user_email, target_vendedor_nome, organizer_email,
      adicionais_nomes, attendees_emails, com_meet,
    } = body;

    if (!agenda_id || !data_agendada) {
      return Response.json({ error: 'agenda_id e data_agendada são obrigatórios' }, { status: 400 });
    }

    // Busca usuários para resolver o e-mail de login (pode divergir do e-mail do cadastro de Vendedor)
    const allUsers = await base44.asServiceRole.entities.User.list();
    const findUserByEmail = (em) => allUsers.find(u => u.email === em);
    const findUserByName = (nm) => allUsers.find(u => norm(u.full_name) === norm(nm));

    // Resolve o gerente alvo: prefere o e-mail que bate com um usuário real
    let targetEmail = target_user_email || '';
    let targetUser = targetEmail ? findUserByEmail(targetEmail) : null;
    if (!targetUser && target_vendedor_nome) {
      targetUser = findUserByName(target_vendedor_nome);
      if (targetUser) targetEmail = targetUser.email;
    }

    // Resolve access token: tenta o Google Calendar do gerente alvo; se não tiver, cai no do criador
    let accessToken;
    let usedTargetConnection = false;
    try {
      if (targetUser && targetUser.id !== user.id) {
        try {
          const conn = await base44.asServiceRole.connectors.getAppUserConnection(CONNECTOR_ID, targetUser.id);
          accessToken = conn.accessToken;
          usedTargetConnection = true;
        } catch (e) {
          const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
          accessToken = conn.accessToken;
        }
      } else {
        const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
        accessToken = conn.accessToken;
      }
    } catch (e) {
      // Nenhum Google Calendar conectado — encerra silenciosamente
      return Response.json({ skipped: true, reason: 'no_google_calendar_connection' });
    }

    // O dono do calendário (organizador do evento) é quem cedeu o token
    const organizerEmail = usedTargetConnection ? targetUser.email : user.email;

    // Build event times (default 1h from horario_inicio)
    const dateStr = data_agendada;
    const startTime = horario_inicio || '09:00';
    const endHour = String(parseInt(startTime.split(':')[0]) + 1).padStart(2, '0');
    const endTime = horario_fim || `${endHour}:${startTime.split(':')[1]}`;
    const startDateTime = `${dateStr}T${startTime}:00-03:00`;
    const endDateTime = `${dateStr}T${endTime}:00-03:00`;

    // Monta lista de participantes (e-mails de login reais) — todos exceto o organizador
    const attendees = [];
    const pushAttendee = (em) => {
      if (em && em !== organizerEmail && !attendees.some(a => a.email === em)) {
        attendees.push({ email: em });
      }
    };
    // Quem criou o agendamento
    pushAttendee(organizer_email);
    // Gerente alvo (se o evento não ficou no calendário dele, ele vira convidado)
    pushAttendee(targetEmail);
    // Gerentes adicionais (resolve por nome → e-mail de login)
    if (Array.isArray(adicionais_nomes)) {
      for (const nm of adicionais_nomes) {
        const u = findUserByName(nm);
        if (u) pushAttendee(u.email);
      }
    }
    // E-mails passados diretamente (fallback)
    if (Array.isArray(attendees_emails)) {
      for (const em of attendees_emails) pushAttendee(em);
    }

    // com_meet=true → inclui conferenceData para gerar link Meet
    // com_meet=false → evento simples no Calendar, sem Meet
    const eventBody = {
      summary: `Reunião com ${lead_nome || 'Lead'}`,
      description: `Compromisso de prospecção gerado pela Villela Exchange.\nCliente: ${lead_nome || ''}`,
      start: { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: endDateTime, timeZone: 'America/Sao_Paulo' },
      attendees: attendees.length > 0 ? attendees : undefined,
      ...(com_meet ? {
        conferenceData: {
          createRequest: {
            requestId: `villela-${agenda_id}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      } : {}),
    };

    const url = com_meet
      ? 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all'
      : 'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err.error?.message || 'Erro ao crear evento' }, { status: res.status });
    }

    const event = await res.json();

    const meetLink = event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri
      || event.hangoutLink
      || null;

    const updateData = { google_event_id: event.id };
    if (meetLink) updateData.meet_link = meetLink;

    await base44.asServiceRole.entities.AgendaContato.update(agenda_id, updateData);

    return Response.json({
      google_event_id: event.id,
      meet_link: meetLink || null,
      calendar_link: event.htmlLink || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});