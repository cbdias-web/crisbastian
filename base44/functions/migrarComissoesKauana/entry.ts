import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && !user.permissao_admin)) {
            return Response.json({ error: 'Acesso negado: apenas administradores' }, { status: 403 });
        }

        // ID da Kauana
        const kauanaId = '69bc51fe16812ea769246aba';
        
        // Busca todas as comissões da Kauana na tabela de Espelhamento
        const comissoesEsp = await base44.asServiceRole.entities.ComissaoEspelhamento.filter({ 
            vendedor_id: kauanaId 
        });

        console.log(`Encontradas ${comissoesEsp.length} comissões de espelhamento da Kauana`);

        let migradas = 0;
        
        for (const comEsp of comissoesEsp) {
            // Cria na tabela Comissao
            await base44.asServiceRole.entities.Comissao.create({
                venda_id: comEsp.venda_id,
                vendedor_id: comEsp.vendedor_id,
                vendedor_nome: comEsp.vendedor_nome,
                valor_venda: comEsp.valor_venda,
                percentual: comEsp.percentual,
                valor_comissao: comEsp.valor_comissao,
                data_venda: comEsp.data_venda,
                pago: comEsp.pago,
                tipo: 'comissao'
            });

            // Remove da tabela ComissaoEspelhamento
            await base44.asServiceRole.entities.ComissaoEspelhamento.delete(comEsp.id);
            
            migradas++;
            console.log(`Migrada comissão ${comEsp.id}`);
        }

        return Response.json({ 
            success: true,
            message: `${migradas} comissões migradas com sucesso!`,
            detalhes: `Kauana agora tem ${migradas} comissões na aba de Vendedores`
        });

    } catch (error) {
        console.error('Erro ao migrar comissões:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});