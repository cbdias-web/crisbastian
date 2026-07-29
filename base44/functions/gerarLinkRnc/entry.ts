import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.permissao_admin !== true) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { rnc_id } = body;
    if (!rnc_id) return Response.json({ error: 'rnc_id obrigatorio' }, { status: 400 });

    const rnc = await base44.entities.RncCanalBancario.get(rnc_id);
    if (!rnc) return Response.json({ error: 'RNC nao encontrada' }, { status: 404 });

    let token = rnc.link_token;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
    }

    await base44.entities.RncCanalBancario.update(rnc_id, {
      link_token: token,
      link_gerado_em: new Date().toISOString(),
      link_origem_admin: user.email,
    });

    return Response.json({ token, link: `/rnc-publica/${token}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}