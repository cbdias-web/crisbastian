import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { acharVendedor } from '../../shared/vendedorResolver.ts';

// Devolve o cadastro de Vendedor correto (id + nome canônico) para o usuário logado, para um usuário
// informado (user_id) ou para um vendedor_id/nome vindos de um contrato antigo.
// Body: { vendedor_id?, user_id?, nome?, email? }  (vazio = usuário logado)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch(() => null);
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({})) || {};
    const sr = base44.asServiceRole.entities;
    const vendedores = await sr.Vendedor.list('nome', 500);

    let user = null as any;
    if (body.user_id) user = await sr.User.get(body.user_id).catch(() => null);
    // vendedor_id de contrato antigo pode ser, na verdade, o id de um User
    if (!user && body.vendedor_id && !vendedores.some((v: any) => v.id === body.vendedor_id)) user = await sr.User.get(body.vendedor_id).catch(() => null);
    const usarLogado = !body.user_id && !body.vendedor_id && !body.nome && !body.email;
    if (usarLogado) user = me;

    const r = acharVendedor(vendedores, { vendedor_id: body.vendedor_id, email: body.email, user, nome: body.nome });
    if (!r.vendedor) return Response.json({ success: true, encontrado: false });
    const v = r.vendedor;
    return Response.json({ success: true, encontrado: true, via: r.via, ambiguo: !!r.ambiguo, vendedor: { id: v.id, nome: v.nome, email: v.email || '', time: v.time || '', ativo: v.ativo !== false } });
  } catch (error: any) {
    return Response.json({ error: String(error?.message || error).slice(0, 300) }, { status: 500 });
  }
});
