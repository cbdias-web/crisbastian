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

        const { vendedores_ids, indicadores_ids, dataInicio, dataFim } = await req.json();

        // Buscar todas as comissões
        const todasComissoes = await base44.asServiceRole.entities.Comissao.list('-data_venda', 2000);
        const todasComissoesEsp = await base44.asServiceRole.entities.ComissaoEspelhamento.list('-data_venda', 2000);

        // Filtrar comissões por período e elegíveis
        const comissoes = todasComissoes.filter(c => {
            const dataOk = (!dataInicio || c.data_venda >= dataInicio) && (!dataFim || c.data_venda <= dataFim);
            const vendedorOk = !vendedores_ids || vendedores_ids.length === 0 || vendedores_ids.includes(c.vendedor_id);
            return dataOk && vendedorOk;
        });

        const comissoesEsp = todasComissoesEsp.filter(c => {
            const dataOk = (!dataInicio || c.data_venda >= dataInicio) && (!dataFim || c.data_venda <= dataFim);
            const indicadorOk = !indicadores_ids || indicadores_ids.length === 0 || indicadores_ids.includes(c.vendedor_id);
            return dataOk && indicadorOk;
        });

        // Buscar dados complementares
        const vendedores = await base44.asServiceRole.entities.Vendedor.list();
        const indicadores = await base44.asServiceRole.entities.Espelhamento.list();
        const vendas = await base44.asServiceRole.entities.Venda.list();

        // Agrupar comissões por elegível
        const comissoesPorElegivel = {};

        comissoes.forEach(c => {
            if (!comissoesPorElegivel[c.vendedor_id]) {
                const vendedor = vendedores.find(v => v.id === c.vendedor_id);
                comissoesPorElegivel[c.vendedor_id] = {
                    id: c.vendedor_id,
                    nome: c.vendedor_nome || vendedor?.nome || 'N/A',
                    tipo: 'vendedor',
                    comissoes: []
                };
            }
            comissoesPorElegivel[c.vendedor_id].comissoes.push(c);
        });

        comissoesEsp.forEach(c => {
            if (!comissoesPorElegivel[c.vendedor_id]) {
                const indicador = indicadores.find(i => i.id === c.vendedor_id);
                comissoesPorElegivel[c.vendedor_id] = {
                    id: c.vendedor_id,
                    nome: c.vendedor_nome || indicador?.nome || 'N/A',
                    tipo: 'indicador',
                    comissoes: []
                };
            }
            comissoesPorElegivel[c.vendedor_id].comissoes.push(c);
        });

        // Gerar PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 20;

        // Header
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

        // Título
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('RELATORIO GERAL DE COMISSOES', 14, y);
        
        y += 12;

        // Período
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        
        const periodoTexto = dataInicio && dataFim 
            ? new Date(dataInicio).toLocaleDateString('pt-BR') + ' a ' + new Date(dataFim).toLocaleDateString('pt-BR')
            : 'Todos os registros';
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

        // Totalizadores gerais
        const totalComissoes = [...comissoes, ...comissoesEsp];
        const valorTotalComissoes = totalComissoes.reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
        const valorTotalPago = totalComissoes.filter(c => c.pago).reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
        const valorTotalPendente = valorTotalComissoes - valorTotalPago;
        const qtdElegiveis = Object.keys(comissoesPorElegivel).length;

        doc.setFillColor(245, 247, 250);
        doc.rect(14, y, pageWidth - 28, 32, 'F');
        
        const cardWidth = (pageWidth - 36) / 4;
        let cardX = 18;
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('ELEGIVEIS', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(qtdElegiveis.toString(), cardX, y + 14);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('pessoas', cardX, y + 20);
        
        cardX += cardWidth;
        doc.setFontSize(8);
        doc.text('TOTAL COMISSOES', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(valorTotalComissoes), cardX, y + 14);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('valor total', cardX, y + 20);
        
        cardX += cardWidth;
        doc.setFontSize(8);
        doc.text('PAGO', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(valorTotalPago), cardX, y + 14);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('aprovado', cardX, y + 20);
        
        cardX += cardWidth;
        doc.setFontSize(8);
        doc.text('PENDENTE', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(valorTotalPendente), cardX, y + 14);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('a receber', cardX, y + 20);

        y += 40;

        // Detalhamento por elegível
        const elegiveisOrdenados = Object.values(comissoesPorElegivel).sort((a, b) => {
            const totalA = a.comissoes.reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
            const totalB = b.comissoes.reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
            return totalB - totalA;
        });

        for (const elegivel of elegiveisOrdenados) {
            if (y > 250) {
                doc.addPage();
                y = 20;
            }

            const totalElegivel = elegivel.comissoes.reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
            const pagoElegivel = elegivel.comissoes.filter(c => c.pago).reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
            const pendenteElegivel = totalElegivel - pagoElegivel;

            // Cabeçalho do elegível
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(cleanText(elegivel.nome) + ' (' + (elegivel.tipo === 'vendedor' ? 'Vendedor' : 'Indicador') + ')', 14, y);
            
            y += 8;

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text('Total: ' + formatCurrency(totalElegivel), 14, y);
            doc.text('Pago: ' + formatCurrency(pagoElegivel), 70, y);
            doc.text('Pendente: ' + formatCurrency(pendenteElegivel), 120, y);

            y += 8;

            // Tabela de comissões
            doc.setFillColor(255, 255, 255);
            doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
            
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('DATA', 16, y);
            doc.text('TIPO', 40, y);
            doc.text('VENDA', 70, y);
            doc.text('% COM.', 110, y);
            doc.text('COMISSAO', 135, y);
            doc.text('STATUS', 170, y);

            y += 5;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');

            for (const comissao of elegivel.comissoes) {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                    
                    doc.setFillColor(255, 255, 255);
                    doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
                    doc.setTextColor(100, 100, 100);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.text('DATA', 16, y);
                    doc.text('TIPO', 40, y);
                    doc.text('VENDA', 70, y);
                    doc.text('% COM.', 110, y);
                    doc.text('COMISSAO', 135, y);
                    doc.text('STATUS', 170, y);
                    y += 5;
                    doc.setTextColor(0, 0, 0);
                    doc.setFont('helvetica', 'normal');
                }

                doc.setFontSize(7);
                
                const dataVenda = comissao.data_venda ? new Date(comissao.data_venda).toLocaleDateString('pt-BR') : '-';
                doc.text(dataVenda, 16, y);
                
                const tipo = comissao.tipo === 'bonus' ? 'BONUS' : 'COMISSAO';
                doc.text(tipo, 40, y);
                
                const valorVenda = formatCurrency(comissao.valor_venda);
                doc.text(valorVenda, 70, y);
                
                const pct = comissao.percentual ? comissao.percentual.toFixed(1) + '%' : '-';
                doc.text(pct, 110, y);
                
                const valorComissao = formatCurrency(comissao.valor_comissao);
                doc.text(valorComissao, 135, y);
                
                if (comissao.pago) {
                    doc.setTextColor(255, 165, 0);
                    doc.setFont('helvetica', 'bold');
                    doc.text('APROVADA', 170, y);
                } else {
                    doc.setTextColor(251, 146, 60);
                    doc.setFont('helvetica', 'bold');
                    doc.text('PENDENTE', 170, y);
                }
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');

                y += 6;
            }

            y += 8;
        }

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
                'Content-Disposition': 'attachment; filename=relatorio-comissoes.pdf'
            }
        });

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});