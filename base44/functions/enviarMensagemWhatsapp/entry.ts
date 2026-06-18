import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
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
  const instanceId = Deno.env.get('ZAPI_INSTANCE_ID');
  const zapiToken = Deno.env.get('ZAPI_TOKEN');
  const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');

  // Enviar mensagem via Z-API
  const zapiRes = await fetch(
    `https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/send-text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': clientToken,
      },
      body: JSON.stringify({
        phone: conv.telefone,
        message: texto,
      }),
    }
  );

  if (!zapiRes.ok) {
    const err = await zapiRes.text();
    return Response.json({ error: 'Falha ao enviar via Z-API: ' + err }, { status: 500 });
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
  });

  return Response.json({ success: true });
});