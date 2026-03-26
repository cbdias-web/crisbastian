import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && !user.permissao_admin)) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar todos os clientes do tipo lead não convertidos
    const clientes = await base44.asServiceRole.entities.Cliente.list('nome', 50000);
    const leadsNaoConvertidos = clientes.filter(c => c.origem === 'lead');

    // Buscar interações para saber quais foram abordados
    const interacoes = await base44.asServiceRole.entities.InteracaoCliente.list('-created_date', 50000);
    const clientesComInteracao = new Set(interacoes.map(i => i.cliente_id));

    // Separar: clientes com interação (MANTER SEMPRE) vs sem interação (DEDUPLICAR)
    const clientesComInteracaoSet = new Set();
    const leadsComInteracao = [];
    const leadsComInteracaoIds = new Set(clientesComInteracao);
    
    for (const i of interacoes) {
      clientesComInteracaoSet.add(i.cliente_id);
      leadsComInteracao.push(i.cliente_id);
    }
    
    // Apenas deduplicar leads SEM interação
    const leadsParaDeduplicar = leadsNaoConvertidos.filter(c => !clientesComInteracaoSet.has(c.id));

    // Agrupar por CPF/CNPJ (se tiver) ou por nome normalizado
    const grupos = {};
    for (const c of leadsParaDeduplicar) {
      const chave = c.cpf_cnpj?.replace(/\D/g, '')?.trim()
        ? c.cpf_cnpj.replace(/\D/g, '')
        : c.nome?.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!chave) continue;
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(c);
    }

    // Para cada grupo com duplicatas, manter o mais recente e excluir os demais
    let excluidos = 0;
    const erros = [];

    for (const [chave, grupo] of Object.entries(grupos)) {
      if (grupo.length <= 1) continue;

      // Ordenar por created_date desc, manter o primeiro (mais recente)
      grupo.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      const [manter, ...duplicatas] = grupo;


    }

    return Response.json({
      success: true,
      excluidos,
      grupos_com_duplicatas: Object.values(grupos).filter(g => g.length > 1).length,
      erros
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});