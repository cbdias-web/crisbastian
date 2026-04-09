import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { titulo, subtitulo, secoes } = await req.json();
    // secoes: [{ titulo: string, colunas: string[], linhas: string[][] }]

    if (!titulo || !secoes || secoes.length === 0) {
      return Response.json({ error: 'titulo e secoes são obrigatórios' }, { status: 400 });
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const marginLeft = 14;
    const marginRight = 14;
    const contentWidth = W - marginLeft - marginRight;

    // ---- HEADER ----
    doc.setFillColor(15, 30, 53);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Villela Exchange', marginLeft, 11);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(titulo, marginLeft, 19);
    doc.setFontSize(8);
    doc.setTextColor(147, 197, 253);
    const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    doc.text(`Gerado em: ${dataHora}`, marginLeft, 25);

    let y = 36;

    // Subtítulo
    if (subtitulo) {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'italic');
      doc.text(subtitulo, marginLeft, y);
      y += 6;
    }

    // ---- SEÇÕES ----
    for (const secao of secoes) {
      // Título da seção
      if (y > 270) { doc.addPage(); y = 16; }

      if (secao.titulo) {
        y += 3;
        doc.setFillColor(241, 245, 249);
        doc.rect(marginLeft, y - 4, contentWidth, 8, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 49, 80);
        doc.text(secao.titulo, marginLeft + 2, y + 1);
        y += 8;
      }

      // Tabela
      if (secao.colunas && secao.linhas) {
        const colunas = secao.colunas;
        const linhas = secao.linhas;
        const colW = contentWidth / colunas.length;

        // Cabeçalho da tabela
        doc.setFillColor(26, 49, 80);
        doc.rect(marginLeft, y, contentWidth, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        colunas.forEach((col, i) => {
          doc.text(String(col), marginLeft + i * colW + 2, y + 5, { maxWidth: colW - 3 });
        });
        y += 7;

        // Linhas da tabela
        doc.setFont('helvetica', 'normal');
        linhas.forEach((linha, ri) => {
          if (y > 275) { doc.addPage(); y = 16; }
          const bg = ri % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
          doc.setFillColor(...bg);
          doc.rect(marginLeft, y, contentWidth, 6.5, 'F');
          doc.setTextColor(55, 65, 81);
          doc.setFontSize(7.5);
          linha.forEach((cell, i) => {
            doc.text(String(cell ?? ''), marginLeft + i * colW + 2, y + 4.5, { maxWidth: colW - 3 });
          });
          y += 6.5;
        });

        // Borda inferior
        doc.setDrawColor(229, 231, 235);
        doc.line(marginLeft, y, marginLeft + contentWidth, y);
        y += 5;
      }

      // Texto livre
      if (secao.texto) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        const linhasTexto = doc.splitTextToSize(secao.texto, contentWidth);
        linhasTexto.forEach(linha => {
          if (y > 275) { doc.addPage(); y = 16; }
          doc.text(linha, marginLeft, y);
          y += 5;
        });
        y += 3;
      }
    }

    // ---- RODAPÉ ----
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.setFont('helvetica', 'normal');
      doc.text(`Villela Exchange – ${titulo}`, marginLeft, 293);
      doc.text(`Página ${p} de ${totalPages}`, W - marginRight, 293, { align: 'right' });
    }

    const pdfBytes = doc.output('arraybuffer');

    // Upload e retorna URL pública
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });

    return Response.json({ success: true, file_url, message: `PDF gerado com sucesso!` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});