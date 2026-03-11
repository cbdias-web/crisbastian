import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin' && user?.permissao_admin !== true) {
            return Response.json({ error: 'Acesso negado: apenas administradores podem conceder bônus manualmente' }, { status: 403 });
        }

        const { mes, vendedor_id } = await req.json();

        if (!mes || !vendedor_id) {
            return Response.json({ error: 'Mês e vendedor_id são obrigatórios' }, { status: 400 });
        }

        // Buscar meta do vendedor
        const metas = await base44.asServiceRole.entities.Meta.filter({ 
            mes, 
            vendedor_id, 
            tipo: 'individual' 
        });

        if (metas.length === 0) {
            return Response.json({ error: 'Meta não encontrada para este vendedor no mês especificado' }, { status: 404 });
        }

        const meta = metas[0];

        if (!meta.valor_bonus || meta.valor_bonus <= 0) {
            return Response.json({ error: 'Nenhum valor de bônus definido para esta meta' }, { status: 400 });
        }

        // Verificar se já existe bônus concedido
        const bonusExistente = await base44.asServiceRole.entities.Comissao.filter({
            vendedor_id,
            mes_referencia: mes,
            tipo: 'bonus'
        });

        if (bonusExistente.length > 0) {
            return Response.json({ error: 'Bônus já foi concedido para este vendedor neste mês' }, { status: 400 });
        }

        // Criar registro de bônus
        await base44.asServiceRole.entities.Comissao.create({
            venda_id: `bonus-${mes}-${vendedor_id}`,
            vendedor_id,
            vendedor_nome: meta.vendedor_nome,
            valor_venda: 0,
            percentual: 0,
            valor_comissao: meta.valor_bonus,
            data_venda: new Date().toISOString().split('T')[0],
            pago: false,
            tipo: 'bonus',
            mes_referencia: mes
        });

        return Response.json({ 
            success: true, 
            message: `Bônus de R$ ${meta.valor_bonus.toFixed(2)} concedido manualmente para ${meta.vendedor_nome}` 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});