import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Handler público do formulário de indicação de parceiros.
// - action 'buscar': retorna o parceiro vinculado ao token (para exibir o nome no form)
// - action 'salvar': cria um LeadIndicacao com os dados preenchidos pelo parceiro
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, token } = body;

    if (!token) return Response.json({ error: 'Token obrigatório' }, { status: 400 });

    const parceiros = await base44.asServiceRole.entities.Parceiro.filter({ link_token: token, ativo: true });
    if (parceiros.length === 0) return Response.json({ error: 'Link inválido ou expirado' }, { status: 404 });
    const parceiro = parceiros[0];

    if (action === 'buscar') {
      return Response.json({
        parceiro: {
          nome: parceiro.nome,
          tipo: parceiro.tipo,
          email: parceiro.email,
        },
      });
    }

    if (action === 'salvar') {
      const dados = body.dados || {};
      // Validação mínima
      if (!dados.tipo || !dados.produto) {
        return Response.json({ error: 'Tipo e produto são obrigatórios' }, { status: 400 });
      }
      if (dados.tipo === 'PF' && !dados.pf_nome?.trim()) {
        return Response.json({ error: 'Nome do titular é obrigatório (PF)' }, { status: 400 });
      }
      if (dados.tipo === 'PJ' && !dados.pj_razao_social?.trim()) {
        return Response.json({ error: 'Razão Social é obrigatória (PJ)' }, { status: 400 });
      }

      const lead = await base44.asServiceRole.entities.LeadIndicacao.create({
        parceiro_id: parceiro.id,
        parceiro_nome: parceiro.nome,
        parceiro_email: parceiro.email,
        parceiro_percentual: parceiro.percentual_comissao ?? 0,
        link_token: token,
        link_preenchido_em: new Date().toISOString(),
        status: 'novo',
        ...dados,
      });

      return Response.json({ success: true, lead_id: lead.id });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}