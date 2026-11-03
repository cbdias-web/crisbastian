import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

function removerAcentos(str) {
  return str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
}

const STATUS_LABELS = {
  aguardando_documentacao: 'Aguard. Documentação',
  em_andamento: 'Em Andamento',
  aguardando_cliente: 'Aguard. Cliente',
  concluido: 'Concluído',
  concluido_feedback: 'Concluído - Feedback',
  rejeitado_compliance: 'Rejeitado por Compliance',
  cancelado: 'Cancelado',
};

const TIPO_CONTRATO_LABELS = {
  contrato: 'Contrato',
  termo_adiantado: 'Termo Adiantado',
  parcelamento: 'Parcelamento',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && !user.permissao_admin)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const {
      dataInicio, dataFim, produtoFiltro, statusFiltro,
      padrinhoFiltro, tipoContratoFiltro, valorMin, valorMax,
    } = await req.json();

    const implantacoes = await base44.asServiceRole.entities.Implantacao.list('-data_entrada');

    const filtradas = implantacoes.filter(imp => {
      const dataRef = imp.data_entrada || imp.created_date?.split('T')[0] || '';
      const matchData = (!dataInicio || dataRef >= dataInicio) && (!dataFim || dataRef <= dataFim);
      const matchProduto = !produtoFiltro || imp.produto === produtoFiltro;
      const matchStatus = !statusFiltro || imp.status === statusFiltro;
      const matchPadrinho = !padrinhoFiltro || imp.padrinho_nome === padrinhoFiltro;
      const matchTipoContrato = !tipoContratoFiltro || (imp.tipo_contrato || 'contrato') === tipoContratoFiltro;
      const valor = Number(imp.valor_contrato) || 0;
      const matchValorMin = valorMin == null || valorMin === '' || valor >= Number(valorMin);
      const matchValorMax = valorMax == null || valorMax === '' || valor <= Number(valorMax);
      return matchData && matchProduto && matchStatus && matchPadrinho && matchTipoContrato && matchValorMin && matchValorMax;
    });

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(13, 17, 23);
    doc.rect(0, 0, pageW, 44, 'F');
    doc.setTextColor(0, 212, 170);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(removerAcentos('VILLELA EXCHANGE'), pageW / 2, 14, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(removerAcentos('Relatorio de Implantacoes'), pageW / 2, 21, { align: 'center' });
    doc.setFontSize(8);
    const periodoTxt = dataInicio && dataFim
      ? `${new Date(dataInicio).toLocaleDateString('pt-BR')} ate ${new Date(dataFim).toLocaleDateString('pt-BR')}`
      : 'Todos os periodos';
    doc.text(removerAcentos(`Periodo: ${periodoTxt}`), pageW / 2, 27, { align: 'center' });

    const filtrosTxt = [
      `Produto: ${produtoFiltro || 'Todos'}`,
      `Tipo: ${tipoContratoFiltro ? TIPO_CONTRATO_LABELS[tipoContratoFiltro] || tipoContratoFiltro : 'Todos'}`,
      `Padrinho: ${padrinhoFiltro || 'Todos'}`,
    ].join('   |   ');
    const faixaTxt = (valorMin == null || valorMin === '') && (valorMax == null || valorMax === '')
      ? 'Valor: todos'
      : `Valor: ${valorMin != null && valorMin !== '' ? 'a partir de R$ ' + Number(valorMin).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'sem minimo'} ${valorMax != null && valorMax !== '' ? 'ate R$ ' + Number(valorMax).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}`.trim();
    doc.setTextColor(200, 230, 225);
    doc.text(removerAcentos(filtrosTxt), pageW / 2, 33, { align: 'center' });
    doc.text(removerAcentos(faixaTxt), pageW / 2, 38, { align: 'center' });

    // Resumo
    doc.setTextColor(0, 0, 0);
    const total = filtradas.length;
    const concluidas = filtradas.filter(i => i.status === 'concluido' || i.status === 'concluido_feedback').length;
    const emAndamento = filtradas.filter(i => i.status === 'em_andamento' || i.status === 'aguardando_documentacao').length;
    const aguardandoCliente = filtradas.filter(i => i.status === 'aguardando_cliente').length;
    const canceladas = filtradas.filter(i => i.status === 'cancelado').length;
    const valorTotal = filtradas.reduce((s, i) => s + (parseFloat(i.valor_contrato) || 0), 0);

    const resumoY = 52;
    doc.setFillColor(240, 240, 240);
    doc.rect(14, resumoY, pageW - 28, 28, 'F');
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${total}`, 18, resumoY + 7);
    doc.text(`Em andamento: ${emAndamento}`, 18, resumoY + 14);
    doc.text(`Aguard. cliente: ${aguardandoCliente}`, 18, resumoY + 21);
    doc.text(`Concluidas: ${concluidas}`, 100, resumoY + 7);
    doc.text(`Canceladas: ${canceladas}`, 100, resumoY + 14);
    doc.text(`Valor total: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 100, resumoY + 21);

    // Tabela
    let y = resumoY + 36;
    doc.setFontSize(8);
    doc.setFillColor(13, 17, 23);
    doc.rect(14, y - 4, pageW - 28, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('Cliente', 16, y);
    doc.text('Produto', 50, y);
    doc.text('Tipo', 86, y);
    doc.text('Status', 114, y);
    doc.text('Entrada', 150, y);
    doc.text('Valor', 174, y);
    y += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');

    for (const imp of filtradas) {
      if (y > pageH - 15) {
        doc.addPage();
        y = 15;
      }
      const cliente = removerAcentos(imp.cliente_nome || '—').substring(0, 22);
      const produto = removerAcentos(imp.produto || '—').substring(0, 20);
      const tipo = removerAcentos(TIPO_CONTRATO_LABELS[imp.tipo_contrato || 'contrato'] || '—').substring(0, 16);
      const status = removerAcentos(STATUS_LABELS[imp.status] || imp.status || '—').substring(0, 18);
      const entrada = imp.data_entrada ? new Date(imp.data_entrada).toLocaleDateString('pt-BR') : '—';
      const valor = imp.valor_contrato ? `R$ ${Number(imp.valor_contrato).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

      doc.text(cliente, 16, y);
      doc.text(produto, 50, y);
      doc.text(tipo, 86, y);
      doc.text(status, 114, y);
      doc.text(entrada, 150, y);
      doc.text(valor, 174, y);
      y += 5;
    }

    // Footer
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Pagina ${i} de ${pages}`, pageW - 30, pageH - 5);
      doc.text(removerAcentos('Villela Exchange - Implantacoes'), 14, pageH - 5);
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=relatorio-implantacoes.pdf' },
    });
  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});