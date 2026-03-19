import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { jsPDF } from 'npm:jspdf@4.0.0';

function cleanText(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '');
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { vendedores_ids = [], indicadores_ids = [], dataInicio, dataFim } = await req.json();

        if (vendedores_ids.length === 0 && indicadores_ids.length === 0) {
            return Response.json({ error: 'Selecione pelo menos um vendedor ou indicador' }, { status: 400 });
        }

        // Buscar dados
        const [todosVendedores, todosIndicadores, todasVendas, todasComissoes, todasComissoesEsp] = await Promise.all([
            base44.asServiceRole.entities.Vendedor.list(),
            base44.asServiceRole.entities.Espelhamento.list(),
            base44.asServiceRole.entities.Venda.list('-data', 1000),
            base44.asServiceRole.entities.Comissao.list(),
            base44.asServiceRole.entities.ComissaoEspelhamento.list()
        ]);

        const vendedoresSelecionados = todosVendedores.filter(v => vendedores_ids.includes(v.id));
        const indicadoresSelecionados = todosIndicadores.filter(i => indicadores_ids.includes(i.id));

        // Filtrar vendas do período
        const vendasPeriodo = todasVendas.filter(v => {
            const dataOk = (!dataInicio || v.data >= dataInicio) && (!dataFim || v.data <= dataFim);
            return dataOk;
        });

        // Calcular dados por vendedor
        const dadosVendedores = vendedoresSelecionados.map(v => {
            const vendas = vendasPeriodo.filter(vd => 
                vd.vendedor_id === v.id || vd.assessor_comercial === v.nome
            );
            
            const comissoes = todasComissoes.filter(c => 
                c.vendedor_id === v.id && vendas.some(vd => vd.id === c.venda_id)
            );

            // Buscar bônus do período
            const bonusDoPeriodo = todasComissoes.filter(c => {
                if (c.tipo === 'bonus' && c.vendedor_id === v.id && c.mes_referencia) {
                    if (!dataInicio && !dataFim) return true;
                    const mesRef = c.mes_referencia + '-01';
                    return (!dataInicio || mesRef >= dataInicio) && (!dataFim || mesRef <= dataFim);
                }
                return false;
            });

            const bonusPorMes = {};
            bonusDoPeriodo.forEach(b => {
                if (!bonusPorMes[b.mes_referencia]) {
                    bonusPorMes[b.mes_referencia] = { mes_referencia: b.mes_referencia, valor_total: 0, pago: b.pago };
                }
                bonusPorMes[b.mes_referencia].valor_total += parseFloat(b.valor_comissao) || 0;
                if (!b.pago) bonusPorMes[b.mes_referencia].pago = false;
            });

            const bonusAgrupados = Object.values(bonusPorMes);
            
            const totalVendas = vendas.length;
            const valorVendido = vendas.reduce((s, vd) => s + (parseFloat(vd.valor) || 0), 0);
            const totalComissaoVendas = comissoes.reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
            const totalBonus = bonusAgrupados.reduce((s, b) => s + (parseFloat(b.valor_total) || 0), 0);
            const totalComissao = totalComissaoVendas + totalBonus;
            
            return { tipo: 'vendedor', nome: v.nome, totalVendas, valorVendido, totalComissao, comissoes, bonusAgrupados, vendas };
        });

        // Calcular dados por indicador
        const dadosIndicadores = indicadoresSelecionados.map(ind => {
            const vendas = vendasPeriodo.filter(v => 
                v.indicadores?.some(i => i.id === ind.id) || 
                v.espelhamento_id === ind.id ||
                v.espelhamento === ind.nome
            );
            
            const comissoes = todasComissoesEsp.filter(c => 
                c.vendedor_id === ind.id && vendas.some(v => v.id === c.venda_id)
            );
            
            const totalVendas = vendas.length;
            const valorVendido = vendas.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
            const totalComissao = comissoes.reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
            
            return { tipo: 'indicador', nome: ind.nome, totalVendas, valorVendido, totalComissao, comissoes, vendas };
        });

        const todosDados = [...dadosVendedores, ...dadosIndicadores];

        // Gerar PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 20;

        // Cabeçalho
        doc.setFillColor(26, 49, 80);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Villela Exchange', 14, 20);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Relatorio de Comissoes', 14, 30);

        y = 55;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('RELATORIO CONSOLIDADO DE COMISSOES', 14, y);
        
        y += 12;

        // Período
        const periodoTexto = dataInicio && dataFim 
            ? new Date(dataInicio).toLocaleDateString('pt-BR') + ' a ' + new Date(dataFim).toLocaleDateString('pt-BR')
            : 'Todos os registros';
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Periodo:', 14, y);
        doc.setTextColor(0, 0, 0);
        doc.text(periodoTexto, 50, y);
        
        y += 6;
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        doc.setTextColor(100, 100, 100);
        doc.text('Data de Emissao:', 14, y);
        doc.setTextColor(0, 0, 0);
        doc.text(dataHoje, 50, y);

        y += 14;

        const formatCurrency = (v) => {
            const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
            return 'R$ ' + formatted;
        };

        // Totais gerais
        const totalGeralVendas = todosDados.reduce((s, d) => s + d.totalVendas, 0);
        const totalGeralVendido = todosDados.reduce((s, d) => s + d.valorVendido, 0);
        const totalGeralComissao = todosDados.reduce((s, d) => s + d.totalComissao, 0);

        doc.setFillColor(245, 247, 250);
        doc.rect(14, y, pageWidth - 28, 28, 'F');
        
        const cardWidth = (pageWidth - 36) / 3;
        let cardX = 18;
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('TOTAL VENDAS', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(totalGeralVendas.toString(), cardX, y + 14);
        
        cardX += cardWidth;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('TOTAL VENDIDO', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(totalGeralVendido), cardX, y + 14);
        
        cardX += cardWidth;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('TOTAL COMISSOES', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(totalGeralComissao), cardX, y + 14);

        y += 36;

        // Detalhamento por pessoa
        for (const pessoa of todosDados) {
            if (y > 250) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`${pessoa.tipo === 'vendedor' ? 'VENDEDOR' : 'INDICADOR'}: ${cleanText(pessoa.nome)}`, 14, y);
            y += 8;

            // Resumo
            doc.setFillColor(250, 250, 250);
            doc.rect(14, y - 3, pageWidth - 28, 18, 'F');
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text('Vendas:', 18, y + 2);
            doc.setTextColor(0, 0, 0);
            doc.text(pessoa.totalVendas.toString(), 38, y + 2);
            
            doc.setTextColor(100, 100, 100);
            doc.text('Valor Vendido:', 18, y + 8);
            doc.setTextColor(0, 0, 0);
            doc.text(formatCurrency(pessoa.valorVendido), 48, y + 8);
            
            doc.setTextColor(100, 100, 100);
            doc.text('Comissao Total:', 110, y + 2);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(formatCurrency(pessoa.totalComissao), 145, y + 2);

            y += 20;

            // Vendas
            if (pessoa.vendas.length > 0) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(100, 100, 100);
                doc.text('CLIENTE', 16, y);
                doc.text('DATA', 80, y);
                doc.text('VALOR', 110, y);
                doc.text('COMISSAO', 145, y);
                y += 5;

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);

                for (const venda of pessoa.vendas) {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }

                    const comissao = pessoa.comissoes?.find(c => c.venda_id === venda.id);
                    
                    doc.setFontSize(7);
                    doc.text(cleanText((venda.cliente || '-').substring(0, 30)), 16, y);
                    doc.text(venda.data ? new Date(venda.data).toLocaleDateString('pt-BR') : '-', 80, y);
                    doc.text(formatCurrency(venda.valor), 110, y);
                    doc.text(comissao ? formatCurrency(comissao.valor_comissao) : '-', 145, y);
                    
                    y += 5;
                }
            }

            // Bônus (apenas vendedores)
            if (pessoa.bonusAgrupados && pessoa.bonusAgrupados.length > 0) {
                y += 3;
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(100, 100, 100);
                doc.text('BONUS POR META', 16, y);
                doc.text('MES', 80, y);
                doc.text('VALOR', 145, y);
                y += 5;

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);

                for (const bonus of pessoa.bonusAgrupados) {
                    doc.text('Bonus por atingimento de meta', 16, y);
                    doc.text(bonus.mes_referencia, 80, y);
                    doc.text(formatCurrency(bonus.valor_total), 145, y);
                    y += 5;
                }
            }

            y += 6;
        }

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Pagina ' + i + ' de ' + pageCount, pageWidth / 2, 285, { align: 'center' });
        }

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=relatorio-comissoes-${dataHoje.replace(/\//g, '-')}.pdf`
            }
        });

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});