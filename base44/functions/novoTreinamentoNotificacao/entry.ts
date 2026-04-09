import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const aula = payload.data;
    if (!aula || !aula.titulo) {
      return Response.json({ ok: true, skipped: 'sem dados da aula' });
    }

    if (aula.ativo === false) {
      return Response.json({ ok: true, skipped: 'aula inativa' });
    }

    // Buscar o nome do módulo
    let moduloTitulo = '';
    if (aula.modulo_id) {
      const modulos = await base44.asServiceRole.entities.TreinamentoModulo.filter({ id: aula.modulo_id }).catch(() => []);
      if (modulos.length > 0) moduloTitulo = modulos[0].titulo;
    }

    const titulo = `📚 Novo Conteúdo de Treinamento${moduloTitulo ? `: ${moduloTitulo}` : ''}`;
    const mensagem = `Um novo conteúdo foi adicionado à plataforma de treinamentos!\n\n**${aula.titulo}**${moduloTitulo ? `\n📂 Módulo: ${moduloTitulo}` : ''}${aula.descricao ? `\n\n${aula.descricao}` : ''}\n\nAcesse a seção de **Treinamentos** para ver o conteúdo completo. 🎓`;

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