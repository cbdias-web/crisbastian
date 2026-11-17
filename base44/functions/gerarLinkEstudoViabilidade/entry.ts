import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Gera (ou reaproveita) o token do link público do formulário de Estudo de Viabilidade.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { estudo_id } = await req.json();
    if (!estudo_id) return Response.json({ error: 'estudo_id obrigatorio' }, { status: 400 });

    const estudo = await base44.entities.EstudoViabilidade.get(estudo_id);
    if (!estudo) return Response.json({ error: 'Estudo nao encontrado' }, { status: 404 });

    const token = estudo.link_token || (crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36));
    const update: Record<string, unknown> = {
      link_token: token,
      link_gerado_em: estudo.link_gerado_em || new Date().toISOString(),
    };
    if (!estudo.status || estudo.status === 'rascunho') {
      update.status = 'enviado_cliente';
      update.data_envio_cliente = new Date().toISOString();
    }
    await base44.entities.EstudoViabilidade.update(estudo_id, update);

    return Response.json({ token, link: `/estudo-viabilidade/${token}` });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
