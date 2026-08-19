import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Gera (ou recupera) um link público de indicação para um parceiro.
// Acesso restrito a administradores.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin' && user.permissao_admin !== true) {
      return Response.json({ error: 'Apenas administradores podem gerar links de indicação' }, { status: 403 });
    }

    const body = await req.json();
    const { parceiro_id } = body;
    if (!parceiro_id) return Response.json({ error: 'parceiro_id é obrigatório' }, { status: 400 });

    const parceiros = await base44.entities.Parceiro.filter({ id: parceiro_id });
    if (parceiros.length === 0) return Response.json({ error: 'Parceiro não encontrado' }, { status: 404 });
    const parceiro = parceiros[0];

    let token = parceiro.link_token;
    if (!token) {
      token = 'ind_' + crypto.randomUUID().replace(/-/g, '');
      await base44.asServiceRole.entities.Parceiro.update(parceiro.id, {
        link_token: token,
        link_gerado_em: new Date().toISOString(),
      });
    }

    const url = `${new URL(req.url).origin}/indicacao/${token}`;
    return Response.json({ url, token, parceiro_id: parceiro.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}