import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Usa service role para listar todos os usuários (qualquer usuário autenticado pode ver a lista do chat)
    const usuarios = await base44.asServiceRole.entities.User.list();

    // Retorna apenas campos necessários para o chat (sem dados sensíveis)
    const usuariosFiltrados = usuarios.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      nome_tratamento: u.nome_tratamento,
      ultimo_acesso: u.ultimo_acesso,
    }));

    return Response.json({ usuarios: usuariosFiltrados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});