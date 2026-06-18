import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  // Validar token secreto
  const token = req.headers.get('x-webhook-token');
  if (token !== Deno.env.get('WEBHOOK_SECRET_TOKEN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const base44 = createClientFromRequest(req);
  const body = await req.json();

  // Payload esperado da Z-API ou Make
  const { telefone, texto, timestamp } = body;

  if (!telefone || !texto) {
    return Response.json({ error: 'telefone e texto são obrigatórios' }, { status: 400 });
  }

  // Normalizar telefone (remover + e espaços)
  const telNorm = telefone.replace(/\D/g, '');

  // Buscar conversa ativa pelo telefone
  const conversas = await base44.asServiceRole.entities.ConversaWhatsapp.filter({ telefone: telNorm });
  if (!conversas.length) {
    return Response.json({ error: 'Conversa não encontrada para este telefone' }, { status: 404 });
  }

  const conversa = conversas[0];
  const mensagens = conversa.mensagens || [];
  const novaMensagem = {
    de: conversa.lead_nome,
    texto,
    timestamp: timestamp || new Date().toISOString(),
    tipo: 'recebida',
  };

  await base44.asServiceRole.entities.ConversaWhatsapp.update(conversa.id, {
    mensagens: [...mensagens, novaMensagem],
    ultima_mensagem: texto,
    ultima_mensagem_em: new Date().toISOString(),
    nao_lidas: (conversa.nao_lidas || 0) + 1,
  });

  return Response.json({ success: true, conversa_id: conversa.id });
});