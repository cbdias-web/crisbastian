import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

const norm = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = user.role === 'admin' || user.permissao_admin === true;
    const { dataInicio, dataFim, filtroVendedor, filtroResultado, filtroTipo, busca, vendedorId } = await req.json();

    let todas = await base44.asServiceRole.entities.InteracaoCliente.list('-data_interacao');

    // Filtros
    if (!isAdmin && vendedorId) todas = todas.filter(i => i.vendedor_id === vendedorId);
    if (dataInicio) todas = todas.filter(i => i.data_interacao >= dataInicio);
    if (dataFim) todas = todas.filter(i => i.data_interacao <= dataFim);
    if (filtroVendedor) todas = todas.filter(i => i.vendedor_nome === filtroVendedor);
    if (filtroResultado) todas = todas.filter(i => i.resultado === filtroResultado);
    if (filtroTipo) todas = todas.filter(i => i.tipo === filtroTipo);
    if (busca) {
      const term = busca.toLowerCase();
      todas = todas.filter(i =>
        i.cliente_nome?.toLowerCase().includes(term) ||
        i.descricao?.toLowerCase().includes(term) ||
        i.vendedor_nome?.toLowerCase().includes(term)
      );
    }

    const formatDate = (d) => {
      if (!d) return '-';
      const [y, m, dd] = d.split('-');
      return `${dd}/${m}/${y}`;
    };

    const total = todas.length;
    const positivos = todas.filter(i => i.resultado === 'Positivo').length;
    const negativos = todas.filter(i => i.resultado === 'Negativo').length;
    const semResposta = todas.filter(i => i.resultado === 'Sem resposta').length;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const addPage = () => {
      doc.addPage();
      // Cabeçalho repetido
      doc.setFillColor(15, 30, 53);
      doc.rect(0, 0, W, 14, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('Villela Exchange - Relatorio de Interacoes com Clientes', 10, 9);
      doc.text(`Pagina ${doc.internal.getNumberOfPages()}`, W - 10, 9, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      return 20;
    };

    // === HEADER ===
    doc.setFillColor(15, 30, 53);
    doc.rect(0, 0, W, 28, 'F');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Villela Exchange', 10, 12);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatorio de Interacoes com Clientes', 10, 21);

    const periodoText = `Periodo: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`;
    doc.setFontSize(9);
    doc.text(periodoText, W - 10, 12, { align: 'right' });
    doc.text(`Gerado em: ${formatDate(new Date().toISOString().split('T')[0])}`, W - 10, 21, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // === KPIs ===
    let y = 35;
    const kpiW = (W - 20) / 4;
    const kpis = [
      { label: 'Total de Interacoes', value: total, bg: [15, 30, 53], fg: [255, 255, 255] },
      { label: 'Positivas', value: positivos, bg: [209, 250, 229], fg: [6, 95, 70] },
      { label: 'Negativas', value: negativos, bg: [254, 226, 226], fg: [153, 27, 27] },
      { label: 'Sem Resposta', value: semResposta, bg: [243, 244, 246], fg: [75, 85, 99] },
    ];
    kpis.forEach((k, idx) => {
      const x = 10 + idx * (kpiW + 2);
      doc.setFillColor(...k.bg);
      doc.roundedRect(x, y, kpiW, 16, 2, 2, 'F');
      doc.setTextColor(...k.fg);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(String(k.value), x + kpiW / 2, y + 9, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(k.label, x + kpiW / 2, y + 14, { align: 'center' });
    });
    doc.setTextColor(0, 0, 0);

    // === RESUMO POR VENDEDOR (admin) ===
    y = 58;
    if (isAdmin) {
      const resumo = {};
      todas.forEach(i => {
        const k = norm(i.vendedor_nome || 'Sem vendedor');
        if (!resumo[k]) resumo[k] = { total: 0, pos: 0, neg: 0 };
        resumo[k].total++;
        if (i.resultado === 'Positivo') resumo[k].pos++;
        if (i.resultado === 'Negativo') resumo[k].neg++;
      });

      if (Object.keys(resumo).length > 0) {
        doc.setFillColor(240, 244, 248);
        doc.rect(10, y, W - 20, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 80, 120);
        doc.text('RESUMO POR VENDEDOR', 12, y + 5);
        y += 9;

        Object.entries(resumo).forEach(([nome, dados]) => {
          if (y > H - 15) { y = addPage(); }
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0);
          doc.text(nome, 12, y + 4);
          doc.setFont('helvetica', 'bold');
          doc.text(`${dados.total} interacoes`, 90, y + 4);
          doc.setTextColor(6, 95, 70);
          doc.text(`${dados.pos} positivas`, 140, y + 4);
          doc.setTextColor(153, 27, 27);
          doc.text(`${dados.neg} negativas`, 190, y + 4);
          doc.setTextColor(0);
          doc.setFont('helvetica', 'normal');
          y += 6;
        });
        y += 4;
      }
    }

    // === TABELA ===
    if (y > H - 30) { y = addPage(); }

    doc.setFillColor(240, 244, 248);
    doc.rect(10, y, W - 20, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 80, 120);

    const cols = isAdmin
      ? [12, 35, 95, 135, 160, 195, 250]
      : [12, 35, 110, 150, 175, 220];
    const headers = isAdmin
      ? ['Data', 'Cliente', 'Vendedor', 'Tipo', 'Resultado', 'Proximo Contato', 'Descricao']
      : ['Data', 'Cliente', 'Tipo', 'Resultado', 'Proximo Contato', 'Descricao'];

    headers.forEach((h, i) => doc.text(h, cols[i], y + 5));
    y += 9;
    doc.setTextColor(0);

    todas.forEach((i, idx) => {
      if (y > H - 10) { y = addPage(); }

      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(10, y - 1, W - 20, 7, 'F');
      }

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');

      const row = isAdmin
        ? [
            formatDate(i.data_interacao),
            norm(i.cliente_nome),
            norm(i.vendedor_nome),
            norm(i.tipo),
            norm(i.resultado),
            formatDate(i.proximo_contato),
            norm(i.descricao?.substring(0, 50) + (i.descricao?.length > 50 ? '...' : '')),
          ]
        : [
            formatDate(i.data_interacao),
            norm(i.cliente_nome),
            norm(i.tipo),
            norm(i.resultado),
            formatDate(i.proximo_contato),
            norm(i.descricao?.substring(0, 70) + (i.descricao?.length > 70 ? '...' : '')),
          ];

      row.forEach((val, ci) => doc.text(String(val || '-'), cols[ci], y + 4));
      y += 7;
    });

    // === RODAPÉ ===
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(`Pagina ${p} de ${totalPages} - Villela Exchange - Gestao Comercial`, W / 2, H - 4, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=relatorio-interacoes.pdf'
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});