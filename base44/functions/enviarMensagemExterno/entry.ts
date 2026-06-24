import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    // Autenticação via token secreto (mesmo usado no webhook de leads)
    const token = req.headers.get('x-webhook-token');
    if (token !== Deno.env.get('WEBHOOK_SECRET_TOKEN')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const { telefone, texto, conversa_id } = await req.json();

    if (!telefone || !texto) {
      return Response.json({ error: 'telefone e texto são obrigatórios' }, { status: 400 });
    }

    const apiToken = Deno.env.get('UMBLER_API_TOKEN');
    const fromPhone = Deno.env.get('UMBLER_FROM_PHONE');
    const organizationId = Deno.env.get('UMBLER_ORGANIZATION_ID');

    if (!apiToken || !fromPhone || !organizationId) {
      return Response.json({ error: 'Credenciais do Umbler Talk não configuradas' }, { status: 500 });
    }

    // Normalizar telefone para E.164 (com + e DDI)
    let toPhone = (telefone || '').replace(/\D/g, '');
    if (toPhone && !toPhone.startsWith('+')) toPhone = '+' + toPhone;

    // Enviar mensagem via Umbler Talk
    const umblerRes = await fetch('https://app-utalk.umbler.com/api/v1/messages/simplified/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        ToPhone: toPhone,
        FromPhone: fromPhone,
        OrganizationId: organizationId,
        Message: texto,
      }),
    });

    if (!umblerRes.ok) {
      const err = await umblerRes.text();
      return Response.json({ error: 'Falha ao enviar via Umbler Talk: ' + err }, { status: 500 });
    }

    // Se informou conversa_id, salvar no histórico da conversa
    if (conversa_id) {
      const conversa = await base44.asServiceRole.entities.ConversaWhatsapp.filter({ id: conversa_id });
      if (conversa.length) {
        const conv = conversa[0];
        const mensagens = conv.mensagens || [];
        await base44.asServiceRole.entities.ConversaWhatsapp.update(conv.id, {
          mensagens: [...mensagens, {
            de: 'Make (Automação)',
            texto,
            timestamp: new Date().toISOString(),
            tipo: 'enviada',
          }],
          ultima_mensagem: texto,
          ultima_mensagem_em: new Date().toISOString(),
          nao_lidas: 0,
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});