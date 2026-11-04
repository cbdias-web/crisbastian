import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getConfigFila, listAll } from '../../shared/listAll.ts';
import { agoraBrasilia, isDiaUtil } from '../../shared/diaUtil.ts';

// Agendamento self-service para o lead (link público /agendar/:token).
// Ações: gerar_link (gerente logado) | info (público) | agendar (público)
// Disponibilidade = janela do gerente − (AgendaContato com horário + reuniões já marcadas + Google free/busy, se o connector permitir).

const CONNECTOR_ID = '69fb9176f017da4e4ddd9ff8';
const hmMin = (s: string, pad: string) => { const [h, m] = (s || pad).split(':').map(Number); return h * 60 + (m || 0); };
const pad2 = (n: number) => String(n).padStart(2, '0');
const addDias = (data: string, n: number) => { const [a, m, d] = data.split('-').map(Number); const dt = new Date(a, m - 1, d + n); return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`; };
const isoBr = (data: string, min: number) => `${data}T${pad2(Math.floor(min / 60))}:${pad2(min % 60)}:00-03:00`;

async function tokenGoogle(base44: any, vendedor: any) {
  try {
    const users = await base44.asServiceRole.entities.User.filter({ email: vendedor.email });
    if (!users[0]) return null;
    const conn = await base44.asServiceRole.connectors.getAppUserConnection(CONNECTOR_ID, users[0].id);
    return conn?.accessToken || null;
  } catch { return null; }
}

async function ocupados(base44: any, vendedor: any, de: string, ate: string, token: string | null) {
  const sr = base44.asServiceRole.entities;
  const out: Array<[number, number]> = [];
  const ags = await listAll(sr.AgendaContato, { vendedor_id: vendedor.id, status: 'pendente', data_agendada: { $gte: de, $lte: ate } }, 'data_agendada');
  for (const a of ags) if (a.horario) { const t = new Date(isoBr(a.data_agendada, hmMin(a.horario, '09:00'))).getTime(); out.push([t, t + 30 * 60000]); }
  const reus = await listAll(sr.FilaContato, { vendedor_id: vendedor.id, status: 'reuniao_marcada' }, '-updated_date');
  for (const r of reus) if (r.reuniao_em) { const t = new Date(r.reuniao_em).getTime(); out.push([t, t + 30 * 60000]); }
  if (token) {
    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeMin: isoBr(de, 0), timeMax: isoBr(ate, 24 * 60 - 1), timeZone: 'America/Sao_Paulo', items: [{ id: 'primary' }] }),
      });
      if (res.ok) { const j = await res.json(); for (const b of j.calendars?.primary?.busy || []) out.push([new Date(b.start).getTime(), new Date(b.end).getTime()]); }
    } catch { /* sem free/busy: usa só a agenda interna */ }
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({})) || {};
    const { action } = body;
    const cfg = await getConfigFila(base44);

    if (action === 'gerar_link') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const fila = await sr.FilaContato.get(body.fila_id).catch(() => null);
      if (!fila) return Response.json({ error: 'Item não encontrado' }, { status: 404 });
      const token = crypto.randomUUID().replace(/-/g, '');
      await sr.LinkAgendamento.create({ token, vendedor_id: fila.vendedor_id, vendedor_nome: fila.vendedor_nome || '', fila_id: fila.id, lead_nome: fila.nome, duracao_min: 30, status: 'aberto', expira_em: new Date(Date.now() + 7 * 86400000).toISOString() });
      return Response.json({ success: true, token });
    }

    const links = await sr.LinkAgendamento.filter({ token: String(body.token || '') }, '-created_date', 1);
    const link = links[0];
    if (!link || link.status === 'expirado' || (link.expira_em && new Date(link.expira_em) < new Date())) return Response.json({ error: 'Link expirado ou inválido' }, { status: 404 });
    const vendedor = await sr.Vendedor.get(link.vendedor_id).catch(() => null);
    if (!vendedor) return Response.json({ error: 'Gerente não encontrado' }, { status: 404 });
    const dur = link.duracao_min || 30;

    if (action === 'info') {
      if (link.status === 'agendado') return Response.json({ agendado: true, quando: link.slot_escolhido, meet_link: link.meet_link || null, gerente: vendedor.nome, lead: link.lead_nome });
      const nowB = agoraBrasilia();
      const de = nowB.data, ate = addDias(nowB.data, 14);
      const token = await tokenGoogle(base44, vendedor);
      const busy = await ocupados(base44, vendedor, de, ate, token);
      const ini = hmMin(vendedor.janela_inicio || cfg.janela_inicio, '09:00'), fim = hmMin(vendedor.janela_fim || cfg.janela_fim, '18:00');
      const slots: Array<{ data: string; hora: string; iso: string }> = [];
      for (let d = 0; d <= 14 && slots.length < 60; d++) {
        const data = addDias(de, d);
        const dow = new Date(`${data}T12:00:00-03:00`).getUTCDay();
        if (!isDiaUtil(data) || (cfg.feriados || []).includes(data) || !(cfg.dias_uteis || [1, 2, 3, 4, 5]).includes(dow)) continue;
        for (let m = ini; m + dur <= fim; m += dur) {
          const t0 = new Date(isoBr(data, m)).getTime(); const t1 = t0 + dur * 60000;
          if (t0 < Date.now() + 60 * 60000) continue; // antecedência mínima de 1h
          if (busy.some(([a, b]) => t0 < b && t1 > a)) continue;
          slots.push({ data, hora: `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`, iso: isoBr(data, m) });
        }
      }
      return Response.json({ gerente: vendedor.nome, lead: link.lead_nome, duracao_min: dur, slots, google: !!token });
    }

    if (action === 'agendar') {
      if (link.status === 'agendado') return Response.json({ error: 'Este link já foi utilizado' }, { status: 409 });
      const slot = String(body.slot || '');
      const t0 = new Date(slot).getTime();
      if (!t0 || t0 < Date.now()) return Response.json({ error: 'Horário inválido' }, { status: 400 });
      const dataSlot = slot.slice(0, 10);
      const token = await tokenGoogle(base44, vendedor);
      const busy = await ocupados(base44, vendedor, dataSlot, dataSlot, token);
      if (busy.some(([a, b]) => t0 < b && t0 + dur * 60000 > a)) return Response.json({ error: 'Esse horário acabou de ser ocupado. Escolha outro.' }, { status: 409 });

      const emailLead = String(body.email || '').trim();
      let meet: string | null = null, eventId: string | null = null;
      if (token) {
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: `Reunião com ${link.lead_nome} — Villela Exchange`,
            description: `Agendada pelo link de agendamento. Cliente: ${link.lead_nome}${body.telefone ? '\nTelefone: ' + body.telefone : ''}`,
            start: { dateTime: slot, timeZone: 'America/Sao_Paulo' },
            end: { dateTime: new Date(t0 + dur * 60000).toISOString(), timeZone: 'America/Sao_Paulo' },
            attendees: emailLead ? [{ email: emailLead }] : undefined,
            conferenceData: { createRequest: { requestId: `ag-${link.id}-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
          }),
        });
        if (res.ok) { const ev = await res.json(); eventId = ev.id; meet = ev.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || ev.hangoutLink || null; }
      }
      const reuniaoIso = new Date(t0).toISOString();
      const fila = link.fila_id ? await sr.FilaContato.get(link.fila_id).catch(() => null) : null;
      if (fila) {
        const hist = [...(fila.historico || []), { status: 'reuniao_marcada', observacao: `Lead agendou pelo link para ${slot.slice(8, 10)}/${slot.slice(5, 7)} ${slot.slice(11, 16)}`, data: new Date().toISOString() }];
        await sr.FilaContato.update(fila.id, { status: 'reuniao_marcada', reuniao_em: reuniaoIso, meet_link: meet || fila.meet_link || '', google_event_id: eventId || fila.google_event_id || '', status_desde: new Date().toISOString(), cadencia_passo: -1, historico: hist, email: emailLead || fila.email || undefined });
        await sr.RegistroContato.create({ fila_id: fila.id, cliente_id: fila.cliente_id || fila.ref_id, lead_nome: fila.nome, vendedor_id: fila.vendedor_id, vendedor_nome: fila.vendedor_nome || '', canal: 'reuniao', resultado: 'reuniao_marcada', data_dia: agoraBrasilia().data, observacao: 'Agendado pelo próprio lead (link)' }).catch(() => {});
      }
      await sr.LinkAgendamento.update(link.id, { status: 'agendado', slot_escolhido: slot, meet_link: meet || '', agendado_em: new Date().toISOString() });
      await sr.AlertaGerente.create({ vendedor_id: link.vendedor_id, tipo: 'outro', titulo: `📅 ${link.lead_nome} agendou reunião`, texto: `${slot.slice(8, 10)}/${slot.slice(5, 7)} às ${slot.slice(11, 16)}${meet ? ' — ' + meet : ''}`, fila_id: link.fila_id, chave: `agendou|${link.id}`, prioridade: 'alta', lido: false, criado_em: new Date().toISOString() }).catch(() => {});
      return Response.json({ success: true, quando: slot, meet_link: meet, gerente: vendedor.nome });
    }
    return Response.json({ error: 'ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('agendamentoPublico:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
