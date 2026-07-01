import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
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
            return Response.json({ error: 'Acesso negado: apenas administradores podem enviar relatórios' }, { status: 403 });
        }

        const { tipo, vendedor_id, vendedor_nome, vendedor_email, dataInicio, dataFim } = await req.json();

        if (!vendedor_email) {
            return Response.json({ error: 'E-mail do vendedor não informado' }, { status: 400 });
        }

        // Buscar dados do vendedor/indicador
        let perfil;
        if (tipo === 'vendedor') {
            const vendedores = await base44.asServiceRole.entities.Vendedor.filter({ id: vendedor_id });
            perfil = vendedores[0];
        } else {
            const indicadores = await base44.asServiceRole.entities.Espelhamento.filter({ id: vendedor_id });
            perfil = indicadores[0];
        }

        if (!perfil) {
            return Response.json({ error: 'Vendedor/Indicador não encontrado' }, { status: 404 });
        }

        // Buscar comissões do período primeiro (mais eficiente)
        let comissoesDoPeriodo;
        if (tipo === 'vendedor') {
            const todasComissoes = await base44.asServiceRole.entities.Comissao.list();
            comissoesDoPeriodo = todasComissoes.filter(c => {
                const dataOk = (!dataInicio || c.data_venda >= dataInicio) && (!dataFim || c.data_venda <= dataFim);
                return c.vendedor_id === vendedor_id && c.tipo !== 'bonus' && dataOk;
            });
        } else {
            const todasComissoes = await base44.asServiceRole.entities.ComissaoEspelhamento.list();
            comissoesDoPeriodo = todasComissoes.filter(c => {
                const dataOk = (!dataInicio || c.data_venda >= dataInicio) && (!dataFim || c.data_venda <= dataFim);
                return c.vendedor_id === vendedor_id && dataOk;
            });
        }

        // Buscar apenas vendas que têm comissões
        const vendasIds = [...new Set(comissoesDoPeriodo.map(c => c.venda_id))].filter(Boolean);
        const todasVendas = await base44.asServiceRole.entities.Venda.list('-data', 1000);
        const vendas = todasVendas.filter(v => vendasIds.includes(v.id));

        // Buscar bônus do período (somente para vendedor)
        let bonusAgrupados = [];
        if (tipo === 'vendedor') {
            const todasComissoes = await base44.asServiceRole.entities.Comissao.list();
            const bonusDoPeriodo = todasComissoes.filter(c => {
                if (c.tipo === 'bonus' && c.vendedor_id === vendedor_id && c.mes_referencia) {
                    if (!dataInicio && !dataFim) return true;
                    const mesRef = c.mes_referencia + '-01';
                    return (!dataInicio || mesRef >= dataInicio) && (!dataFim || mesRef <= dataFim);
                }
                return false;
            });
            
            const bonusPorMes = {};
            bonusDoPeriodo.forEach(b => {
                if (!bonusPorMes[b.mes_referencia]) {
                    bonusPorMes[b.mes_referencia] = {
                        mes_referencia: b.mes_referencia,
                        valor_total: 0,
                        pago: b.pago,
                        vendedor_id: b.vendedor_id,
                        vendedor_nome: b.vendedor_nome
                    };
                }
                bonusPorMes[b.mes_referencia].valor_total += parseFloat(b.valor_comissao) || 0;
                if (!b.pago) bonusPorMes[b.mes_referencia].pago = false;
            });
            
            bonusAgrupados = Object.values(bonusPorMes);
        }
        
        const comissoes = comissoesDoPeriodo;

        const totalVendas = vendas.length;
        const valorTotalVendido = vendas.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
        const totalComissaoVendas = comissoes.reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
        const totalBonus = bonusAgrupados.reduce((s, b) => s + (parseFloat(b.valor_total) || 0), 0);
        const totalComissao = totalComissaoVendas + totalBonus;
        
        const comissaoPagaVendas = comissoes.filter(c => c.pago).reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
        const bonusPago = bonusAgrupados.filter(b => b.pago).reduce((s, b) => s + (parseFloat(b.valor_total) || 0), 0);
        const comissaoPaga = comissaoPagaVendas + bonusPago;
        const comissaoPendente = totalComissao - comissaoPaga;

        // Gerar PDF (código idêntico ao gerarRelatorioPDF)
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 20;

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
        doc.text('RELATORIO DE COMISSOES', 14, y);
        
        y += 12;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        
        doc.text(tipo === 'vendedor' ? 'Vendedor:' : 'Indicador:', 14, y);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(cleanText(perfil.nome || ''), 50, y);
        
        if (perfil.email) {
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text('E-mail:', 14, y);
            doc.setTextColor(0, 0, 0);
            doc.text(cleanText(perfil.email || ''), 50, y);
        }
        
        if (tipo === 'vendedor' && perfil.time) {
            y += 6;
            doc.setTextColor(100, 100, 100);
            doc.text('Time:', 14, y);
            doc.setTextColor(0, 0, 0);
            doc.text(cleanText(perfil.time || ''), 50, y);
        }

        y += 6;
        const periodoTexto = dataInicio && dataFim 
            ? new Date(dataInicio).toLocaleDateString('pt-BR') + ' a ' + new Date(dataFim).toLocaleDateString('pt-BR')
            : 'Todos os registros';
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
        
        doc.setFillColor(245, 247, 250);
        doc.rect(14, y, pageWidth - 28, 32, 'F');
        
        const cardWidth = (pageWidth - 36) / 4;
        let cardX = 18;
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('TOTAL VENDAS', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(totalVendas.toString(), cardX, y + 14);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('negociacoes', cardX, y + 20);
        
        cardX += cardWidth;
        doc.setFontSize(8);
        doc.text('TOTAL VENDIDO', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(valorTotalVendido), cardX, y + 14);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('em credito', cardX, y + 20);
        
        cardX += cardWidth;
        doc.setFontSize(8);
        doc.text('COMISSOES', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(totalComissao), cardX, y + 14);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('total', cardX, y + 20);
        
        cardX += cardWidth;
        doc.setFontSize(8);
        doc.text('PENDENTE', cardX, y + 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(comissaoPendente), cardX, y + 14);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('a receber', cardX, y + 20);

        y += 40;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('DETALHAMENTO POR VENDA', 14, y);
        
        y += 10;

        doc.setFillColor(255, 255, 255);
        doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('CLIENTE', 16, y);
        doc.text('MES REF.', 70, y);
        doc.text('VALOR VENDA', 95, y);
        doc.text('% COM.', 125, y);
        doc.text('COMISSAO', 145, y);
        doc.text('STATUS', 175, y);

        y += 5;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        for (const venda of vendas) {
            if (y > 270) {
                doc.addPage();
                y = 20;
                
                doc.setFillColor(255, 255, 255);
                doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
                doc.setTextColor(100, 100, 100);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.text('CLIENTE', 16, y);
                doc.text('MES REF.', 70, y);
                doc.text('VALOR VENDA', 95, y);
                doc.text('% COM.', 125, y);
                doc.text('COMISSAO', 145, y);
                doc.text('STATUS', 175, y);
                y += 5;
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
            }

            const comissao = comissoes.find(c => c.venda_id === venda.id);
            
            doc.setFontSize(8);
            const clienteTexto = cleanText((venda.cliente || '-').substring(0, 28));
            doc.text(clienteTexto, 16, y);
            
            const mesRef = venda.data ? venda.data.substring(0, 7) : '-';
            doc.text(mesRef, 70, y);
            
            doc.text(formatCurrency(venda.valor), 95, y);
            doc.text(comissao ? comissao.percentual.toFixed(1) + '%' : '-', 125, y);
            doc.text(comissao ? formatCurrency(comissao.valor_comissao) : '-', 145, y);
            
            if (comissao?.pago) {
                doc.setTextColor(255, 165, 0);
                doc.setFont('helvetica', 'bold');
                doc.text('APROVADA', 175, y);
            } else {
                doc.setTextColor(251, 146, 60);
                doc.setFont('helvetica', 'bold');
                doc.text('PENDENTE', 175, y);
            }
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');

            y += 6;
        }

        for (const bonusItem of bonusAgrupados) {
            if (y > 270) {
                doc.addPage();
                y = 20;
                
                doc.setFillColor(255, 255, 255);
                doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
                doc.setTextColor(100, 100, 100);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.text('CLIENTE', 16, y);
                doc.text('MES REF.', 70, y);
                doc.text('VALOR VENDA', 95, y);
                doc.text('% COM.', 125, y);
                doc.text('COMISSAO', 145, y);
                doc.text('STATUS', 175, y);
                y += 5;
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
            }

            doc.setFontSize(8);
            doc.text('BONUS POR META', 16, y);
            doc.text(bonusItem.mes_referencia, 70, y);
            doc.text('-', 95, y);
            doc.text('-', 125, y);
            doc.text(formatCurrency(bonusItem.valor_total), 145, y);
            
            if (bonusItem.pago) {
                doc.setTextColor(255, 165, 0);
                doc.setFont('helvetica', 'bold');
                doc.text('APROVADA', 175, y);
            } else {
                doc.setTextColor(251, 146, 60);
                doc.setFont('helvetica', 'bold');
                doc.text('PENDENTE', 175, y);
            }
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');

            y += 6;
        }

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Pagina ' + i + ' de ' + pageCount, pageWidth / 2, 285, { align: 'center' });
        }

        const pdfBytes = doc.output('arraybuffer');
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const pdfFile = new File([pdfBlob], `relatorio-${vendedor_nome.replace(/\s+/g, '-')}.pdf`, { type: 'application/pdf' });

        // Upload do PDF para obter URL
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #0f1e35, #1a3150); padding: 20px 24px; border-radius: 12px 12px 0 0;">
                    <h2 style="color: white; margin: 0; font-size: 18px;">Villela Exchange</h2>
                    <p style="color: #93c5fd; margin: 4px 0 0; font-size: 12px;">Relatório de Comissões</p>
                </div>
                <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
                    <p style="color: #374151;">Olá, <strong>${vendedor_nome}</strong>!</p>
                    <p style="color: #374151;">Relatório para conferência e acompanhamento da comissão gerada no período especificado. Caso haja alguma divergência ou necessidade de ajuste, falar com a gestão do produto.</p>
                    <p style="color: #374151;"><strong>Resumo do Período (${periodoTexto}):</strong></p>
                    <ul style="color: #374151;">
                        <li>Total de vendas: ${totalVendas}</li>
                        <li>Valor total vendido: ${formatCurrency(valorTotalVendido)}</li>
                        <li>Comissão total: ${formatCurrency(totalComissao)}</li>
                        <li>Comissão pendente: ${formatCurrency(comissaoPendente)}</li>
                    </ul>
                    <a href="${file_url}" style="display: inline-block; padding: 12px 24px; background-color: #1a3150; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0;">📄 Baixar Relatório Completo (PDF)</a>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                    <p style="color: #9ca3af; font-size: 11px;">Atenciosamente!<br><strong>VILLELA EXCHANGE</strong></p>
                </div>
            </div>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
            to: vendedor_email,
            subject: `Relatório de Comissões - ${periodoTexto}`,
            body: emailHtml,
            from_name: 'Villela Exchange'
        });

        return Response.json({ 
            success: true,
            message: `Relatório enviado para ${vendedor_email}`,
            totalVendas,
            totalComissao: formatCurrency(totalComissao)
        });

    } catch (error) {
        console.error('Erro ao enviar relatório:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});