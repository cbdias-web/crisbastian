import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const { vendedor_id, mes } = await req.json();

        // Buscar meta do vendedor no mês
        const metas = await base44.asServiceRole.entities.Meta.filter({
            vendedor_id: vendedor_id,
            mes: mes,
            tipo: 'individual'
        });

        if (metas.length === 0 || !metas[0].valor_bonus || metas[0].valor_bonus <= 0) {
            return Response.json({ bonus_aplicavel: false, motivo: 'Sem meta ou bônus configurado' });
        }

        const meta = metas[0];

        // Calcular vendas do vendedor no mês
        const mesInicio = `${mes}-01`;
        const [ano, mesNum] = mes.split('-');
        const ultimoDia = new Date(parseInt(ano), parseInt(mesNum), 0).getDate();
        const mesFim = `${mes}-${String(ultimoDia).padStart(2, '0')}`;

        const todasVendas = await base44.asServiceRole.entities.Venda.list('-data', 1000);
        const vendasDoMes = todasVendas.filter(v => 
            v.data && v.data >= mesInicio && v.data <= mesFim &&
            (v.vendedor_id === vendedor_id || v.assessor_comercial === meta.vendedor_nome)
        );

        const totalVendido = vendasDoMes.reduce((sum, v) => sum + (parseFloat(v.valor) || 0), 0);

        // Verificar se atingiu 100% da meta
        if (totalVendido >= meta.valor_meta) {
            // Verificar se já existe bônus cadastrado para este vendedor neste mês
            const comissoes = await base44.asServiceRole.entities.Comissao.filter({
                vendedor_id: vendedor_id,
                tipo: 'bonus',
                mes_referencia: mes
            });

            if (comissoes.length > 0) {
                return Response.json({ 
                    bonus_aplicavel: false, 
                    motivo: 'Bônus já cadastrado para este mês',
                    bonus_existente: comissoes[0]
                });
            }

            // Criar registro de bônus
            const bonus = await base44.asServiceRole.entities.Comissao.create({
                venda_id: 'BONUS_META',
                vendedor_id: vendedor_id,
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
                bonus_aplicavel: true, 
                bonus_criado: true,
                valor_bonus: meta.valor_bonus,
                total_vendido: totalVendido,
                meta: meta.valor_meta,
                bonus: bonus
            });
        } else {
            return Response.json({ 
                bonus_aplicavel: false, 
                motivo: 'Meta não atingida',
                total_vendido: totalVendido,
                meta: meta.valor_meta,
                percentual: Math.round((totalVendido / meta.valor_meta) * 100)
            });
        }

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});