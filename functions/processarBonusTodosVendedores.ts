import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const { mes } = await req.json();

        // Buscar todas as metas individuais do mês com bônus configurado
        const todasMetas = await base44.asServiceRole.entities.Meta.list();
        const metasComBonus = todasMetas.filter(m => 
            m.mes === mes && 
            m.tipo === 'individual' && 
            m.valor_bonus > 0 &&
            m.vendedor_id
        );

        if (metasComBonus.length === 0) {
            return Response.json({ 
                processados: 0, 
                bonus_criados: 0,
                mensagem: 'Nenhuma meta individual com bônus configurado para este mês' 
            });
        }

        // Calcular período do mês
        const mesInicio = `${mes}-01`;
        const [ano, mesNum] = mes.split('-');
        const ultimoDia = new Date(parseInt(ano), parseInt(mesNum), 0).getDate();
        const mesFim = `${mes}-${String(ultimoDia).padStart(2, '0')}`;

        // Buscar todas as vendas do mês
        const todasVendas = await base44.asServiceRole.entities.Venda.list('-data', 1000);
        const vendasDoMes = todasVendas.filter(v => 
            v.data && v.data >= mesInicio && v.data <= mesFim
        );

        const resultados = [];
        let bonusCriados = 0;

        for (const meta of metasComBonus) {
            // Calcular total vendido pelo vendedor
            const vendasVendedor = vendasDoMes.filter(v => 
                v.vendedor_id === meta.vendedor_id || v.assessor_comercial === meta.vendedor_nome
            );
            
            const totalVendido = vendasVendedor.reduce((sum, v) => sum + (parseFloat(v.valor) || 0), 0);

            // Verificar se atingiu 100% da meta
            if (totalVendido >= meta.valor_meta) {
                // Verificar se já existe bônus
                const comissoesExistentes = await base44.asServiceRole.entities.Comissao.filter({
                    vendedor_id: meta.vendedor_id,
                    tipo: 'bonus',
                    mes_referencia: mes
                });

                if (comissoesExistentes.length === 0) {
                    // Criar bônus
                    await base44.asServiceRole.entities.Comissao.create({
                        venda_id: 'BONUS_META',
                        vendedor_id: meta.vendedor_id,
                        vendedor_nome: meta.vendedor_nome,
                        valor_venda: 0,
                        percentual: 0,
                        valor_comissao: meta.valor_bonus,
                        data_venda: mesFim,
                        pago: false,
                        tipo: 'bonus',
                        mes_referencia: mes
                    });

                    bonusCriados++;
                    resultados.push({
                        vendedor: meta.vendedor_nome,
                        status: 'bonus_criado',
                        valor_bonus: meta.valor_bonus,
                        total_vendido: totalVendido,
                        meta: meta.valor_meta
                    });
                } else {
                    resultados.push({
                        vendedor: meta.vendedor_nome,
                        status: 'bonus_ja_existe',
                        valor_bonus: meta.valor_bonus,
                        total_vendido: totalVendido,
                        meta: meta.valor_meta
                    });
                }
            } else {
                resultados.push({
                    vendedor: meta.vendedor_nome,
                    status: 'meta_nao_atingida',
                    total_vendido: totalVendido,
                    meta: meta.valor_meta,
                    percentual: Math.round((totalVendido / meta.valor_meta) * 100)
                });
            }
        }

        return Response.json({
            processados: metasComBonus.length,
            bonus_criados: bonusCriados,
            mes: mes,
            resultados: resultados
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});