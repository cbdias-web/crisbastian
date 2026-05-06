import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = '69fb9176f017da4e4ddd9ff8';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agenda_id, lead_nome, data_agendada, horario_inicio, horario_fim } = await req.json();

    if (!agenda_id || !data_agendada) {
      return Response.json({ error: 'agenda_id e data_agendada são obrigatórios' }, { status: 400 });
    }

    // Get the app user's Google Calendar token
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    // Build event times (default 1h from horario_inicio)
    const dateStr = data_agendada; // yyyy-MM-dd
    const startTime = horario_inicio || '09:00';
    const endTime = horario_fim || `${String(parseInt(startTime.split(':')[0]) + 1).padStart(2, '0')}:${startTime.split(':')[1]}`;

    const startDateTime = `${dateStr}T${startTime}:00`;
    const endDateTime = `${dateStr}T${endTime}:00`;

    const eventBody = {
      summary: `Reunião com ${lead_nome || 'Lead'}`,
      description: `Compromisso de prospecção gerado pela Villela Exchange.`,
      start: { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: endDateTime, timeZone: 'America/Sao_Paulo' },
      conferenceData: {
        createRequest: {
          requestId: `villela-${agenda_id}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err.error?.message || 'Erro ao criar evento' }, { status: res.status });
    }

    const event = await res.json();
    const meetLink = event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri
      || event.hangoutLink
      || null;

    if (!meetLink) {
      return Response.json({ error: 'Evento criado mas link Meet não retornado' }, { status: 500 });
    }

    // Save meet_link and google_event_id on the AgendaContato record
    await base44.asServiceRole.entities.AgendaContato.update(agenda_id, {
      meet_link: meetLink,
      google_event_id: event.id,
    });

    return Response.json({ meet_link: meetLink, google_event_id: event.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});