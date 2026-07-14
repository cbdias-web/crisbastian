import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { jsPDF } from 'npm:jspdf@4.0.0';

/**
 * Sanitiza texto para o PDF mantendo acentos portugueses (que a fonte
 * padrão helvetica/WinAnsi suporta) e substituindo apenas caracteres
 * realmente incompativeis (em-dash, emojis, aspas tipograficas, etc.)
 */
function sanitizarTexto(str) {
  if (!str) return '';
  return String(str)
    .replace(/—/g, '-')       // em-dash -> hifen
    .replace(/–/g, '-')       // en-dash -> hifen
    .replace(/[""]/g, '"')    // aspas curvas -> retas
    .replace(/['']/g, "'")    // apostrofos curvos -> retos
    .replace(/…/g, '...')     // reticencias tipograficas
    .replace(/[•]/g, '-')     // bullet -> hifen
    .replace(/°/g, 'o')       // simbolo de grau
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu, '') // emojis/simbolos unicode
    .replace(/\u00A0/g, ' ')  // no-break space -> espaco
    .trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && !user.permissao_admin)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const roletas = await base44.asServiceRole.entities.RoletaPremio.list('-created_date');
    const giradas = roletas.filter(r => r.ja_girou);

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // ── Header ──
    doc.setFillColor(15, 30, 53);
    doc.rect(0, 0, pageW, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizarTexto('VILLELA EXCHANGE'), pageW / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizarTexto('Relatório de Prêmios da Roleta'), pageW / 2, 22, { align: 'center' });
    doc.text(sanitizarTexto(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`), pageW / 2, 28, { align: 'center' });

    // ── Resumo ──
    doc.setTextColor(0, 0, 0);
    const totalLib = roletas.length;
    const totalGir = giradas.length;
    const totalPend = roletas.filter(r => r.ativo && !r.ja_girou).length;

    // Contar prêmios por tipo
    const contaPremios = {};
    giradas.forEach(r => {
      const p = r.premio || '-';
      contaPremios[p] = (contaPremios[p] || 0) + 1;
    });

    const resumoY = 45;
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(14, resumoY, pageW - 28, 22, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizarTexto('Total Liberados:'), 20, resumoY + 8);
    doc.text(sanitizarTexto('Total Resgatados:'), 20, resumoY + 16);
    doc.text(sanitizarTexto('Pendentes:'), 100, resumoY + 8);
    doc.text(sanitizarTexto('Tipos de Prêmio:'), 100, resumoY + 16);

    doc.setFont('helvetica', 'normal');
    doc.text(totalLib.toString(), 52, resumoY + 8);
    doc.text(totalGir.toString(), 55, resumoY + 16);
    doc.text(totalPend.toString(), 128, resumoY + 8);
    doc.text(Object.keys(contaPremios).length.toString(), 138, resumoY + 16);

    // ── Distribuição de prêmios ──
    let distY = resumoY + 30;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizarTexto('Distribuição de Prêmios:'), 14, distY);
    distY += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    Object.entries(contaPremios).forEach(([premio, count]) => {
      distY += 5;
      doc.text(sanitizarTexto(`${premio}: ${count}x`), 20, distY);
    });

    // ── Tabela de prêmios resgatados ──
    let y = distY + 12;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(15, 30, 53);
    doc.rect(14, y, pageW - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(sanitizarTexto('Usuário'), 16, y + 5);
    doc.text('E-mail', 70, y + 5);
    doc.text(sanitizarTexto('Prêmio'), 120, y + 5);
    doc.text(sanitizarTexto('Data'), pageW - 35, y + 5);

    y += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    giradas.forEach((r, idx) => {
      if (y > pageH - 25) {
        doc.addPage();
        y = 20;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(15, 30, 53);
        doc.rect(14, y, pageW - 28, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(sanitizarTexto('Usuário'), 16, y + 5);
        doc.text('E-mail', 70, y + 5);
        doc.text(sanitizarTexto('Prêmio'), 120, y + 5);
        doc.text(sanitizarTexto('Data'), pageW - 35, y + 5);
        y += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
      }

      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(14, y - 4, pageW - 28, 7, 'F');
      }

      doc.text(sanitizarTexto(r.user_nome || '-').substring(0, 30), 16, y);
      doc.text(sanitizarTexto(r.user_email || '-').substring(0, 28), 70, y);
      doc.text(sanitizarTexto(r.premio || '-').substring(0, 25), 120, y);
      doc.text(r.girado_em ? new Date(r.girado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-', pageW - 35, y);

      y += 7;
    });

    if (giradas.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(sanitizarTexto('Nenhum prêmio resgatado ainda.'), pageW / 2, y + 10, { align: 'center' });
    }

    // ── Footer ──
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(sanitizarTexto(`Página ${i} de ${totalPages}`), pageW / 2, pageH - 8, { align: 'center' });
      doc.text(sanitizarTexto('Villela Exchange - Relatório de Prêmios da Roleta'), 14, pageH - 8);
    }

    const pdfBase64 = doc.output('arraybuffer');
    const u8 = new Uint8Array(pdfBase64);
    let b64 = '';
    for (let i = 0; i < u8.length; i += 8192) {
      b64 += String.fromCharCode(...u8.slice(i, i + 8192));
    }

    return Response.json({ pdf_base64: btoa(b64), filename: 'relatorio_roleta_premios.pdf' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});