import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }
    const { published_at, is_first_publish, published_by } = body || {};

    if (!published_at) {
      return Response.json({ error: 'published_at ausente' }, { status: 400 });
    }

    // Registra a nova versão — a barra de atualização aparece para todos os
    // usuários logados enquanto esta publicação for mais recente que o carregamento da página deles.
    const registro = await base44.asServiceRole.entities.VersaoApp.create({
      versao: published_at,
      publicada_em: published_at,
      publicada_por: published_by || '',
      primeira_publicacao: is_first_publish === true,
      mensagem: 'Uma nova versão da plataforma foi publicada! Atualize a página para receber as melhorias mais recentes.',
    });

    console.log(`Nova versão registrada: ${registro.id} (${published_at})`);
    return Response.json({ ok: true, id: registro.id });
  } catch (error) {
    console.error('Erro ao registrar nova versão:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});