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

        if (!user || (user.role !== 'admin' && !user.permissao_admin)) {
            return Response.json({ error: 'Acesso negado: apenas administradores' }, { status: 403 });
        }

        const { vendedores_ids = [], indicadores_ids = [], dataInicio, dataFim, somente_indicadores = false } = await req.json();

        if (!somente_indicadores && vendedores_ids.length === 0 && indicadores_ids.length === 0) {
            return Response.json({ error: 'Selecione pelo menos um vendedor ou indicador' }, { status: 400 });
        }

        // Buscar dados
        const todasComissoes = await base44.asServiceRole.entities.Comissao.list();
        const todasComissoesEsp = await base44.asServiceRole.entities.ComissaoEspelhamento.list();
        const vendedores = await base44.asServiceRole.entities.Vendedor.list();
        const indicadores = await base44.asServiceRole.entities.Espelhamento.list();

        // Filtrar comissões por período e IDs selecionados
        const comissoesVendedores = todasComissoes.filter(c => {
            const dentroDataInicio = !dataInicio || c.data_venda >= dataInicio;
            const dentroDataFim = !dataFim || c.data_venda <= dataFim;
            const vendedorSelecionado = vendedores_ids.length === 0 || vendedores_ids.includes(c.vendedor_id);
            return dentroDataInicio && dentroDataFim && vendedorSelecionado;
        });

        const comissoesIndicadores = todasComissoesEsp.filter(c => {
            const dentroDataInicio = !dataInicio || c.data_venda >= dataInicio;
            const dentroDataFim = !dataFim || c.data_venda <= dataFim;
            const indicadorSelecionado = indicadores_ids.length === 0 || indicadores_ids.includes(c.vendedor_id);
            return dentroDataInicio && dentroDataFim && indicadorSelecionado;
        });

        const formatCurrency = (v) => {
            const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
            return 'R$ ' + formatted;
        };

        // Calcular totais
        const totalComissoesVendedores = comissoesVendedores.reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
        const totalComissoesIndicadores = comissoesIndicadores.reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
        const totalGeral = totalComissoesVendedores + totalComissoesIndicadores;

        const pagasVendedores = comissoesVendedores.filter(c => c.pago).reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
        const pagasIndicadores = comissoesIndicadores.filter(c => c.pago).reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
        const totalPagas = pagasVendedores + pagasIndicadores;
        const totalPendente = totalGeral - totalPagas;

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

        // Título
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('RELATORIO CONSOLIDADO DE COMISSOES', 14, y);
        
        y += 12;

        // Período
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Periodo:', 14, y);
        doc.setTextColor(0, 0, 0);
        const periodoTexto = dataInicio && dataFim 
            ? new Date(dataInicio).toLocaleDateString('pt-BR') + ' a ' + new Date(dataFim).toLocaleDateString('pt-BR')
            : 'Todos os registros';
        doc.text(periodoTexto, 50, y);
        
        y += 6;
        doc.setTextColor(100, 100, 100);
        doc.text('Data de Emissao:', 14, y);
        doc.setTextColor(0, 0, 0);
        doc.text(new Date().toLocaleDateString('pt-BR'), 50, y);

        y += 6;
        doc.setTextColor(100, 100, 100);
        doc.text('Vendedores:', 14, y);
        doc.setTextColor(0, 0, 0);
        const vendedoresTexto = vendedores_ids.length === 0 ? 'Todos' : vendedores_ids.length + ' selecionados';
        doc.text(vendedoresTexto, 50, y);

        y += 6;
        doc.setTextColor(100, 100, 100);
        doc.text('Indicadores:', 14, y);
        doc.setTextColor(0, 0, 0);
        const indicadoresTexto = indicadores_ids.length === 0 ? 'Todos' : indicadores_ids.length + ' selecionados';
        doc.text(indicadoresTexto, 50, y);

        y += 14;

        // Cards resumo
        doc.setFillColor(245, 247, 250);
        doc.rect(14, y, pageWidth - 28, 32, 'F');
        
        const cardWidth = (pageWidth - 36) / 3;
        let cardX = 18;
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('TOTAL COMISSOES', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(totalGeral), cardX, y + 14);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('vendedores + indicadores', cardX, y + 20);
        
        cardX += cardWidth;
        doc.setFontSize(8);
        doc.text('PAGAS', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(totalPagas), cardX, y + 14);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('aprovadas', cardX, y + 20);
        
        cardX += cardWidth;
        doc.setFontSize(8);
        doc.text('PENDENTES', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(totalPendente), cardX, y + 14);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('a aprovar', cardX, y + 20);

        y += 40;

        // Seção Vendedores
        if (!somente_indicadores && comissoesVendedores.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('COMISSOES DE VENDEDORES', 14, y);
            
            y += 10;

            doc.setFillColor(255, 255, 255);
            doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
            
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('DATA', 16, y);
            doc.text('VENDEDOR', 40, y);
            doc.text('TIPO', 95, y);
            doc.text('VALOR VENDA', 115, y);
            doc.text('%', 145, y);
            doc.text('COMISSAO', 160, y);
            doc.text('STATUS', 185, y);

            y += 5;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');

            for (const com of comissoesVendedores) {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                    
                    doc.setFillColor(255, 255, 255);
                    doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
                    doc.setTextColor(100, 100, 100);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.text('DATA', 16, y);
                    doc.text('VENDEDOR', 40, y);
                    doc.text('TIPO', 95, y);
                    doc.text('VALOR VENDA', 115, y);
                    doc.text('%', 145, y);
                    doc.text('COMISSAO', 160, y);
                    doc.text('STATUS', 185, y);
                    y += 5;
                    doc.setTextColor(0, 0, 0);
                    doc.setFont('helvetica', 'normal');
                }

                doc.setFontSize(8);
                doc.text(com.data_venda ? new Date(com.data_venda).toLocaleDateString('pt-BR') : '-', 16, y);
                doc.text(cleanText((com.vendedor_nome || '-').substring(0, 22)), 40, y);
                doc.text(com.tipo === 'bonus' ? 'BONUS' : 'VENDA', 95, y);
                doc.text(com.tipo === 'bonus' ? '-' : formatCurrency(com.valor_venda), 115, y);
                doc.text(com.tipo === 'bonus' ? '-' : com.percentual.toFixed(1) + '%', 145, y);
                doc.text(formatCurrency(com.valor_comissao), 160, y);
                
                if (com.pago) {
                    doc.setTextColor(255, 165, 0);
                    doc.setFont('helvetica', 'bold');
                    doc.text('APROVADA', 185, y);
                } else {
                    doc.setTextColor(251, 146, 60);
                    doc.setFont('helvetica', 'bold');
                    doc.text('PENDENTE', 185, y);
                }
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');

                y += 6;
            }

            y += 5;
        }

        // Seção Indicadores
        if (comissoesIndicadores.length > 0) {
            if (y > 240) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('COMISSOES DE INDICADORES', 14, y);
            
            y += 10;

            doc.setFillColor(255, 255, 255);
            doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
            
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('DATA', 16, y);
            doc.text('INDICADOR', 40, y);
            doc.text('VALOR VENDA', 115, y);
            doc.text('%', 145, y);
            doc.text('COMISSAO', 160, y);
            doc.text('STATUS', 185, y);

            y += 5;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');

            for (const com of comissoesIndicadores) {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                    
                    doc.setFillColor(255, 255, 255);
                    doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
                    doc.setTextColor(100, 100, 100);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.text('DATA', 16, y);
                    doc.text('INDICADOR', 40, y);
                    doc.text('VALOR VENDA', 115, y);
                    doc.text('%', 145, y);
                    doc.text('COMISSAO', 160, y);
                    doc.text('STATUS', 185, y);
                    y += 5;
                    doc.setTextColor(0, 0, 0);
                    doc.setFont('helvetica', 'normal');
                }

                doc.setFontSize(8);
                doc.text(com.data_venda ? new Date(com.data_venda).toLocaleDateString('pt-BR') : '-', 16, y);
                doc.text(cleanText((com.vendedor_nome || '-').substring(0, 28)), 40, y);
                doc.text(formatCurrency(com.valor_venda), 115, y);
                doc.text(com.percentual.toFixed(1) + '%', 145, y);
                doc.text(formatCurrency(com.valor_comissao), 160, y);
                
                if (com.pago) {
                    doc.setTextColor(255, 165, 0);
                    doc.setFont('helvetica', 'bold');
                    doc.text('APROVADA', 185, y);
                } else {
                    doc.setTextColor(251, 146, 60);
                    doc.setFont('helvetica', 'bold');
                    doc.text('PENDENTE', 185, y);
                }
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');

                y += 6;
            }
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
                'Content-Disposition': 'attachment; filename=relatorio-comissoes-' + new Date().toISOString().split('T')[0] + '.pdf'
            }
        });

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});