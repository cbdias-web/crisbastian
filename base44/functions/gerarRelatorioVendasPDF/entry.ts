import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { jsPDF } from 'npm:jspdf@4.0.0';

function removerAcentos(str) {
  return str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && !user.permissao_admin)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { dataInicio, dataFim, vendedorFiltro, produtoFiltro } = await req.json();

    const vendas = await base44.asServiceRole.entities.Venda.list('-data');
    
    const vendasFiltradas = vendas.filter(v => {
      const matchData = (!dataInicio || v.data >= dataInicio) && (!dataFim || v.data <= dataFim);
      const matchVendedor = !vendedorFiltro || v.assessor_comercial === vendedorFiltro;
      const matchProduto = !produtoFiltro || v.produto === produtoFiltro;
      return matchData && matchVendedor && matchProduto;
    });

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(15, 30, 53);
    doc.rect(0, 0, pageW, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(removerAcentos('VILLELA EXCHANGE'), pageW / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(removerAcentos('Relatorio de Vendas'), pageW / 2, 22, { align: 'center' });
    doc.text(removerAcentos(`Periodo: ${new Date(dataInicio).toLocaleDateString('pt-BR')} ate ${new Date(dataFim).toLocaleDateString('pt-BR')}`), pageW / 2, 28, { align: 'center' });

    // Resumo
    doc.setTextColor(0, 0, 0);
    const totalVendas = vendasFiltradas.length;
    const valorTotal = vendasFiltradas.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
    
    const resumoY = 45;
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(14, resumoY, pageW - 28, 25, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text(removerAcentos('Total de Vendas:'), 20, resumoY + 8);
    doc.text(removerAcentos('Valor Total:'), 20, resumoY + 16);
    
    doc.setFont(undefined, 'normal');
    doc.text(totalVendas.toString(), 60, resumoY + 8);
    doc.text(`R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 60, resumoY + 16);

    // Tabela
    let y = resumoY + 35;
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(15, 30, 53);
    doc.rect(14, y, pageW - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Data', 16, y + 5);
    doc.text('Produto', 35, y + 5);
    doc.text('Cliente', 70, y + 5);
    doc.text('Vendedor', 110, y + 5);
    doc.text('Valor', pageW - 30, y + 5, { align: 'right' });
    
    y += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');

    vendasFiltradas.forEach((venda, idx) => {
      if (y > pageH - 30) {
        doc.addPage();
        y = 20;
        
        // Repetir header da tabela
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setFillColor(15, 30, 53);
        doc.rect(14, y, pageW - 28, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('Data', 16, y + 5);
        doc.text('Produto', 35, y + 5);
        doc.text('Cliente', 70, y + 5);
        doc.text('Vendedor', 110, y + 5);
        doc.text('Valor', pageW - 30, y + 5, { align: 'right' });
        
        y += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
      }

      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(14, y - 4, pageW - 28, 7, 'F');
      }

      doc.text(venda.data ? new Date(venda.data).toLocaleDateString('pt-BR') : '-', 16, y);
      doc.text(removerAcentos(venda.produto || '-').substring(0, 18), 35, y);
      doc.text(removerAcentos(venda.cliente || '-').substring(0, 20), 70, y);
      doc.text(removerAcentos(venda.assessor_comercial || '-').substring(0, 18), 110, y);
      doc.text(`R$ ${(venda.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageW - 30, y, { align: 'right' });
      
      y += 7;
    });

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Pagina ${i} de ${totalPages}`, pageW / 2, pageH - 10, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');
    
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=relatorio-vendas.pdf'
      }
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});