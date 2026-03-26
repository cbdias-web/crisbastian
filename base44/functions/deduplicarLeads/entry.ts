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

    // Filtrar apenas leads SEM interação (não abordados)
    const leadsNaoAbordados = leadsNaoConvertidos.filter(c => !clientesComInteracao.has(c.id));

    // Agrupar por CPF/CNPJ (se tiver) ou por nome normalizado
    const grupos = {};
    for (const c of leadsNaoAbordados) {
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

      for (const dup of duplicatas) {
        try {
          // Excluir o cliente duplicado
          await base44.asServiceRole.entities.Cliente.delete(dup.id);
          // Excluir o lead correspondente se existir
          if (dup.lead_id) {
            await base44.asServiceRole.entities.Lead.delete(dup.lead_id).catch(() => {});
          }
          // Excluir agendamentos pendentes do lead duplicado
          if (dup.lead_id) {
            const agendas = await base44.asServiceRole.entities.AgendaContato.filter({ lead_id: dup.lead_id });
            for (const a of agendas) {
              await base44.asServiceRole.entities.AgendaContato.delete(a.id).catch(() => {});
            }
          }
          excluidos++;
        } catch (e) {
          erros.push(`Erro ao excluir ${dup.nome}: ${e.message}`);
        }
      }
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