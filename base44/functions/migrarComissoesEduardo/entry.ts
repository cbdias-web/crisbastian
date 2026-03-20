import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && !user.permissao_admin)) {
      return Response.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    // ID do Eduardo Cunha na entidade Vendedor
    const eduardoVendedorId = '69bd7e84c36b13d6efb92b27';
    
    // Buscar comissões do Eduardo na tabela de espelhamento
    const comissoesEspelhamento = await base44.asServiceRole.entities.ComissaoEspelhamento.filter({
      vendedor_nome: 'EDUARDO CUNHA'
    });

    let migradas = 0;

    for (const comissao of comissoesEspelhamento) {
      // Criar na tabela principal Comissao
      await base44.asServiceRole.entities.Comissao.create({
        venda_id: comissao.venda_id,
        vendedor_id: eduardoVendedorId,
        vendedor_nome: 'EDUARDO CUNHA',
        valor_venda: comissao.valor_venda,
        percentual: comissao.percentual,
        valor_comissao: comissao.valor_comissao,
        data_venda: comissao.data_venda,
        pago: comissao.pago,
        tipo: 'comissao'
      });

      // Remover da tabela de espelhamento
      await base44.asServiceRole.entities.ComissaoEspelhamento.delete(comissao.id);
      
      migradas++;
    }

    return Response.json({
      success: true,
      migradas
    });

  } catch (error) {
    console.error('Erro ao migrar comissões:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});