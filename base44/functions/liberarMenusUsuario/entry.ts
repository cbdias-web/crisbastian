import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TODOS_OS_MENUS = [
  'Dashboard',
  'Vendas',
  'Comissoes',
  'Clientes',
  'Vendedores',
  'Espelhamentos',
  'Notificacoes',
  'Manual',
  'MeusClientes',
  'RelatorioInteracoes',
  'RelatorioComissoes',
  'Leads',
  'Metas',
  'Produtos',
  'Importar',
  'Usuarios'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && !user.permissao_admin)) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // Buscar usuário por email
    const usuarios = await base44.asServiceRole.entities.User.filter({ email });
    
    if (usuarios.length === 0) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const usuarioEncontrado = usuarios[0];

    // Atualizar usuário com todos os menus
    await base44.asServiceRole.auth.updateUser(usuarioEncontrado.id, {
      menus_acesso: TODOS_OS_MENUS
    });

    return Response.json({
      success: true,
      message: `Todos os menus foram liberados para ${usuarioEncontrado.full_name} (${email})`,
      menus: TODOS_OS_MENUS
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});