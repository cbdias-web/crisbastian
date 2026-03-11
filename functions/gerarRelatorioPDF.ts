import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
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

        const { tipo, vendedor_id, vendedor_nome, dataInicio, dataFim } = await req.json();

        const isAdmin = user.role === 'admin' || user.permissao_admin === true;

        // Verifica permissões - usuário só pode ver seu próprio relatório
        if (!isAdmin) {
            const vendedorDoUsuario = await base44.entities.Vendedor.filter({ email: user.email });
            if (vendedorDoUsuario.length === 0 || vendedorDoUsuario[0].id !== vendedor_id) {
                return Response.json({ error: 'Acesso negado: você só pode visualizar seu próprio relatório' }, { status: 403 });
            }
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

        // Buscar vendas do período
        const todasVendas = await base44.asServiceRole.entities.Venda.list('-data', 1000);
        const vendas = todasVendas.filter(v => {
            const dataOk = (!dataInicio || v.data >= dataInicio) && (!dataFim || v.data <= dataFim);
            if (tipo === 'vendedor') {
                return dataOk && (v.vendedor_id === vendedor_id || v.assessor_comercial === vendedor_nome);
            } else {
                // Para indicador, buscar vendas onde ele está listado
                const temIndicador = v.indicadores?.some(ind => ind.id === vendedor_id) || 
                                    v.espelhamento_id === vendedor_id ||
                                    v.espelhamento === vendedor_nome;
                return dataOk && temIndicador;
            }
        });

        // Buscar comissões (incluindo bônus)
        let comissoes;
        let bonusAgrupados = []; // Para agrupar bônus automático + manual por mês
        
        if (tipo === 'vendedor') {
            const todasComissoes = await base44.asServiceRole.entities.Comissao.list();
            
            // Filtrar comissões normais
            const comissoesNormais = todasComissoes.filter(c => {
                if (c.venda_id && vendas.some(v => v.id === c.venda_id)) {
                    return c.vendedor_id === vendedor_id;
                }
                return false;
            });
            
            // Filtrar bônus do período
            const bonusDoPeriodo = todasComissoes.filter(c => {
                if (c.tipo === 'bonus' && c.vendedor_id === vendedor_id && c.mes_referencia) {
                    if (!dataInicio && !dataFim) return true;
                    const mesRef = c.mes_referencia + '-01';
                    return (!dataInicio || mesRef >= dataInicio) && (!dataFim || mesRef <= dataFim);
                }
                return false;
            });
            
            // Agrupar bônus por mês (somar automático + manual)
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
                // Se pelo menos um bônus está pendente, o status é pendente
                if (!b.pago) bonusPorMes[b.mes_referencia].pago = false;
            });
            
            bonusAgrupados = Object.values(bonusPorMes);
            comissoes = comissoesNormais;
        } else {
            const todasComissoes = await base44.asServiceRole.entities.ComissaoEspelhamento.list();
            comissoes = todasComissoes.filter(c => 
                c.vendedor_id === vendedor_id && 
                vendas.some(v => v.id === c.venda_id)
            );
        }

        // Calcular totais (incluindo bônus agrupados)
        const totalVendas = vendas.length;
        const valorTotalVendido = vendas.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
        const totalComissaoVendas = comissoes.reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
        const totalBonus = bonusAgrupados.reduce((s, b) => s + (parseFloat(b.valor_total) || 0), 0);
        const totalComissao = totalComissaoVendas + totalBonus;
        
        const comissaoPagaVendas = comissoes.filter(c => c.pago).reduce((s, c) => s + (parseFloat(c.valor_comissao) || 0), 0);
        const bonusPago = bonusAgrupados.filter(b => b.pago).reduce((s, b) => s + (parseFloat(b.valor_total) || 0), 0);
        const comissaoPaga = comissaoPagaVendas + bonusPago;
        const comissaoPendente = totalComissao - comissaoPaga;

        console.log('Vendas encontradas:', totalVendas);
        console.log('Comissoes encontradas:', comissoes.length);

        // Gerar PDF
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 20;

        // Cabeçalho
        doc.setFillColor(15, 30, 53);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Villela Exchange', 14, 15);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Relatorio de Comissoes', 14, 22);
        
        doc.setFontSize(8);
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        doc.text('Gerado em: ' + dataHoje, pageWidth - 14, 15, { align: 'right' });

        y = 45;

        // Informações do Vendedor/Indicador
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(tipo === 'vendedor' ? 'VENDEDOR' : 'INDICADOR', 14, y);
        
        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Nome: ' + cleanText(perfil.nome || ''), 14, y);
        
        if (perfil.email) {
            y += 6;
            doc.text('Email: ' + cleanText(perfil.email || ''), 14, y);
        }
        
        if (tipo === 'vendedor' && perfil.time) {
            y += 6;
            doc.text('Time: ' + cleanText(perfil.time || ''), 14, y);
        }

        y += 10;

        // Período
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PERIODO:', 14, y);
        doc.setFont('helvetica', 'normal');
        
        const periodoTexto = dataInicio && dataFim 
            ? new Date(dataInicio).toLocaleDateString('pt-BR') + ' a ' + new Date(dataFim).toLocaleDateString('pt-BR')
            : 'Todos os registros';
        doc.text(periodoTexto, 40, y);

        y += 12;

        // Resumo Financeiro
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y, pageWidth - 28, 40, 'F');
        
        y += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMO FINANCEIRO', 20, y);
        
        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const formatCurrency = (v) => {
            const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
            return 'R$ ' + formatted;
        };
        
        doc.text('Total de Vendas: ' + totalVendas, 20, y);
        doc.text('Valor Total Vendido: ' + formatCurrency(valorTotalVendido), pageWidth / 2 + 10, y);
        
        y += 7;
        doc.text('Total em Comissoes: ' + formatCurrency(totalComissao), 20, y);
        doc.text('Comissao Paga: ' + formatCurrency(comissaoPaga), pageWidth / 2 + 10, y);
        
        y += 7;
        doc.setFont('helvetica', 'bold');
        doc.text('Comissao Pendente: ' + formatCurrency(comissaoPendente), 20, y);

        y += 15;

        // Detalhamento por Venda
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DETALHAMENTO POR VENDA', 14, y);
        
        y += 8;

        // Cabeçalho da tabela
        doc.setFillColor(26, 49, 80);
        doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Data', 16, y);
        doc.text('Cliente', 40, y);
        doc.text('Produto', 90, y);
        doc.text('Valor Venda', 125, y);
        doc.text('%', 150, y);
        doc.text('Comissao', 160, y);
        doc.text('Status', 185, y);

        y += 6;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        // Linhas da tabela (vendas + bônus agrupados)
        for (const venda of vendas) {
            if (y > 270) {
                doc.addPage();
                y = 20;
                
                // Repetir cabeçalho
                doc.setFillColor(26, 49, 80);
                doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('Data', 16, y);
                doc.text('Cliente', 40, y);
                doc.text('Produto', 90, y);
                doc.text('Valor Venda', 125, y);
                doc.text('%', 150, y);
                doc.text('Comissao', 160, y);
                doc.text('Status', 185, y);
                y += 6;
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
            }

            const comissao = comissoes.find(c => c.venda_id === venda.id);
            
            doc.setFontSize(8);
            doc.text(venda.data ? new Date(venda.data).toLocaleDateString('pt-BR') : '-', 16, y);
            
            const clienteTexto = cleanText((venda.cliente || '-').substring(0, 20));
            doc.text(clienteTexto, 40, y);
            
            const produtoTexto = cleanText((venda.produto || '-').substring(0, 15));
            doc.text(produtoTexto, 90, y);
            
            doc.text(formatCurrency(venda.valor), 125, y);
            doc.text(comissao ? comissao.percentual + '%' : '-', 150, y);
            doc.text(comissao ? formatCurrency(comissao.valor_comissao) : '-', 160, y);
            
            const status = comissao?.pago ? 'Pago' : 'Pendente';
            if (comissao?.pago) {
                doc.setTextColor(34, 197, 94);
            } else {
                doc.setTextColor(251, 146, 60);
            }
            doc.text(status, 185, y);
            doc.setTextColor(0, 0, 0);

            y += 6;
        }

        // Adicionar bônus agrupados (automático + manual)
        for (const bonusItem of bonusAgrupados) {
            if (y > 270) {
                doc.addPage();
                y = 20;
                
                // Repetir cabeçalho
                doc.setFillColor(26, 49, 80);
                doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('Data', 16, y);
                doc.text('Cliente', 40, y);
                doc.text('Produto', 90, y);
                doc.text('Valor Venda', 125, y);
                doc.text('%', 150, y);
                doc.text('Comissao', 160, y);
                doc.text('Status', 185, y);
                y += 6;
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
            }

            doc.setFontSize(8);
            const mesRefFormatado = bonusItem.mes_referencia ? 
                cleanText(new Date(bonusItem.mes_referencia + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })) : '-';
            doc.text(mesRefFormatado, 16, y);
            doc.text('BONUS POR META', 40, y);
            doc.text('Bonus do mes', 90, y);
            doc.text('-', 125, y);
            doc.text('-', 150, y);
            doc.text(formatCurrency(bonusItem.valor_total), 160, y);
            
            const status = bonusItem.pago ? 'Pago' : 'Pendente';
            if (bonusItem.pago) {
                doc.setTextColor(34, 197, 94);
            } else {
                doc.setTextColor(251, 146, 60);
            }
            doc.text(status, 185, y);
            doc.setTextColor(0, 0, 0);

            y += 6;
        }

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Pagina ' + i + ' de ' + pageCount, pageWidth / 2, 285, { align: 'center' });
            doc.text('Villela Exchange - Relatorio Confidencial', pageWidth / 2, 290, { align: 'center' });
        }

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=relatorio-' + tipo + '-' + vendedor_nome.replace(/\s+/g, '-') + '-' + dataHoje.replace(/\//g, '-') + '.pdf'
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});