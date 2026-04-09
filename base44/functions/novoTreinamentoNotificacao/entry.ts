import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const modulo = payload.data;
    if (!modulo || !modulo.titulo) {
      return Response.json({ ok: true, skipped: 'sem dados do módulo' });
    }

    // Só notifica se o módulo estiver ativo
    if (modulo.ativo === false) {
      return Response.json({ ok: true, skipped: 'módulo inativo' });
    }

    const titulo = `📚 Novo Treinamento Disponível: ${modulo.titulo}`;
    const mensagem = `Um novo módulo de treinamento foi adicionado à plataforma!\n\n**${modulo.titulo}**${modulo.descricao ? `\n\n${modulo.descricao}` : ''}\n\nAcesse a seção de **Treinamentos** para começar.`;

    await base44.asServiceRole.entities.Comunicado.create({
      titulo,
      mensagem,
      ativo: true,
    });

    return Response.json({ ok: true, comunicado_criado: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});