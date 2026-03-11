import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data } = await req.json();

        // Processar apenas criações e atualizações de vendas
        if (!event || !['create', 'update'].includes(event.type)) {
            return Response.json({ status: 'ignored' });
        }

        const venda = data;
        if (!venda || !venda.data || !venda.vendedor_id) {
            return Response.json({ status: 'skipped - dados incompletos' });
        }

        // Extrair mês da venda
        const mes = venda.data.substring(0, 7); // YYYY-MM

        // Buscar meta individual do vendedor para este mês
        const metas = await base44.asServiceRole.entities.Meta.filter({
            mes: mes,
            tipo: 'individual',
            vendedor_id: venda.vendedor_id
        });

        if (metas.length === 0 || !metas[0].valor_bonus || metas[0].valor_bonus <= 0) {
            return Response.json({ status: 'sem meta ou bonus configurado' });
        }

        const meta = metas[0];

        // Calcular período do mês
        const mesInicio = `${mes}-01`;
        const [ano, mesNum] = mes.split('-');
        const ultimoDia = new Date(parseInt(ano), parseInt(mesNum), 0).getDate();
        const mesFim = `${mes}-${String(ultimoDia).padStart(2, '0')}`;

        // Buscar todas as vendas do vendedor no mês
        const todasVendas = await base44.asServiceRole.entities.Venda.list('-data', 1000);
        const vendasDoMes = todasVendas.filter(v => 
            v.data && 
            v.data >= mesInicio && 
            v.data <= mesFim &&
            (v.vendedor_id === venda.vendedor_id || v.assessor_comercial === meta.vendedor_nome)
        );

        const totalVendido = vendasDoMes.reduce((sum, v) => sum + (parseFloat(v.valor) || 0), 0);

        // Verificar se atingiu 100% da meta
        if (totalVendido >= meta.valor_meta) {
            // Verificar se já existe bônus automático
            const bonusExistente = await base44.asServiceRole.entities.Comissao.filter({
                vendedor_id: venda.vendedor_id,
                tipo: 'bonus',
                mes_referencia: mes,
                venda_id: `BONUS_AUTO_${mes}_${venda.vendedor_id}`
            });

            if (bonusExistente.length === 0) {
                // Criar bônus automático
                await base44.asServiceRole.entities.Comissao.create({
                    venda_id: `BONUS_AUTO_${mes}_${venda.vendedor_id}`,
                    vendedor_id: venda.vendedor_id,
                    vendedor_nome: meta.vendedor_nome,
                    valor_venda: 0,
                    percentual: 0,
                    valor_comissao: meta.valor_bonus,
                    data_venda: mesFim,
                    pago: false,
                    tipo: 'bonus',
                    mes_referencia: mes
                });

                return Response.json({ 
                    status: 'bonus_criado',
                    vendedor: meta.vendedor_nome,
                    valor_bonus: meta.valor_bonus,
                    total_vendido: totalVendido,
                    meta: meta.valor_meta
                });
            }

            return Response.json({ 
                status: 'bonus_ja_existe',
                total_vendido: totalVendido 
            });
        }

        return Response.json({ 
            status: 'meta_nao_atingida',
            total_vendido: totalVendido,
            meta: meta.valor_meta,
            percentual: Math.round((totalVendido / meta.valor_meta) * 100)
        });

    } catch (error) {
        console.error('Erro ao verificar bônus:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});