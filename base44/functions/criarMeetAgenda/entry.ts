import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = '69fb9176f017da4e4ddd9ff8';

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

    const { agenda_id, lead_nome, data_agendada, horario_inicio, horario_fim, target_user_email, organizer_email, com_meet } = body;

    if (!agenda_id || !data_agendada) {
      return Response.json({ error: 'agenda_id e data_agendada são obrigatórios' }, { status: 400 });
    }

    // Resolve access token: tenta usar o token do gerente alvo, se fornecido
    let accessToken;
    let targetEmail = user.email;

    if (target_user_email && target_user_email !== user.email) {
      try {
        const allUsers = await base44.asServiceRole.entities.User.list();
        const targetUser = allUsers.find(u => u.email === target_user_email);
        if (targetUser) {
          const targetConnection = await base44.asServiceRole.connectors.getAppUserConnection(CONNECTOR_ID, targetUser.id);
          accessToken = targetConnection.accessToken;
          targetEmail = target_user_email;
        } else {
          const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
          accessToken = conn.accessToken;
        }
      } catch (e) {
        // Gerente alvo não tem Google Calendar vinculado: usa token do criador
        const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
        accessToken = conn.accessToken;
      }
    } else {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    }

    // Build event times (default 1h from horario_inicio)
    const dateStr = data_agendada;
    const startTime = horario_inicio || '09:00';
    const endHour = String(parseInt(startTime.split(':')[0]) + 1).padStart(2, '0');
    const endTime = horario_fim || `${endHour}:${startTime.split(':')[1]}`;

    const startDateTime = `${dateStr}T${startTime}:00-03:00`;
    const endDateTime = `${dateStr}T${endTime}:00-03:00`;

    // Build attendees list
    const attendees = [];
    if (organizer_email && organizer_email !== targetEmail) {
      attendees.push({ email: organizer_email });
    }
    if (target_user_email && target_user_email !== user.email && target_user_email !== organizer_email) {
      attendees.push({ email: target_user_email });
    }

    // Monta o corpo do evento
    // com_meet=true → inclui conferenceData para gerar link Meet
    // com_meet=false/undefined → evento simples no Calendar, sem Meet
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
      return Response.json({ error: err.error?.message || 'Erro ao criar evento' }, { status: res.status });
    }

    const event = await res.json();

    // Extrai link Meet se veio (apenas quando com_meet=true)
    const meetLink = event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri
      || event.hangoutLink
      || null;

    // Salva google_event_id sempre; meet_link apenas se gerado
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