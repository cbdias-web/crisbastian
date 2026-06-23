import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversa_id, texto } = await req.json();
    if (!conversa_id || !texto) {
      return Response.json({ error: 'conversa_id e texto são obrigatórios' }, { status: 400 });
    }

    const conversa = await base44.asServiceRole.entities.ConversaWhatsapp.filter({ id: conversa_id });
    if (!conversa.length) return Response.json({ error: 'Conversa não encontrada' }, { status: 404 });

    const conv = conversa[0];
    const apiToken = Deno.env.get('UMBLER_API_TOKEN');
    const fromPhone = Deno.env.get('UMBLER_FROM_PHONE');
    const organizationId = Deno.env.get('UMBLER_ORGANIZATION_ID');

    if (!apiToken || !fromPhone || !organizationId) {
      return Response.json({ error: 'Credenciais do Umbler Talk não configuradas' }, { status: 500 });
    }

    // Normalizar telefone para E.164 (com + e DDI)
    let toPhone = (conv.telefone || '').replace(/\D/g, '');
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

    // Salvar mensagem no histórico
    const mensagens = conv.mensagens || [];
    await base44.asServiceRole.entities.ConversaWhatsapp.update(conv.id, {
      mensagens: [...mensagens, {
        de: user.full_name || 'Gerente',
        texto,
        timestamp: new Date().toISOString(),
        tipo: 'enviada',
      }],
      ultima_mensagem: texto,
      ultima_mensagem_em: new Date().toISOString(),
      ultima_resposta_gerente_em: new Date().toISOString(),
      nao_lidas: 0,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});